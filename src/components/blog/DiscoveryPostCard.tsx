import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, ThumbsUp, Eye, Info } from 'lucide-react';
import DiscoveryInfoModal from './DiscoveryInfoModal';
import { getExcerpt } from '../../lib/htmlHelpers';

interface DiscoveryPostCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    created_at: string;
    account_id: string;
    author_name?: string;
    author_username?: string;
    interest_name?: string;
    engagement_metrics?: {
      view_count: number;
      like_count: number;
      comment_count: number;
    };
  };
}

export default function DiscoveryPostCard({ post }: DiscoveryPostCardProps) {
  const navigate = useNavigate();
  const [showInfoModal, setShowInfoModal] = useState(false);

  const excerpt = getExcerpt(post.content, 200);

  const metrics = post.engagement_metrics || {
    view_count: 0,
    like_count: 0,
    comment_count: 0
  };

  return (
    <>
      <div className="bg-gradient-to-br from-teal-900/40 to-cyan-900/40 rounded-lg shadow-md border-2 border-teal-500/30 overflow-hidden hover:shadow-lg transition-shadow backdrop-blur">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-teal-200 rounded-full animate-pulse"></div>
            <span className="text-white font-semibold text-sm">
              Discover Something New
            </span>
            {post.interest_name && (
              <span className="text-teal-100 text-xs">
                • {post.interest_name}
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfoModal(true);
            }}
            className="text-white hover:text-teal-100 transition-colors p-1 rounded-full hover:bg-teal-700"
            aria-label="Information about discovery posts"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        <div
          onClick={() => navigate(`/blog/post/${post.id}`)}
          className="p-6 cursor-pointer"
        >
          <h3 className="text-xl font-bold text-white mb-2 hover:text-teal-300 transition-colors">
            {post.title}
          </h3>

          <div className="flex items-center gap-2 text-sm text-gray-300 mb-3">
            {post.author_username ? (
              <Link
                to={`/blog/profile/${post.author_username}`}
                onClick={(e) => e.stopPropagation()}
                className="font-medium hover:text-teal-300 transition-colors hover:underline"
              >
                {post.author_name || 'Anonymous'}
              </Link>
            ) : (
              <span className="font-medium">{post.author_name || 'Anonymous'}</span>
            )}
            <span>•</span>
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
          </div>

          <p className="text-gray-200 mb-4 leading-relaxed">
            {excerpt}
          </p>

          <div className="flex items-center gap-6 text-sm text-gray-300">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{metrics.view_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" />
              <span>{metrics.like_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{metrics.comment_count}</span>
            </div>
          </div>
        </div>

        <div className="bg-teal-900/30 px-4 py-2 border-t border-teal-500/30">
          <p className="text-xs text-teal-300 italic">
            This post is from a category outside your usual interests. Click to explore!
          </p>
        </div>
      </div>

      <DiscoveryInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </>
  );
}
