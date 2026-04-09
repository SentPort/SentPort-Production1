import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Plus, Search, TrendingUp, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';

interface Subreddit {
  id: string;
  name: string;
  display_name: string;
  description: string;
  member_count: number;
}

export default function Communities() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Subreddit[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Subreddit[]>([]);
  const [moderatedIds, setModeratedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'joined'>('discover');

  useEffect(() => {
    if (authLoading) return;
    loadCommunities();
  }, [user, authLoading]);

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const { data: allData, error: allError } = await supabase
        .from('heddit_subreddits')
        .select('id, name, display_name, description, member_count')
        .order('member_count', { ascending: false })
        .limit(50);

      if (allError) console.error('Error fetching subreddits:', allError);
      if (allData) setCommunities(allData);

      if (user) {
        const { data: account } = await supabase
          .from('heddit_accounts')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (account) {
          const [membershipResult, moderatorResult] = await Promise.all([
            supabase
              .from('heddit_subreddit_members')
              .select('subreddit_id')
              .eq('account_id', account.id),
            supabase
              .from('heddit_subreddit_moderators')
              .select('subreddit_id')
              .eq('account_id', account.id),
          ]);

          const memberIds = (membershipResult.data || []).map(m => m.subreddit_id);
          const modIds = (moderatorResult.data || []).map(m => m.subreddit_id);
          const allJoinedIds = [...new Set([...memberIds, ...modIds])];

          setModeratedIds(new Set(modIds));

          if (allJoinedIds.length > 0) {
            const { data: joinedData } = await supabase
              .from('heddit_subreddits')
              .select('id, name, display_name, description, member_count')
              .in('id', allJoinedIds)
              .order('member_count', { ascending: false });

            if (joinedData) {
              const sorted = [...joinedData].sort((a, b) => {
                const aMod = modIds.includes(a.id) ? 0 : 1;
                const bMod = modIds.includes(b.id) ? 0 : 1;
                return aMod - bMod;
              });
              setJoinedCommunities(sorted);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading communities:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = (list: Subreddit[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      c => c.display_name.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
    );
  };

  const displayList = filtered(activeTab === 'joined' ? joinedCommunities : communities);

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showCreateButtons={false}>
        <div className="max-w-2xl mx-auto px-4 py-4 pb-20">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Communities</h1>
            <button
              onClick={() => navigate('/heddit/create-subreddit')}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search communities..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            />
          </div>

          {user && (
            <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('discover')}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'discover' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Discover
              </button>
              <button
                onClick={() => setActiveTab('joined')}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'joined' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Joined {joinedCommunities.length > 0 && `(${joinedCommunities.length})`}
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              {activeTab === 'joined' ? (
                <>
                  <p className="text-gray-500 font-medium mb-1">No communities joined yet</p>
                  <p className="text-sm text-gray-400 mb-4">Discover communities to get started</p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="text-orange-500 text-sm font-medium"
                  >
                    Browse Communities
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 font-medium mb-1">No communities found</p>
                  <p className="text-sm text-gray-400 mb-4">Be the first to create one!</p>
                  <button
                    onClick={() => navigate('/heddit/create-subreddit')}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Create a Community
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {displayList.map((community, index) => (
                <Link
                  key={community.id}
                  to={`/heddit/h/${community.name}`}
                  className="flex items-center gap-3 bg-white rounded-lg p-3.5 hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-bold text-sm">
                      {(community.display_name || community.name).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        h/{community.name}
                      </p>
                      {index < 3 && activeTab === 'discover' && (
                        <TrendingUp className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                      )}
                      {activeTab === 'joined' && moderatedIds.has(community.id) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium flex-shrink-0">
                          <Shield className="w-3 h-3" />
                          Mod
                        </span>
                      )}
                      {activeTab === 'joined' && !moderatedIds.has(community.id) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-medium flex-shrink-0">
                          Member
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{community.display_name}</p>
                    {community.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{community.description}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-700">{(community.member_count || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">members</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </HedditLayout>
    </PlatformGuard>
  );
}
