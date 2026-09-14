import React, { useEffect, useState, useMemo } from 'react';
import { UserState, Word } from '../types';
import { WORD_MAP, WORDS } from '../data/words';
import { StorageService } from '../services/storageService';
import { SRSService } from '../services/srsService';
import { audioService } from '../services/audioService';
import confetti from 'canvas-confetti';
import { DailyPlanCard } from './DailyPlanCard';
import { ListeningTodayCard } from './ListeningTodayCard';
import { GRAMMAR_WORD_MAP } from '../services/immersionService';

interface PracticeViewProps {
  userState: UserState;
  onUpdateState: (newState: UserState) => void;
  onNavigate: (route: string) => void;
}

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
  const [pairsMatched, setPairsMatched] = useState<string[]>([]);
  const [pairsSel, setPairsSel] = useState<{ side: 'L' | 'R'; id: string } | null>(null);

  const currentLang = userState.currentLang;
  const langProg = StorageService.getLangProgress(userState, currentLang);
  const learnedWords = langProg.learnedWords;

  // The reader can contain grammar tokens and older progress can contain
  // temporary ids. Practice must only use complete dictionary records, or it
  // can render an empty answer button for an id that has no word data.
  const getPracticeWord = (wordId: string): Word | undefined =>
    WORD_MAP[wordId] || GRAMMAR_WORD_MAP[wordId];

  const getTargetText = (word: Word | undefined): string =>
    (word ? (word[currentLang] || word.en) : '').trim();

  const getRussianText = (word: Word | undefined): string => (word?.ru || '').trim();

  const isUsablePracticeWord = (wordId: string): boolean => {
    const word = getPracticeWord(wordId);
    return Boolean(word && getRussianText(word) && getTargetText(word));
  };

  const usableLearnedWords = learnedWords.filter(isUsablePracticeWord);

  useEffect(() => {
    setAnsweredQuizIndex(null);
  }, [quizIndex, activeGame]);

  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Precompute options for quizPool so button positions NEVER reshuffle on re-render
  const quizOptionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    quizPool.forEach((wordId) => {
      const word = getPracticeWord(wordId);
      const correctAnswer = getRussianText(word);
      if (word && correctAnswer && getTargetText(word)) {
        const pool = shuffle(
          WORDS.filter((w) => {
            const russianText = getRussianText(w);
            return w.id !== wordId && russianText && russianText !== correctAnswer;
          })
        )
          .map(getRussianText)
          .filter((value, index, values) => values.indexOf(value) === index)
          .slice(0, 3);
        map[wordId] = shuffle([correctAnswer, ...pool]);
      }
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
      userState.xp += 15 + nextScore * 2;
      StorageService.save(userState);
      StorageService.checkAndUnlockAchievements(userState, () => {});
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
    setPairsMatched([]);
    setPairsSel(null);
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

  const handlePairClick = (side: 'L' | 'R', id: string) => {
    if (pairsMatched.includes(id)) return;

    if (!pairsSel) {
      audioService.playClick();
      setPairsSel({ side, id });
      return;
    }

    if (pairsSel.side === side) {
      audioService.playClick();
      setPairsSel({ side, id });
      return;
    }

    if (pairsSel.id === id) {
      audioService.playSuccess();
      const updated = [...pairsMatched, id];
      setPairsMatched(updated);
      setPairsSel(null);

      if (updated.length === pairsLeft.length) {
        const xpGain = 12 + updated.length * 2;
        userState.xp += xpGain;
        StorageService.save(userState);
        onUpdateState({ ...userState });
        confetti({ particleCount: 50 });
        setGameFinished(true);
      }
    } else {
      audioService.playError();
      setPairsSel(null);
    }
  };

  const currentQuizWordId = quizPool[quizIndex];
  const currentQuizWord = getPracticeWord(currentQuizWordId);

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
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
                const word = getPracticeWord(wordId);
                const targetTxt = getTargetText(word);

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
                {getTargetText(currentQuizWord)}
                <button
                  className="iconbtn"
                  style={{ marginLeft: '10px' }}
                  onClick={() => audioService.speak(getTargetText(currentQuizWord), currentLang)}
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
                    const w = getPracticeWord(id);
                    const txt = getTargetText(w);
                    if (!txt) return null;
                    const isDone = pairsMatched.includes(id);
                    const isSel = pairsSel?.side === 'L' && pairsSel?.id === id;

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
                    const w = getPracticeWord(id);
                    const txt = getRussianText(w);
                    if (!txt) return null;
                    const isDone = pairsMatched.includes(id);
                    const isSel = pairsSel?.side === 'R' && pairsSel?.id === id;

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
                onClick={() => audioService.speak(getTargetText(currentQuizWord), currentLang)}
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
