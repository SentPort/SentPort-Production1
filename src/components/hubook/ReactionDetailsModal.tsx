import { X, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';

export interface ReactionDetail {
  reaction_type: string;
  user_id: string;
  display_name: string;
  profile_photo_url: string | null;
  created_at: string;
}

interface ReactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reactions: ReactionDetail[];
}

const REACTION_EMOJIS: Record<string, string> = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😠',
  care: '🤗',
  dislike: '👎'
};

const REACTION_LABELS: Record<string, string> = {
  like: 'Like',
  love: 'Love',
  laugh: 'Laugh',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Sad',
  angry: 'Angry',
  care: 'Care',
  dislike: 'Dislike'
};

export default function ReactionDetailsModal({ isOpen, onClose, reactions }: ReactionDetailsModalProps) {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<string>('all');

  const reactionsByType = useMemo(() => {
    const groups: Record<string, ReactionDetail[]> = {};
    reactions.forEach(reaction => {
      if (!groups[reaction.reaction_type]) {
        groups[reaction.reaction_type] = [];
      }
      groups[reaction.reaction_type].push(reaction);
    });
    return groups;
  }, [reactions]);

  const filteredReactions = useMemo(() => {
    if (selectedTab === 'all') {
      return reactions;
    }
    return reactionsByType[selectedTab] || [];
  }, [selectedTab, reactions, reactionsByType]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleUserClick = (userId: string) => {
    navigate(`/hubook/profile/${userId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Reactions</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto">
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              selectedTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All {reactions.length > 0 && `(${reactions.length})`}
          </button>
          {Object.entries(reactionsByType).map(([type, typeReactions]) => (
            <button
              key={type}
              onClick={() => setSelectedTab(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                selectedTab === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{REACTION_EMOJIS[type] || '👍'}</span>
              <span>{REACTION_LABELS[type] || type}</span>
              <span className="ml-1">({typeReactions.length})</span>
            </button>
          ))}
        </div>

        {/* Reaction List */}
        <div className="flex-1 overflow-y-auto">
          {filteredReactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <p>No reactions yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredReactions.map((reaction, index) => (
                <div
                  key={`${reaction.user_id}-${index}`}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleUserClick(reaction.user_id)}
                >
                  {/* Profile Photo */}
                  <div className="flex-shrink-0">
                    {reaction.profile_photo_url ? (
                      <img
                        src={reaction.profile_photo_url}
                        alt={reaction.display_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {reaction.display_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatTimeAgo(reaction.created_at)}
                    </p>
                  </div>

                  {/* Reaction Emoji */}
                  <div className="flex-shrink-0 text-2xl">
                    {REACTION_EMOJIS[reaction.reaction_type] || '👍'}
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
