import { useEffect, useState } from 'react';
import { useFlaggedContentNotifications } from '../../hooks/useFlaggedContentNotifications';
import FlaggedContentNotificationModal from './FlaggedContentNotificationModal';

export default function FlaggedContentNotificationWrapper() {
  const { pendingNotification, markAsShown, dismissNotification } = useFlaggedContentNotifications();
  const [showFlaggedModal, setShowFlaggedModal] = useState(false);

  useEffect(() => {
    if (pendingNotification && !showFlaggedModal) {
      setShowFlaggedModal(true);
      if (!pendingNotification.notification_shown_at) {
        markAsShown(pendingNotification.id);
      }
    }
  }, [pendingNotification, showFlaggedModal, markAsShown]);

  const handleDismissFlaggedNotification = () => {
    if (pendingNotification) {
      dismissNotification(pendingNotification.id);
      setShowFlaggedModal(false);
    }
  };

  if (!pendingNotification) return null;

  return (
    <FlaggedContentNotificationModal
      notification={pendingNotification}
      onDismiss={handleDismissFlaggedNotification}
      isVisible={showFlaggedModal}
    />
  );
}
