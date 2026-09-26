import React from 'react';
import { Route } from '../routes';

const ICON_PATHS: Record<Route, React.ReactNode> = {
  lessons: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z" />,
  practice: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  sprint: (
    <>
      <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9z" />
    </>
  ),
  listening: (
    <>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v4a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2zM20 13v4a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2z" />
      <path d="M12 5v2" />
    </>
  ),
  dict: <path d="M12 6c-2-1.8-5-2-8-2v14c3 0 6 .2 8 2 2-1.8 5-2 8-2V4c-3 0-6 .2-8 2z" />,
  'dict-all': <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z" />,
  grammar: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5z" />
      <path d="M8 7h8M8 11h6" />
    </>
  ),
  alphabet: (
    <>
      <path d="M4 19 9 5l5 14M6 14h6" />
      <path d="M16 5h4M18 5v14M15 19h6" />
    </>
  ),
  custom: <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />,
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" />
    </>
  ),
  reader: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5z" />,
};

interface MobileNavItem {
  route: Route;
  label: string;
  active: boolean;
}

interface MobileNavProps {
  currentRoute: Route;
  onNavigate: (route: Route) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentRoute, onNavigate }) => {
  const items: MobileNavItem[] = [
    { route: 'lessons', label: 'Уроки', active: currentRoute === 'lessons' },
    { route: 'practice', label: 'Практика', active: currentRoute === 'practice' },
    { route: 'sprint', label: 'Спринт', active: currentRoute === 'sprint' },
    { route: 'listening', label: 'Слушание', active: currentRoute === 'listening' },
    { route: 'dict', label: 'Словарь', active: currentRoute === 'dict' || currentRoute === 'dict-all' },
    { route: 'grammar', label: 'Грамматика', active: currentRoute === 'grammar' },
    { route: 'alphabet', label: 'Алфавит', active: currentRoute === 'alphabet' },
    { route: 'custom', label: 'Свой текст', active: currentRoute === 'custom' },
    { route: 'profile', label: 'Профиль', active: currentRoute === 'profile' },
  ];

  return (
    <nav className="mbar">
      {items.map((item) => (
        <button
          key={item.route}
          type="button"
          aria-current={item.active ? 'page' : undefined}
          className={item.active ? 'active' : ''}
          onClick={() => onNavigate(item.route)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {ICON_PATHS[item.route]}
          </svg>
          {item.label}
        </button>
      ))}
    </nav>
  );
};
