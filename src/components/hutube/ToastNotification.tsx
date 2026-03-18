import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface ToastNotificationProps {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export default function ToastNotification({
  id,
  type,
  message,
  duration = 4000,
  onClose,
}: ToastNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-500',
          text: 'text-green-800',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          text: 'text-red-800',
          icon: <XCircle className="w-5 h-5 text-red-500" />,
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          text: 'text-yellow-800',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-500',
          text: 'text-blue-800',
          icon: <Info className="w-5 h-5 text-blue-500" />,
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`${styles.bg} ${styles.border} border-l-4 rounded-lg shadow-lg p-4 mb-3 flex items-center gap-3 min-w-[320px] max-w-md animate-slide-in-right`}
    >
      {styles.icon}
      <p className={`${styles.text} flex-1 text-sm font-medium`}>{message}</p>
      <button
        onClick={() => onClose(id)}
        className={`${styles.text} hover:opacity-70 transition-opacity`}
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
