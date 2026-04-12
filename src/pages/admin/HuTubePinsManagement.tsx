import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Pin, X, Search, Calendar, User, Eye, ThumbsUp, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

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

const PAGE_SIZE = 25;

export default function HuTubePinsManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pinnedVideos, setPinnedVideos] = useState<HuTubeVideo[]>([]);
  const [videos, setVideos] = useState<HuTubeVideo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pinningVideoId, setPinningVideoId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadPinnedVideos = useCallback(async () => {
    const { data } = await supabase
      .from('hutube_videos')
      .select(`
        id, title, description, view_count, like_count, created_at, is_pinned, pinned_at, channel_id,
        channel:hutube_channels(channel_name, display_name)
      `)
      .eq('status', 'active')
      .eq('is_pinned', true)
      .order('pinned_at', { ascending: false });

    setPinnedVideos(data || []);
  }, []);

  const loadVideos = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      let query = supabase
        .from('hutube_videos')
        .select(`
          id, title, description, view_count, like_count, created_at, is_pinned, pinned_at, channel_id,
          channel:hutube_channels(channel_name, display_name)
        `, { count: 'exact' })
        .eq('status', 'active')
        .eq('is_pinned', false);

      if (debouncedSearch.trim()) {
        query = query.or(
          `title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`
        );
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (error) throw error;

      setVideos(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  }, [user, page, debouncedSearch]);

  useEffect(() => {
    loadPinnedVideos();
  }, [loadPinnedVideos]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

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
        await Promise.all([loadPinnedVideos(), loadVideos()]);
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Failed to update pin status');
    } finally {
      setPinningVideoId(null);
    }
  };

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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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

        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <Pin className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            You can pin any active HuTube video to the platform-wide feed. Pinned videos appear at the top of the HuTube feed with a "Pinned by Admin" badge. Up to 5 videos can be pinned at once.
          </p>
        </div>

        {pinnedVideos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Pin className="w-5 h-5 text-blue-600" />
              Currently Pinned ({pinnedVideos.length}/5)
            </h2>
            <div className="space-y-4">
              {pinnedVideos.map(video => (
                <div
                  key={video.id}
                  className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <Pin className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{video.title}</h3>
                          <p className="text-gray-600 mb-4 text-sm">{truncateContent(video.description)}</p>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
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
                              <div className="flex items-center gap-1 text-blue-600 font-medium">
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
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap flex-shrink-0"
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
          <div className="flex items-center justify-between mb-4 gap-4">
            <h2 className="text-xl font-semibold text-gray-900">All Videos</h2>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search videos by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-gray-200">
              Loading videos...
            </div>
          ) : videos.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-gray-200">
              <Pin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">
                {debouncedSearch ? 'No videos match your search' : 'No videos available'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {videos.map(video => (
                  <div
                    key={video.id}
                    className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{video.title}</h3>
                        <p className="text-gray-600 mb-4 text-sm">{truncateContent(video.description)}</p>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
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
                        disabled={pinningVideoId === video.id || pinnedVideos.length >= 5}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                        title={pinnedVideos.length >= 5 ? 'Maximum 5 videos can be pinned at once' : ''}
                      >
                        <Pin className="w-4 h-4" />
                        Pin
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages >= 1 && (
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-gray-600">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} videos
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-gray-700 px-2">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
