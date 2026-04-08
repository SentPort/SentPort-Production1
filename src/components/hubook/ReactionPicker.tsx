import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry' | 'care';

interface ReactionPickerProps {
  onReact: (type: ReactionType) => void;
  currentReaction?: ReactionType | null;
  alignRight?: boolean;
}

const reactions = [
  { type: 'like' as ReactionType, emoji: '👍', label: 'Like' },
  { type: 'love' as ReactionType, emoji: '❤️', label: 'Love' },
  { type: 'laugh' as ReactionType, emoji: '😂', label: 'Laugh' },
  { type: 'wow' as ReactionType, emoji: '😮', label: 'Wow' },
  { type: 'sad' as ReactionType, emoji: '😢', label: 'Sad' },
  { type: 'angry' as ReactionType, emoji: '😠', label: 'Angry' },
  { type: 'care' as ReactionType, emoji: '🤗', label: 'Care' }
];

export default function ReactionPicker({ onReact, currentReaction, alignRight = false }: ReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0 });
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouchDevice();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setShowPicker(false);
    };

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        showPicker &&
        pickerRef.current &&
        buttonRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, [showPicker]);

  const updateButtonPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width
      });
    }
  };

  const handleMouseEnter = () => {
    if (isTouchDevice) return;

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      updateButtonPosition();
      setShowPicker(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (isTouchDevice) return;

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    closeTimeoutRef.current = setTimeout(() => {
      setShowPicker(false);
    }, 200);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();

    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    longPressTimeoutRef.current = setTimeout(() => {
      updateButtonPosition();
      setShowPicker(true);
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }, 300);
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleButtonClick = () => {
    if (isTouchDevice && !showPicker) {
      updateButtonPosition();
      setShowPicker(true);
    } else if (currentReaction) {
      onReact(currentReaction);
    }
  };

  const handleReact = (type: ReactionType) => {
    onReact(type);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    setShowPicker(false);
  };

  const currentReactionData = reactions.find((r) => r.type === currentReaction);

  const pickerHeight = 70;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={isTouchDevice ? handleTouchStart : undefined}
        onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
        onClick={handleButtonClick}
        className={`flex items-center gap-1 px-3 py-1.5 sm:px-3 sm:py-1.5 md:px-3 md:py-1.5 rounded-lg transition-colors touch-manipulation select-none min-h-[44px] md:min-h-0 ${
          currentReaction
            ? 'bg-blue-50 text-blue-600 font-semibold'
            : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
        }`}
      >
        {currentReactionData ? (
          <>
            <span className="text-lg sm:text-lg md:text-lg">{currentReactionData.emoji}</span>
            <span className="text-sm hidden sm:inline">{currentReactionData.label}</span>
          </>
        ) : (
          <>
            <span className="text-lg sm:text-lg md:text-lg">❤️</span>
            <span className="text-sm font-medium hidden sm:inline">React</span>
            <span className="text-xs font-medium sm:hidden">React</span>
          </>
        )}
      </button>

      {showPicker && createPortal(
        <div
          ref={pickerRef}
          onMouseEnter={!isTouchDevice ? handleMouseEnter : undefined}
          onMouseLeave={!isTouchDevice ? handleMouseLeave : undefined}
          style={{
            position: 'fixed',
            top: `${Math.max(8, buttonPosition.top - pickerHeight - 8)}px`,
            left: alignRight
              ? `${Math.min(buttonPosition.left, window.innerWidth - 360)}px`
              : `${Math.max(8, Math.min(buttonPosition.left + buttonPosition.width - 320, window.innerWidth - 328))}px`,
            zIndex: 9999
          }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex gap-1 sm:gap-1">
            {reactions.map((reaction) => (
              <button
                key={reaction.type}
                type="button"
                onClick={() => handleReact(reaction.type)}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleReact(reaction.type);
                }}
                className="group relative p-2 sm:p-2 md:p-2 hover:scale-110 sm:hover:scale-125 active:scale-95 transition-transform hover:bg-gray-100 active:bg-gray-200 rounded-lg touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                title={reaction.label}
              >
                <span className="text-2xl sm:text-2xl md:text-2xl">{reaction.emoji}</span>
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
                  {reaction.label}
                </span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
