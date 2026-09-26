import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const webAssets = resolve(root, 'android/app/src/main/assets');
const target = resolve(webAssets, 'www');
if (!target.startsWith(`${webAssets}${sep}`)) throw new Error('Unsafe Android asset path');

execFileSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc')], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', '--base', '/assets/www/'], { cwd: root, stdio: 'inherit' });

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(resolve(root, 'dist'), target, { recursive: true });

const htmlPath = resolve(target, 'index.html');
const html = await readFile(htmlPath, 'utf8');
await writeFile(htmlPath, html.replace('</head>', '<link rel="stylesheet" href="/assets/www/android-phone.css"><script src="/assets/www/android-bridge.js"></script></head>'));
await cp(resolve(root, 'android/app/android-phone.css'), resolve(target, 'android-phone.css'));
await writeFile(resolve(target, 'android-bridge.js'), `
(function () {
  var host = window.AndroidHost;

  // --- Speech -------------------------------------------------------------
  // The WebView speech engine is inconsistent across devices, so the packaged
  // bundle routes everything through the platform TextToSpeech instead.
  function NativeUtterance(text) {
    this.text = String(text || '');
    this.lang = 'en-US';
    this.rate = 1;
    this.pitch = 1;
  }
  var synthesis = {
    getVoices: function () { return []; },
    speak: function (utterance) {
      if (window.AndroidTts) window.AndroidTts.speak(utterance.text, utterance.lang, utterance.rate);
    },
    cancel: function () { if (window.AndroidTts) window.AndroidTts.cancel(); },
    onvoiceschanged: null
  };
  try {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis });
  } catch (_) {
    window.speechSynthesis = synthesis;
  }
  window.SpeechSynthesisUtterance = NativeUtterance;

  if (!host) return;

  // --- External links -----------------------------------------------------
  // window.open() needs setSupportMultipleWindows plus onCreateWindow to work,
  // and a new WebView would lose the app state. Route it to the system
  // browser instead, which is what the caller meant.
  var nativeOpen = window.open;
  window.open = function (url) {
    var href = typeof url === 'string' ? url : (url && url.href);
    if (!href) return null;
    try {
      host.openExternal(href);
    } catch (error) {
      if (nativeOpen) return nativeOpen.apply(window, arguments);
    }
    return null;
  };

  // --- Theme --------------------------------------------------------------
  // The system bars are painted by the shell, which cannot see the app theme.
  // Watching the attribute the app already toggles keeps the two in step
  // without the web bundle having to know it is running inside the shell.
  function reportTheme() {
    try {
      host.setTheme(document.documentElement.getAttribute('data-theme') === 'dark');
    } catch (error) {
      /* the host went away; nothing to sync */
    }
  }

  new MutationObserver(reportTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reportTheme);
  } else {
    reportTheme();
  }
})();
`);
console.log('Android web bundle copied to android/app/src/main/assets/www');
