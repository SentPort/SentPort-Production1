import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Star, Eye, EyeOff, Trash2 } from 'lucide-react';

interface Props {
  isFavorite: boolean;
  isHidden: boolean;
  onToggleFavorite: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}

export default function BlogConversationOptionsMenu({
  isFavorite,
  isHidden,
  onToggleFavorite,
  onToggleHidden,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
        title="Conversation options"
      >
        <MoreHorizontal className="w-4 h-4 text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1 overflow-hidden">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-500'}`} />
            <span className="text-sm text-gray-700">{isFavorite ? 'Unfavorite' : 'Favorite'}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHidden();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
          >
            {isHidden ? (
              <Eye className="w-4 h-4 text-gray-500" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-500" />
            )}
            <span className="text-sm text-gray-700">{isHidden ? 'Unhide' : 'Hide'}</span>
          </button>

          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-50 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600">Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
