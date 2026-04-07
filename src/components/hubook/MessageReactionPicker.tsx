import { useState, useRef, useEffect } from 'react';
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
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showPicker && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPickerPosition({
        top: rect.top - 50,
        left: rect.left
      });
    }
  }, [showPicker]);

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
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowPicker(!showPicker)}
        className="p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
        title="Add reaction"
      >
        <Smile className="w-4 h-4 text-gray-500" />
      </button>

      {showPicker && pickerPosition && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setShowPicker(false)}
          />
          <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-xl p-2 flex gap-1 z-[101] whitespace-nowrap"
            style={{
              top: `${pickerPosition.top}px`,
              left: `${pickerPosition.left}px`
            }}
          >
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
