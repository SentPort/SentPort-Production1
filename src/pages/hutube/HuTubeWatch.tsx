import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, ArrowUpRight, Flag, CreditCard as Edit, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import UniversalCommentSection from '../../components/shared/UniversalCommentSection';
import ReportContentModal from '../../components/shared/ReportContentModal';
import SubscribeButton from '../../components/hutube/SubscribeButton';
import EditVideoModal from '../../components/hutube/EditVideoModal';
import SaveToPlaylistDropdown from '../../components/hutube/SaveToPlaylistDropdown';
import CustomVideoPlayer from '../../components/hutube/CustomVideoPlayer';

export default function HuTubeWatch() {
  const { videoId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [video, setVideo] = useState<any>(null);
  const [channel, setChannel] = useState<any>(null);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [isOwnVideo, setIsOwnVideo] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [showDescriptionToggle, setShowDescriptionToggle] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (videoId) {
      loadVideo();
      loadRelatedVideos();
      trackView();
      checkLikeDislikeStatus();
    }
    if (user) {
      loadUserProfile();
      loadAutoPlayPreference();
    }
  }, [videoId, user]);

  useEffect(() => {
    // Check if description needs a toggle (exceeds 3 lines)
    if (descriptionRef.current && video?.description) {
      const lineHeight = parseInt(window.getComputedStyle(descriptionRef.current).lineHeight);
      const height = descriptionRef.current.scrollHeight;
      const lines = Math.round(height / lineHeight);
      setShowDescriptionToggle(lines > 3);
    }
  }, [video]);

  const loadVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('hutube_videos')
        .select(`
          *,
          channel:hutube_channels(id, display_name, handle, avatar_url, subscriber_count, user_id)
        `)
        .eq('id', videoId)
        .maybeSingle();

      if (error) {
        console.error('Error loading video:', error);
        setVideo(null);
        setLoading(false);
        return;
      }

      if (!data) {
        console.warn('Video not found:', videoId);
        setVideo(null);
        setLoading(false);
        return;
      }

      const channelData = Array.isArray(data.channel) ? data.channel[0] : data.channel;
      const isOwner = !!user && !!channelData && user.id === channelData.user_id;

      // Check if video is accessible
      // Paused/removed videos can only be viewed by the owner
      if (data.status !== 'active' && !isOwner) {
        console.warn('Video not accessible:', videoId);
        setVideo(null);
        setLoading(false);
        return;
      }

      setVideo(data);
      setChannel(channelData);
      setIsOwnVideo(isOwner);
      setLoading(false);
    } catch (error) {
      console.error('Unexpected error loading video:', error);
      setVideo(null);
      setLoading(false);
    }
  };

  const loadRelatedVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('hutube_videos')
        .select(`
          *,
          channel:hutube_channels(id, display_name, handle, avatar_url)
        `)
        .neq('id', videoId)
        .eq('status', 'active')
        .eq('privacy', 'public')
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Normalize channel data (could be array or object)
      const normalizedData = (data || []).map(video => ({
        ...video,
        channel: Array.isArray(video.channel) ? video.channel[0] : video.channel
      }));

      setRelatedVideos(normalizedData);
    } catch (error) {
      console.error('Error loading related videos:', error);
      setRelatedVideos([]);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('hutube_channels')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading user profile:', error);
      return;
    }

    setUserProfile(data);
  };

  const loadAutoPlayPreference = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_auto_play_preference', { p_user_id: user.id });

      if (error) {
        console.error('Error loading auto-play preference:', error);
        return;
      }

      setAutoPlayEnabled(data ?? true);
    } catch (error) {
      console.error('Error loading auto-play preference:', error);
    }
  };

  const checkLikeDislikeStatus = async () => {
    if (!user || !videoId) {
      setLiked(false);
      setDisliked(false);
      return;
    }

    // Check if user has liked this video
    const { data: likeData } = await supabase
      .from('platform_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'hutube')
      .eq('content_type', 'video')
      .eq('content_id', videoId)
      .maybeSingle();

    setLiked(!!likeData);

    // Check if user has disliked this video
    const { data: dislikeData } = await supabase
      .from('platform_dislikes')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'hutube')
      .eq('content_type', 'video')
      .eq('content_id', videoId)
      .maybeSingle();

    setDisliked(!!dislikeData);
  };

  const trackView = async () => {
    if (!videoId) return;

    try {
      // Use the comprehensive analytics tracking function
      await supabase.rpc('record_video_view', {
        p_video_id: videoId,
        p_user_id: user?.id || null,
        p_watched_seconds: 0, // Initial view, watch time will be tracked by video player
        p_traffic_source: 'direct',
        p_device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleLike = async () => {
    if (!user || !videoId) return;

    try {
      if (liked) {
        // Unlike - remove from platform_likes
        await supabase
          .from('platform_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', 'hutube')
          .eq('content_type', 'video')
          .eq('content_id', videoId);

        await supabase
          .from('hutube_videos')
          .update({ like_count: Math.max(0, (video.like_count || 0) - 1) })
          .eq('id', videoId);

        setLiked(false);
      } else {
        // Like - add to platform_likes
        await supabase
          .from('platform_likes')
          .insert({
            user_id: user.id,
            platform: 'hutube',
            content_type: 'video',
            content_id: videoId
          });

        await supabase
          .from('hutube_videos')
          .update({ like_count: (video.like_count || 0) + 1 })
          .eq('id', videoId);

        setLiked(true);

        // If previously disliked, remove dislike
        if (disliked) {
          await supabase
            .from('platform_dislikes')
            .delete()
            .eq('user_id', user.id)
            .eq('platform', 'hutube')
            .eq('content_type', 'video')
            .eq('content_id', videoId);

          await supabase
            .from('hutube_videos')
            .update({ dislike_count: Math.max(0, (video.dislike_count || 0) - 1) })
            .eq('id', videoId);

          setDisliked(false);
        }
      }

      loadVideo();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDislike = async () => {
    if (!user || !videoId) return;

    try {
      if (disliked) {
        // Remove dislike - remove from platform_dislikes
        await supabase
          .from('platform_dislikes')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', 'hutube')
          .eq('content_type', 'video')
          .eq('content_id', videoId);

        await supabase
          .from('hutube_videos')
          .update({ dislike_count: Math.max(0, (video.dislike_count || 0) - 1) })
          .eq('id', videoId);

        setDisliked(false);
      } else {
        // Dislike - add to platform_dislikes
        await supabase
          .from('platform_dislikes')
          .insert({
            user_id: user.id,
            platform: 'hutube',
            content_type: 'video',
            content_id: videoId
          });

        await supabase
          .from('hutube_videos')
          .update({ dislike_count: (video.dislike_count || 0) + 1 })
          .eq('id', videoId);

        setDisliked(true);

        // If previously liked, remove like
        if (liked) {
          await supabase
            .from('platform_likes')
            .delete()
            .eq('user_id', user.id)
            .eq('platform', 'hutube')
            .eq('content_type', 'video')
            .eq('content_id', videoId);

          await supabase
            .from('hutube_videos')
            .update({ like_count: Math.max(0, (video.like_count || 0) - 1) })
            .eq('id', videoId);

          setLiked(false);
        }
      }

      loadVideo();
    } catch (error) {
      console.error('Error toggling dislike:', error);
    }
  };

  const handleShare = async () => {
    if (!user || !videoId) {
      setShareModalOpen(true);
      return;
    }

    try {
      // Track share in platform_shares
      await supabase
        .from('platform_shares')
        .insert({
          user_id: user.id,
          platform: 'hutube',
          content_type: 'video',
          content_id: videoId
        });

      // Increment share count
      await supabase
        .from('hutube_videos')
        .update({ share_count: (video.share_count || 0) + 1 })
        .eq('id', videoId);

      setShareModalOpen(true);
      loadVideo();
    } catch (error) {
      console.error('Error tracking share:', error);
      setShareModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this video? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('hutube_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      navigate('/hutube');
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video');
    }
  };

  const handleVideoEnd = () => {
    if (autoPlayEnabled && relatedVideos.length > 0) {
      const nextVideo = relatedVideos[0];
      if (nextVideo?.id) {
        navigate(`/hutube/watch/${nextVideo.id}`);
      }
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="hutube">
        <HuTubeLayout darkMode={true} collapsedSidebar={true} showBackButton={true}>
          <div className="min-h-screen bg-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        </HuTubeLayout>
      </PlatformGuard>
    );
  }

  if (!video) {
    return (
      <PlatformGuard platform="hutube">
        <HuTubeLayout darkMode={true} collapsedSidebar={true} showBackButton={true}>
          <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Video not found</h2>
              <p className="text-gray-400">This video may have been removed or made private.</p>
            </div>
          </div>
        </HuTubeLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout darkMode={true} collapsedSidebar={true} showBackButton={true}>
        <div className="min-h-screen bg-black">
          <div className="bg-black">
            <div className={`${isTheaterMode ? 'w-full' : 'max-w-[1400px] mx-auto'} transition-all duration-300`}>
              <div className="bg-black relative">
                {video.video_url ? (
                  <CustomVideoPlayer
                    src={video.video_url}
                    thumbnail={video.thumbnail_url}
                    autoPlay={true}
                    isTheaterMode={isTheaterMode}
                    onTheaterModeToggle={() => setIsTheaterMode(!isTheaterMode)}
                    videoId={videoId}
                    userId={user?.id}
                    onVideoEnd={handleVideoEnd}
                  />
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center">
                    <p className="text-white">No video available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-6 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {/* Moderation Status Banner */}
              {video.status !== 'active' && isOwnVideo && (
                <div className={`mb-4 p-4 rounded-lg ${
                  video.status === 'paused'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <Flag className={`w-5 h-5 mt-0.5 ${
                      video.status === 'paused' ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                    <div>
                      <h3 className={`font-semibold ${
                        video.status === 'paused' ? 'text-yellow-900' : 'text-red-900'
                      }`}>
                        {video.status === 'paused' ? 'Video Under Review' : 'Video Removed'}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        video.status === 'paused' ? 'text-yellow-700' : 'text-red-700'
                      }`}>
                        {video.status === 'paused'
                          ? `This video has been paused due to community reports (${video.report_count || 0} reports). An admin will review it within 24-48 hours. It is not visible to other users until approved.`
                          : 'This video has been removed by moderators and is no longer publicly accessible.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Title - Prominent on left */}
              <h1 className="text-xl font-bold text-gray-900 mb-3">{video.title}</h1>

              {/* Channel Info and Subscribe Button Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Link to={`/hutube/channel/${channel?.handle}`} className="flex items-center gap-3 group">
                    {channel?.avatar_url ? (
                      <img
                        src={channel.avatar_url}
                        alt={channel.display_name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
                        {channel?.display_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                        {channel?.display_name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {(channel?.subscriber_count || 0).toLocaleString()} subscribers
                      </div>
                    </div>
                  </Link>
                  {!isOwnVideo && channel && (
                    <div className="ml-2">
                      <SubscribeButton
                        channelId={channel.id}
                        channelName={channel.display_name}
                        size="medium"
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-gray-100 rounded-full overflow-hidden">
                    <button
                      onClick={handleLike}
                      disabled={!user}
                      className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-200 transition-colors ${
                        liked ? 'text-gray-900' : 'text-gray-900'
                      } disabled:opacity-50`}
                    >
                      <ThumbsUp className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} />
                      <span className="font-medium">{video.like_count || 0}</span>
                    </button>
                    <div className="w-px h-6 bg-gray-300" />
                    <button
                      onClick={handleDislike}
                      disabled={!user}
                      className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-200 transition-colors ${
                        disliked ? 'text-gray-900' : 'text-gray-900'
                      } disabled:opacity-50`}
                    >
                      <ThumbsDown className="w-5 h-5" fill={disliked ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {user && (
                    <SaveToPlaylistDropdown videoId={videoId!} />
                  )}

                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-900"
                  >
                    <ArrowUpRight className="w-5 h-5" />
                    <span className="font-medium">Share</span>
                  </button>

                  {user && channel && isOwnVideo && (
                    <>
                      <button
                        onClick={() => setEditModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                      >
                        <Edit className="w-5 h-5" />
                        <span className="font-medium">Edit</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span className="font-medium">Delete</span>
                      </button>
                    </>
                  )}

                  {!isOwnVideo && (
                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-red-600"
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Video Metadata and Description */}
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-4 text-sm text-gray-700 mb-2">
                  <span className="font-semibold">{(video.view_count || 0).toLocaleString()} views</span>
                  <span>{new Date(video.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}</span>
                  {video.privacy && video.privacy !== 'public' && (
                    <span className="px-2 py-1 bg-yellow-600 text-yellow-100 rounded text-xs font-medium">
                      {video.privacy.toUpperCase()}
                    </span>
                  )}
                  {video.is_draft && (
                    <span className="px-2 py-1 bg-gray-400 text-gray-700 rounded text-xs font-medium">
                      DRAFT
                    </span>
                  )}
                </div>
                <div className="relative">
                  <p
                    ref={descriptionRef}
                    className={`text-gray-900 whitespace-pre-wrap ${!descriptionExpanded && showDescriptionToggle ? 'line-clamp-3' : ''}`}
                    style={!descriptionExpanded && showDescriptionToggle ? { maxHeight: '72px', overflow: 'hidden' } : {}}
                  >
                    {video.description || 'No description provided.'}
                  </p>
                  {showDescriptionToggle && (
                    <button
                      onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 mt-2 transition-colors"
                    >
                      {descriptionExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">
                    {video.comment_count || 0} Comments
                  </h3>
                </div>
                <UniversalCommentSection
                  platform="hutube"
                  contentType="video"
                  contentId={videoId!}
                  userProfile={userProfile}
                  channelId={userProfile?.id}
                  onCommentCountChange={(newCount) => {
                    setVideo((prev: any) => prev ? { ...prev, comment_count: newCount } : prev);
                  }}
                />
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="space-y-3 border-t border-gray-200 pt-4">
                {relatedVideos.length > 0 ? (
                  relatedVideos.filter(v => v && v.channel).map((relatedVideo) => (
                    <div key={relatedVideo.id} className="flex gap-2 hover:bg-gray-50 rounded-lg p-2 transition-colors">
                      <Link to={`/hutube/watch/${relatedVideo.id}`} className="flex-shrink-0">
                        <div className="relative w-40 aspect-video bg-gray-200 rounded overflow-hidden">
                          {relatedVideo.thumbnail_url ? (
                            <img
                              src={relatedVideo.thumbnail_url}
                              alt={relatedVideo.title}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                              <span className="text-white text-lg font-bold opacity-50">HT</span>
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/hutube/watch/${relatedVideo.id}`}>
                          <h4 className="text-sm font-semibold line-clamp-2 text-gray-900 hover:text-gray-700 transition-colors">
                            {relatedVideo.title}
                          </h4>
                        </Link>
                        {relatedVideo.channel?.display_name && (
                          <Link to={`/hutube/channel/${relatedVideo.channel.handle}`}>
                            <p className="text-xs text-gray-600 hover:text-gray-800 mt-1">
                              {relatedVideo.channel.display_name}
                            </p>
                          </Link>
                        )}
                        <p className="text-xs text-gray-600 mt-1">
                          {relatedVideo.view_count?.toLocaleString() || 0} views
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No related videos found</p>
                )}
              </div>
            </div>
          </div>
          </div>

          {reportModalOpen && (
            <ReportContentModal
              platform="hutube"
              contentType="video"
              contentId={videoId!}
              onClose={() => setReportModalOpen(false)}
            />
          )}

          {editModalOpen && (
            <EditVideoModal
              videoId={videoId!}
              onClose={() => setEditModalOpen(false)}
              onUpdate={() => {
                loadVideo();
                setEditModalOpen(false);
              }}
            />
          )}

          {shareModalOpen && video && (
            <ShareModal
              videoId={videoId!}
              videoTitle={video.title}
              onClose={() => setShareModalOpen(false)}
            />
          )}
        </div>
      </HuTubeLayout>
    </PlatformGuard>
  );
}

function ShareModal({ videoId, videoTitle, onClose }: { videoId: string; videoTitle: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const videoUrl = `${window.location.origin}/hutube/watch/${videoId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(videoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Share Video</h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">{videoTitle}</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={videoUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-600 mb-3">Share to SentPort platforms</p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`/hubook?share_video=${videoId}`}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <span className="font-medium">HuBook</span>
              </a>
              <a
                href={`/switter?share_video=${videoId}`}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition-colors"
              >
                <span className="font-medium">Switter</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
