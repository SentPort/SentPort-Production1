import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import Post from '../../components/hubook/Post';
import CommentSection from '../../components/hubook/CommentSection';

interface PostData {
  id: string;
  user_id: string;
  content: string;
  privacy: string;
  created_at: string;
  updated_at: string;
  source_album_id: string | null;
  user_profile?: {
    id: string;
    display_name: string;
    profile_photo_url: string | null;
  };
}

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postId && user) {
      loadPost();
    }
  }, [postId, user]);

  const loadPost = async () => {
    if (!postId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select(`
          *,
          user_profile:user_id (
            id,
            display_name,
            profile_photo_url
          )
        `)
        .eq('id', postId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('This post could not be found. It may have been deleted.');
        return;
      }

      // Check if user can view this post based on privacy settings
      if (data.privacy === 'private' && data.user_id !== user?.id) {
        // Check if they are friends
        const { data: friendshipData } = await supabase
          .from('friendships')
          .select('id')
          .or(`requester_id.eq.${user?.id},addressee_id.eq.${user?.id}`)
          .or(`requester_id.eq.${data.user_id},addressee_id.eq.${data.user_id}`)
          .eq('status', 'accepted')
          .maybeSingle();

        if (!friendshipData) {
          setError('You do not have permission to view this post.');
          return;
        }
      }

      // Check for blocking
      const { data: blockData } = await supabase
        .from('user_blocks')
        .select('id')
        .or(`and(blocker_id.eq.${user?.id},blocked_id.eq.${data.user_id}),and(blocker_id.eq.${data.user_id},blocked_id.eq.${user?.id})`)
        .maybeSingle();

      if (blockData) {
        setError('This post is not available.');
        return;
      }

      setPost(data);
    } catch (err) {
      console.error('Error loading post:', err);
      setError('Failed to load post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="hubook">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        </div>
      </PlatformGuard>
    );
  }

  if (error || !post) {
    return (
      <PlatformGuard platform="hubook">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/hubook')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Feed</span>
          </button>

          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Post Not Available</h2>
            <p className="text-gray-600 mb-6">
              {error || 'This post could not be found.'}
            </p>
            <Link
              to="/hubook"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Feed
            </Link>
          </div>
        </div>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hubook">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="space-y-6">
          <Post
            post={post}
            onDelete={() => navigate('/hubook')}
            showFullContent={true}
          />

          <div className="bg-white rounded-lg shadow-sm">
            <CommentSection postId={post.id} />
          </div>
        </div>
      </div>
    </PlatformGuard>
  );
}
