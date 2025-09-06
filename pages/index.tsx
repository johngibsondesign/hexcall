import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
	FaQuestion
} from 'react-icons/fa6';
import { RoleIcon } from '../components/RoleIcon';
import { ChampionIconWithPreview } from '../components/ChampionIcon';
import { VolumeSlider } from '../components/VolumeSlider';
import { ConnectionQualityIndicator } from '../components/ConnectionQualityIndicator';
import { DebugInfo } from '../components/DebugInfo';
import { OnboardingWizard } from '../components/OnboardingWizard';
import { VoiceControlPanel } from '../components/VoiceControlPanel';
import { SetupStatusCard } from '../components/SetupStatusCard';
import { QuickStartGuide } from '../components/QuickStartGuide';

interface Teammate {
	summonerName?: string;
	gameName?: string;
	name?: string;
	puuid?: string;
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
		connectedPeers
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

	// Load push-to-talk settings and check onboarding
	useEffect(() => {
		try {
			const savedPTT = localStorage.getItem('hexcall-push-to-talk');
			if (savedPTT) {
				const pttSettings = JSON.parse(savedPTT);
				setPushToTalkEnabled(pttSettings.enabled || false);
				setPushToTalkKey(pttSettings.key || 'CapsLock');
			}
			
			// Check if user has seen onboarding
			const seenOnboarding = localStorage.getItem('hexcall-onboarding-seen');
			if (!seenOnboarding) {
				setShowOnboarding(true);
			} else {
				setHasSeenOnboarding(true);
			}
		} catch {}
	}, []);

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
								
							setTeammates(sortedMembers.slice(0, 5)); // Limit to 5 teammates
		});
		return () => { off && off(); };
	}, []);

	const inLobbyOrGame = useMemo(() => {
		const phase = typeof gamePhase === 'string' ? gamePhase : '';
		return ['Matchmaking','ReadyCheck','ChampSelect','Lobby','InProgress'].includes(phase);
	}, [gamePhase]);

	const getGameStateColor = (state: string) => {
		const safeState = typeof state === 'string' ? state : '';
		if (safeState.includes('Finding') || safeState.includes('Connecting')) return 'text-yellow-400';
		if (safeState.includes('Ready') || safeState.includes('Game')) return 'text-green-400';
		if (safeState.includes('Not Running')) return 'text-red-400';
		return 'text-blue-400';
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

	return (
		<div className="min-h-screen bg-hextech flex flex-col">
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
				{/* Call Interface */}
				{connected && joinedRoomId ? (
					<div className="flex-1 flex flex-col">
						{/* Call Header */}
						<div className="px-6 py-4 border-b border-white/10">
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-lg font-semibold text-white">Voice Call Active</h2>
									<p className="text-sm text-neutral-400">Room: {joinedRoomId}</p>
								</div>
								<div className="flex items-center gap-2">
									<div className="flex items-center gap-1 text-sm text-green-400">
										<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
										Connected
							</div>
								</div>
							</div>
						</div>

						{/* Teammates Grid */}
						<div className="flex-1 p-6">
							<div className="max-w-4xl mx-auto">
								<h3 className="text-sm font-medium text-neutral-300 mb-4 flex items-center gap-2">
									<FaUsers />
									Voice Chat ({(connectedPeers || []).length}/5)
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
									{(connectedPeers || []).map((peer, idx) => {
										const isSpeaking = speakingUsers?.has(peer.id);
										// For voice peers, we don't have role info, so show generic
										return (
											<div key={peer.id} className="glass rounded-xl p-4 text-center relative">
												<div className={`w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden flex items-center justify-center ring-2 transition-all ${
													isSpeaking 
														? 'ring-green-400 shadow-lg shadow-green-400/25 animate-pulse' 
														: 'ring-white/20'
												} bg-neutral-700`}>
													<FaUsers className="w-8 h-8 text-neutral-400" />
												</div>
												<div className="text-sm font-medium text-white truncate">{peer.name || peer.id.slice(0, 8)}</div>
												<div className="text-xs text-neutral-400">Connected</div>
												
												{/* Volume Control */}
												<div className="mt-3 w-full">
													<VolumeSlider
														userId={peer.id}
														initialVolume={getUserVolume?.(peer.id) ?? 1.0}
														onVolumeChange={(userId, volume) => setUserVolume?.(userId, volume)}
														size="sm"
													/>
												</div>
												
												{isSpeaking && (
													<div className="mt-2 text-xs text-green-400 flex items-center justify-center gap-1">
														<FaMicrophone className="animate-pulse" />
														Speaking
													</div>
												)}
											</div>
										);
									})}
								</div>
							</div>
						</div>

						{/* Voice Control Panel */}
						<div className="px-6 py-4">
							<VoiceControlPanel
								connected={connected}
								connecting={false}
								muted={muted}
								isSelfSpeaking={isSelfSpeaking || false}
								pushToTalkEnabled={pushToTalkEnabled}
								pushToTalkActive={false}
								roomId={joinedRoomId}
								peerCount={(connectedPeers || []).length}
								onToggleMute={() => setMuted?.(!muted)}
								onLeaveCall={() => leaveCall?.()}
								className="max-w-md mx-auto"
							/>
						</div>
					</div>
				) : inLobbyOrGame ? (
					/* Join Call Interface - League */
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center max-w-md mx-auto px-6">
							<div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
								<FaPhone className="w-10 h-10 text-white" />
							</div>
							<h2 className="text-2xl font-bold text-white mb-4">Ready to Connect</h2>
							<p className="text-neutral-400 mb-8">Join voice chat with your League teammates</p>
							<button
								onClick={() => joinCall?.(true)}
								className="btn-primary px-8 py-3 rounded-xl font-semibold flex items-center gap-3 mx-auto hover:scale-105 transition-transform"
							>
								<FaPhone />
								Join League Chat
							</button>
						</div>
					</div>
				) : (
					/* Waiting State with Manual Call Options */
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center max-w-lg mx-auto px-6">
							<div className="w-24 h-24 mx-auto mb-6 rounded-full bg-neutral-800 flex items-center justify-center">
								<FaGamepad className="w-10 h-10 text-neutral-400" />
							</div>
							<h2 className="text-2xl font-bold text-white mb-4">Ready for Voice Chat</h2>
							<p className="text-neutral-400 mb-6">Start League of Legends for auto-join, or create a manual call</p>
							
							{/* Setup Status */}
							<div className="mb-6">
								<SetupStatusCard />
							</div>
							
							{/* Manual Call Options */}
							<div className="space-y-4 mb-8">
								<button
									onClick={handleCreateManualCall}
									className="w-full btn-primary px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-3 hover:scale-105 transition-transform"
								>
									<FaPlus />
									Start Manual Call
								</button>
								
								<button
									onClick={() => setShowJoinModal(true)}
									className="w-full px-6 py-3 rounded-xl chip hover:bg-white/10 border border-white/10 font-semibold flex items-center justify-center gap-3 transition-all"
								>
									<FaPhone />
									Join by Code
								</button>
							</div>
							
							<div className="flex justify-center gap-4">
								<Link href="/settings" className="px-6 py-2 rounded-lg chip hover:bg-white/10 border border-white/10">
									Settings
								</Link>
								<Link href="/overlay" className="px-6 py-2 rounded-lg chip hover:bg-white/10 border border-white/10">
									Preview Overlay
								</Link>
								<button onClick={() => setShowDebug(true)} className="px-6 py-2 rounded-lg chip hover:bg-white/10 border border-white/10">
									🐛 Debug
								</button>
							</div>
						</div>
					</div>
				)}
			</main>

			{/* Status Bar */}
			<footer className="px-6 py-2 border-t border-white/10 bg-neutral-950/50">
				<div className="flex items-center justify-between text-xs text-neutral-400">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<ConnectionQualityIndicator stats={connectionStats || null} size="sm" />
							<span>Connection</span>
						</div>
						{pushToTalkEnabled ? (
							<span>Push-to-Talk: {pushToTalkKey}</span>
						) : (
							<span>Hotkey: Ctrl+Shift+M</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						{isSelfSpeaking && (
							<div className="flex items-center gap-1 text-green-400">
								<FaMicrophone className="animate-pulse" />
								<span>Speaking</span>
							</div>
						)}
					</div>
				</div>
			</footer>

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
		</div>
	);
}


