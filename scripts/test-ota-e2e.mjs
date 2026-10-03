import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const updatesDir = path.resolve(root, 'updates');

// Read manifest
const manifest = JSON.parse(fs.readFileSync(path.resolve(updatesDir, 'version.json'), 'utf8'));

// 1. Start HTTP server
const server = http.createServer((req, res) => {
  const filePath = path.join(updatesDir, req.url.split('?')[0]);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': filePath.endsWith('.json') ? 'application/json' : 'application/octet-stream'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise(r => server.listen(8089, '127.0.0.1', r));
console.log('HTTP test server listening on http://127.0.0.1:8089');

// 2. Connect to DevTools WebSocket
const targets = await fetch('http://127.0.0.1:9222/json').then(r => r.json());
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);

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
    console.log('Connected to phone WebView DevTools!');

    // 1. Check initial info
    const initialInfo = JSON.parse(await sendEval('window.AndroidHost.getAppInfo()'));
    console.log('Initial app info on phone:', initialInfo);

    // 2. Start OTA bundle update
    console.log('Triggering OTA download and apply from http://127.0.0.1:8089/bundle.zip...');
    await sendEval(`
      window.__updateEvents = [];
      window.__onUpdateProgress = (p) => window.__updateEvents.push({ type: 'progress', data: p });
      window.__onUpdateComplete = (c) => window.__updateEvents.push({ type: 'complete', data: c });
      window.__onUpdateError = (e) => window.__updateEvents.push({ type: 'error', data: e });
      window.AndroidHost.downloadAndApplyBundle(
        'http://127.0.0.1:8089/bundle.zip',
        '${manifest.bundleSha256}',
        '${manifest.bundleVersion}'
      );
    `);

    // Poll for completion
    let complete = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 500));
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
        throw new Error('Update reported error: ' + JSON.stringify(events.find(e => e.type === 'error')));
      }
    }

    if (!complete) throw new Error('Update timed out!');

    // 3. Check app info before reload (live bundle installed on disk)
    const afterInstallInfo = JSON.parse(await sendEval('window.AndroidHost.getAppInfo()'));
    console.log('App info after OTA install:', afterInstallInfo);
    if (!afterInstallInfo.hasLiveBundle) throw new Error('Expected hasLiveBundle to be true');

    // 4. Reload app
    console.log('Reloading app WebView...');
    await sendEval('window.AndroidHost.reloadApp()');
    await new Promise(r => setTimeout(r, 2000));

    // Re-verify after reload
    const reloadedInfo = JSON.parse(await sendEval('window.AndroidHost.getAppInfo()'));
    console.log('App info after WebView reload:', reloadedInfo);
    if (!reloadedInfo.hasLiveBundle || reloadedInfo.bundleVersion !== manifest.bundleVersion) {
      throw new Error('Live bundle did not persist or version mismatch');
    }

    console.log('✓ OTA Update successfully installed, verified, and running on phone!');

    // 5. Test Rollback to APK built-in assets
    console.log('Testing rollback to APK built-in assets...');
    await sendEval('window.AndroidHost.rollbackBundle()');
    await new Promise(r => setTimeout(r, 2000));

    const rolledBackInfo = JSON.parse(await sendEval('window.AndroidHost.getAppInfo()'));
    console.log('App info after rollback:', rolledBackInfo);
    if (rolledBackInfo.hasLiveBundle) throw new Error('Expected hasLiveBundle to be false after rollback');

    console.log('✓ Rollback mechanism verified successfully!');
    console.log('===> ALL END-TO-END OTA TESTS PASSED ON DEVICE! <===');

    ws.close();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E Test Failed:', err);
    ws.close();
    server.close();
    process.exit(1);
  }
};
