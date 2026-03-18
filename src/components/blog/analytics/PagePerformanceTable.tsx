import { useEffect, useState } from 'react';
import { Clock, Users, TrendingUp, Activity } from 'lucide-react';

interface PageAnalytics {
  page_number: number;
  total_readers: number;
  completed_readers: number;
  avg_time_seconds: number;
  avg_active_time_seconds: number;
  avg_completion_percentage: number;
  drop_off_rate: number;
  avg_scroll_events: number;
}

interface PagePerformanceTableProps {
  postId: string;
}

export default function PagePerformanceTable({ postId }: PagePerformanceTableProps) {
  const [data, setData] = useState<PageAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPageAnalytics();
  }, [postId]);

  async function loadPageAnalytics() {
    try {
      setLoading(true);
      const { supabase } = await import('../../../lib/supabase');
      const { data: analyticsData, error } = await supabase
        .rpc('get_post_page_analytics', { target_post_id: postId });

      if (error) throw error;
      setData(analyticsData || []);
    } catch (error) {
      console.error('Error loading page analytics:', error);
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

  function getEngagementLevel(percentage: number): { label: string; color: string } {
    if (percentage >= 80) return { label: 'Excellent', color: 'text-green-600 bg-green-50' };
    if (percentage >= 60) return { label: 'Good', color: 'text-blue-600 bg-blue-50' };
    if (percentage >= 40) return { label: 'Fair', color: 'text-yellow-600 bg-yellow-50' };
    return { label: 'Low', color: 'text-orange-600 bg-orange-50' };
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No page analytics available yet.
      </div>
    );
  }

  const bestPage = data.reduce((best, current) =>
    current.avg_completion_percentage > best.avg_completion_percentage ? current : best
  );

  const worstPage = data.reduce((worst, current) =>
    current.avg_completion_percentage < worst.avg_completion_percentage ? current : worst
  );

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Detailed Page Performance</h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Page</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Readers
                </div>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Avg Time
                </div>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Active Time
                </div>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Engagement
                </div>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Completion</th>
            </tr>
          </thead>
          <tbody>
            {data.map((page) => {
              const engagement = getEngagementLevel(page.avg_completion_percentage);
              const isBest = page.page_number === bestPage.page_number && data.length > 1;
              const isWorst = page.page_number === worstPage.page_number && data.length > 1;
              const completionRate = (page.completed_readers / page.total_readers) * 100;

              return (
                <tr
                  key={page.page_number}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    isBest ? 'bg-green-50' : isWorst ? 'bg-orange-50' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        Page {page.page_number}
                      </span>
                      {isBest && (
                        <span className="text-xs px-2 py-0.5 bg-green-600 text-white rounded-full">
                          Best
                        </span>
                      )}
                      {isWorst && data.length > 1 && (
                        <span className="text-xs px-2 py-0.5 bg-orange-600 text-white rounded-full">
                          Needs Work
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div className="font-semibold text-gray-800">
                        {page.total_readers}
                      </div>
                      <div className="text-xs text-gray-500">
                        {page.completed_readers} completed
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatTime(page.avg_time_seconds)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatTime(page.avg_active_time_seconds)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${engagement.color}`}>
                      {engagement.label} ({Math.round(page.avg_completion_percentage)}%)
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(completionRate, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600 w-12">
                        {Math.round(completionRate)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length > 1 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="font-semibold text-green-900 text-sm mb-1">
              Best Performing Page
            </div>
            <div className="text-green-700 text-sm">
              Page {bestPage.page_number} with {Math.round(bestPage.avg_completion_percentage)}%
              engagement. Readers spent an average of {formatTime(bestPage.avg_active_time_seconds)}{' '}
              actively reading this page.
            </div>
          </div>
          {data.length > 1 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="font-semibold text-orange-900 text-sm mb-1">
                Opportunity for Improvement
              </div>
              <div className="text-orange-700 text-sm">
                Page {worstPage.page_number} has {Math.round(worstPage.avg_completion_percentage)}%
                engagement. Consider reviewing content quality, pacing, or positioning.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
