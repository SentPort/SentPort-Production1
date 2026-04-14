import { AlertCircle, MessageCircle } from 'lucide-react';

interface Props {
  otherUserName: string;
  onStartNew: () => void;
}

export default function BlogConversationBlockedBanner({ otherUserName, onStartNew }: Props) {
  return (
    <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">Conversation deleted</p>
        <p className="text-sm text-amber-700 mt-0.5">
          {otherUserName} has deleted this conversation and will not receive new messages here. Start a new conversation if you want to reach them.
        </p>
        <button
          onClick={onStartNew}
          className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-amber-800 hover:text-amber-900 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Start a new conversation
        </button>
      </div>
    </div>
  );
}
