const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('chatConfig', {
  serverUrl: process.env.CHAT_SERVER_URL || 'ws://localhost:8080',
  token: process.env.CHAT_TOKEN || '',
  name: process.env.CHAT_NAME || ''
});
