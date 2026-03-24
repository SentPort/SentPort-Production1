import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Pin, X, Search, Calendar, User, Eye, ThumbsUp, ArrowLeft } from 'lucide-react';

interface HuTubeVideo {
  id: string;
  title: string;
  description: string;
  view_count: number;
  like_count: number;
  created_at: string;
  is_pinned: boolean;
  pinned_at: string | null;
  channel_id: string;
  channel?: {
    channel_name: string;
    display_name: string;
  };
}

export default function HuTubePinsManagement() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<HuTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pinningVideoId, setPinningVideoId] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('hutube_videos')
        .select(`
          *,
          channel:hutube_channels(channel_name, display_name)
        `)
        .eq('status', 'active')
        .order('is_pinned', { ascending: false })
        .order('pinned_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (videoId: string, currentlyPinned: boolean) => {
    try {
      setPinningVideoId(videoId);

      const { error } = await supabase.rpc('pin_hutube_video', {
        video_id: videoId,
        should_pin: !currentlyPinned
      });

      if (error) {
        if (error.message.includes('Maximum of 5')) {
          alert('You can only pin up to 5 videos at a time. Please unpin another video first.');
        } else {
          throw error;
        }
      } else {
        await loadVideos();
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Failed to update pin status');
    } finally {
      setPinningVideoId(null);
    }
  };

  const filteredVideos = videos.filter(video => {
    const searchLower = searchTerm.toLowerCase();
    return (
      video.title.toLowerCase().includes(searchLower) ||
      video.description?.toLowerCase().includes(searchLower) ||
      video.channel?.channel_name.toLowerCase().includes(searchLower) ||
      video.channel?.display_name.toLowerCase().includes(searchLower)
    );
  });

  const pinnedVideos = filteredVideos.filter(v => v.is_pinned);
  const unpinnedVideos = filteredVideos.filter(v => !v.is_pinned);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (!content || content.length <= maxLength) return content || '';
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading videos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/admin/pins-management')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Manage Pinned Content
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HuTube Pinned Videos Management</h1>
          <p className="text-gray-600">Pin important videos to appear at the top of the HuTube feed</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search videos by title, description, or channel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {pinnedVideos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Pin className="w-5 h-5 text-blue-600" />
              Pinned Videos ({pinnedVideos.length}/5)
            </h2>
            <div className="space-y-4">
              {pinnedVideos.map(video => (
                <div
                  key={video.id}
                  className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <Pin className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{video.title}</h3>
                          <p className="text-gray-600 mb-4">{truncateContent(video.description)}</p>

                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {video.channel && (
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                <span>{video.channel.display_name || video.channel.channel_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              <span>{video.view_count.toLocaleString()} views</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4" />
                              <span>{video.like_count.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(video.created_at)}</span>
                            </div>
                            {video.pinned_at && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Pin className="w-4 h-4" />
                                <span>Pinned {formatDate(video.pinned_at)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => togglePin(video.id, video.is_pinned)}
                      disabled={pinningVideoId === video.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    >
                      <X className="w-4 h-4" />
                      Unpin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            All Videos
          </h2>
          {unpinnedVideos.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">
              {searchTerm ? 'No videos match your search' : 'No videos available'}
            </div>
          ) : (
            <div className="space-y-4">
              {unpinnedVideos.slice(0, 50).map(video => (
                <div
                  key={video.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{video.title}</h3>
                      <p className="text-gray-600 mb-4">{truncateContent(video.description)}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        {video.channel && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{video.channel.display_name || video.channel.channel_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{video.view_count.toLocaleString()} views</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          <span>{video.like_count.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(video.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => togglePin(video.id, video.is_pinned)}
                      disabled={pinningVideoId === video.id}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    >
                      <Pin className="w-4 h-4" />
                      Pin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
