import { useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaPhone, FaPhoneSlash, FaCog, FaUsers, FaVolumeUp } from 'react-icons/fa';
import { MicrophoneStatus } from './MicrophoneStatus';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import Link from 'next/link';

interface VoiceControlPanelProps {
  connected: boolean;
  connecting: boolean;
  muted: boolean;
  isSelfSpeaking: boolean;
  pushToTalkEnabled: boolean;
  pushToTalkActive: boolean;
  roomId?: string;
  peerCount: number;
  audioLevel?: number;
  onToggleMute: () => void;
  onLeaveCall: () => void;
  className?: string;
}

export function VoiceControlPanel({
  connected,
  connecting,
  muted,
  isSelfSpeaking,
  pushToTalkEnabled,
  pushToTalkActive,
  roomId,
  peerCount,
  audioLevel,
  onToggleMute,
  onLeaveCall,
  className = ""
}: VoiceControlPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className={`glass rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FaUsers className="w-5 h-5 text-violet-400" />
          Voice Controls
        </h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-neutral-400 hover:text-white transition-colors"
        >
          {showAdvanced ? 'Less' : 'More'}
        </button>
      </div>

      {/* Connection Status */}
      <div className="mb-4">
        <ConnectionStatusIndicator
          connected={connected}
          connecting={connecting}
          roomId={roomId}
          peerCount={peerCount}
          className="w-full"
        />
      </div>

      {/* Microphone Controls */}
      <div className="mb-4">
        <MicrophoneStatus
          muted={muted}
          isSpeaking={isSelfSpeaking}
          pushToTalkEnabled={pushToTalkEnabled}
          pushToTalkActive={pushToTalkActive}
          audioLevel={audioLevel}
          onToggleMute={onToggleMute}
          className="w-full"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {connected && (
          <button
            onClick={onLeaveCall}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <FaPhoneSlash className="w-4 h-4" />
            Leave Call
          </button>
        )}
        
        <Link
          href="/settings"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-700/50 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
        >
          <FaCog className="w-4 h-4" />
          Settings
        </Link>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-neutral-700/50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">Push-to-Talk</span>
              <span className={`text-xs px-2 py-1 rounded ${
                pushToTalkEnabled 
                  ? 'bg-green-400/20 text-green-400' 
                  : 'bg-neutral-700 text-neutral-400'
              }`}>
                {pushToTalkEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">Audio Quality</span>
              <span className="text-xs text-green-400">High</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">Noise Suppression</span>
              <span className="text-xs text-green-400">Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      {!connected && (
        <div className="mt-4 p-3 bg-blue-400/10 border border-blue-400/20 rounded-lg">
          <p className="text-xs text-blue-400">
            💡 <strong>Tip:</strong> Start League of Legends for automatic voice chat, or create a manual call to invite friends.
          </p>
        </div>
      )}
    </div>
  );
}
