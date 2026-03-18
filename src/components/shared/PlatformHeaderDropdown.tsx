import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown, Video, CreditCard as Edit3, Eye, UserCog } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface PlatformHeaderDropdownProps {
  platform: 'heddit' | 'switter' | 'hinsta' | 'hutube' | 'blog';
}

export default function PlatformHeaderDropdown({ platform }: PlatformHeaderDropdownProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [platformAccount, setPlatformAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchPlatformAccount();
    }
  }, [user, platform]);

  useEffect(() => {
    if (!user) return;

    const tableMap = {
      heddit: 'heddit_accounts',
      switter: 'switter_accounts',
      hinsta: 'hinsta_accounts',
      hutube: 'hutube_channels',
      blog: 'blog_accounts'
    };

    // Blog platform uses 'id' as FK to user_profiles, others use 'user_id'
    const filterField = platform === 'blog' ? 'id' : 'user_id';

    const subscription = supabase
      .channel(`${platform}_account_changes`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableMap[platform],
          filter: `${filterField}=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          setPlatformAccount(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, platform]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPlatformAccount = async () => {
    if (!user) return;

    setLoading(true);
    const tableMap = {
      heddit: 'heddit_accounts',
      switter: 'switter_accounts',
      hinsta: 'hinsta_accounts',
      hutube: 'hutube_channels',
      blog: 'blog_accounts'
    };

    // Blog platform uses 'id' as FK to user_profiles, others use 'user_id'
    const filterField = platform === 'blog' ? 'id' : 'user_id';

    const { data } = await supabase
      .from(tableMap[platform])
      .select('*')
      .eq(filterField, user.id)
      .maybeSingle();

    setPlatformAccount(data);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getProfileLink = () => {
    if (!platformAccount) return '#';

    const linkMap = {
      heddit: `/heddit/user/${platformAccount.username}`,
      switter: `/switter/user/${platformAccount.handle}`,
      hinsta: `/hinsta/profile/${platformAccount.username}`,
      hutube: `/hutube/channel/${platformAccount.handle}`,
      blog: `/blog/author/${platformAccount.username}`
    };

    return linkMap[platform];
  };

  const getMyProfileLink = () => {
    if (!platformAccount) return '#';

    const linkMap = {
      heddit: `/heddit/settings`,
      switter: `/switter/settings`,
      hinsta: `/hinsta/settings`,
      hutube: `/hutube/profile`,
      blog: `/blog/edit-profile`
    };

    return linkMap[platform];
  };

  const getSettingsLink = () => {
    if (!platformAccount) return '#';

    const linkMap = {
      heddit: `/heddit/settings`,
      switter: `/switter/settings`,
      hinsta: `/hinsta/settings`,
      hutube: `/hutube/settings`,
      blog: `/blog/settings`
    };

    return linkMap[platform];
  };

  const getDisplayName = () => {
    if (loading) return 'Loading...';
    if (!platformAccount) return 'User';
    return platformAccount.display_name || platformAccount.channel_name || 'User';
  };

  const getAvatar = () => {
    if (!platformAccount) return null;
    return platformAccount.profile_photo_url || platformAccount.avatar_url || platformAccount.profile_image_url || null;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {getAvatar() ? (
          <img
            src={getAvatar()}
            alt={getDisplayName()}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        )}
        <span className="hidden sm:inline font-medium text-gray-700">{getDisplayName()}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <Link
            to="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700">View Profile</span>
          </Link>

          <Link
            to="/edit-profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <UserCog className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700">Edit Profile</span>
          </Link>

          <div className="border-t border-gray-200 my-2"></div>

          {platformAccount && (
            <>
              <Link
                to={getProfileLink()}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <Video className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">My Channel</span>
              </Link>

              <Link
                to={getMyProfileLink()}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <Edit3 className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">My Profile</span>
              </Link>

              <Link
                to={getSettingsLink()}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">
                  {platform === 'hutube' ? 'HuTube Settings' :
                   platform === 'heddit' ? 'Heddit Settings' :
                   platform === 'switter' ? 'Switter Settings' :
                   platform === 'hinsta' ? 'Hinsta Settings' :
                   platform === 'blog' ? 'Blog Settings' : 'Settings'}
                </span>
              </Link>

              <div className="border-t border-gray-200 my-2"></div>
            </>
          )}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors w-full text-left"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span className="text-red-600">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
