import { useState } from 'react';

interface HoverVolumeControlProps {
  icon: React.ReactNode;
  volume: number;
  onVolumeChange: (volume: number) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}

export function HoverVolumeControl({ 
  icon, 
  volume, 
  onVolumeChange, 
  label, 
  className = "", 
  disabled = false 
}: HoverVolumeControlProps) {
  const [showSlider, setShowSlider] = useState(false);

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      {/* Button */}
      <button
        className={`p-2 rounded-lg transition-colors ${
          disabled 
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
            : 'bg-neutral-700/50 text-neutral-300 hover:bg-neutral-700'
        }`}
        title={label}
      >
        {icon}
      </button>

      {/* Hover Slider */}
      {showSlider && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-neutral-900/95 backdrop-blur-sm border border-neutral-700/50 rounded-lg p-3 shadow-lg min-w-[120px]">
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-700/50"></div>
          
          {/* Label */}
          <div className="text-xs text-neutral-400 mb-2 text-center">{label}</div>
          
          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, rgb(139 92 246) 0%, rgb(139 92 246) ${volume * 100}%, rgb(64 64 64) ${volume * 100}%, rgb(64 64 64) 100%)`
              }}
            />
            
            {/* Volume percentage */}
            <div className="text-xs text-neutral-400 text-center mt-1">
              {Math.round(volume * 100)}%
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: rgb(139 92 246);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: rgb(139 92 246);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
