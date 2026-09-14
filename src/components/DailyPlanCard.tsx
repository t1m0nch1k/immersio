import React from 'react';
import { LanguageCode, StudyTask, UserState } from '../types';
import { buildStudyPlan } from '../services/studyPlanService';
import { StorageService } from '../services/storageService';
import { audioService } from '../services/audioService';

interface DailyPlanCardProps {
  userState: UserState;
  onUpdateState: (newState: UserState) => void;
  onNavigate: (route: string) => void;
  onOpenLesson?: (lessonId: string) => void;
  compact?: boolean;
}

const taskIcon: Record<StudyTask['type'], string> = {
  review: '🔁',
  'new-words': '📗',
  lesson: '🌊',
  grammar: '🧠',
  sprint: '⚡',
};

export const DailyPlanCard: React.FC<DailyPlanCardProps> = ({
  userState,
  onUpdateState,
  onNavigate,
  onOpenLesson,
  compact = false,
}) => {
  const currentLang: LanguageCode = userState.currentLang;
  const plan = buildStudyPlan(userState, currentLang);
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
      StorageService.checkAndUnlockAchievements(userState, () => {});
      onUpdateState({ ...userState });
    }
  };

  return (
    <section className={`card daily-plan ${compact ? 'daily-plan-compact' : ''}`} aria-labelledby="daily-plan-title">
      <div className="daily-plan-head">
        <div>
          <div className="overline">план на сегодня · 15 минут</div>
          <h2 id="daily-plan-title">Три шага к прогрессу {plan.completed ? '🎉' : '🧭'}</h2>
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
            <div className="daily-task-icon">{task.completed ? '✓' : taskIcon[task.type]}</div>
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
