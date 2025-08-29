"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('hexcall', {
    setOverlayBounds: (bounds) => electron_1.ipcRenderer.invoke('overlay:set-bounds', bounds),
    onLcuUpdate: (cb) => {
        const listener = (_e, data) => cb(data);
        electron_1.ipcRenderer.on('lcu:update', listener);
        return () => electron_1.ipcRenderer.removeListener('lcu:update', listener);
    },
    onHotkeyToggleMute: (cb) => {
        const listener = () => cb();
        electron_1.ipcRenderer.on('hotkey:toggle-mute', listener);
        return () => electron_1.ipcRenderer.removeListener('hotkey:toggle-mute', listener);
    },
    setOverlayScale: (scale) => electron_1.ipcRenderer.invoke('overlay:set-scale', scale),
    setOverlayCorner: (corner) => electron_1.ipcRenderer.invoke('overlay:set-corner', corner),
    windowMinimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
    windowClose: () => electron_1.ipcRenderer.invoke('window:close'),
    windowMaximizeToggle: () => electron_1.ipcRenderer.invoke('window:maximize-toggle'),
    windowIsMaximized: () => electron_1.ipcRenderer.invoke('window:is-maximized'),
    updatesCheck: () => electron_1.ipcRenderer.invoke('updates:check'),
    updatesDownload: () => electron_1.ipcRenderer.invoke('updates:download'),
    updatesQuitAndInstall: () => electron_1.ipcRenderer.invoke('updates:quitAndInstall'),
    onUpdateAvailable: (cb) => { const l = (_, i) => cb(i); electron_1.ipcRenderer.on('updates:available', l); return () => electron_1.ipcRenderer.removeListener('updates:available', l); },
    onUpdateNone: (cb) => { const l = (_, i) => cb(i); electron_1.ipcRenderer.on('updates:none', l); return () => electron_1.ipcRenderer.removeListener('updates:none', l); },
    onUpdateProgress: (cb) => { const l = (_, p) => cb(p); electron_1.ipcRenderer.on('updates:progress', l); return () => electron_1.ipcRenderer.removeListener('updates:progress', l); },
    onUpdateDownloaded: (cb) => { const l = (_, i) => cb(i); electron_1.ipcRenderer.on('updates:downloaded', l); return () => electron_1.ipcRenderer.removeListener('updates:downloaded', l); },
});
