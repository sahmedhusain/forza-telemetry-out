/**
 * Forza Telemetry Out - Electron Desktop Entry Point
 * 
 * Boots the background UDP listener and WebSocket server, then launches
 * the native hardware-accelerated Forza Telemetry HUD desktop window.
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
if (app.isPackaged) require('dotenv').config({ path: path.join(app.getPath('userData'), '.env') });
if (app.isPackaged && !process.env.FORZA_DATA_DIR) process.env.FORZA_DATA_DIR = path.join(app.getPath('userData'),'data');
const server = require('./server/index');

let mainWindow = null;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 840,
    minWidth: 390,
    minHeight: 600,
    backgroundColor: '#0a0b10',
    title: 'Forza Telemetry Out | Apex HUD & Analytics',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  // Load dashboard on active port
  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Fullscreen toggle via F11
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });
}

// Window control IPC handlers
ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

// App Lifecycle
app.whenReady().then(async () => {
  try {
    // 1. Start backend server (UDP + WebSocket + HTTP)
    const { port } = await server.start();

    // 2. Open desktop window
    createWindow(port);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(port);
      }
    });
  } catch (err) {
    console.error('[Electron] Failed to start server:', err);
    dialog.showErrorBox('Cannot start telemetry receiver', err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => server.stop());
