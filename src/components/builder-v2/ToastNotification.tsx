import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastNotificationProps {
  message: string;
  show: boolean;
  onClose: () => void;
  duration?: number;
}

export default function ToastNotification({
  message,
  show,
  onClose,
  duration = 3000
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show && !isVisible) return null;

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-2xl border border-gray-200 px-6 py-4 flex items-center gap-3 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
      <p className="text-gray-900 font-medium">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
