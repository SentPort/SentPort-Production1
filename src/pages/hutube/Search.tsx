import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Loader2, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import VideoCard from '../../components/hutube/VideoCard';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number;
  view_count: number;
  created_at: string;
  channel_name: string;
  channel_avatar: string | null;
  channel_id: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('hutube_video_categories')
      .select('id, name, slug')
      .order('name');

    if (data) {
      setCategories(data);
    }
  };

  const performSearch = async (searchQuery: string, categoryId: string | null = null) => {
    if (!searchQuery.trim()) {
      setVideos([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_hutube_videos', {
        p_query: searchQuery,
        p_category_id: categoryId,
        p_limit: 50
      });

      if (error) throw error;

      const formattedVideos = data.map((v: any) => ({
        ...v,
        channel: {
          id: v.channel_id,
          display_name: v.channel_name,
          handle: v.channel_name.toLowerCase().replace(/\s+/g, ''),
          avatar_url: v.channel_avatar
        }
      }));

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error searching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
      performSearch(query, selectedCategory);
    }
  };

  const handleCategoryFilter = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    if (query.trim()) {
      performSearch(query, categoryId);
    }
  };

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout>
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="mb-6">
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search videos..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Filter size={20} />
              </button>
            </form>

            {showFilters && (
              <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                <h3 className="font-semibold mb-3">Filter by Category</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCategoryFilter(null)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedCategory === null
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryFilter(category.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
          ) : videos.length > 0 ? (
            <>
              <p className="text-gray-600 mb-4">
                {videos.length} result{videos.length !== 1 ? 's' : ''} for "{query}"
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-6 gap-y-10">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </>
          ) : query ? (
            <div className="text-center py-12">
              <SearchIcon className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No results found</h3>
              <p className="text-gray-600">
                Try different keywords or check your spelling
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <SearchIcon className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Search for videos</h3>
              <p className="text-gray-600">
                Enter keywords to find videos on HuTube
              </p>
            </div>
          )}
        </div>
      </HuTubeLayout>
    </PlatformGuard>
  );
}
