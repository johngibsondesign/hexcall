import { useEffect, useMemo, useRef, useState } from 'react';
import { RoleIcon } from '../components/RoleIcon';
import { ChampionIcon } from '../components/ChampionIcon';
import { CompactVolumeSlider } from '../components/VolumeSlider';
import { ContextMenu, useContextMenu, ContextMenuItem } from '../components/ContextMenu';
import { FaPhone, FaPhoneSlash, FaExclamation, FaGear, FaEye, FaEyeSlash, FaPalette } from 'react-icons/fa6';
import { FaVolumeXmark as FaVolumeMute } from 'react-icons/fa6';
import { useVoice } from '../providers/VoiceProvider';
import { getOverlayTheme, loadOverlayTheme, saveOverlayTheme, overlayThemes } from '../lib/overlayThemes';

const dragStyle = { WebkitAppRegion: 'drag' } as any;
const noDragStyle = { WebkitAppRegion: 'no-drag' } as any;

const DEFAULT_DD_VER = '14.20.1';

type Teammate = {
	puuid?: string;
	name?: string;
	summonerName?: string;
	gameName?: string;
	championName?: string;
	championId?: number;
	profileIconId?: number;
	assignedPosition?: string;
	role?: 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'bottom';
	iconUrl?: string;
	muted?: boolean;
	volume?: number; // 0..1
	speaking?: boolean;
	summonerId?: string;
	accountId?: string;
	position?: string;
};

export default function Overlay() {
	const [teammates, setTeammates] = useState<Teammate[]>([]);
	const [overlayVisible, setOverlayVisible] = useState(true);
	const [currentTheme, setCurrentTheme] = useState('default');
	const containerRef = useRef<HTMLDivElement>(null);
    const champKeyToNameRef = useRef<Record<string, string>>({});
    const { speakingUsers, isSelfSpeaking, setUserVolume, getUserVolume } = useVoice();
    const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
    
    const theme = getOverlayTheme(currentTheme);

    // Load saved theme on mount
    useEffect(() => {
        setCurrentTheme(loadOverlayTheme());
    }, []);

    // Connected peers filtering
    const [connectedIds, setConnectedIds] = useState<string[]>([]);
    useEffect(() => {
        const handler = (e: CustomEvent<string[]>) => {
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
		const off = window.hexcall?.onLcuUpdate?.((payload: {
			phase?: string;
			members?: Teammate[];
			self?: {
				summonerId?: string;
				accountId?: string;
				puuid?: string;
			};
			session?: {
				gameData?: {
					playerChampionSelections?: Array<{
						championName?: string;
						championId?: number;
						puuid?: string;
						summonerName?: string;
						assignedPosition?: string;
						summonerId?: string;
						accountId?: string;
						position?: string;
					}>;
					gameDeltas?: { clientVersion?: string };
					gameVersion?: string;
				};
			};
		}) => {
			if (payload?.phase && containerRef.current) {
				containerRef.current.dataset.phase = String(payload.phase);
			}
			const members: Teammate[] = payload?.members || [];
			const sessionTeam = payload?.session?.gameData?.playerChampionSelections || [];
			const phase: string = payload?.phase || '';
			let ddVer = payload?.session?.gameData?.gameDeltas?.clientVersion || payload?.session?.gameData?.gameVersion || DEFAULT_DD_VER;

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
			try {
				const presence = localStorage.getItem('hexcall-presence');
				const ids: string[] = presence ? JSON.parse(presence) : connectedIds;
				const selfId = payload?.self?.puuid || payload?.self?.summonerId || payload?.self?.accountId;
				if (ids && ids.length) {
					arr = arr.filter(t => ids.includes(t.puuid || '') || ids.includes(t.name || '') || (selfId && t.puuid === selfId));
				} else if (selfId) {
					arr = arr.filter(t => t.puuid === selfId);
				}
			} catch {}
			setTeammates(arr);
		});
		return () => { off && off(); };
	}, []);

	const hasData = teammates.length > 0;

	// Enhanced teammates with speaking status and role-based sorting
	const enhancedTeammates = useMemo(() => {
		const roleOrder = ['top', 'jungle', 'mid', 'adc', 'support', 'bottom']; // bottom is alias for adc
		
		const enhanced = teammates.map(tm => ({
			...tm,
			speaking: speakingUsers?.has(tm.puuid || '') || speakingUsers?.has(tm.name || '') || false,
							normalizedRole: tm.role === 'bottom' ? 'adc' : tm.role
		}));

		// Sort by role order, with unknown roles at the end
		return enhanced.sort((a, b) => {
			const aIndex = roleOrder.indexOf(a.normalizedRole || '');
			const bIndex = roleOrder.indexOf(b.normalizedRole || '');
			
			// If both have valid roles, sort by role order
			if (aIndex !== -1 && bIndex !== -1) {
				return aIndex - bIndex;
			}
			
			// If only one has a valid role, it goes first
			if (aIndex !== -1) return -1;
			if (bIndex !== -1) return 1;
			
			// If neither has a valid role, sort by name
			return (a.name || '').localeCompare(b.name || '');
		});
	}, [teammates, speakingUsers]);

	if (!overlayVisible) {
		return (
			<div 
				className="fixed top-2 right-2 w-8 h-8 bg-neutral-900/50 rounded-full flex items-center justify-center cursor-pointer hover:bg-neutral-800/70 transition-colors"
				onClick={() => setOverlayVisible(true)}
				style={noDragStyle}
			>
				<FaEye className="w-4 h-4 text-neutral-400" />
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={`rounded-2xl select-none transition-all duration-300 ease-in-out inline-flex p-1 ${theme.colors.background} ${theme.effects.blur}`}
			style={{
				...dragStyle,
				opacity: theme.opacity.base,
				'--hover-opacity': theme.opacity.hover,
				'--hover-scale': theme.effects.scale
			} as any}
			onMouseEnter={(e) => {
				(e.currentTarget as HTMLElement).style.opacity = theme.opacity.hover.toString();
				(e.currentTarget as HTMLElement).style.transform = `scale(${theme.effects.scale})`;
			}}
			onMouseLeave={(e) => {
				(e.currentTarget as HTMLElement).style.opacity = theme.opacity.base.toString();
				(e.currentTarget as HTMLElement).style.transform = 'scale(1)';
			}}
			onContextMenu={(e) => {
				const themeMenuItems = Object.values(overlayThemes).map(t => ({
					id: `theme-${t.id}`,
					label: t.name,
					onClick: () => {
						setCurrentTheme(t.id);
						saveOverlayTheme(t.id);
					}
				}));

				const menuItems: ContextMenuItem[] = [
					{
						id: 'hide',
						label: 'Hide Overlay',
						icon: FaEyeSlash,
						onClick: () => setOverlayVisible(false)
					},
					{
						id: 'settings',
						label: 'Open Settings',
						icon: FaGear,
						onClick: () => {
							if (typeof window !== 'undefined') {
								window.open('/settings', '_blank');
							}
						}
					},
					{ separator: true, id: 'sep1', label: '', onClick: () => {} },
					{
						id: 'themes',
						label: 'Themes',
						icon: FaPalette,
						onClick: () => {} // This will be expanded into submenu items
					},
					...themeMenuItems,
					{ separator: true, id: 'sep2', label: '', onClick: () => {} },
					{
						id: 'join',
						label: 'Join Call',
						icon: FaPhone,
						onClick: () => (window as any).__hexcall_join?.()
					},
					{
						id: 'leave',
						label: 'Leave Call',
						icon: FaPhoneSlash,
						onClick: () => (window as any).__hexcall_leave?.(),
						danger: true
					}
				];
				showContextMenu(e, menuItems);
			}}
		>
			<div className="flex flex-col gap-1 items-center">
				{!hasData && (
					<div className="px-1.5 py-1 text-neutral-400 text-[10px]">Overlay ready</div>
				)}
				{enhancedTeammates.map(tm => {
					const role = tm.normalizedRole || 'unknown';
					const roleColors = {
						'top': 'bg-blue-400',
						'jungle': 'bg-green-400', 
						'mid': 'bg-yellow-400',
						'adc': 'bg-red-400',
						'support': 'bg-purple-400'
					};
					
					return (
						<div 
							key={tm.puuid} 
							className="group relative flex flex-col items-center" 
							style={noDragStyle}
							onContextMenu={(e) => {
								const menuItems: ContextMenuItem[] = [
									{
										id: 'mute',
										label: 'Mute User',
										icon: FaVolumeMute,
										onClick: () => setUserVolume?.(tm.puuid || tm.name || '', 0)
									},
									{
										id: 'volume-50',
										label: 'Set Volume 50%',
										onClick: () => setUserVolume?.(tm.puuid || tm.name || '', 0.5)
									},
									{
										id: 'volume-100',
										label: 'Set Volume 100%',
										onClick: () => setUserVolume?.(tm.puuid || tm.name || '', 1.0)
									},
									{ separator: true, id: 'sep1', label: '', onClick: () => {} },
									{
										id: 'ping',
										label: 'Ping User',
										icon: FaExclamation,
										onClick: () => console.log('Ping user:', tm.name)
									}
								];
								showContextMenu(e, menuItems);
							}}
						>
							{/* Role indicator dot */}
							{role !== 'unknown' && (
								<div className={`absolute -top-1 -left-1 w-2 h-2 ${roleColors[role as keyof typeof roleColors] || 'bg-neutral-400'} rounded-full border border-neutral-900 z-10`} />
							)}
							
							<div className={`w-9 h-9 rounded-full bg-neutral-900/40 overflow-hidden flex items-center justify-center ring-1 transition-all cursor-pointer ${
								tm.speaking 
									? `ring-2 ${theme.colors.speaking} ${theme.effects.shadow} animate-pulse` 
									: `${theme.colors.border} group-hover:${theme.colors.accent}`
							}`}>
								<ChampionIcon
									championName={tm.championName}
									championId={tm.championId}
									profileIconId={tm.profileIconId}
									alt={tm.name || 'Player'}
									role={tm.role}
									className="w-full h-full object-cover"
								/>
							</div>
							{/* Speaking indicator dot */}
							{tm.speaking && (
								<div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-neutral-900 animate-pulse" />
							)}
							
													<div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
								<div className="pointer-events-auto bg-neutral-950/80 backdrop-blur-sm border border-neutral-800/60 rounded-xl p-3 shadow-xl flex flex-col items-center gap-3 min-w-[140px]">
									<div className="text-xs text-white font-medium text-center truncate max-w-[120px]">
										{tm.name}
									</div>
									
									<CompactVolumeSlider
										userId={tm.puuid || tm.name || ''}
										initialVolume={getUserVolume?.(tm.puuid || tm.name || '') ?? 1.0}
										onVolumeChange={(userId, volume) => setUserVolume?.(userId, volume)}
									/>
									
									<div className="flex gap-2">
										<button 
											className="w-7 h-7 rounded-full chip flex items-center justify-center hover:bg-red-500/20" 
											aria-label="Mute user"
											onClick={() => setUserVolume?.(tm.puuid || tm.name || '', 0)}
										>
											<FaVolumeMute className="w-3 h-3" />
										</button>
										<button 
											className="w-7 h-7 rounded-full chip flex items-center justify-center hover:bg-yellow-500/20" 
											aria-label="Ping"
										>
											<FaExclamation className="w-3 h-3" />
										</button>
									</div>
									
									<div className="flex gap-2">
										<button 
											className="w-7 h-7 rounded-full chip flex items-center justify-center hover:bg-green-500/20" 
											aria-label="Join" 
											onClick={() => (window as any).__hexcall_join?.()}
										>
											<FaPhone className="w-3 h-3" />
										</button>
										<button 
											className="w-7 h-7 rounded-full chip flex items-center justify-center hover:bg-red-500/20" 
											aria-label="Leave" 
											onClick={() => (window as any).__hexcall_leave?.()}
										>
											<FaPhoneSlash className="w-3 h-3" />
										</button>
									</div>
								</div>
							</div>
					</div>
					);
				})}
			</div>
			
			{/* Context Menu */}
			<ContextMenu
				visible={contextMenu.visible}
				x={contextMenu.x}
				y={contextMenu.y}
				items={contextMenu.items}
				onClose={hideContextMenu}
			/>
		</div>
	);
}


