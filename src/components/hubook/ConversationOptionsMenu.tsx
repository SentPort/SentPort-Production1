import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Star, Eye, EyeOff, Trash2 } from 'lucide-react';

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
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        title="Conversation options"
      >
        <MoreVertical className="w-5 h-5 text-gray-600" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
          <button
            onClick={() => handleAction(onToggleFavorite)}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
            {isFavorite ? 'Unfavorite' : 'Favorite'}
          </button>

          <button
            onClick={() => handleAction(onToggleHidden)}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
          >
            {isHidden ? (
              <Eye className="w-4 h-4 text-gray-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-600" />
            )}
            {isHidden ? 'Unhide' : 'Hide'}
          </button>

          <div className="border-t border-gray-200 my-1" />

          <button
            onClick={() => handleAction(onDelete)}
            className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-3 text-sm text-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Delete Conversation
          </button>
        </div>
      )}
    </div>
  );
}
