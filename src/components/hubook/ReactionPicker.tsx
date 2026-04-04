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
  const buttonRef = useRef<HTMLButtonElement>(null);

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

    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width
        });
        setShowPicker(true);
      }
    }, 100);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    closeTimeoutRef.current = setTimeout(() => {
      setShowPicker(false);
    }, 200);
  };

  const handleReact = (type: ReactionType) => {
    onReact(type);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
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
        onClick={() => {
          if (currentReaction) {
            onReact(currentReaction);
          }
        }}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
          currentReaction
            ? 'bg-blue-50 text-blue-600 font-semibold'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        {currentReactionData ? (
          <>
            <span className="text-lg">{currentReactionData.emoji}</span>
            <span className="text-sm">{currentReactionData.label}</span>
          </>
        ) : (
          <>
            <span className="text-lg">❤️</span>
            <span className="text-sm font-medium">React</span>
          </>
        )}
      </button>

      {showPicker && createPortal(
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'fixed',
            top: `${buttonPosition.top - pickerHeight - 8}px`,
            left: alignRight ? `${buttonPosition.left}px` : `${buttonPosition.left + buttonPosition.width - 320}px`,
            zIndex: 9999
          }}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 p-3"
        >
          <div className="flex gap-1">
            {reactions.map((reaction) => (
              <button
                key={reaction.type}
                type="button"
                onClick={() => handleReact(reaction.type)}
                className="group relative p-2 hover:scale-125 transition-transform hover:bg-gray-100 rounded-lg"
                title={reaction.label}
              >
                <span className="text-2xl">{reaction.emoji}</span>
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
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
