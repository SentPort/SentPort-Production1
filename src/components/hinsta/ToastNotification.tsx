import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);

    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  const config = {
    success: {
      icon: CheckCircle,
      bgGradient: 'from-purple-500 to-pink-500',
      bgSolid: 'bg-gradient-to-r from-purple-500 to-pink-500',
      iconColor: 'text-white',
      borderColor: 'border-purple-200',
    },
    error: {
      icon: AlertCircle,
      bgGradient: 'from-red-500 to-rose-500',
      bgSolid: 'bg-gradient-to-r from-red-500 to-rose-500',
      iconColor: 'text-white',
      borderColor: 'border-red-200',
    },
    warning: {
      icon: AlertTriangle,
      bgGradient: 'from-orange-500 to-amber-500',
      bgSolid: 'bg-gradient-to-r from-orange-500 to-amber-500',
      iconColor: 'text-white',
      borderColor: 'border-orange-200',
    },
    info: {
      icon: Info,
      bgGradient: 'from-blue-500 to-cyan-500',
      bgSolid: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      iconColor: 'text-white',
      borderColor: 'border-blue-200',
    },
  };

  const { icon: Icon, bgGradient, bgSolid, iconColor, borderColor } = config[type];

  return (
    <div
      className={`mb-3 transition-all duration-300 transform ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}
    >
      <div className={`relative bg-gradient-to-r ${bgGradient} rounded-lg shadow-lg overflow-hidden min-w-[320px] max-w-md`}>
        <div className="p-4 flex items-start gap-3">
          <div className="flex-shrink-0">
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white leading-relaxed">{message}</p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="h-1 bg-white/20">
          <div
            className="h-full bg-white/60 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
