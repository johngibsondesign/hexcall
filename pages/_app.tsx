import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { VoiceProvider } from '../providers/VoiceProvider';
import { useEffect } from 'react';
import { ToastContainer, useToast } from '../components/Toast';

const drag = { WebkitAppRegion: 'drag' } as any;
const noDrag = { WebkitAppRegion: 'no-drag' } as any;

interface AppContentProps {
	Component: React.ComponentType<any>;
	pageProps: any;
	router: {
		pathname: string;
	};
}

function AppContent({ Component, pageProps, router }: AppContentProps) {
	const isOverlay = router?.pathname === '/overlay';
	const { toasts, removeToast, showInfo, showSuccess } = useToast();
	
	// Apply transparent background for overlay
	useEffect(() => {
		if (isOverlay) {
			document.body.style.backgroundColor = 'transparent';
			document.documentElement.style.backgroundColor = 'transparent';
		} else {
			document.body.style.backgroundColor = '';
			document.documentElement.style.backgroundColor = '';
		}
		
		return () => {
			// Cleanup on unmount
			document.body.style.backgroundColor = '';
			document.documentElement.style.backgroundColor = '';
		};
	}, [isOverlay]);
	
	// Subscribe to updater events
	useEffect(() => {
		const offNone = window.hexcall?.onUpdateNone?.(() => {
			showInfo('No updates found');
		});
		const offAvailable = window.hexcall?.onUpdateAvailable?.((info: any) => {
			const v = info?.version ? `v${info.version}` : '';
			showInfo('Update available', v);
		});
		const offProgress = window.hexcall?.onUpdateProgress?.((p: any) => {
			const pct = Math.round(p?.percent || 0);
			showInfo('Downloading update…', `${pct}%`, 1200);
		});
		const offDownloaded = window.hexcall?.onUpdateDownloaded?.(() => {
			showSuccess('Update downloaded!', 'Installing in 5 seconds...', 5000);
			// Auto-install after 5 seconds
			setTimeout(() => {
				window.hexcall?.updatesQuitAndInstall?.();
			}, 5000);
		});
		return () => {
			offNone && offNone();
			offAvailable && offAvailable();
			offProgress && offProgress();
			offDownloaded && offDownloaded();
		};
	}, [showInfo, showSuccess]);

	return (
		<>
			<div className={isOverlay ? "" : "min-h-screen"}>
				{/* Hide title bar on overlay route */}
				{!isOverlay && (
					<div className="h-8 flex items-center justify-between px-3 select-none bg-neutral-950/80 border-b border-white/10" style={drag}>
						<div className="text-xs text-neutral-400">Hexcall</div>
						<div className="flex gap-1.5" style={noDrag}>
							<button onClick={() => { showInfo('Checking for updates…'); window.hexcall?.updatesCheck?.(); }} className="h-6 px-2 rounded chip hover:bg-white/10 text-xs">Check updates</button>
							<button onClick={() => window.hexcall?.windowMinimize?.()} className="w-8 h-6 rounded chip hover:bg-white/10" aria-label="Minimize">—</button>
							<button onClick={() => window.hexcall?.windowMaximizeToggle?.()} className="w-8 h-6 rounded chip hover:bg-white/10" aria-label="Maximize">▢</button>
							<button onClick={() => window.hexcall?.windowClose?.()} className="w-8 h-6 rounded chip hover:bg-red-500/20" aria-label="Close">✕</button>
						</div>
					</div>
				)}
				<Component {...pageProps} />
			</div>
			{!isOverlay && <ToastContainer toasts={toasts} onRemove={removeToast} />}
		</>
	);
}

export default function App({ Component, pageProps, router }: AppContentProps) {
	return (
		<VoiceProvider>
			<AppContent Component={Component} pageProps={pageProps} router={router} />
		</VoiceProvider>
	);
}


