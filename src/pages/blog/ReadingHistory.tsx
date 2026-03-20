import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, BookOpen, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function ReadingHistory() {
  return (
    <PlatformGuard platform="blog">
      <ReadingHistoryContent />
    </PlatformGuard>
  );
}

interface ReadingHistoryItem {
  id: string;
  post_id: string;
  completion_percentage: number;
  active_reading_seconds: number;
  last_scroll_at: string;
  completed_at: string | null;
  post: {
    title: string;
    excerpt: string | null;
    cover_image_url: string | null;
    account_id: string;
    created_at: string;
    blog_accounts: {
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
}

function ReadingHistoryContent() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress'>('all');

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, filter]);

  const loadHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('blog_views')
        .select(`
          id,
          post_id,
          created_at,
          blog_posts!inner (
            id,
            title,
            excerpt,
            cover_image_url,
            account_id,
            created_at,
            blog_accounts!inner (
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('viewer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data } = await query;

      if (data) {
        const formattedHistory = data.map((item: any) => ({
          id: item.id,
          post_id: item.post_id,
          completion_percentage: 100,
          active_reading_seconds: 0,
          last_scroll_at: item.created_at,
          completed_at: item.created_at,
          post: {
            title: item.blog_posts.title,
            excerpt: item.blog_posts.excerpt,
            cover_image_url: item.blog_posts.cover_image_url,
            account_id: item.blog_posts.account_id,
            created_at: item.blog_posts.created_at,
            blog_accounts: item.blog_posts.blog_accounts
          }
        }));

        if (filter === 'completed') {
          setHistory(formattedHistory.filter(item => item.completed_at !== null));
        } else if (filter === 'in-progress') {
          setHistory(formattedHistory.filter(item => item.completed_at === null));
        } else {
          setHistory(formattedHistory);
        }
      }
    } catch (error) {
      console.error('Error loading reading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatReadingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return '< 1 min';
    return `${minutes} min`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <BlogLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-8 h-8 text-emerald-400" />
          <h1 className="text-3xl font-bold text-white">Reading History</h1>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'completed'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'in-progress'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            In Progress
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-lg p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No reading history yet</h3>
            <p className="text-gray-300 mb-6">
              Start reading stories to build your history
            </p>
            <Link
              to="/blog/explore"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all"
            >
              <TrendingUp className="w-5 h-5" />
              Explore Stories
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <Link
                key={item.id}
                to={`/blog/post/${item.post_id}`}
                className="block bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:border-emerald-500/30"
              >
                <div className="flex gap-4">
                  {item.post.cover_image_url && (
                    <div className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden">
                      <img
                        src={item.post.cover_image_url}
                        alt={item.post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                      {item.post.title}
                    </h3>
                    {item.post.excerpt && (
                      <p className="text-gray-300 text-sm mb-3 line-clamp-1">
                        {item.post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      <Link
                        to={`/blog/profile/${item.post.blog_accounts.username}`}
                        className="flex items-center gap-2 hover:text-emerald-300 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-semibold hover:ring-2 hover:ring-emerald-400 transition-all">
                          {item.post.blog_accounts.avatar_url ? (
                            <img
                              src={item.post.blog_accounts.avatar_url}
                              alt={item.post.blog_accounts.display_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            item.post.blog_accounts.display_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="font-medium">{item.post.blog_accounts.display_name}</span>
                      </Link>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Read {formatDate(item.last_scroll_at)}</span>
                      </div>
                      {item.active_reading_seconds > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatReadingTime(item.active_reading_seconds)}</span>
                        </div>
                      )}
                      {item.completion_percentage > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                              style={{ width: `${item.completion_percentage}%` }}
                            />
                          </div>
                          <span className="text-xs">{item.completion_percentage}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </BlogLayout>
  );
}
