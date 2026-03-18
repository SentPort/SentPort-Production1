import { useEffect, useState } from 'react';
import { BookOpen, Clock, Users, TrendingUp } from 'lucide-react';

interface ReadingPatterns {
  total_reading_sessions: number;
  unique_readers: number;
  avg_pages_per_session: number;
  avg_completion_rate: number;
  avg_active_reading_time: number;
  total_posts_with_reads: number;
  most_common_exit_page: number;
}

interface ReadingBehaviorCardProps {
  authorId: string;
}

export default function ReadingBehaviorCard({ authorId }: ReadingBehaviorCardProps) {
  const [data, setData] = useState<ReadingPatterns | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReadingPatterns();
  }, [authorId]);

  async function loadReadingPatterns() {
    try {
      setLoading(true);
      const { supabase } = await import('../../../lib/supabase');
      const { data: patterns, error } = await supabase
        .rpc('get_author_reading_patterns', { author_user_id: authorId });

      if (error) throw error;
      if (patterns && patterns.length > 0) {
        setData(patterns[0]);
      }
    } catch (error) {
      console.error('Error loading reading patterns:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="animate-pulse">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.total_reading_sessions === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">
          No reading data available yet. Publish posts and wait for readers to engage!
        </p>
      </div>
    );
  }

  const metrics = [
    {
      icon: Users,
      label: 'Unique Readers',
      value: data.unique_readers.toLocaleString(),
      subtitle: `${data.total_reading_sessions} total sessions`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: BookOpen,
      label: 'Avg Pages Read',
      value: data.avg_pages_per_session.toFixed(1),
      subtitle: `Most exit on page ${data.most_common_exit_page}`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Clock,
      label: 'Avg Reading Time',
      value: formatTime(data.avg_active_reading_time),
      subtitle: 'Active reading time',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: TrendingUp,
      label: 'Avg Completion',
      value: `${Math.round(data.avg_completion_rate)}%`,
      subtitle: `Across ${data.total_posts_with_reads} posts`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <Icon className={`w-5 h-5 ${metric.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
            <div className="text-sm font-medium text-gray-700 mb-1">{metric.label}</div>
            <div className="text-xs text-gray-500">{metric.subtitle}</div>
          </div>
        );
      })}
    </div>
  );
}
