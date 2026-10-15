import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, DoorOpen, Gamepad2, Download, ChevronRight } from 'lucide-react';

export interface MenuItemData {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string | number | null;
  onClick: () => void;
  visible?: boolean;
}

interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItemData[];
  activeRoomsCount?: number;
}

export const MenuDropdown: React.FC<MenuDropdownProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  const visibleItems = items.filter((item) => item.visible !== false);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Focus management: focus first item on open
  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow animation frame and mount
      const timer = setTimeout(() => {
        if (itemRefs.current[0]) {
          itemRefs.current[0].focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation & Focus trap
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const count = visibleItems.length;
    if (count === 0) return;

    const currentIndex = itemRefs.current.findIndex((el) => el === document.activeElement);

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % count;
      itemRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex === -1 ? count - 1 : (currentIndex - 1 + count) % count;
      itemRefs.current[prevIndex]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      itemRefs.current[count - 1]?.focus();
    } else if (e.key === 'Tab') {
      // Focus trap within menu items
      if (e.shiftKey) {
        if (currentIndex <= 0) {
          e.preventDefault();
          itemRefs.current[count - 1]?.focus();
        }
      } else {
        if (currentIndex === count - 1 || currentIndex === -1) {
          e.preventDefault();
          itemRefs.current[0]?.focus();
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 1. Dimmed Backdrop behind menu */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs overscroll-contain"
            aria-hidden="true"
          />

          {/* 2. Menu Dropdown Panel (Anchored above Menu Tab, opens upward) */}
          <div className="fixed bottom-[calc(60px+max(0.375rem,env(safe-area-inset-bottom)))] left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
            <motion.div
              ref={menuContainerRef}
              role="menu"
              aria-label="Application Menu"
              aria-orientation="vertical"
              onKeyDown={handleKeyDown}
              initial={{ opacity: 0, scale: 0.88, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 14 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'bottom center' }}
              className="pointer-events-auto relative w-full max-w-xs sm:max-w-sm bg-[#141d33] border border-[#26314d] rounded-2xl p-2 shadow-2xl shadow-black/80 flex flex-col gap-1 select-none focus:outline-none"
            >
              {visibleItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => {
                    onClose();
                    item.onClick();
                  }}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.035, duration: 0.15 }}
                  className="h-12 min-h-[48px] w-full px-3 flex items-center justify-between rounded-xl hover:bg-white/5 active:bg-[#ff7a00]/15 focus:bg-[#ff7a00]/15 focus:outline-none transition-colors group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-[#ff7a00]/20 flex items-center justify-center text-gray-300 group-hover:text-[#ff7a00] group-focus:text-[#ff7a00] transition-colors shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-white group-hover:text-[#ff7a00] group-focus:text-[#ff7a00] transition-colors leading-tight">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-gray-400 group-hover:text-gray-300 truncate leading-tight mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {item.badge !== undefined && item.badge !== null && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#ff7a00] text-black shrink-0 animate-pulse">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </div>
                </motion.button>
              ))}

              {/* Small arrow pointing directly down at the Menu tab button */}
              <div
                aria-hidden="true"
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#141d33] border-r border-b border-[#26314d]"
              />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
