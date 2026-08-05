import { app, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

/**
 * Checks GitHub Releases for a newer build and, once downloaded, asks before
 * restarting to install. No-op outside a packaged build (there's no update feed
 * in dev, and unsigned dev builds aren't a valid update target anyway).
 */
export function initAutoUpdate(): void {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
    void dialog
      .showMessageBox({
        type: 'info',
        title: 'Update ready',
        message: `ThumbPay Admin ${info.version} has been downloaded.`,
        detail: 'Restart now to install it, or it will install automatically next time you quit.',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.on('error', (err) => {
    console.error('[auto-update]', err);
  });

  void autoUpdater.checkForUpdates();
}
