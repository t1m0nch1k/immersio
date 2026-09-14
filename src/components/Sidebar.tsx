import React from 'react';
import { UserState } from '../types';
import { StorageService, getLocalDateKey } from '../services/storageService';
import { audioService } from '../services/audioService';
import { getImmersionProfile } from '../services/immersionProfile';

interface SidebarProps {
  currentRoute: string;
  userState: UserState;
  onNavigate: (route: string) => void;
  onUpdateImmersion: (immersion: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  userState,
  onNavigate,
  onUpdateImmersion,
}) => {
  const langProg = StorageService.getLangProgress(userState, userState.currentLang);
  const immersion = langProg.immersion;
  const immersionProfile = getImmersionProfile(immersion);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onUpdateImmersion(val);
  };

  // Weekday dots
  const dayNames = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];
  const todayObj = new Date();
  const weekDots = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(todayObj.getDate() - i);
    const dateStr = getLocalDateKey(d);
    const isDone = userState.history.includes(dateStr);
    const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    weekDots.push({ name: dayNames[dayIdx], isDone, dateStr });
  }

  return (
    <aside>
      <nav className="side">
        <button
          className={`nitem ${currentRoute === 'lessons' ? 'active' : ''}`}
          onClick={() => {
            audioService.playClick();
            onNavigate('lessons');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z" />
            <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
          </svg>
          Уроки
        </button>

        <button
          className={`nitem ${currentRoute === 'practice' ? 'active' : ''}`}
          onClick={() => {
            audioService.playClick();
            onNavigate('practice');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" />
          </svg>
          Практика
        </button>

        <button
          className={`nitem ${currentRoute === 'sprint' ? 'active' : ''}`}
          onClick={() => {
            audioService.playClick();
            onNavigate('sprint');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8z" />
          </svg>
          Спринт
        </button>

        <button
          className={`nitem ${currentRoute === 'listening' ? 'active' : ''}`}
          onClick={() => {
            audioService.playClick();
            onNavigate('listening');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 13a8 8 0 0 1 16 0" />
            <path d="M4 13v4a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2zM20 13v4a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2z" />
            <path d="M12 5v2" />
          </svg>
          Слушание
        </button>

        <button
          className={`nitem ${currentRoute === 'dict' || currentRoute === 'dict-all' ? 'active' : ''}`}
          onClick={() => {
            audioService.playClick();
            onNavigate('dict');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 6c-2-1.8-5-2-8-2v14c3 0 6 .2 8 2 2-1.8 5-2 8-2V4c-3 0-6 .2-8 2z" />
            <path d="M12 6v14" />
          </svg>
          Словарь
          <span className="cnt">{langProg.learnedWords.length}</span>
        </button>

        <button
          className={`nitem ${currentRoute === 'grammar' ? 'active' : ''}`}
          onClick={() => {
            audioService.playClick();
            onNavigate('grammar');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5z" />
            <path d="M4 5.5v14A2.5 2.5 0 0 0 6.5 22H20" />
            <path d="M8 7h8M8 11h6" />
          </svg>
          Грамматика
        </button>

        <button
          className={`nitem ${currentRoute === 'alphabet' ? 'active' : ''}`}
          onClick={() => {
            audioService.playClick();
            onNavigate('alphabet');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 19 9 5l5 14M6 14h6" />
            <path d="M16 5h4M18 5v14M15 19h6" />
          </svg>
          Алфавит
        </button>

        <button
          className={`nitem ${currentRoute === 'custom' ? 'active' : ''}`}
          onClick={() => {
            audioService.playClick();
            onNavigate('custom');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Свой текст
        </button>

        <button
          className={`nitem ${currentRoute === 'profile' ? 'active' : ''}`}
          onClick={() => {
            audioService.playClick();
            onNavigate('profile');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" />
          </svg>
          Профиль
        </button>
      </nav>

      {/* Diver depth gauge */}
      <div className="depth">
        <div className="overline" style={{ color: 'var(--sun)' }}>
          Цель погружения
        </div>
        <div className="val">
          <span>{immersion}</span>
          <small>%</small>
        </div>
        <div className="cap">{immersionProfile.title} · целевая доля слов</div>

        <div className="track">
          <div className="fill" style={{ width: `${immersion}%` }}></div>
          <div className="diver" style={{ left: `${immersion}%` }}>
            🤿
          </div>
        </div>

        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={immersion}
          onChange={handleSliderChange}
        />
        <div className="note">
          {immersionProfile.description} Выученные слова остаются на языке оригинала, а остальные открываются постепенно.
        </div>
      </div>

      {/* Week streak card */}
      <div className="sidecard">
        <h4>Стрик · неделя</h4>
        <div className="wdots">
          {weekDots.map((dot, idx) => (
            <div
              key={idx}
              className={`wd ${dot.isDone ? 'on' : ''}`}
              title={dot.dateStr}
            >
              {dot.name}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
