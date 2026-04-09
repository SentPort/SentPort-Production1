import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Star, EyeOff, Eye, Trash2 } from 'lucide-react';

interface ConversationOptionsMenuProps {
  conversationId: string;
  isFavorite: boolean;
  isHidden: boolean;
  onToggleFavorite: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}

export function ConversationOptionsMenu({
  conversationId,
  isFavorite,
  isHidden,
  onToggleFavorite,
  onToggleHidden,
  onDelete
}: ConversationOptionsMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  return (
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="p-1.5 rounded-full hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
        title="Conversation options"
      >
        <MoreVertical className="w-4 h-4 text-gray-600" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
          <button
            onClick={() => handleAction(onToggleFavorite)}
            className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}`} />
            <span className="text-gray-700">{isFavorite ? 'Unfavorite' : 'Favorite'}</span>
          </button>

          <button
            onClick={() => handleAction(onToggleHidden)}
            className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
          >
            {isHidden ? (
              <Eye className="w-4 h-4 text-gray-500" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-500" />
            )}
            <span className="text-gray-700">{isHidden ? 'Unhide' : 'Hide'}</span>
          </button>

          <div className="border-t border-gray-100 my-1" />

          <button
            onClick={() => handleAction(onDelete)}
            className="w-full px-4 py-2.5 text-left hover:bg-red-50 flex items-center gap-3 text-sm text-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Delete Conversation
          </button>
        </div>
      )}
    </div>
  );
}
