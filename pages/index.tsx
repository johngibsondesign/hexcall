import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useVoice } from '../providers/VoiceProvider';
import { 
	FaPhone, 
	FaPhoneSlash, 
	FaMicrophone, 
	FaMicrophoneSlash, 
	FaGear, 
	FaGamepad, 
	FaUsers,
	FaCopy,
	FaPlus,
	FaQuestion,
	FaVolumeHigh,
	FaVolumeLow,
	FaVolumeXmark,
	FaBan,
	FaUserXmark,
	FaClock,
	FaRotateRight
} from 'react-icons/fa6';
import { RoleIcon } from '../components/RoleIcon';
import { ChampionIconWithPreview } from '../components/ChampionIcon';
import { VolumeSlider } from '../components/VolumeSlider';
import { ConnectionQualityIndicator } from '../components/ConnectionQualityIndicator';
import { DebugInfo } from '../components/DebugInfo';
import { ToastContainer, useToast } from '../components/Toast';
import { playSound } from '../lib/sounds';
import { OnboardingWizard } from '../components/OnboardingWizard';
import { VoiceControlPanel } from '../components/VoiceControlPanel';
import { SetupStatusCard } from '../components/SetupStatusCard';
import { QuickStartGuide } from '../components/QuickStartGuide';
import { HoverVolumeControl } from '../components/HoverVolumeControl';
import { getCallHistory, formatDuration, formatTimestamp, type CallHistoryEntry } from '../lib/callHistory';
import { getConnectionQuality, getQualityRingClass, getQualityLabel, getQualityDescription, type ConnectionMetrics } from '../lib/connectionQuality';

interface Teammate {
	summonerName?: string;
	gameName?: string;
	name?: string;
	puuid?: string;
	summonerId?: string;
	championName?: string;
	championId?: number;
	profileIconId?: number;
	assignedPosition?: string;
	role?: string;
}

export default function Home() {
	const { 
		joinedRoomId, 
		connected, 
		joinCall, 
		leaveCall, 
		muted, 
		setMuted, 
		speakingUsers, 
		isSelfSpeaking, 
		userCode, 
		joinByCode, 
		createManualCall, 
		setUserVolume, 
		getUserVolume, 
		connectionStats,
		connectedPeers,
		isHost,
		banUser,
		kickUser
	} = useVoice();
	const [gameState, setGameState] = useState<string>('Waiting for League...');
	const [teammates, setTeammates] = useState<Teammate[]>([]);
	const [gamePhase, setGamePhase] = useState<string>('Unknown');
	const [showJoinModal, setShowJoinModal] = useState(false);
	const [joinCode, setJoinCode] = useState('');
	const [isJoining, setIsJoining] = useState(false);
	const [pushToTalkEnabled, setPushToTalkEnabled] = useState(false);
	const [pushToTalkKey, setPushToTalkKey] = useState('CapsLock');
	const [showDebug, setShowDebug] = useState(false);
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
	const [showQuickStart, setShowQuickStart] = useState(false);
	const [participantJoinTimes, setParticipantJoinTimes] = useState<Record<string, number>>({});
	const [availableLeagueCall, setAvailableLeagueCall] = useState<{roomId: string; memberCount: number} | null>(null);
	const [showCallSwitchModal, setShowCallSwitchModal] = useState(false);
	const [switchCountdown, setSwitchCountdown] = useState(10);
	const [deafened, setDeafened] = useState(false);
	const [masterVolume, setMasterVolume] = useState(1.0);
	const [microphoneGain, setMicrophoneGain] = useState(1.0);
	const [autoJoinEnabled, setAutoJoinEnabled] = useState(true);
	const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);
	const { toasts, showInfo, showSuccess, showError, removeToast } = useToast();
	const lastVoiceStateRef = useRef<string>('');

	// Load push-to-talk settings and check onboarding
	useEffect(() => {
		try {
			const savedPTT = localStorage.getItem('hexcall-push-to-talk');
			if (savedPTT) {
				const pttSettings = JSON.parse(savedPTT);
				setPushToTalkEnabled(pttSettings.enabled || false);
				setPushToTalkKey(pttSettings.key || 'CapsLock');
			}
			
			// Load volume settings
			const savedVolume = localStorage.getItem('hexcall-volume-settings');
			if (savedVolume) {
				const volumeSettings = JSON.parse(savedVolume);
				setMasterVolume(volumeSettings.masterVolume ?? 1.0);
				setMicrophoneGain(volumeSettings.microphoneGain ?? 1.0);
				setDeafened(volumeSettings.deafened ?? false);
			}

			// Load auto-join setting
			const autoJoin = localStorage.getItem('hexcall-auto-join');
			setAutoJoinEnabled(autoJoin !== '0'); // Default to enabled unless explicitly disabled
			
			// Load call history
			setCallHistory(getCallHistory());
			
			// Check if user has seen onboarding
			const seenOnboarding = localStorage.getItem('hexcall-onboarding-seen');
			if (!seenOnboarding) {
				setShowOnboarding(true);
			} else {
				setHasSeenOnboarding(true);
			}
		} catch {}
	}, []);

	// Save volume settings when they change
	useEffect(() => {
		try {
			const volumeSettings = {
				masterVolume,
				microphoneGain,
				deafened
			};
			localStorage.setItem('hexcall-volume-settings', JSON.stringify(volumeSettings));
		} catch {}
	}, [masterVolume, microphoneGain, deafened]);

	useEffect(() => {
		const off = window.hexcall?.onLcuUpdate?.((payload: {
			phase?: string;
			members?: Teammate[];
			session?: {
				gameData?: {
					playerChampionSelections?: Array<{
						championName?: string;
						championId?: number;
						puuid?: string;
						summonerName?: string;
					}>;
				};
			};
		}) => {
			const phase = typeof payload?.phase === 'string' ? payload.phase : 'Unknown';
			setGamePhase(phase);
			
			// Set user-friendly game state
			const stateMap: Record<string, string> = {
				'Lobby': 'In Lobby',
				'Matchmaking': 'Finding Match...',
				'ReadyCheck': 'Match Ready!',
				'ChampSelect': 'Champion Select',
				'InProgress': 'In Game',
				'EndOfGame': 'Game Complete',
				'NotFound': 'League Not Running',
				'Unknown': 'Connecting...'
			};
			setGameState(stateMap[phase] || phase);
			
										// Update teammates with role-based sorting
							const members = payload?.members || [];
							const roleOrder = ['top', 'jungle', 'mid', 'adc', 'support', 'bottom'];
							
							const sortedMembers = members
								.map(tm => ({
									...tm,
									normalizedRole: tm.assignedPosition === 'bottom' ? 'adc' : tm.assignedPosition?.toLowerCase()
								}))
								.sort((a, b) => {
									const aIndex = roleOrder.indexOf(a.normalizedRole || '');
									const bIndex = roleOrder.indexOf(b.normalizedRole || '');
									
									if (aIndex !== -1 && bIndex !== -1) {
										return aIndex - bIndex;
									}
									if (aIndex !== -1) return -1;
									if (bIndex !== -1) return 1;
									return (a.summonerName || a.gameName || '').localeCompare(b.summonerName || b.gameName || '');
								});
								
			setTeammates(sortedMembers.slice(0, 5));

			// Check if League game call is available while in manual call
			const isInManualCall = joinedRoomId?.startsWith('manual-');
			const allowedPhases = ['Matchmaking', 'ReadyCheck', 'ChampSelect', 'InProgress', 'Lobby'];
			
			if (isInManualCall && allowedPhases.includes(phase) && members.length >= 2) {
				// Derive what the League room ID would be
				const leagueRoomId = members.map(m => m.puuid || m.summonerId || '').filter(Boolean).sort().join('-').slice(0, 32);
				
				if (leagueRoomId && leagueRoomId !== joinedRoomId) {
					setAvailableLeagueCall({
						roomId: leagueRoomId,
						memberCount: members.length
					});
					
					// Show notification modal
					if (!showCallSwitchModal) {
						setShowCallSwitchModal(true);
						setSwitchCountdown(10);
					}
				}
			} else if (!isInManualCall && allowedPhases.includes(phase) && members.length >= 2 && !connected) {
				// Show rejoin option for League calls when not connected and not in manual call
				const leagueRoomId = members.map(m => m.puuid || m.summonerId || '').filter(Boolean).sort().join('-').slice(0, 32);
				
				if (leagueRoomId) {
					setAvailableLeagueCall({
						roomId: leagueRoomId,
						memberCount: members.length
					});
				} else {
					setAvailableLeagueCall(null);
				}
			} else {
				// Clear available League call if conditions not met
				setAvailableLeagueCall(null);
			}
		});
		return () => { off && off(); };
	}, [showCallSwitchModal, connected]);

	const inLobbyOrGame = useMemo(() => {
		const phase = typeof gamePhase === 'string' ? gamePhase : '';
		return ['Matchmaking','ReadyCheck','ChampSelect','Lobby','InProgress'].includes(phase);
	}, [gamePhase]);

	// Track participant join times
	useEffect(() => {
		if (!connectedPeers) return;
		
		const currentTime = Date.now();
		const currentPeerIds = new Set(connectedPeers.map(p => p.id));
		
		setParticipantJoinTimes(prev => {
			const updated = { ...prev };
			
			// Add join times for new participants
			connectedPeers.forEach(peer => {
				if (!updated[peer.id]) {
					updated[peer.id] = currentTime;
				}
			});
			
			// Remove times for participants who left
			Object.keys(updated).forEach(peerId => {
				if (!currentPeerIds.has(peerId)) {
					delete updated[peerId];
				}
			});
			
			return updated;
		});
	}, [connectedPeers]);

	// Update call durations every 30 seconds
	useEffect(() => {
		if (!connected || !connectedPeers?.length) return;
		
		const interval = setInterval(() => {
			// Force re-render to update durations
			setParticipantJoinTimes(prev => ({ ...prev }));
		}, 30000);
		
		return () => clearInterval(interval);
	}, [connected, connectedPeers?.length]);

	// Handle call switch modal countdown
	useEffect(() => {
		if (!showCallSwitchModal) return;
		
		if (switchCountdown <= 0) {
			// Auto-dismiss and stay in current call
			setShowCallSwitchModal(false);
			setSwitchCountdown(10);
			return;
		}
		
		const timer = setTimeout(() => {
			setSwitchCountdown(prev => prev - 1);
		}, 1000);
		
		return () => clearTimeout(timer);
	}, [showCallSwitchModal, switchCountdown]);

	const getGameStateColor = (state: string) => {
		const safeState = typeof state === 'string' ? state : '';
		if (safeState.includes('Finding') || safeState.includes('Connecting')) return 'text-yellow-400';
		if (safeState.includes('Ready') || safeState.includes('Game')) return 'text-green-400';
		if (safeState.includes('Not Running')) return 'text-red-400';
		return 'text-blue-400';
	};

	const formatCallDuration = (joinTime: number): string => {
		const now = Date.now();
		const duration = Math.floor((now - joinTime) / 1000);
		
		if (duration < 60) return `${duration}s`;
		
		const minutes = Math.floor(duration / 60);
		if (minutes < 60) return `${minutes}m`;
		
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		return `${hours}h ${remainingMinutes}m`;
	};

	const copyUserCode = async () => {
		try {
			await navigator.clipboard.writeText(userCode || '');
			// Could show a toast here
		} catch (error) {
			console.error('Failed to copy code:', error);
		}
	};

	const handleCreateManualCall = async () => {
		try {
			const code = await createManualCall?.();
			// Auto-join will handle the connection
		} catch (error) {
			console.error('Failed to create manual call:', error);
		}
	};

	const handleJoinByCode = async () => {
		if (!joinCode.trim()) return;
		
		setIsJoining(true);
		try {
			await joinByCode?.(joinCode.trim());
			// Auto-join will handle the connection
			setShowJoinModal(false);
			setJoinCode('');
		} catch (error) {
			console.error('Failed to join by code:', error);
			// Could show error toast here
		} finally {
			setIsJoining(false);
		}
	};

	const handleRejoinCall = async (entry: CallHistoryEntry) => {
		try {
			if (entry.type === 'manual' && entry.code) {
				await joinByCode?.(entry.code);
			}
			// League calls rejoin automatically when game starts
		} catch (error) {
			console.error('Failed to rejoin call:', error);
			showError('Failed to rejoin', 'Call might no longer exist');
		}
	};

	const handleOnboardingComplete = () => {
		setShowOnboarding(false);
		setHasSeenOnboarding(true);
		localStorage.setItem('hexcall-onboarding-seen', 'true');
	};

	const handleOnboardingSkip = () => {
		setShowOnboarding(false);
		setHasSeenOnboarding(true);
		localStorage.setItem('hexcall-onboarding-seen', 'true');
	};

	const handleJoinLeagueCall = async () => {
		setShowCallSwitchModal(false);
		setSwitchCountdown(10);
		
		// Leave current manual call and join League call
		try {
			if (joinedRoomId?.startsWith('manual-')) {
				// If in manual call, leave it first
				await leaveCall?.();
				// Ensure join happens reliably
				await new Promise(r => setTimeout(r, 200));
				await joinCall?.(true);
			} else {
				// If not connected, directly join the League call
				await joinCall?.(true);
			}
		} catch (error) {
			console.error('Failed to switch to League call:', error);
		}
	};

	const handleStayInManualCall = () => {
		setShowCallSwitchModal(false);
		setSwitchCountdown(10);
		// Just close the modal, stay in current call
	};

	const handleDeafenToggle = () => {
		const newDeafened = !deafened;
		setDeafened(newDeafened);
		
		// When deafening, also mute microphone
		if (newDeafened) {
			setMuted?.(true);
		}
		
		// Apply/restore volume to all peers immediately
		if (connectedPeers) {
			connectedPeers.forEach(peer => {
				if (!peer.isSelf) {
					setUserVolume?.(peer.id, newDeafened ? 0 : masterVolume);
				}
			});
		}
	};

	const handleMasterVolumeChange = (volume: number) => {
		setMasterVolume(volume);
		// Apply to all connected peers
		if (connectedPeers) {
			connectedPeers.forEach(peer => {
				if (!peer.isSelf) {
					setUserVolume?.(peer.id, volume);
				}
			});
		}
	};

	const handleMicrophoneGainChange = (gain: number) => {
		setMicrophoneGain(gain);
		// This would need to be implemented in the voice provider
		// For now, we'll just store the value
	};

	// Apply deafen state to all peers when deafened or when peers change
	useEffect(() => {
		if (!connectedPeers || !setUserVolume) return;
		
		connectedPeers.forEach(peer => {
			if (!peer.isSelf) {
				const targetVolume = deafened ? 0 : masterVolume;
				setUserVolume(peer.id, targetVolume);
			}
		});
	}, [connectedPeers, deafened, masterVolume, setUserVolume]);

	// Voice connection state notifications
	useEffect(() => {
		const handler = (e: any) => {
			const state = e?.detail as string;
			const prev = lastVoiceStateRef.current;
			lastVoiceStateRef.current = state;
			if (state === 'connecting') {
				// Only show "Reconnecting" if we were previously connected/failed (not on initial join)
				if (prev === 'connected' || prev === 'failed' || prev === 'disconnected') {
					showInfo('Reconnecting…');
					try { playSound('reconnect'); } catch {}
				}
			} else if (state === 'connected') {
				// Only show "Reconnected" if this is actually a reconnection (not initial join)
				if (prev === 'failed' || prev === 'disconnected') {
					showSuccess('Reconnected');
				}
				// Don't show any toast on initial connection (prev === undefined or 'connecting')
			} else if (state === 'failed' || state === 'disconnected') {
				showError('Connection lost', 'Attempting to reconnect…');
				try { playSound('reconnect_failed'); } catch {}
				// Refresh call history when disconnecting
				setCallHistory(getCallHistory());
			}
		};
		window.addEventListener('hexcall:voice-state', handler as any);
		return () => window.removeEventListener('hexcall:voice-state', handler as any);
	}, [showInfo, showSuccess, showError]);

	return (
		<div className={`bg-hextech flex flex-col h-full ${connected && joinedRoomId ? 'pb-16' : ''}`}>
			<Head>
				<title>Hexcall - League Voice Chat</title>
			</Head>
			
			{/* Header */}
			<header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
				<div className="flex items-center gap-6">
					<div className="flex items-center gap-3">
				<h1 className="text-xl font-semibold text-gradient">Hexcall</h1>
						<div className="flex items-center gap-2 text-sm">
							<FaGamepad className="text-neutral-400" />
							<span className={getGameStateColor(gameState)}>{gameState}</span>
						</div>
					</div>
					
					{/* User Code Display */}
					<div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/50 rounded-lg border border-white/10">
						<span className="text-xs text-neutral-400">Your Code:</span>
						<button 
							onClick={copyUserCode}
							className="flex items-center gap-2 text-sm font-mono font-bold text-white hover:text-violet-400 transition-colors"
							title="Click to copy"
						>
							{userCode}
							<FaCopy className="w-3 h-3" />
						</button>
					</div>
				</div>
				
				<div className="flex items-center gap-2">
					{/* League Call Available Indicator */}
					{availableLeagueCall && joinedRoomId?.startsWith('manual-') && (
						<button
							onClick={handleJoinLeagueCall}
							className="px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors flex items-center gap-2 text-sm"
							title="League game call available"
						>
							<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
							<span>League Call ({availableLeagueCall.memberCount})</span>
						</button>
					)}
					
					<button
						onClick={() => setShowQuickStart(true)}
						className="p-2 rounded-lg hover:bg-white/10 transition-colors"
						title="Quick Start Guide"
					>
						<FaQuestion className="w-5 h-5 text-neutral-400" />
					</button>
					<Link href="/settings" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
						<FaGear className="w-5 h-5 text-neutral-400" />
					</Link>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1 flex flex-col">
				{connected && joinedRoomId ? (
					/* Active Call Interface */
					<div className="flex-1 p-6">
						<div className="max-w-6xl mx-auto">
							{/* Section Header */}
							<div className="flex items-center justify-between mb-6">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
										<FaUsers className="w-4 h-4 text-white" />
									</div>
								<div>
										<h3 className="text-lg font-semibold text-white">Voice Chat</h3>
										<p className="text-sm text-neutral-400">{(connectedPeers || []).length} participants connected</p>
									</div>
								</div>
								<div className="flex items-center gap-2 text-sm text-neutral-400">
										<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
									<span>Active call</span>
								</div>
							</div>

							{/* Participants Grid */}
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
								{(connectedPeers || []).map((peer, idx) => {
									const isSpeaking = peer.isSelf ? isSelfSpeaking : speakingUsers?.has(peer.id);
									const isYou = peer.isSelf;
									const isMutedSelf = isYou && muted;
									const joinTime = participantJoinTimes[peer.id];
									
									// Format display name
									const displayName = peer.riotId || peer.name || peer.id.slice(0, 8);
									
									// Use global connection quality (shows local connection quality)
									const connectionQuality = connectionStats?.connectionQuality || 'disconnected';
									const qualityRingClass = getQualityRingClass(connectionQuality);
									const qualityLabel = getQualityLabel(connectionQuality);
									const qualityDescription = getQualityDescription(connectionStats as ConnectionMetrics);
									
									return (
										<div key={peer.id} className="participant-card group relative">
											{/* Main Card */}
											<div className={`
												bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 backdrop-blur-sm
												border border-neutral-700/50 rounded-2xl p-4 h-full
												transition-all duration-200
												${isYou ? 'ring-1 ring-violet-500/30 bg-gradient-to-br from-violet-900/20 to-neutral-900/50' : ''}
												${isSpeaking ? 'ring-2 ring-green-400/50 shadow-lg shadow-green-400/10' : ''}
												${isMutedSelf ? 'ring-2 ring-red-400/50 shadow-lg shadow-red-400/10' : ''}
											`}>
												{/* Avatar */}
												<div className="flex justify-center mb-3">
													<div 
														className={`
															relative w-16 h-16 rounded-xl overflow-hidden
															transition-all duration-200
															ring-2
															${isMutedSelf ? 'ring-red-400/50' : ''}
															${isSpeaking && !isMutedSelf ? 'ring-green-400/50' : ''}
															${!isSpeaking && !isMutedSelf ? qualityRingClass : ''}
														`}
														title={!isSpeaking && !isMutedSelf ? `${qualityLabel} - ${qualityDescription}` : undefined}
													>
														{peer.iconUrl ? (
															<img 
																src={peer.iconUrl} 
																alt={displayName} 
																loading="lazy"
																className="w-full h-full object-cover"
																onError={(e) => {
																	const target = e.target as HTMLImageElement;
																	target.style.display = 'none';
																	const fallback = target.nextElementSibling as HTMLElement;
																	if (fallback) fallback.style.display = 'flex';
																}}
															/>
														) : null}
														<div className={`
															w-full h-full bg-gradient-to-br from-neutral-600 to-neutral-700 
															flex items-center justify-center
															${peer.iconUrl ? 'hidden' : 'flex'}
														`}>
															<FaUsers className="w-6 h-6 text-neutral-300" />
														</div>
														
														{/* Speaking/Status Indicator */}
														{isMutedSelf && (
															<div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
																<FaMicrophoneSlash className="w-5 h-5 text-red-400" />
															</div>
														)}
														{isSpeaking && !isMutedSelf && (
															<div className="absolute bottom-1 right-1">
																<div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
															</div>
														)}
													</div>
												</div>

												{/* User Info */}
												<div className="text-center space-y-2">
													{/* Name */}
													<div className="font-semibold text-white text-sm truncate">
														{displayName}
														{isYou && <span className="text-violet-400 ml-1 font-normal text-xs">(You)</span>}
													</div>
													
													{/* Connection Duration */}
													<div className="text-xs text-neutral-500">
														{joinTime ? formatCallDuration(joinTime) : '0s'}
													</div>

													{/* Volume Control - Always visible for non-self peers */}
													{!isYou && (
														<div className="pt-2 space-y-2">
															<VolumeSlider
																userId={peer.id}
																initialVolume={getUserVolume?.(peer.id) ?? 1.0}
																onVolumeChange={(userId, volume) => setUserVolume?.(userId, volume)}
																size="sm"
															/>
															
															{/* Host Controls - Show only for manual calls when user is host */}
															{isHost && joinedRoomId?.startsWith('manual-') && (
																<div className="flex gap-1">
																	<button
																		onClick={(e) => {
																			e.stopPropagation();
																			if (confirm(`Kick ${displayName}?`)) {
																				kickUser?.(peer.id);
																			}
																		}}
																		className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 text-xs rounded-lg transition-colors"
																		title="Kick"
																	>
																		<FaUserXmark className="w-3 h-3" />
																	</button>
																	<button
																		onClick={(e) => {
																			e.stopPropagation();
																			if (confirm(`Ban ${displayName}? They can't rejoin.`)) {
																				banUser?.(peer.id);
																			}
																		}}
																		className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded-lg transition-colors"
																		title="Ban"
																	>
																		<FaBan className="w-3 h-3" />
																	</button>
																</div>
															)}
														</div>
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>

							{/* Empty State */}
							{(!connectedPeers || connectedPeers.length === 0) && (
								<div className="text-center py-12">
									<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
										<FaUsers className="w-8 h-8 text-neutral-400" />
						</div>
									<h4 className="text-lg font-medium text-white mb-2">No participants yet</h4>
									<p className="text-neutral-400">Waiting for others to join the call...</p>
					</div>
							)}
						</div>
					</div>
				) : (
					/* Split Homepage Layout */
					<div className="flex-1 flex">
						{/* Left Half - Manual Calls */}
						<div className="flex-1 flex items-center justify-center border-r border-white/10">
							<div className="text-center max-w-sm mx-auto px-6 py-12">
								<div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
									<FaPlus className="w-8 h-8 text-white" />
								</div>
								<h2 className="text-xl font-bold text-white mb-3">Manual Calls</h2>
								<p className="text-neutral-400 text-sm mb-6">Create or join a call with friends using a code</p>
								
								<div className="space-y-3 mb-6">
									<button
										onClick={handleCreateManualCall}
										className="w-full btn-primary px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-3 hover:scale-105 transition-transform"
									>
										<FaPlus className="w-4 h-4" />
										Start Manual Call
									</button>
									
									<button
										onClick={() => setShowJoinModal(true)}
										className="w-full px-6 py-3 rounded-xl chip hover:bg-white/10 border border-white/10 font-semibold flex items-center justify-center gap-3 transition-all"
									>
										<FaPhone className="w-4 h-4" />
										Join by Code
									</button>
								</div>

								{/* Call History */}
								{callHistory.length > 0 && (
									<div className="mt-6 pt-6 border-t border-white/10">
										<div className="flex items-center gap-2 mb-3">
											<FaClock className="w-3 h-3 text-neutral-400" />
											<h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Recent Calls</h3>
										</div>
										<div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
											{callHistory.slice(0, 5).map((entry) => (
												<div
													key={entry.id + entry.startTime}
													className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
												>
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2">
															<span className="text-xs font-medium text-white truncate">
																{entry.type === 'manual' ? `Code: ${entry.code}` : 'League Call'}
															</span>
															{entry.type === 'league' && (
																<FaGamepad className="w-3 h-3 text-yellow-400 flex-shrink-0" />
															)}
														</div>
														<div className="flex items-center gap-2 mt-0.5">
															<span className="text-xs text-neutral-500">{formatTimestamp(entry.startTime)}</span>
															{entry.duration && (
																<>
																	<span className="text-neutral-600">•</span>
																	<span className="text-xs text-neutral-500">{formatDuration(entry.duration)}</span>
																</>
															)}
														</div>
													</div>
													{entry.type === 'manual' && entry.code && !entry.endTime && (
														<button
															onClick={() => handleRejoinCall(entry)}
															className="ml-2 p-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity"
															title="Rejoin call"
														>
															<FaRotateRight className="w-3 h-3" />
														</button>
													)}
												</div>
											))}
										</div>
									</div>
								)}

								<div className="text-xs text-neutral-500">
									Share your code with friends to connect
								</div>
							</div>
						</div>

						{/* Right Half - League Calls */}
						<div className="flex-1 flex items-center justify-center">
							<div className="text-center max-w-sm mx-auto px-6 py-12">
								{gamePhase === 'InProgress' && !connected && !joinedRoomId?.startsWith('manual-') ? (
									/* In-Game but Not Connected - Show Rejoin */
									<>
										<div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
											<FaGamepad className="w-8 h-8 text-white" />
										</div>
										<h2 className="text-xl font-bold text-white mb-3">Game In Progress</h2>
										<p className="text-neutral-400 text-sm mb-6">
											You're currently in a game. Join voice chat with your team!
										</p>
										
										<button
											onClick={() => joinCall?.(true)}
											className="w-full btn-primary px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-3 hover:scale-105 transition-transform mb-4"
										>
											<FaPhone className="w-4 h-4" />
											Join Voice Chat
										</button>

										<div className="text-xs text-neutral-500">
											Reconnect to your teammates
										</div>
									</>
								) : availableLeagueCall && !autoJoinEnabled ? (
									/* Active League Call Available */
									<>
										<div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
											<FaGamepad className="w-8 h-8 text-white" />
										</div>
										<h2 className="text-xl font-bold text-white mb-3">League Call Active</h2>
										<p className="text-neutral-400 text-sm mb-6">
											{availableLeagueCall.memberCount} teammates are waiting in voice chat
										</p>
										
										<button
											onClick={handleJoinLeagueCall}
											className="w-full btn-primary px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-3 hover:scale-105 transition-transform mb-4"
										>
											<FaGamepad className="w-4 h-4" />
											Join League Call
										</button>

										<div className="text-xs text-neutral-500">
											Auto-join is disabled in settings
										</div>
									</>
								) : inLobbyOrGame ? (
									/* Ready to Join League */
									<>
										<div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
											<FaGamepad className="w-8 h-8 text-white" />
										</div>
										<h2 className="text-xl font-bold text-white mb-3">League Chat</h2>
										<p className="text-neutral-400 text-sm mb-6">
											{autoJoinEnabled ? 
												'Auto-join is enabled. You\'ll connect automatically when the game starts.' :
												'Ready to connect with your League teammates'
											}
										</p>
										
										{!autoJoinEnabled && (
											<button
												onClick={() => joinCall?.(true)}
												className="w-full btn-primary px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-3 hover:scale-105 transition-transform mb-4"
											>
												<FaPhone className="w-4 h-4" />
												Join League Chat
											</button>
										)}

										<div className="text-xs text-neutral-500">
											{gameState}
										</div>
									</>
								) : (
									/* Waiting for League */
									<>
										<div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-neutral-800 flex items-center justify-center">
											<FaGamepad className="w-8 h-8 text-neutral-400" />
										</div>
										<h2 className="text-xl font-bold text-white mb-3">League Chat</h2>
										<p className="text-neutral-400 text-sm mb-6">
											Start League of Legends to automatically connect with teammates
										</p>
										
										<div className="text-xs text-neutral-500 mb-4">
											{gameState}
										</div>

										{/* Setup Status */}
										<SetupStatusCard />
									</>
								)}
							</div>
						</div>
					</div>
				)}

			</main>


			{/* Join by Code Modal */}
			{showJoinModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-neutral-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
						<h3 className="text-xl font-semibold text-white mb-4">Join by Code</h3>
						<p className="text-neutral-400 text-sm mb-6">Enter a 6-character code to join someone's call</p>
						
						<div className="space-y-4">
							<input
								type="text"
								placeholder="Enter code (e.g. ABC123)"
								value={joinCode}
								onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
								maxLength={6}
								className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white font-mono text-center text-lg tracking-wider focus:border-violet-500 focus:outline-none"
								autoFocus
							/>
							
							<div className="flex gap-3">
								<button
									onClick={() => {
										setShowJoinModal(false);
										setJoinCode('');
									}}
									className="flex-1 px-4 py-3 rounded-xl chip hover:bg-white/10 border border-white/10 transition-all"
								>
									Cancel
								</button>
								<button
									onClick={handleJoinByCode}
									disabled={joinCode.length !== 6 || isJoining}
									className="flex-1 btn-primary px-4 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isJoining ? 'Joining...' : 'Join Call'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
			
			{/* Debug Modal */}
			<DebugInfo visible={showDebug} onClose={() => setShowDebug(false)} />
			
			{/* Onboarding Wizard */}
			{showOnboarding && (
				<OnboardingWizard
					onComplete={handleOnboardingComplete}
					onSkip={handleOnboardingSkip}
				/>
			)}
			
			{/* Quick Start Guide */}
			{showQuickStart && (
				<QuickStartGuide
					onClose={() => setShowQuickStart(false)}
				/>
			)}

			{/* Toasts */}
			<ToastContainer toasts={toasts} onRemove={removeToast} />

			{/* Call Switch Modal */}
			{showCallSwitchModal && availableLeagueCall && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-neutral-900 rounded-2xl p-6 w-full max-w-md border border-white/10 relative overflow-hidden">
						{/* Progress bar */}
						<div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-1000"
							 style={{ width: `${(switchCountdown / 10) * 100}%` }}
						></div>
						
						<div className="text-center">
							<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
								<FaGamepad className="w-8 h-8 text-white" />
							</div>
							
							<h3 className="text-xl font-semibold text-white mb-2">League Game Detected!</h3>
							<p className="text-neutral-400 text-sm mb-6">
								A League game call is available with {availableLeagueCall.memberCount} teammates. 
								Would you like to switch from your manual call?
							</p>
							
							<div className="space-y-3 mb-6">
								<button
									onClick={handleJoinLeagueCall}
									className="w-full btn-primary px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-3 hover:scale-105 transition-transform"
								>
									<FaGamepad />
									Join League Call ({availableLeagueCall.memberCount} players)
								</button>
								
								<button
									onClick={handleStayInManualCall}
									className="w-full px-6 py-3 rounded-xl chip hover:bg-white/10 border border-white/10 font-semibold transition-all"
								>
									Stay in Manual Call
								</button>
							</div>
							
							<div className="text-center">
								<p className="text-xs text-neutral-500">
									Auto-staying in current call in {switchCountdown}s
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Fixed Voice Control Bar - Only when connected */}
			{connected && joinedRoomId && (
				<div className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-sm border-t border-white/10">
					<div className="px-6 py-3">
						<div className="max-w-6xl mx-auto flex items-center justify-between">
							{/* Left: Connection Status */}
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2 text-sm">
									<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
									<span className="text-green-400">Connected</span>
									<span className="text-neutral-400">•</span>
									<span className="text-neutral-400">{(connectedPeers || []).length} in call</span>
								</div>
								{isSelfSpeaking && !muted && !deafened && (
									<div className="flex items-center gap-1 text-green-400 text-sm">
										<FaMicrophone className="w-3 h-3 animate-pulse" />
									</div>
								)}
							</div>
							
							{/* Center: Room Info */}
							<div className="flex items-center gap-2 text-sm text-neutral-400">
								<span>Room: {joinedRoomId}</span>
							</div>
							
							{/* Right: Audio Controls */}
							<div className="flex items-center gap-2">
								{/* Combined Microphone Control - Click to mute, hover for gain */}
								<div className="relative group">
									<button
										onClick={() => setMuted?.(!muted)}
										className={`p-2 rounded-lg transition-colors ${
											muted || deafened
												? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
												: 'bg-neutral-700/50 text-neutral-300 hover:bg-neutral-700'
										}`}
										title={muted ? 'Unmute' : 'Mute'}
									>
										{(muted || deafened) ? <FaMicrophoneSlash className="w-4 h-4" /> : <FaMicrophone className="w-4 h-4" />}
									</button>

									{/* Hover Volume Control */}
									<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-neutral-900/95 backdrop-blur-sm border border-neutral-700/50 rounded-lg p-3 shadow-lg min-w-[120px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
										{/* Arrow */}
										<div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-700/50"></div>
										
										{/* Label */}
										<div className="text-xs text-neutral-400 mb-2 text-center">Microphone Gain</div>
										
										{/* Slider */}
										<div className="relative">
											<input
												type="range"
												min="0"
												max="2"
												step="0.1"
												value={microphoneGain}
												onChange={(e) => handleMicrophoneGainChange(parseFloat(e.target.value))}
												className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
												style={{
													background: `linear-gradient(to right, rgb(139 92 246) 0%, rgb(139 92 246) ${(microphoneGain / 2) * 100}%, rgb(64 64 64) ${(microphoneGain / 2) * 100}%, rgb(64 64 64) 100%)`
												}}
											/>
											
											{/* Volume percentage */}
											<div className="text-xs text-neutral-400 text-center mt-1">
												{Math.round(microphoneGain * 100)}%
											</div>
										</div>
									</div>
								</div>

								{/* Combined Output Control - Click to deafen, hover for volume */}
								<div className="relative group">
									<button
										onClick={handleDeafenToggle}
										className={`p-2 rounded-lg transition-colors ${
											deafened 
												? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
												: 'bg-neutral-700/50 text-neutral-300 hover:bg-neutral-700'
										}`}
										title={deafened ? 'Undeafen' : 'Deafen (mute speakers)'}
									>
										{deafened ? (
											<FaVolumeXmark className="w-4 h-4" />
										) : masterVolume > 0.5 ? (
											<FaVolumeHigh className="w-4 h-4" />
										) : (
											<FaVolumeLow className="w-4 h-4" />
										)}
									</button>

									{/* Hover Volume Control */}
									<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-neutral-900/95 backdrop-blur-sm border border-neutral-700/50 rounded-lg p-3 shadow-lg min-w-[120px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
										{/* Arrow */}
										<div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-700/50"></div>
										
										{/* Label */}
										<div className="text-xs text-neutral-400 mb-2 text-center">Output Volume</div>
										
										{/* Slider */}
										<div className="relative">
											<input
												type="range"
												min="0"
												max="1"
												step="0.05"
												value={masterVolume}
												onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
												className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
												style={{
													background: `linear-gradient(to right, rgb(139 92 246) 0%, rgb(139 92 246) ${masterVolume * 100}%, rgb(64 64 64) ${masterVolume * 100}%, rgb(64 64 64) 100%)`
												}}
											/>
											
											{/* Volume percentage */}
											<div className="text-xs text-neutral-400 text-center mt-1">
												{Math.round(masterVolume * 100)}%
											</div>
										</div>
									</div>
								</div>
								
								<button
									onClick={() => leaveCall?.()}
									className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
									title="Leave Call"
								>
									<FaPhoneSlash className="w-4 h-4" />
								</button>
								
								<Link
									href="/settings"
									className="p-2 rounded-lg bg-neutral-700/50 text-neutral-300 hover:bg-neutral-700 transition-colors"
									title="Settings"
								>
									<FaGear className="w-4 h-4" />
								</Link>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}


