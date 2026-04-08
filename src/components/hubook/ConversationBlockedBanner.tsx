import { AlertCircle, MessageCircle } from 'lucide-react';

interface ConversationBlockedBannerProps {
  otherUserDisplayName: string;
  onStartNewConversation: () => void;
}

export function ConversationBlockedBanner({
  otherUserDisplayName,
  onStartNewConversation
}: ConversationBlockedBannerProps) {
  const firstName = otherUserDisplayName.split(' ')[0];

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mx-4 mt-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">{firstName}</span> has deleted this conversation.
            Therefore, future messages sent to them from this conversation will not be delivered.
            To contact <span className="font-semibold">{firstName}</span> moving forward, please start a new conversation.
          </p>
          <button
            onClick={onStartNewConversation}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            Start New Conversation
          </button>
        </div>
      </div>
    </div>
  );
}
