import React from 'react';
import { Route } from './routes';

export interface NavItem {
  route: Route;
  label: string;
  icon: React.ReactNode;
  /** Routes that light the same item up, e.g. the two dictionary views. */
  alsoActive?: Route[];
  /** Rendered after the label, e.g. the learned-word count. */
  badge?: (learnedCount: number) => string | null;
}

/**
 * The one place a destination is declared.
 *
 * The route list used to be spelled out five times: the route union, the
 * router cascade, the desktop sidebar, the mobile bar's item array and its icon
 * map. Adding a screen meant touching all of them, and a missed one produced a
 * dead link rather than a type error. `Route` is still the compile-time
 * authority; this table is the runtime authority, and `Record<Route, …>` below
 * makes a forgotten entry a build failure.
 */
const ICONS: Record<Route, React.ReactNode> = {
  lessons: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </>
  ),
  practice: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </>
  ),
  sprint: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8z" />,
  listening: (
    <>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v4a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2zM20 13v4a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2z" />
      <path d="M12 5v2" />
    </>
  ),
  dict: (
    <>
      <path d="M12 6c-2-1.8-5-2-8-2v14c3 0 6 .2 8 2 2-1.8 5-2 8-2V4c-3 0-6 .2-8 2z" />
      <path d="M12 6v14" />
    </>
  ),
  'dict-all': <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z" />,
  grammar: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5z" />
      <path d="M4 5.5v14A2.5 2.5 0 0 0 6.5 22H20" />
      <path d="M8 7h8M8 11h6" />
    </>
  ),
  alphabet: (
    <>
      <path d="M4 19 9 5l5 14M6 14h6" />
      <path d="M16 5h4M18 5v14M15 19h6" />
    </>
  ),
  custom: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" />
    </>
  ),
  reader: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5z" />,
};

export const NAV_ITEMS: NavItem[] = [
  { route: 'lessons', label: 'Уроки', icon: ICONS.lessons },
  { route: 'practice', label: 'Практика', icon: ICONS.practice },
  { route: 'sprint', label: 'Спринт', icon: ICONS.sprint },
  { route: 'listening', label: 'Слушание', icon: ICONS.listening },
  {
    route: 'dict',
    label: 'Словарь',
    icon: ICONS.dict,
    alsoActive: ['dict-all'],
    badge: (count) => (count > 0 ? String(count) : null),
  },
  { route: 'grammar', label: 'Грамматика', icon: ICONS.grammar },
  { route: 'alphabet', label: 'Алфавит', icon: ICONS.alphabet },
  { route: 'custom', label: 'Свой текст', icon: ICONS.custom },
  { route: 'profile', label: 'Профиль', icon: ICONS.profile },
];

export const isNavItemActive = (item: NavItem, currentRoute: Route): boolean =>
  currentRoute === item.route || (item.alsoActive?.includes(currentRoute) ?? false);

export const NavIcon: React.FC<{ route: Route }> = ({ route }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {ICONS[route]}
  </svg>
);
