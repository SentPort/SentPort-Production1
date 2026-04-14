import { EyeOff, Ban, X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onConfirm: (permanent: boolean) => void;
  otherUserName: string;
}

export default function BlogDeleteConversationModal({ onClose, onConfirm, otherUserName }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Delete Conversation</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <button
            onClick={() => onConfirm(false)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center flex-shrink-0 transition-colors">
              <EyeOff className="w-5 h-5 text-gray-500 group-hover:text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Hide Conversation</p>
              <p className="text-sm text-gray-500">Remove from your list. If {otherUserName} messages you again, it will reappear.</p>
            </div>
          </button>

          <button
            onClick={() => onConfirm(true)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition-colors">
              <Ban className="w-5 h-5 text-gray-500 group-hover:text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-600">Block and Delete Forever</p>
              <p className="text-sm text-gray-500">
                Permanently delete this conversation. {otherUserName} will see a warning that you have deleted the conversation and that they must start a new one if they want to reach you.
              </p>
            </div>
          </button>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
