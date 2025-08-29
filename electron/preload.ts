import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hexcall', {
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
	setOverlayScale: (scale: number) => ipcRenderer.invoke('overlay:set-scale', scale),
	setOverlayCorner: (corner: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => ipcRenderer.invoke('overlay:set-corner', corner),
	windowMinimize: () => ipcRenderer.invoke('window:minimize'),
	windowClose: () => ipcRenderer.invoke('window:close'),
	windowMaximizeToggle: () => ipcRenderer.invoke('window:maximize-toggle'),
	windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
	updatesCheck: () => ipcRenderer.invoke('updates:check'),
	updatesDownload: () => ipcRenderer.invoke('updates:download'),
	updatesQuitAndInstall: () => ipcRenderer.invoke('updates:quitAndInstall'),
	onUpdateAvailable: (cb: (info: any) => void) => { const l = (_: any, i: any) => cb(i); ipcRenderer.on('updates:available', l); return () => ipcRenderer.removeListener('updates:available', l); },
	onUpdateNone: (cb: (info: any) => void) => { const l = (_: any, i: any) => cb(i); ipcRenderer.on('updates:none', l); return () => ipcRenderer.removeListener('updates:none', l); },
	onUpdateProgress: (cb: (p: any) => void) => { const l = (_: any, p: any) => cb(p); ipcRenderer.on('updates:progress', l); return () => ipcRenderer.removeListener('updates:progress', l); },
	onUpdateDownloaded: (cb: (info: any) => void) => { const l = (_: any, i: any) => cb(i); ipcRenderer.on('updates:downloaded', l); return () => ipcRenderer.removeListener('updates:downloaded', l); },
});

export {};


