import { useMemo, useRef, useState } from 'react';
import { GrammarLesson, UserState } from '../types';
import { audioService } from '../services/audioService';
import { StorageService } from '../services/storageService';
import {
  buildGrammarExercises,
  checkGrammarAnswer,
  GrammarMode,
  recordGrammarAnswer,
  shuffledTokenIndices,
  withGrammarSession,
} from '../services/grammarService';
import { VirtualKeyboard } from './VirtualKeyboard';

interface Props {
  lesson: GrammarLesson;
  userState: UserState;
  onUpdateState: (state: UserState) => void;
  onClose: () => void;
}

/** `Record<GrammarMode, string>` makes a new exercise mode a compile error here. */
const stageNames: Record<GrammarMode, string> = {
  build: 'Собери фразу',
  gap: 'Восстанови пропуск',
  write: 'Напиши по памяти',
  transform: 'Измени конструкцию',
};

export function GrammarTrainer({ lesson, userState, onUpdateState, onClose }: Props) {
  const lang = userState.currentLang;
  // Rebuilding every exercise of the topic on each keystroke is pure waste: the
  // set only depends on the topic and the target language.
  const exercises = useMemo(() => buildGrammarExercises(lesson, lang), [lesson, lang]);
  const session = StorageService.getLangProgress(userState, lang).grammarSession;
  const [index, setIndex] = useState(session?.lessonId === lesson.id ? Math.min(session.exerciseIndex, exercises.length) : 0);
  const [selected, setSelected] = useState<number[]>([]);
  const [input, setInput] = useState('');
  const [assisted, setAssisted] = useState(session?.lessonId === lesson.id && session.assisted === true);
  const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [bank, setBank] = useState(() => shuffledTokenIndices(exercises[Math.min(index, exercises.length - 1)]?.tokens || []));
  const checking = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const exercise = exercises[index];
  // The saved cursor is an index into this build's exercise list. If the topic
  // data changed, the stored index can address a different mode (or nothing),
  // so the `transform` prompt is read through a guard instead of `!`.
  const transformPrompt = exercise?.mode === 'transform' ? exercise.example.transform?.prompt : undefined;

  function saveCursor(nextIndex: number) {
    const next = withGrammarSession(userState, lang, { lessonId: lesson.id, exerciseIndex: nextIndex });
    StorageService.save(next);
    onUpdateState(next);
  }

  function advance() {
    const nextIndex = index + 1;
    saveCursor(nextIndex);
    setIndex(nextIndex);
    setInput(''); setSelected([]); setHint(false); setAssisted(false); setFeedback(null);
    setBank(shuffledTokenIndices(exercises[nextIndex]?.tokens || []));
    checking.current = false;
    requestAnimationFrame(() => heading.current?.focus());
  }

  function check() {
    if (checking.current || feedback || !exercise) return;
    const answer = exercise.mode === 'build' ? selected.map((i) => exercise.tokens[i]).join(lang === 'ja' ? '' : ' ') : input;
    if (!answer.trim()) return;
    checking.current = true;
    const result = checkGrammarAnswer(exercise, answer, lang);
    const recorded = recordGrammarAnswer(userState, lang, exercise.id, result.correct, assisted);
    const next = withGrammarSession(recorded, lang, { lessonId: lesson.id, exerciseIndex: index, assisted: assisted || !result.correct });
    StorageService.save(next);
    onUpdateState(next);
    setFeedback(result);
    if (!result.correct) setAssisted(true);
  }

  if (!exercise) {
    const saved = StorageService.getLangProgress(userState, lang).grammarProgress || {};
    const weak = exercises.filter((item) => saved[item.id]?.needsReview).length;
    return <section className="card grammar-workbench">
      <h2 ref={heading} tabIndex={-1}>Практика завершена</h2>
      <p>Пройдено заданий: {exercises.length}. Требуют самостоятельного повторения: {weak}.</p>
      <p>Ответы с подсказкой помогают разобраться. Чтобы закрепить навык, повтори их без опоры; следующие повторения назначаются через 1, 3, 7 и 14 дней.</p>
      <button className="btn sun" onClick={onClose}>Вернуться к темам</button>
    </section>;
  }

  return <section className="card grammar-workbench" aria-label="Практика грамматики">
    <div className="grammar-toolbar"><span>Задание {index + 1} / {exercises.length}</span><button className="btn small" onClick={onClose}>К темам · сохранить</button></div>
    <progress max={exercises.length} value={index} aria-label="Прогресс практики" />
    <div className="overline">{lesson.title}</div>
    <h2 ref={heading} tabIndex={-1}>{stageNames[exercise.mode]}</h2>
    <details><summary>Правило этой темы</summary><p>{lesson.explanation}</p></details>
    <p>{exercise.mode === 'transform' ? (transformPrompt ?? exercise.example.target) : exercise.example.ru}</p>
    {exercise.mode === 'transform' && <p lang={lang} className="grammar-source">{exercise.example.target}</p>}
    {exercise.mode === 'gap' && <p className="grammar-source" lang={lang}>{exercise.tokens.map((token, i) => i === exercise.gapIndex ? '____' : token).join(lang === 'ja' ? '' : ' ')}</p>}
    {exercise.mode === 'write' && <small>Восстанови изученную фразу. Проверяются образец и предусмотренные варианты, а не все возможные переводы.</small>}
    <form onSubmit={(event) => { event.preventDefault(); check(); }}>
      {exercise.mode === 'build' ? <>
        <div className="grammar-token-zone" aria-label="Собранное предложение" lang={lang}>
          {selected.length === 0 && <span>Нажимай на части фразы ниже</span>}
          {selected.map((tokenIndex, position) => <button type="button" className="btn small" disabled={!!feedback} key={tokenIndex}
            aria-label={`Убрать ${exercise.tokens[tokenIndex]}`}
            onClick={() => setSelected(selected.filter((_, i) => i !== position))}>{exercise.tokens[tokenIndex]}</button>)}
        </div>
        <div className="grammar-token-zone" aria-label="Доступные части предложения" lang={lang}>
          {bank.map((tokenIndex) => <button type="button" className="btn small" key={tokenIndex}
            disabled={selected.includes(tokenIndex) || !!feedback}
            onClick={() => setSelected([...selected, tokenIndex])}>{exercise.tokens[tokenIndex]}</button>)}
        </div>
      </> : <>
        <label className="grammar-answer">{exercise.mode === 'gap' ? 'Недостающая часть' : 'Твой ответ'}
          <input lang={lang} value={input} onChange={(event) => setInput(event.target.value)} disabled={!!feedback}
            autoComplete="off" autoCapitalize="off" spellCheck={false} aria-describedby="grammar-feedback" />
        </label>
        <VirtualKeyboard lang={lang} value={input} onChange={setInput} disabled={!!feedback} />
      </>}
      <div className="grammar-toolbar">
        <button type="submit" className="btn sun" disabled={!!feedback || (exercise.mode === 'build' ? selected.length !== exercise.tokens.length : !input.trim())}>Проверить</button>
        <button type="button" className="btn" disabled={!!feedback} onClick={() => {
          setHint(true); setAssisted(true);
          const next = withGrammarSession(userState, lang, { lessonId: lesson.id, exerciseIndex: index, assisted: true });
          StorageService.save(next); onUpdateState(next);
        }}>Подсказка</button>
      </div>
    </form>
    {hint && <aside className="grammar-feedback"><b>Опора</b><p>{exercise.explanation}</p><p lang={lang}>{exercise.answer}</p><small>Этот ответ попадёт в повторение без подсказки.</small></aside>}
    <div id="grammar-feedback" aria-live="polite">
      {feedback && <div className={`grammar-feedback ${feedback.correct ? 'is-correct' : 'is-error'}`}>
        <b>{feedback.correct ? 'Получилось' : 'Давай разберём'}</b><p>{feedback.message}</p>
        {!feedback.correct && <p>Образец: <span lang={lang}>{exercise.answer}</span></p>}
        <button className="btn small" onClick={() => audioService.speak(exercise.mode === 'gap' ? exercise.example.target : exercise.answer, lang)}>🔊 Послушать</button>
        {feedback.correct ? <button className="btn pine" onClick={advance}>Дальше →</button> : <button className="btn sun" onClick={() => { setFeedback(null); checking.current = false; }}>Попробовать снова</button>}
      </div>}
    </div>
  </section>;
}
