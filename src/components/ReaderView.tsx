import React, { useState, useMemo } from 'react';
import { Lesson, UserState, Word } from '../types';
import { WORD_MAP, WORDS } from '../data/words';
import { LANGUAGES } from '../data/languages';
import { StorageService, getLocalDateKey } from '../services/storageService';
import { audioService } from '../services/audioService';
import {
  getImmersionStats,
  selectImmersionTokenKeys,
  tokenizeLessonSentence,
  tokenizeForeignSentence,
  GRAMMAR_WORD_MAP,
} from '../services/immersionService';
import { getImmersionProfile, IMMERSION_PRESETS } from '../services/immersionProfile';
import { getImmersiveLessonText } from '../data/immersiveTranslations';
import confetti from 'canvas-confetti';

interface ReaderViewProps {
  lesson: Lesson;
  userState: UserState;
  onNavigate: (route: string) => void;
  onLearnWord: (wordId: string) => void;
  onForgetWord: (wordId: string) => void;
  onOpenWordPopup: (word: Word, rect: DOMRect) => void;
  onUpdateState: (newState: UserState) => void;
}

type ReadMode = 'immersion' | 'original' | 'russian';

export const ReaderView: React.FC<ReaderViewProps> = ({
  lesson,
  userState,
  onNavigate,
  onLearnWord,
  onOpenWordPopup,
  onUpdateState,
}) => {
  const currentLang = userState.currentLang;
  const langProg = StorageService.getLangProgress(userState, currentLang);
  const learnedSet = useMemo(
    () => new Set(langProg.learnedWords),
    [langProg.learnedWords, userState.xp, userState.languages]
  );
  const immersionProfile = getImmersionProfile(langProg.immersion);

  const localizedSentences = useMemo(
    () => getImmersiveLessonText(lesson.id, currentLang),
    [lesson.id, currentLang]
  );

  const [readMode, setReadMode] = useState<ReadMode>('immersion');
  const [showSentenceRu, setShowSentenceRu] = useState(true);

  // Exercise & quiz states
  const [tasksStarted, setTasksStarted] = useState(false);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const [mcqScore, setMcqScore] = useState<number>(0);
  const [mcqDone, setMcqDone] = useState(false);

  const [pairsMatched, setPairsMatched] = useState<string[]>([]);
  const [pairsSel, setPairsSel] = useState<{ side: 'L' | 'R'; id: string } | null>(null);
  const [pairsErrors, setPairsErrors] = useState<number>(0);
  const [pairsScore, setPairsScore] = useState<number>(0);
  const [pairsDone, setPairsDone] = useState(false);

  const [fillAnswers, setFillAnswers] = useState<Record<number, string>>({});
  const [fillScore, setFillScore] = useState<number>(0);
  const [fillDone, setFillDone] = useState(false);

  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [completedResult, setCompletedResult] = useState<{
    pct: number;
    score: number;
    total: number;
    xpGained: number;
    streakMessage: string;
  } | null>(null);

  // Helper to shuffle arrays stably
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const getReaderWord = (wordId: string): Word | undefined =>
    WORD_MAP[wordId] || GRAMMAR_WORD_MAP[wordId];

  const getTargetText = (word: Word | undefined): string =>
    (word ? (word[currentLang] || word.en) : '').trim();

  const getRussianText = (word: Word | undefined): string => (word?.ru || '').trim();

  // 1. Tokenize lesson sentences with clean spacing and full vocabulary awareness
  const sentenceTokens = useMemo(
    () => lesson.sent.map((sentence, sIdx) => tokenizeLessonSentence(sentence, sIdx, currentLang)),
    [lesson, currentLang]
  );

  // 2. Select tokens to immerse based on learned words and target depth
  const foreignTokenKeys = useMemo(
    () => selectImmersionTokenKeys(sentenceTokens, langProg.immersion, learnedSet),
    [sentenceTokens, langProg.immersion, learnedSet]
  );

  // 3. Accurate stats
  const immersionStats = useMemo(
    () => getImmersionStats(sentenceTokens, foreignTokenKeys, langProg.immersion, learnedSet),
    [sentenceTokens, foreignTokenKeys, langProg.immersion, learnedSet]
  );

  // 4. Tokenize original authentic sentences
  const originalTokens = useMemo(() => {
    if (!localizedSentences) return null;
    return localizedSentences.map((sentence, sIdx) =>
      tokenizeForeignSentence(sentence, sIdx, currentLang)
    );
  }, [localizedSentences, currentLang]);

  // Concept words for exercises
  const conceptIds = useMemo(() => {
    const ids = new Set<string>();
    sentenceTokens.flat().forEach((token) => {
      const word = token.wordId ? getReaderWord(token.wordId) : undefined;
      if (token.wordId && word && getTargetText(word) && getRussianText(word)) ids.add(token.wordId);
    });
    return Array.from(ids);
  }, [sentenceTokens]);

  // Precompute static MCQ Task Data
  const mcqQuestions = useMemo(() => {
    const taskMcqIds = conceptIds.slice(0, 5);
    return taskMcqIds.flatMap((wordId) => {
      const word = getReaderWord(wordId);
      const targetTxt = getTargetText(word);
      const correctRu = getRussianText(word);
      if (!word || !targetTxt || !correctRu) return [];

      const pool = shuffle(
        WORDS.filter((w) => {
          const russianText = getRussianText(w);
          return w.id !== wordId && russianText && russianText !== correctRu;
        })
      )
        .map(getRussianText)
        .filter((value, index, values) => values.indexOf(value) === index)
        .slice(0, 3);

      return [{ wordId, targetTxt, correctRu, opts: shuffle([correctRu, ...pool]) }];
    });
  }, [conceptIds, currentLang]);

  // Precompute static Pairs Task Data
  const pairData = useMemo(() => {
    const taskPairIds = conceptIds.slice(0, 6);
    return {
      taskPairIds,
      leftPairs: taskPairIds,
      rightPairs: shuffle(taskPairIds),
    };
  }, [conceptIds]);

  // Precompute static Fill-in Blanks Task Data
  const fillQuestions = useMemo(() => {
    const fillIds = conceptIds.slice(0, 3);
    return fillIds.flatMap((wordId) => {
      const word = getReaderWord(wordId);
      const correctVal = getTargetText(word);
      const russianText = getRussianText(word);
      if (!word || !correctVal || !russianText) return [];

      const pool = shuffle(
        WORDS.filter((w) => {
          const targetText = getTargetText(w);
          return w.id !== wordId && targetText && targetText !== correctVal;
        })
      )
        .map(getTargetText)
        .filter((value, index, values) => values.indexOf(value) === index)
        .slice(0, 3);
      const opts = shuffle([correctVal, ...pool]);

      return [{ wordId, correct: correctVal, ru: russianText, opts }];
    });
  }, [conceptIds, currentLang]);

  const totalQuestions = mcqQuestions.length + pairData.taskPairIds.length + fillQuestions.length;

  // Handle in-reader immersion slider change
  const handleImmersionChange = (newVal: number) => {
    const progress = StorageService.ensureLangProgress(userState, currentLang);
    progress.immersion = newVal;
    StorageService.save(userState);
    onUpdateState({ ...userState });
  };

  // Handle clicking word in text
  const handleTokenClick = (e: React.MouseEvent<HTMLButtonElement>, wordId: string) => {
    e.stopPropagation();
    const word = WORD_MAP[wordId] || GRAMMAR_WORD_MAP[wordId];
    if (!word) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onOpenWordPopup(word, rect);
  };

  const handleForeignWordClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    wordId: string | undefined,
    text: string
  ) => {
    e.stopPropagation();
    let word = wordId ? (WORD_MAP[wordId] || GRAMMAR_WORD_MAP[wordId]) : undefined;
    if (word) {
      const rect = e.currentTarget.getBoundingClientRect();
      onOpenWordPopup(word, rect);
    } else {
      // Do not create a fake dictionary card with the foreign word as its
      // Russian translation. Unknown tokens can still be pronounced, but
      // they must not enter learnedWords and later produce empty quiz options.
      audioService.speak(text, currentLang);
    }
  };

  const handleMcqSelect = (qIdx: number, wordId: string, chosenOpt: string) => {
    if (mcqAnswers[qIdx] !== undefined) return;
    const word = getReaderWord(wordId);
    const isCorrect = Boolean(word && getRussianText(word) === chosenOpt);

    if (isCorrect) {
      audioService.playSuccess();
      setMcqScore((prev) => prev + 1);
    } else {
      audioService.playError();
    }

    const updated = { ...mcqAnswers, [qIdx]: chosenOpt };
    setMcqAnswers(updated);

    if (Object.keys(updated).length === mcqQuestions.length) {
      setMcqDone(true);
    }
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

    // Match check
    if (pairsSel.id === id) {
      audioService.playSuccess();
      const newMatched = [...pairsMatched, id];
      setPairsMatched(newMatched);
      setPairsSel(null);

      if (newMatched.length === pairData.taskPairIds.length) {
        setPairsDone(true);
        const score = Math.max(0, pairData.taskPairIds.length - pairsErrors);
        setPairsScore(score);
      }
    } else {
      audioService.playError();
      setPairsErrors((prev) => prev + 1);
      setPairsSel(null);
    }
  };

  const handleFillSelect = (qIdx: number, correctVal: string, chosenOpt: string) => {
    if (fillAnswers[qIdx] !== undefined) return;
    const isCorrect = chosenOpt === correctVal;

    if (isCorrect) {
      audioService.playSuccess();
      setFillScore((prev) => prev + 1);
    } else {
      audioService.playError();
    }

    const updated = { ...fillAnswers, [qIdx]: chosenOpt };
    setFillAnswers(updated);

    if (Object.keys(updated).length === fillQuestions.length) {
      setFillDone(true);
    }
  };

  const handleFinishLesson = () => {
    const totalScore = mcqScore + pairsScore + fillScore;
    const pct = totalQuestions === 0 ? 100 : Math.round((totalScore / totalQuestions) * 100);
    const pass = totalQuestions === 0 || pct >= 65;

    let xpGain = 0;
    let streakMsg = '';

    const currentProgress = StorageService.ensureLangProgress(userState, currentLang);
    const isFirstTime = !currentProgress.doneLessons[lesson.id];

    if (pass) {
      if (pct === 100) {
        userState.perfectCount += 1;
      }

      if (isFirstTime) {
        currentProgress.doneLessons[lesson.id] = {
          score: totalScore,
          pct,
          date: getLocalDateKey(),
        };

        xpGain = 25 + totalScore * 3;
        const oldImmersion = currentProgress.immersion;
        currentProgress.immersion = Math.min(100, currentProgress.immersion + 5);

        const streakResult = StorageService.updateStreak(userState);
        if (streakResult.updated) {
          streakMsg = `🔥 Стрик: ${userState.streak.current} дн. — так держать!`;
        } else {
          streakMsg = '✅ Сегодняшний стрик уже засчитан.';
        }

        if (currentProgress.immersion > oldImmersion) {
          streakMsg += ` | 🌊 Глубина: ${oldImmersion}% → ${currentProgress.immersion}%`;
        }
      } else {
        xpGain = 10;
        streakMsg = 'Урок повторён — отличная практика!';
      }

      userState.xp += xpGain;
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      audioService.playFanfare();
    } else {
      audioService.playError();
    }

    StorageService.save(userState);
    StorageService.checkAndUnlockAchievements(userState, () => {});
    onUpdateState({ ...userState });

    setCompletedResult({
      pct,
      score: totalScore,
      total: totalQuestions,
      xpGained: xpGain,
      streakMessage: streakMsg,
    });
    setLessonCompleted(true);
  };

  return (
    <div className="view">
      <button className="backlink" onClick={() => onNavigate('lessons')}>
        ← ко всем урокам
      </button>

      <div className="card">
        <div className="overline">
          урок · {LANGUAGES[currentLang].name}
        </div>
        <h1 className="display">
          {lesson.emoji} {lesson.title}
        </h1>

        {/* Immersion Stats Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '10px 0 14px' }}>
          <span className="chip sun">
            🌊 {langProg.immersion === 100 ? 100 : immersionStats.actualShare}% слов на языке
          </span>
          <span className="chip">
            {langProg.immersion === 100
              ? '🎯 100% Полное погружение'
              : `🎯 ${immersionStats.immersedConcepts} из ${immersionStats.totalConcepts} ключевых слов`}
          </span>
          <span className="chip">✨ Новых: {immersionStats.newCount}</span>
          <span className="chip sea">✓ В словаре: {immersionStats.learnedCount}</span>
          {langProg.doneLessons[lesson.id] && <span className="chip dim">✓ урок пройден</span>}
        </div>

        {/* Mode Selector & Quick Immersion Slider */}
        <div className="reader-controls-card">
          <div className="reader-tabs">
            <button
              className={`reader-tab ${readMode === 'immersion' ? 'active' : ''}`}
              onClick={() => {
                audioService.playClick();
                setReadMode('immersion');
              }}
            >
              🌊 Погружение ({langProg.immersion}%)
            </button>
            {localizedSentences && (
              <button
                className={`reader-tab ${readMode === 'original' ? 'active' : ''}`}
                onClick={() => {
                  audioService.playClick();
                  setReadMode('original');
                }}
              >
                📖 Оригинал ({LANGUAGES[currentLang].name})
              </button>
            )}
            <button
              className={`reader-tab ${readMode === 'russian' ? 'active' : ''}`}
              onClick={() => {
                audioService.playClick();
                setReadMode('russian');
              }}
            >
              🇷🇺 Русский
            </button>
          </div>

          {readMode === 'immersion' && (
            <div className="immersion-inline-bar">
              <div className="immersion-bar-header">
                <span>
                  Уровень погружения: <b>{langProg.immersion}%</b> ({immersionProfile.title})
                </span>
                <span className="immersion-desc">{immersionProfile.description}</span>
              </div>
              <div className="immersion-slider-row">
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={langProg.immersion}
                  onChange={(e) => handleImmersionChange(Number(e.target.value))}
                  className="immersion-range"
                />
              </div>
              <div className="immersion-preset-chips">
                {IMMERSION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    className={`catchip ${langProg.immersion === preset.value ? 'on' : ''}`}
                    onClick={() => {
                      audioService.playClick();
                      handleImmersionChange(preset.value);
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {langProg.immersion === 100 && (
                <div
                  style={{
                    background: 'rgba(14, 138, 109, 0.12)',
                    border: '1.5px solid var(--sea)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    fontSize: '13px',
                  }}
                >
                  <span>🎉 <b>100% полное погружение:</b> текст полностью на {LANGUAGES[currentLang].name}. Нажмите на любое слово для перевода и озвучки!</span>
                  {originalTokens && (
                    <button
                      className="btn small ghost"
                      onClick={() => setShowSentenceRu(!showSentenceRu)}
                    >
                      {showSentenceRu ? 'Скрыть подстрочник' : 'Показать подстрочник'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {readMode === 'original' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--ink2)' }}>
                💡 Нажми на любое слово, чтобы услышать произношение и посмотреть перевод
              </span>
              <button
                className="btn small ghost"
                onClick={() => setShowSentenceRu(!showSentenceRu)}
              >
                {showSentenceRu ? 'Скрыть подстрочник' : 'Показать подстрочник'}
              </button>
            </div>
          )}
        </div>

        {readMode === 'immersion' && (
          <div className="legend" style={{ marginTop: '14px' }}>
            <span>
              <i className="sw new"></i> новое слово — нажми, чтобы выучить (+2 XP)
            </span>
            <span>
              <i className="sw known"></i> уже в твоём словаре
            </span>
          </div>
        )}

        {/* Lesson Interactive Reader Text */}
        <div className="text" style={{ marginTop: '18px' }}>
          {readMode === 'immersion' && langProg.immersion === 100 && originalTokens ? (
            originalTokens.map((tokens, sIdx) => {
              const ruSentence = sentenceTokens[sIdx]?.map((t) => t.text).join('') || '';

              return (
                <div key={sIdx} className="original-sentence-block">
                  <p className="original-sentence-text">
                    {tokens.map((token) => {
                      if (token.kind === 'separator') {
                        return (
                          <span key={token.key} className={`sep ${token.isPunctuation ? 'punct' : ''}`}>
                            {token.text}
                          </span>
                        );
                      }

                      const effectiveWordId = token.wordId || `w_${token.text.toLowerCase()}`;
                      const word = token.wordId
                        ? (WORD_MAP[token.wordId] || GRAMMAR_WORD_MAP[token.wordId])
                        : undefined;
                      const isKnown = (word ? learnedSet.has(word.id) : false) || learnedSet.has(effectiveWordId);

                      return (
                        <button
                          key={token.key}
                          className={`tk ${isKnown ? 'known' : 'new'}`}
                          onClick={(e) => handleForeignWordClick(e, word?.id || effectiveWordId, token.text)}
                          title={word ? `Перевод: ${word.ru}` : 'Нажмите для перевода и озвучки'}
                        >
                          {token.text}
                        </button>
                      );
                    })}
                  </p>
                  {showSentenceRu && ruSentence && (
                    <div className="original-sentence-ru">{ruSentence}</div>
                  )}
                </div>
              );
            })
          ) : readMode === 'immersion' ? (
            sentenceTokens.map((tokens, sIdx) => (
              <p key={sIdx} style={{ marginBottom: '1.1em' }}>
                {tokens.map((token) => {
                  if (token.kind === 'separator') {
                    return (
                      <span key={token.key} className={`sep ${token.isPunctuation ? 'punct' : ''}`}>
                        {token.text}
                      </span>
                    );
                  }

                  const isForeign = Boolean(token.wordId && token.target && foreignTokenKeys.has(token.key));
                  const word = token.wordId
                    ? (WORD_MAP[token.wordId] || GRAMMAR_WORD_MAP[token.wordId])
                    : undefined;

                  if (isForeign && word) {
                    const isKnown = learnedSet.has(word.id);
                    return (
                      <button
                        key={token.key}
                        className={`tk ${isKnown ? 'known' : 'new'}`}
                        onClick={(e) => handleTokenClick(e, word.id)}
                        title={`Перевод: ${word.ru}`}
                      >
                        {token.target}
                      </button>
                    );
                  }

                  return (
                    <span key={token.key} className="nat">
                      {token.text}
                    </span>
                  );
                })}
              </p>
            ))
          ) : null}

          {readMode === 'original' &&
            originalTokens &&
            originalTokens.map((tokens, sIdx) => {
              const ruSentence = sentenceTokens[sIdx]?.map((t) => t.text).join('') || '';

              return (
                <div key={sIdx} className="original-sentence-block">
                  <p className="original-sentence-text">
                    {tokens.map((token) => {
                      if (token.kind === 'separator') {
                        return (
                          <span key={token.key} className={`sep ${token.isPunctuation ? 'punct' : ''}`}>
                            {token.text}
                          </span>
                        );
                      }

                      const effectiveWordId = token.wordId || `w_${token.text.toLowerCase()}`;
                      const word = token.wordId
                        ? (WORD_MAP[token.wordId] || GRAMMAR_WORD_MAP[token.wordId])
                        : undefined;
                      const isKnown = (word ? learnedSet.has(word.id) : false) || learnedSet.has(effectiveWordId);

                      return (
                        <button
                          key={token.key}
                          className={`tk ${isKnown ? 'known' : 'new'}`}
                          onClick={(e) => handleForeignWordClick(e, word?.id || effectiveWordId, token.text)}
                          title={word ? `Перевод: ${word.ru}` : 'Нажмите для перевода и озвучки'}
                        >
                          {token.text}
                        </button>
                      );
                    })}
                  </p>
                  {showSentenceRu && ruSentence && (
                    <div className="original-sentence-ru">{ruSentence}</div>
                  )}
                </div>
              );
            })}

          {readMode === 'russian' &&
            sentenceTokens.map((tokens, sIdx) => (
              <p key={sIdx} style={{ marginBottom: '1.1em' }}>
                {tokens.map((token) => (
                  <span key={token.key} className="nat">
                    {token.text}
                  </span>
                ))}
              </p>
            ))}
        </div>

        {!tasksStarted && (
          <div className="readbar">
            {totalQuestions > 0 ? (
              <>
                <button
                  className="btn pine big"
                  onClick={() => {
                    audioService.playClick();
                    setTasksStarted(true);
                  }}
                >
                  🎯 К заданиям урока
                </button>
                <span style={{ color: 'var(--ink2)', fontSize: '14px' }}>
                  выполни задания, чтобы засчитать урок и повысить погружение (+5%)
                </span>
              </>
            ) : (
              <>
                <button className="btn coral big" onClick={handleFinishLesson}>
                  Завершить чтение и получить награду 🎉
                </button>
                <span style={{ color: 'var(--ink2)', fontSize: '14px' }}>
                  Текст прочитан — закрепи результат!
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Task Section */}
      {tasksStarted && !lessonCompleted && (
        <div style={{ marginTop: '24px' }}>
          {/* Exercise 1: MCQ */}
          {mcqQuestions.length > 0 && (
            <div className="card tsec">
              <h3>
                <span className="tnum">1</span> Выбери верный перевод
              </h3>
              {mcqQuestions.map((q, qIdx) => {
                const userAns = mcqAnswers[qIdx];

                return (
                  <div key={qIdx} className="mrow">
                    <div className="qword">
                      {q.targetTxt}
                      <button
                        className="iconbtn"
                        style={{ marginLeft: '10px', verticalAlign: '-3px' }}
                        onClick={() => audioService.speak(q.targetTxt, currentLang)}
                        title="Озвучить"
                      >
                        🔊
                      </button>
                    </div>

                    <div className="opts">
                      {q.opts.map((opt, oIdx) => {
                        let btnCls = 'opt';
                        if (userAns !== undefined) {
                          if (opt === q.correctRu) btnCls += ' ok';
                          else if (userAns === opt) btnCls += ' bad';
                        }

                        return (
                          <button
                            key={oIdx}
                            className={btnCls}
                            disabled={userAns !== undefined}
                            onClick={() => handleMcqSelect(qIdx, q.wordId, opt)}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Exercise 2: Pairs */}
          {pairData.taskPairIds.length > 0 && (
            <div className="card tsec">
              <h3>
                <span className="tnum">2</span> Соедини пары слов
              </h3>
              <div className="pcols">
                <div>
                  {pairData.leftPairs.map((wordId) => {
                    const word = getReaderWord(wordId);
                    const txt = getTargetText(word);
                    const isDone = pairsMatched.includes(wordId);
                    const isSel = pairsSel?.side === 'L' && pairsSel?.id === wordId;

                    let cls = 'pb';
                    if (isDone) cls += ' done';
                    else if (isSel) cls += ' sel';

                    return (
                      <button
                        key={wordId}
                        className={cls}
                        style={{ width: '100%', marginBottom: '10px' }}
                        onClick={() => handlePairClick('L', wordId)}
                      >
                        {txt}
                      </button>
                    );
                  })}
                </div>

                <div>
                  {pairData.rightPairs.map((wordId) => {
                    const word = getReaderWord(wordId);
                    const txt = getRussianText(word);
                    const isDone = pairsMatched.includes(wordId);
                    const isSel = pairsSel?.side === 'R' && pairsSel?.id === wordId;

                    let cls = 'pb';
                    if (isDone) cls += ' done';
                    else if (isSel) cls += ' sel';

                    return (
                      <button
                        key={wordId}
                        className={cls}
                        style={{ width: '100%', marginBottom: '10px' }}
                        onClick={() => handlePairClick('R', wordId)}
                      >
                        {txt}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '13.5px', color: 'var(--ink2)', fontWeight: 700 }}>
                соединено: {pairsMatched.length} / {pairData.taskPairIds.length}
              </div>
            </div>
          )}

          {/* Exercise 3: Fill in the blank */}
          {fillQuestions.length > 0 && (
            <div className="card tsec">
              <h3>
                <span className="tnum">3</span> Вставь слово в контекст
              </h3>
              {fillQuestions.map((q, qIdx) => {
                const userAns = fillAnswers[qIdx];

                return (
                  <div key={qIdx} className="mrow">
                    <div style={{ fontSize: '17px', marginBottom: '12px' }}>
                      Переведи на {LANGUAGES[currentLang].name}: «<b>{q.ru}</b>»
                    </div>
                    <div className="opts">
                      {q.opts.map((opt, oIdx) => {
                        let btnCls = 'opt';
                        if (userAns !== undefined) {
                          if (opt === q.correct) btnCls += ' ok';
                          else if (userAns === opt) btnCls += ' bad';
                        }

                        return (
                          <button
                            key={oIdx}
                            className={btnCls}
                            disabled={userAns !== undefined}
                            onClick={() => handleFillSelect(qIdx, q.correct, opt)}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Finish Button */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              className="btn coral big"
              disabled={
                (mcqQuestions.length > 0 && !mcqDone) ||
                (pairData.taskPairIds.length > 0 && !pairsDone) ||
                (fillQuestions.length > 0 && !fillDone)
              }
              onClick={handleFinishLesson}
            >
              Завершить урок и получить награду 🎉
            </button>
          </div>
        </div>
      )}

      {/* Completion Result Card */}
      {lessonCompleted && completedResult && (
        <div className="card" style={{ marginTop: '24px', textAlign: 'center', padding: '32px 24px' }}>
          <h2 style={{ fontFamily: 'Unbounded', fontSize: '26px', marginBottom: '8px' }}>
            {completedResult.pct >= 65 ? 'Урок засчитан! 🎉' : 'Попробуй ещё раз 💪'}
          </h2>

          <div style={{ fontSize: '42px', fontWeight: 800, color: 'var(--pine)', margin: '14px 0' }}>
            {completedResult.pct}%
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '16px 0' }}>
            <span className={`chip ${completedResult.pct >= 65 ? 'sea' : 'coral'}`}>
              верно {completedResult.score} из {completedResult.total}
            </span>
            {completedResult.xpGained > 0 && (
              <span className="chip sun">+{completedResult.xpGained} XP</span>
            )}
          </div>

          {completedResult.streakMessage && (
            <p style={{ margin: '16px 0', fontSize: '15px', color: 'var(--ink2)' }}>
              {completedResult.streakMessage}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '22px' }}>
            <button className="btn sun big" onClick={() => onNavigate('lessons')}>
              К списку уроков →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
