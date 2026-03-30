import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VerificationStatusModalProps {
  status: 'approved' | 'declined';
  onClose: () => void;
}

export default function VerificationStatusModal({ status, onClose }: VerificationStatusModalProps) {
  const navigate = useNavigate();
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    if (status === 'approved') {
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
      }));
      setConfetti(pieces);
    }
  }, [status]);

  const handleClose = () => {
    onClose();
    if (status === 'approved') {
      navigate('/dashboard');
    }
  };

  if (status === 'approved') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative overflow-hidden">
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="absolute w-2 h-2 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full animate-fall"
              style={{
                left: `${piece.left}%`,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
              }}
            />
          ))}

          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6 animate-bounce">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Verification Approved!
          </h2>

          <p className="text-lg text-gray-600 mb-6">
            Congratulations! Your identity has been successfully verified. You now have full access to all platform features.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              You can now access HuBook, Heddit, HuTube, Hinsta, Switter, and HuBlog. Your verified badge will appear on your profile shortly.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>

        <style>{`
          @keyframes fall {
            0% {
              transform: translateY(-100vh) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(360deg);
              opacity: 0;
            }
          }
          .animate-fall {
            animation: fall linear forwards;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-6">
          <XCircle className="w-12 h-12 text-orange-600" />
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Verification Not Approved
        </h2>

        <p className="text-lg text-gray-600 mb-6">
          Unfortunately, your verification could not be completed at this time.
        </p>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 mb-3">
            Common reasons for verification decline:
          </p>
          <ul className="text-left text-sm text-gray-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-orange-600 mt-1">•</span>
              <span>Document image was unclear or blurry</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 mt-1">•</span>
              <span>Document does not match required format</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 mt-1">•</span>
              <span>Liveness check did not pass</span>
            </li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
