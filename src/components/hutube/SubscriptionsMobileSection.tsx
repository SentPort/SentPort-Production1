import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SubscribedChannel {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  latest_video_date: string | null;
  has_new_content: boolean;
}

interface SubscriptionsMobileSectionProps {
  darkMode?: boolean;
  onNavigate?: () => void;
}

export default function SubscriptionsMobileSection({
  darkMode = false,
  onNavigate,
}: SubscriptionsMobileSectionProps) {
  const { user } = useAuth();
  const [channels, setChannels] = useState<SubscribedChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubscribedChannels();
    }
  }, [user]);

  const loadSubscribedChannels = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get subscribed channels
      const { data: subscriptions, error: subsError } = await supabase
        .from('hutube_subscriptions')
        .select(`
          channel_id,
          hutube_channels (
            id,
            handle,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id);

      if (subsError) throw subsError;
      if (!subscriptions || subscriptions.length === 0) {
        setChannels([]);
        setLoading(false);
        return;
      }

      // Get latest video for each channel and check for new content
      const channelPromises = subscriptions.map(async (sub: any) => {
        const channel = Array.isArray(sub.hutube_channels) ? sub.hutube_channels[0] : sub.hutube_channels;
        if (!channel) return null;

        // Get the most recent video from this channel
        const { data: latestVideo } = await supabase
          .from('hutube_videos')
          .select('id, created_at')
          .eq('channel_id', channel.id)
          .eq('privacy', 'public')
          .eq('is_draft', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let hasNewContent = false;

        if (latestVideo) {
          // Check if user has viewed this video
          const { data: viewRecord } = await supabase
            .from('hutube_video_views')
            .select('id')
            .eq('video_id', latestVideo.id)
            .eq('user_id', user.id)
            .maybeSingle();

          hasNewContent = !viewRecord;
        }

        return {
          id: channel.id,
          handle: channel.handle,
          display_name: channel.display_name,
          avatar_url: channel.avatar_url,
          latest_video_date: latestVideo?.created_at || null,
          has_new_content: hasNewContent,
        };
      });

      const channelsData = (await Promise.all(channelPromises)).filter(Boolean) as SubscribedChannel[];

      // Sort by most recent upload first
      channelsData.sort((a, b) => {
        if (!a.latest_video_date) return 1;
        if (!b.latest_video_date) return -1;
        return new Date(b.latest_video_date).getTime() - new Date(a.latest_video_date).getTime();
      });

      // Limit to top 7 most active channels
      setChannels(channelsData.slice(0, 7));
    } catch (error) {
      console.error('Error loading subscribed channels:', error);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="mt-1">
      {/* Subscriptions Header */}
      <Link
        to="/hutube/subscriptions"
        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
          darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
        }`}
        onClick={onNavigate}
      >
        <span className="font-medium">Subscriptions</span>
        <ChevronRight size={18} className="flex-shrink-0" />
      </Link>

      {/* Channel List */}
      {loading ? (
        <div className="px-3 py-1 space-y-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex items-center gap-3 animate-pulse ${
                darkMode ? 'bg-gray-800' : 'bg-gray-100'
              } rounded-lg px-2 py-1.5`}
            >
              <div className={`w-6 h-6 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              <div className={`h-3 flex-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            </div>
          ))}
        </div>
      ) : channels.length > 0 ? (
        <div className="space-y-0.5 pl-2">
          {channels.map((channel) => (
            <Link
              key={channel.id}
              to={`/hutube/channel/${channel.handle}`}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors ${
                darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
              } relative`}
              onClick={onNavigate}
            >
              {/* Blue dot indicator for new content */}
              {channel.has_new_content && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
              )}

              {/* Channel avatar */}
              <div className="relative flex-shrink-0">
                {channel.avatar_url ? (
                  <img
                    src={channel.avatar_url}
                    alt={channel.display_name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {channel.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Channel name */}
              <span className="text-sm truncate flex-1">
                {channel.display_name}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="px-3 py-2 pl-5">
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No subscriptions yet
          </p>
        </div>
      )}
    </div>
  );
}
