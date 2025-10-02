import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hexcall', {
	// Expose profile for multi-instance testing
	getProfile: () => ipcRenderer.invoke('app:get-profile'),
	setOverlayBounds: (bounds: Electron.Rectangle) => ipcRenderer.invoke('overlay:set-bounds', bounds),
	onLcuUpdate: (cb: (payload: any) => void) => {
		const listener = (_e: any, data: any) => cb(data);
		ipcRenderer.on('lcu:update', listener);
		return () => ipcRenderer.removeListener('lcu:update', listener);
	},
	onHotkeyToggleMute: (cb: () => void) => {
		const listener = () => cb();
		ipcRenderer.on('hotkey:toggle-mute', listener);
		return () => ipcRenderer.removeListener('hotkey:toggle-mute', listener);
	},
	onHotkeyPushToTalk: (cb: (active: boolean) => void) => {
		const listener = (_e: any, data: { active: boolean }) => cb(data.active);
		ipcRenderer.on('hotkey:push-to-talk', listener);
		return () => ipcRenderer.removeListener('hotkey:push-to-talk', listener);
	},
	onHotkeyPushToMute: (cb: (active: boolean) => void) => {
		const listener = (_e: any, data: { active: boolean }) => cb(data.active);
		ipcRenderer.on('hotkey:push-to-mute', listener);
		return () => ipcRenderer.removeListener('hotkey:push-to-mute', listener);
	},
	pushToTalkUpdateSettings: (enabled: boolean, key: string) => ipcRenderer.invoke('push-to-talk:update-settings', { enabled, key }),
	pushToTalkGetSettings: () => ipcRenderer.invoke('push-to-talk:get-settings'),
	pushToTalkSimulateRelease: () => ipcRenderer.send('push-to-talk:simulate-release'),
	pushToMuteUpdateSettings: (enabled: boolean, key: string) => ipcRenderer.invoke('push-to-mute:update-settings', { enabled, key }),
	pushToMuteGetSettings: () => ipcRenderer.invoke('push-to-mute:get-settings'),
	pushToMuteSimulateRelease: () => ipcRenderer.send('push-to-mute:simulate-release'),
	setOverlayScale: (scale: number) => ipcRenderer.invoke('overlay:set-scale', scale),
	setOverlayCorner: (corner: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => ipcRenderer.invoke('overlay:set-corner', corner),
	setOverlayInteractive: (interactive: boolean) => ipcRenderer.invoke('overlay:set-interactive', interactive),
	setOverlayLocked: (locked: boolean) => ipcRenderer.invoke('overlay:set-locked', locked),
	windowMinimize: () => ipcRenderer.invoke('window:minimize'),
	windowClose: () => ipcRenderer.invoke('window:close'),
	windowMaximizeToggle: () => ipcRenderer.invoke('window:maximize-toggle'),
	windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
	updatesCheck: () => ipcRenderer.invoke('updates:check'),
	updatesDownload: () => ipcRenderer.invoke('updates:download'),
	updatesQuitAndInstall: () => ipcRenderer.invoke('updates:quitAndInstall'),
	setAutoStart: (enabled: boolean) => ipcRenderer.invoke('app:set-auto-start', enabled),
	setMinimizeToTray: (enabled: boolean) => ipcRenderer.invoke('app:set-minimize-to-tray', enabled),
	getMinimizeToTray: () => ipcRenderer.invoke('app:get-minimize-to-tray'),
	showOverlay: () => ipcRenderer.invoke('overlay:show'),
	hideOverlay: () => ipcRenderer.invoke('overlay:hide'),
	onUpdateAvailable: (cb: (info: any) => void) => { const l = (_: any, i: any) => cb(i); ipcRenderer.on('updates:available', l); return () => ipcRenderer.removeListener('updates:available', l); },
	onUpdateNone: (cb: (info: any) => void) => { const l = (_: any, i: any) => cb(i); ipcRenderer.on('updates:none', l); return () => ipcRenderer.removeListener('updates:none', l); },
	onUpdateProgress: (cb: (p: any) => void) => { const l = (_: any, p: any) => cb(p); ipcRenderer.on('updates:progress', l); return () => ipcRenderer.removeListener('updates:progress', l); },
	onUpdateDownloaded: (cb: (info: any) => void) => { const l = (_: any, i: any) => cb(i); ipcRenderer.on('updates:downloaded', l); return () => ipcRenderer.removeListener('updates:downloaded', l); },
	onUpdateError: (cb: (error: any) => void) => { const l = (_: any, e: any) => cb(e); ipcRenderer.on('updates:error', l); return () => ipcRenderer.removeListener('updates:error', l); },
});

export {};


