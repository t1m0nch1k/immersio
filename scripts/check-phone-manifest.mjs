const targets = await fetch('http://127.0.0.1:9222/json').then(r => r.json());
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `window.location.reload()`
    }
  }));
};

ws.onmessage = (e) => {
  console.log('Result:', e.data);
  ws.close();
  process.exit(0);
};
