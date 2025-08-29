import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { VoiceProvider } from '../providers/VoiceProvider';

const drag = { WebkitAppRegion: 'drag' } as any;
const noDrag = { WebkitAppRegion: 'no-drag' } as any;

export default function App({ Component, pageProps }: AppProps) {
	return (
		<VoiceProvider>
			<div className="min-h-screen">
				{/* Bespoke title bar for Win: draggable area */}
				<div className="h-8 flex items-center justify-between px-3 select-none bg-neutral-950/80 border-b border-white/10" style={drag}>
					<div className="text-xs text-neutral-400">Hexcall</div>
					<div className="flex gap-1.5" style={noDrag}>
						<button onClick={() => window.hexcall?.updatesCheck?.()} className="h-6 px-2 rounded chip hover:bg-white/10 text-xs">Check updates</button>
						<button onClick={() => window.hexcall?.windowMinimize?.()} className="w-8 h-6 rounded chip hover:bg-white/10" aria-label="Minimize">—</button>
						<button onClick={() => window.hexcall?.windowMaximizeToggle?.()} className="w-8 h-6 rounded chip hover:bg-white/10" aria-label="Maximize">▢</button>
						<button onClick={() => window.hexcall?.windowClose?.()} className="w-8 h-6 rounded chip hover:bg-red-500/20" aria-label="Close">✕</button>
					</div>
				</div>
				<Component {...pageProps} />
			</div>
		</VoiceProvider>
	);
}


