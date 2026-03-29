import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

export default function VerificationReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const status = searchParams.get('status');
  const error = searchParams.get('error');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/get-verified');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const renderContent = () => {
    if (error) {
      return (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Verification Error
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            {error === 'missing_session' && 'No verification session found. Please try again.'}
            {error === 'session_not_found' && 'Could not locate your verification session. Please contact support.'}
            {error === 'internal_error' && 'An unexpected error occurred. Please try again later.'}
            {!['missing_session', 'session_not_found', 'internal_error'].includes(error) && 'An error occurred during verification.'}
          </p>
        </div>
      );
    }

    if (status === 'approved') {
      return (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Verification Complete!
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Your identity has been successfully verified. You'll receive a confirmation shortly once our system processes your verification.
          </p>
        </div>
      );
    }

    if (status === 'in_review') {
      return (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-6">
            <Clock className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Verification Under Review
          </h1>
          <p className="text-lg text-gray-600 mb-4 max-w-2xl mx-auto">
            Thank you for completing the verification process. Your submission is currently being reviewed by Didit's verification team.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto mb-8">
            <h2 className="font-semibold text-gray-900 mb-2 flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
              What happens next?
            </h2>
            <ul className="text-left text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Didit's review team will manually examine your verification submission</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Reviews typically complete within 24-48 hours</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>You'll be notified automatically once the review is complete</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>No action is required from you at this time</span>
              </li>
            </ul>
          </div>
        </div>
      );
    }

    if (status === 'declined') {
      return (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-6">
            <XCircle className="w-12 h-12 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Verification Not Approved
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Unfortunately, your verification could not be completed. Please try again with different documentation or contact support for assistance.
          </p>
        </div>
      );
    }

    if (status === 'abandoned') {
      return (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
            <AlertTriangle className="w-12 h-12 text-gray-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Verification Cancelled
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Your verification session was cancelled. You can start a new verification whenever you're ready.
          </p>
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-6">
          <Clock className="w-12 h-12 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Verification Submitted
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Thank you for completing the verification process. We'll notify you once your verification is complete.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        {renderContent()}

        <div className="text-center mt-8">
          <p className="text-gray-500 mb-4">
            Redirecting to verification page in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>
          <button
            onClick={() => navigate('/get-verified')}
            className="text-blue-600 hover:text-blue-700 font-medium underline"
          >
            Return now
          </button>
        </div>
      </div>
    </div>
  );
}
