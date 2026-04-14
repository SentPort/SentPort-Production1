import { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ChatMessageReactionPickerProps {
  messageId: string;
  accountId: string;
  userReaction?: string | null;
  table: 'heddit_message_reactions' | 'blog_message_reactions';
  onReactionChange?: () => void;
  accentColor?: string;
}

const AVAILABLE_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '😡', '🎉', '🔥'];

export function ChatMessageReactionPicker({
  messageId,
  accountId,
  userReaction,
  table,
  onReactionChange,
  accentColor = 'bg-blue-100',
}: ChatMessageReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showPicker && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const pickerWidth = AVAILABLE_EMOJIS.length * 44;
      const left = Math.min(rect.left, window.innerWidth - pickerWidth - 8);
      setPickerPosition({
        top: rect.top - 54,
        left: Math.max(8, left),
      });
    }
  }, [showPicker]);

  const handleReaction = async (emoji: string) => {
    if (!accountId || loading) return;

    setLoading(true);
    try {
      if (userReaction === emoji) {
        await supabase
          .from(table)
          .delete()
          .eq('message_id', messageId)
          .eq('account_id', accountId)
          .eq('emoji', emoji);
      } else {
        if (userReaction) {
          await supabase
            .from(table)
            .delete()
            .eq('message_id', messageId)
            .eq('account_id', accountId);
        }

        await supabase.from(table).insert({
          message_id: messageId,
          account_id: accountId,
          emoji,
        });
      }

      onReactionChange?.();
      setShowPicker(false);
    } catch (error) {
      console.error('Error updating reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowPicker(!showPicker)}
        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
        title="Add reaction"
      >
        <Smile className="w-4 h-4 text-gray-400" />
      </button>

      {showPicker && pickerPosition && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setShowPicker(false)}
          />
          <div
            className="fixed bg-white border border-gray-200 rounded-xl shadow-xl p-2 flex gap-1 z-[101]"
            style={{ top: `${pickerPosition.top}px`, left: `${pickerPosition.left}px` }}
          >
            {AVAILABLE_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                disabled={loading}
                className={`text-2xl hover:scale-125 transition-transform p-1 rounded-lg ${
                  userReaction === emoji ? accentColor : ''
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
