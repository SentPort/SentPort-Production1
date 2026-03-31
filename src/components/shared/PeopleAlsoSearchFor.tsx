import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PeopleAlsoSearchForProps {
  currentQuery: string;
  onSearchClick: (query: string) => void;
}

interface RelatedSearch {
  query: string;
  searchCount: number;
}

export function PeopleAlsoSearchFor({
  currentQuery,
  onSearchClick,
}: PeopleAlsoSearchForProps) {
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatedSearches();
  }, [currentQuery]);

  const fetchRelatedSearches = async () => {
    if (!currentQuery.trim()) {
      setRelatedSearches([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const queryWords = currentQuery.toLowerCase().trim().split(/\s+/);
      const primaryWord = queryWords[0];

      const { data, error } = await supabase
        .from('search_history')
        .select('search_query')
        .ilike('search_query', `%${primaryWord}%`)
        .neq('search_query', currentQuery)
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const searchCounts = new Map<string, number>();

        data.forEach((item) => {
          const query = item.search_query.toLowerCase().trim();
          if (query && query !== currentQuery.toLowerCase()) {
            searchCounts.set(query, (searchCounts.get(query) || 0) + 1);
          }
        });

        const related = Array.from(searchCounts.entries())
          .map(([query, count]) => ({ query, searchCount: count }))
          .sort((a, b) => b.searchCount - a.searchCount)
          .slice(0, 8);

        setRelatedSearches(related);
      } else {
        setRelatedSearches(generateFallbackSuggestions(currentQuery));
      }
    } catch (error) {
      console.error('Error fetching related searches:', error);
      setRelatedSearches(generateFallbackSuggestions(currentQuery));
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackSuggestions = (query: string): RelatedSearch[] => {
    const suggestions = [
      `${query} tutorial`,
      `${query} guide`,
      `${query} examples`,
      `${query} tips`,
      `best ${query}`,
      `how to ${query}`,
      `${query} explained`,
      `${query} for beginners`,
    ];

    return suggestions
      .slice(0, 8)
      .map((q) => ({ query: q, searchCount: 0 }));
  };

  const highlightQuery = (searchQuery: string) => {
    const queryWords = currentQuery.toLowerCase().split(/\s+/);
    const parts = searchQuery.split(new RegExp(`(${queryWords.join('|')})`, 'gi'));

    return parts.map((part, index) => {
      const isMatch = queryWords.some(
        (word) => word.toLowerCase() === part.toLowerCase()
      );
      return isMatch ? (
        <span key={index} className="font-semibold">
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      );
    });
  };

  if (loading || relatedSearches.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        People also search for
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {relatedSearches.map((related, index) => (
          <button
            key={index}
            onClick={() => onSearchClick(related.query)}
            className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left group"
          >
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">
              {highlightQuery(related.query)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
