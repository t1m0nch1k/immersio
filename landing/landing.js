// Theme toggle.
//
// The app keeps its settings in `localStorage` under `pogruzhenie_v2`, where the
// flag is `darkMode` and light mode is the absence of it. Reading that same
// record is what makes the landing and the app agree: pick dark once, and
// neither page argues about it afterwards. The toggle writes back to the same
// field, so the choice also carries into the app itself.

const STATE_KEY = 'pogruzhenie_v2';
const root = document.documentElement;

const readDarkMode = () => {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed.darkMode === true;
  } catch {
    // Blocked storage, corrupt JSON, or a private window. None of these are
    // worth failing a landing page over, so fall back to the OS preference.
    return null;
  }
};

const writeDarkMode = (dark) => {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== 'object' || parsed === null) return;
    parsed.darkMode = dark;
    localStorage.setItem(STATE_KEY, JSON.stringify(parsed));
  } catch {
    // The toggle still works for this page view even when nothing is stored.
  }
};

const apply = (dark) => {
  if (dark) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
  const button = document.getElementById('theme');
  if (button) {
    button.setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
  }
};

const stored = readDarkMode();
apply(stored === null ? window.matchMedia('(prefers-color-scheme: dark)').matches : stored);

document.getElementById('theme')?.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') !== 'dark';
  apply(next);
  writeDarkMode(next);
});
