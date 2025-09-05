import { app, BrowserWindow, ipcMain, globalShortcut, dialog } from 'electron';
import path from 'path';
import { findLCUAuth, getGameflowPhase, getLobbyMembers, getLobby, getGameSession, getCurrentSummoner } from './lcu';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let overlayScale = 1;
let overlayCorner: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';
let lastLcuPayload: string | null = null;

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
			webSecurity: false, // Allow loading local resources in production
		},
	});

	const isDev = process.env.NODE_ENV === 'development';
	
	if (isDev) {
		mainWindow.loadURL('http://localhost:3000');
	} else {
		// In production, load from the packaged app root (app.asar)
		const appRoot = app.getAppPath();
		const indexPath = path.join(appRoot, 'out', 'index.html');
		console.log('[MAIN] Loading main window from:', indexPath);
		mainWindow.loadFile(indexPath);
	}

	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	// Add debug logging for any loading issues
	mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
		console.error('[MAIN] Failed to load:', { errorCode, errorDescription, validatedURL });
	});

	mainWindow.webContents.on('did-finish-load', () => {
		console.log('[MAIN] Main window finished loading');
	});
}

function createOverlayWindow() {
	overlayWindow = new BrowserWindow({
		width: Math.round(44 * overlayScale),
		height: Math.round(44 * overlayScale),
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
			webSecurity: false, // Allow loading local resources in production
		},
	});

	const isDev = process.env.NODE_ENV === 'development';
	
	if (isDev) {
		overlayWindow.loadURL('http://localhost:3000/overlay');
	} else {
		// In production, load from the packaged app root (app.asar)
		const appRoot = app.getAppPath();
		const overlayPath = path.join(appRoot, 'out', 'overlay', 'index.html');
		console.log('[OVERLAY] Loading overlay window from:', overlayPath);
		overlayWindow.loadFile(overlayPath);
	}
	overlayWindow.setAlwaysOnTop(true, 'floating');
	overlayWindow.setVisibleOnAllWorkspaces(true);
	const { width, height } = overlayWindow.getBounds();
	positionOverlay(width, height);

	// Add debug logging for overlay loading issues
	overlayWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
		console.error('[OVERLAY] Failed to load:', { errorCode, errorDescription, validatedURL });
	});

	overlayWindow.webContents.on('did-finish-load', () => {
		console.log('[OVERLAY] Overlay window finished loading');
	});
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
  try {
    app.setLoginItemSettings({ openAtLogin: true });
  } catch {}
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

	// Push-to-talk functionality
	let pushToTalkKey = 'CapsLock';
	let isPushToTalkEnabled = false;
	let isPushToTalkActive = false;

	// Register/unregister push-to-talk based on settings
	const updatePushToTalkHotkey = (enabled: boolean, key: string) => {
		// Unregister old hotkey
		if (isPushToTalkEnabled && pushToTalkKey) {
			try {
				globalShortcut.unregister(pushToTalkKey);
			} catch (e) {
				console.warn('Failed to unregister push-to-talk key:', e);
			}
		}

		isPushToTalkEnabled = enabled;
		pushToTalkKey = key;

		if (enabled && key) {
			try {
				// Register keydown event
				const success = globalShortcut.register(key, () => {
					if (!isPushToTalkActive) {
						isPushToTalkActive = true;
						BrowserWindow.getAllWindows().forEach(win => 
							win.webContents.send('hotkey:push-to-talk', { active: true })
						);
					}
				});

				if (!success) {
					console.warn(`Failed to register push-to-talk key: ${key}`);
					BrowserWindow.getAllWindows().forEach(win => 
						win.webContents.send('push-to-talk:error', { error: `Failed to register ${key}` })
					);
				}
			} catch (e) {
				console.warn('Error registering push-to-talk:', e);
			}
		}
	};

	// Handle key release (this is a limitation - Electron doesn't support keyup events for global shortcuts)
	// We'll implement a workaround using a timer
	let pushToTalkReleaseTimer: NodeJS.Timeout | null = null;
	
	const handlePushToTalkRelease = () => {
		if (isPushToTalkActive) {
			isPushToTalkActive = false;
			BrowserWindow.getAllWindows().forEach(win => 
				win.webContents.send('hotkey:push-to-talk', { active: false })
			);
		}
	};

	// IPC handlers for push-to-talk settings
	ipcMain.handle('push-to-talk:update-settings', (event, { enabled, key }) => {
		updatePushToTalkHotkey(enabled, key);
		return { success: true };
	});

	ipcMain.handle('push-to-talk:get-settings', () => {
		return { enabled: isPushToTalkEnabled, key: pushToTalkKey };
	});

	// Simulate key release detection (workaround for Electron limitation)
	ipcMain.on('push-to-talk:simulate-release', () => {
		handlePushToTalkRelease();
	});

	// check for updates silently on start
	try { autoUpdater.checkForUpdates(); } catch {}

	// basic poller for LCU state
	setInterval(async () => {
		const auth = findLCUAuth();
		if (!auth) {
			// Debug: Log only in development
			if (process.env.NODE_ENV === 'development') {
				console.log('[LCU] No auth found, checking League client processes...');
			}
			mainWindow?.webContents.send('lcu:update', { phase: 'NotFound', members: [], lobby: null, session: null });
			overlayWindow?.webContents.send('lcu:update', { phase: 'NotFound', members: [], lobby: null, session: null });
			return;
		}
		if (process.env.NODE_ENV === 'development') {
			console.log('[LCU] Found auth:', { port: auth.port, protocol: auth.protocol });
		}
		try {
			if (process.env.NODE_ENV === 'development') {
				console.log('[LCU] Making API calls to League client...');
			}
			const [phase, membersRaw, lobby, session, self] = await Promise.all([
				getGameflowPhase(auth).catch((e) => { if (process.env.NODE_ENV === 'development') console.log('[LCU] getGameflowPhase error:', e.message); return 'Unknown'; }),
				getLobbyMembers(auth).catch((e) => { if (process.env.NODE_ENV === 'development') console.log('[LCU] getLobbyMembers error:', e.message); return []; }),
				getLobby(auth).catch((e) => { if (process.env.NODE_ENV === 'development') console.log('[LCU] getLobby error:', e.message); return null; }),
				getGameSession(auth).catch((e) => { if (process.env.NODE_ENV === 'development') console.log('[LCU] getGameSession error:', e.message); return null; }),
				getCurrentSummoner(auth).catch((e) => { if (process.env.NODE_ENV === 'development') console.log('[LCU] getCurrentSummoner error:', e.message); return null; }),
			]);
			
			// Ensure members is always an array
			const members = Array.isArray(membersRaw) ? membersRaw : [];
			if (process.env.NODE_ENV === 'development') {
				console.log('[LCU] API results:', { phase, membersCount: members.length, hasLobby: !!lobby, hasSession: !!session, hasSelf: !!self });
			}
			// Dedupe payloads to avoid spamming renderer
			const payload = { phase, members, lobby, session, self };
			const nextPayloadKey = JSON.stringify(payload);
			if (nextPayloadKey !== lastLcuPayload) {
				lastLcuPayload = nextPayloadKey;
				mainWindow?.webContents.send('lcu:update', payload);
				overlayWindow?.webContents.send('lcu:update', payload);
			}
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
	}, 5000);
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
	const width = Math.round(44 * overlayScale);
	const height = Math.round(44 * overlayScale);
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


