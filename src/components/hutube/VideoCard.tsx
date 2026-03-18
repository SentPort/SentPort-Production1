import { Link } from 'react-router-dom';
import { Clock, Eye } from 'lucide-react';
import VideoItemMenu from './VideoItemMenu';

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url?: string;
    duration?: number;
    view_count: number;
    created_at: string;
    channel?: {
      id: string;
      display_name: string;
      handle: string;
      avatar_url?: string;
    };
  };
  showChannel?: boolean;
  compact?: boolean;
  showMenu?: boolean;
  onRemoveFromLiked?: () => void;
  onRemoveFromWatchLater?: () => void;
  onRemoveFromPlaylist?: () => void;
}

export default function VideoCard({ video, showChannel = true, compact = false, showMenu = false, onRemoveFromLiked, onRemoveFromWatchLater, onRemoveFromPlaylist }: VideoCardProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }
    return 'Just now';
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (compact) {
    return (
      <div className="group cursor-pointer">
        <Link to={`/hutube/watch/${video.id}`}>
          <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden mb-2">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700">
                <span className="text-white text-4xl font-bold opacity-50">HT</span>
              </div>
            )}
            {video.duration && (
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded">
                {formatDuration(video.duration)}
              </div>
            )}
          </div>
        </Link>

        <div className="flex gap-2">
          {showChannel && video.channel?.avatar_url && (
            <Link to={`/hutube/channel/${video.channel.handle}`}>
              <img
                src={video.channel.avatar_url}
                alt={video.channel.display_name}
                className="w-9 h-9 rounded-full flex-shrink-0 hover:opacity-80 transition-opacity"
              />
            </Link>
          )}
          <div className="flex-1 min-w-0">
            <Link to={`/hutube/watch/${video.id}`}>
              <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-red-600 transition-colors">
                {video.title}
              </h3>
            </Link>
            {showChannel && video.channel && (
              <Link to={`/hutube/channel/${video.channel.handle}`}>
                <p className="text-xs text-gray-600 hover:text-gray-900 mt-1">
                  {video.channel.display_name}
                </p>
              </Link>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <Eye size={12} />
                {formatViewCount(video.view_count)} views
              </span>
              <span>•</span>
              <span>{formatTimeAgo(video.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group cursor-pointer relative">
      <Link to={`/hutube/watch/${video.id}`}>
        <div className="relative aspect-video bg-gray-200 rounded-xl overflow-hidden mb-3">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700">
              <span className="text-white text-5xl font-bold opacity-50">HT</span>
            </div>
          )}
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-90 text-white text-xs font-semibold px-2 py-1 rounded">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>
      </Link>
      {showMenu && (
        <div className="absolute top-2 right-2 z-10">
          <VideoItemMenu
            videoId={video.id}
            videoTitle={video.title}
            onRemoveFromLiked={onRemoveFromLiked}
            showRemoveFromLiked={!!onRemoveFromLiked}
            onRemoveFromWatchLater={onRemoveFromWatchLater}
            showRemoveFromWatchLater={!!onRemoveFromWatchLater}
            onRemoveFromPlaylist={onRemoveFromPlaylist}
            showRemoveFromPlaylist={!!onRemoveFromPlaylist}
          />
        </div>
      )}

      <div className="flex gap-3">
        {showChannel && video.channel?.avatar_url && (
          <Link to={`/hutube/channel/${video.channel.handle}`}>
            <img
              src={video.channel.avatar_url}
              alt={video.channel.display_name}
              className="w-10 h-10 rounded-full flex-shrink-0 hover:opacity-80 transition-opacity"
            />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <Link to={`/hutube/watch/${video.id}`}>
            <h3 className="font-semibold text-base line-clamp-2 leading-snug mb-1 group-hover:text-red-600 transition-colors">
              {video.title}
            </h3>
          </Link>
          {showChannel && video.channel && (
            <Link to={`/hutube/channel/${video.channel.handle}`}>
              <p className="text-sm text-gray-600 hover:text-gray-900 mb-0.5">
                {video.channel.display_name}
              </p>
            </Link>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {formatViewCount(video.view_count)} views
            </span>
            <span>•</span>
            <span>{formatTimeAgo(video.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
