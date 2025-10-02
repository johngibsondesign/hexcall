import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { VoiceProvider } from '../providers/VoiceProvider';
import { ErrorBoundary } from '../components/ErrorBoundary';
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
	

	return (
		<>
			<div className={isOverlay ? "" : "h-screen flex flex-col"}>
				{/* Modern title bar */}
				{!isOverlay && (
					<div className="fixed top-0 left-0 right-0 z-50 h-10 flex items-center justify-between px-4 select-none bg-gradient-to-r from-neutral-900/95 to-neutral-800/95 backdrop-blur-sm border-b border-neutral-700/50" style={drag}>
						{/* Left: App branding */}
						<div className="flex items-center gap-3">
							<div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
								<span className="text-white text-xs font-bold">H</span>
							</div>
							<span className="text-sm font-semibold text-white">HexCall</span>
						</div>
						
						{/* Right: Window controls */}
						<div className="flex items-center gap-1" style={noDrag}>
							<button 
								onClick={() => window.hexcall?.windowMinimize?.()} 
								className="w-8 h-8 rounded-lg hover:bg-neutral-700/50 flex items-center justify-center transition-colors group" 
								aria-label="Minimize"
								title="Minimize to taskbar"
							>
								<div className="w-3 h-0.5 bg-neutral-400 group-hover:bg-white transition-colors"></div>
							</button>
							<button 
								onClick={() => window.hexcall?.windowMaximizeToggle?.()} 
								className="w-8 h-8 rounded-lg hover:bg-neutral-700/50 flex items-center justify-center transition-colors group" 
								aria-label="Maximize"
								title="Maximize window"
							>
								<div className="w-3 h-3 border border-neutral-400 group-hover:border-white transition-colors"></div>
							</button>
							<button 
								onClick={() => window.hexcall?.windowClose?.()} 
								className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center transition-colors group" 
								aria-label="Close"
								title="Close application"
							>
								<svg className="w-3 h-3 text-neutral-400 group-hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>
				)}
				{/* Main content with top padding to account for fixed title bar */}
				<div className={isOverlay ? "" : "flex-1 pt-10"}>
				<Component {...pageProps} />
				</div>
			</div>
			{!isOverlay && <ToastContainer toasts={toasts} onRemove={removeToast} />}
		</>
	);
}

export default function App({ Component, pageProps, router }: AppContentProps) {
	return (
		<ErrorBoundary>
			<VoiceProvider>
				<AppContent Component={Component} pageProps={pageProps} router={router} />
			</VoiceProvider>
		</ErrorBoundary>
	);
}


