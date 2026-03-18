import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmationDialog from './ConfirmationDialog';

export default function AdminModeToggle() {
  const { userProfile, adminModeEnabled, toggleAdminMode } = useAuth();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!userProfile?.is_admin) {
    return null;
  }

  const handleToggleClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    toggleAdminMode();

    if (adminModeEnabled && location.pathname.startsWith('/admin/')) {
      navigate('/dashboard');
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <button
        onClick={handleToggleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white transition-all ${
          adminModeEnabled
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-orange-600 hover:bg-orange-700'
        }`}
      >
        {adminModeEnabled ? (
          <>
            <Shield size={16} />
            <span>Admin Mode</span>
          </>
        ) : (
          <>
            <User size={16} />
            <span>User Mode</span>
          </>
        )}
      </button>

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        title={adminModeEnabled ? 'Switch to User Mode?' : 'Switch to Admin Mode?'}
        message={
          adminModeEnabled
            ? "You'll temporarily lose admin access and see the site as an unverified user. Any unsaved work may be lost."
            : "You'll regain full admin access and verification status."
        }
        confirmText="Switch Mode"
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        variant="warning"
      />
    </>
  );
}
