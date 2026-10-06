import React, { useEffect, useMemo, useState } from 'react';
import { UserState } from '../types';
import { LANGUAGES } from '../data/languages';
import { GRAMMAR } from '../data/grammar';
import { audioService } from '../services/audioService';
import { StorageService } from '../services/storageService';
import { grammarLessonStats, withGrammarSession } from '../services/grammarService';
import { LEVEL_LABELS } from '../utils';
import { GrammarTrainer } from './GrammarTrainer';
import { Route } from '../routes';
import { Icon } from './icons';

interface GrammarViewProps {
  userState: UserState;
  onNavigate: (route: Route) => void;
  onUpdateState: (state: UserState) => void;
  onGoBack?: () => void;
  onRegisterBackHandler?: (handler: () => boolean) => () => void;
}

const LEVEL_FILTER_LABELS = ['Все уровни', ...LEVEL_LABELS];

export const GrammarView: React.FC<GrammarViewProps> = ({
  userState,
  onNavigate,
  onUpdateState,
  onGoBack,
  onRegisterBackHandler,
}) => {
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [filter, setFilter] = useState('all');
  const currentLang = userState.currentLang;
  const language = LANGUAGES[currentLang];
  const lessons = GRAMMAR[currentLang];
  // `grammarLessonStats` rebuilds every exercise of every topic, so it used to
  // run ~700 exercise builds on each render — including on every keystroke in
  // the trainer that is mounted next to it.
  const stats = useMemo(
    () => lessons.map((lesson) => ({ lesson, ...grammarLessonStats(userState, lesson, currentLang) })),
    [userState, lessons, currentLang]
  );
  const dueCount = stats.reduce((sum, item) => sum + item.due, 0);
  const learned = stats.filter((item) => item.percent === 100).length;
  const recommendation = stats.find((item) => item.due > 0) || stats.find((item) => item.percent < 100) || stats[0];
  const session = StorageService.getLangProgress(userState, currentLang).grammarSession;
  const resumable = stats.find((item) => item.lesson.id === session?.lessonId && session.exerciseIndex < item.total);
  const selectedLesson = lessons.find((lesson) => lesson.id === active);
  const visible = stats.filter((item) => (!level || item.lesson.level === level) &&
    (filter === 'all' || filter === 'sentence' && item.lesson.id.includes('-sentence-') || filter === 'review' && item.due > 0 || filter === 'new' && item.percent < 100));

  function start(id: string, resume = false) {
    // Resuming keeps the stored cursor, so there is nothing to write or persist.
    if (!resume) {
      const next = withGrammarSession(userState, currentLang, { lessonId: id, exerciseIndex: 0 });
      StorageService.save(next);
      onUpdateState(next);
    }
    setActive(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    if (!active) return undefined;
    return onRegisterBackHandler?.(() => {
      audioService.playClick();
      setActive(null);
      return true;
    });
  }, [active, onRegisterBackHandler]);

  if (selectedLesson) return <div className="view"><GrammarTrainer key={currentLang + ':' + selectedLesson.id} lesson={selectedLesson}
    userState={userState} onUpdateState={onUpdateState} onClose={() => setActive(null)} /></div>;

  return <div className="view">
    <button
      className="backlink"
      type="button"
      onClick={() => {
        audioService.playClick();
        if (onGoBack) onGoBack();
        else onNavigate('lessons');
      }}
    >
      <Icon name="chevron-left" className="sm" /> Назад
    </button>
    <div className="overline">{language.flag} {language.name} · грамматика</div>
    <h1 className="display">От правила к своей фразе</h1>
    <p className="sub">Разбери пример, собери предложение, восстанови пропуск и напиши без опоры. В уроках конструктора — ещё и измени лицо, время или тип фразы.</p>
    <section className="card grammar-workbench">
      <div className="grammar-toolbar"><b>Освоено тем: {learned} / {lessons.length}</b><span>Заданий на повторение: {dueCount}</span></div>
      <p>Рекомендуем: <b>{recommendation.lesson.title}</b>{recommendation.due > 0 ? ' · пора повторить' : ' · следующий шаг'}</p>
      <div className="grammar-toolbar">
        <button className="btn sun" onClick={() => start(recommendation.lesson.id)}>Практиковаться →</button>
        {resumable && <button className="btn" onClick={() => start(resumable.lesson.id, true)}>Продолжить: {resumable.lesson.title}</button>}
        <button className="btn" onClick={() => onNavigate('practice')}>Практика слов</button>
      </div>
      <small>Освоение засчитывается за самостоятельный ответ. Ошибки и подсказки возвращают задание в повторение; за повторный успех в тот же день XP не начисляются.</small>
    </section>
    <div className="grammar-toolbar grammar-filters">
      <label>Уровень <select value={level} onChange={(event) => setLevel(Number(event.target.value))}>
        {LEVEL_FILTER_LABELS.map((name, i) => <option key={name} value={i}>{name}</option>)}
      </select></label>
      <label>Темы <select value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="all">Все темы</option><option value="sentence">Конструктор предложений</option><option value="review">Пора повторить</option><option value="new">Ещё не освоены</option>
      </select></label>
    </div>
    <div className="grammar-grid">
      {visible.map(({ lesson: item, total, percent, due }, index) => {
        const isOpen = openLesson === item.id;
        return <article className={'card grammar-card ' + (isOpen ? 'is-open' : '')} key={item.id}>
          <button className="grammar-head" onClick={() => setOpenLesson(isOpen ? null : item.id)} aria-expanded={isOpen}>
            <span className="grammar-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="grammar-title"><span className="chip sun">{LEVEL_LABELS[item.level - 1]}</span><b>{item.title}</b></span>
            <span className="grammar-chevron">{isOpen ? '−' : '+'}</span>
          </button>
          <p className="grammar-explanation">{item.explanation}</p>
          {isOpen && <div className="grammar-examples">
            {item.examples.map((example, i) => <div className="grammar-example" key={item.id + '-' + i}>
              <div className="grammar-example-line"><button className="example-target" lang={currentLang} onClick={() => audioService.speak(example.target, currentLang)} title="Озвучить пример">{example.target} <Icon name="volume" className="sm" /></button><span className="example-ru">{example.ru}</span></div>
              {example.chunks && <div className="grammar-chunks">{example.chunks.map((chunk, j) => <div key={j}><b lang={currentLang}>{chunk.text}</b><small>{chunk.role}</small></div>)}</div>}
              {example.note && <small>{example.note}</small>}
            </div>)}
          </div>}
          <div className="grammar-card-footer">
            <div className="grammar-topic-progress">
              <div className="grammar-progress-label"><b>{percent}% освоено</b><small>{total} заданий{due ? ' · повторить ' + due : ''}</small></div>
              <progress max={100} value={percent} aria-label={'Освоение: ' + item.title} />
            </div>
            <button className="btn small pine" onClick={() => start(item.id)}>Тренировать тему →</button>
          </div>
        </article>;
      })}
    </div>
    {visible.length === 0 && <p className="grammar-empty">Для этих фильтров тем нет. Выбери другой уровень или открой все темы.</p>}
  </div>;
};
