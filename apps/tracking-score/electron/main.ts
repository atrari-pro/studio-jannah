import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PlaywrightController } from './playwright-controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let playwrightController: PlaywrightController | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Studio Jannah Tracking Score',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (playwrightController) {
    playwrightController.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('start-scan', async (_event, url: string) => {
  if (!playwrightController) {
    playwrightController = new PlaywrightController();
  }
  
  try {
    await playwrightController.startScan(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-scan-state', async () => {
  if (!playwrightController) {
    return null;
  }
  return playwrightController.getState();
});

ipcMain.handle('finish-scan', async () => {
  if (!playwrightController) {
    return { success: false, error: 'No active scan' };
  }
  
  try {
    const report = await playwrightController.finishScan();
    return { success: true, report };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('mark-consent-accepted', async () => {
  if (!playwrightController) {
    return { success: false };
  }
  playwrightController.markConsentAccepted();
  return { success: true };
});

ipcMain.handle('mark-consent-refused', async () => {
  if (!playwrightController) {
    return { success: false };
  }
  playwrightController.markConsentRefused();
  return { success: true };
});
