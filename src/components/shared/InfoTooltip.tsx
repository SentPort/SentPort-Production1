import { Info } from 'lucide-react';
import { useState } from 'react';

interface InfoTooltipProps {
  title: string;
  description: string;
  advertiserValue?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ title, description, advertiserValue, position = 'top' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent';
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent';
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent';
      case 'top':
      default:
        return 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent';
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full"
        aria-label="More information"
      >
        <Info className="w-4 h-4" />
      </button>

      {isVisible && (
        <div
          className={`absolute z-50 w-80 ${getPositionClasses()} pointer-events-none`}
          role="tooltip"
        >
          <div className="bg-gray-900 text-white rounded-lg shadow-xl p-4 text-sm">
            <div className="font-semibold text-white mb-2">{title}</div>

            <div className="space-y-3">
              <div>
                <div className="text-gray-300 text-xs font-medium mb-1">What this means:</div>
                <div className="text-gray-100 text-xs leading-relaxed">{description}</div>
              </div>

              {advertiserValue && (
                <div className="pt-2 border-t border-gray-700">
                  <div className="text-blue-300 text-xs font-medium mb-1">Why advertisers care:</div>
                  <div className="text-gray-100 text-xs leading-relaxed">{advertiserValue}</div>
                </div>
              )}
            </div>
          </div>

          <div className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`} />
        </div>
      )}
    </div>
  );
}
