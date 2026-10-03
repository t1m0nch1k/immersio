import React, { useMemo, useState } from 'react';
import { Lesson, UserState } from '../types';
import { LANGUAGES } from '../data/languages';
import { StorageService } from '../services/storageService';
import { audioService } from '../services/audioService';
import { DailyPlanCard } from './DailyPlanCard';
import { StreakFlameWidget } from './StreakFlameWidget';
import { ListeningTodayCard } from './ListeningTodayCard';
import { Route } from '../routes';
import { Icon } from './icons';

interface LessonListProps {
  userState: UserState;
  lessons: Lesson[];
  onOpenLesson: (lessonId: string) => void;
  onNavigateCustom: () => void;
  onUpdateState: (newState: UserState) => void;
  onNavigate: (route: Route) => void;
}

export const LessonList: React.FC<LessonListProps> = ({
  userState,
  lessons,
  onOpenLesson,
  onNavigateCustom,
  onUpdateState,
  onNavigate,
}) => {
  const [levelFilter, setLevelFilter] = useState<number | 'custom' | null>(null);

  const langProg = StorageService.getLangProgress(userState, userState.currentLang);
  const currentLangObj = LANGUAGES[userState.currentLang] || LANGUAGES.en;

  // Combine standard lessons and custom lessons.
  // `userState` is the dependency on purpose: `CustomTextImport` appends a custom
  // lesson with `customLessons.push(...)`, so the array reference survives the
  // change and only a new state object reveals it.
  const allLessons = useMemo(
    () => [...lessons, ...userState.customLessons],
    [lessons, userState]
  );

  // Find next uncompleted lesson
  const nextLesson = useMemo(
    () => allLessons.find((l) => !langProg.doneLessons[l.id]),
    [allLessons, userState]
  );

  const filteredLessons = useMemo(
    () =>
      allLessons.filter((l) => {
        if (levelFilter === 'custom') return l.id.startsWith('custom_');
        if (levelFilter !== null) return l.lvl === levelFilter;
        return true;
      }),
    [allLessons, levelFilter, userState]
  );

  // Number of dictionary concepts per lesson. `ls.sent.flat().filter(...)` used
  // to run once per visible card on every render, re-walking and re-flattening
  // every sentence of every lesson shown on screen.
  const conceptCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allLessons.forEach((lesson) => {
      counts.set(
        lesson.id,
        lesson.sent.flat().filter((piece) => typeof piece !== 'string' && piece.id).length
      );
    });
    return counts;
  }, [allLessons, userState]);

  return (
    <div className="view">
      <div className="overline">
        постепенное погружение · {currentLangObj.flag} {currentLangObj.name}
      </div>
      <h1 className="display">Интерактивные уроки ({allLessons.length})</h1>
      <p className="sub">
        Читай живые тексты с понятными опорами. Система считает долю каждого видимого слова, равномерно добавляет знакомые конструкции и не выдаёт целевой процент за фактический.
      </p>

      <StreakFlameWidget
        userState={userState}
        onNavigate={onNavigate}
        onOpenLesson={onOpenLesson}
        nextLessonId={nextLesson?.id}
      />

      <DailyPlanCard
        userState={userState}
        onUpdateState={onUpdateState}
        onNavigate={onNavigate}
        onOpenLesson={onOpenLesson}
      />

      <ListeningTodayCard userState={userState} onNavigate={onNavigate} />

      {/* Hero card for next lesson */}
      {nextLesson && (
        <div className="hero card" style={{ marginTop: '20px', animationDelay: '0.02s' }}>
          <span className="tag">следующий шаг</span>
          <h2>
            {nextLesson.emoji} {nextLesson.title}
          </h2>
          <p className="sub" style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '14px' }}>
            {nextLesson.description || 'Интерактивный урок с упражнениями для отработки словаря.'}
          </p>
          <div className="herostat">
            <div>
              <b>{langProg.immersion}%</b>
              <span>цель доли текста</span>
            </div>
            <div>
              <b>{langProg.learnedWords.length}</b>
              <span>слов в словаре</span>
            </div>
            <div>
              <b>
                {Object.keys(langProg.doneLessons).length}/{allLessons.length}
              </b>
              <span>уроков пройдено</span>
            </div>
          </div>
          <button
            className="btn sun big"
            onClick={() => {
              audioService.playClick();
              onOpenLesson(nextLesson.id);
            }}
          >
            Продолжить погружение →
          </button>
        </div>
      )}

      {/* Level Filters & Custom Import CTA */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '22px 0 16px' }}>
        <button
          className={`catchip ${levelFilter === null ? 'on' : ''}`}
          onClick={() => setLevelFilter(null)}
        >
          Все ({allLessons.length})
        </button>
        <button
          className={`catchip ${levelFilter === 1 ? 'on' : ''}`}
          onClick={() => setLevelFilter(1)}
        >
          A1
        </button>
        <button
          className={`catchip ${levelFilter === 2 ? 'on' : ''}`}
          onClick={() => setLevelFilter(2)}
        >
          A2
        </button>
        <button
          className={`catchip ${levelFilter === 3 ? 'on' : ''}`}
          onClick={() => setLevelFilter(3)}
        >
          B1
        </button>
        <button
          className={`catchip ${levelFilter === 4 ? 'on' : ''}`}
          onClick={() => setLevelFilter(4)}
        >
          B2 / C1
        </button>

        {userState.customLessons.length > 0 && (
          <button
            className={`catchip ${levelFilter === 'custom' ? 'on' : ''}`}
            onClick={() => setLevelFilter('custom')}
          >
            ✨ Свои тексты ({userState.customLessons.length})
          </button>
        )}

        <button
          className="btn small pine"
          style={{ marginLeft: 'auto' }}
          onClick={onNavigateCustom}
        >
          + Импорт своего текста
        </button>
      </div>

      {/* List of lesson cards */}
      <div>
        {filteredLessons.map((ls, idx) => {
          const doneData = langProg.doneLessons[ls.id];
          const isDone = !!doneData;
          const allIndex = allLessons.findIndex((lesson) => lesson.id === ls.id);
          const previousLesson = allIndex > 0 ? allLessons[allIndex - 1] : null;

          const isStandardLocked =
            !!previousLesson &&
            !previousLesson.id.startsWith('custom_') &&
            !langProg.doneLessons[previousLesson.id] &&
            !isDone;

          const isLocked = isStandardLocked;
          const conceptCount = conceptCounts.get(ls.id) ?? 0;

          let statusMarkup = <span style={{ color: 'var(--pine3)' }}>→ открыть</span>;
          if (isDone) {
            statusMarkup = (
              <span className="ok">
                <Icon name="check-circle" className="sm" /> пройден · {doneData.pct}%
              </span>
            );
          } else if (isStandardLocked) {
            statusMarkup = (
              <span className="lk">
                <Icon name="lock" className="sm" />
              </span>
            );
          }

          return (
            <div
              key={ls.id}
              className={`card lrow ${isDone ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
              style={{ animationDelay: `${0.04 + idx * 0.03}s` }}
              onClick={() => {
                if (isStandardLocked) {
                  audioService.playError();
                  return;
                }
                audioService.playClick();
                onOpenLesson(ls.id);
              }}
            >
              <div className="lnum">
                {isDone ? <Icon name="check" className="sm" /> : String(idx + 1).padStart(2, '0')}
              </div>
              <div className="lbody">
                <h3>
                  {ls.emoji} {ls.title}
                </h3>
                <div className="lmeta">
                  <span className="chip dim">~{conceptCount} новых слов</span>
                  <span className="chip dim">
                    сложность {'●'.repeat(ls.lvl)}
                    {'○'.repeat(Math.max(0, 4 - ls.lvl))}
                  </span>
                  {isDone ? (
                    <span className="chip sea"><Icon name="check" className="sm" /></span>
                  ) : (
                    <span className="chip sun">цель {langProg.immersion}% текста</span>
                  )}
                </div>
              </div>
              <div className="lstatus">{statusMarkup}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
