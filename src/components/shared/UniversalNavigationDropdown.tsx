import { useState, useRef, useEffect } from 'react';
import { Home, Search, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ALL_PLATFORMS } from '../../lib/platformHelpers';
import QuickSearchModal from './QuickSearchModal';

interface UniversalNavigationDropdownProps {
  currentPlatform?: string;
}

export default function UniversalNavigationDropdown({ currentPlatform }: UniversalNavigationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredPlatforms = ALL_PLATFORMS.filter(
    platform => platform.name !== currentPlatform
  );

  const handleSearchClick = () => {
    setShowSearchModal(true);
    setIsOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
          title="Quick Navigation"
        >
          <Home className="w-6 h-6 text-gray-600" />
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 border-b border-gray-100">
              <div
                className="relative group cursor-pointer"
                onClick={handleSearchClick}
              >
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search the Human-Only Web..."
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 hover:bg-white transition-colors"
                  onClick={handleSearchClick}
                />
              </div>
            </div>

            <div className="py-1">
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">SentPort Home</span>
              </Link>

              <Link
                to="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">Dashboard</span>
              </Link>
            </div>

            <div className="border-t border-gray-100 mt-1 pt-1">
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Platforms</p>
              </div>
              {filteredPlatforms.map((platform) => {
                const Icon = platform.icon;
                const colorMap: Record<string, string> = {
                  'bg-blue-600': 'bg-blue-100 text-blue-600',
                  'bg-yellow-500': 'bg-yellow-100 text-yellow-600',
                  'bg-red-600': 'bg-red-100 text-red-600',
                  'bg-pink-600': 'bg-pink-100 text-pink-600',
                  'bg-orange-600': 'bg-orange-100 text-orange-600',
                  'bg-green-600': 'bg-green-100 text-green-600',
                };
                const iconColorClass = colorMap[platform.iconColor] || 'bg-gray-100 text-gray-600';

                return (
                  <Link
                    key={platform.name}
                    to={platform.route}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                      {platform.displayName}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <QuickSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        initialQuery={searchQuery}
      />
    </>
  );
}
