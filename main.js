/**
 * Forza Telemetry Out - Electron Desktop Entry Point
 * 
 * Boots the background UDP listener and WebSocket server, then launches
 * the native hardware-accelerated Forza Telemetry HUD desktop window.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const server = require('./server/index');

let mainWindow = null;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 840,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#0a0b10',
    title: 'Forza Telemetry Out | Apex HUD & Analytics',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    show: false
  });

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
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
