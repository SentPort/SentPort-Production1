import { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, Loader2, BarChart2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { compressImage } from '../../lib/imageCompression';
import EmojiPicker from './EmojiPicker';
import GifPicker from './GifPicker';

interface CreateTweetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const STORAGE_KEY = 'switter_draft_tweet';

export default function CreateTweetModal({ onClose, onSuccess }: CreateTweetModalProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState(1440);
  const hadContentRef = useRef(false);
  const mountPathRef = useRef(location.pathname);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setContent(data.content || '');
        setMediaUrls(data.mediaUrls || []);
        setShowPoll(data.showPoll || false);
        setPollOptions(data.pollOptions || ['', '']);
        setPollDuration(data.pollDuration || 1440);
        if (data.content || data.mediaUrls?.length > 0 || data.showPoll) {
          hadContentRef.current = true;
        }
      } catch (e) {
        console.error('Error restoring draft:', e);
      }
    }

    return () => {
      if (location.pathname !== mountPathRef.current) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    };
  }, [location.pathname]);

  useEffect(() => {
    if (content || mediaUrls.length > 0 || showPoll) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        content,
        mediaUrls,
        showPoll,
        pollOptions,
        pollDuration
      }));
      hadContentRef.current = true;
    } else if (hadContentRef.current && !content && mediaUrls.length === 0 && !showPoll) {
      sessionStorage.removeItem(STORAGE_KEY);
      hadContentRef.current = false;
    }
  }, [content, mediaUrls, showPoll, pollOptions, pollDuration]);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || !user) return;

    const newFiles = Array.from(files).slice(0, 4 - mediaFiles.length);
    setMediaFiles([...mediaFiles, ...newFiles]);

    const urls = await Promise.all(
      newFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      })
    );

    setMediaUrls([...mediaUrls, ...urls]);
  };

  const removeImage = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!content.trim() && mediaFiles.length === 0)) return;

    setUploading(true);
    setError('');

    try {
      const { data: account } = await supabase
        .from('switter_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!account) throw new Error('Account not found');

      const uploadedUrls: string[] = [];

      for (const file of mediaFiles) {
        const compressed = await compressImage(file, 1920, 85);
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('switter-media')
          .upload(fileName, compressed);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('switter-media')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      const { data: tweetData, error: insertError } = await supabase
        .from('switter_tweets')
        .insert({
          author_id: account.id,
          content: content.trim(),
          media_url: uploadedUrls.length > 0 ? uploadedUrls[0] : null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (showPoll && pollOptions.filter(o => o.trim()).length >= 2 && tweetData) {
        const endsAt = new Date();
        endsAt.setMinutes(endsAt.getMinutes() + pollDuration);

        const { data: pollData, error: pollError } = await supabase
          .from('switter_polls')
          .insert({
            tweet_id: tweetData.id,
            duration_minutes: pollDuration,
            ends_at: endsAt.toISOString()
          })
          .select()
          .single();

        if (!pollError && pollData) {
          const validOptions = pollOptions.filter(o => o.trim());
          await Promise.all(
            validOptions.map((option, index) =>
              supabase
                .from('switter_poll_options')
                .insert({
                  poll_id: pollData.id,
                  option_text: option.trim(),
                  option_position: index + 1
                })
            )
          );
        }
      }

      sessionStorage.removeItem(STORAGE_KEY);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to post sweet');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const characterCount = content.length;
  const maxCharacters = 280;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || (!content.trim() && mediaFiles.length === 0) || characterCount > maxCharacters}
            className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Posting...
              </span>
            ) : (
              'Post Sweet'
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
            placeholder="What's on your mind?"
            className="w-full text-xl resize-none border-none focus:outline-none"
            rows={4}
            maxLength={maxCharacters}
          />

          {mediaUrls.length > 0 && (
            <div className={`grid gap-2 mb-4 ${mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {mediaUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt=""
                    className="rounded-lg w-full object-cover max-h-64"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 bg-black bg-opacity-75 hover:bg-opacity-90 rounded-full text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showPoll && (
            <div className="mb-4 p-4 border border-gray-200 rounded-lg">
              <h3 className="font-bold mb-3">Poll Options</h3>
              {pollOptions.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...pollOptions];
                    newOptions[index] = e.target.value;
                    setPollOptions(newOptions);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                />
              ))}
              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-blue-500 text-sm font-medium"
                >
                  + Add option
                </button>
              )}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poll duration
                </label>
                <select
                  value={pollDuration}
                  onChange={(e) => setPollDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={60}>1 hour</option>
                  <option value={360}>6 hours</option>
                  <option value={1440}>1 day</option>
                  <option value={4320}>3 days</option>
                  <option value={10080}>7 days</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <label className="p-2 hover:bg-blue-50 rounded-full cursor-pointer transition-colors">
                <ImageIcon className="w-5 h-5 text-blue-500" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                  disabled={mediaFiles.length >= 4 || showPoll}
                />
              </label>
              <GifPicker onGifSelect={(gifUrl) => {
                setMediaUrls([gifUrl]);
                setMediaFiles([]);
              }} />
              <EmojiPicker onEmojiSelect={(emoji) => setContent(content + emoji)} />
              <button
                type="button"
                onClick={() => setShowPoll(!showPoll)}
                disabled={mediaFiles.length > 0}
                className={`p-2 rounded-full transition-colors ${
                  showPoll
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-blue-50 text-blue-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <BarChart2 className="w-5 h-5" />
              </button>
            </div>

            <div className={`text-sm ${characterCount > maxCharacters ? 'text-red-500' : 'text-gray-500'}`}>
              {characterCount}/{maxCharacters}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
