import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, LayoutDashboard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SubdomainDashboardNotificationProps {
  onDismiss?: () => void;
  autoShow?: boolean;
}

export default function SubdomainDashboardNotification({
  onDismiss,
  autoShow = true
}: SubdomainDashboardNotificationProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    if (autoShow) {
      checkIfDismissed();
    }
  }, [user, autoShow]);

  const checkIfDismissed = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_notification_dismissals')
        .select('id')
        .eq('user_id', user.id)
        .eq('notification_type', 'subdomain_dashboard_announcement')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setIsVisible(true);
        setTimeout(() => setIsAnimating(true), 100);
      }
    } catch (err) {
      console.error('Error checking notification dismissal:', err);
    }
  };

  const handleDismiss = async () => {
    if (!user || isDismissing) return;

    setIsDismissing(true);

    try {
      const { error } = await supabase
        .from('user_notification_dismissals')
        .insert([
          {
            user_id: user.id,
            notification_type: 'subdomain_dashboard_announcement',
          }
        ]);

      if (error) throw error;

      setIsAnimating(false);
      setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) onDismiss();
      }, 300);
    } catch (err) {
      console.error('Error dismissing notification:', err);
    } finally {
      setIsDismissing(false);
    }
  };

  const handleViewDashboard = () => {
    navigate('/dashboard');
  };

  if (!isVisible) return null;

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl shadow-lg overflow-hidden">
        <div className="relative p-6">
          <button
            onClick={handleDismiss}
            disabled={isDismissing}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Dismiss notification"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 pr-8">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md animate-pulse">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-gray-900">
                  New Feature: Subdomain Dashboard
                </h3>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  NEW
                </span>
              </div>

              <p className="text-gray-700 mb-4 leading-relaxed">
                You now have access to a dedicated subdomain management dashboard! View analytics,
                track visitor metrics, manage your subdomains, and delete them if needed—all in one place.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleViewDashboard}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  View Your Dashboard
                </button>

                <button
                  onClick={handleDismiss}
                  disabled={isDismissing}
                  className="inline-flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition-colors duration-200 border border-gray-300 disabled:opacity-50"
                >
                  {isDismissing ? 'Dismissing...' : 'Got it, thanks!'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
      </div>
    </div>
  );
}
