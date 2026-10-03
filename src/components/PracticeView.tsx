import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { Icon } from './icons';

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
  const [srsInitialTotal, setSrsInitialTotal] = useState(0);
  const [srsIndex, setSrsIndex] = useState(0);
  const [srsFlipped, setSrsFlipped] = useState(false);

  // General quiz state
  const [quizPool, setQuizPool] = useState<string[]>([]);
  const [quizInitialTotal, setQuizInitialTotal] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [answeredQuizIndex, setAnsweredQuizIndex] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<{ chosen: string; correct: boolean } | null>(null);
  const quizTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pairs state
  const [pairsLeft, setPairsLeft] = useState<string[]>([]);
  const [pairsRight, setPairsRight] = useState<string[]>([]);

  const currentLang = userState.currentLang;
  const langProg = StorageService.getLangProgress(userState, currentLang);
  const learnedWords = langProg.learnedWords;

  const pairs = usePairsMatching(pairsLeft.length);

  useEffect(() => {
    setAnsweredQuizIndex(null);
    setQuizFeedback(null);
  }, [quizIndex, activeGame]);

  useEffect(() => () => {
    if (quizTimerRef.current) clearTimeout(quizTimerRef.current);
  }, []);

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
    setSrsInitialTotal(queue.length);
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
    const isSuccess = quality >= 3;
    const nextScore = score + (isSuccess ? 1 : 0);
    setScore(nextScore);

    audioService.playSuccess();

    // Error recovery loop: forgotten cards (quality < 3) are re-queued to the
    // end of this session so the learner consolidates them before finishing.
    const nextQueue = !isSuccess ? [...srsQueue, wordId] : srsQueue;
    if (!isSuccess) {
      setSrsQueue(nextQueue);
    }

    if (srsIndex + 1 < nextQueue.length) {
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
    setQuizInitialTotal(pool.length);
    setQuizIndex(0);
    setScore(0);
    setAnsweredQuizIndex(null);
    setQuizFeedback(null);
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
    setQuizInitialTotal(pool.length);
    setQuizIndex(0);
    setScore(0);
    setAnsweredQuizIndex(null);
    setQuizFeedback(null);
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
    if (answeredQuizIndex === quizIndex || quizFeedback) return;
    setAnsweredQuizIndex(quizIndex);
    const isCorrect = Boolean(currentQuizWord && getRussianText(currentQuizWord) === chosenRu);
    const nextScore = score + (isCorrect ? 1 : 0);
    setQuizFeedback({ chosen: chosenRu, correct: isCorrect });

    if (isCorrect) {
      audioService.playSuccess();
      setScore(nextScore);
    } else {
      audioService.playError();
    }

    // Error recovery: wrong answers are appended to the quiz pool to be
    // answered again before the session finishes.
    const nextPool = !isCorrect ? [...quizPool, currentQuizWordId] : quizPool;
    if (!isCorrect) {
      setQuizPool(nextPool);
    }

    quizTimerRef.current = setTimeout(() => {
      setQuizFeedback(null);
      if (quizIndex + 1 < nextPool.length) {
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
    }, 650);
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
          <Icon name="lock" className="lockmark" />
          <h3>Тренажёр закрыт</h3>
          <p className="sub" style={{ margin: '10px auto' }}>
            Чтобы открыть тренажёр, выучи хотя бы 4 слова — например, в уроках!
          </p>
          <div className="guide-actions" style={{ justifyContent: 'center' }}>
            <button className="btn sun" onClick={() => onNavigate('lessons')}>Перейти к урокам →</button>
            <button className="btn" onClick={() => onNavigate('sprint')}><Icon name="bolt" /> Попробовать спринт</button>
          </div>
        </div>
      ) : (
        <>
          {/* Game Select Hub */}
          {!activeGame && (
            <div className="gamehub-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
              <div className="card" style={{ animationDelay: '0.04s' }}>
                <h3 style={{ fontFamily: 'Unbounded', fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="brain" size={22} /> SRS Карточки
                </h3>
                <p className="sub" style={{ marginBottom: '16px' }}>
                  Умная система повторения SuperMemo SM-2. Переворачивай карточки и оценивай запоминание.
                </p>
                <button className="btn sun" onClick={startSRS}>
                  Начать SRS →
                </button>
              </div>

              <div className="card" style={{ animationDelay: '0.08s' }}>
                <h3 style={{ fontFamily: 'Unbounded', fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="target" size={22} /> Перевод (8 слов)
                </h3>
                <p className="sub" style={{ marginBottom: '16px' }}>
                  Быстрый тест на выбор верного перевода слова.
                </p>
                <button className="btn pine" onClick={startMCQ}>
                  Начать тесты →
                </button>
              </div>

              <div className="card" style={{ animationDelay: '0.12s' }}>
                <h3 style={{ fontFamily: 'Unbounded', fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="puzzle" size={22} /> Спринт-пары
                </h3>
                <p className="sub" style={{ marginBottom: '16px' }}>
                  6 пар — максимально быстро соедини иностранные слова с их переводом.
                </p>
                <button className="btn pine" onClick={startPairs}>
                  Начать пары →
                </button>
              </div>

              <div className="card" style={{ animationDelay: '0.16s' }}>
                <h3 style={{ fontFamily: 'Unbounded', fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="headphones" size={22} /> На слух (Аудио)
                </h3>
                <p className="sub" style={{ marginBottom: '16px' }}>
                  Слушай произношение слова native-диктором и определяй перевод.
                </p>
                <button className="btn sun" onClick={startAudio}>
                  Начать аудирование →
                </button>
              </div>

              <div className="card sprint-teaser" style={{ animationDelay: '0.2s' }}>
                <h3 style={{ fontFamily: 'Unbounded', fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="bolt" size={22} /> Спринт слов
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--ink2)', fontFamily: 'JetBrains Mono' }}>
                  {srsIndex >= srsInitialTotal ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="repeat" className="sm" /> Закрепление ошибки {srsIndex - srsInitialTotal + 1} из {srsQueue.length - srsInitialTotal}
                    </span>
                  ) : (
                    `Карточка ${srsIndex + 1} из ${srsInitialTotal}`
                  )}
                </span>
                {srsQueue.length > srsInitialTotal && srsIndex < srsInitialTotal && (
                  <span className="chip coral sm" style={{ fontSize: '11px', padding: '2px 6px' }}>
                    На повтор: {srsQueue.length - srsInitialTotal}
                  </span>
                )}
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
                        <Icon name="volume" />
                      </button>
                    </div>

                    {srsFlipped ? (
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--sea)', margin: '14px 0' }}>
                          {getRussianText(word)}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '24px' }}>
                          <button className="btn coral" onClick={() => handleSRSReview(1)}>
                            <Icon name="repeat" className="sm" /> Забыл (1)
                          </button>
                          <button className="btn sun" onClick={() => handleSRSReview(3)}>
                            Вспомнил (3)
                          </button>
                          <button className="btn pine" onClick={() => handleSRSReview(5)}>
                            Легко (5)
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
                        <Icon name="eye" /> Показать перевод
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--ink2)', fontFamily: 'JetBrains Mono' }}>
                  {quizIndex >= quizInitialTotal ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="repeat" className="sm" /> Закрепление ошибки {quizIndex - quizInitialTotal + 1} из {quizPool.length - quizInitialTotal}
                    </span>
                  ) : (
                    `Вопрос ${quizIndex + 1} из ${quizInitialTotal}`
                  )}
                </span>
                {quizPool.length > quizInitialTotal && quizIndex < quizInitialTotal && (
                  <span className="chip coral sm" style={{ fontSize: '11px', padding: '2px 6px' }}>
                    На повтор: {quizPool.length - quizInitialTotal}
                  </span>
                )}
              </div>
              <div className="qword">
                {getTargetText(currentQuizWord, currentLang)}
                <button
                  className="iconbtn"
                  style={{ marginLeft: '10px' }}
                  aria-label="Произнести слово"
                  onClick={() => audioService.speak(getTargetText(currentQuizWord, currentLang), currentLang)}
                >
                  <Icon name="volume" />
                </button>
              </div>

              <div className="opts" style={{ marginTop: '16px' }}>
                {(quizOptionsMap[currentQuizWordId] || []).map((opt, idx) => {
                  const isRight = Boolean(currentQuizWord && getRussianText(currentQuizWord) === opt);
                  const isChosen = quizFeedback?.chosen === opt;
                  let optStyle: React.CSSProperties | undefined;
                  if (quizFeedback) {
                    if (isRight) {
                      optStyle = { background: 'var(--sea)', color: '#ffffff', borderColor: 'var(--sea)', fontWeight: 700 };
                    } else if (isChosen && !quizFeedback.correct) {
                      optStyle = { background: 'var(--coral)', color: '#ffffff', borderColor: 'var(--coral)', fontWeight: 700 };
                    }
                  }

                  return (
                    <button
                      key={idx}
                      className="opt"
                      style={optStyle}
                      disabled={answeredQuizIndex === quizIndex || Boolean(quizFeedback)}
                      onClick={() => handleMCQAnswer(opt)}
                    >
                      {opt}
                    </button>
                  );
                })}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: 'var(--ink2)', fontFamily: 'JetBrains Mono' }}>
                  {quizIndex >= quizInitialTotal ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="repeat" className="sm" /> Повтор ошибки {quizIndex - quizInitialTotal + 1} из {quizPool.length - quizInitialTotal}
                    </span>
                  ) : (
                    `Слушай и выбирай · ${quizIndex + 1} из ${quizInitialTotal}`
                  )}
                </span>
                {quizPool.length > quizInitialTotal && quizIndex < quizInitialTotal && (
                  <span className="chip coral sm" style={{ fontSize: '11px', padding: '2px 6px' }}>
                    На повтор: {quizPool.length - quizInitialTotal}
                  </span>
                )}
              </div>

              <button
                className="btn sun big"
                onClick={() => audioService.speak(getTargetText(currentQuizWord, currentLang), currentLang)}
                style={{ fontSize: '24px', padding: '20px 36px', margin: '14px 0' }}
              >
                <Icon name="volume" /> Прослушать ещё раз
              </button>

              <div className="opts" style={{ marginTop: '20px' }}>
                {(quizOptionsMap[currentQuizWordId] || []).map((opt, idx) => {
                  const isRight = Boolean(currentQuizWord && getRussianText(currentQuizWord) === opt);
                  const isChosen = quizFeedback?.chosen === opt;
                  let optStyle: React.CSSProperties | undefined;
                  if (quizFeedback) {
                    if (isRight) {
                      optStyle = { background: 'var(--sea)', color: '#ffffff', borderColor: 'var(--sea)', fontWeight: 700 };
                    } else if (isChosen && !quizFeedback.correct) {
                      optStyle = { background: 'var(--coral)', color: '#ffffff', borderColor: 'var(--coral)', fontWeight: 700 };
                    }
                  }

                  return (
                    <button
                      key={idx}
                      className="opt"
                      style={optStyle}
                      disabled={answeredQuizIndex === quizIndex || Boolean(quizFeedback)}
                      onClick={() => handleMCQAnswer(opt)}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Finished Round Result */}
          {gameFinished && (
            <div className="card" style={{ marginTop: '20px', textAlign: 'center', padding: '36px 24px' }}>
              <h2 style={{ fontFamily: 'Unbounded', fontSize: '24px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                Раунд завершен! <Icon name="trophy" size={26} />
              </h2>
              <p className="sub" style={{ margin: '10px auto' }}>
                Отличная тренировка! Твои знания зафиксированы.
              </p>
              {((activeGame === 'srs' && srsQueue.length > srsInitialTotal) ||
                ((activeGame === 'mcq' || activeGame === 'audio') && quizPool.length > quizInitialTotal)) && (
                <div style={{ margin: '12px auto', maxWidth: '420px', padding: '10px 14px', background: 'rgba(14, 138, 109, 0.12)', borderRadius: '10px', fontSize: '14px', color: 'var(--sea)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Icon name="sparkles" size={16} /> Все допущенные ошибки отработаны повторно и успешно закреплены!
                </div>
              )}
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
