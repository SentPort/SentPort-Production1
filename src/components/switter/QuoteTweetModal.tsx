import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from '../../lib/platformHelpers';

interface QuoteTweetModalProps {
  onClose: () => void;
  onSuccess: () => void;
  originalTweet: {
    id: string;
    content: string;
    created_at: string;
    author: {
      handle: string;
      display_name: string;
      avatar_url: string;
      verified_badge: boolean;
    };
  };
}

export default function QuoteTweetModal({ onClose, onSuccess, originalTweet }: QuoteTweetModalProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;

    setPosting(true);
    setError('');

    try {
      const { data: account } = await supabase
        .from('switter_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!account) throw new Error('Account not found');

      const { error: insertError } = await supabase
        .from('switter_tweets')
        .insert({
          author_id: account.id,
          content: content.trim(),
          retweet_of_id: originalTweet.id
        });

      if (insertError) throw insertError;

      await supabase.rpc('increment', {
        row_id: originalTweet.id,
        table_name: 'switter_tweets',
        column_name: 'retweet_count'
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to post quote sweet');
    } finally {
      setPosting(false);
    }
  };

  const characterCount = content.length;
  const maxCharacters = 280;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={posting || !content.trim() || characterCount > maxCharacters}
            className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Posting...
              </span>
            ) : (
              'Quote Sweet'
            )}
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            className="w-full text-xl resize-none border-none focus:outline-none mb-4"
            rows={3}
            maxLength={maxCharacters}
            autoFocus
          />

          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex gap-3">
              <img
                src={originalTweet.author.avatar_url || 'https://via.placeholder.com/40'}
                alt={originalTweet.author.display_name}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold">{originalTweet.author.display_name}</span>
                  {originalTweet.author.verified_badge && (
                    <span className="text-blue-500">✓</span>
                  )}
                  <span className="text-gray-500">@{originalTweet.author.handle}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-500 text-sm">
                    {formatDistanceToNow(originalTweet.created_at)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{originalTweet.content}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4">
            <div className={`text-sm ${characterCount > maxCharacters ? 'text-red-500' : 'text-gray-500'}`}>
              {characterCount}/{maxCharacters}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
