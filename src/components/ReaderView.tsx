import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lesson, UserState, Word } from '../types';
import { LANGUAGES } from '../data/languages';
import { StorageService, getLocalDateKey } from '../services/storageService';
import { toastService } from '../services/toastService';
import { audioService } from '../services/audioService';
import {
  getImmersionStats,
  ImmersionToken,
  selectImmersionTokenKeys,
  tokenizeLessonSentence,
  tokenizeForeignSentence,
} from '../services/immersionService';
import {
  getImmersionProfile,
  IMMERSION_LESSONS_PER_STEP,
  IMMERSION_PRESETS,
  clearManualImmersion,
  isImmersionManual,
  noteManualImmersion,
  decideDepth,
} from '../services/immersionProfile';
import { getImmersiveLessonText } from '../data/immersiveTranslations';
import { shuffle } from '../utils';
import { buildRussianDistractors, buildTargetDistractors, getRussianText, getTargetText, getWord } from '../utils/words';
import confetti from 'canvas-confetti';
import { createSeededRandom } from './seededRandom';
import { PairSide, usePairsMatching } from './usePairsMatching';
import { Route } from '../routes';
import { Icon } from './icons';

interface ReaderViewProps {
  lesson: Lesson;
  userState: UserState;
  onNavigate: (route: Route) => void;
  /**
   * Accepted but unused here: the reader learns and forgets words exclusively
   * through the word popup, which lives in `App.tsx` and owns both callbacks.
   * The two props are part of the type because `App.tsx` passes them to this
   * call site; dropping them requires a change in that file.
   */
  onLearnWord?: (wordId: string) => void;
  onForgetWord?: (wordId: string) => void;
  onOpenWordPopup: (word: Word, rect: DOMRect, contextSentence?: string) => void;
  onUpdateState: (newState: UserState) => void;
}

type ReadMode = 'immersion' | 'original' | 'russian';

/** How many concept words feed each of the three lesson exercises. */
const MCQ_LIMIT = 5;
const PAIRS_LIMIT = 6;
const FILL_LIMIT = 3;
/** Wrong answers added on top of the correct one in every option list. */
const OPTION_DISTRACTORS = 3;
/** Score in percent a lesson must reach to be counted as passed. */
const PASS_PERCENT = 65;

interface OriginalSentenceProps {
  tokens: ImmersionToken[];
  ruSentence: string;
  showRu: boolean;
  learnedSet: Set<string>;
  onWordClick: (
    event: React.MouseEvent<HTMLButtonElement>,
    wordId: string | undefined,
    text: string,
    contextSentence?: string
  ) => void;
}

/**
 * One fully target-language sentence: every token is a button that opens the
 * word popup, and the Russian source line is an optional sub-caption.
 *
 * Rendered by both the "Оригинал" tab and the 100% immersion mode, which
 * previously carried two identical copies of this markup.
 */
const OriginalSentence = React.memo(function OriginalSentence({
  tokens,
  ruSentence,
  showRu,
  learnedSet,
  onWordClick,
}: OriginalSentenceProps) {
  const sentenceText = tokens.map((t) => t.text).join('');

  return (
    <div className="original-sentence-block">
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
          const word = token.wordId ? getWord(token.wordId) : undefined;
          const isKnown = (word ? learnedSet.has(word.id) : false) || learnedSet.has(effectiveWordId);

          return (
            <button
              key={token.key}
              className={`tk ${isKnown ? 'known' : 'new'}`}
              onClick={(e) => onWordClick(e, word?.id || effectiveWordId, token.text, sentenceText)}
              title={word ? `Перевод: ${word.ru}` : 'Нажмите для перевода и озвучки'}
            >
              {token.text}
            </button>
          );
        })}
      </p>
      {showRu && ruSentence && <div className="original-sentence-ru">{ruSentence}</div>}
    </div>
  );
});

interface OriginalSentencesProps extends Omit<OriginalSentenceProps, 'tokens' | 'ruSentence'> {
  tokensBySentence: ImmersionToken[][];
  ruSentences: string[];
}

const OriginalSentences = React.memo(function OriginalSentences({
  tokensBySentence,
  ruSentences,
  showRu,
  learnedSet,
  onWordClick,
}: OriginalSentencesProps) {
  return (
    <>
      {tokensBySentence.map((tokens, sIdx) => (
        <OriginalSentence
          key={sIdx}
          tokens={tokens}
          ruSentence={ruSentences[sIdx] || ''}
          showRu={showRu}
          learnedSet={learnedSet}
          onWordClick={onWordClick}
        />
      ))}
    </>
  );
});

export const ReaderView: React.FC<ReaderViewProps> = ({
  lesson,
  userState,
  onNavigate,
  onOpenWordPopup,
  onUpdateState,
}) => {
  const currentLang = userState.currentLang;
  const langProg = StorageService.getLangProgress(userState, currentLang);
  const learnedSet = useMemo(
    () => new Set(langProg.learnedWords),
    // Only the id array can change this set. `userState.xp` and
    // `userState.languages` were never read here, and `userState` is mutated in
    // place, so listing them only forced useless recomputations.
    [langProg.learnedWords]
  );
  const immersionProfile = getImmersionProfile(langProg.immersion);

  const localizedSentences = useMemo(
    () => getImmersiveLessonText(lesson.id, currentLang),
    [lesson.id, currentLang]
  );

  const [readMode, setReadMode] = useState<ReadMode>('immersion');
  const [showSentenceRu, setShowSentenceRu] = useState(true);
  const [clozeMode, setClozeMode] = useState(false);
  const [revealedClozeKeys, setRevealedClozeKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setRevealedClozeKeys(new Set());
  }, [lesson.id, currentLang]);

  // Exercise & quiz states
  const [tasksStarted, setTasksStarted] = useState(false);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const [mcqScore, setMcqScore] = useState<number>(0);
  const [mcqDone, setMcqDone] = useState(false);

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

  // Russian source line for every original sentence, reused by both reading modes
  const ruSentences = useMemo(
    () => sentenceTokens.map((tokens) => tokens.map((token) => token.text).join('')),
    [sentenceTokens]
  );

  // Concept words for exercises
  const conceptIds = useMemo(() => {
    const ids = new Set<string>();
    sentenceTokens.flat().forEach((token) => {
      if (!token.wordId) return;
      const word = getWord(token.wordId);
      if (word && getTargetText(word, currentLang) && getRussianText(word)) ids.add(token.wordId);
    });
    return Array.from(ids);
    // `currentLang` is read through `getTargetText`, so switching the language on
    // the same lesson has to rebuild the exercise vocabulary as well.
  }, [sentenceTokens, currentLang]);

  // Precompute static MCQ Task Data
  const mcqQuestions = useMemo(() => {
    return conceptIds.slice(0, MCQ_LIMIT).flatMap((wordId) => {
      const word = getWord(wordId);
      const targetTxt = getTargetText(word, currentLang);
      const correctRu = getRussianText(word);
      if (!word || !targetTxt || !correctRu) return [];

      // One seeded source per question keeps the four buttons in the same order
      // across every re-render and across StrictMode's double invocation.
      const random = createSeededRandom(`${lesson.id}:${currentLang}:mcq:${wordId}`);
      const distractors = buildRussianDistractors(correctRu, wordId, OPTION_DISTRACTORS, random);

      return [{ wordId, targetTxt, correctRu, opts: shuffle([correctRu, ...distractors], random) }];
    });
  }, [conceptIds, currentLang, lesson.id]);

  // Precompute static Pairs Task Data
  const pairData = useMemo(() => {
    const taskPairIds = conceptIds.slice(0, PAIRS_LIMIT);
    return {
      taskPairIds,
      leftPairs: taskPairIds,
      rightPairs: shuffle(taskPairIds, createSeededRandom(`${lesson.id}:${currentLang}:pairs`)),
    };
  }, [conceptIds, currentLang, lesson.id]);

  // Precompute static Fill-in Blanks Task Data
  const fillQuestions = useMemo(() => {
    return conceptIds.slice(0, FILL_LIMIT).flatMap((wordId) => {
      const word = getWord(wordId);
      const correctVal = getTargetText(word, currentLang);
      const russianText = getRussianText(word);
      if (!word || !correctVal || !russianText) return [];

      const random = createSeededRandom(`${lesson.id}:${currentLang}:fill:${wordId}`);
      const distractors = buildTargetDistractors(
        correctVal,
        wordId,
        currentLang,
        OPTION_DISTRACTORS,
        random
      );

      return [{ wordId, correct: correctVal, ru: russianText, opts: shuffle([correctVal, ...distractors], random) }];
    });
  }, [conceptIds, currentLang, lesson.id]);

  const totalQuestions = mcqQuestions.length + pairData.taskPairIds.length + fillQuestions.length;

  const pairs = usePairsMatching(pairData.taskPairIds.length);
  // Only a finished round contributes; before that the score stays at zero even
  // if the learner already matched some pairs.
  const pairsScore = useMemo(
    () => (pairs.isDone ? Math.max(0, pairData.taskPairIds.length - pairs.errors) : 0),
    [pairs.isDone, pairs.errors, pairData.taskPairIds.length]
  );

  // `App.tsx` passes a fresh inline arrow on every render, so the popup opener
  // is read through a ref. That keeps `handleForeignWordClick` stable, which is
  // what lets the memoized original sentences skip re-rendering.
  const openWordPopupRef = useRef(onOpenWordPopup);
  useEffect(() => {
    openWordPopupRef.current = onOpenWordPopup;
  }, [onOpenWordPopup]);

  // Whether the dial is hand-set. Read once on mount and refreshed on change, so
  // the "return to automatic" affordance can appear without polling storage.
  const [manualDepth, setManualDepth] = useState(() => isImmersionManual());
  useEffect(() => {
    setManualDepth(isImmersionManual());
  }, [userState]);

  // Handle in-reader immersion slider change
  const handleImmersionChange = (newVal: number) => {
    const progress = StorageService.ensureLangProgress(userState, currentLang);
    progress.immersion = newVal;
    // A hand-set depth outranks the engine from here on, and starting a new
    // depth always begins a new consolidation run.
    noteManualImmersion();
    setManualDepth(true);
    progress.depthLessons = 0;
    StorageService.save(userState);
    onUpdateState({ ...userState });
  };

  // Handle clicking word in text
  const handleTokenClick = (e: React.MouseEvent<HTMLButtonElement>, wordId: string, sIdx?: number) => {
    e.stopPropagation();
    const word = getWord(wordId);
    if (!word) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let contextStr: string | undefined;
    if (sIdx !== undefined && sentenceTokens[sIdx]) {
      contextStr = sentenceTokens[sIdx]
        .map((t) => (t.wordId && t.target && foreignTokenKeys.has(t.key) ? t.target : t.text))
        .join('');
    }
    onOpenWordPopup(word, rect, contextStr);
  };

  const handleForeignWordClick = useCallback(
    (
      e: React.MouseEvent<HTMLButtonElement>,
      wordId: string | undefined,
      text: string,
      contextSentence?: string
    ) => {
      e.stopPropagation();
      const word = wordId ? getWord(wordId) : undefined;
      if (word) {
        const rect = e.currentTarget.getBoundingClientRect();
        openWordPopupRef.current(word, rect, contextSentence);
      } else {
        // Do not create a fake dictionary card with the foreign word as its
        // Russian translation. Unknown tokens can still be pronounced, but
        // they must not enter learnedWords and later produce empty quiz options.
        audioService.speak(text, currentLang);
      }
    },
    [currentLang]
  );

  const handleMcqSelect = (qIdx: number, wordId: string, chosenOpt: string) => {
    if (mcqAnswers[qIdx] !== undefined) return;
    const word = getWord(wordId);
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
    const pass = totalQuestions === 0 || pct >= PASS_PERCENT;

    let xpGain = 0;
let streakMsg = '';
let depthNote = '';

    // `ensureLangProgress` and the fields below are mutated in place; this is the
    // project-wide pattern and the `{ ...userState }` copy at the end is what
    // makes React and the achievement checks observe the new values.
    const currentProgress = StorageService.ensureLangProgress(userState, currentLang);
    const isFirstTime = !currentProgress.doneLessons[lesson.id];

    if (pass) {
      if (isFirstTime) {
        // perfectCount used to grow on every replay of a perfect lesson, so the
        // counter no longer meant "lessons passed at 100%". It now follows the
        // same first-attempt rule as doneLessons and the XP reward below.
        if (pct === 100) {
          userState.perfectCount += 1;
        }

        currentProgress.doneLessons[lesson.id] = {
          score: totalScore,
          pct,
          date: getLocalDateKey(),
        };

        xpGain = 25 + totalScore * 3;

        // The dial moves on its own, but only once the learner has held the
        // current depth for a run of lessons — advancing after every lesson
        // reached full immersion by lesson fifteen, which is a page of easy
        // fifths being mistaken for the whole language.
        if (!isImmersionManual()) {
          const depth = decideDepth(
            currentProgress.immersion,
            currentProgress.depthLessons ?? 0,
            { pct, passed: pass },
          );
          const from = currentProgress.immersion;
          currentProgress.immersion = depth.immersion;
          currentProgress.depthLessons = depth.lessonsAtDepth;
          if (depth.moved === 'up') {
            streakMsg = '';
            depthNote = `Глубина выросла: ${from}% → ${depth.immersion}% — закрепи на следующих ${IMMERSION_LESSONS_PER_STEP} уроках.`;
          } else if (depth.moved === 'down') {
            depthNote = `Глубина снижена: ${from}% → ${depth.immersion}%.`;
          }
        }

        const streakResult = StorageService.updateStreak(userState);
        if (streakResult.updated) {
          streakMsg = `Стрик: ${userState.streak.current} дн. — так держать!`;
        } else {
          streakMsg = 'Сегодняшний стрик уже засчитан.';
        }
        if (depthNote) {
          streakMsg = streakMsg ? `${streakMsg} | ${depthNote}` : depthNote;
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
    StorageService.checkAndUnlockAchievements(userState, toastService.show);
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
          {/* The measured share, never the setting. The slider is a share of the whole
              text, so 60% of a 50-word text is 30 words — and only `actualShare`
              says how many were really shown. */}
          <span className="chip sun">
            <Icon name="waves" className="sm" /> {immersionStats.actualShare}% слов на языке
          </span>
          <span className="chip">
            <Icon name="target" className="sm" /> {immersionStats.immersedConcepts} из {immersionStats.totalConcepts} переводимых слов
          </span>
          <span className="chip">
            <Icon name="sparkles" className="sm" /> Новых: {immersionStats.newCount}
          </span>
          <span className="chip sea"><Icon name="check" className="sm" /> В словаре: {immersionStats.learnedCount}</span>
          {langProg.doneLessons[lesson.id] && <span className="chip dim"><Icon name="check" className="sm" /> урок пройден</span>}
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
              <Icon name="waves" className="sm" /> Погружение ({langProg.immersion}%)
            </button>
            {localizedSentences && (
              <button
                className={`reader-tab ${readMode === 'original' ? 'active' : ''}`}
                onClick={() => {
                  audioService.playClick();
                  setReadMode('original');
                }}
              >
                <Icon name="book-open" className="sm" /> Оригинал ({LANGUAGES[currentLang].name})
              </button>
            )}
            <button
              className={`reader-tab ${readMode === 'russian' ? 'active' : ''}`}
              onClick={() => {
                audioService.playClick();
                setReadMode('russian');
              }}
            >
              Русский
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

              {/* Without this the engine could be switched off forever by one stray tap on
                  the slider, with no way back. Only shown while the dial is
                  hand-set, so it is not noise the rest of the time. */}
              {manualDepth && (
                <button
                  type="button"
                  className="catchip"
                  onClick={() => {
                    audioService.playClick();
                    clearManualImmersion();
                    setManualDepth(false);
                  }}
                >
                  ↺ Вернуть автоматический режим
                </button>
              )}
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
{/* The setting is a share of the whole text, and only the words
                      that have an entry in this language can follow it. So the
                      banner reports what was achieved and names the ceiling,
                      instead of claiming the text is fully translated. */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="trophy" className="sm" /> <b>Глубина {langProg.immersion}%:</b>{' '}
                    {immersionStats.actualShare}% слов текста на {LANGUAGES[currentLang].name}.{' '}
                    {immersionStats.actualShare < langProg.immersion
                      ? `Остальное не переводится автоматически: в этом языке есть запись только для ${immersionStats.totalConcepts} из ${immersionStats.totalWords} слов.`
                      : 'Все переводимые слова этого урока на языке.'}{' '}
                    Нажмите на любое слово для перевода и озвучки!
                  </span>
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
              <span style={{ fontSize: '13px', color: 'var(--ink2)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="lightbulb" className="sm" /> Нажми на любое слово, чтобы услышать произношение и посмотреть перевод
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
          <div className="legend" style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span>
                <i className="sw new"></i> новое слово — нажми, чтобы выучить (+2 XP)
              </span>
              <span>
                <i className="sw known"></i> уже в твоём словаре
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className={`catchip ${clozeMode ? 'pine' : ''}`}
                onClick={() => {
                  audioService.playClick();
                  setClozeMode((prev) => !prev);
                  setRevealedClozeKeys(new Set());
                }}
                title="Скрывает иностранные слова: сначала вспомни сам, затем открой!"
              >
                <Icon name="brain" className="sm" /> {clozeMode ? 'Самопроверка: ВКЛ' : 'Самопроверка'}
              </button>
              {clozeMode && (
                <button
                  type="button"
                  className="btn small ghost"
                  style={{ padding: '2px 8px', fontSize: '12px' }}
                  onClick={() => {
                    audioService.playClick();
                    if (revealedClozeKeys.size >= foreignTokenKeys.size) {
                      setRevealedClozeKeys(new Set());
                    } else {
                      setRevealedClozeKeys(new Set(foreignTokenKeys));
                    }
                  }}
                >
                  {revealedClozeKeys.size >= foreignTokenKeys.size ? 'Скрыть все' : 'Открыть все'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Lesson Interactive Reader Text */}
        <div className="text" style={{ marginTop: '18px' }}>
          {readMode === 'immersion' && langProg.immersion === 100 && originalTokens ? (
            <OriginalSentences
              tokensBySentence={originalTokens}
              ruSentences={ruSentences}
              showRu={showSentenceRu}
              learnedSet={learnedSet}
              onWordClick={handleForeignWordClick}
            />
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
                  const word = token.wordId ? getWord(token.wordId) : undefined;

                  if (isForeign && word) {
                    const isKnown = learnedSet.has(word.id);
                    const isClozeMasked = clozeMode && !revealedClozeKeys.has(token.key);

                    if (isClozeMasked) {
                      return (
                        <button
                          key={token.key}
                          className="tk cloze-masked"
                          onClick={(e) => {
                            e.stopPropagation();
                            audioService.playPop();
                            setRevealedClozeKeys((prev) => new Set([...prev, token.key]));
                            if (token.target) {
                              audioService.speak(token.target, currentLang);
                            }
                          }}
                          title={`Самопроверка: вспомни перевод для «${word.ru}»`}
                        >
                          <span style={{ opacity: 0.7, marginRight: '2px' }}>?</span> {word.ru}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={token.key}
                        className={`tk ${isKnown ? 'known' : 'new'} ${clozeMode ? 'cloze-revealed' : ''}`}
                        onClick={(e) => handleTokenClick(e, word.id, sIdx)}
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

          {readMode === 'original' && originalTokens && (
            <OriginalSentences
              tokensBySentence={originalTokens}
              ruSentences={ruSentences}
              showRu={showSentenceRu}
              learnedSet={learnedSet}
              onWordClick={handleForeignWordClick}
            />
          )}

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
                  <Icon name="target" /> К заданиям урока
                </button>
                <span style={{ color: 'var(--ink2)', fontSize: '14px' }}>
                  {/* Was "+5% per lesson", which described the engine that raced
                      to full immersion. The dial now moves by a whole preset, and
                      only after a run of lessons. */}
                  {manualDepth
                    ? 'выполни задания, чтобы засчитать урок'
                    : `выполни задания, чтобы засчитать урок. Глубина сама вырастет после ${IMMERSION_LESSONS_PER_STEP} сильных уроков`}
                </span>
              </>
            ) : (
              <>
                <button className="btn coral big" onClick={handleFinishLesson}>
                  <Icon name="trophy" /> Завершить чтение и получить награду
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
                        style={{ marginLeft: '10px', verticalAlign: 'middle' }}
                        onClick={() => audioService.speak(q.targetTxt, currentLang)}
                        title="Озвучить"
                        aria-label={`Озвучить ${q.targetTxt}`}
                      >
                        <Icon name="volume" />
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
                    const txt = getTargetText(getWord(wordId), currentLang);
                    const isDone = pairs.matched.includes(wordId);
                    const isSel = pairs.selection?.side === 'L' && pairs.selection?.id === wordId;

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
                    const txt = getRussianText(getWord(wordId));
                    const isDone = pairs.matched.includes(wordId);
                    const isSel = pairs.selection?.side === 'R' && pairs.selection?.id === wordId;

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
                соединено: {pairs.matched.length} / {pairData.taskPairIds.length}
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
                (pairData.taskPairIds.length > 0 && !pairs.isDone) ||
                (fillQuestions.length > 0 && !fillDone)
              }
              onClick={handleFinishLesson}
            >
              <Icon name="trophy" /> Завершить урок и получить награду
            </button>
          </div>
        </div>
      )}

      {/* Completion Result Card */}
      {lessonCompleted && completedResult && (
        <div className="card" style={{ marginTop: '24px', textAlign: 'center', padding: '32px 24px' }}>
          <h2 style={{ fontFamily: 'Unbounded', fontSize: '26px', marginBottom: '8px' }}>
            {completedResult.pct >= PASS_PERCENT ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                Урок засчитан! <Icon name="trophy" size={26} />
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                Попробуй ещё раз <Icon name="repeat" size={22} />
              </span>
            )}
          </h2>

          <div style={{ fontSize: '42px', fontWeight: 800, color: 'var(--pine)', margin: '14px 0' }}>
            {completedResult.pct}%
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '16px 0' }}>
            <span className={`chip ${completedResult.pct >= PASS_PERCENT ? 'sea' : 'coral'}`}>
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
