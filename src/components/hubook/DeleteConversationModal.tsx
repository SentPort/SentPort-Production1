import { X } from 'lucide-react';

interface DeleteConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
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
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete this conversation{otherParticipantName ? ` with ${otherParticipantName}` : ''}?
          </p>
          <p className="text-sm text-gray-600">
            This will only remove the conversation from your messages. The other person will still have access to it.
          </p>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
