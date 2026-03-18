import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, TrendingUp } from 'lucide-react';
import PageDropoffFunnel from './PageDropoffFunnel';
import PagePerformanceTable from './PagePerformanceTable';

interface PostInsight {
  post_id: string;
  post_title: string;
  total_readers: number;
  unique_readers: number;
  avg_completion_rate: number;
  avg_pages_read: number;
  avg_active_time_seconds: number;
  completion_funnel_data: any[];
  created_at: string;
}

interface PostInsightsTableProps {
  authorId: string;
  daysBack?: number;
}

export default function PostInsightsTable({ authorId, daysBack = 28 }: PostInsightsTableProps) {
  const [data, setData] = useState<PostInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'readers' | 'completion'>('date');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    loadPostInsights();
  }, [authorId, daysBack]);

  async function loadPostInsights() {
    try {
      setLoading(true);
      const { supabase } = await import('../../../lib/supabase');
      const { data: insights, error } = await supabase
        .rpc('get_post_reading_insights', {
          author_user_id: authorId,
          days_back: daysBack,
        });

      if (error) throw error;
      setData(insights || []);
    } catch (error) {
      console.error('Error loading post insights:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpanded(postId: string) {
    setExpandedPostId(expandedPostId === postId ? null : postId);
  }

  function handleSort(column: 'date' | 'readers' | 'completion') {
    if (sortBy === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(column);
      setSortDesc(true);
    }
  }

  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'readers':
        comparison = a.unique_readers - b.unique_readers;
        break;
      case 'completion':
        comparison = a.avg_completion_rate - b.avg_completion_rate;
        break;
    }
    return sortDesc ? -comparison : comparison;
  });

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">
          No post insights available for the selected time period.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Post-by-Post Insights</h3>
        <div className="text-sm text-gray-500">Last {daysBack} days</div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Post Title</th>
              <th
                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Published
                  {sortBy === 'date' && (sortDesc ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />)}
                </div>
              </th>
              <th
                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('readers')}
              >
                <div className="flex items-center gap-1">
                  Readers
                  {sortBy === 'readers' && (sortDesc ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />)}
                </div>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Avg Pages</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Avg Time</th>
              <th
                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('completion')}
              >
                <div className="flex items-center gap-1">
                  Completion
                  {sortBy === 'completion' && (sortDesc ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />)}
                </div>
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((post) => {
              const isExpanded = expandedPostId === post.post_id;
              const hasReaders = post.unique_readers > 0;

              return (
                <>
                  <tr
                    key={post.post_id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      isExpanded ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 max-w-md truncate">
                        {post.post_title}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(post.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">
                          {post.unique_readers}
                        </div>
                        <div className="text-xs text-gray-500">
                          {post.total_readers} sessions
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {hasReaders ? post.avg_pages_read.toFixed(1) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {hasReaders ? formatTime(post.avg_active_time_seconds) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {hasReaders ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(post.avg_completion_rate, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-700">
                            {Math.round(post.avg_completion_rate)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {hasReaders && (
                        <button
                          onClick={() => toggleExpanded(post.post_id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && hasReaders && (
                    <tr>
                      <td colSpan={7} className="bg-gray-50 p-6">
                        <div className="space-y-8">
                          <PageDropoffFunnel postId={post.post_id} />
                          <PagePerformanceTable postId={post.post_id} />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedData.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Pro Tip:</strong> Click on any post with readers to see detailed page-by-page
              analytics. Look for pages with high drop-off rates or low engagement to identify
              opportunities for improvement. Posts with completion rates above 60% are performing well!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
