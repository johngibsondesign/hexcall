import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

type LCUAuth = { protocol: string; address: string; port: number; username: string; password: string };

function candidateLockfilePaths(): string[] {
	const candidates = new Set<string>();
	const env = process.env;
	const local = env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
	const programFiles = env['ProgramFiles'] || 'C:/Program Files';
	const programFilesX86 = env['ProgramFiles(x86)'] || 'C:/Program Files (x86)';
	const systemDrive = env['SystemDrive'] || 'C:';

	// Known locations
	candidates.add(path.join(local, 'Riot Games', 'Riot Client', 'Config', 'lockfile'));
	candidates.add(path.join(programFiles, 'Riot Games', 'League of Legends', 'lockfile'));
	candidates.add(path.join(programFilesX86, 'Riot Games', 'League of Legends', 'lockfile'));
	candidates.add(path.join(systemDrive, 'Riot Games', 'League of Legends', 'lockfile'));

	// Common extra drives
	['C:', 'D:', 'E:', 'F:'].forEach((drive) => {
		candidates.add(path.join(drive, 'Riot Games', 'League of Legends', 'lockfile'));
		candidates.add(path.join(drive, 'Program Files', 'Riot Games', 'League of Legends', 'lockfile'));
		candidates.add(path.join(drive, 'Program Files (x86)', 'Riot Games', 'League of Legends', 'lockfile'));
	});

	// macOS common paths
	candidates.add(path.join(os.homedir(), 'Library', 'Application Support', 'League of Legends', 'lockfile'));
	candidates.add('/Applications/League of Legends.app/Contents/LoL/lockfile');

	return Array.from(candidates);
}

async function tryValidateAuth(auth: LCUAuth): Promise<boolean> {
	try {
		await lcuRequest<string>(auth, '/lol-gameflow/v1/gameflow-phase');
		return true;
	} catch {
		return false;
	}
}

export function findLCUAuth(): LCUAuth | null {
	// Prefer reading command line on Windows (most reliable)
	if (process.platform === 'win32') {
		const fromCim = getAuthFromProcessWindowsCIM();
		if (fromCim) return fromCim;
		const fromWmic = getAuthFromProcessWindowsWMIC();
		if (fromWmic) return fromWmic;
		const fromGetProcess = getAuthFromProcessWindowsGetProcess();
		if (fromGetProcess) return fromGetProcess;
		const fromRiotJson = getAuthFromRiotClientInstalls();
		if (fromRiotJson) return fromRiotJson;
	}

	// Fallback to well-known lockfile paths
	const paths = candidateLockfilePaths();
	for (const p of paths) {
		try {
			if (!fs.existsSync(p)) continue;
			const content = fs.readFileSync(p, 'utf8');
			const [name, pid, port, password, protocol] = content.split(':');
			return { protocol, address: '127.0.0.1', port: Number(port), username: 'riot', password };
		} catch {}
	}
	return null;
}

function parseAuthFromCmdLine(line: string): LCUAuth | null {
	const portMatch = line.match(/--app-port=(\d+)/);
	const tokenMatch = line.match(/--remoting-auth-token=([^\s\"]+)/) || line.match(/--remoting-auth-token=\"([^\"]+)\"/);
	if (!portMatch || !tokenMatch) return null;
	const port = Number(portMatch[1]);
	const password = tokenMatch[1];
	return { protocol: 'https', address: '127.0.0.1', port, username: 'riot', password };
}

function getAuthFromProcessWindowsCIM(): LCUAuth | null {
	try {
		const ps = 'powershell.exe';
		const cmd = "$p = Get-CimInstance Win32_Process -Filter \"Name='LeagueClientUx.exe' OR Name='LeagueClientUxRender.exe' OR Name='LeagueClient.exe' OR Name='RiotClientServices.exe'\" | Select-Object -ExpandProperty CommandLine; if ($p) { $p }";
		const buf = execFileSync(ps, ['-NoProfile', '-Command', cmd], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 });
		const line = buf.toString('utf8').replace(/\r/g, '').trim();
		if (!line) return null;
		return parseAuthFromCmdLine(line);
	} catch {
		return null;
	}
}

function getAuthFromProcessWindowsWMIC(): LCUAuth | null {
	try {
		const buf = execFileSync('wmic', ['process', 'where', '(name="LeagueClientUx.exe" or name="LeagueClientUxRender.exe" or name="LeagueClient.exe" or name="RiotClientServices.exe")', 'get', 'CommandLine'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 });
		const out = buf.toString('utf8');
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

function getAuthFromProcessWindowsGetProcess(): LCUAuth | null {
	try {
		const ps = 'powershell.exe';
		const cmd = "Get-Process LeagueClient*,RiotClientServices* -IncludeUserName | Select-Object -ExpandProperty Path | ForEach-Object { (Get-Item $_).DirectoryName }";
		const buf = execFileSync(ps, ['-NoProfile', '-Command', cmd], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 });
		const dirs = buf.toString('utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
		for (const dir of dirs) {
			const lockfileCandidates = [
				path.join(dir, 'lockfile'),
				path.join(dir, 'Config', 'lockfile'), // Riot Client
			];
			for (const lf of lockfileCandidates) {
				if (fs.existsSync(lf)) {
					const content = fs.readFileSync(lf, 'utf8');
					const [name, pid, port, password, protocol] = content.split(':');
					return { protocol, address: '127.0.0.1', port: Number(port), username: 'riot', password };
				}
			}
		}
		return null;
	} catch {
		return null;
	}
}

function getAuthFromRiotClientInstalls(): LCUAuth | null {
	try {
		const programData = process.env['ProgramData'] || 'C:/ProgramData';
		const jsonPath = path.join(programData, 'Riot Games', 'RiotClientInstalls.json');
		if (!fs.existsSync(jsonPath)) return null;
		const raw = fs.readFileSync(jsonPath, 'utf8');
		const data = JSON.parse(raw) as Record<string, string>;
		const lolPath = data['league_of_legends.live'] || data['league_of_legends'] || '';
		if (lolPath) {
			const lock = path.join(path.dirname(lolPath), 'lockfile');
			if (fs.existsSync(lock)) {
				const content = fs.readFileSync(lock, 'utf8');
				const [name, pid, port, password, protocol] = content.split(':');
				return { protocol, address: '127.0.0.1', port: Number(port), username: 'riot', password };
			}
		}
		const rcPath = data['rc_default'] || data['rc_live'] || '';
		if (rcPath) {
			const dir = path.dirname(rcPath);
			const lock = path.join(dir, 'Config', 'lockfile');
			if (fs.existsSync(lock)) {
				const content = fs.readFileSync(lock, 'utf8');
				const [name, pid, port, password, protocol] = content.split(':');
				return { protocol, address: '127.0.0.1', port: Number(port), username: 'riot', password };
			}
		}
		return null;
	} catch {
		return null;
	}
}

export async function lcuRequest<T>(auth: LCUAuth, pathName: string, method: string = 'GET', body?: any): Promise<T> {
	return new Promise((resolve, reject) => {
		const opts: https.RequestOptions = {
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
		const req = https.request(opts, (res) => {
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				try {
					resolve(data ? JSON.parse(data) : (undefined as any));
				} catch (e) {
					reject(e);
				}
			});
		});
		req.setTimeout(2000, () => {
			req.destroy(new Error('LCU request timeout'));
		});
		req.on('error', reject);
		if (body) req.write(JSON.stringify(body));
		req.end();
	});
}

export async function getGameflowPhase(auth: LCUAuth) {
	return lcuRequest<string>(auth, '/lol-gameflow/v1/gameflow-phase');
}

export async function getLobbyMembers(auth: LCUAuth) {
	return lcuRequest<any[]>(auth, '/lol-lobby/v2/lobby/members');
}

export async function getLobby(auth: LCUAuth) {
	return lcuRequest<any>(auth, '/lol-lobby/v2/lobby');
}

export async function getGameSession(auth: LCUAuth) {
	return lcuRequest<any>(auth, '/lol-gameflow/v1/session');
}

export async function getCurrentSummoner(auth: LCUAuth) {
	return lcuRequest<any>(auth, '/lol-summoner/v1/current-summoner');
}


