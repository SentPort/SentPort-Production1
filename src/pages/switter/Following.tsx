import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';

interface Following {
  id: string;
  following: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string;
    bio: string;
    verified_badge: boolean;
    follower_count: number;
  };
}

export default function Following() {
  const { handle } = useParams();
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Following[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    loadFollowing();
  }, [handle]);

  const loadFollowing = async () => {
    if (!handle) return;

    setLoading(true);

    const { data: profile } = await supabase
      .from('switter_accounts')
      .select('id, display_name, user_id')
      .eq('handle', handle)
      .maybeSingle();

    if (!profile) {
      setLoading(false);
      return;
    }

    setProfileName(profile.display_name);

    const { data } = await supabase
      .from('switter_follows')
      .select(`
        id,
        following:following_id(*)
      `)
      .eq('follower_id', profile.user_id)
      .order('created_at', { ascending: false });

    if (data) {
      setFollowing(data.map((f: any) => ({
        id: f.id,
        following: f.following
      })));
    }

    setLoading(false);
  };

  const filteredFollowing = following.filter(f =>
    f.following.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.following.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <PlatformGuard platform="switter" redirectTo="/switter/join">
        <SwitterLayout showBackButton>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </SwitterLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="switter" redirectTo="/switter/join">
      <SwitterLayout showBackButton>
        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="px-4 py-3">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5" />
                {profileName}'s Following
              </h1>
            </div>
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search following..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {filteredFollowing.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Not following anyone yet</p>
            </div>
          ) : (
            <div>
              {filteredFollowing.map((item) => (
                <Link
                  key={item.id}
                  to={`/switter/u/${item.following.handle}`}
                  className="block border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.following.avatar_url || 'https://via.placeholder.com/48'}
                      alt={item.following.display_name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold truncate">{item.following.display_name}</p>
                        {item.following.verified_badge && (
                          <span className="text-blue-500">✓</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm">@{item.following.handle}</p>
                      {item.following.bio && (
                        <p className="text-sm mt-1 line-clamp-2">{item.following.bio}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        {item.following.follower_count} followers
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
