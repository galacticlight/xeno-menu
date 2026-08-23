/**
 * XenoMenu Preload Script
 * Exposes a minimal, secure API to the renderer via contextBridge.
 * No Node.js access in renderer.
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xenoAPI', {
  // System status (read-only)
  getSystemStatus: () => ipcRenderer.invoke('get-system-status'),

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),

  // Actions
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),

  // Platform info (safe)
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
});

// Freeze to prevent modification
Object.freeze(window.xenoAPI);
