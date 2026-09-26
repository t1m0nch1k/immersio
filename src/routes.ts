export const ROUTES = [
  'lessons',
  'reader',
  'custom',
  'practice',
  'sprint',
  'listening',
  'dict',
  'dict-all',
  'grammar',
  'alphabet',
  'profile',
] as const;

export type Route = (typeof ROUTES)[number];

const ROUTE_SET: ReadonlySet<string> = new Set<string>(ROUTES);

export const isRoute = (value: string): value is Route => ROUTE_SET.has(value);
