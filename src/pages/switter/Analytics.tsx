import { useEffect, useState } from 'react';
import { TrendingUp, Users, Eye, Heart, MessageCircle, Repeat2, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';
import MetricCard from '../../components/switter/analytics/MetricCard';
import LineChart from '../../components/switter/analytics/LineChart';
import BarChart from '../../components/switter/analytics/BarChart';
import PieChart from '../../components/switter/analytics/PieChart';

interface AnalyticsSummary {
  totalTweets: number;
  totalImpressions: number;
  totalEngagements: number;
  totalProfileVisits: number;
  followerGrowth: number;
}

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalTweets: 0,
    totalImpressions: 0,
    totalEngagements: 0,
    totalProfileVisits: 0,
    followerGrowth: 0
  });
  const [timeRange, setTimeRange] = useState<'7d' | '28d' | '90d'>('28d');
  const [tweetTrend, setTweetTrend] = useState<{ label: string; value: number }[]>([]);
  const [engagementTrend, setEngagementTrend] = useState<{ label: string; value: number }[]>([]);
  const [topTweets, setTopTweets] = useState<{ label: string; value: number }[]>([]);
  const [engagementBreakdown, setEngagementBreakdown] = useState<{ label: string; value: number; color: string }[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, user]);

  const loadAnalytics = async () => {
    if (!user) return;

    setLoading(true);

    const { data: account } = await supabase
      .from('switter_accounts')
      .select('id, follower_count, tweet_count')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) {
      setLoading(false);
      return;
    }

    const days = timeRange === '7d' ? 7 : timeRange === '28d' ? 28 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: dailyData } = await supabase
      .from('switter_analytics_daily')
      .select('*')
      .eq('account_id', account.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    const { data: profileViews } = await supabase
      .from('switter_profile_views')
      .select('id')
      .eq('profile_account_id', account.id)
      .gte('viewed_at', startDate.toISOString());

    const { data: tweets } = await supabase
      .from('switter_tweets')
      .select('id, content, like_count, comment_count, retweet_count, created_at')
      .eq('author_id', account.id)
      .gte('created_at', startDate.toISOString())
      .order('like_count', { ascending: false })
      .limit(5);

    const totalImpressions = dailyData?.reduce((sum, day) => sum + (day.impression_count || 0), 0) || 0;
    const totalEngagements = dailyData?.reduce((sum, day) => sum + (day.engagement_count || 0), 0) || 0;
    const followerGain = dailyData?.reduce((sum, day) => sum + (day.follower_gain || 0), 0) || 0;
    const followerLoss = dailyData?.reduce((sum, day) => sum + (day.follower_loss || 0), 0) || 0;

    setSummary({
      totalTweets: account.tweet_count,
      totalImpressions,
      totalEngagements,
      totalProfileVisits: profileViews?.length || 0,
      followerGrowth: followerGain - followerLoss
    });

    if (dailyData && dailyData.length > 0) {
      const tweetData = dailyData.map(day => ({
        label: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: day.tweet_count || 0
      }));
      setTweetTrend(tweetData);

      const engagementData = dailyData.map(day => ({
        label: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: day.engagement_count || 0
      }));
      setEngagementTrend(engagementData);
    }

    if (tweets && tweets.length > 0) {
      const topTweetData = tweets.map((tweet, idx) => ({
        label: `Tweet ${idx + 1}: ${tweet.content.substring(0, 30)}...`,
        value: tweet.like_count + tweet.comment_count + tweet.retweet_count
      }));
      setTopTweets(topTweetData);

      const totalLikes = tweets.reduce((sum, t) => sum + t.like_count, 0);
      const totalComments = tweets.reduce((sum, t) => sum + t.comment_count, 0);
      const totalRetweets = tweets.reduce((sum, t) => sum + t.retweet_count, 0);

      setEngagementBreakdown([
        { label: 'Likes', value: totalLikes, color: '#EF4444' },
        { label: 'Comments', value: totalComments, color: '#3B82F6' },
        { label: 'Resweets', value: totalRetweets, color: '#10B981' }
      ]);
    }

    setLoading(false);
  };

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
        <div className="max-w-6xl mx-auto min-h-screen bg-gray-50">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-gray-600 mt-1">Track your Switter performance</p>
          </div>

          <div className="p-6">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === '7d'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Last 7 days
              </button>
              <button
                onClick={() => setTimeRange('28d')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === '28d'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Last 28 days
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === '90d'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Last 90 days
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <MetricCard
                title="Total Sweets"
                value={summary.totalTweets.toLocaleString()}
                icon={BarChart3}
                iconColor="text-blue-500"
              />
              <MetricCard
                title="Impressions"
                value={summary.totalImpressions.toLocaleString()}
                icon={Eye}
                iconColor="text-purple-500"
              />
              <MetricCard
                title="Engagements"
                value={summary.totalEngagements.toLocaleString()}
                icon={TrendingUp}
                iconColor="text-green-500"
              />
              <MetricCard
                title="Profile Visits"
                value={summary.totalProfileVisits.toLocaleString()}
                icon={Users}
                iconColor="text-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <LineChart
                data={tweetTrend}
                title="Sweets Over Time"
                color="#3B82F6"
              />
              <LineChart
                data={engagementTrend}
                title="Engagements Over Time"
                color="#10B981"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BarChart
                data={topTweets}
                title="Top Performing Sweets"
              />
              <PieChart
                data={engagementBreakdown}
                title="Engagement Breakdown"
              />
            </div>
          </div>
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
