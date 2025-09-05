import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
  visible: boolean;
}

export function ContextMenu({ items, x, y, onClose, visible }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (!visible || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Adjust horizontal position if menu would go off-screen
    if (x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 8;
    }

    // Adjust vertical position if menu would go off-screen
    if (y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 8;
    }

    // Ensure menu doesn't go above the top of the screen
    if (adjustedY < 8) {
      adjustedY = 8;
    }

    // Ensure menu doesn't go past the left edge
    if (adjustedX < 8) {
      adjustedX = 8;
    }

    setPosition({ x: adjustedX, y: adjustedY });
  }, [visible, x, y]);

  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-50 bg-neutral-900/95 backdrop-blur-md border border-neutral-700/50 rounded-lg shadow-xl py-2 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-100"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div key={`separator-${index}`} className="my-1 border-t border-neutral-700/50" />
          );
        }

        const IconComponent = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={`
              w-full px-3 py-2 text-left text-sm flex items-center gap-3 transition-colors
              ${item.disabled 
                ? 'text-neutral-500 cursor-not-allowed' 
                : item.danger
                  ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                  : 'text-neutral-200 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            {IconComponent && (
              <IconComponent className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  // Use portal to render menu at document root to avoid z-index issues
  return typeof document !== 'undefined' 
    ? createPortal(menuContent, document.body)
    : null;
}

// Hook for managing context menu state
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
  }>({
    visible: false,
    x: 0,
    y: 0,
    items: []
  });

  const showContextMenu = (event: React.MouseEvent, items: ContextMenuItem[]) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      items
    });
  };

  const hideContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu
  };
}
