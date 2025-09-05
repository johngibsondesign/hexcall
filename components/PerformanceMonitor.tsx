import { useState, useEffect, useRef } from 'react';
import { useVoice } from '../providers/VoiceProvider';

interface PerformanceStats {
  fps: number;
  memoryUsage: number;
  cpuUsage: number;
  audioLatency: number;
  renderTime: number;
  connectionUptime: number;
}

interface PerformanceMonitorProps {
  visible?: boolean;
  onClose?: () => void;
}

export function PerformanceMonitor({ visible = false, onClose }: PerformanceMonitorProps) {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    audioLatency: 0,
    renderTime: 0,
    connectionUptime: 0
  });
  
  const { connectionStats } = useVoice();
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const connectionStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) return;

    let animationFrameId: number;

    // Track FPS and render time
    const measurePerformance = () => {
      const now = performance.now();
      const deltaTime = now - lastTimeRef.current;
      
      frameCountRef.current++;
      
      // Update stats every second
      if (deltaTime >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / deltaTime);
        const renderTime = deltaTime / frameCountRef.current;
        
        // Get memory usage if available
        const memoryInfo = (performance as any).memory;
        const memoryUsage = memoryInfo 
          ? Math.round((memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100)
          : 0;

        // Calculate connection uptime
        const uptime = connectionStartRef.current 
          ? Math.round((now - connectionStartRef.current) / 1000)
          : 0;

        // Estimate CPU usage based on frame consistency
        const expectedFrames = Math.round(1000 / 16.67); // 60fps
        const cpuUsage = Math.max(0, 100 - ((fps / expectedFrames) * 100));

        setStats(prev => ({
          ...prev,
          fps,
          memoryUsage,
          cpuUsage: Math.round(cpuUsage),
          renderTime: Math.round(renderTime * 100) / 100,
          connectionUptime: uptime,
          audioLatency: connectionStats?.latency || 0
        }));

        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationFrameId = requestAnimationFrame(measurePerformance);
    };

    // Start connection timer when stats monitoring begins
    if (connectionStats && !connectionStartRef.current) {
      connectionStartRef.current = performance.now();
    }

    measurePerformance();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [visible, connectionStats]);

  if (!visible) return null;

  const getPerformanceColor = (value: number, thresholds: { good: number; fair: number }) => {
    if (value <= thresholds.good) return 'text-green-400';
    if (value <= thresholds.fair) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="fixed top-4 left-4 bg-black/80 backdrop-blur-md border border-neutral-700/50 rounded-lg p-4 min-w-[280px] z-50 font-mono text-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Performance Monitor</h3>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-neutral-300">FPS:</span>
          <span className={getPerformanceColor(60 - stats.fps, { good: 10, fair: 20 })}>
            {stats.fps}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-300">Render Time:</span>
          <span className={getPerformanceColor(stats.renderTime, { good: 16.67, fair: 33.33 })}>
            {stats.renderTime}ms
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-300">Memory:</span>
          <span className={getPerformanceColor(stats.memoryUsage, { good: 50, fair: 75 })}>
            {stats.memoryUsage}%
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-300">CPU Est:</span>
          <span className={getPerformanceColor(stats.cpuUsage, { good: 30, fair: 60 })}>
            {stats.cpuUsage}%
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-300">Audio Latency:</span>
          <span className={getPerformanceColor(stats.audioLatency, { good: 50, fair: 100 })}>
            {stats.audioLatency}ms
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-neutral-300">Uptime:</span>
          <span className="text-neutral-100">
            {formatUptime(stats.connectionUptime)}
          </span>
        </div>

        {connectionStats && (
          <>
            <div className="border-t border-neutral-600 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-neutral-300">Jitter:</span>
                <span className={getPerformanceColor(connectionStats.jitter, { good: 10, fair: 30 })}>
                  {connectionStats.jitter}ms
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-300">Packet Loss:</span>
                <span className={getPerformanceColor(connectionStats.packetLoss, { good: 0, fair: 2 })}>
                  {connectionStats.packetLoss}%
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-300">Bitrate:</span>
                <span className="text-neutral-100">
                  {connectionStats.bitrate > 1000 
                    ? `${Math.round(connectionStats.bitrate / 1000)}k`
                    : connectionStats.bitrate
                  } bps
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-300">Quality:</span>
                <span className={
                  connectionStats.connectionQuality === 'excellent' ? 'text-green-400' :
                  connectionStats.connectionQuality === 'good' ? 'text-green-300' :
                  connectionStats.connectionQuality === 'fair' ? 'text-yellow-400' :
                  connectionStats.connectionQuality === 'poor' ? 'text-red-400' :
                  'text-neutral-500'
                }>
                  {connectionStats.connectionQuality}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Hook for performance monitoring
export function usePerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = () => setIsVisible(prev => !prev);
  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  return { isVisible, toggle, show, hide };
}
