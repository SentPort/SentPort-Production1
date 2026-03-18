import { useState, useEffect } from 'react';
import { X, Shield, UserPlus, Trash2, Crown, AlertCircle, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Moderator {
  id: string;
  account_id: string;
  username: string;
  display_name: string;
  role: 'creator' | 'moderator';
  permissions: {
    pin_posts: boolean;
    delete_posts: boolean;
    edit_community: boolean;
    manage_moderators: boolean;
    delete_community?: boolean;
  };
  appointed_at: string;
}

interface ModeratorManagementModalProps {
  communityId: string;
  communityName: string;
  onClose: () => void;
}

export default function ModeratorManagementModal({
  communityId,
  communityName,
  onClose
}: ModeratorManagementModalProps) {
  const { user } = useAuth();
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<any>(null);
  const [editingMod, setEditingMod] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    loadModerators();
    loadCurrentUserPermissions();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const loadModerators = async () => {
    const { data, error } = await supabase.rpc('get_community_moderators', {
      p_subreddit_id: communityId
    });

    if (data) {
      setModerators(data);
    }
    setLoading(false);
  };

  const loadCurrentUserPermissions = async () => {
    if (!user) return;

    const { data } = await supabase.rpc('get_moderator_permissions', {
      p_subreddit_id: communityId,
      p_user_id: user.id
    });

    setCurrentUserPermissions(data);
  };

  const searchUsers = async () => {
    setSearching(true);
    const { data } = await supabase
      .from('heddit_accounts')
      .select('id, username, display_name')
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .limit(10);

    if (data) {
      const existingModIds = moderators.map(m => m.account_id);
      setSearchResults(data.filter(u => !existingModIds.includes(u.id)));
    }
    setSearching(false);
  };

  const addModerator = async (accountId: string) => {
    const { data: account } = await supabase
      .from('heddit_accounts')
      .select('id, user_id')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (!account) return;

    const { error } = await supabase
      .from('heddit_subreddit_moderators')
      .insert({
        subreddit_id: communityId,
        account_id: accountId,
        role: 'moderator',
        permissions: {
          pin_posts: true,
          delete_posts: true,
          edit_community: false,
          manage_moderators: false
        },
        appointed_by: account.id
      });

    if (!error) {
      loadModerators();
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeModerator = async (modId: string) => {
    const { error } = await supabase
      .from('heddit_subreddit_moderators')
      .delete()
      .eq('id', modId);

    if (!error) {
      loadModerators();
      setConfirmRemove(null);
    }
  };

  const updatePermissions = async (modId: string, permissions: any) => {
    const { error } = await supabase
      .from('heddit_subreddit_moderators')
      .update({ permissions })
      .eq('id', modId);

    if (!error) {
      loadModerators();
      setEditingMod(null);
    }
  };

  const canManage = currentUserPermissions?.manage_moderators === true;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-orange-600" />
            <h2 className="text-2xl font-bold">Manage Moderators</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {canManage && (
            <div>
              <label className="block text-sm font-medium mb-2">Add Moderator</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {searchResults.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                      <div>
                        <p className="font-medium">u/{user.username}</p>
                        {user.display_name && (
                          <p className="text-sm text-gray-600">{user.display_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => addModerator(user.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                      >
                        <UserPlus size={16} />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-3">Current Moderators ({moderators.length})</h3>
            <div className="space-y-3">
              {moderators.map(mod => (
                <div key={mod.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {mod.role === 'creator' ? (
                        <Crown className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <Shield className="w-5 h-5 text-orange-600" />
                      )}
                      <div>
                        <p className="font-medium">u/{mod.username}</p>
                        {mod.display_name && (
                          <p className="text-sm text-gray-600">{mod.display_name}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {mod.role === 'creator' ? 'Creator' : 'Moderator'} • Added {new Date(mod.appointed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {canManage && mod.role !== 'creator' && moderators.length > 1 && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingMod(editingMod === mod.id ? null : mod.id)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {editingMod === mod.id ? 'Cancel' : 'Edit'}
                        </button>
                        {confirmRemove === mod.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => removeModerator(mod.id)}
                              className="text-sm text-red-600 hover:text-red-700 font-semibold"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmRemove(null)}
                              className="text-sm text-gray-600 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRemove(mod.id)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {editingMod === mod.id ? (
                    <div className="space-y-2 bg-gray-50 p-3 rounded">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={mod.permissions.pin_posts}
                          onChange={(e) => {
                            const newPerms = { ...mod.permissions, pin_posts: e.target.checked };
                            updatePermissions(mod.id, newPerms);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">Pin posts</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={mod.permissions.delete_posts}
                          onChange={(e) => {
                            const newPerms = { ...mod.permissions, delete_posts: e.target.checked };
                            updatePermissions(mod.id, newPerms);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">Delete posts</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={mod.permissions.edit_community}
                          onChange={(e) => {
                            const newPerms = { ...mod.permissions, edit_community: e.target.checked };
                            updatePermissions(mod.id, newPerms);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">Edit community</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={mod.permissions.manage_moderators}
                          onChange={(e) => {
                            const newPerms = { ...mod.permissions, manage_moderators: e.target.checked };
                            updatePermissions(mod.id, newPerms);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">Manage moderators</span>
                      </label>
                      <div className="pt-2 border-t border-gray-200">
                        <label className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                          <input
                            type="checkbox"
                            checked={mod.permissions.delete_community || false}
                            disabled={true}
                            className="rounded"
                          />
                          <span className="text-sm text-red-600 font-medium">Delete community</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          Only the creator can delete the community
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {mod.permissions.pin_posts && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Pin posts</span>
                      )}
                      {mod.permissions.delete_posts && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Delete posts</span>
                      )}
                      {mod.permissions.edit_community && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Edit community</span>
                      )}
                      {mod.permissions.manage_moderators && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Manage mods</span>
                      )}
                      {mod.permissions.delete_community && (
                        <span className="text-xs bg-red-200 text-red-900 px-2 py-1 rounded font-semibold">Delete community</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {moderators.length === 1 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Last Moderator</p>
                  <p>This community must have at least one moderator. Add another moderator before removing this one.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
