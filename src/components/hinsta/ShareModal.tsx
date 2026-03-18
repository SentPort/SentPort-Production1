import { useState } from 'react';
import { X, Link as LinkIcon, Check, MessageCircle } from 'lucide-react';

interface ShareModalProps {
  post: any;
  authorAccount: any;
  onClose: () => void;
}

export default function ShareModal({ post, authorAccount, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const postUrl = `${window.location.origin}/hinsta/post/${post.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShareToMessages = () => {
    window.location.href = `/hinsta/messages?sharePost=${post.id}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Share Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  {authorAccount?.avatar_url ? (
                    <img
                      src={authorAccount.avatar_url}
                      alt={authorAccount.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                      {authorAccount?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">{authorAccount?.username || 'User'}</p>
                <p className="text-xs text-gray-500">
                  {post.caption?.substring(0, 50)}
                  {post.caption?.length > 50 ? '...' : ''}
                </p>
              </div>
            </div>
            {post.media_urls?.[0] && (
              <img
                src={post.media_urls[0]}
                alt="Post preview"
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleShareToMessages}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Send in Direct Message</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-600">Link Copied!</span>
                </>
              ) : (
                <>
                  <LinkIcon className="w-5 h-5" />
                  <span className="font-medium">Copy Link</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Share this post with your friends via direct message or copy the link to share anywhere!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
