import React from 'react';

/**
 * The project icon set.
 *
 * Drawn as inline SVG rather than an external sprite: an external `<use>` needs
 * a resolvable absolute path, which differs between the web build and the
 * Android bundle (`--base /assets/www/`), and `currentColor` does not survive
 * the reference in every engine. Inline nodes inherit colour and stroke weight
 * from the surrounding text, need no extra request, and cannot 404.
 *
 * Every glyph is a 24x24 outline at the same optical weight, matching the
 * line style already used for the section icons.
 */
export const ICON_PATHS = {
  // --- Destinations -------------------------------------------------------
  'book-open': (
    <>
      <path d="M4 5.2c3-.5 5.6.1 8 1.8v12c-2.4-1.7-5-2.3-8-1.8z" />
      <path d="M20 5.2c-3-.5-5.6.1-8 1.8v12c2.4-1.7 5-2.3 8-1.8z" />
      <path d="M12 7v12" />
    </>
  ),
  'book-bookmark': (
    <>
      <path d="M4 5.2c3-.5 5.6.1 8 1.8v12c-2.4-1.7-5-2.3-8-1.8z" />
      <path d="M20 5.2c-3-.5-5.6.1-8 1.8v12c2.4-1.7 5-2.3 8-1.8z" />
      <path d="M12 7v12" />
      <path d="M17 9.5h2.2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  bolt: <path d="M13.4 2.6 5.8 13.2h4.8l-1.4 8.2 8.4-11.2h-5.1z" />,
  headphones: (
    <>
      <path d="M3.6 16v-4.2a8.4 8.4 0 0 1 16.8 0V16" />
      <path d="M3.6 15.4h1.5a1.4 1.4 0 0 1 1.4 1.4v2.4a1.4 1.4 0 0 1-1.4 1.4H3.6z" />
      <path d="M20.4 15.4h-1.5a1.4 1.4 0 0 0-1.4 1.4v2.4a1.4 1.4 0 0 0 1.4 1.4h1.5z" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13.5h6M9 17h4" />
    </>
  ),
  'letters-ab': (
    <>
      <path d="M2.6 19.2 6 6.4l3.4 12.8M3.9 15.2h4.2" />
      <path d="M20.4 6.6h-5.3V19h2.9a3.2 3.2 0 0 0 0-6.4h-2.6" />
    </>
  ),
  pencil: (
    <>
      <path d="M3.6 20.4h4.3L19 9.3a2.2 2.2 0 0 0 0-3.1l-1.2-1.2a2.2 2.2 0 0 0-3.1 0L3.6 16.1z" />
      <path d="M14.3 5.4 18.6 9.7" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.9" />
      <path d="M4.4 20.6c.9-4 3.9-6 7.6-6s6.7 2 7.6 6" />
    </>
  ),

  // --- Actions -----------------------------------------------------------
  volume: (
    <>
      <path d="M3.4 9.6h3.3l4.9-4v12.8l-4.9-4H3.4z" />
      <path d="M15.4 9.4a3.8 3.8 0 0 1 0 5.2" />
      <path d="M18 6.8a7.4 7.4 0 0 1 0 10.4" />
    </>
  ),
  'volume-off': (
    <>
      <path d="M3.4 9.6h3.3l4.9-4v12.8l-4.9-4H3.4z" />
      <path d="M15.6 9.6 20.6 14.6M20.6 9.6 15.6 14.6" />
    </>
  ),
  plus: <path d="M12 5.4v13.2M5.4 12h13.2" />,
  minus: <path d="M5.4 12h13.2" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="m8.4 12.2 2.5 2.5 4.7-5.2" />
    </>
  ),
  'check-double': (
    <>
      <circle cx="9.4" cy="12" r="6.7" />
      <circle cx="14.6" cy="12" r="6.7" />
      <path d="m13 12.2 1.9 1.9 3.6-4" />
    </>
  ),
  'camera': (
    <>
      <path d="M3.4 8.6h3.1l1.6-2.4h7.8l1.6 2.4h3.1a1.4 1.4 0 0 1 1.4 1.4v8.2a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 18.4v-8.2a1.4 1.4 0 0 1 1.4-1.4z" />
      <circle cx="12" cy="14" r="3.6" />
    </>
  ),
  'pencil-eraser': (
    <>
      <path d="M4 20.4h3.4l7.4-7.4-3.4-3.4L4 17z" />
      <path d="m11.4 9.6 3.4 3.4" />
      <path d="M17.6 8.4h3v10.2a2 2 0 0 1-2 2h-1z" />
    </>
  ),

  // --- State -------------------------------------------------------------
  sun: (
    <>
      <circle cx="12" cy="12" r="4.1" />
      <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5 6.9 6.9M17.1 17.1l1.4 1.4M18.5 5.5 17.1 6.9M6.9 17.1l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8a8.6 8.6 0 1 0 10.8 10.8z" />,
  lock: (
    <>
      <path d="M7.6 10.6V8a4.4 4.4 0 0 1 8.8 0v2.6" />
      <rect x="4.4" y="10.6" width="15.2" height="10" rx="2.2" />
      <path d="M12 14.4v2.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 6.9v5.4l3.5 2.1" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13.4" r="7.4" />
      <path d="M12 9.8v3.6l2.4 1.6M9.4 2.6h5.2M18.6 6.4l1.6-1.6" />
    </>
  ),
  flame: (
    <>
      <path d="M12 2.6s5.6 4.3 5.6 9.4a5.6 5.6 0 0 1-11.2 0c0-3 2-4.7 2-4.7s.5 2 1.7 2.7c0-3.5 1.9-7.4 1.9-7.4z" />
      <path d="M12 21.4a2.6 2.6 0 0 0 2.6-2.6c0-1.9-2.6-4.5-2.6-4.5s-2.6 2.6-2.6 4.5a2.6 2.6 0 0 0 2.6 2.6z" />
    </>
  ),

  // --- Progression -------------------------------------------------------
  'bolt-circle': (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M13.2 6.4 8.8 12.8h3l-1 4.8 4.4-6.8h-3z" />
    </>
  ),
  medal: (
    <>
      <path d="M9 13.6 7.2 21l3.2-1.4L12 21l1.6-1.4 3.2 1.4-1.8-7.4" />
      <circle cx="12" cy="9.4" r="5.6" />
      <circle cx="12" cy="9.4" r="2.2" />
    </>
  ),
  'chart-bars': (
    <>
      <path d="M4 20.2V4.4M4 20.2h16" />
      <path d="M8 17.2v-4.4M12 17.2V8.4M16 17.2v-6.4M20 17.2v-8.4" />
    </>
  ),

  // --- Small functional marks -------------------------------------------
  'chevron-down': <path d="m6.6 9.4 5.4 5.4 5.4-5.4" />,
  check: <path d="m4.8 12.4 4.8 4.8 9.6-10.4" />,
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.4" />
      <path d="m15.6 15.6 4.8 4.8" />
    </>
  ),
  'external-link': (
    <>
      <path d="M13.6 4.4H19.6V10.4" />
      <path d="M11.2 12.8 19.6 4.4" />
      <path d="M18 14.4v4.2a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6V7.6A1.6 1.6 0 0 1 5.4 6h4.2" />
    </>
  ),
  play: <path d="M7.6 4.8 19 12 7.6 19.2z" />,
  backspace: (
    <>
      <path d="M8.6 4.8h10a1.6 1.6 0 0 1 1.6 1.6v11.2a1.6 1.6 0 0 1-1.6 1.6h-10L2.8 12z" />
      <path d="m12.4 9.6 4.4 4.8M16.8 9.6l-4.4 4.8" />
    </>
  ),
  shift: <path d="M12 3.4 21 12.6h-5.4v8H8.4v-8H3z" />,
  keyboard: (
    <>
      <rect x="2.6" y="6" width="18.8" height="12" rx="2" />
      <path d="M6.4 9.6h.01M9.8 9.6h.01M13.2 9.6h.01M16.6 9.6h.01M6.4 12.8h.01M9.8 12.8h.01M13.2 12.8h.01M16.6 12.8h.01M8.6 15.6h6.8" />
    </>
  ),
  eye: (
    <>
      <path d="M2.4 12S6 5.6 12 5.6 21.6 12 21.6 12 18 18.4 12 18.4 2.4 12 2.4 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.2 11.4a8.2 8.2 0 1 0-.6 5" />
      <path d="M20.6 5.4v6h-6" />
    </>
  ),
  repeat: (
    <>
      <path d="M4 11.4V9.8a2.6 2.6 0 0 1 2.6-2.6h10.8" />
      <path d="m14.6 4.4 3.4 2.8-3.4 2.8" />
      <path d="M20 12.6v1.6a2.6 2.6 0 0 1-2.6 2.6H6.6" />
      <path d="m9.4 14 -3.4 2.8L9.4 19.6" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.7 4.6L18.4 9.3 13.7 11 12 15.6 10.3 11 5.6 9.3l4.7-1.7z" />
      <path d="m18.4 15.4.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" />
    </>
  ),
  waves: (
    <>
      <path d="M2.6 8.4c1.8-1.6 3.6-1.6 5.4 0s3.6 1.6 5.4 0 3.6-1.6 5.4 0" />
      <path d="M2.6 13c1.8-1.6 3.6-1.6 5.4 0s3.6 1.6 5.4 0 3.6-1.6 5.4 0" />
      <path d="M2.6 17.6c1.8-1.6 3.6-1.6 5.4 0s3.6 1.6 5.4 0 3.6-1.6 5.4 0" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M12 21.4s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </>
  ),
  note: (
    <>
      <path d="M5 4.6h14v10.2l-5 5H5z" />
      <path d="M19 14.8h-5v5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m15.4 8.6-1.9 5-5 1.9 1.9-5z" />
    </>
  ),
  fire: (
    <>
      <path d="M12 2c1 3.5 3.5 6 5 8.5 2 3.5 1.5 8-1.5 10.5-3 2.5-7 2.5-9.5 0-3-2.5-3.5-7-1.5-10.5 1-2 1.5-4 1.5-5.5 1 2 2 3 3.5 3 2 0 2-4 2.5-6.5z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICON_PATHS;

export interface IconProps {
  name: IconName;
  size?: number | string;
  className?: string;
  /** Filled glyphs read better on coloured chips; outline ones on paper. */
  strokeWidth?: number;
  title?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size, className, strokeWidth = 2, title }) => (
  <svg
    className={className ? `ic ${className}` : 'ic'}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
    focusable="false"
  >
    {title && <title>{title}</title>}
    {ICON_PATHS[name]}
  </svg>
);
