import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Globe, Users as FriendsIcon, Lock } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';
import MediaUploader from './MediaUploader';
import CustomMentionTextarea from './CustomMentionTextarea';
import { saveMentions } from '../../lib/mentionHelpers';

interface PostComposerProps {
  onPostCreated?: () => void;
  placeholder?: string;
}

const STORAGE_KEY = 'hubook_draft_post';

export default function PostComposer({ onPostCreated, placeholder }: PostComposerProps) {
  const { hubookProfile } = useHuBook();
  const location = useLocation();
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const hadContentRef = useRef(false);
  const mountPathRef = useRef(location.pathname);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setContent(data.content || '');
        setPrivacy(data.privacy || 'public');
        setMediaUrls(data.mediaUrls || []);
        if (data.mediaUrls && data.mediaUrls.length > 0) {
          setShowMediaUploader(true);
        }
        if (data.content || data.mediaUrls?.length > 0) {
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
    if (content || mediaUrls.length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ content, privacy, mediaUrls }));
      hadContentRef.current = true;
    } else if (hadContentRef.current && !content && mediaUrls.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
      hadContentRef.current = false;
    }
  }, [content, privacy, mediaUrls]);

  const privacyOptions = [
    { value: 'public', label: 'Public', icon: Globe, description: 'Anyone can see' },
    { value: 'friends', label: 'Friends', icon: FriendsIcon, description: 'Only friends' },
    { value: 'private', label: 'Private', icon: Lock, description: 'Only you' }
  ];

  const handleMediaChange = (urls: string[]) => {
    setMediaUrls(urls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !hubookProfile) return;

    setLoading(true);

    try {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: hubookProfile.id,
          content: content.trim(),
          privacy
        })
        .select()
        .single();

      if (postError) throw postError;

      if (post) {
        await saveMentions('post', post.id, content.trim(), hubookProfile.id);
      }

      if (mediaUrls.length > 0 && post) {
        const mediaInserts = mediaUrls.map((url, index) => ({
          post_id: post.id,
          media_url: url,
          media_type: url.match(/\.(mp4|mov|avi|webm)$/i) ? 'video' : 'image',
          display_order: index
        }));

        const { error: mediaError } = await supabase
          .from('post_media')
          .insert(mediaInserts);

        if (mediaError) throw mediaError;
      }

      sessionStorage.removeItem(STORAGE_KEY);
      setContent('');
      setMediaUrls([]);
      setPrivacy('public');
      setShowMediaUploader(false);
      await onPostCreated?.();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3 mb-4">
          {hubookProfile?.profile_photo_url ? (
            <img
              src={hubookProfile.profile_photo_url}
              alt={hubookProfile.display_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
              {hubookProfile?.display_name.charAt(0).toUpperCase()}
            </div>
          )}

          <CustomMentionTextarea
            value={content}
            onChange={setContent}
            placeholder={placeholder || `What's on your mind, ${hubookProfile?.display_name}?`}
            className="flex-1"
            rows={3}
          />
        </div>

        {showMediaUploader && (
          <div className="mb-4">
            <MediaUploader
              onMediaChange={handleMediaChange}
              maxFiles={10}
            />
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowMediaUploader(!showMediaUploader)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showMediaUploader
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ImageIcon className="w-5 h-5 text-green-500" />
              <span className="hidden sm:inline font-medium">Photo/Video</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              {privacyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={!content.trim() || loading}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
