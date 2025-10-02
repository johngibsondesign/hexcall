import { useEffect, useState } from 'react';
import { FaUserPlus, FaUserMinus } from 'react-icons/fa6';

export interface OverlayToastData {
  id: string;
  type: 'join' | 'leave';
  userName: string;
  timestamp: number;
}

interface OverlayToastProps {
  toast: OverlayToastData;
  onDismiss: (id: string) => void;
}

export function OverlayToast({ toast, onDismiss }: OverlayToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-dismiss after 3 seconds
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300); // Wait for exit animation
    }, 3000);

    return () => clearTimeout(dismissTimer);
  }, [toast.id, onDismiss]);

  const isJoin = toast.type === 'join';

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md
        ${isJoin ? 'bg-green-500/90' : 'bg-red-500/90'}
        shadow-lg border border-white/20
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}
      `}
      style={{
        animation: isExiting ? 'none' : 'slideIn 0.3s ease-out'
      }}
    >
      <div className={`
        w-6 h-6 rounded-full flex items-center justify-center
        ${isJoin ? 'bg-green-600' : 'bg-red-600'}
      `}>
        {isJoin ? (
          <FaUserPlus className="w-3 h-3 text-white" />
        ) : (
          <FaUserMinus className="w-3 h-3 text-white" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">
          {toast.userName}
        </p>
        <p className="text-xs text-white/80">
          {isJoin ? 'joined the call' : 'left the call'}
        </p>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(2rem);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

interface OverlayToastContainerProps {
  toasts: OverlayToastData[];
  onDismiss: (id: string) => void;
}

export function OverlayToastContainer({ toasts, onDismiss }: OverlayToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <OverlayToast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
