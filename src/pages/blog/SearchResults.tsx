import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search, User, FileText, Tag, Clock, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BlogLayout from '../../components/shared/BlogLayout';

interface Author {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  follower_count: number;
  post_count: number;
}

interface Post {
  id: string;
  title: string;
  excerpt: string;
  view_count: number;
  reading_time_minutes: number;
  created_at: string;
  total_reaction_count: number;
  blog_accounts: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface Interest {
  id: string;
  category: string;
  post_count?: number;
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const filterParam = searchParams.get('filter') || 'all';
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'authors' | 'interests'>(
    filterParam as any || 'all'
  );
  const [authors, setAuthors] = useState<Author[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setLoading(true);

    try {
      const searchPattern = `%${searchTerm.trim()}%`;

      const [authorsRes, postsRes, interestsRes] = await Promise.all([
        supabase
          .from('blog_accounts')
          .select('id, username, display_name, avatar_url, bio, follower_count, post_count')
          .or(`username.ilike.${searchPattern},display_name.ilike.${searchPattern},bio.ilike.${searchPattern}`)
          .order('follower_count', { ascending: false })
          .limit(20),
        supabase
          .from('blog_posts')
          .select(`
            id,
            title,
            excerpt,
            view_count,
            reading_time_minutes,
            created_at,
            total_reaction_count,
            blog_accounts!inner(username, display_name, avatar_url)
          `)
          .eq('status', 'published')
          .eq('privacy', 'public')
          .or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('blog_interests')
          .select('id, category')
          .ilike('category', searchPattern)
          .limit(20)
      ]);

      if (authorsRes.data) {
        setAuthors(authorsRes.data);
      }

      if (postsRes.data) {
        setPosts(postsRes.data as any);
      }

      if (interestsRes.data) {
        setInterests(interestsRes.data);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalResults = authors.length + posts.length + interests.length;

  const filteredAuthors = activeTab === 'all' || activeTab === 'authors' ? authors : [];
  const filteredPosts = activeTab === 'all' || activeTab === 'posts' ? posts : [];
  const filteredInterests = activeTab === 'all' || activeTab === 'interests' ? interests : [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <BlogLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Search Results
          </h1>
          <p className="text-gray-600">
            {loading ? (
              'Searching...'
            ) : totalResults > 0 ? (
              <>Found {totalResults} results for "{query}"</>
            ) : (
              <>No results found for "{query}"</>
            )}
          </p>
        </div>

        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All ({totalResults})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Posts ({posts.length})
            </button>
            <button
              onClick={() => setActiveTab('authors')}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'authors'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Authors ({authors.length})
            </button>
            <button
              onClick={() => setActiveTab('interests')}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'interests'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Interests ({interests.length})
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {filteredAuthors.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Authors
              </h2>
              <div className="space-y-4">
                {filteredAuthors.map(author => (
                  <button
                    key={author.id}
                    onClick={() => navigate(`/blog/@${author.username}`)}
                    className="w-full text-left bg-white border border-gray-200 rounded-lg p-5 hover:border-emerald-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={author.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.username}`}
                        alt={author.display_name || author.username}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {author.display_name || author.username}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">@{author.username}</p>
                        {author.bio && (
                          <p className="text-gray-700 line-clamp-2 mb-2">{author.bio}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{author.post_count || 0} posts</span>
                          <span>{author.follower_count || 0} followers</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredPosts.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Posts
              </h2>
              <div className="space-y-4">
                {filteredPosts.map(post => (
                  <button
                    key={post.id}
                    onClick={() => navigate(`/blog/post/${post.id}`)}
                    className="w-full text-left bg-white border border-gray-200 rounded-lg p-5 hover:border-emerald-300 hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-xl text-gray-900 mb-2 hover:text-emerald-600">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-gray-700 line-clamp-2 mb-3">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <Link
                        to={`/blog/profile/${post.blog_accounts.username}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 hover:text-emerald-600 transition-colors"
                      >
                        <img
                          src={post.blog_accounts.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.blog_accounts.username}`}
                          alt={post.blog_accounts.display_name || post.blog_accounts.username}
                          className="w-6 h-6 rounded-full object-cover hover:ring-2 hover:ring-emerald-400 transition-all"
                        />
                        <span>{post.blog_accounts.display_name || post.blog_accounts.username}</span>
                      </Link>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{post.reading_time_minutes} min read</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{post.view_count || 0} views</span>
                      </div>
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredInterests.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Interests & Categories
              </h2>
              <div className="flex flex-wrap gap-3">
                {filteredInterests.map(interest => (
                  <button
                    key={interest.id}
                    onClick={() => navigate(`/blog/search?q=${encodeURIComponent(interest.category)}&filter=interest`)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-full hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-gray-700 font-medium"
                  >
                    {interest.category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && totalResults === 0 && query && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No results found
              </h3>
              <p className="text-gray-600 mb-4">
                Try searching for different keywords or browse our trending content
              </p>
              <button
                onClick={() => navigate('/blog/trending')}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Browse Trending
              </button>
            </div>
          )}
        </div>
      </div>
    </BlogLayout>
  );
}
