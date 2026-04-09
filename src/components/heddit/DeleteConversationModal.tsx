import { X, EyeOff, Ban } from 'lucide-react';

interface DeleteConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (permanent: boolean) => void;
  otherParticipantName?: string;
}

export function DeleteConversationModal({
  isOpen,
  onClose,
  onConfirm,
  otherParticipantName
}: DeleteConversationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Delete Conversation</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-6">
            How would you like to delete this conversation{otherParticipantName ? ` with ${otherParticipantName}` : ''}?
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                onConfirm(false);
                onClose();
              }}
              className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all text-left group"
            >
              <div className="flex items-start gap-3">
                <EyeOff className="w-5 h-5 text-gray-600 group-hover:text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 group-hover:text-orange-900">Hide Conversation</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Remove from your messages list. If they send you a new message, the conversation will reappear automatically.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                onConfirm(true);
                onClose();
              }}
              className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all text-left group"
            >
              <div className="flex items-start gap-3">
                <Ban className="w-5 h-5 text-gray-600 group-hover:text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 group-hover:text-red-900">Block and Delete Forever</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Permanently delete this conversation. Any future messages sent to you within this conversation will not be delivered to you.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
