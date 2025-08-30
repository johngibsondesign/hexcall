import { app, BrowserWindow, ipcMain, globalShortcut, dialog } from 'electron';
import path from 'path';
import { findLCUAuth, getGameflowPhase, getLobbyMembers, getLobby, getGameSession, getCurrentSummoner } from './lcu';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let overlayScale = 1;
let overlayCorner: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';

function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 1100,
		height: 720,
		backgroundColor: '#0a0a0a',
		frame: false,
		titleBarStyle: 'hiddenInset',
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	const startUrl = process.env.NODE_ENV === 'development'
		? 'http://localhost:3000'
		: `file://${path.join(process.resourcesPath || __dirname, '..', 'renderer', 'index.html')}`;

	mainWindow.loadURL(startUrl);

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

function createOverlayWindow() {
	overlayWindow = new BrowserWindow({
		width: Math.round(260 * overlayScale),
		height: Math.round(120 * overlayScale),
		alwaysOnTop: true,
		frame: false,
		transparent: true,
		resizable: true,
		skipTaskbar: true,
		backgroundColor: '#00000000',
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	const startUrl = process.env.NODE_ENV === 'development'
		? 'http://localhost:3000/overlay'
		: `file://${path.join(process.resourcesPath || __dirname, '..', 'renderer', 'overlay', 'index.html')}`;

	overlayWindow.loadURL(startUrl);
	overlayWindow.setAlwaysOnTop(true, 'floating');
	overlayWindow.setVisibleOnAllWorkspaces(true);
	const { width, height } = overlayWindow.getBounds();
	positionOverlay(width, height);
}

function positionOverlay(width: number, height: number) {
	const { workArea } = require('electron').screen.getPrimaryDisplay();
	const margin = 12;
	let x = workArea.x + workArea.width - width - margin;
	let y = workArea.y + margin;
	if (overlayCorner === 'top-left') {
		x = workArea.x + margin;
		y = workArea.y + margin;
	} else if (overlayCorner === 'bottom-right') {
		x = workArea.x + workArea.width - width - margin;
		y = workArea.y + workArea.height - height - margin;
	} else if (overlayCorner === 'bottom-left') {
		x = workArea.x + margin;
		y = workArea.y + workArea.height - height - margin;
	}
	overlayWindow?.setBounds({ x, y, width, height });
}

app.whenReady().then(() => {
	createMainWindow();
	createOverlayWindow();

	// auto-updater
	autoUpdater.autoDownload = false;
	autoUpdater.on('update-available', (info) => {
		mainWindow?.webContents.send('updates:available', info);
	});
	autoUpdater.on('update-not-available', (info) => {
		mainWindow?.webContents.send('updates:none', info);
	});
	autoUpdater.on('download-progress', (p) => {
		mainWindow?.webContents.send('updates:progress', p);
	});
	autoUpdater.on('update-downloaded', (info) => {
		mainWindow?.webContents.send('updates:downloaded', info);
	});

	globalShortcut.register('CommandOrControl+Shift+H', () => {
		if (!overlayWindow) return;
		const visible = overlayWindow.isVisible();
		if (visible) overlayWindow.hide(); else overlayWindow.show();
	});

	globalShortcut.register('CommandOrControl+Shift+M', () => {
		BrowserWindow.getAllWindows().forEach(win => win.webContents.send('hotkey:toggle-mute'));
	});

	// check for updates silently on start
	try { autoUpdater.checkForUpdates(); } catch {}

	// basic poller for LCU state
	setInterval(async () => {
		const auth = findLCUAuth();
		if (!auth) {
			mainWindow?.webContents.send('lcu:update', { phase: 'NotFound', members: [], lobby: null, session: null });
			overlayWindow?.webContents.send('lcu:update', { phase: 'NotFound', members: [], lobby: null, session: null });
			return;
		}
		try {
			const [phase, members, lobby, session, self] = await Promise.all([
				getGameflowPhase(auth).catch(() => 'Unknown'),
				getLobbyMembers(auth).catch(() => []),
				getLobby(auth).catch(() => null),
				getGameSession(auth).catch(() => null),
				getCurrentSummoner(auth).catch(() => null),
			]);
			mainWindow?.webContents.send('lcu:update', { phase, members, lobby, session, self });
			overlayWindow?.webContents.send('lcu:update', { phase, members, lobby, session, self });
			// Only show overlay when game is in progress
			if (overlayWindow) {
				if (phase === 'InProgress') {
					overlayWindow.showInactive();
				} else {
					overlayWindow.hide();
				}
			}
		} catch (e) {
			mainWindow?.webContents.send('lcu:update', { phase: 'Error', members: [], lobby: null, session: null, error: String(e) });
			overlayWindow?.webContents.send('lcu:update', { phase: 'Error', members: [], lobby: null, session: null, error: String(e) });
		}
	}, 3000);
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createMainWindow();
	}
});

ipcMain.handle('overlay:set-bounds', (_e, bounds: Electron.Rectangle) => {
	if (!overlayWindow) return;
	overlayWindow.setBounds(bounds);
});

ipcMain.handle('overlay:set-scale', (_e, scale: number) => {
	overlayScale = Math.max(0.75, Math.min(1.5, Number(scale) || 1));
	if (!overlayWindow) return;
	const width = Math.round(260 * overlayScale);
	const height = Math.round(120 * overlayScale);
	positionOverlay(width, height);
});

ipcMain.handle('overlay:set-corner', (_e, corner: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => {
	overlayCorner = corner;
	if (!overlayWindow) return;
	const { width, height } = overlayWindow.getBounds();
	positionOverlay(width, height);
});

// Window controls
ipcMain.handle('window:minimize', () => {
	mainWindow?.minimize();
});

ipcMain.handle('window:close', () => {
	mainWindow?.close();
});

ipcMain.handle('window:is-maximized', () => {
	return mainWindow?.isMaximized?.() || false;
});

ipcMain.handle('window:maximize-toggle', () => {
	if (!mainWindow) return;
	if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize();
});

ipcMain.handle('updates:check', async () => {
	try { await autoUpdater.checkForUpdates(); } catch {}
});

ipcMain.handle('updates:download', async () => {
	try { await autoUpdater.downloadUpdate(); } catch {}
});

ipcMain.handle('updates:quitAndInstall', () => {
	autoUpdater.quitAndInstall();
});


