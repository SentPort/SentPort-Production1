import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Star, Heart, TrendingUp, Award, Crown, Sparkles, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';

interface LeaderboardUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  quality_score: number;
  karma: number;
  kindness: number;
  rank: number;
}

interface LeaderboardData {
  quality: LeaderboardUser[];
  karma: LeaderboardUser[];
  kindness: LeaderboardUser[];
}

interface UserRank {
  quality_rank: number;
  karma_rank: number;
  kindness_rank: number;
}

type LeaderboardTab = 'quality' | 'karma' | 'kindness';

export default function Leaderboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('quality');
  const [leaderboards, setLeaderboards] = useState<LeaderboardData | null>(null);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [userAccountId, setUserAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserAccount();
    }
    loadLeaderboards();
  }, [user]);

  const loadUserAccount = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('heddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setUserAccountId(data.id);
        loadUserRank(data.id);
      }
    } catch (error) {
      console.error('Error loading user account:', error);
    }
  };

  const loadUserRank = async (accountId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_leaderboard_rank', {
        user_account_id: accountId
      });

      if (error) throw error;
      setUserRank(data);
    } catch (error) {
      console.error('Error loading user rank:', error);
    }
  };

  const loadLeaderboards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_heddit_leaderboards', { limit_count: 100 });

      if (error) throw error;
      setLeaderboards(data);
    } catch (error) {
      console.error('Error loading leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-orange-500" />;
    return null;
  };

  const getRankBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-500';
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-400';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-400';
    if (rank === 3) return 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-400';
    return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const tabs = [
    { id: 'quality' as LeaderboardTab, label: 'Quality Leaders', icon: Trophy, description: 'The ultimate ranking', color: 'text-blue-600' },
    { id: 'karma' as LeaderboardTab, label: 'Top Karma', icon: Star, description: 'Most active contributors', color: 'text-yellow-600' },
    { id: 'kindness' as LeaderboardTab, label: 'Most Kindness', icon: Heart, description: 'Most appreciated members', color: 'text-pink-600' },
  ];

  const currentLeaders = leaderboards?.[activeTab] || [];
  const currentTab = tabs.find(t => t.id === activeTab)!;

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout>
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 mb-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-10 h-10" />
                <div>
                  <h1 className="text-3xl font-bold">Heddit Leaderboard</h1>
                  <p className="text-blue-100">The new influencers of the Human Web</p>
                </div>
              </div>
              <Link
                to="/heddit/karma-guide"
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
              >
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">How Rankings Work</span>
              </Link>
            </div>

            {userRank && userAccountId && (
              <div className="mt-6 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-sm text-blue-100 mb-2">Your Rankings</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">#{formatNumber(userRank.quality_rank)}</div>
                    <div className="text-xs text-blue-100">Quality</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">#{formatNumber(userRank.karma_rank)}</div>
                    <div className="text-xs text-blue-100">Karma</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">#{formatNumber(userRank.kindness_rank)}</div>
                    <div className="text-xs text-blue-100">Kindness</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-fit px-6 py-4 font-medium transition-all ${
                      activeTab === tab.id
                        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? tab.color : ''}`} />
                      <div className="text-left">
                        <div className="font-bold">{tab.label}</div>
                        <div className="text-xs opacity-75">{tab.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : currentLeaders.length === 0 ? (
                <div className="text-center py-16">
                  <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Leaders Yet</h3>
                  <p className="text-gray-600 dark:text-gray-400">Be the first to contribute and climb the ranks!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentLeaders.map(leader => (
                    <Link
                      key={leader.id}
                      to={`/heddit/u/${leader.username}`}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:shadow-lg ${getRankBg(leader.rank, leader.id === userAccountId)}`}
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-gray-900 border-2 border-current font-bold text-lg">
                        {leader.rank <= 3 ? (
                          getRankMedal(leader.rank)
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">#{leader.rank}</span>
                        )}
                      </div>

                      {leader.avatar_url ? (
                        <img
                          src={leader.avatar_url}
                          alt={leader.display_name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-md"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold border-2 border-white dark:border-gray-700 shadow-md">
                          {leader.display_name[0].toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-lg text-gray-900 dark:text-white truncate">
                          {leader.display_name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          @{leader.username}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          {activeTab === 'quality' && <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                          {activeTab === 'karma' && <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
                          {activeTab === 'kindness' && <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />}
                          <span className={`text-2xl font-bold ${
                            activeTab === 'quality' ? 'text-blue-600 dark:text-blue-400' :
                            activeTab === 'karma' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-pink-600 dark:text-pink-400'
                          }`}>
                            {activeTab === 'quality' && formatNumber(leader.quality_score)}
                            {activeTab === 'karma' && formatNumber(leader.karma)}
                            {activeTab === 'kindness' && formatNumber(leader.kindness)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-x-2">
                          <span>{formatNumber(leader.karma)} karma</span>
                          <span>•</span>
                          <span>{formatNumber(leader.kindness)} kindness</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </HedditLayout>
    </PlatformGuard>
  );
}
