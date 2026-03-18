import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Star, Heart, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

type LeaderboardTab = 'quality' | 'karma' | 'kindness';

export default function LeaderboardWidget() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('quality');
  const [leaderboards, setLeaderboards] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboards();
    const interval = setInterval(loadLeaderboards, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadLeaderboards = async () => {
    try {
      const { data, error } = await supabase.rpc('get_heddit_leaderboards', { limit_count: 5 });

      if (error) throw error;
      setLeaderboards(data);
    } catch (error) {
      console.error('Error loading leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600 dark:text-yellow-400';
    if (rank === 2) return 'text-gray-500 dark:text-gray-400';
    if (rank === 3) return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    if (rank === 2) return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
    if (rank === 3) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  };

  const tabs = [
    { id: 'quality' as LeaderboardTab, label: 'Quality', icon: Trophy, color: 'text-blue-600' },
    { id: 'karma' as LeaderboardTab, label: 'Karma', icon: Star, color: 'text-yellow-600' },
    { id: 'kindness' as LeaderboardTab, label: 'Kindness', icon: Heart, color: 'text-pink-600' },
  ];

  const currentLeaders = leaderboards?.[activeTab] || [];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-gray-900 dark:text-white">Leaderboard</h3>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? tab.color : ''}`} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-2 p-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : currentLeaders.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No leaders yet. Be the first!
          </div>
        ) : (
          <div className="space-y-1.5">
            {currentLeaders.map(user => (
              <Link
                key={user.id}
                to={`/heddit/u/${user.username}`}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all hover:shadow-sm ${getRankBg(user.rank)}`}
              >
                <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-current ${getRankColor(user.rank)} font-bold text-xs`}>
                  {user.rank}
                </div>

                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                    {user.display_name[0].toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                    {user.display_name}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {activeTab === 'quality' && (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {formatNumber(user.quality_score)}
                      </span>
                    )}
                    {activeTab === 'karma' && (
                      <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                        {formatNumber(user.karma)}
                      </span>
                    )}
                    {activeTab === 'kindness' && (
                      <span className="text-pink-600 dark:text-pink-400 font-medium">
                        {formatNumber(user.kindness)}
                      </span>
                    )}
                  </div>
                </div>

                {user.rank <= 3 && (
                  <div className={getRankColor(user.rank)}>
                    {user.rank === 1 && <Trophy className="w-4 h-4" />}
                    {user.rank === 2 && <Trophy className="w-4 h-4" />}
                    {user.rank === 3 && <Trophy className="w-4 h-4" />}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <Link
        to="/heddit/leaderboard"
        className="block px-4 py-2.5 text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-t border-gray-200 dark:border-gray-700 transition-colors"
      >
        View Full Leaderboard
      </Link>
    </div>
  );
}
