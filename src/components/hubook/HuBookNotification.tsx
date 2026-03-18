import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface HuBookNotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function HuBookNotification({
  type,
  message,
  onClose,
  duration = 4000
}: HuBookNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      textColor: 'text-green-900'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-900'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900'
    }
  }[type];

  const Icon = config.icon;

  return (
    <div className="fixed top-4 right-4 z-[60] animate-slide-in-right">
      <div
        className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg shadow-lg px-4 py-3 pr-10 max-w-md min-w-[300px]`}
      >
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 ${config.iconColor} shrink-0 mt-0.5`} />
          <p className={`${config.textColor} font-medium text-sm`}>{message}</p>
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-black hover:bg-opacity-5 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
