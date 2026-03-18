import { ExternalLink, BookOpen, Video, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SharedContentCardProps {
  platform: string;
  contentType: string;
  contentId: string;
  url?: string;
  title?: string;
  author?: string;
  excerpt?: string;
  thumbnail?: string;
  className?: string;
}

export default function SharedContentCard({
  platform,
  contentType,
  contentId,
  url,
  title,
  author,
  excerpt,
  thumbnail,
  className = ''
}: SharedContentCardProps) {
  const navigate = useNavigate();

  const platformConfig = {
    hublog: { name: 'HuBlog', color: 'blue', icon: BookOpen },
    hutube: { name: 'HuTube', color: 'red', icon: Video },
    hinsta: { name: 'Hinsta', color: 'pink', icon: ImageIcon },
    heddit: { name: 'Heddit', color: 'orange', icon: MessageSquare },
    switter: { name: 'Switter', color: 'sky', icon: MessageSquare }
  };

  const config = platformConfig[platform as keyof typeof platformConfig] || {
    name: platform,
    color: 'gray',
    icon: ExternalLink
  };

  const Icon = config.icon;

  const handleClick = () => {
    if (url) {
      if (url.startsWith('http')) {
        window.open(url, '_blank');
      } else {
        navigate(url);
      }
    }
  };

  const bgColor = `bg-${config.color}-50`;
  const borderColor = `border-${config.color}-200`;
  const textColor = `text-${config.color}-700`;
  const iconColor = `text-${config.color}-600`;
  const hoverBg = `hover:bg-${config.color}-100`;

  return (
    <div
      onClick={handleClick}
      className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${bgColor} ${borderColor} ${hoverBg} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 bg-white rounded-lg ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold uppercase tracking-wide ${textColor}`}>
              Shared from {config.name}
            </span>
            <ExternalLink className={`w-3 h-3 ${iconColor}`} />
          </div>

          {title && (
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
              {title}
            </h3>
          )}

          {author && (
            <p className="text-sm text-gray-600 mb-1">
              by {author}
            </p>
          )}

          {excerpt && (
            <p className="text-sm text-gray-700 line-clamp-2 mb-2">
              {excerpt}
            </p>
          )}

          <button
            className={`text-sm font-medium ${textColor} hover:underline inline-flex items-center gap-1`}
          >
            View Original
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {thumbnail && (
          <img
            src={thumbnail}
            alt={title || 'Shared content'}
            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          />
        )}
      </div>
    </div>
  );
}
