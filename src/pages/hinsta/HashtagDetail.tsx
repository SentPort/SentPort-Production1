import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Hash, Grid2x2 as Grid, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import HinstaLayout from '../../components/shared/HinstaLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function HashtagDetail() {
  const { tag } = useParams();
  const [hashtag, setHashtag] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tag) {
      loadHashtagData();
    }
  }, [tag]);

  const loadHashtagData = async () => {
    setLoading(true);

    const { data: hashtagData } = await supabase
      .from('hinsta_hashtags')
      .select('*')
      .eq('tag', tag?.toLowerCase())
      .maybeSingle();

    if (hashtagData) {
      setHashtag(hashtagData);

      const { data: postHashtags } = await supabase
        .from('hinsta_post_hashtags')
        .select('post_id')
        .eq('hashtag_id', hashtagData.id);

      if (postHashtags && postHashtags.length > 0) {
        const postIds = postHashtags.map(ph => ph.post_id);

        const { data: postsData } = await supabase
          .from('hinsta_posts')
          .select('*')
          .in('id', postIds)
          .eq('is_archived', false)
          .neq('status', 'paused')
          .order('created_at', { ascending: false });

        setPosts(postsData || []);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
        <HinstaLayout showBackButton backButtonPath="/hinsta/explore">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          </div>
        </HinstaLayout>
      </PlatformGuard>
    );
  }

  if (!hashtag) {
    return (
      <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
        <HinstaLayout showBackButton backButtonPath="/hinsta/explore">
          <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
            <Hash className="w-16 h-16 mb-4" />
            <p className="font-semibold">Hashtag not found</p>
          </div>
        </HinstaLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
      <HinstaLayout showBackButton backButtonPath="/hinsta/explore">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                <Hash className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">#{tag}</h1>
                <p className="text-gray-600">
                  {hashtag.post_count.toLocaleString()} {hashtag.post_count === 1 ? 'post' : 'posts'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Grid className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Recent Posts</h2>
          </div>

          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Hash className="w-16 h-16 mb-4" />
              <p className="font-semibold">No posts found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/hinsta/post/${post.id}`}
                  className="aspect-square bg-gray-100 relative group overflow-hidden"
                >
                  {(post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : post.media_url) ? (
                    <img
                      src={post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : post.media_url}
                      alt={post.caption}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Hash className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="text-white font-semibold flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        ❤️ {post.like_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        💬 {post.comment_count || 0}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </HinstaLayout>
    </PlatformGuard>
  );
}
