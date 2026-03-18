import { useState } from 'react';
import { Heart, Smile, Laugh, Frown, ThumbsUp } from 'lucide-react';

interface ReactionPickerProps {
  onReactionSelect: (reaction: string) => void;
  currentReaction?: string;
}

const REACTIONS = [
  { type: 'like', icon: Heart, label: 'Like', color: 'text-red-500' },
  { type: 'love', icon: Heart, label: 'Love', color: 'text-pink-500' },
  { type: 'laugh', icon: Laugh, label: 'Laugh', color: 'text-yellow-500' },
  { type: 'sad', icon: Frown, label: 'Sad', color: 'text-blue-500' },
  { type: 'angry', icon: ThumbsUp, label: 'Angry', color: 'text-orange-500' }
];

export default function ReactionPicker({ onReactionSelect, currentReaction }: ReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleSelect = (reactionType: string) => {
    onReactionSelect(reactionType);
    setShowPicker(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-2 hover:text-red-500 transition-colors group"
      >
        <div className="p-2 rounded-full group-hover:bg-red-50 transition-colors">
          <Heart className={`w-5 h-5 ${currentReaction ? 'fill-current text-red-500' : ''}`} />
        </div>
      </button>

      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-full shadow-lg z-50 flex gap-2 p-2">
            {REACTIONS.map((reaction) => {
              const Icon = reaction.icon;
              return (
                <button
                  key={reaction.type}
                  onClick={() => handleSelect(reaction.type)}
                  className={`p-2 rounded-full hover:bg-gray-100 transition-all hover:scale-110 ${
                    currentReaction === reaction.type ? 'bg-gray-100' : ''
                  }`}
                  title={reaction.label}
                >
                  <Icon className={`w-5 h-5 ${reaction.color}`} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
