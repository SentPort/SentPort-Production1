import { AlertTriangle, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FlaggedContentNotification {
  id: string;
  post_id: string;
  platform: string;
  content_preview: string;
  created_at: string;
}

interface FlaggedContentNotificationModalProps {
  notification: FlaggedContentNotification;
  onDismiss: () => void;
  isVisible: boolean;
}

const platformNames: Record<string, string> = {
  hubook: 'HuBook',
  heddit: 'Heddit',
  hutube: 'HuTube',
  hinsta: 'Hinsta',
  switter: 'Switter',
  hublog: 'HuBlog'
};

const platformColors: Record<string, string> = {
  hubook: 'from-blue-500 to-blue-600',
  heddit: 'from-orange-500 to-orange-600',
  hutube: 'from-red-500 to-red-600',
  hinsta: 'from-pink-500 to-pink-600',
  switter: 'from-sky-500 to-sky-600',
  hublog: 'from-green-500 to-green-600'
};

export default function FlaggedContentNotificationModal({
  notification,
  onDismiss,
  isVisible
}: FlaggedContentNotificationModalProps) {
  const navigate = useNavigate();

  if (!isVisible) return null;

  const platformName = platformNames[notification.platform] || notification.platform;
  const platformGradient = platformColors[notification.platform] || 'from-gray-500 to-gray-600';

  const handleViewPost = () => {
    // Navigate to the appropriate platform page based on platform type
    switch (notification.platform) {
      case 'hubook':
        navigate('/hubook/feed');
        break;
      case 'heddit':
        navigate('/heddit/feed');
        break;
      case 'hutube':
        navigate('/hutube');
        break;
      case 'hinsta':
        navigate('/hinsta');
        break;
      case 'switter':
        navigate('/switter');
        break;
      case 'hublog':
        navigate('/blog');
        break;
    }
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all animate-slideUp">
        {/* Header with warning color */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Content Under Review
                </h2>
                <p className="text-yellow-100 text-sm mt-1">
                  Your post has been flagged for review
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-white hover:text-yellow-100 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Platform Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Platform:</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${platformGradient}`}>
              {platformName}
            </span>
          </div>

          {/* Post Preview */}
          {notification.content_preview && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Your Post:</p>
              <p className="text-gray-800 line-clamp-3">
                {notification.content_preview}
                {notification.content_preview.length >= 150 && '...'}
              </p>
            </div>
          )}

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              What This Means
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                Your post has received a significant number of reports as fake content and has been temporarily paused while our admin team reviews it.
              </p>
              <p className="font-medium">
                The post is currently hidden from other users and will remain so until the review is complete.
              </p>
            </div>
          </div>

          {/* Timeline Box */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="font-semibold text-green-900 mb-3">Review Timeline</h3>
            <div className="space-y-2 text-sm text-green-800">
              <p>
                Our admin team will review your post within <span className="font-bold">24-48 hours</span>.
              </p>
              <p>
                After the review, your post will either be restored to active status or removed if it violates our community guidelines.
              </p>
              <p className="text-xs text-green-700 mt-3">
                You'll receive a notification once the review is complete.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleViewPost}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Eye className="w-5 h-5" />
              View Post Details
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors duration-200 border-2 border-gray-300"
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
