"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Overlay;
const react_1 = require("react");
const RoleIcon_1 = require("../components/RoleIcon");
const dragStyle = { WebkitAppRegion: 'drag' };
const noDragStyle = { WebkitAppRegion: 'no-drag' };
function Overlay() {
    const [teammates, setTeammates] = (0, react_1.useState)([]);
    const containerRef = (0, react_1.useRef)(null);
    // Connected peers filtering: VoiceProvider sets room and joins; we filter overlay to only show those in presence
    const [connectedIds, setConnectedIds] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const anyWindow = window;
        // listen to presence via a lightweight custom event from Voice layer if exposed; fallback to localStorage polling
        const handler = (e) => {
            if (Array.isArray(e?.detail))
                setConnectedIds(e.detail);
        };
        window.addEventListener('hexcall:presence', handler);
        try {
            const existing = localStorage.getItem('hexcall-presence');
            if (existing)
                setConnectedIds(JSON.parse(existing));
        }
        catch { }
        return () => { window.removeEventListener('hexcall:presence', handler); };
    }, []);
    (0, react_1.useEffect)(() => {
        const off = window.hexcall?.onLcuUpdate?.((payload) => {
            // Show phase unobtrusively for debugging status
            if (payload?.phase && containerRef.current) {
                containerRef.current.dataset.phase = String(payload.phase);
            }
            const members = payload?.members || [];
            const sessionTeam = payload?.session?.gameData?.playerChampionSelections?.map?.((p) => p) || [];
            const byPuuid = {};
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
                if (!puuid)
                    continue;
                const role = (s?.assignedPosition || s?.position || '').toLowerCase();
                if (byPuuid[puuid])
                    byPuuid[puuid].role = role;
            }
            let arr = Object.values(byPuuid);
            // filter to only connected call peers if presence known
            try {
                const presence = localStorage.getItem('hexcall-presence');
                const ids = presence ? JSON.parse(presence) : connectedIds;
                if (ids && ids.length) {
                    arr = arr.filter(t => ids.includes(t.puuid) || ids.includes(t.name));
                }
            }
            catch { }
            setTeammates(arr);
        });
        return () => { off && off(); };
    }, []);
    const hasData = teammates.length > 0;
    return (<div ref={containerRef} className="p-1.5 rounded-lg glass text-[11px] text-neutral-200 select-none min-w-[180px] opacity-70 hover:opacity-100 transition-opacity" style={dragStyle}>
			<div className="flex gap-1.5">
				{!hasData && (<div className="px-1.5 py-1 text-neutral-400">Overlay ready — waiting for lobby…</div>)}
				{teammates.map(tm => (<div key={tm.puuid} className="group relative flex items-center gap-1.5 px-1.5 py-1 rounded chip" style={noDragStyle}>
						<div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center ring-1 ring-white/10 group-hover:ring-violet-500/50 transition-shadow">
							<RoleIcon_1.RoleIcon role={tm.role}/>
						</div>
						<div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
							<div className="pointer-events-auto bg-neutral-950/95 border border-neutral-800 rounded p-2 shadow-xl">
								<div className="flex items-center gap-2">
									<button className="w-7 h-7 rounded-full chip" aria-label="Mute">🔇</button>
									<input type="range" min={0} max={1} step={0.05} defaultValue={tm.volume ?? 1} className="w-20"/>
									<button className="w-7 h-7 rounded-full chip" aria-label="Ping">📍</button>
								</div>
							</div>
						</div>
					</div>))}
			</div>
		</div>);
}
