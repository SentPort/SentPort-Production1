import { Eye, MessageCircle, Calendar, User, Pin, Sparkles, Trash2, CreditCard as Edit } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { parseFormattedText } from '../../lib/blogFormatting';
import { getExcerpt, getWordCount } from '../../lib/htmlHelpers';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  view_count?: number;
  comment_count?: number;
  blog_accounts?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  blog_feed_metrics?: Array<{
    total_comments_30d: number;
    engagement_score: number;
  }>;
  is_pinned?: boolean;
  cover_image_url?: string;
}

interface BlogWheelCardProps {
  post: BlogPost;
  onClick: () => void;
  isCenterCard: boolean;
  onRemove?: () => void;
  showEdit?: boolean;
}

export default function BlogWheelCard({ post, onClick, isCenterCard, onRemove, showEdit }: BlogWheelCardProps) {
  const navigate = useNavigate();
  const excerpt = getExcerpt(post.content, 180);
  const wordCount = getWordCount(post.content);
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div
      onClick={onClick}
      className={`relative w-80 md:w-96 bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-2xl overflow-hidden transition-all ${
        isCenterCard
          ? 'shadow-2xl cursor-pointer border-4 border-amber-300'
          : 'shadow-xl border-2 border-amber-100'
      }`}
      style={{
        minHeight: '420px',
        background: isCenterCard
          ? 'linear-gradient(135deg, #fffbeb 0%, #ffffff 50%, #fff7ed 100%)'
          : 'linear-gradient(135deg, #fefce8 0%, #fafafa 50%, #fef3c7 100%)',
        boxShadow: isCenterCard
          ? '0 0 80px rgba(251, 191, 36, 0.4), 0 0 40px rgba(251, 191, 36, 0.3), 0 20px 60px rgba(0, 0, 0, 0.3)'
          : '0 0 30px rgba(251, 191, 36, 0.2), 0 0 15px rgba(251, 191, 36, 0.15), 0 10px 30px rgba(0, 0, 0, 0.2)',
      }}
    >
      {post.is_pinned && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 flex items-center justify-center gap-2 z-10">
          <Pin className="w-4 h-4" />
          <span className="text-sm font-semibold tracking-wide">Featured by Admin</span>
        </div>
      )}

      {onRemove && isCenterCard && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Remove this story from the collection?')) {
              onRemove();
            }
          }}
          className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all z-20"
          title="Remove from collection"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {showEdit && isCenterCard && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/blog/edit-post/${post.id}`);
          }}
          className="absolute top-4 right-16 p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-all z-20"
          title="Edit post"
        >
          <Edit className="w-4 h-4" />
        </button>
      )}

      <div className={`p-6 md:p-8 ${post.is_pinned ? 'pt-14 md:pt-16' : ''}`}>
        <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
          <Link
            to={`/blog/profile/${post.blog_accounts?.username}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            {post.blog_accounts?.avatar_url ? (
              <img
                src={post.blog_accounts.avatar_url}
                alt={post.blog_accounts.display_name}
                className={`rounded-full object-cover border-3 border-amber-200 hover:border-amber-400 transition-all ${
                  isCenterCard ? 'w-12 h-12 md:w-16 md:h-16 shadow-lg' : 'w-10 h-10 md:w-14 md:h-14 shadow-md'
                }`}
              />
            ) : (
              <div
                className={`rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-lg border-3 border-white hover:border-amber-300 transition-all ${
                  isCenterCard ? 'w-12 h-12 md:w-16 md:h-16' : 'w-10 h-10 md:w-14 md:h-14'
                }`}
              >
                <User className={`text-white ${isCenterCard ? 'w-6 h-6 md:w-8 md:h-8' : 'w-5 h-5 md:w-7 md:h-7'}`} />
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <Link
              to={`/blog/profile/${post.blog_accounts?.username}`}
              onClick={(e) => e.stopPropagation()}
              className={`font-semibold text-gray-800 hover:text-amber-600 truncate block transition-colors ${isCenterCard ? 'text-base md:text-lg' : 'text-sm md:text-base'}`}
            >
              {post.blog_accounts?.display_name || 'Anonymous'}
            </Link>
            <p className="text-gray-500 text-xs md:text-sm flex items-center gap-1 md:gap-2">
              <Calendar className="w-3 h-3" />
              {new Date(post.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          {isCenterCard && post.blog_feed_metrics?.[0]?.engagement_score && post.blog_feed_metrics[0].engagement_score > 5 && (
            <div className="hidden md:flex items-center gap-1 bg-gradient-to-r from-orange-400 to-amber-400 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
              <Sparkles className="w-3 h-3" />
              Hot
            </div>
          )}
        </div>

        <h3
          className={`font-serif font-bold text-gray-900 mb-3 md:mb-4 leading-tight ${
            isCenterCard ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'
          }`}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {post.title}
        </h3>

        <div
          className={`text-gray-700 mb-4 md:mb-6 leading-relaxed ${
            isCenterCard ? 'text-sm md:text-base' : 'text-xs md:text-sm'
          }`}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: isCenterCard ? 4 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {excerpt}
        </div>

        <div className="flex items-center justify-between pt-3 md:pt-4 border-t-2 border-amber-100">
          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600">
            <div className="flex items-center gap-1 md:gap-1.5">
              <Eye className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
              <span className="font-medium">{post.view_count || 0}</span>
            </div>
            <div className="flex items-center gap-1 md:gap-1.5">
              <MessageCircle className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
              <span className="font-medium">{post.comment_count || 0}</span>
            </div>
          </div>

          <div className="text-xs text-gray-500 font-medium bg-amber-50 px-2 md:px-3 py-1 rounded-full border border-amber-200">
            {readTime} min
          </div>
        </div>

        {isCenterCard && (
          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t-2 border-amber-200">
            <button
              onClick={onClick}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl text-sm md:text-base"
            >
              Read Full Article
            </button>
          </div>
        )}
      </div>

      {isCenterCard && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-amber-100/20 via-transparent to-transparent"></div>
          <div
            className="absolute inset-0"
            style={{
              boxShadow: 'inset 0 0 60px rgba(251, 191, 36, 0.15)',
            }}
          ></div>
        </div>
      )}
    </div>
  );
}
