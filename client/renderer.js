const log = document.getElementById('log');
const connectBtn = document.getElementById('connectBtn');
const statusText = document.getElementById('status');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');

const serverUrlInput = document.getElementById('serverUrl');
const tokenInput = document.getElementById('token');
const nameInput = document.getElementById('name');

let socket;

const addMessage = (text, meta = '') => {
  const wrapper = document.createElement('div');
  wrapper.className = 'message';
  wrapper.innerHTML = `${text}${meta ? `<span>${meta}</span>` : ''}`;
  log.appendChild(wrapper);
  log.scrollTop = log.scrollHeight;
};

const addSystem = (text) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'message system';
  wrapper.textContent = text;
  log.appendChild(wrapper);
  log.scrollTop = log.scrollHeight;
};

const setStatus = (text, ok = false) => {
  statusText.textContent = text;
  statusText.style.color = ok ? '#86efac' : '#fca5a5';
};

const connect = () => {
  const serverUrl = serverUrlInput.value.trim();
  const token = tokenInput.value.trim();
  const name = nameInput.value.trim();

  if (!serverUrl || !token || !name) {
    setStatus('Please enter server URL, shared secret, and name.');
    return;
  }

  socket = new WebSocket(serverUrl);

  socket.addEventListener('open', () => {
    setStatus('Connected. Authenticating...', true);
    socket.send(JSON.stringify({ type: 'auth', token, name }));
  });

  socket.addEventListener('message', (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      addSystem('Received invalid data.');
      return;
    }

    if (data.type === 'system') {
      addSystem(data.message);
      setStatus('Connected.', true);
    }

    if (data.type === 'message') {
      addMessage(`${data.from}: ${data.text}`, new Date(data.timestamp).toLocaleString());
    }

    if (data.type === 'sent') {
      addMessage(`You: ${data.text}`, new Date(data.timestamp).toLocaleString());
    }

    if (data.type === 'error') {
      addSystem(data.message);
      setStatus(data.message);
    }
  });

  socket.addEventListener('close', () => {
    setStatus('Disconnected.');
    addSystem('Connection closed.');
  });
};

connectBtn.addEventListener('click', () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
    return;
  }

  connect();
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    setStatus('Not connected.');
    return;
  }

  const text = messageInput.value.trim();
  if (!text) {
    return;
  }

  socket.send(JSON.stringify({ type: 'message', text }));
  messageInput.value = '';
});

const { serverUrl, token, name } = window.chatConfig;
if (serverUrl) {
  serverUrlInput.value = serverUrl;
}
if (token) {
  tokenInput.value = token;
}
if (name) {
  nameInput.value = name;
}
