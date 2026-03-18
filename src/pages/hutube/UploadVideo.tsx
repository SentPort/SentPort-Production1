import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import VideoUploadZone from '../../components/hutube/VideoUploadZone';
import ThumbnailUploadZone from '../../components/hutube/ThumbnailUploadZone';
import { useHuTubeNotification } from '../../contexts/HuTubeNotificationContext';

function UploadVideoForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showWarning } = useHuTubeNotification();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const uploadFileToStorage = async (
    file: File,
    bucket: string,
    channelId: string,
    onProgress: (progress: number) => void
  ): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${channelId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Simulate progress for large files (Supabase doesn't provide native progress)
    const uploadPromise = supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: false });

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      onProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    const { error: uploadError } = await uploadPromise;
    clearInterval(progressInterval);
    onProgress(100);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || (!videoFile && !videoUrl.trim())) return;

    setLoading(true);

    try {
      const { data: channel } = await supabase
        .from('hutube_channels')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!channel) {
        showWarning('Please create a HuTube channel first');
        navigate('/hutube/join');
        return;
      }

      let finalVideoUrl = videoUrl.trim();
      let finalThumbnailUrl = thumbnailUrl.trim();

      // Upload video file if provided
      if (videoFile) {
        setVideoUploadProgress(0);
        finalVideoUrl = await uploadFileToStorage(
          videoFile,
          'hutube-videos',
          channel.id,
          setVideoUploadProgress
        );
      }

      // Upload thumbnail file if provided
      if (thumbnailFile) {
        setThumbnailUploadProgress(0);
        finalThumbnailUrl = await uploadFileToStorage(
          thumbnailFile,
          'hutube-thumbnails',
          channel.id,
          setThumbnailUploadProgress
        );
      }

      const { error } = await supabase
        .from('hutube_videos')
        .insert({
          channel_id: channel.id,
          title: title.trim(),
          description: description.trim(),
          video_url: finalVideoUrl,
          thumbnail_url: finalThumbnailUrl || null,
          duration: 0,
          view_count: 0,
          like_count: 0,
          dislike_count: 0,
          comment_count: 0,
          share_count: 0
        });

      if (error) throw error;

      navigate('/hutube/feed');
    } catch (error) {
      console.error('Error uploading video:', error);
      showError('Failed to upload video. Please try again.');
    } finally {
      setLoading(false);
      setVideoUploadProgress(0);
      setThumbnailUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
                 style={{
                   background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8C42 25%, #FFA94D 50%, #FF7F66 75%, #FF5E7D 100%)',
                   boxShadow: '0 4px 12px rgba(255, 107, 107, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
                 }}>
              <ArrowUp className="w-6 h-6 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))' }} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Launch Video</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers about your video"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                />
              </div>

              <VideoUploadZone
                onVideoSelected={(file, url) => {
                  setVideoFile(file);
                  if (url) setVideoUrl(url);
                }}
                videoFile={videoFile}
                videoUrl={videoUrl}
                onUrlChange={setVideoUrl}
                uploadProgress={videoUploadProgress}
              />

              <ThumbnailUploadZone
                onThumbnailSelected={(file, url) => {
                  setThumbnailFile(file);
                  if (url) setThumbnailUrl(url);
                }}
                thumbnailFile={thumbnailFile}
                thumbnailUrl={thumbnailUrl}
                onUrlChange={setThumbnailUrl}
                uploadProgress={thumbnailUploadProgress}
              />

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/hutube/feed')}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim() || (!videoFile && !videoUrl.trim())}
                className="flex-1 px-6 py-3 text-white rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                style={{
                  background: loading || !title.trim() || (!videoFile && !videoUrl.trim())
                    ? '#9CA3AF'
                    : 'linear-gradient(135deg, #FF6B6B 0%, #FF8C42 25%, #FFA94D 50%, #FF7F66 75%, #FF5E7D 100%)',
                  boxShadow: loading || !title.trim() || (!videoFile && !videoUrl.trim())
                    ? 'none'
                    : '0 6px 16px rgba(255, 107, 107, 0.5), 0 3px 8px rgba(0, 0, 0, 0.25), inset 0 -3px 6px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                }}
                onMouseEnter={(e) => {
                  if (!loading && title.trim() && (videoFile || videoUrl.trim())) {
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(255, 107, 107, 0.6), 0 6px 12px rgba(0, 0, 0, 0.3), inset 0 -3px 6px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = loading || !title.trim() || (!videoFile && !videoUrl.trim())
                    ? 'none'
                    : '0 6px 16px rgba(255, 107, 107, 0.5), 0 3px 8px rgba(0, 0, 0, 0.25), inset 0 -3px 6px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.4)';
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                {loading ? 'Launching...' : 'Launch Video'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function UploadVideo() {
  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout showBackButton={true}>
        <UploadVideoForm />
      </HuTubeLayout>
    </PlatformGuard>
  );
}
