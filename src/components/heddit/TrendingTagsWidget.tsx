import { useEffect, useState } from 'react';
import { TrendingUp, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface TrendingTag {
  id: string;
  tag_name: string;
  display_name: string;
  usage_count: number;
  trend_score: number;
  recent_usage_count: number;
}

export function TrendingTagsWidget() {
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTrendingTags();
  }, []);

  const loadTrendingTags = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_trending_tags', { result_limit: 10 });

      if (!error && data) {
        setTrendingTags(data);
      }
    } catch (error) {
      console.error('Error loading trending tags:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-300 p-4">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Trending Tags
        </h3>
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  if (trendingTags.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-orange-500" />
        Trending Tags
      </h3>
      <div className="space-y-2">
        {trendingTags.map((tag, index) => (
          <button
            key={tag.id}
            onClick={() => navigate(`/heddit/tag/${encodeURIComponent(tag.display_name)}`)}
            className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-sm font-bold flex-shrink-0">
              {index + 1}
            </div>
            <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{tag.display_name}</div>
              <div className="text-xs text-gray-500">
                {tag.recent_usage_count} recent use{tag.recent_usage_count !== 1 ? 's' : ''}
              </div>
            </div>
            <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
