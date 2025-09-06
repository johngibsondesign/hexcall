import { useEffect, useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVolumeUp, FaVolumeMute, FaExclamationTriangle } from 'react-icons/fa';

interface MicrophoneStatusProps {
  muted: boolean;
  isSpeaking: boolean;
  pushToTalkEnabled: boolean;
  pushToTalkActive: boolean;
  audioLevel?: number;
  onToggleMute: () => void;
  className?: string;
}

export function MicrophoneStatus({
  muted,
  isSpeaking,
  pushToTalkEnabled,
  pushToTalkActive,
  audioLevel = 0,
  onToggleMute,
  className = ""
}: MicrophoneStatusProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getMicStatus = () => {
    if (pushToTalkEnabled) {
      if (pushToTalkActive) {
        return {
          icon: FaMicrophone,
          text: 'Push-to-Talk Active',
          color: 'text-green-400',
          bg: 'bg-green-400/20',
          ring: 'ring-green-400/40'
        };
      } else {
        return {
          icon: FaMicrophoneSlash,
          text: 'Push-to-Talk (Hold key to speak)',
          color: 'text-yellow-400',
          bg: 'bg-yellow-400/20',
          ring: 'ring-yellow-400/40'
        };
      }
    }
    
    if (muted) {
      return {
        icon: FaMicrophoneSlash,
        text: 'Microphone Muted',
        color: 'text-red-400',
        bg: 'bg-red-400/20',
        ring: 'ring-red-400/40'
      };
    }
    
    return {
      icon: FaMicrophone,
      text: isSpeaking ? 'Speaking' : 'Microphone Active',
      color: isSpeaking ? 'text-green-400' : 'text-blue-400',
      bg: isSpeaking ? 'bg-green-400/20' : 'bg-blue-400/20',
      ring: isSpeaking ? 'ring-green-400/40' : 'ring-blue-400/40'
    };
  };

  const status = getMicStatus();
  const IconComponent = status.icon;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={onToggleMute}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={pushToTalkEnabled}
        className={`
          flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
          ${status.bg} ${status.ring} ring-1 hover:ring-2
          ${pushToTalkEnabled ? 'cursor-not-allowed' : 'hover:scale-105'}
          ${isSpeaking ? 'animate-pulse' : ''}
        `}
      >
        <div className="relative">
          <IconComponent className={`w-5 h-5 ${status.color} ${isSpeaking ? 'animate-bounce' : ''}`} />
          
          {/* Audio level indicator */}
          {!muted && !pushToTalkEnabled && audioLevel > 0 && (
            <div className="absolute -top-1 -right-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-start">
          <span className={`text-sm font-medium ${status.color}`}>
            {status.text}
          </span>
          {pushToTalkEnabled && (
            <span className="text-xs text-neutral-400">
              Hold key to speak
            </span>
          )}
        </div>
        
        {/* Visual audio level bar */}
        {!muted && !pushToTalkEnabled && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1 h-3 rounded-full transition-all duration-100 ${
                  audioLevel * 100 > (i + 1) * 20 
                    ? 'bg-green-400' 
                    : 'bg-neutral-600'
                }`}
              />
            ))}
          </div>
        )}
      </button>
      
      {showTooltip && !pushToTalkEnabled && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded whitespace-nowrap">
          Click to {muted ? 'unmute' : 'mute'}
        </div>
      )}
      
      {pushToTalkEnabled && showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded whitespace-nowrap">
          Push-to-talk enabled - hold key to speak
        </div>
      )}
    </div>
  );
}
