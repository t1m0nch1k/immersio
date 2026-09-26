import React, { useEffect, useMemo, useState } from 'react';
import { UserState } from '../types';
import { StorageService } from '../services/storageService';
import { toastService } from '../services/toastService';
import { SRSService } from '../services/srsService';
import { audioService } from '../services/audioService';
import confetti from 'canvas-confetti';
import { DailyPlanCard } from './DailyPlanCard';
import { ListeningTodayCard } from './ListeningTodayCard';
import { shuffle } from '../utils';
import { buildRussianDistractors, getRussianText, getTargetText, getWord, isUsableWord } from '../utils/words';
import { createSeededRandom } from './seededRandom';
import { PairSide, usePairsMatching } from './usePairsMatching';
import { Route } from '../routes';

interface PracticeViewProps {
  userState: UserState;
  onUpdateState: (newState: UserState) => void;
  onNavigate: (route: Route) => void;
}

/** Wrong answers added on top of the correct one in every option list. */
const OPTION_DISTRACTORS = 3;

export const PracticeView: React.FC<PracticeViewProps> = ({
  userState,
  onUpdateState,
  onNavigate,
}) => {
  const [activeGame, setActiveGame] = useState<'srs' | 'mcq' | 'pairs' | 'audio' | null>(null);

  // SRS state
  const [srsQueue, setSrsQueue] = useState<string[]>([]);
  const [srsIndex, setSrsIndex] = useState(0);
  const [srsFlipped, setSrsFlipped] = useState(false);

  // General quiz state
  const [quizPool, setQuizPool] = useState<string[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [answeredQuizIndex, setAnsweredQuizIndex] = useState<number | null>(null);

  // Pairs state
  const [pairsLeft, setPairsLeft] = useState<string[]>([]);
  const [pairsRight, setPairsRight] = useState<string[]>([]);

  const currentLang = userState.currentLang;
  const langProg = StorageService.getLangProgress(userState, currentLang);
  const learnedWords = langProg.learnedWords;

  const pairs = usePairsMatching(pairsLeft.length);

  useEffect(() => {
    setAnsweredQuizIndex(null);
  }, [quizIndex, activeGame]);

  // The reader can contain grammar tokens and older progress can contain
  // temporary ids. Practice must only use complete dictionary records, or it
  // can render an empty answer button for an id that has no word data.
  const usableLearnedWords = useMemo(
    () => learnedWords.filter((wordId) => isUsableWord(getWord(wordId), currentLang)),
    // 3.5k+ dictionary lookups on every render bought nothing: the filtered
    // list can only change when the dictionary or the target language does.
    [learnedWords, currentLang]
  );

  // Precompute options for quizPool so button positions NEVER reshuffle on re-render
  const quizOptionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    quizPool.forEach((wordId) => {
      const word = getWord(wordId);
      const correctAnswer = getRussianText(word);
      if (!word || !correctAnswer || !getTargetText(word, currentLang)) return;
      // Seeded per word: the four options of a word are the same on every
      // re-render and across retries instead of being re-rolled each round.
      const random = createSeededRandom(`${currentLang}:practice:${wordId}`);
      const distractors = buildRussianDistractors(correctAnswer, wordId, OPTION_DISTRACTORS, random);
      map[wordId] = shuffle([correctAnswer, ...distractors], random);
    });
    return map;
  }, [quizPool, currentLang]);

  // Start SRS mode
  const startSRS = () => {
    const dueIds: string[] = [];
    usableLearnedWords.forEach((wId) => {
      const srsItem = langProg.srsData[wId] || SRSService.createDefaultItem(wId);
      if (SRSService.isDue(srsItem)) {
        dueIds.push(wId);
      }
    });

    const queue = dueIds.length > 0 ? shuffle(dueIds) : shuffle(usableLearnedWords).slice(0, 10);
    if (queue.length === 0) return;
    setSrsQueue(queue);
    setSrsIndex(0);
    setSrsFlipped(false);
    setScore(0);
    setAnsweredQuizIndex(null);
    setGameFinished(false);
    setActiveGame('srs');
  };

  const handleSRSReview = (quality: number) => {
    const wordId = srsQueue[srsIndex];
    const currentProgress = StorageService.ensureLangProgress(userState, currentLang);
    const currentItem = currentProgress.srsData[wordId] || SRSService.createDefaultItem(wordId);
    const updatedItem = SRSService.calculateNextReview(currentItem, quality);

    currentProgress.srsData[wordId] = updatedItem;
    const nextScore = score + (quality >= 3 ? 1 : 0);
    setScore(nextScore);

    audioService.playSuccess();

    if (srsIndex + 1 < srsQueue.length) {
      setSrsIndex((prev) => prev + 1);
      setSrsFlipped(false);
    } else {
      // `userState` is mutated in place (project-wide pattern); the shallow copy
      // passed to `onUpdateState` is what re-renders the app with the new XP.
      userState.xp += 15 + nextScore * 2;
      StorageService.save(userState);
      StorageService.checkAndUnlockAchievements(userState, toastService.show);
      onUpdateState({ ...userState });
      confetti({ particleCount: 50 });
      setGameFinished(true);
    }
  };

  // Start MCQ mode
  const startMCQ = () => {
    const pool = shuffle(usableLearnedWords).slice(0, 8);
    setQuizPool(pool);
    setQuizIndex(0);
    setScore(0);
    setAnsweredQuizIndex(null);
    setGameFinished(false);
    setActiveGame('mcq');
  };

  // Start Pairs mode
  const startPairs = () => {
    const pool = shuffle(usableLearnedWords).slice(0, 6);
    setPairsLeft(shuffle(pool));
    setPairsRight(shuffle(pool));
    pairs.reset();
    setScore(0);
    setAnsweredQuizIndex(null);
    setGameFinished(false);
    setActiveGame('pairs');
  };

  // Start Audio mode
  const startAudio = () => {
    const pool = shuffle(usableLearnedWords).slice(0, 6);
    setQuizPool(pool);
    setQuizIndex(0);
    setScore(0);
    setAnsweredQuizIndex(null);
    setGameFinished(false);
    setActiveGame('audio');
  };

  const handlePairClick = (side: PairSide, id: string) => {
    const result = pairs.click(side, id);
    if (result === 'ignored') return;
    if (result === 'selected' || result === 'reselected') {
      audioService.playClick();
      return;
    }
    if (result === 'missed') {
      audioService.playError();
      return;
    }

    audioService.playSuccess();
    if (result === 'completed') {
      // In-place mutation again; the copy handed to `onUpdateState` is what
      // makes the awarded XP visible.
      const xpGain = 12 + pairsLeft.length * 2;
      userState.xp += xpGain;
      StorageService.save(userState);
      onUpdateState({ ...userState });
      confetti({ particleCount: 50 });
      setGameFinished(true);
    }
  };

  const currentQuizWordId = quizPool[quizIndex];
  const currentQuizWord = getWord(currentQuizWordId);

  const handleMCQAnswer = (chosenRu: string) => {
    if (answeredQuizIndex === quizIndex) return;
    setAnsweredQuizIndex(quizIndex);
    const isCorrect = Boolean(currentQuizWord && getRussianText(currentQuizWord) === chosenRu);
    const nextScore = score + (isCorrect ? 1 : 0);
    if (isCorrect) {
      audioService.playSuccess();
      setScore(nextScore);
    } else {
      audioService.playError();
    }

    if (quizIndex + 1 < quizPool.length) {
      setQuizIndex((prev) => prev + 1);
    } else {
      // In-place mutation; the copy passed to `onUpdateState` publishes the XP.
      const xpGain = 10 + nextScore * 2;
      userState.xp += xpGain;
      StorageService.save(userState);
      onUpdateState({ ...userState });
      confetti({ particleCount: 50 });
      setGameFinished(true);
    }
  };

  return (
    <div className="view">
      <div className="overline">тренажёр памяти</div>
      <h1 className="display">Практика и карточки</h1>
      <p className="sub">
        Повторяй слова по научной системе интервальных повторений (SRS). За каждый раунд — XP и прокачка ранга!
      </p>

      <DailyPlanCard
        userState={userState}
        onUpdateState={onUpdateState}
        onNavigate={onNavigate}
        compact
      />

      <ListeningTodayCard userState={userState} onNavigate={onNavigate} compact />

      {usableLearnedWords.length < 4 ? (
        <div className="card" style={{ marginTop: '20px', textAlign: 'center', padding: '30px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>🔒</span>
          <h3>Тренажёр закрыт</h3>
          <p className="sub" style={{ margin: '10px auto' }}>
            Чтобы открыть тренажёр, выучи хотя бы 4 слова — например, в уроках!
          </p>
          <div className="guide-actions" style={{ justifyContent: 'center' }}>
            <button className="btn sun" onClick={() => onNavigate('lessons')}>Перейти к урокам →</button>
            <button className="btn" onClick={() => onNavigate('sprint')}>⚡ Попробовать спринт</button>
          </div>
        </div>
      ) : (
        <>
          {/* Game Select Hub */}
          {!activeGame && (
            <div className="gamehub-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
              <div className="card" style={{ animationDelay: '0.04s' }}>
                <h3 style={{ fontFamily: 'Unbounded', fontSize: '18px', marginBottom: '8px' }}>
                  🧠 SRS Карточки
                </h3>
                <p className="sub" style={{ marginBottom: '16px' }}>
                  Умная система повторения SuperMemo SM-2. Переворачивай карточки и оценивай запоминание.
                </p>
                <button className="btn sun" onClick={startSRS}>
                  Начать SRS →
                </button>
              </div>

              <div className="card" style={{ animationDelay: '0.08s' }}>
                <h3 style={{ fontFamily: 'Unbounded', fontSize: '18px', marginBottom: '8px' }}>
                  🎯 Перевод (8 слов)
                </h3>
                <p className="sub" style={{ marginBottom: '16px' }}>
                  Быстрый тест на выбор верного перевода слова.
                </p>
                <button className="btn pine" onClick={startMCQ}>
                  Начать тесты →
                </button>
              </div>

              <div className="card" style={{ animationDelay: '0.12s' }}>
                <h3 style={{ fontFamily: 'Unbounded', fontSize: '18px', marginBottom: '8px' }}>
                  🧩 Спринт-пары
                </h3>
                <p className="sub" style={{ marginBottom: '16px' }}>
                  6 пар — максимально быстро соедини иностранные слова с их переводом.
                </p>
                <button className="btn pine" onClick={startPairs}>
                  Начать пары →
                </button>
              </div>

              <div className="card" style={{ animationDelay: '0.16s' }}>
                <h3 style={{ fontFamily: 'Unbounded', fontSize: '18px', marginBottom: '8px' }}>
                  🎧 На слух (Аудио)
                </h3>
                <p className="sub" style={{ marginBottom: '16px' }}>
                  Слушай произношение слова native-диктором и определяй перевод.
                </p>
                <button className="btn sun" onClick={startAudio}>
                  Начать аудирование →
                </button>
              </div>

              <div className="card sprint-teaser" style={{ animationDelay: '0.2s' }}>
                <h3 style={{ fontFamily: 'Unbounded', fontSize: '18px', marginBottom: '8px' }}>
                  ⚡ Спринт слов
                </h3>
                <p className="sub" style={{ marginBottom: '16px' }}>
                  10 слов из всей базы за 60 секунд. Правильные ответы сразу закрепляются в словаре.
                </p>
                <button className="btn coral" onClick={() => onNavigate('sprint')}>
                  Запустить спринт →
                </button>
              </div>
            </div>
          )}

          {/* Active SRS Mode */}
          {activeGame === 'srs' && !gameFinished && (
            <div className="card" style={{ marginTop: '20px', textAlign: 'center', minHeight: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--ink2)', marginBottom: '12px', fontFamily: 'JetBrains Mono' }}>
                Карточка {srsIndex + 1} из {srsQueue.length}
              </div>

              {(() => {
                const wordId = srsQueue[srsIndex];
                const word = getWord(wordId);
                const targetTxt = getTargetText(word, currentLang);

                return (
                  <div>
                    <div style={{ fontFamily: 'Unbounded', fontSize: '32px', fontWeight: 800, margin: '14px 0' }}>
                      {targetTxt}
                      <button
                        className="iconbtn"
                        style={{ marginLeft: '12px', verticalAlign: 'middle' }}
                        onClick={() => audioService.speak(targetTxt, currentLang)}
                      >
                        🔊
                      </button>
                    </div>

                    {srsFlipped ? (
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--sea)', margin: '14px 0' }}>
                          {getRussianText(word)}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '24px' }}>
                          <button className="btn coral" onClick={() => handleSRSReview(1)}>
                            🔴 Забыл (1)
                          </button>
                          <button className="btn sun" onClick={() => handleSRSReview(3)}>
                            🟡 Вспомнил (3)
                          </button>
                          <button className="btn pine" onClick={() => handleSRSReview(5)}>
                            🟢 Легко (5)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn pine big"
                        style={{ marginTop: '20px' }}
                        onClick={() => {
                          audioService.playPop();
                          setSrsFlipped(true);
                        }}
                      >
                        Показать перевод 👁️
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Active MCQ Mode */}
          {activeGame === 'mcq' && !gameFinished && currentQuizWord && (
            <div className="card" style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--ink2)', fontFamily: 'JetBrains Mono', marginBottom: '12px' }}>
                Вопрос {quizIndex + 1} из {quizPool.length}
              </div>
              <div className="qword">
                {getTargetText(currentQuizWord, currentLang)}
                <button
                  className="iconbtn"
                  style={{ marginLeft: '10px' }}
                  onClick={() => audioService.speak(getTargetText(currentQuizWord, currentLang), currentLang)}
                >
                  🔊
                </button>
              </div>

              <div className="opts" style={{ marginTop: '16px' }}>
                {(quizOptionsMap[currentQuizWordId] || []).map((opt, idx) => (
                  <button key={idx} className="opt" disabled={answeredQuizIndex === quizIndex} onClick={() => handleMCQAnswer(opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Pairs Mode */}
          {activeGame === 'pairs' && !gameFinished && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ fontFamily: 'Unbounded', fontSize: '18px', marginBottom: '16px' }}>
                Сопоставь слова:
              </h3>
              <div className="pcols">
                <div>
                  {pairsLeft.map((id) => {
                    const txt = getTargetText(getWord(id), currentLang);
                    if (!txt) return null;
                    const isDone = pairs.matched.includes(id);
                    const isSel = pairs.selection?.side === 'L' && pairs.selection?.id === id;

                    let cls = 'pb';
                    if (isDone) cls += ' done';
                    else if (isSel) cls += ' sel';

                    return (
                      <button
                        key={id}
                        className={cls}
                        style={{ width: '100%', marginBottom: '10px' }}
                        onClick={() => handlePairClick('L', id)}
                      >
                        {txt}
                      </button>
                    );
                  })}
                </div>

                <div>
                  {pairsRight.map((id) => {
                    const txt = getRussianText(getWord(id));
                    if (!txt) return null;
                    const isDone = pairs.matched.includes(id);
                    const isSel = pairs.selection?.side === 'R' && pairs.selection?.id === id;

                    let cls = 'pb';
                    if (isDone) cls += ' done';
                    else if (isSel) cls += ' sel';

                    return (
                      <button
                        key={id}
                        className={cls}
                        style={{ width: '100%', marginBottom: '10px' }}
                        onClick={() => handlePairClick('R', id)}
                      >
                        {txt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Active Audio Mode */}
          {activeGame === 'audio' && !gameFinished && currentQuizWord && (
            <div className="card" style={{ marginTop: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--ink2)', fontFamily: 'JetBrains Mono', marginBottom: '14px' }}>
                Слушай и выбирай · {quizIndex + 1} из {quizPool.length}
              </div>

              <button
                className="btn sun big"
                onClick={() => audioService.speak(getTargetText(currentQuizWord, currentLang), currentLang)}
                style={{ fontSize: '24px', padding: '20px 36px', margin: '14px 0' }}
              >
                🔊 Прослушать ещё раз
              </button>

              <div className="opts" style={{ marginTop: '20px' }}>
                {(quizOptionsMap[currentQuizWordId] || []).map((opt, idx) => (
                    <button key={idx} className="opt" disabled={answeredQuizIndex === quizIndex} onClick={() => handleMCQAnswer(opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Finished Round Result */}
          {gameFinished && (
            <div className="card" style={{ marginTop: '20px', textAlign: 'center', padding: '36px 24px' }}>
              <h2 style={{ fontFamily: 'Unbounded', fontSize: '24px', marginBottom: '12px' }}>
                Раунд завершен! 🎉
              </h2>
              <p className="sub" style={{ margin: '10px auto' }}>
                Отличная тренировка! Твои знания зафиксированы.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  className="btn sun big"
                  onClick={() => {
                    audioService.playClick();
                    setActiveGame(null);
                  }}
                >
                  Вернуться в хаб практики
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
