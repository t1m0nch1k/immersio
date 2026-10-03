const targets = await fetch('http://127.0.0.1:9222/json').then(r => r.json());
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);

const manifestRes = await fetch('https://raw.githubusercontent.com/t1m0nch1k/immersio/main/updates/version.json?_t=' + Date.now());
const manifest = await manifestRes.json();
console.log('Online manifest from GitHub:', manifest);

function sendEval(expression) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        resolve(data.result?.result?.value);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression } }));
  });
}

ws.onopen = async () => {
  try {
    console.log('Connected to phone DevTools!');
    const currentInfo = JSON.parse(await sendEval('window.AndroidHost.getAppInfo()'));
    console.log('Current Info on phone:', currentInfo);

    console.log('Triggering download of latest bundle from GitHub:', manifest.bundleUrl);
    await sendEval(`
      window.__updateEvents = [];
      window.__onUpdateProgress = (p) => window.__updateEvents.push({ type: 'progress', data: p });
      window.__onUpdateComplete = (c) => window.__updateEvents.push({ type: 'complete', data: c });
      window.__onUpdateError = (e) => window.__updateEvents.push({ type: 'error', data: e });
      window.AndroidHost.downloadAndApplyBundle(
        '${manifest.bundleUrl}',
        '${manifest.bundleSha256}',
        '${manifest.bundleVersion}'
      );
    `);

    let complete = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const events = JSON.parse(await sendEval('JSON.stringify(window.__updateEvents || [])'));
      const lastEvent = events[events.length - 1];
      if (lastEvent) {
        console.log(`Update state: ${lastEvent.type}`, lastEvent.data);
      }
      if (events.some(e => e.type === 'complete')) {
        complete = true;
        break;
      }
      if (events.some(e => e.type === 'error')) {
        throw new Error('Update error: ' + JSON.stringify(events.find(e => e.type === 'error')));
      }
    }

    if (!complete) throw new Error('Update timed out!');

    console.log('Reloading app with the new bundle...');
    await sendEval('window.AndroidHost.reloadApp()');
    await new Promise(r => setTimeout(r, 2000));

    const newInfo = JSON.parse(await sendEval('window.AndroidHost.getAppInfo()'));
    console.log('New app info after update and reload:', newInfo);

    ws.close();
    process.exit(0);
  } catch (e) {
    console.error('Failed to update phone:', e);
    ws.close();
    process.exit(1);
  }
};
