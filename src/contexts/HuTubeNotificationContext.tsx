import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ToastNotification, { NotificationType } from '../components/hutube/ToastNotification';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface HuTubeNotificationContextType {
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showNotification: (type: NotificationType, message: string, duration?: number) => void;
}

const HuTubeNotificationContext = createContext<HuTubeNotificationContextType | undefined>(
  undefined
);

export function useHuTubeNotification() {
  const context = useContext(HuTubeNotificationContext);
  if (!context) {
    throw new Error('useHuTubeNotification must be used within HuTubeNotificationProvider');
  }
  return context;
}

interface HuTubeNotificationProviderProps {
  children: ReactNode;
}

export function HuTubeNotificationProvider({ children }: HuTubeNotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback(
    (type: NotificationType, message: string, duration?: number) => {
      const id = `${Date.now()}-${Math.random()}`;
      const notification: Notification = { id, type, message, duration };

      setNotifications((prev) => [...prev, notification]);
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showNotification('success', message, duration);
    },
    [showNotification]
  );

  const showError = useCallback(
    (message: string, duration?: number) => {
      showNotification('error', message, duration);
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      showNotification('info', message, duration);
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      showNotification('warning', message, duration);
    },
    [showNotification]
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <HuTubeNotificationContext.Provider
      value={{
        showSuccess,
        showError,
        showInfo,
        showWarning,
        showNotification,
      }}
    >
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col">
        {notifications.map((notification) => (
          <ToastNotification
            key={notification.id}
            id={notification.id}
            type={notification.type}
            message={notification.message}
            duration={notification.duration}
            onClose={removeNotification}
          />
        ))}
      </div>
    </HuTubeNotificationContext.Provider>
  );
}
