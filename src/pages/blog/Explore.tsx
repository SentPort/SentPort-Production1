import { useState, useEffect } from 'react';
import { Compass, TrendingUp, Sparkles, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BlogLayout from '../../components/shared/BlogLayout';
import BlogWheel from '../../components/blog/BlogWheel';
import { useNavigate } from 'react-router-dom';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function Explore() {
  return (
    <PlatformGuard platform="blog">
      <ExploreContent />
    </PlatformGuard>
  );
}

interface Interest {
  id: string;
  name: string;
  description: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  view_count: number;
  comment_count: number;
  total_reaction_count: number;
  account: {
    username: string;
    display_name: string;
    avatar_url: string;
    bio: string;
  };
  comments_count?: number;
}

interface Author {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  follower_count: number;
  post_count: number;
}

function ExploreContent() {
  const navigate = useNavigate();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [featuredAuthors, setFeaturedAuthors] = useState<Author[]>([]);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [interestPosts, setInterestPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trendingPage, setTrendingPage] = useState(1);
  const [newPostsPage, setNewPostsPage] = useState(1);
  const [hasMoreTrending, setHasMoreTrending] = useState(true);
  const [hasMoreNew, setHasMoreNew] = useState(true);
  const POSTS_PER_PAGE = 20;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedInterest) {
      loadInterestPosts(selectedInterest);
    }
  }, [selectedInterest]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [interestsData, trendingData, newData, authorsData] = await Promise.all([
        supabase.from('blog_interests').select('*').order('name'),
        loadTrendingPosts(),
        loadNewPosts(),
        loadFeaturedAuthors()
      ]);

      if (interestsData.data) setInterests(interestsData.data);
      setTrendingPosts(trendingData);
      setNewPosts(newData);
      setFeaturedAuthors(authorsData);
    } catch (error) {
      console.error('Error loading explore data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrendingPosts = async (page: number = 1) => {
    const from = (page - 1) * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    const { data } = await supabase
      .from('blog_posts')
      .select(`
        id,
        title,
        content,
        created_at,
        view_count,
        total_reaction_count,
        account:account_id (
          username,
          display_name,
          avatar_url,
          bio
        )
      `)
      .eq('status', 'published')
      .eq('privacy', 'public')
      .order('total_reaction_count', { ascending: false })
      .range(from, to);

    const posts = await addCommentCountsBatch(data || []);
    setHasMoreTrending(posts.length === POSTS_PER_PAGE);
    return posts;
  };

  const loadNewPosts = async (page: number = 1) => {
    const from = (page - 1) * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    const { data } = await supabase
      .from('blog_posts')
      .select(`
        id,
        title,
        content,
        created_at,
        view_count,
        total_reaction_count,
        account:account_id (
          username,
          display_name,
          avatar_url,
          bio
        )
      `)
      .eq('status', 'published')
      .eq('privacy', 'public')
      .order('created_at', { ascending: false })
      .range(from, to);

    const posts = await addCommentCountsBatch(data || []);
    setHasMoreNew(posts.length === POSTS_PER_PAGE);
    return posts;
  };

  const loadMoreTrending = async () => {
    const nextPage = trendingPage + 1;
    const morePosts = await loadTrendingPosts(nextPage);
    setTrendingPosts(prev => [...prev, ...morePosts]);
    setTrendingPage(nextPage);
  };

  const loadMoreNew = async () => {
    const nextPage = newPostsPage + 1;
    const morePosts = await loadNewPosts(nextPage);
    setNewPosts(prev => [...prev, ...morePosts]);
    setNewPostsPage(nextPage);
  };

  const loadFeaturedAuthors = async () => {
    const { data } = await supabase
      .from('blog_accounts')
      .select('id, username, display_name, avatar_url, bio, follower_count')
      .order('follower_count', { ascending: false })
      .limit(6);

    if (!data) return [];

    // Batch fetch post counts for all authors in a single query
    const authorIds = data.map(a => a.id);
    const { data: postCounts } = await supabase
      .from('blog_posts')
      .select('account_id')
      .in('account_id', authorIds)
      .eq('status', 'published')
      .eq('privacy', 'public');

    // Count posts per author
    const countMap = new Map<string, number>();
    postCounts?.forEach(post => {
      const count = countMap.get(post.account_id) || 0;
      countMap.set(post.account_id, count + 1);
    });

    return data.map(author => ({
      ...author,
      post_count: countMap.get(author.id) || 0
    }));
  };

  const loadInterestPosts = async (interestName: string) => {
    const { data: interestData } = await supabase
      .from('blog_interests')
      .select('id')
      .eq('name', interestName)
      .single();

    if (!interestData) return;

    const { data } = await supabase
      .from('blog_post_interests')
      .select(`
        post:post_id (
          id,
          title,
          content,
          created_at,
          view_count,
          total_reaction_count,
          account:account_id (
            username,
            display_name,
            avatar_url,
            bio
          )
        )
      `)
      .eq('interest_id', interestData.id);

    if (data) {
      const posts = data.map((item: any) => item.post).filter(Boolean);
      const postsWithCounts = await addCommentCountsBatch(posts);
      setInterestPosts(postsWithCounts);
    }
  };

  const addCommentCountsBatch = async (posts: any[]) => {
    return posts.map(post => ({
      ...post,
      comments_count: post.comment_count || 0
    }));
  };

  if (isLoading) {
    return (
      <BlogLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </BlogLayout>
    );
  }

  return (
    <BlogLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Ambient blur orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-slate-600/20 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Compass className="w-8 h-8 text-emerald-400" />
              <h1 className="text-4xl font-bold text-white">Explore HuBlog</h1>
            </div>
            <p className="text-lg text-gray-300">
              Discover amazing stories from writers across all interests
            </p>
          </div>

          <section className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Browse by Interest
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {interests.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => setSelectedInterest(interest.name)}
                  className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                    selectedInterest === interest.name
                      ? 'border-emerald-500 bg-emerald-500/10 backdrop-blur-sm'
                      : 'border-slate-600/50 bg-slate-800/50 backdrop-blur-sm hover:border-emerald-500/50'
                  }`}
                >
                  <h3 className="font-bold text-white">{interest.name}</h3>
                  {interest.description && (
                    <p className="text-sm text-gray-300 mt-1">{interest.description}</p>
                  )}
                </button>
              ))}
            </div>
          </section>

          {selectedInterest && interestPosts.length > 0 && (
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-6">{selectedInterest} Stories</h2>
              <BlogWheel
                posts={interestPosts}
                onPostClick={(postId) => navigate(`/blog/post/${postId}`)}
                title=""
                subtitle=""
              />
            </section>
          )}

          {!selectedInterest && (
            <>
              <section className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                  Trending Stories
                </h2>
                {trendingPosts.length > 0 ? (
                  <>
                    <BlogWheel
                      posts={trendingPosts}
                      onPostClick={(postId) => navigate(`/blog/post/${postId}`)}
                      title=""
                      subtitle=""
                    />
                    {hasMoreTrending && (
                      <div className="text-center mt-8">
                        <button
                          onClick={loadMoreTrending}
                          className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl"
                        >
                          Load More Trending
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-300">No trending stories yet</p>
                )}
              </section>

              <section className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-teal-400" />
                  Fresh Stories
                </h2>
                {newPosts.length > 0 ? (
                  <>
                    <BlogWheel
                      posts={newPosts}
                      onPostClick={(postId) => navigate(`/blog/post/${postId}`)}
                      title=""
                      subtitle=""
                    />
                    {hasMoreNew && (
                      <div className="text-center mt-8">
                        <button
                          onClick={loadMoreNew}
                          className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl"
                        >
                          Load More Fresh Stories
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-300">No new stories yet</p>
                )}
              </section>

              <section className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Users className="w-6 h-6 text-cyan-400" />
                  Featured Authors
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredAuthors.map((author) => (
                    <div
                      key={author.id}
                      onClick={() => navigate(`/blog/@${author.username}`)}
                      className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-600/50 p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        {author.avatar_url ? (
                          <img
                            src={author.avatar_url}
                            alt={author.username}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white text-xl font-bold">
                            {author.display_name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg text-white">{author.display_name}</h3>
                          <p className="text-gray-400 text-sm">@{author.username}</p>
                        </div>
                      </div>
                      {author.bio && (
                        <p className="text-gray-300 text-sm line-clamp-2 mb-4">{author.bio}</p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-400">
                        <span>{author.post_count} stories</span>
                        <span>{author.follower_count} followers</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </BlogLayout>
  );
}
