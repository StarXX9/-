const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = Number.parseInt(process.env.PORT || '8080', 10);
const CHAT_SECRET = process.env.CHAT_SECRET;

if (!CHAT_SECRET) {
  console.error('Missing CHAT_SECRET. Example: CHAT_SECRET=your_shared_secret node index.js');
  process.exit(1);
}

const server = http.createServer();
const wss = new WebSocketServer({ server });

const clients = new Map();

const send = (ws, payload) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};

const broadcast = (payload, exceptWs = null) => {
  for (const ws of clients.keys()) {
    if (ws !== exceptWs) {
      send(ws, payload);
    }
  }
};

const disconnect = (ws, reason) => {
  const info = clients.get(ws);
  if (info) {
    clients.delete(ws);
    broadcast({ type: 'system', message: `${info.name} left the chat.` });
  }
  if (reason) {
    send(ws, { type: 'error', message: reason });
  }
  ws.close();
};

wss.on('connection', (ws) => {
  let authed = false;

  send(ws, { type: 'system', message: 'Welcome! Please authenticate.' });

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch (error) {
      send(ws, { type: 'error', message: 'Invalid JSON.' });
      return;
    }

    if (!authed) {
      if (data.type !== 'auth') {
        send(ws, { type: 'error', message: 'Authenticate first.' });
        return;
      }

      if (data.token !== CHAT_SECRET) {
        send(ws, { type: 'error', message: 'Invalid token.' });
        ws.close();
        return;
      }

      const name = String(data.name || '').trim();
      if (!name) {
        send(ws, { type: 'error', message: 'Name is required.' });
        return;
      }

      if (clients.size >= 2) {
        send(ws, { type: 'error', message: 'Chat is full (2 users only).' });
        ws.close();
        return;
      }

      for (const info of clients.values()) {
        if (info.name.toLowerCase() === name.toLowerCase()) {
          send(ws, { type: 'error', message: 'Name already in use.' });
          ws.close();
          return;
        }
      }

      authed = true;
      clients.set(ws, { name });
      send(ws, { type: 'system', message: `You are connected as ${name}.` });
      broadcast({ type: 'system', message: `${name} joined the chat.` }, ws);
      return;
    }

    if (data.type === 'message') {
      const text = String(data.text || '').trim();
      if (!text) {
        return;
      }

      const sender = clients.get(ws);
      broadcast(
        {
          type: 'message',
          text,
          from: sender?.name || 'Unknown',
          timestamp: new Date().toISOString()
        },
        ws
      );
      send(ws, { type: 'sent', text, timestamp: new Date().toISOString() });
    }
  });

  ws.on('close', () => {
    disconnect(ws);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ws://0.0.0.0:${PORT}`);
});
