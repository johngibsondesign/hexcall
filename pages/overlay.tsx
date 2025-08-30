import { useEffect, useMemo, useRef, useState } from 'react';
import { RoleIcon } from '../components/RoleIcon';
import { FaPhone, FaPhoneSlash, FaExclamation } from 'react-icons/fa6';
import { FaVolumeXmark as FaVolumeMute } from 'react-icons/fa6';
import { useVoice } from '../providers/VoiceProvider';

const dragStyle = { WebkitAppRegion: 'drag' } as any;
const noDragStyle = { WebkitAppRegion: 'no-drag' } as any;

type Teammate = {
	puuid: string;
	name: string;
	role?: 'top' | 'jungle' | 'mid' | 'adc' | 'support';
	iconUrl?: string;
	muted?: boolean;
	volume?: number; // 0..1
};

export default function Overlay() {
	const [teammates, setTeammates] = useState<Teammate[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);
    const champKeyToNameRef = useRef<Record<string, string>>({});

    // Connected peers filtering: VoiceProvider sets room and joins; we filter overlay to only show those in presence
    const [connectedIds, setConnectedIds] = useState<string[]>([]);
    useEffect(() => {
        const anyWindow = window as any;
        // listen to presence via a lightweight custom event from Voice layer if exposed; fallback to localStorage polling
        const handler = (e: any) => {
            if (Array.isArray(e?.detail)) setConnectedIds(e.detail);
        };
        window.addEventListener('hexcall:presence', handler as any);
        try {
            const existing = localStorage.getItem('hexcall-presence');
            if (existing) setConnectedIds(JSON.parse(existing));
        } catch {}
        return () => { window.removeEventListener('hexcall:presence', handler as any); };
    }, []);

	useEffect(() => {
		const off = window.hexcall?.onLcuUpdate?.((payload: any) => {
			// Show phase unobtrusively for debugging status
			if (payload?.phase && containerRef.current) {
				containerRef.current.dataset.phase = String(payload.phase);
			}
			const members: any[] = payload?.members || [];
			const sessionTeam: any[] = payload?.session?.gameData?.playerChampionSelections?.map?.((p: any) => p) || [];
			const phase: string = payload?.phase || '';
			const ddVer = payload?.session?.gameData?.gameDeltas?.clientVersion || payload?.session?.gameData?.gameVersion || '14.10.1';

			// fetch champion mapping once if in game and not present
			if (phase === 'InProgress' && Object.keys(champKeyToNameRef.current).length === 0) {
				fetch(`https://ddragon.leagueoflegends.com/cdn/${ddVer}/data/en_US/champion.json`).then(r => r.json()).then((data) => {
					const map: Record<string, string> = {};
					for (const name of Object.keys(data.data || {})) {
						const key = data.data[name]?.key;
						if (key) map[String(key)] = name;
					}
					champKeyToNameRef.current = map;
				}).catch(() => {});
			}
			const byPuuid: Record<string, any> = {};
			for (const m of members) {
				const puuid = m.puuid || m.summonerId || m.accountId || String(Math.random());
				byPuuid[puuid] = {
					puuid,
					name: m.summonerName || m.gameName || 'Player',
					role: (m.assignedPosition || m.position || '').toLowerCase(),
					iconUrl: phase !== 'InProgress' ? (
						m.iconUrl || (m.profileIconId ? `https://ddragon.leagueoflegends.com/cdn/${ddVer}/img/profileicon/${m.profileIconId}.png` : undefined)
					) : undefined,
					volume: 1,
				};
			}
			for (const s of sessionTeam) {
				const puuid = s?.puuid || s?.summonerId || s?.accountId;
				if (!puuid) continue;
				const role = (s?.assignedPosition || s?.position || '').toLowerCase();
				if (byPuuid[puuid]) byPuuid[puuid].role = role;
				if (phase === 'InProgress') {
					const champ = s?.championName || s?.championId;
					if (champ && byPuuid[puuid]) {
						let name = typeof champ === 'string' ? champ : undefined;
						if (!name) {
							const mapped = champKeyToNameRef.current[String(champ)] || '';
							if (mapped) name = mapped;
						}
						if (name) byPuuid[puuid].iconUrl = `https://ddragon.leagueoflegends.com/cdn/${ddVer}/img/champion/${name}.png`;
					}
				}
			}
			let arr = Object.values(byPuuid) as Teammate[];
			// filter to only connected call peers if presence known (always allow self if known)
			try {
				const presence = localStorage.getItem('hexcall-presence');
				const ids: string[] = presence ? JSON.parse(presence) : connectedIds;
				const selfId = payload?.self?.puuid || payload?.self?.summonerId || payload?.self?.accountId;
				if (ids && ids.length) {
					arr = arr.filter(t => ids.includes(t.puuid) || ids.includes(t.name) || (selfId && t.puuid === selfId));
				} else if (selfId) {
					arr = arr.filter(t => t.puuid === selfId);
				}
			} catch {}
			setTeammates(arr);
		});
		return () => { off && off(); };
	}, []);

	const hasData = teammates.length > 0;

	return (
		<div
			ref={containerRef}
			className="p-0.5 rounded-2xl glass text-[11px] text-neutral-200 select-none opacity-60 hover:opacity-100 transition-opacity inline-flex"
			style={dragStyle}
		>
			<div className="flex flex-col gap-1 items-center">
				{!hasData && (
					<div className="px-1.5 py-1 text-neutral-400">Overlay ready</div>
				)}
				{teammates.map(tm => (
					<div key={tm.puuid} className="group relative flex flex-col items-center gap-1 px-1.5 py-1 rounded chip" style={noDragStyle}>
						<div className="w-9 h-9 rounded-full bg-neutral-900 overflow-hidden flex items-center justify-center ring-1 ring-white/10 group-hover:ring-violet-500/50 transition-shadow">
							{tm.iconUrl ? (
								<img src={tm.iconUrl} alt={tm.name} className="w-full h-full object-cover" />
							) : (
								<RoleIcon role={tm.role} />
							)}
						</div>
						<div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
							<div className="pointer-events-auto bg-neutral-950/95 border border-neutral-800 rounded-lg p-2 shadow-xl flex flex-col items-center gap-2">
								<button className="w-8 h-8 rounded-full chip flex items-center justify-center" aria-label="Mute"><FaVolumeMute /></button>
								<input type="range" min={0} max={1} step={0.05} defaultValue={tm.volume ?? 1} className="w-20" />
								<button className="w-8 h-8 rounded-full chip flex items-center justify-center" aria-label="Ping"><FaExclamation /></button>
								<div className="flex gap-2">
									<button className="w-8 h-8 rounded-full chip flex items-center justify-center" aria-label="Join" onClick={() => (window as any).__hexcall_join?.()}><FaPhone /></button>
									<button className="w-8 h-8 rounded-full chip flex items-center justify-center" aria-label="Leave" onClick={() => (window as any).__hexcall_leave?.()}><FaPhoneSlash /></button>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}


