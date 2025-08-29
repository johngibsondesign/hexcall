"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findLCUAuth = findLCUAuth;
exports.lcuRequest = lcuRequest;
exports.getGameflowPhase = getGameflowPhase;
exports.getLobbyMembers = getLobbyMembers;
exports.getLobby = getLobby;
exports.getGameSession = getGameSession;
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
function candidateLockfilePaths() {
    const candidates = new Set();
    const env = process.env;
    const local = env.LOCALAPPDATA || path_1.default.join(os_1.default.homedir(), 'AppData', 'Local');
    const programFiles = env['ProgramFiles'] || 'C:/Program Files';
    const programFilesX86 = env['ProgramFiles(x86)'] || 'C:/Program Files (x86)';
    const systemDrive = env['SystemDrive'] || 'C:';
    // Known locations
    candidates.add(path_1.default.join(local, 'Riot Games', 'Riot Client', 'Config', 'lockfile'));
    candidates.add(path_1.default.join(programFiles, 'Riot Games', 'League of Legends', 'lockfile'));
    candidates.add(path_1.default.join(programFilesX86, 'Riot Games', 'League of Legends', 'lockfile'));
    candidates.add(path_1.default.join(systemDrive, 'Riot Games', 'League of Legends', 'lockfile'));
    // Common extra drives
    ['C:', 'D:', 'E:', 'F:'].forEach((drive) => {
        candidates.add(path_1.default.join(drive, 'Riot Games', 'League of Legends', 'lockfile'));
        candidates.add(path_1.default.join(drive, 'Program Files', 'Riot Games', 'League of Legends', 'lockfile'));
        candidates.add(path_1.default.join(drive, 'Program Files (x86)', 'Riot Games', 'League of Legends', 'lockfile'));
    });
    // macOS common paths
    candidates.add(path_1.default.join(os_1.default.homedir(), 'Library', 'Application Support', 'League of Legends', 'lockfile'));
    candidates.add('/Applications/League of Legends.app/Contents/LoL/lockfile');
    return Array.from(candidates);
}
async function tryValidateAuth(auth) {
    try {
        await lcuRequest(auth, '/lol-gameflow/v1/gameflow-phase');
        return true;
    }
    catch {
        return false;
    }
}
function findLCUAuth() {
    // Prefer reading command line on Windows (most reliable)
    if (process.platform === 'win32') {
        const fromCim = getAuthFromProcessWindowsCIM();
        if (fromCim)
            return fromCim;
        const fromWmic = getAuthFromProcessWindowsWMIC();
        if (fromWmic)
            return fromWmic;
        const fromGetProcess = getAuthFromProcessWindowsGetProcess();
        if (fromGetProcess)
            return fromGetProcess;
        const fromRiotJson = getAuthFromRiotClientInstalls();
        if (fromRiotJson)
            return fromRiotJson;
    }
    // Fallback to well-known lockfile paths
    const paths = candidateLockfilePaths();
    for (const p of paths) {
        try {
            if (!fs_1.default.existsSync(p))
                continue;
            const content = fs_1.default.readFileSync(p, 'utf8');
            const [name, pid, port, password, protocol] = content.split(':');
            return { protocol, address: '127.0.0.1', port: Number(port), username: 'riot', password };
        }
        catch { }
    }
    return null;
}
function parseAuthFromCmdLine(line) {
    const portMatch = line.match(/--app-port=(\d+)/);
    const tokenMatch = line.match(/--remoting-auth-token=([^\s\"]+)/) || line.match(/--remoting-auth-token=\"([^\"]+)\"/);
    if (!portMatch || !tokenMatch)
        return null;
    const port = Number(portMatch[1]);
    const password = tokenMatch[1];
    return { protocol: 'https', address: '127.0.0.1', port, username: 'riot', password };
}
function getAuthFromProcessWindowsCIM() {
    try {
        const ps = 'powershell.exe';
        const cmd = "$p = Get-CimInstance Win32_Process -Filter \"Name='LeagueClientUx.exe' OR Name='LeagueClientUxRender.exe' OR Name='LeagueClient.exe' OR Name='RiotClientServices.exe'\" | Select-Object -ExpandProperty CommandLine; if ($p) { $p }";
        const buf = (0, child_process_1.execFileSync)(ps, ['-NoProfile', '-Command', cmd], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 });
        const line = buf.toString('utf8').replace(/\r/g, '').trim();
        if (!line)
            return null;
        return parseAuthFromCmdLine(line);
    }
    catch {
        return null;
    }
}
function getAuthFromProcessWindowsWMIC() {
    try {
        const buf = (0, child_process_1.execFileSync)('wmic', ['process', 'where', '(name="LeagueClientUx.exe" or name="LeagueClientUxRender.exe" or name="LeagueClient.exe" or name="RiotClientServices.exe")', 'get', 'CommandLine'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 });
        const out = buf.toString('utf8');
        const lines = out.split(/\r?\n/);
        for (const l of lines) {
            const auth = parseAuthFromCmdLine(l);
            if (auth)
                return auth;
        }
        return null;
    }
    catch {
        return null;
    }
}
function getAuthFromProcessWindowsGetProcess() {
    try {
        const ps = 'powershell.exe';
        const cmd = "Get-Process LeagueClient*,RiotClientServices* -IncludeUserName | Select-Object -ExpandProperty Path | ForEach-Object { (Get-Item $_).DirectoryName }";
        const buf = (0, child_process_1.execFileSync)(ps, ['-NoProfile', '-Command', cmd], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 });
        const dirs = buf.toString('utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        for (const dir of dirs) {
            const lockfileCandidates = [
                path_1.default.join(dir, 'lockfile'),
                path_1.default.join(dir, 'Config', 'lockfile'), // Riot Client
            ];
            for (const lf of lockfileCandidates) {
                if (fs_1.default.existsSync(lf)) {
                    const content = fs_1.default.readFileSync(lf, 'utf8');
                    const [name, pid, port, password, protocol] = content.split(':');
                    return { protocol, address: '127.0.0.1', port: Number(port), username: 'riot', password };
                }
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
function getAuthFromRiotClientInstalls() {
    try {
        const programData = process.env['ProgramData'] || 'C:/ProgramData';
        const jsonPath = path_1.default.join(programData, 'Riot Games', 'RiotClientInstalls.json');
        if (!fs_1.default.existsSync(jsonPath))
            return null;
        const raw = fs_1.default.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(raw);
        const lolPath = data['league_of_legends.live'] || data['league_of_legends'] || '';
        if (lolPath) {
            const lock = path_1.default.join(path_1.default.dirname(lolPath), 'lockfile');
            if (fs_1.default.existsSync(lock)) {
                const content = fs_1.default.readFileSync(lock, 'utf8');
                const [name, pid, port, password, protocol] = content.split(':');
                return { protocol, address: '127.0.0.1', port: Number(port), username: 'riot', password };
            }
        }
        const rcPath = data['rc_default'] || data['rc_live'] || '';
        if (rcPath) {
            const dir = path_1.default.dirname(rcPath);
            const lock = path_1.default.join(dir, 'Config', 'lockfile');
            if (fs_1.default.existsSync(lock)) {
                const content = fs_1.default.readFileSync(lock, 'utf8');
                const [name, pid, port, password, protocol] = content.split(':');
                return { protocol, address: '127.0.0.1', port: Number(port), username: 'riot', password };
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
async function lcuRequest(auth, pathName, method = 'GET', body) {
    return new Promise((resolve, reject) => {
        const opts = {
            method,
            rejectUnauthorized: false,
            host: auth.address,
            port: auth.port,
            path: pathName,
            headers: {
                Authorization: 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64'),
                'Content-Type': 'application/json',
            },
        };
        const req = https_1.default.request(opts, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(data ? JSON.parse(data) : undefined);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
        req.setTimeout(2000, () => {
            req.destroy(new Error('LCU request timeout'));
        });
        req.on('error', reject);
        if (body)
            req.write(JSON.stringify(body));
        req.end();
    });
}
async function getGameflowPhase(auth) {
    return lcuRequest(auth, '/lol-gameflow/v1/gameflow-phase');
}
async function getLobbyMembers(auth) {
    return lcuRequest(auth, '/lol-lobby/v2/lobby/members');
}
async function getLobby(auth) {
    return lcuRequest(auth, '/lol-lobby/v2/lobby');
}
async function getGameSession(auth) {
    return lcuRequest(auth, '/lol-gameflow/v1/session');
}
