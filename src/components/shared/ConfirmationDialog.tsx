import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  variant?: 'warning' | 'danger' | 'info';
  confirmStyle?: 'warning' | 'danger' | 'info';
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  onClose,
  variant,
  confirmStyle
}: ConfirmationDialogProps) {
  const handleCancel = onCancel || onClose || (() => {});
  const finalVariant = variant || confirmStyle || 'warning';
  if (!isOpen) return null;

  const variantStyles = {
    warning: 'bg-orange-50 border-orange-200',
    danger: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200'
  };

  const iconStyles = {
    warning: 'text-orange-600',
    danger: 'text-red-600',
    info: 'text-blue-600'
  };

  const buttonStyles = {
    warning: 'bg-orange-600 hover:bg-orange-700',
    danger: 'bg-red-600 hover:bg-red-700',
    info: 'bg-blue-600 hover:bg-blue-700'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className={`p-6 border-l-4 ${variantStyles[finalVariant]} rounded-t-lg`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertTriangle className={`h-6 w-6 ${iconStyles[finalVariant]} flex-shrink-0 mt-0.5`} />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${buttonStyles[finalVariant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
