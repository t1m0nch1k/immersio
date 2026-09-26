import React from 'react';
import { Route } from './routes';
import { Icon, type IconName } from './components/icons';

export interface NavItem {
  route: Route;
  label: string;
  /** A glyph from the shared set in `components/icons`. */
  icon: IconName;
  /** Routes that light the same item up, e.g. the two dictionary views. */
  alsoActive?: Route[];
  /** Rendered after the label, e.g. the learned-word count. */
  badge?: (learnedCount: number) => string | null;
}

/**
 * The one place a destination is declared.
 *
 * The route list used to be spelled out five times: the route union, the router
 * cascade, the desktop sidebar, the mobile bar's item array and its icon map.
 * Adding a screen meant touching all of them, and a missed one produced a dead
 * link rather than a type error. `Route` is still the compile-time authority;
 * this table is the runtime authority.
 *
 * The icons are named, not inlined. The glyphs live in `components/icons` so the
 * drawer, the header and the in-screen controls cannot drift into three
 * different drawings of "book" or "flame", and so a shape can be restyled once.
 */
export const NAV_ITEMS: NavItem[] = [
  { route: 'lessons', label: 'Уроки', icon: 'book-open' },
  { route: 'practice', label: 'Практика', icon: 'target' },
  { route: 'sprint', label: 'Спринт', icon: 'bolt' },
  { route: 'listening', label: 'Слушание', icon: 'headphones' },
  {
    route: 'dict',
    label: 'Словарь',
    icon: 'book-bookmark',
    alsoActive: ['dict-all'],
    badge: (count) => (count > 0 ? String(count) : null),
  },
  { route: 'grammar', label: 'Грамматика', icon: 'document' },
  { route: 'alphabet', label: 'Алфавит', icon: 'letters-ab' },
  { route: 'custom', label: 'Свой текст', icon: 'pencil' },
  { route: 'profile', label: 'Профиль', icon: 'user' },
];

export const isNavItemActive = (item: NavItem, currentRoute: Route): boolean =>
  currentRoute === item.route || (item.alsoActive?.includes(currentRoute) ?? false);

/**
 * Decorative: the button already carries the label as text, so the glyph stays
 * out of the accessibility tree instead of announcing the word twice.
 */
export const NavIcon: React.FC<{ item: NavItem }> = ({ item }) => <Icon name={item.icon} />;
