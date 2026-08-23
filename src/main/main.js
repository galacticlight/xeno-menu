/**
 * XenoMenu - Main Process
 * Secure Electron main process for Xenogears-inspired desktop menu.
 * Security: sandbox, contextIsolation, no nodeIntegration, limited APIs.
 */

'use strict';

const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const si = require('systeminformation');

// Security: Disable hardware acceleration only if needed; keep defaults secure.
// app.disableHardwareAcceleration(); // uncomment if GPU issues on some Macs

const store = new Store({
  name: 'xeno-menu-config',
  defaults: {
    alwaysOnTop: true,
    opacity: 0.95,
    position: { x: null, y: null },
    favorites: [],
    theme: 'classic',
    showInTray: true
  }
});

let mainWindow = null;
let tray = null;
let isQuitting = false;

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

function createWindow() {
  const { width, height } = { width: 720, height: 480 }; // Classic 4:3-ish for PS1 feel, but larger for modern

  const winOpts = {
    width,
    height,
    minWidth: 640,
    minHeight: 400,
    show: false,
    frame: false, // Custom frame for arts style
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: store.get('alwaysOnTop'),
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableRemoteModule: false, // deprecated but explicit
      spellcheck: false
    },
    title: 'XenoMenu',
    icon: path.join(__dirname, '../../assets/icon.png')
  };

  // Restore position if saved
  const pos = store.get('position');
  if (pos && pos.x !== null && pos.y !== null) {
    winOpts.x = pos.x;
    winOpts.y = pos.y;
  }

  mainWindow = new BrowserWindow(winOpts);

  // Load renderer
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Security: Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in default browser only if safe
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
      // mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting && store.get('showInTray')) {
      e.preventDefault();
      mainWindow.hide();
      if (isMac) app.dock.hide();
    } else {
      // Save position
      const [x, y] = mainWindow.getPosition();
      store.set('position', { x, y });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Keyboard: global toggle (Ctrl+Shift+X or Cmd+Shift+X)
  const toggleShortcut = isMac ? 'Command+Shift+X' : 'Control+Shift+X';
  globalShortcut.register(toggleShortcut, () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
        if (isMac) app.dock.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
        if (isMac) app.dock.show();
      }
    }
  });
}

function createTray() {
  // Simple tray icon (placeholder; replace with proper asset)
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      // Fallback: create a simple colored icon
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon.isEmpty() ? nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVQ4T2NkYGD4z0ABYBw1Gj0aAQB9TBQBq1q1VQAAAABJRU5ErkJggg==') : trayIcon);
  tray.setToolTip('XenoMenu - Xenogears Desktop');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show XenoMenu',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          if (isMac) app.dock.show();
        }
      }
    },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: store.get('alwaysOnTop'),
      click: (item) => {
        store.set('alwaysOnTop', item.checked);
        if (mainWindow) mainWindow.setAlwaysOnTop(item.checked);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// IPC handlers - only expose necessary, validated data
ipcMain.handle('get-system-status', async () => {
  try {
    const [cpu, mem, disk, battery, osInfo, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.battery(),
      si.osInfo(),
      si.time()
    ]);

    // Sanitize and structure like Xenogears party status
    const primaryDisk = disk && disk.length > 0 ? disk[0] : { size: 0, used: 0, available: 0 };

    return {
      cpu: {
        name: 'PROCESSOR',
        usage: Math.round(cpu.currentLoad || 0),
        cores: cpu.cpus ? cpu.cpus.length : 0,
        // HP-like: inverse of usage for "health"? Or usage as "damage"
        hp: 100 - Math.round(cpu.currentLoad || 0),
        maxHp: 100
      },
      memory: {
        name: 'MEMORY',
        usage: Math.round((mem.used / mem.total) * 100) || 0,
        total: Math.round(mem.total / (1024 * 1024 * 1024)),
        used: Math.round(mem.used / (1024 * 1024 * 1024)),
        hp: Math.round(((mem.total - mem.used) / mem.total) * 100) || 0,
        maxHp: 100
      },
      storage: {
        name: 'STORAGE',
        usage: Math.round((primaryDisk.used / primaryDisk.size) * 100) || 0,
        total: Math.round(primaryDisk.size / (1024 * 1024 * 1024)),
        free: Math.round(primaryDisk.available / (1024 * 1024 * 1024)),
        hp: Math.round((primaryDisk.available / primaryDisk.size) * 100) || 0,
        maxHp: 100
      },
      battery: battery.hasBattery ? {
        name: 'BATTERY',
        percent: battery.percent || 0,
        isCharging: battery.isCharging,
        hp: battery.percent || 0,
        maxHp: 100
      } : null,
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch
      },
      uptime: time.uptime || 0,
      timestamp: Date.now()
    };
  } catch (err) {
    console.error('System info error:', err.message);
    return { error: 'Unable to retrieve system status' };
  }
});

ipcMain.handle('get-config', () => {
  return {
    alwaysOnTop: store.get('alwaysOnTop'),
    opacity: store.get('opacity'),
    favorites: store.get('favorites'),
    theme: store.get('theme')
  };
});

ipcMain.handle('set-config', (event, key, value) => {
  // Whitelist keys for security
  const allowed = ['alwaysOnTop', 'opacity', 'favorites', 'theme'];
  if (!allowed.includes(key)) {
    return { success: false, error: 'Invalid config key' };
  }
  store.set(key, value);
  if (key === 'alwaysOnTop' && mainWindow) {
    mainWindow.setAlwaysOnTop(!!value);
  }
  if (key === 'opacity' && mainWindow) {
    mainWindow.setOpacity(Math.max(0.3, Math.min(1, value)));
  }
  return { success: true };
});

ipcMain.handle('open-path', async (event, targetPath) => {
  // Security: only allow opening known safe paths or user-selected
  // For MVP, restrict to no shell execution of arbitrary; use shell.openPath carefully
  if (typeof targetPath !== 'string' || targetPath.length > 1024) {
    return { success: false, error: 'Invalid path' };
  }
  // Basic sanitization: no shell metacharacters for command
  if (/[;&|`$]/.test(targetPath)) {
    return { success: false, error: 'Unsafe path characters' };
  }
  try {
    const result = await shell.openPath(targetPath);
    return { success: result === '', error: result || null };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('quit-app', () => {
  isQuitting = true;
  app.quit();
});

ipcMain.handle('hide-window', () => {
  if (mainWindow) {
    mainWindow.hide();
    if (isMac) app.dock.hide();
  }
});

app.whenReady().then(() => {
  createWindow();
  if (store.get('showInTray')) {
    createTray();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Security: Prevent new window creation from renderer
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (e) => {
    e.preventDefault();
  });
});
