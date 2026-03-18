import { useEffect, useState } from 'react';

interface PageDropoffData {
  page_number: number;
  readers_reached: number;
  readers_completed_page: number;
  readers_continued: number;
  drop_off_count: number;
  drop_off_percentage: number;
  retention_rate: number;
}

interface PageDropoffFunnelProps {
  postId: string;
}

export default function PageDropoffFunnel({ postId }: PageDropoffFunnelProps) {
  const [data, setData] = useState<PageDropoffData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDropoffData();
  }, [postId]);

  async function loadDropoffData() {
    try {
      setLoading(true);
      const { supabase } = await import('../../../lib/supabase');
      const { data: dropoffData, error } = await supabase
        .rpc('get_page_drop_off_analysis', { target_post_id: postId });

      if (error) throw error;
      setData(dropoffData || []);
    } catch (error) {
      console.error('Error loading drop-off data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No reading data available for this post yet.
      </div>
    );
  }

  const maxReaders = Math.max(...data.map(d => d.readers_reached));

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Page-by-Page Reader Retention</h3>
      <div className="space-y-3">
        {data.map((page) => {
          const widthPercent = (page.readers_reached / maxReaders) * 100;
          const isHighDropoff = page.drop_off_percentage > 30;

          return (
            <div key={page.page_number} className="relative">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-medium text-gray-700 w-16">
                  Page {page.page_number}
                </span>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg overflow-hidden h-12 relative">
                    <div
                      className={`h-full ${
                        isHighDropoff ? 'bg-orange-400' : 'bg-blue-500'
                      } transition-all duration-500 flex items-center justify-between px-3`}
                      style={{ width: `${widthPercent}%` }}
                    >
                      <span className="text-white text-sm font-semibold">
                        {page.readers_reached} readers
                      </span>
                      {page.readers_continued > 0 && (
                        <span className="text-white text-xs">
                          {page.retention_rate}% continued
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right">
                  {page.drop_off_count > 0 && (
                    <span
                      className={`text-sm font-medium ${
                        isHighDropoff ? 'text-orange-600' : 'text-gray-600'
                      }`}
                    >
                      -{page.drop_off_count} ({page.drop_off_percentage}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>How to read this:</strong> Each bar shows how many readers reached that page.
          Orange bars indicate pages with high drop-off rates (30%+) where you may want to
          improve engagement or consider restructuring content.
        </p>
      </div>
    </div>
  );
}
