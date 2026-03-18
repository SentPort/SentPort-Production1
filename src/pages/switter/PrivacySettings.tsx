import { useEffect, useState } from 'react';
import { Shield, Eye, EyeOff, Lock, Users, MessageCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';

interface BlockedUser {
  id: string;
  blocked_user: {
    handle: string;
    display_name: string;
    avatar_url: string;
  };
}

interface MutedUser {
  id: string;
  muted_user: {
    handle: string;
    display_name: string;
    avatar_url: string;
  };
}

interface MutedWord {
  id: string;
  word: string;
}

export default function PrivacySettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [mutedWords, setMutedWords] = useState<MutedWord[]>([]);
  const [newMutedWord, setNewMutedWord] = useState('');
  const [activeTab, setActiveTab] = useState<'blocked' | 'muted' | 'words'>('blocked');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

    const { data: blocked } = await supabase
      .from('platform_blocks')
      .select(`
        id,
        blocked_user:blocked_user_id(handle, display_name, avatar_url)
      `)
      .eq('user_id', user.id)
      .eq('platform', 'switter');

    if (blocked) setBlockedUsers(blocked as any);

    const { data: muted } = await supabase
      .from('platform_mutes')
      .select(`
        id,
        muted_user:muted_user_id(handle, display_name, avatar_url)
      `)
      .eq('user_id', user.id)
      .eq('platform', 'switter');

    if (muted) setMutedUsers(muted as any);

    const { data: words } = await supabase
      .from('switter_muted_words')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false });

    if (words) setMutedWords(words);

    setLoading(false);
  };

  const unblockUser = async (blockId: string) => {
    await supabase
      .from('platform_blocks')
      .delete()
      .eq('id', blockId);

    loadData();
  };

  const unmuteUser = async (muteId: string) => {
    await supabase
      .from('platform_mutes')
      .delete()
      .eq('id', muteId);

    loadData();
  };

  const addMutedWord = async () => {
    if (!user || !newMutedWord.trim()) return;

    const { data: account } = await supabase
      .from('switter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) return;

    await supabase
      .from('switter_muted_words')
      .insert({
        account_id: account.id,
        word: newMutedWord.trim().toLowerCase()
      });

    setNewMutedWord('');
    loadData();
  };

  const removeMutedWord = async (wordId: string) => {
    await supabase
      .from('switter_muted_words')
      .delete()
      .eq('id', wordId);

    loadData();
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
            <div className="px-4 py-3">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Safety
              </h1>
            </div>

            <div className="flex border-t border-gray-200">
              <button
                onClick={() => setActiveTab('blocked')}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'blocked'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-4 h-4 inline mr-1" />
                Blocked
              </button>
              <button
                onClick={() => setActiveTab('muted')}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'muted'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <EyeOff className="w-4 h-4 inline mr-1" />
                Muted
              </button>
              <button
                onClick={() => setActiveTab('words')}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'words'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <MessageCircle className="w-4 h-4 inline mr-1" />
                Words
              </button>
            </div>
          </div>

          {activeTab === 'blocked' && (
            <div>
              {blockedUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Lock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No blocked users</p>
                  <p className="text-sm mt-1">Users you block cannot see your sweets or interact with you</p>
                </div>
              ) : (
                <div>
                  {blockedUsers.map((item) => (
                    <div key={item.id} className="border-b border-gray-200 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.blocked_user.avatar_url || 'https://via.placeholder.com/48'}
                          alt={item.blocked_user.display_name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <p className="font-bold">{item.blocked_user.display_name}</p>
                          <p className="text-gray-500 text-sm">@{item.blocked_user.handle}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => unblockUser(item.id)}
                        className="px-4 py-2 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'muted' && (
            <div>
              {mutedUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <EyeOff className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No muted users</p>
                  <p className="text-sm mt-1">Muted users' tweets won't appear in your timeline</p>
                </div>
              ) : (
                <div>
                  {mutedUsers.map((item) => (
                    <div key={item.id} className="border-b border-gray-200 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.muted_user.avatar_url || 'https://via.placeholder.com/48'}
                          alt={item.muted_user.display_name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <p className="font-bold">{item.muted_user.display_name}</p>
                          <p className="text-gray-500 text-sm">@{item.muted_user.handle}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => unmuteUser(item.id)}
                        className="px-4 py-2 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Unmute
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'words' && (
            <div>
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-bold mb-3">Muted Words</h2>
                <p className="text-sm text-gray-600 mb-3">
                  Tweets containing these words will be hidden from your timeline
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add word to mute..."
                    value={newMutedWord}
                    onChange={(e) => setNewMutedWord(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addMutedWord()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={addMutedWord}
                    disabled={!newMutedWord.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

              {mutedWords.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No muted words</p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {mutedWords.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full"
                      >
                        <span>{item.word}</span>
                        <button
                          onClick={() => removeMutedWord(item.id)}
                          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
