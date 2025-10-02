export interface OverlayTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    border: string;
    text: string;
    accent: string;
    speaking: string;
    hover: string;
  };
  opacity: {
    base: number;
    hover: number;
  };
  effects: {
    blur: string;
    shadow: string;
    scale: number;
  };
}

export const overlayThemes: Record<string, OverlayTheme> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Standard dark theme with violet accents',
    colors: {
      background: 'bg-neutral-900/30',
      border: 'ring-white/10',
      text: 'text-white',
      accent: 'ring-violet-500/50',
      speaking: 'ring-green-400',
      hover: 'hover:bg-white/10'
    },
    opacity: {
      base: 0.4,
      hover: 1.0
    },
    effects: {
      blur: 'backdrop-blur-[4px]',
      shadow: 'shadow-lg shadow-green-400/25',
      scale: 1.05
    }
  },
  
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and minimal with reduced visual noise',
    colors: {
      background: 'bg-black/20',
      border: 'ring-white/5',
      text: 'text-white',
      accent: 'ring-blue-400/40',
      speaking: 'ring-green-300',
      hover: 'hover:bg-white/5'
    },
    opacity: {
      base: 0.6,
      hover: 0.9
    },
    effects: {
      blur: 'backdrop-blur-[2px]',
      shadow: 'shadow-md shadow-green-300/20',
      scale: 1.02
    }
  },

  gaming: {
    id: 'gaming',
    name: 'Gaming',
    description: 'High contrast theme optimized for gaming',
    colors: {
      background: 'bg-red-900/40',
      border: 'ring-red-400/20',
      text: 'text-white',
      accent: 'ring-red-400/60',
      speaking: 'ring-yellow-400',
      hover: 'hover:bg-red-400/20'
    },
    opacity: {
      base: 0.5,
      hover: 1.0
    },
    effects: {
      blur: 'backdrop-blur-[6px]',
      shadow: 'shadow-lg shadow-yellow-400/30',
      scale: 1.08
    }
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Clean corporate theme with blue accents',
    colors: {
      background: 'bg-slate-800/35',
      border: 'ring-slate-400/15',
      text: 'text-slate-100',
      accent: 'ring-blue-400/50',
      speaking: 'ring-emerald-400',
      hover: 'hover:bg-slate-400/15'
    },
    opacity: {
      base: 0.45,
      hover: 0.95
    },
    effects: {
      blur: 'backdrop-blur-[3px]',
      shadow: 'shadow-lg shadow-emerald-400/25',
      scale: 1.03
    }
  },

  neon: {
    id: 'neon',
    name: 'Neon',
    description: 'Cyberpunk-inspired theme with neon colors',
    colors: {
      background: 'bg-purple-900/30',
      border: 'ring-cyan-400/20',
      text: 'text-cyan-100',
      accent: 'ring-cyan-400/70',
      speaking: 'ring-pink-400',
      hover: 'hover:bg-cyan-400/10'
    },
    opacity: {
      base: 0.3,
      hover: 1.0
    },
    effects: {
      blur: 'backdrop-blur-[8px]',
      shadow: 'shadow-xl shadow-pink-400/40',
      scale: 1.1
    }
  },

  discord: {
    id: 'discord',
    name: 'Discord',
    description: 'Classic Discord look with green speaking indicator',
    colors: {
      background: 'bg-gray-800/40',
      border: 'ring-gray-600/20',
      text: 'text-gray-100',
      accent: 'ring-blue-500/50',
      speaking: 'ring-green-500',
      hover: 'hover:bg-gray-600/20'
    },
    opacity: {
      base: 0.5,
      hover: 0.95
    },
    effects: {
      blur: 'backdrop-blur-[4px]',
      shadow: 'shadow-lg shadow-green-500/30',
      scale: 1.04
    }
  },

  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Vibrant cyberpunk theme with pink and blue neon',
    colors: {
      background: 'bg-black/50',
      border: 'ring-pink-500/30',
      text: 'text-pink-100',
      accent: 'ring-pink-500/80',
      speaking: 'ring-cyan-400',
      hover: 'hover:bg-pink-500/20'
    },
    opacity: {
      base: 0.35,
      hover: 1.0
    },
    effects: {
      blur: 'backdrop-blur-[10px]',
      shadow: 'shadow-2xl shadow-cyan-400/50',
      scale: 1.12
    }
  },

  streamer: {
    id: 'streamer',
    name: 'Streamer',
    description: 'Extra large and high contrast for streaming/recording',
    colors: {
      background: 'bg-black/60',
      border: 'ring-white/30',
      text: 'text-white',
      accent: 'ring-orange-400/70',
      speaking: 'ring-green-400',
      hover: 'hover:bg-white/15'
    },
    opacity: {
      base: 0.7,
      hover: 1.0
    },
    effects: {
      blur: 'backdrop-blur-[6px]',
      shadow: 'shadow-2xl shadow-green-400/40',
      scale: 1.15
    }
  },

  stealthy: {
    id: 'stealthy',
    name: 'Stealthy',
    description: 'Ultra-minimal, nearly invisible for minimal distraction',
    colors: {
      background: 'bg-black/10',
      border: 'ring-white/5',
      text: 'text-white/80',
      accent: 'ring-gray-400/30',
      speaking: 'ring-green-300',
      hover: 'hover:bg-white/10'
    },
    opacity: {
      base: 0.3,
      hover: 0.8
    },
    effects: {
      blur: 'backdrop-blur-[1px]',
      shadow: 'shadow-sm shadow-green-300/15',
      scale: 1.01
    }
  }
};

export function getOverlayTheme(themeId: string): OverlayTheme {
  return overlayThemes[themeId] || overlayThemes.default;
}

export function saveOverlayTheme(themeId: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('hexcall-overlay-theme', themeId);
    } catch (e) {
      console.warn('Failed to save overlay theme:', e);
    }
  }
}

export function loadOverlayTheme(): string {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem('hexcall-overlay-theme') || 'default';
    } catch (e) {
      console.warn('Failed to load overlay theme:', e);
    }
  }
  return 'default';
}
