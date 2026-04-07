import { useState } from 'react';
import { Smile } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface MessageReactionPickerProps {
  messageId: string;
  userReaction?: string | null;
  onReactionChange?: () => void;
}

const AVAILABLE_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '😡', '🎉', '🔥'];

export function MessageReactionPicker({ messageId, userReaction, onReactionChange }: MessageReactionPickerProps) {
  const { user } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReaction = async (emoji: string) => {
    if (!user || loading) return;

    setLoading(true);
    try {
      if (userReaction === emoji) {
        await supabase
          .from('hubook_message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
      } else {
        if (userReaction) {
          await supabase
            .from('hubook_message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', user.id);
        }

        await supabase
          .from('hubook_message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji
          });
      }

      onReactionChange?.();
      setShowPicker(false);
    } catch (error) {
      console.error('Error adding reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
        title="Add reaction"
      >
        <Smile className="w-4 h-4 text-gray-500" />
      </button>

      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-2 flex gap-1 z-50 whitespace-nowrap">
            {AVAILABLE_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                disabled={loading}
                className={`text-2xl hover:scale-125 transition-transform p-1 rounded ${
                  userReaction === emoji ? 'bg-blue-100' : ''
                }`}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
