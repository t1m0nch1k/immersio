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
})();
`);
console.log('Android web bundle copied to android/app/src/main/assets/www');
