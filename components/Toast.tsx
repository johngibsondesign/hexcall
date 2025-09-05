import { useEffect, useState } from 'react';
import { FaCircleCheck, FaTriangleExclamation, FaCircleInfo, FaCircleXmark } from 'react-icons/fa6';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	title: string;
	message?: string;
	duration?: number;
}

interface ToastItemProps {
	toast: Toast;
	onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
	const [isVisible, setIsVisible] = useState(false);
	const [isRemoving, setIsRemoving] = useState(false);

	useEffect(() => {
		// Fade in
		const fadeInTimer = setTimeout(() => setIsVisible(true), 50);
		
		// Auto remove after duration
		const duration = toast.duration ?? 5000;
		const removeTimer = setTimeout(() => {
			setIsRemoving(true);
			setTimeout(() => onRemove(toast.id), 300);
		}, duration);

		return () => {
			clearTimeout(fadeInTimer);
			clearTimeout(removeTimer);
		};
	}, [toast.id, toast.duration, onRemove]);

	const getIcon = () => {
		switch (toast.type) {
			case 'success': return <FaCircleCheck className="text-green-400" />;
			case 'error': return <FaCircleXmark className="text-red-400" />;
			case 'warning': return <FaTriangleExclamation className="text-yellow-400" />;
			case 'info': return <FaCircleInfo className="text-blue-400" />;
		}
	};

	const getColorClasses = () => {
		switch (toast.type) {
			case 'success': return 'border-green-400/20 bg-green-900/20';
			case 'error': return 'border-red-400/20 bg-red-900/20';
			case 'warning': return 'border-yellow-400/20 bg-yellow-900/20';
			case 'info': return 'border-blue-400/20 bg-blue-900/20';
		}
	};

	return (
		<div
			className={`
				transform transition-all duration-300 ease-out
				${isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
				${getColorClasses()}
				border rounded-xl p-4 backdrop-blur-sm shadow-lg
				max-w-sm w-full
			`}
		>
			<div className="flex items-start gap-3">
				<div className="flex-shrink-0 mt-0.5">
					{getIcon()}
				</div>
				<div className="flex-1 min-w-0">
					<h4 className="text-sm font-semibold text-white">{toast.title}</h4>
					{toast.message && (
						<p className="mt-1 text-xs text-neutral-300">{toast.message}</p>
					)}
				</div>
				<button
					onClick={() => {
						setIsRemoving(true);
						setTimeout(() => onRemove(toast.id), 300);
					}}
					className="flex-shrink-0 text-neutral-400 hover:text-white transition-colors"
				>
					<FaCircleXmark className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}

interface ToastContainerProps {
	toasts: Toast[];
	onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
	return (
		<div className="fixed top-4 right-4 z-50 space-y-2">
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
			))}
		</div>
	);
}

// Toast manager hook
export function useToast() {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const addToast = (toast: Omit<Toast, 'id'>) => {
		const id = crypto.randomUUID();
		setToasts(prev => [...prev, { ...toast, id }]);
	};

	const removeToast = (id: string) => {
		setToasts(prev => prev.filter(toast => toast.id !== id));
	};

	const showSuccess = (title: string, message?: string, duration?: number) => {
		addToast({ type: 'success', title, message, duration });
	};

	const showError = (title: string, message?: string, duration?: number) => {
		addToast({ type: 'error', title, message, duration });
	};

	const showWarning = (title: string, message?: string, duration?: number) => {
		addToast({ type: 'warning', title, message, duration });
	};

	const showInfo = (title: string, message?: string, duration?: number) => {
		addToast({ type: 'info', title, message, duration });
	};

	return {
		toasts,
		addToast,
		removeToast,
		showSuccess,
		showError,
		showWarning,
		showInfo,
	};
}
