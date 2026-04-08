import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import MediaViewer from '../../components/hubook/MediaViewer';
import MediaCommentSection from '../../components/hubook/MediaCommentSection';

interface MediaData {
  id: string;
  album_id: string;
  url: string;
  caption: string | null;
  created_at: string;
  album?: {
    id: string;
    title: string;
    user_id: string;
    privacy: string;
  };
}

export default function MediaDetail() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [media, setMedia] = useState<MediaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mediaId && user) {
      loadMedia();
    }
  }, [mediaId, user]);

  const loadMedia = async () => {
    if (!mediaId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('album_media')
        .select(`
          *,
          album:album_id (
            id,
            title,
            user_id,
            privacy
          )
        `)
        .eq('id', mediaId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('This media could not be found. It may have been deleted.');
        return;
      }

      // Check if user can view this media based on album privacy settings
      if (data.album?.privacy === 'friends' && data.album.user_id !== user?.id) {
        // Check if they are friends
        const { data: friendshipData } = await supabase
          .from('friendships')
          .select('id')
          .or(`requester_id.eq.${user?.id},addressee_id.eq.${user?.id}`)
          .or(`requester_id.eq.${data.album.user_id},addressee_id.eq.${data.album.user_id}`)
          .eq('status', 'accepted')
          .maybeSingle();

        if (!friendshipData) {
          setError('You do not have permission to view this media.');
          return;
        }
      } else if (data.album?.privacy === 'private' && data.album.user_id !== user?.id) {
        setError('You do not have permission to view this media.');
        return;
      }

      // Check for blocking
      if (data.album?.user_id) {
        const { data: blockData } = await supabase
          .from('user_blocks')
          .select('id')
          .or(`and(blocker_id.eq.${user?.id},blocked_id.eq.${data.album.user_id}),and(blocker_id.eq.${data.album.user_id},blocked_id.eq.${user?.id})`)
          .maybeSingle();

        if (blockData) {
          setError('This media is not available.');
          return;
        }
      }

      setMedia(data);
    } catch (err) {
      console.error('Error loading media:', err);
      setError('Failed to load media. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="hubook">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        </div>
      </PlatformGuard>
    );
  }

  if (error || !media) {
    return (
      <PlatformGuard platform="hubook">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/hubook/photos')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Photos</span>
          </button>

          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Media Not Available</h2>
            <p className="text-gray-600 mb-6">
              {error || 'This media could not be found.'}
            </p>
            <Link
              to="/hubook/photos"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Photos
            </Link>
          </div>
        </div>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hubook">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          {media.album && (
            <Link
              to={`/hubook/albums/${media.album.id}`}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ImageIcon size={18} />
              <span>View Album: {media.album.title}</span>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <img
                src={media.url}
                alt={media.caption || 'Media item'}
                className="w-full h-auto"
              />
              {media.caption && (
                <div className="p-4 border-t border-gray-200">
                  <p className="text-gray-900">{media.caption}</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm">
              <MediaCommentSection mediaId={media.id} />
            </div>
          </div>
        </div>
      </div>
    </PlatformGuard>
  );
}
