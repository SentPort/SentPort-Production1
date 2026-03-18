import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useHuBook } from '../../contexts/HuBookContext';
import { usePageTracking } from '../../hooks/usePageTracking';
import SignInRequired from './SignInRequired';
import JoinHuBook from './JoinHuBook';
import EmailNotVerified from '../EmailNotVerified';

export default function HuBookRouter({ children }: { children: React.ReactNode }) {
  const { user, isVerified, isEmailVerified, isAdmin, loading: authLoading, isAuthTransitioning } = useAuth();
  const { hubookProfile, loading: hubookLoading } = useHuBook();
  usePageTracking('hubook');

  if (authLoading || hubookLoading || isAuthTransitioning) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <SignInRequired />;
  }

  if (!isEmailVerified && !isAdmin) {
    return <EmailNotVerified />;
  }

  if (!isVerified && !isAdmin) {
    return <Navigate to="/get-verified" replace />;
  }

  if (!hubookProfile) {
    return <JoinHuBook />;
  }

  return <>{children}</>;
}
