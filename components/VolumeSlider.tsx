import { useState, useEffect } from 'react';
import { FaVolumeOff, FaVolumeLow, FaVolumeHigh } from 'react-icons/fa6';

interface VolumeSliderProps {
  userId: string;
  initialVolume?: number;
  onVolumeChange: (userId: string, volume: number) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function VolumeSlider({ 
  userId, 
  initialVolume = 1.0, 
  onVolumeChange, 
  className = "", 
  size = 'md' 
}: VolumeSliderProps) {
  const [volume, setVolume] = useState(initialVolume);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setVolume(initialVolume);
  }, [initialVolume]);

  const handleVolumeChange = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    onVolumeChange(userId, clampedVolume);
  };

  const getVolumeIcon = () => {
    if (volume === 0) return FaVolumeOff;
    if (volume < 0.5) return FaVolumeLow;
    return FaVolumeHigh;
  };

  const VolumeIcon = getVolumeIcon();

  const sizeClasses = {
    sm: {
      slider: 'w-16 h-1',
      container: 'gap-1',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      slider: 'w-20 h-1.5',
      container: 'gap-2',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      slider: 'w-24 h-2',
      container: 'gap-2',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex items-center ${classes.container} ${className}`}>
      <VolumeIcon className={`${classes.icon} text-neutral-400 flex-shrink-0`} />
      
      <div className="relative flex-1">
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          className={`
            ${classes.slider} 
            appearance-none bg-neutral-700 rounded-full cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-violet-500/50
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-150
            hover:[&::-webkit-slider-thumb]:bg-violet-400
            ${isDragging ? '[&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:scale-110' : ''}
          `}
          style={{
            background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${volume * 100}%, #404040 ${volume * 100}%, #404040 100%)`
          }}
        />
      </div>
      
      <span className={`${classes.text} text-neutral-400 font-mono min-w-[2rem] text-center`}>
        {Math.round(volume * 100)}
      </span>
    </div>
  );
}

// Compact version for overlay tooltips
export function CompactVolumeSlider({ userId, initialVolume = 1.0, onVolumeChange }: VolumeSliderProps) {
  return (
    <VolumeSlider
      userId={userId}
      initialVolume={initialVolume}
      onVolumeChange={onVolumeChange}
      size="sm"
      className="px-2 py-1"
    />
  );
}
