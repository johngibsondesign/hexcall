"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const lcu_1 = require("./lcu");
const electron_updater_1 = require("electron-updater");
let mainWindow = null;
let overlayWindow = null;
let overlayScale = 1;
let overlayCorner = 'top-right';
function createMainWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1100,
        height: 720,
        backgroundColor: '#0a0a0a',
        frame: false,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    const startUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : `file://${path_1.default.join(__dirname, '../renderer/index.html')}`;
    mainWindow.loadURL(startUrl);
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
function createOverlayWindow() {
    overlayWindow = new electron_1.BrowserWindow({
        width: Math.round(260 * overlayScale),
        height: Math.round(120 * overlayScale),
        alwaysOnTop: true,
        frame: false,
        transparent: true,
        resizable: true,
        skipTaskbar: true,
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    const startUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/overlay'
        : `file://${path_1.default.join(__dirname, '../renderer/overlay.html')}`;
    overlayWindow.loadURL(startUrl);
    overlayWindow.setAlwaysOnTop(true, 'floating');
    overlayWindow.setVisibleOnAllWorkspaces(true);
    const { width, height } = overlayWindow.getBounds();
    positionOverlay(width, height);
}
function positionOverlay(width, height) {
    const { workArea } = require('electron').screen.getPrimaryDisplay();
    const margin = 12;
    let x = workArea.x + workArea.width - width - margin;
    let y = workArea.y + margin;
    if (overlayCorner === 'top-left') {
        x = workArea.x + margin;
        y = workArea.y + margin;
    }
    else if (overlayCorner === 'bottom-right') {
        x = workArea.x + workArea.width - width - margin;
        y = workArea.y + workArea.height - height - margin;
    }
    else if (overlayCorner === 'bottom-left') {
        x = workArea.x + margin;
        y = workArea.y + workArea.height - height - margin;
    }
    overlayWindow?.setBounds({ x, y, width, height });
}
electron_1.app.whenReady().then(() => {
    createMainWindow();
    createOverlayWindow();
    // auto-updater
    electron_updater_1.autoUpdater.autoDownload = false;
    electron_updater_1.autoUpdater.on('update-available', (info) => {
        mainWindow?.webContents.send('updates:available', info);
    });
    electron_updater_1.autoUpdater.on('update-not-available', (info) => {
        mainWindow?.webContents.send('updates:none', info);
    });
    electron_updater_1.autoUpdater.on('download-progress', (p) => {
        mainWindow?.webContents.send('updates:progress', p);
    });
    electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
        mainWindow?.webContents.send('updates:downloaded', info);
    });
    electron_1.globalShortcut.register('CommandOrControl+Shift+H', () => {
        if (!overlayWindow)
            return;
        const visible = overlayWindow.isVisible();
        if (visible)
            overlayWindow.hide();
        else
            overlayWindow.show();
    });
    electron_1.globalShortcut.register('CommandOrControl+Shift+M', () => {
        electron_1.BrowserWindow.getAllWindows().forEach(win => win.webContents.send('hotkey:toggle-mute'));
    });
    // check for updates silently on start
    try {
        electron_updater_1.autoUpdater.checkForUpdates();
    }
    catch { }
    // basic poller for LCU state
    setInterval(async () => {
        const auth = (0, lcu_1.findLCUAuth)();
        if (!auth) {
            mainWindow?.webContents.send('lcu:update', { phase: 'NotFound', members: [], lobby: null, session: null });
            overlayWindow?.webContents.send('lcu:update', { phase: 'NotFound', members: [], lobby: null, session: null });
            return;
        }
        try {
            const [phase, members, lobby, session] = await Promise.all([
                (0, lcu_1.getGameflowPhase)(auth).catch(() => 'Unknown'),
                (0, lcu_1.getLobbyMembers)(auth).catch(() => []),
                (0, lcu_1.getLobby)(auth).catch(() => null),
                (0, lcu_1.getGameSession)(auth).catch(() => null),
            ]);
            mainWindow?.webContents.send('lcu:update', { phase, members, lobby, session });
            overlayWindow?.webContents.send('lcu:update', { phase, members, lobby, session });
        }
        catch (e) {
            mainWindow?.webContents.send('lcu:update', { phase: 'Error', members: [], lobby: null, session: null, error: String(e) });
            overlayWindow?.webContents.send('lcu:update', { phase: 'Error', members: [], lobby: null, session: null, error: String(e) });
        }
    }, 3000);
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});
electron_1.ipcMain.handle('overlay:set-bounds', (_e, bounds) => {
    if (!overlayWindow)
        return;
    overlayWindow.setBounds(bounds);
});
electron_1.ipcMain.handle('overlay:set-scale', (_e, scale) => {
    overlayScale = Math.max(0.75, Math.min(1.5, Number(scale) || 1));
    if (!overlayWindow)
        return;
    const width = Math.round(260 * overlayScale);
    const height = Math.round(120 * overlayScale);
    positionOverlay(width, height);
});
electron_1.ipcMain.handle('overlay:set-corner', (_e, corner) => {
    overlayCorner = corner;
    if (!overlayWindow)
        return;
    const { width, height } = overlayWindow.getBounds();
    positionOverlay(width, height);
});
// Window controls
electron_1.ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.handle('window:close', () => {
    mainWindow?.close();
});
electron_1.ipcMain.handle('window:is-maximized', () => {
    return mainWindow?.isMaximized?.() || false;
});
electron_1.ipcMain.handle('window:maximize-toggle', () => {
    if (!mainWindow)
        return;
    if (mainWindow.isMaximized())
        mainWindow.unmaximize();
    else
        mainWindow.maximize();
});
electron_1.ipcMain.handle('updates:check', async () => {
    try {
        await electron_updater_1.autoUpdater.checkForUpdates();
    }
    catch { }
});
electron_1.ipcMain.handle('updates:download', async () => {
    try {
        await electron_updater_1.autoUpdater.downloadUpdate();
    }
    catch { }
});
electron_1.ipcMain.handle('updates:quitAndInstall', () => {
    electron_updater_1.autoUpdater.quitAndInstall();
});
