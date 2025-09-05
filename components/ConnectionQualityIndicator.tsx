import { useMemo } from 'react';
import { 
  FaWifi, 
  FaTriangleExclamation, 
  FaCircleXmark,
  FaSignal 
} from 'react-icons/fa6';
import type { ConnectionStats } from '../modules/webrtc/voiceClient';

interface ConnectionQualityIndicatorProps {
  stats: ConnectionStats | null;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConnectionQualityIndicator({ 
  stats, 
  showDetails = false, 
  size = 'md',
  className = "" 
}: ConnectionQualityIndicatorProps) {
  const { icon, color, text, details } = useMemo(() => {
    if (!stats) {
      return {
        icon: FaCircleXmark,
        color: 'text-neutral-500',
        text: 'Disconnected',
        details: 'No connection'
      };
    }

    switch (stats.connectionQuality) {
      case 'excellent':
        return {
          icon: FaWifi,
          color: 'text-green-400',
          text: 'Excellent',
          details: `${stats.latency}ms • ${stats.packetLoss}% loss`
        };
      
      case 'good':
        return {
          icon: FaWifi,
          color: 'text-green-300',
          text: 'Good',
          details: `${stats.latency}ms • ${stats.packetLoss}% loss`
        };
      
      case 'fair':
        return {
          icon: FaSignal,
          color: 'text-yellow-400',
          text: 'Fair',
          details: `${stats.latency}ms • ${stats.packetLoss}% loss`
        };
      
      case 'poor':
        return {
          icon: FaTriangleExclamation,
          color: 'text-red-400',
          text: 'Poor',
          details: `${stats.latency}ms • ${stats.packetLoss}% loss`
        };
      
      default:
        return {
          icon: FaCircleXmark,
          color: 'text-neutral-500',
          text: 'Disconnected',
          details: 'No connection'
        };
    }
  }, [stats]);

  const sizeClasses = {
    sm: { icon: 'w-3 h-3', text: 'text-xs', container: 'gap-1' },
    md: { icon: 'w-4 h-4', text: 'text-sm', container: 'gap-2' },
    lg: { icon: 'w-5 h-5', text: 'text-base', container: 'gap-2' }
  };

  const classes = sizeClasses[size];
  const IconComponent = icon;

  if (showDetails) {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className={`flex items-center ${classes.container}`}>
          <IconComponent className={`${classes.icon} ${color}`} />
          <span className={`${classes.text} ${color} font-medium`}>
            {text}
          </span>
        </div>
        {stats && (
          <div className="text-xs text-neutral-400 mt-1">
            {details}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center ${classes.container} ${className}`}>
      <IconComponent className={`${classes.icon} ${color}`} />
      {showDetails && (
        <span className={`${classes.text} ${color}`}>
          {text}
        </span>
      )}
    </div>
  );
}

// Detailed stats component for settings or debug views
export function DetailedConnectionStats({ stats }: { stats: ConnectionStats | null }) {
  if (!stats) {
    return (
      <div className="text-center text-neutral-500 py-4">
        No connection data available
      </div>
    );
  }

  const formatBitrate = (bitrate: number) => {
    if (bitrate < 1000) return `${bitrate} bps`;
    if (bitrate < 1000000) return `${(bitrate / 1000).toFixed(1)} kbps`;
    return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  };

  const getQualityColor = (quality: ConnectionStats['connectionQuality']) => {
    switch (quality) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-green-300';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-neutral-500';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-400">Connection Quality</span>
        <div className="flex items-center gap-2">
          <ConnectionQualityIndicator stats={stats} size="sm" />
          <span className={`text-sm font-medium capitalize ${getQualityColor(stats.connectionQuality)}`}>
            {stats.connectionQuality}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-400">Latency</span>
          <span className="text-white">{stats.latency}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-neutral-400">Jitter</span>
          <span className="text-white">{stats.jitter}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-neutral-400">Packet Loss</span>
          <span className="text-white">{stats.packetLoss}%</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-neutral-400">Bitrate</span>
          <span className="text-white">{formatBitrate(stats.bitrate)}</span>
        </div>
      </div>
    </div>
  );
}
