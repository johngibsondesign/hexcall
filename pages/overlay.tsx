import { useEffect, useMemo, useRef, useState } from 'react';
import { RoleIcon } from '../components/RoleIcon';
import { ChampionIcon } from '../components/ChampionIcon';
import { CompactVolumeSlider } from '../components/VolumeSlider';
import { ContextMenu, useContextMenu, ContextMenuItem } from '../components/ContextMenu';
import { FaPhone, FaPhoneSlash, FaExclamation, FaGear, FaEye, FaEyeSlash, FaPalette } from 'react-icons/fa6';
import { FaVolumeXmark as FaVolumeMute } from 'react-icons/fa6';
import { useVoice } from '../providers/VoiceProvider';
import { getOverlayTheme, loadOverlayTheme, saveOverlayTheme, overlayThemes } from '../lib/overlayThemes';
import { OverlayToastContainer, type OverlayToastData } from '../components/OverlayToast';
import { getConnectionQuality, getQualityRingClass, type ConnectionMetrics } from '../lib/connectionQuality';

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
	displayName?: string;
	displayType?: 'summoner' | 'champion';
};

export default function Overlay() {
	const [teammates, setTeammates] = useState<Teammate[]>([]);
	const [overlayVisible, setOverlayVisible] = useState(true);
	const [currentTheme, setCurrentTheme] = useState('default');
	const [gamePhase, setGamePhase] = useState<string>('Unknown');
	const [toasts, setToasts] = useState<OverlayToastData[]>([]);
	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const previousPeersRef = useRef<Set<string>>(new Set());
	const peerNamesRef = useRef<Map<string, string>>(new Map());
	const containerRef = useRef<HTMLDivElement>(null);
    const champKeyToNameRef = useRef<Record<string, string>>({});
    const { speakingUsers, isSelfSpeaking, setUserVolume, getUserVolume, connected, connectedPeers, connectionStats } = useVoice();
    
	// Show overlay when connected to a call OR when game is in progress
	const shouldShowOverlay = connected || gamePhase === 'InProgress';
    const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
    
    const theme = getOverlayTheme(currentTheme);

    // Load saved theme on mount
    useEffect(() => {
        setCurrentTheme(loadOverlayTheme());
        
        // Load notification preference
        try {
            const saved = localStorage.getItem('hexcall-in-game-notifications');
            setNotificationsEnabled(saved !== '0');
        } catch {}
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

    // Track peer changes and show join/leave notifications
    useEffect(() => {
        if (!connected || !notificationsEnabled) {
            // Clear tracking when disconnected or notifications disabled
            previousPeersRef.current.clear();
            return;
        }

        const currentPeers = new Set(connectedIds);
        const previousPeers = previousPeersRef.current;

        // Skip first time to avoid showing toasts on initial connection
        if (previousPeers.size === 0 && currentPeers.size > 0) {
            previousPeersRef.current = currentPeers;
            return;
        }

        // Detect joins
        currentPeers.forEach((peerId) => {
            if (!previousPeers.has(peerId)) {
                // New peer joined
                const peerName = peerNamesRef.current.get(peerId) || 'User';
                const toast: OverlayToastData = {
                    id: `${peerId}-${Date.now()}`,
                    type: 'join',
                    userName: peerName,
                    timestamp: Date.now()
                };
                setToasts((prev) => [...prev, toast]);
            }
        });

        // Detect leaves
        previousPeers.forEach((peerId) => {
            if (!currentPeers.has(peerId)) {
                // Peer left
                const peerName = peerNamesRef.current.get(peerId) || 'User';
                const toast: OverlayToastData = {
                    id: `${peerId}-${Date.now()}`,
                    type: 'leave',
                    userName: peerName,
                    timestamp: Date.now()
                };
                setToasts((prev) => [...prev, toast]);
            }
        });

        previousPeersRef.current = currentPeers;
    }, [connectedIds, connected, notificationsEnabled]);

    // Update peer names from presence metadata
    useEffect(() => {
        try {
            const metasJson = localStorage.getItem('hexcall-presence-metas');
            if (metasJson) {
                const metas = JSON.parse(metasJson);
                if (Array.isArray(metas)) {
                    metas.forEach((peer: any) => {
                        if (peer.id && peer.meta?.displayName) {
                            peerNamesRef.current.set(peer.id, peer.meta.displayName);
                        }
                    });
                }
            }
        } catch (error) {
            console.warn('[Overlay] Failed to load peer names:', error);
        }
    }, [connectedIds]);

    const handleDismissToast = (toastId: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
    };

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
			setGamePhase(phase);
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
			const isInGameOrPost = ['InProgress', 'EndOfGame'].includes(phase);
			
			// Build player data based on phase
			for (const m of members) {
				const puuid = m.puuid || m.summonerId || m.accountId || String(Math.random());
				const role = (m.assignedPosition || m.position || '').toLowerCase();
				const normalizedRole = role === 'bottom' ? 'adc' : role;
				
				const playerName = m.summonerName || m.gameName || 'Player';
				byPuuid[puuid] = {
					puuid,
					name: playerName,
					role: normalizedRole,
					summonerId: m.summonerId,
					accountId: m.accountId,
					profileIconId: m.profileIconId,
					// For lobby phases, show summoner icons
					iconUrl: !isInGameOrPost && m.profileIconId ? 
						`https://ddragon.leagueoflegends.com/cdn/${ddVer}/img/profileicon/${m.profileIconId}.png` : undefined,
					volume: 1,
					displayType: isInGameOrPost ? 'champion' : 'summoner',
					displayName: playerName // Default to player name, will be overridden for champions
				};
			}
			
			// Overlay champion data for in-game phases
			for (const s of sessionTeam) {
				const puuid = s?.puuid || s?.summonerId || s?.accountId;
				if (!puuid) continue;
				const role = (s?.assignedPosition || s?.position || '').toLowerCase();
				const normalizedRole = role === 'bottom' ? 'adc' : role;
				
				if (byPuuid[puuid]) {
					byPuuid[puuid].role = normalizedRole;
					byPuuid[puuid].championName = s?.championName;
					byPuuid[puuid].championId = s?.championId;
					
					// For in-game/post-game phases, show champion icons
					if (isInGameOrPost) {
						const champ = s?.championName || s?.championId;
						if (champ) {
							let champName = typeof champ === 'string' ? champ : undefined;
							if (!champName) {
								const mapped = champKeyToNameRef.current[String(champ)] || '';
								if (mapped) champName = mapped;
							}
							if (champName) {
								byPuuid[puuid].iconUrl = `https://ddragon.leagueoflegends.com/cdn/${ddVer}/img/champion/${champName}.png`;
								byPuuid[puuid].displayName = champName;
							}
						}
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

	// If we have League teammates, use them; otherwise use voice call participants
	const voiceParticipants = useMemo(() => {
		if (!connectedPeers) return [];
		return connectedPeers.map(peer => ({
			puuid: peer.id,
			name: peer.name || peer.id.slice(0, 8),
			displayName: peer.name || peer.id.slice(0, 8),
			iconUrl: peer.iconUrl,
			displayType: 'summoner' as const,
			speaking: peer.isSelf ? isSelfSpeaking : speakingUsers?.has(peer.id),
			volume: 1,
			role: 'unknown' as const,
			championName: undefined,
			championId: undefined,
			profileIconId: undefined,
			// Use global connection stats (shows local connection quality)
			connectionQuality: connectionStats?.connectionQuality || 'disconnected'
		}));
	}, [connectedPeers, isSelfSpeaking, speakingUsers, connectionStats]);

	const displayParticipants = teammates.length > 0 ? teammates : voiceParticipants;
	const hasData = displayParticipants.length > 0;

	// Enhanced teammates with speaking status and role-based sorting
	const enhancedTeammates = useMemo(() => {
		const roleOrder = ['top', 'jungle', 'mid', 'adc', 'support', 'bottom']; // bottom is alias for adc
		
		const enhanced = displayParticipants.map(tm => ({
			...tm,
			speaking: tm.speaking || speakingUsers?.has(tm.puuid || '') || speakingUsers?.has(tm.name || '') || false,
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
	}, [displayParticipants, speakingUsers]);

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

	// Don't render overlay if not in active call with others
	if (!shouldShowOverlay) {
		return null;
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
				{/* Minimal overlay: icons only */}
				{enhancedTeammates.map(tm => {
					const role = tm.role || 'unknown';
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
							
							<div className={`
								w-9 h-9 rounded-full bg-neutral-900/40 overflow-hidden flex items-center justify-center ring-1 transition-all cursor-pointer 
								${tm.speaking 
									? `ring-2 ${theme.colors.speaking} ${theme.effects.shadow} animate-pulse` 
									: `${getQualityRingClass((tm as any).connectionQuality || 'disconnected')} group-hover:${theme.colors.accent}`
								}
							`}>
								{tm.iconUrl ? (
									<img 
										src={tm.iconUrl} 
										alt={tm.displayName || tm.name || 'Player'}
										loading="lazy"
										className="w-full h-full object-cover"
										onError={(e) => {
											// Fallback to ChampionIcon on error
											const target = e.target as HTMLImageElement;
											target.style.display = 'none';
											const parent = target.parentElement;
											if (parent) {
												const fallback = document.createElement('div');
												fallback.innerHTML = `<div class="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center"><span class="text-xs text-neutral-300">${(tm.displayName || tm.name || 'P')[0].toUpperCase()}</span></div>`;
												parent.appendChild(fallback);
											}
										}}
									/>
								) : (
									<ChampionIcon
										championName={tm.championName}
										championId={tm.championId}
										profileIconId={tm.profileIconId}
										alt={tm.displayName || tm.name || 'Player'}
										role={tm.role}
										className="w-full h-full object-cover"
									/>
								)}
							</div>
							{/* Speaking indicator dot */}
							{tm.speaking && (
								<div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-neutral-900 animate-pulse" />
							)}
					</div>
					);
				})}
			</div>
			
			{/* In-Game Notifications */}
			<OverlayToastContainer toasts={toasts} onDismiss={handleDismissToast} />
			
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


