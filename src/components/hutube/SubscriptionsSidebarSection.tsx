import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
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

interface SubscriptionsSidebarSectionProps {
  darkMode?: boolean;
  collapsedSidebar?: boolean;
}

export default function SubscriptionsSidebarSection({
  darkMode = false,
  collapsedSidebar = false,
}: SubscriptionsSidebarSectionProps) {
  const { user } = useAuth();
  const [channels, setChannels] = useState<SubscribedChannel[]>([]);
  const [allChannels, setAllChannels] = useState<SubscribedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscribedChannels();

      // Set up real-time subscription to subscription changes
      const subscription = supabase
        .channel('subscriptions_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hutube_subscriptions',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadSubscribedChannels();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
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

          // If there's no view record, the video is new to the user
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

      // Store all channels and limit display to top 7
      setAllChannels(channelsData);
      setChannels(channelsData.slice(0, 7));
    } catch (error) {
      console.error('Error loading subscribed channels:', error);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  };

  if (collapsedSidebar) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <div className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'} my-2`}></div>

      {/* Subscriptions Header */}
      <Link
        to="/hutube/subscriptions"
        className={`flex items-center justify-between gap-3 px-3 py-2 ${
          darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
        } rounded-lg transition-colors group`}
      >
        <span className="font-medium">Subscriptions</span>
        <ChevronRight size={18} className="flex-shrink-0" />
      </Link>

      {/* Channel List */}
      {loading ? (
        <div className="px-3 py-2 space-y-2">
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
        <>
          <div className="space-y-0.5">
            {(isExpanded ? allChannels : channels).map((channel) => (
              <Link
                key={channel.id}
                to={`/hutube/channel/${channel.handle}`}
                className={`flex items-center gap-3 px-3 py-1.5 ${
                  darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                } rounded-lg transition-colors group relative`}
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
                <span className="text-sm truncate flex-1 group-hover:text-red-600 transition-colors">
                  {channel.display_name}
                </span>
              </Link>
            ))}
          </div>

          {/* Show More / Show Less Controls */}
          {allChannels.length > 7 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
              } rounded-lg transition-colors`}
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={18} className="flex-shrink-0" />
                  <span>Show less</span>
                </>
              ) : (
                <>
                  <ChevronDown size={18} className="flex-shrink-0" />
                  <span>Show more</span>
                </>
              )}
            </button>
          )}
        </>
      ) : (
        <div className="px-3 py-2">
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No subscriptions yet
          </p>
        </div>
      )}
    </>
  );
}
