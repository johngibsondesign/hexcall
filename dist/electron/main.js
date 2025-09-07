"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_path2 = __toESM(require("path"));

// electron/lcu.ts
var import_https = __toESM(require("https"));
var import_http = __toESM(require("http"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_os = __toESM(require("os"));
var import_child_process = require("child_process");
function candidateLockfilePaths() {
  const candidates = /* @__PURE__ */ new Set();
  const env = process.env;
  const local = env.LOCALAPPDATA || import_path.default.join(import_os.default.homedir(), "AppData", "Local");
  const programFiles = env["ProgramFiles"] || "C:/Program Files";
  const programFilesX86 = env["ProgramFiles(x86)"] || "C:/Program Files (x86)";
  const systemDrive = env["SystemDrive"] || "C:";
  candidates.add(import_path.default.join(local, "Riot Games", "Riot Client", "Config", "lockfile"));
  candidates.add(import_path.default.join(programFiles, "Riot Games", "League of Legends", "lockfile"));
  candidates.add(import_path.default.join(programFilesX86, "Riot Games", "League of Legends", "lockfile"));
  candidates.add(import_path.default.join(systemDrive, "Riot Games", "League of Legends", "lockfile"));
  ["C:", "D:", "E:", "F:", "G:"].forEach((drive) => {
    candidates.add(import_path.default.join(drive, "Riot Games", "League of Legends", "lockfile"));
    candidates.add(import_path.default.join(drive, "Riot Games", "League of Legends", "Game", "lockfile"));
    candidates.add(import_path.default.join(drive, "Program Files", "Riot Games", "League of Legends", "lockfile"));
    candidates.add(import_path.default.join(drive, "Program Files (x86)", "Riot Games", "League of Legends", "lockfile"));
    candidates.add(import_path.default.join(drive, "Games", "Riot Games", "League of Legends", "lockfile"));
    candidates.add(import_path.default.join(drive, "Games", "League of Legends", "lockfile"));
  });
  candidates.add(import_path.default.join(import_os.default.homedir(), "Library", "Application Support", "League of Legends", "lockfile"));
  candidates.add("/Applications/League of Legends.app/Contents/LoL/lockfile");
  return Array.from(candidates);
}
function findLCUAuth() {
  console.log("[LCU] Starting League client detection...");
  if (process.platform === "win32") {
    console.log("[LCU] Trying Windows process detection methods...");
    const fromCim = getAuthFromProcessWindowsCIM();
    if (fromCim) {
      console.log("[LCU] Found auth via CIM");
      return fromCim;
    }
    const fromWmic = getAuthFromProcessWindowsWMIC();
    if (fromWmic) {
      console.log("[LCU] Found auth via WMIC");
      return fromWmic;
    }
    const fromGetProcess = getAuthFromProcessWindowsGetProcess();
    if (fromGetProcess) {
      console.log("[LCU] Found auth via Get-Process");
      return fromGetProcess;
    }
    const fromRiotJson = getAuthFromRiotClientInstalls();
    if (fromRiotJson) {
      console.log("[LCU] Found auth via Riot JSON");
      return fromRiotJson;
    }
  }
  console.log("[LCU] Trying lockfile detection...");
  const paths = candidateLockfilePaths();
  console.log("[LCU] Checking", paths.length, "lockfile paths");
  for (const p of paths) {
    try {
      if (!import_fs.default.existsSync(p)) continue;
      console.log("[LCU] Found lockfile at:", p);
      const content = import_fs.default.readFileSync(p, "utf8");
      const [name, pid, port, password, protocol] = content.split(":");
      if (!port || !password || !protocol) {
        console.log("[LCU] Invalid lockfile format - missing required fields:", { port: !!port, password: !!password, protocol: !!protocol });
        continue;
      }
      const auth = { protocol, address: "127.0.0.1", port: Number(port), username: "riot", password };
      console.log("[LCU] Successfully parsed lockfile auth:", { port: auth.port, protocol: auth.protocol, address: auth.address });
      return auth;
    } catch (error) {
      console.log("[LCU] Error reading lockfile", p, ":", error);
    }
  }
  console.log("[LCU] No League client found");
  return null;
}
function parseAuthFromCmdLine(line) {
  const portMatch = line.match(/--app-port=(\d+)/);
  const tokenMatch = line.match(/--remoting-auth-token=([^\s\"]+)/) || line.match(/--remoting-auth-token=\"([^\"]+)\"/);
  if (!portMatch || !tokenMatch) return null;
  const port = Number(portMatch[1]);
  const password = tokenMatch[1];
  return { protocol: "https", address: "127.0.0.1", port, username: "riot", password };
}
function getAuthFromProcessWindowsCIM() {
  try {
    const ps = "powershell.exe";
    const cmd = `$p = Get-CimInstance Win32_Process -Filter "Name='LeagueClientUx.exe' OR Name='LeagueClientUxRender.exe' OR Name='LeagueClient.exe' OR Name='RiotClientServices.exe'" | Select-Object -ExpandProperty CommandLine; if ($p) { $p }`;
    const buf = (0, import_child_process.execFileSync)(ps, ["-NoProfile", "-Command", cmd], { stdio: ["ignore", "pipe", "ignore"], timeout: 2e3 });
    const line = buf.toString("utf8").replace(/\r/g, "").trim();
    if (!line) return null;
    return parseAuthFromCmdLine(line);
  } catch {
    return null;
  }
}
function getAuthFromProcessWindowsWMIC() {
  try {
    const buf = (0, import_child_process.execFileSync)("wmic", ["process", "where", '(name="LeagueClientUx.exe" or name="LeagueClientUxRender.exe" or name="LeagueClient.exe" or name="RiotClientServices.exe")', "get", "CommandLine"], { stdio: ["ignore", "pipe", "ignore"], timeout: 2e3 });
    const out = buf.toString("utf8");
    const lines = out.split(/\r?\n/);
    for (const l of lines) {
      const auth = parseAuthFromCmdLine(l);
      if (auth) return auth;
    }
    return null;
  } catch {
    return null;
  }
}
function getAuthFromProcessWindowsGetProcess() {
  try {
    const ps = "powershell.exe";
    const cmd = "Get-Process LeagueClient*,RiotClientServices* -IncludeUserName | Select-Object -ExpandProperty Path | ForEach-Object { (Get-Item $_).DirectoryName }";
    const buf = (0, import_child_process.execFileSync)(ps, ["-NoProfile", "-Command", cmd], { stdio: ["ignore", "pipe", "ignore"], timeout: 2e3 });
    const dirs = buf.toString("utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    for (const dir of dirs) {
      const lockfileCandidates = [
        import_path.default.join(dir, "lockfile"),
        import_path.default.join(dir, "Config", "lockfile")
        // Riot Client
      ];
      for (const lf of lockfileCandidates) {
        if (import_fs.default.existsSync(lf)) {
          const content = import_fs.default.readFileSync(lf, "utf8");
          const [name, pid, port, password, protocol] = content.split(":");
          return { protocol, address: "127.0.0.1", port: Number(port), username: "riot", password };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
function getAuthFromRiotClientInstalls() {
  try {
    const programData = process.env["ProgramData"] || "C:/ProgramData";
    const jsonPath = import_path.default.join(programData, "Riot Games", "RiotClientInstalls.json");
    if (!import_fs.default.existsSync(jsonPath)) return null;
    const raw = import_fs.default.readFileSync(jsonPath, "utf8");
    const data = JSON.parse(raw);
    const lolPath = data["league_of_legends.live"] || data["league_of_legends"] || "";
    if (lolPath) {
      const lock = import_path.default.join(import_path.default.dirname(lolPath), "lockfile");
      if (import_fs.default.existsSync(lock)) {
        const content = import_fs.default.readFileSync(lock, "utf8");
        const [name, pid, port, password, protocol] = content.split(":");
        return { protocol, address: "127.0.0.1", port: Number(port), username: "riot", password };
      }
    }
    const rcPath = data["rc_default"] || data["rc_live"] || "";
    if (rcPath) {
      const dir = import_path.default.dirname(rcPath);
      const lock = import_path.default.join(dir, "Config", "lockfile");
      if (import_fs.default.existsSync(lock)) {
        const content = import_fs.default.readFileSync(lock, "utf8");
        const [name, pid, port, password, protocol] = content.split(":");
        return { protocol, address: "127.0.0.1", port: Number(port), username: "riot", password };
      }
    }
    return null;
  } catch {
    return null;
  }
}
async function lcuRequest(auth, pathName, method = "GET", body) {
  return new Promise((resolve, reject) => {
    console.log(`[LCU] Making ${method} request to ${auth.protocol}://${auth.address}:${auth.port}${pathName}`);
    const opts = {
      method,
      rejectUnauthorized: false,
      host: auth.address,
      port: auth.port,
      path: pathName,
      headers: {
        Authorization: "Basic " + Buffer.from(`${auth.username}:${auth.password}`).toString("base64"),
        "Content-Type": "application/json"
      }
    };
    const requestModule = auth.protocol === "https" ? import_https.default : import_http.default;
    const req = requestModule.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          if (res.statusCode && res.statusCode >= 400) {
            console.log(`[LCU] Request failed with status ${res.statusCode}: ${data}`);
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }
          resolve(data ? JSON.parse(data) : void 0);
        } catch (e) {
          console.log("[LCU] Failed to parse response:", data);
          reject(e);
        }
      });
    });
    req.setTimeout(2e3, () => {
      req.destroy(new Error("LCU request timeout"));
    });
    req.on("error", (err) => {
      console.log("[LCU] Request error:", err.message);
      reject(err);
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
async function getGameflowPhase(auth) {
  return lcuRequest(auth, "/lol-gameflow/v1/gameflow-phase");
}
async function getLobbyMembers(auth) {
  return lcuRequest(auth, "/lol-lobby/v2/lobby/members");
}
async function getLobby(auth) {
  return lcuRequest(auth, "/lol-lobby/v2/lobby");
}
async function getGameSession(auth) {
  return lcuRequest(auth, "/lol-gameflow/v1/session");
}
async function getCurrentSummoner(auth) {
  return lcuRequest(auth, "/lol-summoner/v1/current-summoner");
}

// electron/main.ts
var import_electron_updater = require("electron-updater");
var profile = process.env.HEXCALL_PROFILE;
if (profile) {
  const base = import_electron.app.getPath("userData");
  import_electron.app.setPath("userData", import_path2.default.join(base, `profile-${profile}`));
  console.log(`[MAIN] Using profile: ${profile}, userData: ${import_electron.app.getPath("userData")}`);
}
var currentProfile = profile || "";
var mainWindow = null;
var overlayWindow = null;
var overlayScale = 1;
var overlayCorner = "top-right";
var lastLcuPayload = null;
function createMainWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1100,
    height: 720,
    backgroundColor: "#0a0a0a",
    frame: false,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: import_path2.default.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
      // Allow loading local resources in production
    }
  });
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    const appRoot = import_electron.app.getAppPath();
    const indexPath = import_path2.default.join(appRoot, "out", "index.html");
    console.log("[MAIN] Loading main window from:", indexPath);
    mainWindow.loadFile(indexPath);
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("[MAIN] Failed to load:", { errorCode, errorDescription, validatedURL });
  });
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[MAIN] Main window finished loading");
  });
}
function createOverlayWindow() {
  overlayWindow = new import_electron.BrowserWindow({
    width: Math.round(44 * overlayScale),
    height: Math.round(44 * overlayScale),
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: import_path2.default.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
      // Allow loading local resources in production
    }
  });
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    overlayWindow.loadURL("http://localhost:3000/overlay");
  } else {
    const appRoot = import_electron.app.getAppPath();
    const overlayPath = import_path2.default.join(appRoot, "out", "overlay", "index.html");
    console.log("[OVERLAY] Loading overlay window from:", overlayPath);
    overlayWindow.loadFile(overlayPath);
  }
  overlayWindow.setAlwaysOnTop(true, "floating");
  overlayWindow.setVisibleOnAllWorkspaces(true);
  const { width, height } = overlayWindow.getBounds();
  positionOverlay(width, height);
  overlayWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("[OVERLAY] Failed to load:", { errorCode, errorDescription, validatedURL });
  });
  overlayWindow.webContents.on("did-finish-load", () => {
    console.log("[OVERLAY] Overlay window finished loading");
  });
}
function positionOverlay(width, height) {
  const { workArea } = require("electron").screen.getPrimaryDisplay();
  const margin = 12;
  let x = workArea.x + workArea.width - width - margin;
  let y = workArea.y + margin;
  if (overlayCorner === "top-left") {
    x = workArea.x + margin;
    y = workArea.y + margin;
  } else if (overlayCorner === "bottom-right") {
    x = workArea.x + workArea.width - width - margin;
    y = workArea.y + workArea.height - height - margin;
  } else if (overlayCorner === "bottom-left") {
    x = workArea.x + margin;
    y = workArea.y + workArea.height - height - margin;
  }
  overlayWindow?.setBounds({ x, y, width, height });
}
import_electron.app.whenReady().then(() => {
  try {
    import_electron.app.setLoginItemSettings({ openAtLogin: true });
  } catch {
  }
  createMainWindow();
  createOverlayWindow();
  import_electron_updater.autoUpdater.autoDownload = false;
  import_electron_updater.autoUpdater.autoInstallOnAppQuit = true;
  import_electron_updater.autoUpdater.on("update-available", (info) => {
    console.log("[AutoUpdater] Update available:", info.version);
    mainWindow?.webContents.send("updates:available", info);
  });
  import_electron_updater.autoUpdater.on("update-not-available", (info) => {
    console.log("[AutoUpdater] No update available");
    mainWindow?.webContents.send("updates:none", info);
  });
  import_electron_updater.autoUpdater.on("download-progress", (progress) => {
    console.log("[AutoUpdater] Download progress:", progress.percent + "%");
    mainWindow?.webContents.send("updates:progress", progress);
  });
  import_electron_updater.autoUpdater.on("update-downloaded", (info) => {
    console.log("[AutoUpdater] Update downloaded, ready to install");
    mainWindow?.webContents.send("updates:downloaded", info);
  });
  import_electron_updater.autoUpdater.on("error", (error) => {
    console.error("[AutoUpdater] Error:", error);
    mainWindow?.webContents.send("updates:error", { error: error.message });
  });
  import_electron.globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (!overlayWindow) return;
    const visible = overlayWindow.isVisible();
    if (visible) overlayWindow.hide();
    else overlayWindow.show();
  });
  import_electron.globalShortcut.register("CommandOrControl+Shift+M", () => {
    import_electron.BrowserWindow.getAllWindows().forEach((win) => win.webContents.send("hotkey:toggle-mute"));
  });
  let pushToTalkKey = "CapsLock";
  let isPushToTalkEnabled = false;
  let isPushToTalkActive = false;
  const updatePushToTalkHotkey = (enabled, key) => {
    if (isPushToTalkEnabled && pushToTalkKey) {
      try {
        import_electron.globalShortcut.unregister(pushToTalkKey);
      } catch (e) {
        console.warn("Failed to unregister push-to-talk key:", e);
      }
    }
    isPushToTalkEnabled = enabled;
    pushToTalkKey = key;
    if (enabled && key) {
      try {
        const success = import_electron.globalShortcut.register(key, () => {
          if (!isPushToTalkActive) {
            isPushToTalkActive = true;
            import_electron.BrowserWindow.getAllWindows().forEach(
              (win) => win.webContents.send("hotkey:push-to-talk", { active: true })
            );
          }
        });
        if (!success) {
          console.warn(`Failed to register push-to-talk key: ${key}`);
          import_electron.BrowserWindow.getAllWindows().forEach(
            (win) => win.webContents.send("push-to-talk:error", { error: `Failed to register ${key}` })
          );
        }
      } catch (e) {
        console.warn("Error registering push-to-talk:", e);
      }
    }
  };
  let pushToTalkReleaseTimer = null;
  const handlePushToTalkRelease = () => {
    if (isPushToTalkActive) {
      isPushToTalkActive = false;
      import_electron.BrowserWindow.getAllWindows().forEach(
        (win) => win.webContents.send("hotkey:push-to-talk", { active: false })
      );
    }
  };
  import_electron.ipcMain.handle("push-to-talk:update-settings", (event, { enabled, key }) => {
    updatePushToTalkHotkey(enabled, key);
    return { success: true };
  });
  import_electron.ipcMain.handle("push-to-talk:get-settings", () => {
    return { enabled: isPushToTalkEnabled, key: pushToTalkKey };
  });
  import_electron.ipcMain.on("push-to-talk:simulate-release", () => {
    handlePushToTalkRelease();
  });
  setInterval(async () => {
    const auth = findLCUAuth();
    if (!auth) {
      if (process.env.NODE_ENV === "development") {
        console.log("[LCU] No auth found, checking League client processes...");
      }
      mainWindow?.webContents.send("lcu:update", { phase: "NotFound", members: [], lobby: null, session: null });
      overlayWindow?.webContents.send("lcu:update", { phase: "NotFound", members: [], lobby: null, session: null });
      return;
    }
    if (process.env.NODE_ENV === "development") {
      console.log("[LCU] Found auth:", { port: auth.port, protocol: auth.protocol });
    }
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[LCU] Making API calls to League client...");
      }
      const [phase, membersRaw, lobby, session, self] = await Promise.all([
        getGameflowPhase(auth).catch((e) => {
          if (process.env.NODE_ENV === "development") console.log("[LCU] getGameflowPhase error:", e.message);
          return "Unknown";
        }),
        getLobbyMembers(auth).catch((e) => {
          if (process.env.NODE_ENV === "development") console.log("[LCU] getLobbyMembers error:", e.message);
          return [];
        }),
        getLobby(auth).catch((e) => {
          if (process.env.NODE_ENV === "development") console.log("[LCU] getLobby error:", e.message);
          return null;
        }),
        getGameSession(auth).catch((e) => {
          if (process.env.NODE_ENV === "development") console.log("[LCU] getGameSession error:", e.message);
          return null;
        }),
        getCurrentSummoner(auth).catch((e) => {
          if (process.env.NODE_ENV === "development") console.log("[LCU] getCurrentSummoner error:", e.message);
          return null;
        })
      ]);
      const members = Array.isArray(membersRaw) ? membersRaw : [];
      if (process.env.NODE_ENV === "development") {
        console.log("[LCU] API results:", { phase, membersCount: members.length, hasLobby: !!lobby, hasSession: !!session, hasSelf: !!self });
      }
      const payload = { phase, members, lobby, session, self };
      const nextPayloadKey = JSON.stringify(payload);
      if (nextPayloadKey !== lastLcuPayload) {
        lastLcuPayload = nextPayloadKey;
        mainWindow?.webContents.send("lcu:update", payload);
        overlayWindow?.webContents.send("lcu:update", payload);
      }
      if (overlayWindow) {
        if (phase === "InProgress") {
          overlayWindow.showInactive();
        } else if (phase !== "InProgress") {
        }
      }
    } catch (e) {
      mainWindow?.webContents.send("lcu:update", { phase: "Error", members: [], lobby: null, session: null, error: String(e) });
      overlayWindow?.webContents.send("lcu:update", { phase: "Error", members: [], lobby: null, session: null, error: String(e) });
    }
  }, 5e3);
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
import_electron.app.on("activate", () => {
  if (import_electron.BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
import_electron.ipcMain.handle("overlay:set-bounds", (_e, bounds) => {
  if (!overlayWindow) return;
  overlayWindow.setBounds(bounds);
});
import_electron.ipcMain.handle("overlay:set-scale", (_e, scale) => {
  overlayScale = Math.max(0.75, Math.min(1.5, Number(scale) || 1));
  if (!overlayWindow) return;
  const width = Math.round(44 * overlayScale);
  const height = Math.round(44 * overlayScale);
  positionOverlay(width, height);
});
import_electron.ipcMain.handle("overlay:set-corner", (_e, corner) => {
  overlayCorner = corner;
  if (!overlayWindow) return;
  const { width, height } = overlayWindow.getBounds();
  positionOverlay(width, height);
});
import_electron.ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});
import_electron.ipcMain.handle("window:close", () => {
  mainWindow?.close();
});
import_electron.ipcMain.handle("window:is-maximized", () => {
  return mainWindow?.isMaximized?.() || false;
});
import_electron.ipcMain.handle("window:maximize-toggle", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
import_electron.ipcMain.handle("updates:check", async () => {
  try {
    console.log("[AutoUpdater] Manual check for updates requested");
    await import_electron_updater.autoUpdater.checkForUpdates();
  } catch (err) {
    console.error("[AutoUpdater] Check failed:", err);
  }
});
import_electron.ipcMain.handle("updates:download", async () => {
  try {
    console.log("[AutoUpdater] Manual download requested");
    await import_electron_updater.autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    console.error("[AutoUpdater] Manual download failed:", err);
    return { success: false, error: String(err) };
  }
});
import_electron.ipcMain.handle("updates:quitAndInstall", async () => {
  try {
    console.log("[AutoUpdater] Quit and install requested");
    setTimeout(() => {
      import_electron_updater.autoUpdater.quitAndInstall();
    }, 1e3);
    return { success: true };
  } catch (err) {
    console.error("[AutoUpdater] Quit and install failed:", err);
    return { success: false, error: String(err) };
  }
});
import_electron.ipcMain.handle("app:set-auto-start", async (_, enabled) => {
  try {
    import_electron.app.setLoginItemSettings({ openAtLogin: enabled });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
import_electron.ipcMain.handle("overlay:show", async () => {
  if (overlayWindow) {
    overlayWindow.showInactive();
    return { success: true };
  }
  return { success: false, error: "Overlay window not available" };
});
import_electron.ipcMain.handle("overlay:hide", async () => {
  if (overlayWindow) {
    overlayWindow.hide();
    return { success: true };
  }
  return { success: false, error: "Overlay window not available" };
});
import_electron.ipcMain.handle("app:get-profile", async () => {
  return currentProfile;
});
