import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useVoice } from '../providers/VoiceProvider';

export default function Home() {
	const { joinedRoomId, connected, joinCall, leaveCall } = useVoice() as any;
	const [clientStatus, setClientStatus] = useState<string>('Waiting…');
	const [phase, setPhase] = useState<string>('Unknown');

	useEffect(() => {
		const off = window.hexcall?.onLcuUpdate?.((payload: any) => {
			const p = payload?.phase || 'Unknown';
			setClientStatus(String(p));
			setPhase(String(p));
		});
		return () => { off && off(); };
	}, []);

	const inLobbyOrPregame = useMemo(() => (
		['Matchmaking','ReadyCheck','ChampSelect','Lobby'].includes(phase)
	), [phase]);

	return (
		<div className="min-h-screen bg-hextech">
			<Head>
				<title>Hexcall</title>
			</Head>
			<header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
				<h1 className="text-xl font-semibold text-gradient">Hexcall</h1>
				<nav className="text-sm text-neutral-300">
					<Link href="/settings" className="hover:underline">Settings</Link>
				</nav>
			</header>
			<main className="max-w-6xl mx-auto px-6 pb-16">
				<section className="mt-10 grid md:grid-cols-2 gap-8 items-center">
					<div>
						<h2 className="text-4xl md:text-5xl font-bold leading-tight">
							A sleek dark-mode voice for <span className="text-gradient">League</span>
						</h2>
						<p className="mt-4 text-neutral-300">
							Auto-join with lobby, in-game overlay, push-to-talk, and crystal-clear audio
							with TURN.
						</p>
						<div className="mt-6 flex items-center gap-3">
							<Link href="/settings" className="btn-primary px-4 py-2 rounded ring-hextech">Open Settings</Link>
							<Link href="/overlay" className="px-4 py-2 rounded chip hover:bg-white/10 border border-white/10">Preview Overlay</Link>
						</div>
					</div>
					<div className="glass rounded-xl p-6 border border-white/10">
						{inLobbyOrPregame ? (
							<div className="flex flex-col gap-4">
								<div className="text-sm text-neutral-400">Lobby Controls</div>
								<div className="flex gap-3">
									<button className="btn-primary px-4 py-2 rounded" onClick={() => joinCall?.(true)}>Join</button>
									<button className="px-4 py-2 rounded chip border border-white/10" onClick={() => leaveCall?.()}>Leave</button>
								</div>
								<div className="text-sm text-neutral-300">Room: {joinedRoomId || 'None'} {connected ? '(Connected)' : ''}</div>
								<div className="text-xs text-neutral-500">Overlay appears automatically in-game.</div>
							</div>
						) : (
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div className="chip rounded-lg p-4">
									<span className="text-neutral-400">Client Status</span>
									<div className="mt-2 font-medium" id="client-status">{clientStatus}</div>
								</div>
								<div className="chip rounded-lg p-4">
									<span className="text-neutral-400">Overlay</span>
									<div className="mt-2 font-medium">Shown in-game</div>
								</div>
								<div className="chip rounded-lg p-4">
									<span className="text-neutral-400">Quick Mute</span>
									<div className="mt-2 font-medium">Ctrl+Shift+M</div>
								</div>
								<div className="chip rounded-lg p-4">
									<span className="text-neutral-400">TURN</span>
									<div className="mt-2 font-medium">Metered configured</div>
								</div>
							</div>
						)}
					</div>
				</section>
			</main>
		</div>
	);
	
}


