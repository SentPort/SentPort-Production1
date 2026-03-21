import { useState, useEffect } from 'react';
import { Search, X, Plus, Sparkles, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InspirationPost {
  id: string;
  title: string;
  excerpt: string;
  account: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface SelectedInspiration {
  post: InspirationPost;
  note: string;
}

interface ScreenplayInspirationSelectorProps {
  selectedInspirations: SelectedInspiration[];
  onInspirationsChange: (inspirations: SelectedInspiration[]) => void;
}

export default function ScreenplayInspirationSelector({
  selectedInspirations,
  onInspirationsChange
}: ScreenplayInspirationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InspirationPost[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchPosts();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchPosts = async () => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          id,
          title,
          excerpt,
          content,
          account:account_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('status', 'published')
        .eq('privacy', 'public')
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      const posts = (data || []).map((post: any) => ({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt || post.content.substring(0, 200) + '...',
        account: post.account
      }));

      setSearchResults(posts);
    } catch (error) {
      console.error('Error searching posts:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const addInspiration = (post: InspirationPost) => {
    if (selectedInspirations.some(i => i.post.id === post.id)) {
      return;
    }

    onInspirationsChange([
      ...selectedInspirations,
      { post, note: '' }
    ]);

    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const removeInspiration = (postId: string) => {
    onInspirationsChange(selectedInspirations.filter(i => i.post.id !== postId));
  };

  const updateNote = (postId: string, note: string) => {
    onInspirationsChange(
      selectedInspirations.map(i =>
        i.post.id === postId ? { ...i, note } : i
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Inspired By (Optional)
        </label>
        {!showSearch && selectedInspirations.length === 0 && (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Inspiration
          </button>
        )}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300">
        <p className="font-medium mb-1">Credit Your Inspirations</p>
        <p>If your screenplay was inspired by stories you read on HuBlog, credit them here! The original authors will be notified and both stories will be linked together.</p>
      </div>

      {(showSearch || selectedInspirations.length > 0) && (
        <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 space-y-4">
          {showSearch && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for stories by title or content..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>

              {isSearching && (
                <p className="text-xs text-gray-400 text-center">Searching...</p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((post) => (
                    <div
                      key={post.id}
                      className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3 hover:border-emerald-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white text-sm mb-1 truncate">
                            {post.title}
                          </h4>
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center gap-2">
                            {post.account?.avatar_url ? (
                              <img
                                src={post.account.avatar_url}
                                alt={post.account.username}
                                className="w-4 h-4 rounded-full"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">
                                {post.account?.display_name?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="text-xs text-gray-400">
                              by {post.account?.display_name || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addInspiration(post)}
                          className="px-3 py-1 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 transition-colors flex-shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-xs text-gray-400 text-center">No stories found</p>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="w-full py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {selectedInspirations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Selected Inspirations ({selectedInspirations.length})
              </h4>

              {selectedInspirations.map((inspiration) => (
                <div
                  key={inspiration.post.id}
                  className="bg-slate-800/50 border border-emerald-500/30 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-white text-sm mb-1">
                        {inspiration.post.title}
                      </h5>
                      <div className="flex items-center gap-2 mb-2">
                        {inspiration.post.account?.avatar_url ? (
                          <img
                            src={inspiration.post.account.avatar_url}
                            alt={inspiration.post.account.username}
                            className="w-4 h-4 rounded-full"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">
                            {inspiration.post.account?.display_name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-xs text-gray-400">
                          by {inspiration.post.account?.display_name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeInspiration(inspiration.post.id)}
                      className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                      title="Remove inspiration"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Attribution Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={inspiration.note}
                      onChange={(e) => updateNote(inspiration.post.id, e.target.value)}
                      placeholder="e.g., 'This story inspired the main character arc'"
                      className="w-full px-3 py-1.5 bg-slate-700/50 border border-slate-600 text-white placeholder-gray-400 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}

              {!showSearch && (
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  className="w-full py-2 text-xs text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Another Inspiration
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
