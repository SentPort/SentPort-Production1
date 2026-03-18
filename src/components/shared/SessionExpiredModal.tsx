import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onReauthenticate: () => void;
}

export default function SessionExpiredModal({ isOpen, onReauthenticate }: SessionExpiredModalProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReauthenticate = () => {
    const currentPath = window.location.pathname + window.location.search;
    navigate(`/signin?redirect=${encodeURIComponent(currentPath)}`);
    onReauthenticate();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border-2 border-yellow-500/50 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-yellow-500/20 p-3 rounded-full">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Session Expired</h2>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Your session has expired for security reasons. Please sign in again to continue.
          </p>
          <p className="text-sm text-gray-400">
            You will be redirected to the sign-in page and returned to this page after authentication.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReauthenticate}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Sign In Again
          </button>
        </div>
      </div>
    </div>
  );
}
