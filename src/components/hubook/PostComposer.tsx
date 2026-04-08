import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Globe, Users as FriendsIcon, Lock } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';
import MediaUploader from './MediaUploader';
import HuBookMentionTextarea from './HuBookMentionTextarea';
import { saveHuBookMentions } from '../../lib/hubookMentionHelpers';

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
  const privacyLoadedRef = useRef(false);

  useEffect(() => {
    const loadUserPrivacyDefault = async () => {
      if (!hubookProfile || privacyLoadedRef.current) return;

      try {
        const { data, error } = await supabase
          .from('user_privacy_settings')
          .select('post_visibility_default')
          .eq('user_id', hubookProfile.id)
          .maybeSingle();

        if (error) throw error;

        if (data && data.post_visibility_default) {
          setPrivacy(data.post_visibility_default as 'public' | 'friends' | 'private');
        }
        privacyLoadedRef.current = true;
      } catch (error) {
        console.error('Error loading privacy default:', error);
      }
    };

    loadUserPrivacyDefault();
  }, [hubookProfile]);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setContent(data.content || '');
        if (data.privacy) {
          setPrivacy(data.privacy);
        }
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
        await saveHuBookMentions('post', post.id, content.trim(), hubookProfile.id);
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
      setShowMediaUploader(false);

      const { data } = await supabase
        .from('user_privacy_settings')
        .select('post_visibility_default')
        .eq('user_id', hubookProfile.id)
        .maybeSingle();

      setPrivacy(data?.post_visibility_default || 'public');

      await onPostCreated?.();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 sm:gap-3 mb-3 sm:mb-4">
          {hubookProfile?.profile_photo_url ? (
            <img
              src={hubookProfile.profile_photo_url}
              alt={hubookProfile.display_name}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm sm:text-base">
              {hubookProfile?.display_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <HuBookMentionTextarea
              value={content}
              onChange={setContent}
              placeholder={placeholder || `What's on your mind, ${hubookProfile?.display_name}?`}
              rows={3}
            />
          </div>
        </div>

        {showMediaUploader && (
          <div className="mb-3 sm:mb-4">
            <MediaUploader
              onMediaChange={handleMediaChange}
              maxFiles={10}
            />
          </div>
        )}

        <div className="border-t border-gray-200 pt-3 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowMediaUploader(!showMediaUploader)}
              className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors touch-manipulation min-h-[44px] sm:min-h-0 ${
                showMediaUploader
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
              }`}
            >
              <ImageIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm sm:text-base font-medium">Photo/Video</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as any)}
              className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm touch-manipulation min-h-[44px] sm:min-h-0"
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
              className="px-4 sm:px-6 py-2 bg-blue-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation min-h-[44px] sm:min-h-0 whitespace-nowrap"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
