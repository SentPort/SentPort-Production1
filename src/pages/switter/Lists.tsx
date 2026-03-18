import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { List, Plus, Lock, Globe, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';

interface SwitterList {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  member_count: number;
  subscriber_count: number;
}

export default function Lists() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myLists, setMyLists] = useState<SwitterList[]>([]);
  const [subscribedLists, setSubscribedLists] = useState<SwitterList[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    if (!user) return;

    setLoading(true);

    const { data: account } = await supabase
      .from('switter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) {
      setLoading(false);
      return;
    }

    const { data: owned } = await supabase
      .from('switter_lists')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false });

    if (owned) setMyLists(owned);

    const { data: subscriptions } = await supabase
      .from('switter_list_subscriptions')
      .select(`
        list:switter_lists(*)
      `)
      .eq('account_id', account.id);

    if (subscriptions) {
      setSubscribedLists(subscriptions.map((s: any) => s.list));
    }

    setLoading(false);
  };

  const createList = async () => {
    if (!user || !newListName.trim()) return;

    const { data: account } = await supabase
      .from('switter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) return;

    await supabase
      .from('switter_lists')
      .insert({
        account_id: account.id,
        name: newListName,
        description: newListDesc,
        is_private: isPrivate
      });

    setNewListName('');
    setNewListDesc('');
    setIsPrivate(false);
    setShowCreateModal(false);
    loadLists();
  };

  const deleteList = async (listId: string) => {
    if (!confirm('Delete this list?')) return;

    await supabase
      .from('switter_lists')
      .delete()
      .eq('id', listId);

    loadLists();
  };

  if (loading) {
    return (
      <PlatformGuard platform="switter" redirectTo="/switter/join">
        <SwitterLayout showBackButton>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </SwitterLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="switter" redirectTo="/switter/join">
      <SwitterLayout showBackButton>
        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="px-4 py-3 flex items-center justify-between">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <List className="w-5 h-5" />
                Lists
              </h1>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Create List</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="List name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                  maxLength={25}
                />

                <textarea
                  placeholder="Description"
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 resize-none"
                  rows={3}
                  maxLength={100}
                />

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    {isPrivate ? <Lock className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                    <span className="font-medium">
                      {isPrivate ? 'Private' : 'Public'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsPrivate(!isPrivate)}
                    className="px-4 py-2 bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
                  >
                    Change
                  </button>
                </div>

                <button
                  onClick={createList}
                  disabled={!newListName.trim()}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create List
                </button>
              </div>
            </div>
          )}

          <div className="p-4 border-b border-gray-200">
            <h2 className="font-bold mb-3">Your Lists</h2>
            {myLists.length === 0 ? (
              <p className="text-gray-500 text-sm">No lists created yet</p>
            ) : (
              <div className="space-y-3">
                {myLists.map((list) => (
                  <div key={list.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <Link to={`/switter/lists/${list.id}`} className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold">{list.name}</p>
                        {list.is_private ? (
                          <Lock className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Globe className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      {list.description && (
                        <p className="text-sm text-gray-600 mb-1">{list.description}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        {list.member_count} members · {list.subscriber_count} subscribers
                      </p>
                    </Link>
                    <button
                      onClick={() => deleteList(list.id)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-full transition-colors ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4">
            <h2 className="font-bold mb-3">Subscribed Lists</h2>
            {subscribedLists.length === 0 ? (
              <p className="text-gray-500 text-sm">Not subscribed to any lists</p>
            ) : (
              <div className="space-y-3">
                {subscribedLists.map((list) => (
                  <Link
                    key={list.id}
                    to={`/switter/lists/${list.id}`}
                    className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold">{list.name}</p>
                      {list.is_private ? (
                        <Lock className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Globe className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    {list.description && (
                      <p className="text-sm text-gray-600 mb-1">{list.description}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      {list.member_count} members · {list.subscriber_count} subscribers
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
