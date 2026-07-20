import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { registerIpc } from './ipc';
import { fingerprintReader } from './device/fingerprint';

/**
 * Main process. Security posture (Electron hardening best practices):
 *  - contextIsolation ON, nodeIntegration OFF, sandbox ON - the renderer is a plain
 *    web page with no Node access; it reaches the OS only through the typed preload.
 *  - external links open in the OS browser, never in-app.
 *  - navigation is locked to our own content.
 */
function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 832,
    minWidth: 1000,
    minHeight: 640,
    title: 'ShulePay Admin',
    backgroundColor: '#f6f8fb',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.on('ready-to-show', () => win.show());

  // Open external links in the OS browser; block in-app navigation elsewhere.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  // electron-vite injects the dev server URL in development; load the built file in prod.
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) void win.loadURL(devUrl);
  else void win.loadFile(join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  void fingerprintReader.dispose();
});
