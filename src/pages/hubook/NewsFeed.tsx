import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';
import PostComposer from '../../components/hubook/PostComposer';
import Post from '../../components/hubook/Post';
import SharedPost from '../../components/hubook/SharedPost';
import { Coffee, CheckCircle2 } from 'lucide-react';
import JuryPoolVolunteerButton from '../../components/shared/JuryPoolVolunteerButton';

export default function NewsFeed() {
  const location = useLocation();
  const { hubookProfile } = useHuBook();
  const [pinnedPosts, setPinnedPosts] = useState<any[]>([]);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const POSTS_PER_PAGE = 20;

  useEffect(() => {
    fetchPosts();
    if (location.state?.justJoined) {
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 5000);
      window.history.replaceState({}, document.title);
    }
  }, [hubookProfile, page]);

  const fetchPosts = async () => {
    if (!hubookProfile) return;

    setLoading(true);

    try {
      const friendsQuery = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${hubookProfile.id},addressee_id.eq.${hubookProfile.id}`);

      const friendIds = new Set<string>();
      friendsQuery.data?.forEach((friendship) => {
        if (friendship.requester_id === hubookProfile.id) {
          friendIds.add(friendship.addressee_id);
        } else {
          friendIds.add(friendship.requester_id);
        }
      });

      const authorIds = [hubookProfile.id, ...Array.from(friendIds)];

      const [pinnedRes, regularRes, sharesRes] = await Promise.all([
        page === 0 ? supabase
          .from('posts')
          .select('*')
          .eq('is_pinned', true)
          .eq('status', 'active')
          .order('pinned_at', { ascending: false }) : { data: [] },
        supabase
          .from('posts')
          .select('*')
          .in('author_id', authorIds)
          .eq('status', 'active')
          .eq('is_pinned', false)
          .order('created_at', { ascending: false })
          .range(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE - 1),
        supabase
          .from('shares')
          .select('*')
          .in('user_id', authorIds)
          .order('created_at', { ascending: false })
          .range(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE - 1)
      ]);

      if (regularRes.error) throw regularRes.error;
      if (sharesRes.error) throw sharesRes.error;

      if (page === 0 && pinnedRes.data) {
        setPinnedPosts(pinnedRes.data);
      }

      const posts = regularRes.data || [];
      const shares = sharesRes.data || [];

      const sharePostIds = shares.map(s => s.post_id);
      const postsForShares = sharePostIds.length > 0
        ? (await supabase.from('posts').select('*').in('id', sharePostIds).eq('status', 'active')).data || []
        : [];

      const shareAuthorIds = shares.map(s => s.user_id);
      const sharers = shareAuthorIds.length > 0
        ? (await supabase.from('hubook_profiles').select('*').in('id', shareAuthorIds)).data || []
        : [];

      const combinedItems = [
        ...posts.map(post => ({ type: 'post', data: post, timestamp: post.created_at })),
        ...shares.map(share => {
          const post = postsForShares.find(p => p.id === share.post_id);
          const sharer = sharers.find(s => s.id === share.user_id);
          return post ? { type: 'share', data: { share, post, sharer }, timestamp: share.created_at } : null;
        }).filter(item => item !== null)
      ].sort((a, b) => new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime());

      const totalItems = combinedItems.length;

      if (page === 0) {
        setFeedItems(combinedItems);
      } else {
        setFeedItems((prev) => [...prev, ...combinedItems]);
      }
      setHasMore(totalItems === POSTS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = async () => {
    setPage(0);
    setPinnedPosts([]);
    setFeedItems([]);
    setHasMore(true);
    await fetchPosts();
  };

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {showWelcome && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-green-900 font-medium">Welcome to HuBook!</p>
            <p className="text-green-700 text-sm">Your profile has been created. Check your dashboard to see all your platforms.</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <JuryPoolVolunteerButton variant="compact" requireVerified={false} />
      </div>

      <PostComposer onPostCreated={handlePostCreated} />

      {loading && page === 0 ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : pinnedPosts.length === 0 && feedItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Coffee className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
          <p className="text-gray-600 mb-6">
            Connect with friends to see their posts in your feed, or share your first post above!
          </p>
        </div>
      ) : (
        <>
          {pinnedPosts.map((post) => (
            <div key={post.id} className="border-l-4 border-l-blue-600">
              <Post post={post} onUpdate={() => { setPage(0); fetchPosts(); }} isPinned={true} />
            </div>
          ))}
          {feedItems.map((item, index) => (
            item.type === 'post' ? (
              <Post key={`post-${item.data.id}`} post={item.data} onUpdate={() => fetchPosts()} />
            ) : (
              <SharedPost
                key={`share-${item.data.share.id}`}
                share={item.data.share}
                post={item.data.post}
                sharer={item.data.sharer}
                onUpdate={() => fetchPosts()}
              />
            )
          ))}

          {hasMore ? (
            <div className="text-center py-8">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Loading...' : 'Show More Posts'}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">You're all caught up!</h3>
              <p className="text-gray-600">
                You've seen all the posts from your friends. Time to take a break or explore other areas!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
