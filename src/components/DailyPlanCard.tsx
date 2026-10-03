import React, { useMemo } from 'react';
import { LanguageCode, StudyTask, UserState } from '../types';
import { buildStudyPlan } from '../services/studyPlanService';
import { StorageService } from '../services/storageService';
import { toastService } from '../services/toastService';
import { audioService } from '../services/audioService';
import { Route } from '../routes';
import { Icon, type IconName } from './icons';

interface DailyPlanCardProps {
  userState: UserState;
  onUpdateState: (newState: UserState) => void;
  onNavigate: (route: Route) => void;
  onOpenLesson?: (lessonId: string) => void;
  compact?: boolean;
}

/**
 * The heading counted three steps unconditionally, which stopped being true the
 * moment a fourth task appeared — and a heading that lies about the plan is
 * worse than no heading.
 */
const STEPS: Record<number, string> = {
  3: 'Три шага к прогрессу',
  4: 'Четыре шага к прогрессу',
  5: 'Пять шагов к прогрессу',
};
const stepsLabel = (count: number): string =>
  STEPS[count] ?? `${count} шагов к прогрессу`;

const taskIcon: Record<StudyTask['type'], IconName> = {
  review: 'refresh',
  'new-words': 'book-bookmark',
  lesson: 'waves',
  grammar: 'document',
  sprint: 'bolt',
};

export const DailyPlanCard: React.FC<DailyPlanCardProps> = ({
  userState,
  onUpdateState,
  onNavigate,
  onOpenLesson,
  compact = false,
}) => {
  const currentLang: LanguageCode = userState.currentLang;
  // `buildStudyPlan` walks every learned word and creates a default SRS record
  // for each one. It only depends on the state object, which changes exactly
  // once per completed task.
  const plan = useMemo(() => buildStudyPlan(userState, currentLang), [userState, currentLang]);
  const progressPct = Math.round((plan.completedMinutes / plan.totalMinutes) * 100);

  const handleStart = (task: StudyTask) => {
    audioService.playClick();
    if (task.type === 'lesson' && task.targetId && onOpenLesson) {
      onOpenLesson(task.targetId);
      return;
    }
    onNavigate(task.route);
  };

  const handleComplete = (task: StudyTask) => {
    audioService.playSuccess();
    const changed = StorageService.recordDailyTask(
      userState,
      currentLang,
      task,
      plan.tasks.map((item) => item.id),
    );
    if (changed) {
      // `recordDailyTask` mutated `userState` in place (XP, streak, daily
      // activity). The shallow copy is what re-renders the app with the result.
      StorageService.checkAndUnlockAchievements(userState, toastService.show);
      onUpdateState({ ...userState });
    }
  };

  return (
    <section className={`card daily-plan ${compact ? 'daily-plan-compact' : ''}`} aria-labelledby="daily-plan-title">
      <div className="daily-plan-head">
        <div>
          <div className="overline">план на сегодня · {plan.totalMinutes} минут</div>
          <h2 id="daily-plan-title">
            {stepsLabel(plan.tasks.length)} {plan.completed ? '🎉' : '🧭'}
          </h2>
        </div>
        <div className="daily-plan-progress">
          <b>{plan.completedMinutes}/{plan.totalMinutes}</b>
          <span>минут</span>
        </div>
      </div>

      <div className="daily-progress-track" aria-label={`Выполнено ${progressPct}%`}>
        <span style={{ width: `${progressPct}%` }} />
      </div>

      <div className="daily-tasks">
        {plan.tasks.map((task) => (
          <article className={`daily-task ${task.completed ? 'is-complete' : ''}`} key={task.id}>
            <div className="daily-task-icon">
              {task.completed ? <Icon name="check" className="sm" /> : <Icon name={taskIcon[task.type]} />}
            </div>
            <div className="daily-task-body">
              <div className="daily-task-title">{task.title}</div>
              <p>{task.description}</p>
              <span className="daily-task-time">{task.minutes} мин{task.itemCount ? ` · ${task.itemCount} слов` : ''}</span>
            </div>
            <div className="daily-task-actions">
              {!task.completed && <button className="btn small ghost" onClick={() => handleStart(task)}>Открыть</button>}
              <button
                className={`btn small ${task.completed ? 'daily-done' : 'sun'}`}
                onClick={() => handleComplete(task)}
                disabled={task.completed}
              >
                {task.completed ? 'Готово' : 'Завершить'}
              </button>
            </div>
          </article>
        ))}
      </div>

      {plan.completed && <p className="daily-complete-note">План выполнен. Завтра появится новая подборка.</p>}
    </section>
  );
};
