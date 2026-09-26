import React from 'react';
import { UserState } from '../types';
import { StorageService, getLocalDateKey } from '../services/storageService';
import { audioService } from '../services/audioService';
import { getImmersionProfile } from '../services/immersionProfile';
import { Route } from '../routes';
import { NAV_ITEMS, NavIcon, isNavItemActive } from '../navItems';
import { Icon } from './icons';

interface SidebarProps {
  currentRoute: Route;
  userState: UserState;
  isOpen: boolean;
  onNavigate: (route: Route) => void;
  onClose: () => void;
  onUpdateImmersion: (immersion: number) => void;
}

/**
 * The destination list, plus the immersion dial and the week streak.
 *
 * On a wide screen it is a permanent column. On a phone the same markup becomes
 * an overlay drawer behind a hamburger, which is why the nine destinations do
 * not need a second implementation in a bottom bar.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  userState,
  isOpen,
  onNavigate,
  onClose,
  onUpdateImmersion,
}) => {
  const langProg = StorageService.getLangProgress(userState, userState.currentLang);
  const immersion = langProg.immersion;
  const immersionProfile = getImmersionProfile(immersion);

  // Escape and a backdrop close the drawer, but only while it is open. Registered
  // unconditionally so the listener identity stays stable across toggles.
  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateImmersion(parseInt(e.target.value, 10));
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

  const handleNavigate = (route: Route) => {
    audioService.playClick();
    onNavigate(route);
    onClose();
  };

  return (
    <>
      {/* Backdrop: only rendered as an overlay, so it must not block the
          permanent desktop column. */}
      {isOpen && <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />}

      <aside className={isOpen ? 'drawer open' : 'drawer'} aria-hidden={!isOpen}>
        <div className="drawer-brand">
          <span className="mark" aria-hidden="true">
            <Icon name="waves" strokeWidth={2.5} />
          </span>
          ПОГРУЖЕНИЕ
        </div>

        <nav className="side">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item, currentRoute);
            const badge = item.badge?.(langProg.learnedWords.length) ?? null;
            return (
              <button
                key={item.route}
                className={`nitem ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
                tabIndex={isOpen ? 0 : -1}
                onClick={() => handleNavigate(item.route)}
              >
                <NavIcon item={item} />
                {item.label}
                {badge && <span className="cnt">{badge}</span>}
              </button>
            );
          })}
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
              <Icon name="compass" />
            </div>
          </div>

          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={immersion}
            onChange={handleSliderChange}
            aria-label="Целевая доля слов на изучаемом языке"
          />
          <div className="note">
            {immersionProfile.description} Выученные слова остаются на языке оригинала, а остальные
            открываются постепенно.
          </div>
        </div>

        {/* Week streak card */}
        <div className="sidecard">
          <h4>Стрик · неделя</h4>
          <div className="wdots">
            {weekDots.map((dot) => (
              <div key={dot.dateStr} className={`wd ${dot.isDone ? 'on' : ''}`} title={dot.dateStr}>
                {dot.name}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
};
