import { useState, useRef, useEffect } from 'react';
import { X, Share2, Globe, Users as FriendsIcon, Lock, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';

interface ShareModalProps {
  post: any;
  author: any;
  media?: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShareModal({ post, author, media = [], onClose, onSuccess }: ShareModalProps) {
  const { hubookProfile } = useHuBook();
  const navigate = useNavigate();
  const [shareComment, setShareComment] = useState('');
  const [sharePrivacy, setSharePrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPrivacyDropdown(false);
      }
    };

    if (showPrivacyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPrivacyDropdown]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hubookProfile) return;

    setLoading(true);
    setError('');

    try {
      const { error: shareError } = await supabase.from('shares').insert({
        user_id: hubookProfile.id,
        post_id: post.id,
        shared_to: 'feed',
        share_text: shareComment.trim() || null
      });

      if (shareError) {
        if (shareError.code === '23505') {
          setError('You have already shared this post');
        } else {
          throw shareError;
        }
        return;
      }

      onSuccess();
      onClose();

      navigate('/hubook/');
    } catch (err: any) {
      console.error('Error sharing post:', err);
      setError('Failed to share post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const privacyOptions = [
    { value: 'public' as const, label: 'Public', icon: Globe, description: 'Anyone can see this' },
    { value: 'friends' as const, label: 'Friends', icon: FriendsIcon, description: 'Only friends can see this' },
    { value: 'private' as const, label: 'Only Me', icon: Lock, description: 'Only you can see this' }
  ];

  const selectedOption = privacyOptions.find(opt => opt.value === sharePrivacy) || privacyOptions[0];
  const SelectedIcon = selectedOption.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Share Post</h2>
              <p className="text-sm text-gray-600">Share to your feed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleShare} className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Add a comment (optional)
            </label>
            <textarea
              value={shareComment}
              onChange={(e) => setShareComment(e.target.value)}
              placeholder="What do you think about this?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {shareComment.length}/500
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Who can see this?
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <div className="flex items-center gap-2">
                  <SelectedIcon className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900">{selectedOption.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showPrivacyDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showPrivacyDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {privacyOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSharePrivacy(option.value);
                          setShowPrivacyDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                          sharePrivacy === option.value ? 'bg-blue-50' : ''
                        }`}
                      >
                        <Icon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{option.label}</div>
                          <div className="text-xs text-gray-600">{option.description}</div>
                        </div>
                        {sharePrivacy === option.value && (
                          <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg mb-6">
            <div className="text-xs font-semibold text-gray-500 uppercase p-4 pb-2">
              Sharing this post
            </div>
            <div className="max-h-80 overflow-y-auto px-4 pb-4">
              <div className="flex items-start gap-3">
                {author?.profile_photo_url ? (
                  <img
                    src={author.profile_photo_url}
                    alt={author.display_name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {author?.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{author?.display_name}</div>
                  <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                    {post.content}
                  </div>

                  {/* Media Preview */}
                  {media && media.length > 0 && (
                    <div className={`mt-3 ${
                      media.length === 1 ? '' :
                      media.length === 2 ? 'grid grid-cols-2 gap-2' :
                      'grid grid-cols-2 gap-2'
                    }`}>
                      {media.slice(0, 4).map((item, index) => (
                        <div
                          key={item.id}
                          className={`relative rounded-lg overflow-hidden ${
                            media.length === 1 ? '' : 'h-24'
                          } ${
                            media.length === 3 && index === 0 ? 'col-span-2' : ''
                          }`}
                        >
                          {item.media_type === 'image' ? (
                            <img
                              src={item.media_url}
                              alt=""
                              className={`w-full ${media.length === 1 ? 'h-auto' : 'h-full object-cover'}`}
                            />
                          ) : (
                            <div className="relative w-full h-full">
                              <video
                                src={item.media_url}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                <div className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                                  <div className="w-0 h-0 border-t-6 border-t-transparent border-l-10 border-l-gray-800 border-b-6 border-b-transparent ml-1"></div>
                                </div>
                              </div>
                            </div>
                          )}
                          {media.length > 4 && index === 3 && (
                            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">+{media.length - 4}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sharing...' : 'Share to Feed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
