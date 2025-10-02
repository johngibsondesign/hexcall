"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("hexcall", {
  // Expose profile for multi-instance testing
  getProfile: () => import_electron.ipcRenderer.invoke("app:get-profile"),
  setOverlayBounds: (bounds) => import_electron.ipcRenderer.invoke("overlay:set-bounds", bounds),
  onLcuUpdate: (cb) => {
    const listener = (_e, data) => cb(data);
    import_electron.ipcRenderer.on("lcu:update", listener);
    return () => import_electron.ipcRenderer.removeListener("lcu:update", listener);
  },
  onHotkeyToggleMute: (cb) => {
    const listener = () => cb();
    import_electron.ipcRenderer.on("hotkey:toggle-mute", listener);
    return () => import_electron.ipcRenderer.removeListener("hotkey:toggle-mute", listener);
  },
  onHotkeyPushToTalk: (cb) => {
    const listener = (_e, data) => cb(data.active);
    import_electron.ipcRenderer.on("hotkey:push-to-talk", listener);
    return () => import_electron.ipcRenderer.removeListener("hotkey:push-to-talk", listener);
  },
  pushToTalkUpdateSettings: (enabled, key) => import_electron.ipcRenderer.invoke("push-to-talk:update-settings", { enabled, key }),
  pushToTalkGetSettings: () => import_electron.ipcRenderer.invoke("push-to-talk:get-settings"),
  pushToTalkSimulateRelease: () => import_electron.ipcRenderer.send("push-to-talk:simulate-release"),
  setOverlayScale: (scale) => import_electron.ipcRenderer.invoke("overlay:set-scale", scale),
  setOverlayCorner: (corner) => import_electron.ipcRenderer.invoke("overlay:set-corner", corner),
  setOverlayInteractive: (interactive) => import_electron.ipcRenderer.invoke("overlay:set-interactive", interactive),
  windowMinimize: () => import_electron.ipcRenderer.invoke("window:minimize"),
  windowClose: () => import_electron.ipcRenderer.invoke("window:close"),
  windowMaximizeToggle: () => import_electron.ipcRenderer.invoke("window:maximize-toggle"),
  windowIsMaximized: () => import_electron.ipcRenderer.invoke("window:is-maximized"),
  updatesCheck: () => import_electron.ipcRenderer.invoke("updates:check"),
  updatesDownload: () => import_electron.ipcRenderer.invoke("updates:download"),
  updatesQuitAndInstall: () => import_electron.ipcRenderer.invoke("updates:quitAndInstall"),
  setAutoStart: (enabled) => import_electron.ipcRenderer.invoke("app:set-auto-start", enabled),
  showOverlay: () => import_electron.ipcRenderer.invoke("overlay:show"),
  hideOverlay: () => import_electron.ipcRenderer.invoke("overlay:hide"),
  onUpdateAvailable: (cb) => {
    const l = (_, i) => cb(i);
    import_electron.ipcRenderer.on("updates:available", l);
    return () => import_electron.ipcRenderer.removeListener("updates:available", l);
  },
  onUpdateNone: (cb) => {
    const l = (_, i) => cb(i);
    import_electron.ipcRenderer.on("updates:none", l);
    return () => import_electron.ipcRenderer.removeListener("updates:none", l);
  },
  onUpdateProgress: (cb) => {
    const l = (_, p) => cb(p);
    import_electron.ipcRenderer.on("updates:progress", l);
    return () => import_electron.ipcRenderer.removeListener("updates:progress", l);
  },
  onUpdateDownloaded: (cb) => {
    const l = (_, i) => cb(i);
    import_electron.ipcRenderer.on("updates:downloaded", l);
    return () => import_electron.ipcRenderer.removeListener("updates:downloaded", l);
  },
  onUpdateError: (cb) => {
    const l = (_, e) => cb(e);
    import_electron.ipcRenderer.on("updates:error", l);
    return () => import_electron.ipcRenderer.removeListener("updates:error", l);
  }
});
