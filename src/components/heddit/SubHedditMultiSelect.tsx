import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import * as Icons from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

interface SubHeddit {
  id: string;
  name: string;
  display_name: string;
  description: string;
  member_count: number;
  topics: string[];
  is_member: boolean;
}

interface SubHedditMultiSelectProps {
  selectedSubreddits: SubHeddit[];
  onChange: (subreddits: SubHeddit[]) => void;
  maxSelections?: number;
}

export default function SubHedditMultiSelect({
  selectedSubreddits,
  onChange,
  maxSelections = 5
}: SubHedditMultiSelectProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [subreddits, setSubreddits] = useState<SubHeddit[]>([]);
  const [recommendedSubreddits, setRecommendedSubreddits] = useState<SubHeddit[]>([]);
  const [recentSubreddits, setRecentSubreddits] = useState<SubHeddit[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTopics();
    if (isOpen) {
      fetchRecommended();
      fetchRecent();
    }
  }, [isOpen]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (isOpen) {
        searchSubreddits();
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, selectedTopics, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTopics = async () => {
    const { data } = await supabase
      .from('heddit_topics')
      .select('*')
      .order('name');

    if (data) setAllTopics(data);
  };

  const searchSubreddits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_heddit_subreddits', {
        search_query: searchQuery,
        topic_filters: selectedTopics.length > 0 ? selectedTopics : null,
        current_user_id: user?.id || null,
        result_limit: 50
      });

      if (!error && data) {
        setSubreddits(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommended = async () => {
    const { data } = await supabase.rpc('get_recommended_subreddits', {
      current_user_id: user?.id || null,
      result_limit: 10
    });

    if (data) setRecommendedSubreddits(data);
  };

  const fetchRecent = async () => {
    if (!user?.id) return;

    const { data } = await supabase.rpc('get_user_recent_subreddits', {
      current_user_id: user.id,
      result_limit: 5
    });

    if (data) setRecentSubreddits(data);
  };

  const toggleSubreddit = (subreddit: SubHeddit) => {
    const isSelected = selectedSubreddits.some(s => s.id === subreddit.id);

    if (isSelected) {
      onChange(selectedSubreddits.filter(s => s.id !== subreddit.id));
    } else {
      if (selectedSubreddits.length >= maxSelections) {
        return;
      }
      onChange([...selectedSubreddits, subreddit]);
    }
  };

  const removeSubreddit = (id: string) => {
    onChange(selectedSubreddits.filter(s => s.id !== id));
  };

  const toggleTopic = (slug: string) => {
    setSelectedTopics(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const formatMemberCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Tag;
    return IconComponent;
  };

  const displaySubreddits = searchQuery || selectedTopics.length > 0 ? subreddits : [];
  const showRecommended = !searchQuery && selectedTopics.length === 0 && recommendedSubreddits.length > 0;
  const showRecent = !searchQuery && selectedTopics.length === 0 && recentSubreddits.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="space-y-2">
        {selectedSubreddits.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            {selectedSubreddits.map(subreddit => (
              <div
                key={subreddit.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium"
              >
                <span>h/{subreddit.name}</span>
                <button
                  type="button"
                  onClick={() => removeSubreddit(subreddit.id)}
                  className="hover:text-orange-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg flex items-center justify-between bg-white hover:border-orange-500 transition-colors"
        >
          <span className="text-gray-700">
            {selectedSubreddits.length === 0
              ? 'Select SubHeddits to post to'
              : `${selectedSubreddits.length} SubHeddit${selectedSubreddits.length > 1 ? 's' : ''} selected`}
          </span>
          <div className="flex items-center gap-2 text-gray-500">
            {selectedSubreddits.length > 0 && (
              <span className="text-sm">
                {maxSelections - selectedSubreddits.length} remaining
              </span>
            )}
            <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-[500px] overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SubHeddits... (use h/ not r/)"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <span className="font-medium">Note:</span> Use "h/" prefix (e.g., h/cooking, h/gaming) instead of \"r/"
              </p>
            </div>

            {allTopics.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Filter by topics:</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {allTopics.map(topic => {
                    const IconComponent = getIconComponent(topic.icon);
                    const isSelected = selectedTopics.includes(topic.slug);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleTopic(topic.slug)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          isSelected
                            ? 'text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={{
                          backgroundColor: isSelected ? topic.color : undefined
                        }}
                      >
                        <IconComponent className="w-3 h-3" />
                        {topic.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : (
              <>
                {showRecent && (
                  <div className="border-b border-gray-200">
                    <p className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-50">
                      Recently Posted To
                    </p>
                    {recentSubreddits.map(subreddit => (
                      <SubredditOption
                        key={subreddit.id}
                        subreddit={subreddit}
                        isSelected={selectedSubreddits.some(s => s.id === subreddit.id)}
                        onToggle={toggleSubreddit}
                        formatMemberCount={formatMemberCount}
                        disabled={
                          !selectedSubreddits.some(s => s.id === subreddit.id) &&
                          selectedSubreddits.length >= maxSelections
                        }
                      />
                    ))}
                  </div>
                )}

                {showRecommended && (
                  <div>
                    <p className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-50">
                      Recommended For You
                    </p>
                    {recommendedSubreddits.map(subreddit => (
                      <SubredditOption
                        key={subreddit.id}
                        subreddit={subreddit}
                        isSelected={selectedSubreddits.some(s => s.id === subreddit.id)}
                        onToggle={toggleSubreddit}
                        formatMemberCount={formatMemberCount}
                        disabled={
                          !selectedSubreddits.some(s => s.id === subreddit.id) &&
                          selectedSubreddits.length >= maxSelections
                        }
                      />
                    ))}
                  </div>
                )}

                {displaySubreddits.length > 0 && (
                  <div>
                    {(searchQuery || selectedTopics.length > 0) && (
                      <p className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-50">
                        Search Results ({displaySubreddits.length})
                      </p>
                    )}
                    {displaySubreddits.map(subreddit => (
                      <SubredditOption
                        key={subreddit.id}
                        subreddit={subreddit}
                        isSelected={selectedSubreddits.some(s => s.id === subreddit.id)}
                        onToggle={toggleSubreddit}
                        formatMemberCount={formatMemberCount}
                        disabled={
                          !selectedSubreddits.some(s => s.id === subreddit.id) &&
                          selectedSubreddits.length >= maxSelections
                        }
                      />
                    ))}
                  </div>
                )}

                {!loading && displaySubreddits.length === 0 && (searchQuery || selectedTopics.length > 0) && (
                  <div className="py-8 text-center text-gray-500">
                    <p className="text-sm">No SubHeddits found</p>
                    <p className="text-xs mt-1">Try a different search or filter</p>
                  </div>
                )}
              </>
            )}
          </div>

          {selectedSubreddits.length >= maxSelections && (
            <div className="px-4 py-2 bg-orange-50 border-t border-orange-200 text-xs text-orange-800">
              Maximum selection limit reached ({maxSelections} SubHeddits)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SubredditOptionProps {
  subreddit: SubHeddit;
  isSelected: boolean;
  onToggle: (subreddit: SubHeddit) => void;
  formatMemberCount: (count: number) => string;
  disabled?: boolean;
}

function SubredditOption({ subreddit, isSelected, onToggle, formatMemberCount, disabled }: SubredditOptionProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onToggle(subreddit)}
      disabled={disabled}
      className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 transition-colors border-b border-gray-100 last:border-b-0 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${isSelected ? 'bg-orange-50' : ''}`}
    >
      <div className={`flex-shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center mt-0.5 ${
        isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
      }`}>
        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">h/{subreddit.name}</span>
          {subreddit.is_member && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              Joined
            </span>
          )}
        </div>
        {subreddit.description && (
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">{subreddit.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500">
            {formatMemberCount(subreddit.member_count)} members
          </span>
          {subreddit.topics.length > 0 && (
            <div className="flex gap-1">
              {subreddit.topics.slice(0, 3).map(topic => (
                <span key={topic} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
