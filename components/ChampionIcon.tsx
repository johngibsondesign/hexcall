import { useState, useEffect } from 'react';
import { ChampionIconLoader, ChampionIconOptions } from '../lib/championIcons';
import { RoleIcon } from './RoleIcon';

interface ChampionIconProps extends ChampionIconOptions {
  alt: string;
  className?: string;
  role?: string;
  showLoadingSpinner?: boolean;
}

export function ChampionIcon({ 
  alt, 
  className = "w-full h-full object-cover", 
  role,
  showLoadingSpinner = false,
  ...iconOptions 
}: ChampionIconProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    
    const loadIcon = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        const url = await ChampionIconLoader.loadChampionIcon(iconOptions);
        
        if (!isCancelled) {
          if (url) {
            setIconUrl(url);
          } else {
            setHasError(true);
          }
        }
      } catch {
        if (!isCancelled) {
          setHasError(true);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    // Only load if we have some champion data
    if (iconOptions.championName || iconOptions.championId || iconOptions.profileIconId) {
      loadIcon();
    } else {
      setIsLoading(false);
      setHasError(true);
    }

    return () => {
      isCancelled = true;
    };
  }, [JSON.stringify(iconOptions)]);

  // Show loading spinner
  if (isLoading && showLoadingSpinner) {
    return (
      <div className={`${className} flex items-center justify-center bg-neutral-800`}>
        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show champion icon if loaded successfully
  if (iconUrl && !hasError) {
    return (
      <img 
        src={iconUrl} 
        alt={alt} 
        loading="lazy"
        className={className}
        onError={() => setHasError(true)}
      />
    );
  }

  // Fallback to role icon
  return <RoleIcon role={role} className={className} />;
}

// Enhanced version with hover preview for larger champion splash
interface ChampionIconWithPreviewProps extends ChampionIconProps {
  showPreview?: boolean;
  previewClassName?: string;
}

export function ChampionIconWithPreview({ 
  showPreview = false,
  previewClassName = "absolute top-full left-1/2 transform -translate-x-1/2 w-32 h-48 object-cover rounded-lg shadow-xl z-50",
  ...props 
}: ChampionIconWithPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (showPreview && props.championName) {
      // Load splash art for preview
      const splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${props.championName}_0.jpg`;
      setPreviewUrl(splashUrl);
    }
  }, [showPreview, props.championName]);

  return (
    <div className="relative group">
      <ChampionIcon {...props} />
      
      {showPreview && previewUrl && (
        <img
          src={previewUrl}
          alt={`${props.alt} splash art`}
          loading="lazy"
          className={`${previewClassName} opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}
          onError={() => setPreviewUrl(null)}
        />
      )}
    </div>
  );
}
