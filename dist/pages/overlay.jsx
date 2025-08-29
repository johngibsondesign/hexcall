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
            const arr = Object.values(byPuuid);
            setTeammates(arr);
        });
        return () => { off && off(); };
    }, []);
    return (<div ref={containerRef} className="p-1.5 rounded-lg glass text-[11px] text-neutral-200 select-none" style={dragStyle}>
			<div className="flex gap-1.5">
				{teammates.map(tm => (<div key={tm.puuid} className="group relative flex items-center gap-1.5 px-1.5 py-1 rounded chip" style={noDragStyle}>
						<div className="w-5 h-5 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center text-[9px]">
							<RoleIcon_1.RoleIcon role={tm.role}/>
						</div>
						<div className="flex flex-col leading-tight">
							<span className="font-medium text-neutral-100 truncate max-w-[84px]">{tm.name}</span>
							<span className="text-[9px] text-neutral-400 uppercase">{tm.role || '—'}</span>
						</div>
						<div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
							<div className="pointer-events-auto bg-neutral-950/95 border border-neutral-800 rounded p-2 shadow-xl">
								<div className="flex items-center gap-2">
									<button className="px-2 py-1 rounded btn-primary">Mute</button>
									<input type="range" min={0} max={1} step={0.05} defaultValue={tm.volume ?? 1} className="w-20"/>
									<button className="px-2 py-1 rounded chip">Ping</button>
								</div>
							</div>
						</div>
					</div>))}
			</div>
		</div>);
}
