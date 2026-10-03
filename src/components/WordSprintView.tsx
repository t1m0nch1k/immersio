import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LanguageCode, UserState } from '../types';
import { WORDS } from '../data/words';
import { LANGUAGES } from '../data/languages';
import { StorageService } from '../services/storageService';
import { toastService } from '../services/toastService';
import { SRSService } from '../services/srsService';
import { audioService } from '../services/audioService';
import confetti from 'canvas-confetti';
import { shuffle } from '../utils';
import { buildRussianDistractors, getRussianText, getTargetText, getWord } from '../utils/words';
import { createSeededRandom } from './seededRandom';
import { Route } from '../routes';
import { Icon } from './icons';

interface WordSprintViewProps {
  userState: UserState;
  onUpdateState: (newState: UserState) => void;
  onNavigate: (route: Route) => void;
}

type AnswerState = { choice: string; correct: boolean } | null;

/** Wrong answers added on top of the correct one in every option list. */
const OPTION_DISTRACTORS = 3;
const ROUND_SECONDS = 60;

export const WordSprintView: React.FC<WordSprintViewProps> = ({ userState, onUpdateState, onNavigate }) => {
  const currentLang: LanguageCode = userState.currentLang;
  const language = LANGUAGES[currentLang] || LANGUAGES.en;
  const progress = StorageService.getLangProgress(userState, currentLang);
  const scoreRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Final score reported by whichever path ended the round. */
  const finalScoreRef = useRef(0);
  /** Set once the round reward has been paid; blocks a second payout. */
  const rewardedRef = useRef(false);
  const createQueue = () => {
    const learned = new Set(progress.learnedWords);
    const newWords = shuffle(WORDS.filter((item) => !learned.has(item.id)).map((item) => item.id)).slice(0, 6);
    const reviewWords = shuffle(progress.learnedWords.filter((id) =>
      getTargetText(getWord(id), currentLang) && getRussianText(getWord(id))
    )).slice(0, 4);
    return shuffle([...newWords, ...reviewWords]).slice(0, 10);
  };
  const [queue, setQueue] = useState<string[]>(createQueue);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [answer, setAnswer] = useState<AnswerState>(null);
  const [finished, setFinished] = useState(false);

  const currentWord = getWord(queue[index]);
  const currentText = getTargetText(currentWord, currentLang);
  const options = useMemo(() => {
    if (!currentWord) return [];
    const correctAnswer = getRussianText(currentWord);
    if (!correctAnswer) return [];
    // Seeded per word: the same word always gets the same four options, so a
    // re-render can never move the correct answer under a different button.
    const random = createSeededRandom(`${currentLang}:sprint:${currentWord.id}`);
    const distractors = buildRussianDistractors(correctAnswer, currentWord.id, OPTION_DISTRACTORS, random);
    return shuffle([correctAnswer, ...distractors], random);
  }, [currentWord, currentLang]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  /**
   * Ends the round. It only flips `finished` — the reward lives in the effect
   * below. Calling it from inside a `setState` updater (as the old timer did)
   * made StrictMode run it twice and pay the XP twice.
   */
  const finish = useCallback((finalScore: number) => {
    finalScoreRef.current = finalScore;
    setFinished(true);
  }, []);

  useEffect(() => {
    if (finished) return undefined;
    // The updater is pure: React 18 StrictMode invokes it twice per tick, which
    // is harmless for a plain number. Deciding "the round is over" happens in
    // the effect below, not here.
    const timer = window.setInterval(() => {
      setSeconds((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finished]);

  // Terminal value reached. `rewardedRef` is the double-run guard and it is set
  // before any of the side effects below, so a second invocation — StrictMode
  // mount double-invoke, or a re-render where the inline `onUpdateState` arrow
  // changed identity — cannot pay the round out twice.
  useEffect(() => {
    if (!finished || rewardedRef.current) return;
    rewardedRef.current = true;
    const xpGain = 12 + finalScoreRef.current * 3;
    // `userState` is mutated in place (project-wide pattern); the shallow copy
    // passed to `onUpdateState` is what publishes the awarded XP.
    userState.xp += xpGain;
    StorageService.save(userState);
    StorageService.checkAndUnlockAchievements(userState, toastService.show);
    onUpdateState({ ...userState });
    audioService.playFanfare();
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
  }, [finished, userState, onUpdateState]);

  useEffect(() => {
    if (finished || seconds > 0) return;
    finish(scoreRef.current);
  }, [finished, seconds, finish]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const restart = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setQueue(createQueue());
    setIndex(0);
    setScore(0);
    scoreRef.current = 0;
    setStreak(0);
    setSeconds(ROUND_SECONDS);
    setAnswer(null);
    rewardedRef.current = false;
    finalScoreRef.current = 0;
    setFinished(false);
  };

  const handleAnswer = (choice: string) => {
    if (answer || finished || !currentWord) return;
    const correct = choice === getRussianText(currentWord);
    const nextScore = score + (correct ? 1 : 0);
    setAnswer({ choice, correct });
    setScore(nextScore);
    // Keep the ref in sync immediately: the round can end 520ms later and the
    // timer path reads the score from here.
    scoreRef.current = nextScore;
    setStreak((value) => (correct ? value + 1 : 0));
    if (correct) {
      audioService.playSuccess();
      const currentProgress = StorageService.ensureLangProgress(userState, currentLang);
      if (!currentProgress.learnedWords.includes(currentWord.id)) currentProgress.learnedWords.push(currentWord.id);
      currentProgress.srsData[currentWord.id] = currentProgress.srsData[currentWord.id] || SRSService.createDefaultItem(currentWord.id);
      StorageService.save(userState);
    } else {
      audioService.playError();
    }

    timeoutRef.current = setTimeout(() => {
      if (index + 1 >= queue.length) finish(nextScore);
      else {
        setIndex((value) => value + 1);
        setAnswer(null);
      }
    }, 520);
  };

  if (queue.length === 0) {
    return (
      <div className="view">
        <button className="backlink" onClick={() => onNavigate('practice')}>← Назад в практику</button>
        <div className="card emptybox">
          <span className="big"><Icon name="book-open" size={40} /></span>
          <h3>Словарь пока пуст</h3>
          <p>Открой урок, чтобы добавить первые слова в спринт.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view sprint-view">
      <button className="backlink" onClick={() => onNavigate('practice')}>← Назад в практику</button>
      <div className="overline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <Icon name="bolt" className="sm" /> новый режим · {language.name}
      </div>
      <h1 className="display">Спринт слов</h1>
      <p className="sub">10 слов за 60 секунд: выбирай перевод, слушай произношение и сразу закрепляй правильные ответы.</p>

      {finished ? (
        <div className="card sprint-result">
          <span className="sprint-result-icon">
            <Icon name="flag" size={32} />
          </span>
          <div className="overline">раунд завершён</div>
          <h2>{score} из {queue.length}</h2>
          <p className="sub">Правильные ответы добавлены в словарь. XP начислен за скорость и точность.</p>
          <div className="guide-actions">
            <button className="btn sun" onClick={restart}>Ещё один спринт →</button>
            <button className="btn" onClick={() => onNavigate('dict')}>Открыть словарь</button>
          </div>
        </div>
      ) : (
        <div className="card sprint-card">
          <div className="sprint-meta">
            <span>Слово {index + 1} из {queue.length}</span>
            <span className={seconds <= 10 ? 'sprint-timer urgent' : 'sprint-timer'}>
              <Icon name="timer" /> {seconds} сек
            </span>
            <span className="sprint-streak">
              Серия: {streak} <Icon name="flame" />
            </span>
          </div>
          <div className="sprint-track"><span style={{ width: `${((index + 1) / queue.length) * 100}%` }} /></div>
          <div className="sprint-word-row">
            <div className="sprint-word">{currentText}</div>
            <button className="iconbtn" onClick={() => audioService.speak(currentText, currentLang)} aria-label="Произнести слово"><Icon name="volume" /></button>
          </div>
          <p className="sprint-prompt">Выбери перевод</p>
          <div className="sprint-options" role="group" aria-label="Варианты перевода">
            {options.map((option) => {
              const isCorrect = option === getRussianText(currentWord);
              const isChosen = answer?.choice === option;
              let className = 'sprint-option';
              if (answer && isCorrect) className += ' correct';
              if (answer && isChosen && !isCorrect) className += ' wrong';
              return <button key={option} className={className} disabled={Boolean(answer)} onClick={() => handleAnswer(option)}>{option}</button>;
            })}
          </div>
          <div className="sprint-feedback" aria-live="polite">
            {answer && (answer.correct ? 'Верно! Следующее слово…' : `Почти. Правильный перевод: ${getRussianText(currentWord)}`)}
          </div>
        </div>
      )}
    </div>
  );
};
