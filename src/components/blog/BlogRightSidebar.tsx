import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, TrendingUp, Sparkles, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import JuryPoolVolunteerButton from '../shared/JuryPoolVolunteerButton';

interface Writer {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  tagline: string | null;
}

interface TrendingTag {
  tag: string;
  count: number;
}

interface ReadingStats {
  storiesReadThisWeek: number;
  readingTimeToday: number;
  readingStreak: number;
}

export default function BlogRightSidebar() {
  const { user } = useAuth();
  const [suggestedWriters, setSuggestedWriters] = useState<Writer[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [readingStats, setReadingStats] = useState<ReadingStats>({
    storiesReadThisWeek: 0,
    readingTimeToday: 0,
    readingStreak: 0
  });

  useEffect(() => {
    loadSuggestedWriters();
    loadTrendingTags();
    if (user) {
      loadReadingStats();
    }
  }, [user]);

  const loadSuggestedWriters = async () => {
    const { data } = await supabase
      .from('blog_accounts')
      .select('id, username, display_name, avatar_url, follower_count, tagline')
      .order('follower_count', { ascending: false })
      .limit(5);

    if (data) {
      setSuggestedWriters(data);
    }
  };

  const loadTrendingTags = async () => {
    const { data } = await supabase
      .from('blog_post_interests')
      .select('interest_id, blog_interests(name)')
      .limit(10);

    if (data) {
      const tagCounts: { [key: string]: number } = {};
      data.forEach(item => {
        const interest = (item as any).blog_interests;
        if (interest?.name) {
          tagCounts[interest.name] = (tagCounts[interest.name] || 0) + 1;
        }
      });

      const trending = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      setTrendingTags(trending);
    }
  };

  const loadReadingStats = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data: weekData } = await supabase
        .from('blog_read_progress')
        .select('post_id, completed_at')
        .eq('user_id', user.id)
        .gte('session_start_at', weekAgo.toISOString())
        .gte('completion_percentage', 80);

      const uniquePostsThisWeek = new Set(
        weekData?.filter(item => item.completed_at).map(item => item.post_id) || []
      );

      const { data: todayData } = await supabase
        .from('blog_read_progress')
        .select('active_reading_seconds')
        .eq('user_id', user.id)
        .gte('session_start_at', todayStart.toISOString());

      const totalSecondsToday = todayData?.reduce(
        (sum, item) => sum + (item.active_reading_seconds || 0),
        0
      ) || 0;

      const readingMinutesToday = Math.round(totalSecondsToday / 60);

      const { data: streakData } = await supabase
        .from('blog_read_progress')
        .select('session_start_at, completed_at')
        .eq('user_id', user.id)
        .gte('completion_percentage', 80)
        .not('completed_at', 'is', null)
        .order('session_start_at', { ascending: false })
        .limit(365);

      let streak = 0;
      if (streakData && streakData.length > 0) {
        const daysSeen = new Set<string>();
        streakData.forEach(item => {
          const date = new Date(item.session_start_at);
          const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          daysSeen.add(dateStr);
        });

        const sortedDays = Array.from(daysSeen).sort().reverse();
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

        if (sortedDays[0] === todayStr || sortedDays[0] === yesterdayStr) {
          streak = 1;
          for (let i = 1; i < sortedDays.length; i++) {
            const prevDate = new Date(sortedDays[i - 1]);
            const currDate = new Date(sortedDays[i]);
            const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000));

            if (diffDays === 1) {
              streak++;
            } else {
              break;
            }
          }
        }
      }

      setReadingStats({
        storiesReadThisWeek: uniquePostsThisWeek.size,
        readingTimeToday: readingMinutesToday,
        readingStreak: streak
      });
    } catch (error) {
      console.error('Error loading reading stats:', error);
    }
  };

  return (
    <aside className="hidden xl:block fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 border-l border-slate-600/30 overflow-y-auto z-40 shadow-2xl">
      {/* Jury Pool Button */}
      <div className="p-5 border-b border-slate-600/30">
        <JuryPoolVolunteerButton variant="compact" requireVerified={false} />
      </div>

      {/* Writers to Follow */}
      <div className="p-5 border-b border-slate-600/30">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-white">Writers to Follow</h3>
        </div>
        <div className="space-y-3">
          {suggestedWriters.map((writer) => (
            <Link
              key={writer.id}
              to={`/blog/profile/${writer.username}`}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/10 backdrop-blur-sm transition-all duration-200 group border border-transparent hover:border-emerald-500/30"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-md">
                {writer.avatar_url ? (
                  <img src={writer.avatar_url} alt={writer.display_name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  writer.display_name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate group-hover:text-emerald-300 transition-colors">
                  {writer.display_name}
                </p>
                <p className="text-xs text-gray-400 truncate">@{writer.username}</p>
                {writer.tagline && (
                  <p className="text-xs text-gray-300 mt-1 line-clamp-2">{writer.tagline}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
        <Link
          to="/blog/discover-writers"
          className="block mt-4 text-center text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          See all recommendations
        </Link>
      </div>

      {/* Trending Topics */}
      <div className="p-5 border-b border-slate-600/30">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-orange-400" />
          <h3 className="font-bold text-white">Trending Topics</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {trendingTags.map((tag) => (
            <Link
              key={tag.tag}
              to={`/blog/explore?topic=${encodeURIComponent(tag.tag)}`}
              className="px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-300 rounded-full text-xs font-medium hover:from-orange-500/30 hover:to-amber-500/30 transition-all duration-200 border border-orange-500/30 shadow-sm"
            >
              #{tag.tag}
            </Link>
          ))}
        </div>
      </div>

      {/* Reading Stats */}
      <div className="p-5 border-b border-slate-600/30">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-white">Your Reading</h3>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/30">
            <p className="text-2xl font-bold text-blue-300">{readingStats.storiesReadThisWeek}</p>
            <p className="text-xs text-blue-400">Stories read this week</p>
          </div>
          <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
            <p className="text-2xl font-bold text-green-300">{readingStats.readingTimeToday} min</p>
            <p className="text-xs text-green-400">Reading time today</p>
          </div>
          <div className="p-3 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-lg border border-rose-500/30">
            <p className="text-2xl font-bold text-rose-300">{readingStats.readingStreak}</p>
            <p className="text-xs text-rose-400">Day reading streak</p>
          </div>
        </div>
      </div>

      {/* Active Collaborations */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white">Collaborations</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-gray-300 mb-3">No active collaborations</p>
          <Link
            to="/blog/collaborations/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-amber-500/50"
          >
            <Sparkles className="w-4 h-4" />
            Start Collaborating
          </Link>
        </div>
      </div>
    </aside>
  );
}
