import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface HedditNotificationContextType {
  showNotification: (type: NotificationType, message: string, duration?: number) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
}

const HedditNotificationContext = createContext<HedditNotificationContextType | null>(null);

export function useHedditNotification() {
  const context = useContext(HedditNotificationContext);
  if (!context) {
    throw new Error('useHedditNotification must be used within HedditNotificationProvider');
  }
  return context;
}

interface ToastProps {
  notification: Notification;
  onClose: () => void;
}

function Toast({ notification, onClose }: ToastProps) {
  const getTypeStyles = () => {
    switch (notification.type) {
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
      <p className={`${styles.text} flex-1 text-sm font-medium`}>{notification.message}</p>
      <button
        onClick={onClose}
        className={`${styles.text} hover:opacity-70 transition-opacity`}
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function HedditNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback((type: NotificationType, message: string, duration = 4000) => {
    const id = Date.now().toString() + Math.random().toString(36);
    const notification: Notification = { id, type, message, duration };

    setNotifications(prev => [...prev, notification]);

    setTimeout(() => {
      removeNotification(id);
    }, duration);
  }, [removeNotification]);

  const showError = useCallback((message: string) => {
    showNotification('error', message);
  }, [showNotification]);

  const showSuccess = useCallback((message: string) => {
    showNotification('success', message);
  }, [showNotification]);

  const showInfo = useCallback((message: string) => {
    showNotification('info', message);
  }, [showNotification]);

  const showWarning = useCallback((message: string) => {
    showNotification('warning', message);
  }, [showNotification]);

  return (
    <HedditNotificationContext.Provider
      value={{ showNotification, showError, showSuccess, showInfo, showWarning }}
    >
      {children}

      <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
        {notifications.map(notification => (
          <Toast
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </HedditNotificationContext.Provider>
  );
}
