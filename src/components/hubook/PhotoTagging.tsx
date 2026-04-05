import { useState, useEffect } from 'react';
import { Tag, X, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PhotoTag {
  id: string;
  tagged_user_id: string;
  tagger_id: string;
  created_at: string;
  tagged_profile?: {
    display_name: string;
    profile_photo_url: string | null;
  };
}

interface PhotoTaggingProps {
  mediaId: string;
  canTag: boolean;
}

export default function PhotoTagging({ mediaId, canTag }: PhotoTaggingProps) {
  const { user } = useAuth();
  const [tags, setTags] = useState<PhotoTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTagModal, setShowTagModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [tagging, setTagging] = useState(false);

  useEffect(() => {
    loadTags();
  }, [mediaId]);

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('album_media_tags')
        .select(`
          *,
          tagged_profile:tagged_user_id (
            display_name,
            profile_photo_url
          )
        `)
        .eq('media_id', mediaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchFriends = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Get user's friends
      const { data: friendships, error: friendError } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user?.id},addressee_id.eq.${user?.id}`);

      if (friendError) throw friendError;

      // Extract friend IDs
      const friendIds = friendships?.map(f =>
        f.requester_id === user?.id ? f.addressee_id : f.requester_id
      ) || [];

      if (friendIds.length === 0) {
        setSearchResults([]);
        return;
      }

      // Search among friends
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, profile_photo_url')
        .in('user_id', friendIds)
        .ilike('display_name', `%${query}%`)
        .limit(10);

      if (profileError) throw profileError;

      // Filter out already tagged users
      const taggedUserIds = tags.map(t => t.tagged_user_id);
      const filteredProfiles = (profiles || []).filter(p => !taggedUserIds.includes(p.user_id));

      setSearchResults(filteredProfiles);
    } catch (error) {
      console.error('Error searching friends:', error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery) {
        searchFriends(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleTagUser = async (userId: string) => {
    if (!user) return;

    setTagging(true);
    try {
      const { error } = await supabase
        .from('album_media_tags')
        .insert({
          media_id: mediaId,
          tagged_user_id: userId,
          tagger_id: user.id
        });

      if (error) throw error;

      await loadTags();
      setShowTagModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Error tagging user:', error);
      if (error.code === '23505') {
        alert('This user is already tagged in this photo');
      } else {
        alert('Failed to tag user');
      }
    } finally {
      setTagging(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!confirm('Remove this tag?')) return;

    try {
      const { error } = await supabase
        .from('album_media_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      setTags(prev => prev.filter(t => t.id !== tagId));
    } catch (error) {
      console.error('Error removing tag:', error);
      alert('Failed to remove tag');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="animate-spin" size={16} />
        <span>Loading tags...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={18} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            {tags.length === 0 ? 'No tags' : `${tags.length} ${tags.length === 1 ? 'person' : 'people'} tagged`}
          </span>
        </div>
        {canTag && (
          <button
            onClick={() => setShowTagModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <UserPlus size={16} />
            Tag
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm group"
            >
              {tag.tagged_profile?.profile_photo_url ? (
                <img
                  src={tag.tagged_profile.profile_photo_url}
                  alt={tag.tagged_profile.display_name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-300" />
              )}
              <span className="text-gray-900">{tag.tagged_profile?.display_name}</span>
              {(tag.tagger_id === user?.id || tag.tagged_user_id === user?.id) && (
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Tag People</h3>
              <button
                onClick={() => {
                  setShowTagModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : searchQuery.trim().length < 2 ? (
                <p className="text-center text-gray-500 py-8">
                  Type at least 2 characters to search
                </p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No friends found matching "{searchQuery}"
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((profile) => (
                    <button
                      key={profile.user_id}
                      onClick={() => handleTagUser(profile.user_id)}
                      disabled={tagging}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left disabled:opacity-50"
                    >
                      {profile.profile_photo_url ? (
                        <img
                          src={profile.profile_photo_url}
                          alt={profile.display_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{profile.display_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
