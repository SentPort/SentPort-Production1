import { useState, useEffect } from 'react';
import { X, Lock, Award } from 'lucide-react';
import * as Icons from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Badge {
  id: string;
  name: string;
  description: string;
  badge_type: 'quality' | 'karma' | 'kindness' | 'special';
  threshold_value: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  icon_name: string;
  color: string;
  sort_order: number;
  earned_at?: string;
  is_displayed?: boolean;
}

interface BadgeShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAccountId: string;
  currentKarma: number;
  currentKindness: number;
  currentQuality: number;
}

type BadgeTab = 'quality' | 'karma' | 'kindness';

export default function BadgeShowcaseModal({
  isOpen,
  onClose,
  userAccountId,
  currentKarma,
  currentKindness,
  currentQuality
}: BadgeShowcaseModalProps) {
  const [activeTab, setActiveTab] = useState<BadgeTab>('quality');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadBadges();
    }
  }, [isOpen, userAccountId]);

  const loadBadges = async () => {
    setLoading(true);
    try {
      const [badgesRes, userBadgesRes] = await Promise.all([
        supabase.from('heddit_badges').select('*').order('sort_order'),
        supabase.from('heddit_user_badges').select('badge_id').eq('user_id', userAccountId)
      ]);

      if (badgesRes.error) throw badgesRes.error;
      if (userBadgesRes.error) throw userBadgesRes.error;

      setBadges(badgesRes.data || []);
      setEarnedBadgeIds(new Set(userBadgesRes.data?.map(b => b.badge_id) || []));
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'from-orange-400 to-orange-600';
      case 'silver': return 'from-gray-300 to-gray-500';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'platinum': return 'from-gray-200 to-gray-400';
      case 'diamond': return 'from-cyan-300 to-blue-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getTierBorder = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'border-orange-500';
      case 'silver': return 'border-gray-400';
      case 'gold': return 'border-yellow-500';
      case 'platinum': return 'border-gray-300';
      case 'diamond': return 'border-cyan-400';
      default: return 'border-gray-400';
    }
  };

  const getProgressTowardsBadge = (badge: Badge) => {
    const currentValue = badge.badge_type === 'quality' ? currentQuality
      : badge.badge_type === 'karma' ? currentKarma
      : currentKindness;

    const progress = Math.min((currentValue / badge.threshold_value) * 100, 100);
    const remaining = Math.max(badge.threshold_value - currentValue, 0);

    return { progress, remaining };
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName];
    return Icon || Icons.Award;
  };

  const tabs = [
    { id: 'quality' as BadgeTab, label: 'Quality', count: badges.filter(b => b.badge_type === 'quality' && earnedBadgeIds.has(b.id)).length },
    { id: 'karma' as BadgeTab, label: 'Karma', count: badges.filter(b => b.badge_type === 'karma' && earnedBadgeIds.has(b.id)).length },
    { id: 'kindness' as BadgeTab, label: 'Kindness', count: badges.filter(b => b.badge_type === 'kindness' && earnedBadgeIds.has(b.id)).length },
  ];

  const filteredBadges = badges.filter(b => b.badge_type === activeTab);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Badge Collection</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Earn badges by contributing to the community
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.label}
                <span className="ml-2 text-sm opacity-75">({tab.count})</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg h-40"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
              {filteredBadges.map(badge => {
                const isEarned = earnedBadgeIds.has(badge.id);
                const { progress, remaining } = getProgressTowardsBadge(badge);
                const Icon = getIconComponent(badge.icon_name);

                return (
                  <div
                    key={badge.id}
                    className={`relative rounded-lg border-2 p-4 transition-all ${
                      isEarned
                        ? `bg-gradient-to-br ${getTierColor(badge.tier)} ${getTierBorder(badge.tier)} shadow-lg`
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 opacity-60'
                    }`}
                  >
                    {!isEarned && (
                      <div className="absolute top-3 right-3">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                    )}

                    <div className={`flex items-center justify-center w-16 h-16 mx-auto mb-3 rounded-full ${
                      isEarned ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      <Icon className={`w-8 h-8 ${isEarned ? 'text-white' : 'text-gray-400'}`} />
                    </div>

                    <h3 className={`text-center font-bold mb-1 ${
                      isEarned ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {badge.name}
                    </h3>

                    <p className={`text-xs text-center mb-3 ${
                      isEarned ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {badge.description}
                    </p>

                    {!isEarned && progress > 0 && progress < 100 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>{progress.toFixed(0)}%</span>
                          <span>{remaining.toLocaleString()} more needed</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {!isEarned && progress === 0 && (
                      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                        Reach {badge.threshold_value.toLocaleString()} {activeTab}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
