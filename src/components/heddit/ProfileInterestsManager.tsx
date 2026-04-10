import { useState, useEffect } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TagChip } from './TagChip';

interface Tag {
  id: string;
  tag_name: string;
  display_name: string;
  usage_count: number;
}

interface ProfileInterestsManagerProps {
  accountId: string;
  selectedInterests: Tag[];
  onInterestsChange: (interests: Tag[]) => void;
  maxInterests?: number;
}

export function ProfileInterestsManager({
  accountId,
  selectedInterests,
  onInterestsChange,
  maxInterests = 20
}: ProfileInterestsManagerProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadAvailableTags();
  }, []);

  const loadAvailableTags = async () => {
    const { data, error } = await supabase
      .from('heddit_custom_tags')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(100);

    if (!error && data) {
      setAvailableTags(data);
    }
    setLoading(false);
  };

  const handleAddInterest = async (tag: Tag) => {
    if (selectedInterests.length >= maxInterests) {
      alert(`You can only select up to ${maxInterests} interests`);
      return;
    }

    if (selectedInterests.some(t => t.id === tag.id)) {
      return;
    }

    const { error } = await supabase
      .from('heddit_user_interests')
      .insert({
        user_id: accountId,
        tag_id: tag.id
      });

    if (!error) {
      onInterestsChange([...selectedInterests, tag]);
    }
  };

  const handleRemoveInterest = async (tagId: string) => {
    const { error } = await supabase
      .from('heddit_user_interests')
      .delete()
      .eq('user_id', accountId)
      .eq('tag_id', tagId);

    if (!error) {
      onInterestsChange(selectedInterests.filter(t => t.id !== tagId));
    }
  };

  const filteredTags = availableTags.filter(tag =>
    tag.display_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedInterests.some(t => t.id === tag.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Interests</h3>
          <p className="text-sm text-gray-600">
            {selectedInterests.length} / {maxInterests} selected
          </p>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Interest
        </button>
      </div>

      {selectedInterests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedInterests.map(tag => (
            <div key={tag.id} className="relative group">
              <TagChip tag={tag.display_name} />
              <button
                onClick={() => handleRemoveInterest(tag.id)}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showSearch && (
        <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search interests..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-center text-gray-500 py-4">Loading interests...</p>
            ) : filteredTags.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No interests found</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddInterest(tag)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-full hover:bg-orange-50 hover:border-orange-500 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {tag.display_name}
                    </span>
                    <Plus className="w-3 h-3 text-gray-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedInterests.length === 0 && !showSearch && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-2">No interests selected yet</p>
          <p className="text-sm text-gray-400">
            Add interests to help others discover you and find relevant content
          </p>
        </div>
      )}
    </div>
  );
}
