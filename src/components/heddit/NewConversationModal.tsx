import { useState, useEffect } from 'react';
import { X, Search, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NewConversationModalProps {
  isOpen: boolean;
  currentAccountId: string;
  onClose: () => void;
  onSelectUser: (accountId: string) => void;
}

interface SearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  karma: number;
}

export function NewConversationModal({
  isOpen,
  currentAccountId,
  onClose,
  onSelectUser
}: NewConversationModalProps) {
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
      if (!searchQuery.trim() || !currentAccountId) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('heddit_accounts')
          .select('id, username, display_name, avatar_url, karma')
          .neq('id', currentAccountId)
          .or(`username.ilike.%${searchQuery.trim()}%,display_name.ilike.%${searchQuery.trim()}%`)
          .order('karma', { ascending: false })
          .limit(20);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error('Error searching heddit users:', err);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentAccountId]);

  const handleSelectUser = (accountId: string) => {
    onSelectUser(accountId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Start New Conversation</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or display name..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-orange-500 focus:bg-white text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!searchQuery.trim() ? (
            <div className="text-center py-12 text-gray-500 px-4">
              <Search className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-600">Search for a Heddit user</p>
              <p className="text-sm mt-1 text-gray-400">Type a username or display name to get started</p>
            </div>
          ) : loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-orange-500"></div>
              <p className="mt-3 text-sm">Searching...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 text-gray-500 px-4">
              <p className="font-medium">No users found</p>
              <p className="text-sm mt-1 text-gray-400">Try a different search term</p>
            </div>
          ) : (
            <div className="p-2">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectUser(result.id)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-orange-50 rounded-lg transition-colors text-left"
                >
                  {result.avatar_url ? (
                    <img
                      src={result.avatar_url}
                      alt={result.display_name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-orange-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{result.display_name}</div>
                    <div className="text-sm text-gray-500">u/{result.username}</div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">{result.karma} karma</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
