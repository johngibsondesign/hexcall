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
