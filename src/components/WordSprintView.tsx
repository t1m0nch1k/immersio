import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LanguageCode, UserState } from '../types';
import { WORD_MAP, WORDS } from '../data/words';
import { LANGUAGES } from '../data/languages';
import { StorageService } from '../services/storageService';
import { SRSService } from '../services/srsService';
import { audioService } from '../services/audioService';
import confetti from 'canvas-confetti';
import { GRAMMAR_WORD_MAP } from '../services/immersionService';

interface WordSprintViewProps {
  userState: UserState;
  onUpdateState: (newState: UserState) => void;
  onNavigate: (route: string) => void;
}

type AnswerState = { choice: string; correct: boolean } | null;

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const WordSprintView: React.FC<WordSprintViewProps> = ({ userState, onUpdateState, onNavigate }) => {
  const currentLang: LanguageCode = userState.currentLang;
  const language = LANGUAGES[currentLang] || LANGUAGES.en;
  const progress = StorageService.getLangProgress(userState, currentLang);
  const scoreRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getWord = (wordId: string) => WORD_MAP[wordId] || GRAMMAR_WORD_MAP[wordId];
  const getTargetText = (word: ReturnType<typeof getWord>) =>
    (word ? (word[currentLang] || word.en) : '').trim();
  const getRussianText = (word: ReturnType<typeof getWord>) => (word?.ru || '').trim();
  const createQueue = () => {
    const learned = new Set(progress.learnedWords);
    const newWords = shuffle(WORDS.filter((item) => !learned.has(item.id)).map((item) => item.id)).slice(0, 6);
    const reviewWords = shuffle(progress.learnedWords.filter((id) => {
      const word = getWord(id);
      return Boolean(word && getRussianText(word) && getTargetText(word));
    })).slice(0, 4);
    return shuffle([...newWords, ...reviewWords]).slice(0, 10);
  };
  const [queue, setQueue] = useState<string[]>(createQueue);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const [answer, setAnswer] = useState<AnswerState>(null);
  const [finished, setFinished] = useState(false);

  const currentWord = getWord(queue[index]);
  const currentText = getTargetText(currentWord);
  const options = useMemo(() => {
    if (!currentWord) return [];
    const correctAnswer = getRussianText(currentWord);
    const distractors = shuffle(
      WORDS
        .filter((item) => {
          const russianText = getRussianText(item);
          return item.id !== currentWord.id && russianText && russianText !== correctAnswer;
        })
        .map(getRussianText)
        .filter((value, itemIndex, values) => values.indexOf(value) === itemIndex)
    ).slice(0, 3);
    return shuffle([correctAnswer, ...distractors]);
  }, [currentWord, currentLang]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const finish = (finalScore: number) => {
    if (finished) return;
    setFinished(true);
    const xpGain = 12 + finalScore * 3;
    userState.xp += xpGain;
    StorageService.save(userState);
    StorageService.checkAndUnlockAchievements(userState, () => {});
    onUpdateState({ ...userState });
    audioService.playFanfare();
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
  };

  useEffect(() => {
    if (finished) return undefined;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          finish(scoreRef.current);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finished]);

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
    setSeconds(60);
    setAnswer(null);
    setFinished(false);
  };

  const handleAnswer = (choice: string) => {
    if (answer || finished || !currentWord) return;
    const correct = choice === getRussianText(currentWord);
    const nextScore = score + (correct ? 1 : 0);
    setAnswer({ choice, correct });
    setScore(nextScore);
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
        <div className="card emptybox"><span className="big">📚</span><h3>Словарь пока пуст</h3><p>Открой урок, чтобы добавить первые слова в спринт.</p></div>
      </div>
    );
  }

  return (
    <div className="view sprint-view">
      <button className="backlink" onClick={() => onNavigate('practice')}>← Назад в практику</button>
      <div className="overline">⚡ новый режим · {language.name}</div>
      <h1 className="display">Спринт слов</h1>
      <p className="sub">10 слов за 60 секунд: выбирай перевод, слушай произношение и сразу закрепляй правильные ответы.</p>

      {finished ? (
        <div className="card sprint-result">
          <span className="sprint-result-icon">🏁</span>
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
            <span className={seconds <= 10 ? 'sprint-timer urgent' : 'sprint-timer'}>⏱ {seconds} сек</span>
            <span>Серия: {streak} 🔥</span>
          </div>
          <div className="sprint-track"><span style={{ width: `${((index + 1) / queue.length) * 100}%` }} /></div>
          <div className="sprint-word-row">
            <div className="sprint-word">{currentText}</div>
            <button className="iconbtn" onClick={() => audioService.speak(currentText, currentLang)} aria-label="Произнести слово">🔊</button>
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
