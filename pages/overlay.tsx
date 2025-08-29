import { useEffect, useRef, useState } from 'react';
import { RoleIcon } from '../components/RoleIcon';

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

	useEffect(() => {
		const off = window.hexcall?.onLcuUpdate?.((payload: any) => {
			// Show phase unobtrusively for debugging status
			if (payload?.phase && containerRef.current) {
				containerRef.current.dataset.phase = String(payload.phase);
			}
			const members: any[] = payload?.members || [];
			const sessionTeam: any[] = payload?.session?.gameData?.playerChampionSelections?.map?.((p: any) => p) || [];
			const byPuuid: Record<string, any> = {};
			for (const m of members) {
				const puuid = m.puuid || m.summonerId || m.accountId || String(Math.random());
				byPuuid[puuid] = {
					puuid,
					name: m.summonerName || m.gameName || 'Player',
					role: (m.assignedPosition || m.position || '').toLowerCase(),
					iconUrl: m.iconUrl,
					volume: 1,
				};
			}
			for (const s of sessionTeam) {
				const puuid = s?.puuid || s?.summonerId || s?.accountId;
				if (!puuid) continue;
				const role = (s?.assignedPosition || s?.position || '').toLowerCase();
				if (byPuuid[puuid]) byPuuid[puuid].role = role;
			}
			const arr = Object.values(byPuuid) as Teammate[];
			setTeammates(arr);
		});
		return () => { off && off(); };
	}, []);

	const hasData = teammates.length > 0;

	return (
		<div
			ref={containerRef}
			className="p-1.5 rounded-lg glass text-[11px] text-neutral-200 select-none min-w-[180px]"
			style={dragStyle}
		>
			<div className="flex gap-1.5">
				{!hasData && (
					<div className="px-1.5 py-1 text-neutral-400">Overlay ready — waiting for lobby…</div>
				)}
				{teammates.map(tm => (
					<div key={tm.puuid} className="group relative flex items-center gap-1.5 px-1.5 py-1 rounded chip" style={noDragStyle}>
						<div className="w-5 h-5 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center text-[9px]">
							<RoleIcon role={tm.role} />
						</div>
						<div className="flex flex-col leading-tight">
							<span className="font-medium text-neutral-100 truncate max-w-[84px]">{tm.name}</span>
							<span className="text-[9px] text-neutral-400 uppercase">{tm.role || '—'}</span>
						</div>
						<div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
							<div className="pointer-events-auto bg-neutral-950/95 border border-neutral-800 rounded p-2 shadow-xl">
								<div className="flex items-center gap-2">
									<button className="px-2 py-1 rounded btn-primary">Mute</button>
									<input type="range" min={0} max={1} step={0.05} defaultValue={tm.volume ?? 1} className="w-20" />
									<button className="px-2 py-1 rounded chip">Ping</button>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}


