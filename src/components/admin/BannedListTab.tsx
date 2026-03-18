import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Ban, RotateCcw, Search } from 'lucide-react';
import TagUnbanModal from './TagUnbanModal';

interface BannedTag {
  id: string;
  tag_name: string;
  use_count: number;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  created_at: string;
}

export default function BannedListTab() {
  const [bannedTags, setBannedTags] = useState<BannedTag[]>([]);
  const [filteredTags, setFilteredTags] = useState<BannedTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<BannedTag | null>(null);
  const [showUnbanModal, setShowUnbanModal] = useState(false);

  useEffect(() => {
    loadBannedTags();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTags(bannedTags);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredTags(
        bannedTags.filter(
          (tag) =>
            tag.tag_name.toLowerCase().includes(query) ||
            tag.ban_reason?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, bannedTags]);

  const loadBannedTags = async () => {
    try {
      const { data, error } = await supabase
        .from('heddit_custom_tags')
        .select('*')
        .eq('is_banned', true)
        .order('banned_at', { ascending: false });

      if (error) throw error;
      setBannedTags(data || []);
      setFilteredTags(data || []);
    } catch (error) {
      console.error('Error loading banned tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = (tag: BannedTag) => {
    setSelectedTag(tag);
    setShowUnbanModal(true);
  };

  const handleUnbanSuccess = () => {
    setShowUnbanModal(false);
    setSelectedTag(null);
    loadBannedTags();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading banned tags...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Banned Tags ({bannedTags.length})
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search banned tags..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredTags.length === 0 ? (
        <div className="text-center py-12">
          <Ban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No matching banned tags' : 'No Banned Tags'}
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'There are currently no banned tags.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="border border-red-200 bg-red-50 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">#{tag.tag_name}</h4>
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                      BANNED
                    </span>
                    <span className="text-sm text-gray-600">
                      Used {tag.use_count} {tag.use_count === 1 ? 'time' : 'times'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {tag.ban_reason && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Reason: </span>
                        <span className="text-sm text-gray-600">{tag.ban_reason}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Banned on {new Date(tag.banned_at!).toLocaleDateString()} at{' '}
                      {new Date(tag.banned_at!).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleUnban(tag)}
                  className="ml-4 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Unban
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUnbanModal && selectedTag && (
        <TagUnbanModal
          tag={{
            id: selectedTag.id,
            tag_name: selectedTag.tag_name,
            ban_reason: selectedTag.ban_reason
          }}
          onClose={() => {
            setShowUnbanModal(false);
            setSelectedTag(null);
          }}
          onSuccess={handleUnbanSuccess}
        />
      )}
    </div>
  );
}
