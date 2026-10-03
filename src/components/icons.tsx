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
 * Every glyph is drawn on a 24x24 grid at the same optical weight (2px stroke,
 * round linecap and linejoin), tailored to the paper/ink editorial theme of
 * "Погружение".
 */
export const ICON_PATHS = {
  // --- Destinations & Primary Views -----------------------------------------
  'book-open': (
    <>
      <path d="M2 6c3-1 6-.5 10 1.5v12c-4-2-7-2.5-10-1.5z" />
      <path d="M22 6c-3-1-6-.5-10 1.5v12c4-2 7-2.5 10-1.5z" />
      <path d="M12 7.5v12" />
    </>
  ),
  'book-bookmark': (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M14 2v6l2.5-1.5L19 8V2" />
    </>
  ),
  'book-closed': (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  bolt: <polygon points="13 2 4.5 13.5 10.5 13.5 9.5 22 18.5 10.5 12.5 10.5 13 2" />,
  headphones: (
    <>
      <path d="M3 15v-3a9 9 0 0 1 18 0v3" />
      <path d="M3 15a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M16 15a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2z" />
    </>
  ),
  document: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </>
  ),
  'letters-ab': (
    <>
      <path d="M3 19 6.5 7l3.5 12M4.5 15h4" />
      <path d="M15 7h4a2.5 2.5 0 0 1 0 5 2.5 2.5 0 0 1 0 5h-4z" />
      <path d="M15 12h4" />
    </>
  ),
  pencil: (
    <>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      <line x1="15" y1="5" x2="19" y2="9" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21c0-4 3-7 6.5-7s6.5 3 6.5 7" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 4a3.5 3.5 0 0 0-3.5 3.5c0 .3.05.6.13.88A3.5 3.5 0 0 0 4 11.5a3.5 3.5 0 0 0 1.63 2.94A3.5 3.5 0 0 0 8 19.5c.5 0 .98-.1 1.5-.3" />
      <path d="M14.5 4a3.5 3.5 0 0 1 3.5 3.5c0 .3-.05.6-.13.88A3.5 3.5 0 0 1 20 11.5a3.5 3.5 0 0 1-1.63 2.94A3.5 3.5 0 0 1 16 19.5c-.5 0-.98-.1-1.5-.3" />
      <path d="M12 4v16" />
      <path d="M9 8h2.5M12.5 8H15M8.5 12h3M12.5 12h3M9 16h2.5M12.5 16H15" />
    </>
  ),
  puzzle: (
    <>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9 16.2 7.8" />
    </>
  ),

  // --- Actions & Media ------------------------------------------------------
  volume: (
    <>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </>
  ),
  'volume-off': (
    <>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </>
  ),
  microphone: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  camera: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  'pencil-eraser': (
    <>
      <path d="m18 13-5 5H4v-5l9-9a2.12 2.12 0 0 1 3 0l2 2a2.12 2.12 0 0 1 0 3z" />
      <line x1="10" y1="7" x2="14" y2="11" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </>
  ),
  play: <polygon points="6 4 20 12 6 20 6 4" />,
  backspace: (
    <>
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <line x1="18" y1="9" x2="12" y2="15" />
      <line x1="12" y1="9" x2="18" y2="15" />
    </>
  ),
  shift: <polygon points="12 3 20 12 15 12 15 21 9 21 9 12 4 12 12 3" />,
  keyboard: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="6" y1="9" x2="6.01" y2="9" />
      <line x1="10" y1="9" x2="10.01" y2="9" />
      <line x1="14" y1="9" x2="14.01" y2="9" />
      <line x1="18" y1="9" x2="18.01" y2="9" />
      <line x1="6" y1="13" x2="6.01" y2="13" />
      <line x1="18" y1="13" x2="18.01" y2="13" />
      <line x1="10" y1="13" x2="14" y2="13" />
    </>
  ),
  eye: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </>
  ),
  refresh: (
    <>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </>
  ),
  repeat: (
    <>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </>
  ),

  // --- State, Evaluation & Signals ------------------------------------------
  check: <polyline points="20 6 9 17 4 12" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="16 9 11 14 8 11" />
    </>
  ),
  'check-double': (
    <>
      <polyline points="18 7 11 15 8 12" />
      <polyline points="22 10 15 18 13 16" />
    </>
  ),
  x: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  'x-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="m10.29 3.86-8.6 14.9A2 2 0 0 0 3.4 22h17.2a2 2 0 0 0 1.71-3.24l-8.6-14.9a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </>
  ),
  moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  unlock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <polyline points="12 9 12 13 14.5 14.5" />
      <line x1="12" y1="1" x2="12" y2="4" />
      <line x1="10" y1="1" x2="14" y2="1" />
    </>
  ),
  flame: (
    <>
      <path d="M12 2c1.2 3.2 4 6 5.5 8.8C19 13.5 19 17 16.5 19.8A7.5 7.5 0 0 1 5 15.5c0-4 3.5-6.5 4.5-9.5 1 2 2.5 3 3.5 3 1.5 0 1.5-3 1.5-5" />
      <path d="M12 21a3.5 3.5 0 0 0 3.5-3.5c0-2-2-3.8-3.5-5.5-1.5 1.7-3.5 3.5-3.5 5.5A3.5 3.5 0 0 0 12 21z" />
    </>
  ),
  fire: (
    <>
      <path d="M12 2c1.2 3.2 4 6 5.5 8.8C19 13.5 19 17 16.5 19.8A7.5 7.5 0 0 1 5 15.5c0-4 3.5-6.5 4.5-9.5 1 2 2.5 3 3.5 3 1.5 0 1.5-3 1.5-5" />
      <path d="M12 21a3.5 3.5 0 0 0 3.5-3.5c0-2-2-3.8-3.5-5.5-1.5 1.7-3.5 3.5-3.5 5.5A3.5 3.5 0 0 0 12 21z" />
    </>
  ),
  'bolt-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <polygon points="13 6 8.5 12.5 11.5 12.5 10.5 18 15.5 11.5 12.5 11.5 13 6" />
    </>
  ),
  medal: (
    <>
      <polygon points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      <circle cx="12" cy="8" r="6" />
      <circle cx="12" cy="8" r="2.5" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
      <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
      <path d="M6 3h12v7a6 6 0 0 1-12 0V3z" />
      <line x1="12" y1="16" x2="12" y2="20" />
      <line x1="8" y1="20" x2="16" y2="20" />
    </>
  ),
  'chart-bars': (
    <>
      <line x1="4" y1="21" x2="20" y2="21" />
      <line x1="7" y1="21" x2="7" y2="13" />
      <line x1="12" y1="21" x2="12" y2="7" />
      <line x1="17" y1="21" x2="17" y2="10" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 2 1.9 4.6L18.5 8.5 13.9 10.4 12 15l-1.9-4.6L5.5 8.5l4.6-1.9z" />
      <path d="m18.5 15.5 1 2.3 2.3 1-2.3 1-1 2.3-1-2.3-2.3-1 2.3-1z" />
    </>
  ),
  waves: (
    <>
      <path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M2 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  note: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  rocket: (
    <>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A6 6 0 1 0 7.5 11.5c.76.76 1.23 1.52 1.41 2.5h6.18z" />
    </>
  ),
  backpack: (
    <>
      <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10z" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="16" y2="16" />
      <line x1="10" y1="12" x2="10" y2="16" />
      <line x1="14" y1="12" x2="14" y2="16" />
    </>
  ),
  flask: (
    <>
      <path d="M10 2v5.5L4.4 18.2A2 2 0 0 0 6 21h12a2 2 0 0 0 1.6-2.8L14 7.5V2" />
      <line x1="8.5" y1="2" x2="15.5" y2="2" />
      <line x1="7" y1="15" x2="17" y2="15" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </>
  ),
  package: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  star: (
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  ),
  'chevron-down': <polyline points="6 9 12 15 18 9" />,
  'chevron-up': <polyline points="18 15 12 9 6 15" />,
  'chevron-left': <polyline points="15 18 9 12 15 6" />,
  'chevron-right': <polyline points="9 18 15 12 9 6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  'external-link': (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </>
  ),
  pin: (
    <>
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-2l-3-3V5h1V2H7v3h1v7l-3 3z" />
    </>
  ),

  // --- Category Pictograms (for Dictionary & Vocabulary) ---------------------
  'cat-people': (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  'cat-chat': (
    <>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </>
  ),
  'cat-food': (
    <>
      <path d="M18 2v20M2 2v7a4 4 0 0 0 4 4v9M6 2v7M10 2v7a4 4 0 0 1-4 4M22 6a4 4 0 0 0-4-4v10a4 4 0 0 0 4-4V6z" />
    </>
  ),
  'cat-home': (
    <>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  'cat-city': (
    <>
      <rect x="3" y="6" width="7" height="15" rx="1" />
      <rect x="14" y="2" width="7" height="19" rx="1" />
      <line x1="6" y1="10" x2="7" y2="10" />
      <line x1="6" y1="14" x2="7" y2="14" />
      <line x1="17" y1="6" x2="18" y2="6" />
      <line x1="17" y1="10" x2="18" y2="10" />
      <line x1="17" y1="14" x2="18" y2="14" />
    </>
  ),
  'cat-travel': (
    <>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7 4 8l6 4-3 3-2.5-.5L3 16l3.5 1.5L8 21l1.5-1.5-.5-2.5 3-3 4 6z" />
    </>
  ),
  'cat-work': (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  'cat-nature': (
    <>
      <path d="M2 22s5-1 9-5 5-9 5-9-1 4-5 8-9 6-9 6z" />
      <path d="M11 13c1.5-2.5 3-5 7-7 1 4-1.5 7.5-3 9" />
    </>
  ),
  'cat-emotions': (
    <>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </>
  ),
  'cat-verbs': (
    <>
      <polygon points="13 2 4.5 13.5 10.5 13.5 9.5 22 18.5 10.5 12.5 10.5 13 2" />
    </>
  ),
  'cat-time': (
    <>
      <path d="M5 22h14M5 2h14M17 22v-4.17a4 4 0 0 0-1.17-2.83L12 11l-3.83 4A4 4 0 0 0 7 17.83V22M7 2v4.17a4 4 0 0 0 1.17 2.83L12 13l3.83-4A4 4 0 0 0 17 6.17V2" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICON_PATHS;

export interface IconProps {
  name: IconName;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  /** Filled glyphs read better on coloured chips; outline ones on paper. */
  strokeWidth?: number;
  title?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size,
  className,
  style,
  strokeWidth = 2,
  title,
}) => {
  const glyph = ICON_PATHS[name] || ICON_PATHS.star;
  return (
    <svg
      className={className ? `ic ${className}` : 'ic'}
      style={style}
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
      {glyph}
    </svg>
  );
};
