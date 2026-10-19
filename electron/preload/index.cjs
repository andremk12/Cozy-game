const { contextBridge, ipcRenderer } = require('electron');

// The sandboxed renderer receives no filesystem, Node.js, or generic IPC access.
contextBridge.exposeInMainWorld('haven', Object.freeze({
  getPreferences: () => ipcRenderer.invoke('haven:preferences:get'),
  savePreferences: (patch) => {
    const allowed = ['lampOn', 'rainOn', 'audioEnabled', 'volume'];
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return Promise.reject(new TypeError('Invalid preferences.'));
    }
    const keys = Object.keys(patch);
    if (keys.length === 0 || keys.some((key) => !allowed.includes(key))) {
      return Promise.reject(new TypeError('Unknown or empty preferences.'));
    }
    for (const key of keys) {
      const value = patch[key];
      if (key === 'volume'
        ? typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1
        : typeof value !== 'boolean') {
        return Promise.reject(new TypeError('Invalid preference value.'));
      }
    }
    return ipcRenderer.invoke('haven:preferences:save', Object.fromEntries(keys.map((key) => [key, patch[key]])));
  },
}));
