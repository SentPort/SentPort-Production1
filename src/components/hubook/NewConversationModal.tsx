import { useState, useEffect } from 'react';
import { X, Search, Users, UserPlus, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

interface SearchResult {
  profile_id: string;
  user_id: string;
  display_name: string;
  profile_photo_url: string | null;
  work: string | null;
  location: string | null;
  bio: string | null;
  tier: number;
  mutual_friends_count: number;
  activity_score: number;
  match_score: number;
}

export function NewConversationModal({ isOpen, onClose, onSelectUser }: NewConversationModalProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim() || !user) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('search_hubook_users_tiered', {
          search_query: searchQuery.trim(),
          current_user_id: user.id,
          result_limit: 20
        });

        if (error) throw error;

        if (data) {
          setSearchResults(data);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, user]);

  const handleSelectUser = (userId: string) => {
    onSelectUser(userId);
    onClose();
  };

  const getTierInfo = (tier: number) => {
    switch (tier) {
      case 1:
        return {
          icon: Users,
          label: 'Friend',
          color: 'text-blue-600 bg-blue-50'
        };
      case 2:
        return {
          icon: UserPlus,
          label: 'Friend of Friend',
          color: 'text-green-600 bg-green-50'
        };
      default:
        return {
          icon: Globe,
          label: 'Public Profile',
          color: 'text-gray-600 bg-gray-50'
        };
    }
  };

  const groupedResults = searchResults.reduce((acc, result) => {
    if (!acc[result.tier]) {
      acc[result.tier] = [];
    }
    acc[result.tier].push(result);
    return acc;
  }, {} as Record<number, SearchResult[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Start New Conversation</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for people on HuBook..."
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!searchQuery.trim() ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium">Search for someone to message</p>
              <p className="text-sm mt-2">Type a name to find friends, friends of friends, or anyone on HuBook</p>
            </div>
          ) : loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-3">Searching...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-6">
              {[1, 2, 3].map(tier => {
                const results = groupedResults[tier];
                if (!results || results.length === 0) return null;

                const tierInfo = getTierInfo(tier);
                const TierIcon = tierInfo.icon;

                return (
                  <div key={tier}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-1.5 rounded ${tierInfo.color}`}>
                        <TierIcon className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{tierInfo.label}</h3>
                      <span className="text-sm text-gray-500">({results.length})</span>
                    </div>

                    <div className="space-y-2">
                      {results.map((result) => (
                        <button
                          key={result.profile_id}
                          onClick={() => handleSelectUser(result.user_id)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                          {result.profile_photo_url ? (
                            <img
                              src={result.profile_photo_url}
                              alt={result.display_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                              {result.display_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {result.display_name}
                            </div>
                            {result.work && (
                              <div className="text-sm text-gray-600 truncate">{result.work}</div>
                            )}
                            {tier === 2 && result.mutual_friends_count > 0 && (
                              <div className="text-xs text-gray-500">
                                {result.mutual_friends_count} mutual {result.mutual_friends_count === 1 ? 'friend' : 'friends'}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
