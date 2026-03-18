import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function TestingModeBanner() {
  const { userProfile, adminModeEnabled, toggleAdminMode } = useAuth();

  if (!userProfile?.is_admin || adminModeEnabled) {
    return null;
  }

  return (
    <div className="bg-orange-500 text-white py-3 px-4 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">
            Testing Mode Active: You're viewing as a non-verified user
          </span>
        </div>
        <button
          onClick={toggleAdminMode}
          className="flex items-center space-x-2 bg-white text-orange-600 px-4 py-1.5 rounded-md font-medium hover:bg-orange-50 transition-colors"
        >
          <X className="h-4 w-4" />
          <span>Exit Testing Mode</span>
        </button>
      </div>
    </div>
  );
}
