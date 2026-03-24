import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Pin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import HinstaLayout from '../../components/shared/HinstaLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';
import PostCard from '../../components/hinsta/PostCard';
import StoriesBar from '../../components/hinsta/StoriesBar';
import JuryPoolVolunteerButton from '../../components/shared/JuryPoolVolunteerButton';

export default function HinstaFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState<'following' | 'explore'>('following');

  useEffect(() => {
    fetchPosts();
  }, [user, feedType]);

  const fetchPosts = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data: myAccount } = await supabase
        .from('hinsta_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!myAccount) {
        setLoading(false);
        return;
      }

      const { data: pinnedData } = await supabase
        .from('hinsta_posts')
        .select('*')
        .eq('is_pinned', true)
        .eq('is_archived', false)
        .neq('status', 'paused')
        .order('pinned_at', { ascending: false });

      setPinnedPosts(pinnedData || []);

      let query = supabase
        .from('hinsta_posts')
        .select('*')
        .eq('is_archived', false)
        .eq('is_pinned', false)
        .neq('status', 'paused')
        .order('created_at', { ascending: false })
        .limit(50);

      if (feedType === 'following') {
        const { data: followsData } = await supabase
          .from('hinsta_follows')
          .select('following_id')
          .eq('follower_id', myAccount.id);

        const followingIds = followsData?.map(f => f.following_id) || [];
        followingIds.push(myAccount.id);

        if (followingIds.length > 0) {
          query = query.in('author_id', followingIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
      <HinstaLayout>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <StoriesBar />

          <div className="mb-6">
            <JuryPoolVolunteerButton variant="compact" requireVerified={false} />
          </div>

          <div className="flex gap-2 mb-6 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setFeedType('following')}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-colors ${
                feedType === 'following'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Following
            </button>
            <button
              onClick={() => setFeedType('explore')}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-colors ${
                feedType === 'explore'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Explore
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            </div>
          ) : posts.length === 0 && pinnedPosts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-600 mb-4">
                {feedType === 'following'
                  ? 'No posts from people you follow yet.'
                  : 'No posts to explore yet.'}
              </p>
              <button
                onClick={() => navigate('/hinsta/explore')}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600"
              >
                Discover People
              </button>
            </div>
          ) : (
            <div>
              {pinnedPosts.map((post) => (
                <div key={post.id} className="mb-4">
                  <div className="bg-orange-50 px-4 py-2 flex items-center gap-2 text-sm text-orange-600 font-semibold rounded-t-lg">
                    <Pin size={16} className="fill-orange-600" />
                    <span>Pinned by Admin</span>
                  </div>
                  <PostCard
                    post={post}
                    onLike={fetchPosts}
                    onComment={() => navigate(`/hinsta/post/${post.id}`)}
                    isPinned={true}
                  />
                </div>
              ))}
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={fetchPosts}
                  onComment={() => navigate(`/hinsta/post/${post.id}`)}
                  isPinned={false}
                />
              ))}
            </div>
          )}
        </div>
      </HinstaLayout>
    </PlatformGuard>
  );
}