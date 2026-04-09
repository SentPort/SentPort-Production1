import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PlatformBackButtonProps {
  fallbackPath: string;
  className?: string;
}

export default function PlatformBackButton({ fallbackPath, className = '' }: PlatformBackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5" />
      <span className="font-medium hidden sm:inline">Back</span>
    </button>
  );
}
