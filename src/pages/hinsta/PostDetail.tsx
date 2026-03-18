import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import HinstaLayout from '../../components/shared/HinstaLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';
import PostCard from '../../components/hinsta/PostCard';
import UniversalCommentSection from '../../components/shared/UniversalCommentSection';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnPost, setIsOwnPost] = useState(false);

  useEffect(() => {
    loadPost();
  }, [id]);

  useEffect(() => {
    if (post && user && !isOwnPost) {
      trackPostView();
    }
  }, [post, user, isOwnPost]);

  const trackPostView = async () => {
    if (!post || !id) return;

    try {
      const deviceType = /Mobile|Android|iPhone/i.test(navigator.userAgent)
        ? 'mobile'
        : /iPad|Tablet/i.test(navigator.userAgent)
        ? 'tablet'
        : 'desktop';

      const trafficSource = document.referrer || 'direct';

      await supabase.rpc('record_hinsta_post_view', {
        p_post_id: id,
        p_viewer_id: user?.id || null,
        p_view_duration: 0,
        p_device_type: deviceType,
        p_traffic_source: trafficSource,
      });
    } catch (error) {
      console.error('Error tracking post view:', error);
    }
  };

  const loadPost = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('hinsta_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      navigate('/hinsta');
      return;
    }

    const { data: myAccount } = await supabase
      .from('hinsta_accounts')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();

    const ownPost = myAccount && data.author_id === myAccount.id;
    setIsOwnPost(ownPost);

    if (data.status === 'paused' && !ownPost) {
      navigate('/hinsta');
      return;
    }

    setPost(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
        <HinstaLayout showBackButton backButtonPath="/hinsta">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          </div>
        </HinstaLayout>
      </PlatformGuard>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
      <HinstaLayout showBackButton backButtonPath="/hinsta">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {post.status === 'paused' && isOwnPost && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Post Under Review</h3>
                <p className="text-sm text-yellow-800">
                  This post has been paused due to community reports and is currently under admin review.
                  You can still view it, but it's hidden from other users. You'll be notified when the review is complete.
                </p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <PostCard post={post} onLike={loadPost} showComments={false} />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Comments</h2>
              <UniversalCommentSection
                platform="hinsta"
                contentType="post"
                contentId={post.id}
              />
            </div>
          </div>
        </div>
      </HinstaLayout>
    </PlatformGuard>
  );
}
