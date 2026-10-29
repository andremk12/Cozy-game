const { contextBridge, ipcRenderer } = require('electron');

// This separate sandbox receives one bounded image, never a filename, board,
// preferences or ritual text. It has no generic IPC/filesystem API.
let received = false;
let completed = false;
contextBridge.exposeInMainWorld('memoryDecoder', Object.freeze({
  receive: (callback) => {
    if (received || typeof callback !== 'function') return;
    received = true;
    ipcRenderer.once('haven:memory:decode', (_event, value) => callback(value));
    ipcRenderer.send('haven:memory:decoder-ready');
  },
  complete: (value) => {
    if (completed) return;
    completed = true;
    ipcRenderer.send('haven:memory:decoded', value);
  },
}));
