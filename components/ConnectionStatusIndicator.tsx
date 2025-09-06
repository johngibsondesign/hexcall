import { useEffect, useState } from 'react';
import { FaWifi, FaExclamationTriangle, FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface ConnectionStatusProps {
  connected: boolean;
  connecting: boolean;
  roomId?: string;
  peerCount: number;
  className?: string;
}

export function ConnectionStatusIndicator({ 
  connected, 
  connecting, 
  roomId, 
  peerCount, 
  className = "" 
}: ConnectionStatusProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusConfig = () => {
    if (connecting) {
      return {
        icon: FaSpinner,
        text: 'Connecting...',
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10',
        ring: 'ring-yellow-400/20',
        animate: 'animate-spin'
      };
    }
    
    if (connected) {
      return {
        icon: FaCheckCircle,
        text: peerCount > 1 ? `Connected (${peerCount} users)` : 'Connected (waiting for others)',
        color: 'text-green-400',
        bg: 'bg-green-400/10',
        ring: 'ring-green-400/20',
        animate: 'animate-pulse'
      };
    }
    
    return {
      icon: FaTimesCircle,
      text: 'Disconnected',
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      ring: 'ring-red-400/20',
      animate: ''
    };
  };

  const status = getStatusConfig();
  const IconComponent = status.icon;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${status.bg} ${status.ring} ring-1 hover:ring-2`}
      >
        <IconComponent className={`w-4 h-4 ${status.color} ${status.animate}`} />
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      </button>
      
      {showDetails && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-neutral-900/95 backdrop-blur-md border border-neutral-700/50 rounded-lg shadow-xl z-10 min-w-[250px]">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-400">Status:</span>
              <span className={status.color}>{status.text}</span>
            </div>
            {roomId && (
              <div className="flex justify-between">
                <span className="text-neutral-400">Room:</span>
                <span className="text-white font-mono">{roomId.length > 20 ? `${roomId.slice(0, 20)}...` : roomId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-400">Peers:</span>
              <span className="text-white">{peerCount}</span>
            </div>
            <div className="pt-1 border-t border-neutral-700/50">
              <div className="flex items-center gap-2">
                <FaWifi className="w-3 h-3 text-neutral-400" />
                <span className="text-neutral-400">WebRTC Connection</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
