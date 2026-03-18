import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search, Loader2, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import HinstaLayout from '../../components/shared/HinstaLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message: string | null;
  last_message_at: string | null;
  participant: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  unread_count: number;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [myAccount, setMyAccount] = useState<any>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);

  useEffect(() => {
    if (user) {
      loadMyAccount();
    }
  }, [user]);

  useEffect(() => {
    if (myAccount) {
      loadConversations();
    }
  }, [myAccount]);

  const loadMyAccount = async () => {
    const { data } = await supabase
      .from('hinsta_accounts')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data) setMyAccount(data);
  };

  const loadConversations = async () => {
    setLoading(true);

    const { data: convData } = await supabase
      .from('hinsta_conversations')
      .select(`
        id,
        participant1_id,
        participant2_id,
        last_message,
        last_message_at
      `)
      .or(`participant1_id.eq.${myAccount.id},participant2_id.eq.${myAccount.id}`)
      .order('last_message_at', { ascending: false });

    if (convData) {
      const conversationsWithDetails = await Promise.all(
        convData.map(async (conv) => {
          const otherParticipantId = conv.participant1_id === myAccount.id
            ? conv.participant2_id
            : conv.participant1_id;

          const { data: participantData } = await supabase
            .from('hinsta_accounts')
            .select('id, username, display_name, avatar_url')
            .eq('id', otherParticipantId)
            .maybeSingle();

          const { count } = await supabase
            .from('hinsta_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', myAccount.id)
            .eq('is_read', false);

          return {
            ...conv,
            participant: participantData || { id: '', username: 'Unknown', display_name: 'Unknown User', avatar_url: null },
            unread_count: count || 0
          };
        })
      );

      setConversations(conversationsWithDetails);
    }

    setLoading(false);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participant.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
        <HinstaLayout showBackButton backButtonPath="/hinsta">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          </div>
        </HinstaLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
      <HinstaLayout showBackButton backButtonPath="/hinsta">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">{myAccount?.username}</h1>
                <button
                  onClick={() => setShowNewMessage(true)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Send className="w-6 h-6 text-gray-700" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <MessageCircle className="w-16 h-16 mb-4" />
                  <p className="font-semibold">No messages yet</p>
                  <p className="text-sm mt-2">Send a message to start a conversation</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => navigate(`/hinsta/messages/${conv.id}`)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
                        <div className="w-full h-full rounded-full bg-white p-0.5">
                          {conv.participant.avatar_url ? (
                            <img
                              src={conv.participant.avatar_url}
                              alt={conv.participant.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg">
                              {conv.participant.username[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      {conv.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unread_count}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                          {conv.participant.username}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                        {conv.last_message || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {showNewMessage && (
          <NewMessageModal
            myAccount={myAccount}
            onClose={() => setShowNewMessage(false)}
            onConversationCreated={(convId: string) => {
              setShowNewMessage(false);
              navigate(`/hinsta/messages/${convId}`);
            }}
          />
        )}
      </HinstaLayout>
    </PlatformGuard>
  );
}

interface NewMessageModalProps {
  myAccount: any;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

function NewMessageModal({ myAccount, onClose, onConversationCreated }: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 0) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hinsta_accounts')
      .select('id, username, display_name, avatar_url')
      .neq('id', myAccount.id)
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .limit(10);

    setUsers(data || []);
    setLoading(false);
  };

  const startConversation = async (recipientId: string) => {
    const { data: existing } = await supabase
      .from('hinsta_conversations')
      .select('id')
      .or(`and(participant1_id.eq.${myAccount.id},participant2_id.eq.${recipientId}),and(participant1_id.eq.${recipientId},participant2_id.eq.${myAccount.id})`)
      .maybeSingle();

    if (existing) {
      onConversationCreated(existing.id);
      return;
    }

    const { data: newConv } = await supabase
      .from('hinsta_conversations')
      .insert({
        participant1_id: myAccount.id,
        participant2_id: recipientId
      })
      .select()
      .single();

    if (newConv) {
      onConversationCreated(newConv.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">New Message</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for a user"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
            </div>
          ) : users.length === 0 && searchQuery.length > 0 ? (
            <div className="text-center text-gray-500 py-8">
              No users found
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startConversation(user.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5 flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-white p-0.5">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                          {user.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-500 truncate">{user.display_name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
