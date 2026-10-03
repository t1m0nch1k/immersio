import React, { useMemo } from 'react';
import { UserState } from '../types';
import { getLocalDateKey } from '../services/storageService';
import { hapticService } from '../services/hapticService';
import { audioService } from '../services/audioService';
import { Route } from '../routes';
import { Icon } from './icons';

interface StreakFlameWidgetProps {
  userState: UserState;
  onNavigate: (route: Route) => void;
  onOpenLesson?: (lessonId: string) => void;
  nextLessonId?: string;
}

const WEEK_DAYS = [
  { key: 1, label: 'Пн' },
  { key: 2, label: 'Вт' },
  { key: 3, label: 'Ср' },
  { key: 4, label: 'Чт' },
  { key: 5, label: 'Пт' },
  { key: 6, label: 'Сб' },
  { key: 0, label: 'Вс' },
];

export const StreakFlameWidget: React.FC<StreakFlameWidgetProps> = ({
  userState,
  onNavigate,
  onOpenLesson,
  nextLessonId,
}) => {
  const todayKey = getLocalDateKey();
  const isDoneToday = userState.streak.lastActiveDate === todayKey;
  const streakCount = userState.streak.current;
  const bestStreak = userState.streak.best;

  // Compute the 7 calendar days of the current week (Mon..Sun)
  const weekDaysStatus = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon
    // Distance back to Monday (if Sun=0, back 6 days; if Mon=1, back 0 days)
    const distanceToMon = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMon);

    const historySet = new Set(userState.history);

    return WEEK_DAYS.map((dayDef, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dateStr = getLocalDateKey(d);
      const isToday = dateStr === todayKey;
      const isPast = dateStr < todayKey;
      const isDone = historySet.has(dateStr);

      return {
        ...dayDef,
        dateStr,
        isToday,
        isPast,
        isDone,
      };
    });
  }, [userState.history, todayKey]);

  const handleAction = () => {
    audioService.playClick();
    hapticService.trigger('medium');
    if (!isDoneToday) {
      if (nextLessonId && onOpenLesson) {
        onOpenLesson(nextLessonId);
        return;
      }
      onNavigate('lessons');
    } else {
      onNavigate('practice');
    }
  };

  return (
    <section className={`card streak-card ${isDoneToday ? 'streak-card-active' : 'streak-card-pending'}`} aria-label="Ударный режим">
      {/* Background warm flare */}
      <div className="streak-flare" aria-hidden="true" />

      <div className="streak-main">
        {/* Animated Flame Icon Container */}
        <div className="streak-flame-container" aria-hidden="true">
          {/* Flame Halo Rings */}
          <div className="streak-flame-aura" />
          {isDoneToday && (
            <>
              <div className="streak-spark spark-1" />
              <div className="streak-spark spark-2" />
              <div className="streak-spark spark-3" />
            </>
          )}

          {/* SVG Animated Flame */}
          <svg
            className={`streak-flame-svg ${isDoneToday ? 'flame-burning' : 'flame-ember'}`}
            viewBox="0 0 48 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="flameGradOuter" x1="24" y1="52" x2="24" y2="4" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ff4530" />
                <stop offset="60%" stopColor="#ff851b" />
                <stop offset="100%" stopColor="#ffd43b" />
              </linearGradient>
              <linearGradient id="flameGradInner" x1="24" y1="48" x2="24" y2="18" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffb81c" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
            </defs>

            {/* Outer Flame Tongue */}
            <path
              className="flame-outer-path"
              d="M24 3C25 10 31 16 34 22C38 30 38 38 33 46C29 52 19 52 15 46C9 38 10 27 16 20C19 16 19 12 18 6C20 9 22 9 24 3Z"
              fill="url(#flameGradOuter)"
            />

            {/* Inner Glowing Core */}
            <path
              className="flame-inner-path"
              d="M24 20C26 24 29 27 30 32C32 37 31 42 28 47C26 49 22 49 20 47C16 42 16 35 20 29C21 27 22 24 24 20Z"
              fill="url(#flameGradInner)"
              opacity="0.92"
            />
          </svg>
        </div>

        {/* Streak Details & Copy */}
        <div className="streak-info">
          <div className="streak-head">
            <span className="streak-number">{streakCount}</span>
            <div className="streak-meta">
              <span className="streak-label">
                {streakCount === 1
                  ? 'день подряд'
                  : streakCount >= 2 && streakCount <= 4
                  ? 'дня подряд'
                  : 'дней подряд'}
              </span>
              <span className="streak-record">
                {bestStreak > 0 && `Рекорд: ${bestStreak} дн.`}
              </span>
            </div>
          </div>

          <p className="streak-desc">
            {isDoneToday
              ? '🔥 Огонёк сохранён на сегодня! Твоя ударная серия продолжается.'
              : streakCount > 0
              ? `⚠️ Пройди урок сегодня, чтобы не потерять серию в ${streakCount} дн.!`
              : '⚡ Зажги свой первый огонёк — пройди любой урок или тренировку!'}
          </p>
        </div>

        {/* Action Button */}
        <div className="streak-action">
          <button
            type="button"
            className={`btn small ${isDoneToday ? 'pine' : 'sun'}`}
            onClick={handleAction}
          >
            {isDoneToday ? (
              <>
                <Icon name="bolt" /> Тренировка
              </>
            ) : (
              <>
                <Icon name="fire" /> Зажечь огонёк
              </>
            )}
          </button>
        </div>
      </div>

      {/* 7-Day Weekly Streak Track */}
      <div className="streak-week-track" aria-label="Прогресс за текущую неделю">
        {weekDaysStatus.map((day) => (
          <div
            key={day.label}
            className={`streak-day-item ${day.isToday ? 'is-today' : ''} ${
              day.isDone ? 'is-done' : ''
            } ${day.isPast && !day.isDone ? 'is-missed' : ''}`}
            title={`${day.label}: ${day.isDone ? 'Урок пройден' : day.isToday ? 'Сегодня (ожидает)' : 'Нет активности'}`}
          >
            <span className="streak-day-label">{day.label}</span>
            <div className="streak-day-indicator">
              {day.isDone ? (
                <span className="streak-day-flame" aria-hidden="true">🔥</span>
              ) : day.isToday ? (
                <span className="streak-day-pulse" aria-hidden="true" />
              ) : (
                <span className="streak-day-dot" aria-hidden="true" />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
