import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Send, MessageCircle, Star, MessageSquarePlus, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';
import BlogDeleteConversationModal from '../../components/blog/BlogDeleteConversationModal';
import BlogConversationBlockedBanner from '../../components/blog/BlogConversationBlockedBanner';
import BlogConversationOptionsMenu from '../../components/blog/BlogConversationOptionsMenu';
import NewBlogConversationModal from '../../components/blog/NewBlogConversationModal';

export default function Messages() {
  return (
    <PlatformGuard platform="blog">
      <MessagesContent />
    </PlatformGuard>
  );
}

interface ConversationSetting {
  isFavorite: boolean;
  isHidden: boolean;
}

interface OtherUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

function MessagesContent() {
  const [searchParams] = useSearchParams();
  const conversationParam = searchParams.get('conversation');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<any[]>([]);
  const [conversationOtherUsers, setConversationOtherUsers] = useState<Map<string, OtherUser>>(new Map());
  const [conversationSettings, setConversationSettings] = useState<Map<string, ConversationSetting>>(new Map());
  const [conversationUnreadCounts, setConversationUnreadCounts] = useState<Map<string, number>>(new Map());
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationFilter, setConversationFilter] = useState<'all' | 'favorites' | 'hidden'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [newConversationModalOpen, setNewConversationModalOpen] = useState(false);
  const [otherParticipantBlocked, setOtherParticipantBlocked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedConversationParam = useRef<string | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    if (!conversationParam || !user || processedConversationParam.current === conversationParam) return;
    processedConversationParam.current = conversationParam;

    const alreadyLoaded = conversations.some((c) => c.id === conversationParam);
    if (alreadyLoaded) {
      setSelectedConversation(conversationParam);
      return;
    }

    setSelectedConversation(conversationParam);
    loadConversations().then(() => {
      setSelectedConversation(conversationParam);
    });
  }, [conversationParam, user, conversations.length]);

  useEffect(() => {
    if (!selectedConversation || !user) return;

    loadMessages(selectedConversation);
    checkOtherParticipantBlocked(selectedConversation);

    const channel = supabase
      .channel(`blog-conv-${selectedConversation}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'blog_messages', filter: `conversation_id=eq.${selectedConversation}` },
        (payload) => {
          const msg = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.sender_id !== user.id) {
            markConversationRead(selectedConversation);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('blog-participant-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'blog_conversation_participants' },
        () => { loadConversations(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'blog_messages' },
        () => { loadConversations(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length]);

  const loadConversations = async () => {
    if (!user) return;

    const { data: participantData } = await supabase
      .from('blog_conversation_participants')
      .select('conversation_id, is_favorite, is_hidden, unread_count, blog_conversations!blog_conversation_participants_conversation_id_fkey(*)')
      .eq('account_id', user.id)
      .is('deleted_at', null)
      .order('is_favorite', { ascending: false });

    if (participantData) {
      const convs = participantData
        .map((p: any) => p.blog_conversations)
        .filter(Boolean)
        .sort((a: any, b: any) => {
          const ta = a.last_message_at || a.created_at;
          const tb = b.last_message_at || b.created_at;
          return new Date(tb).getTime() - new Date(ta).getTime();
        });

      setConversations(convs);

      const settingsMap = new Map<string, ConversationSetting>();
      const unreadMap = new Map<string, number>();
      participantData.forEach((p: any) => {
        settingsMap.set(p.conversation_id, {
          isFavorite: p.is_favorite || false,
          isHidden: p.is_hidden || false,
        });
        unreadMap.set(p.conversation_id, p.unread_count || 0);
      });
      setConversationSettings(settingsMap);
      setConversationUnreadCounts(unreadMap);

      const otherUsersMap = new Map<string, OtherUser>();
      for (const conv of convs) {
        const otherAccountId =
          conv.participant_1_id === user.id ? conv.participant_2_id : conv.participant_1_id;
        if (otherAccountId) {
          const { data: acct } = await supabase
            .from('blog_accounts')
            .select('id, username, display_name, avatar_url')
            .eq('id', otherAccountId)
            .maybeSingle();
          if (acct) otherUsersMap.set(conv.id, acct);
        }
      }
      setConversationOtherUsers(otherUsersMap);
    }

    setLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('blog_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
    markConversationRead(conversationId);
  };

  const checkOtherParticipantBlocked = async (conversationId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('blog_conversation_participants')
      .select('permanently_blocked')
      .eq('conversation_id', conversationId)
      .neq('account_id', user.id)
      .maybeSingle();

    setOtherParticipantBlocked(data?.permanently_blocked || false);
  };

  const markConversationRead = async (conversationId: string) => {
    if (!user) return;

    await supabase
      .from('blog_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    await supabase
      .from('blog_conversation_participants')
      .update({ unread_count: 0, last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('account_id', user.id);

    await supabase
      .from('blog_notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('conversation_id', conversationId)
      .eq('is_read', false);

    setConversationUnreadCounts((prev) => {
      const next = new Map(prev);
      next.set(conversationId, 0);
      return next;
    });
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim() || sending) return;

    const content = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      conversation_id: selectedConversation,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages((prev) => [...prev, optimistic]);
    setNewMessage('');
    setSending(true);

    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 50);

    const { data, error } = await supabase
      .from('blog_messages')
      .insert({ conversation_id: selectedConversation, sender_id: user.id, content })
      .select()
      .single();

    setSending(false);

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(content);
    } else if (data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
    }
  };

  const handleToggleFavorite = async (conversationId: string) => {
    if (!user) return;
    const settings = conversationSettings.get(conversationId);
    const next = !settings?.isFavorite;

    await supabase
      .from('blog_conversation_participants')
      .update({ is_favorite: next })
      .eq('conversation_id', conversationId)
      .eq('account_id', user.id);

    setConversationSettings((prev) => {
      const m = new Map(prev);
      m.set(conversationId, { ...settings!, isFavorite: next });
      return m;
    });

    loadConversations();
  };

  const handleToggleHidden = async (conversationId: string) => {
    if (!user) return;
    const settings = conversationSettings.get(conversationId);
    const next = !settings?.isHidden;

    await supabase
      .from('blog_conversation_participants')
      .update({ is_hidden: next, hidden_at: next ? new Date().toISOString() : null })
      .eq('conversation_id', conversationId)
      .eq('account_id', user.id);

    setConversationSettings((prev) => {
      const m = new Map(prev);
      m.set(conversationId, { ...settings!, isHidden: next });
      return m;
    });

    if (selectedConversation === conversationId) setSelectedConversation(null);
    loadConversations();
  };

  const handleDeleteConversation = async (conversationId: string, permanent: boolean) => {
    if (!user) return;

    const updateData: any = { deleted_at: new Date().toISOString() };
    if (permanent) {
      updateData.permanently_blocked = true;
    }

    await supabase
      .from('blog_conversation_participants')
      .update(updateData)
      .eq('conversation_id', conversationId)
      .eq('account_id', user.id);

    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (selectedConversation === conversationId) {
      setSelectedConversation(null);
      navigate('/blog/messages');
    }
  };

  const handleStartNewConversation = async (otherUserId: string) => {
    if (!user) return;
    setNewConversationModalOpen(false);

    const { data, error } = await supabase.rpc('find_or_create_blog_conversation', {
      p_user_a_id: user.id,
      p_user_b_id: otherUserId,
    });

    if (!error && data) {
      processedConversationParam.current = null;
      await loadConversations();
      navigate(`/blog/messages?conversation=${data}`);
      setSelectedConversation(data as string);
    }
  };

  const handleStartNewConversationWithCurrentOther = async () => {
    if (!selectedConversation || !user) return;
    const other = conversationOtherUsers.get(selectedConversation);
    if (other) await handleStartNewConversation(other.id);
  };

  const filteredConversations = conversations.filter((conv) => {
    const settings = conversationSettings.get(conv.id);
    const other = conversationOtherUsers.get(conv.id);
    const matchesSearch =
      !searchQuery ||
      other?.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      other?.username.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (conversationFilter === 'favorites') return settings?.isFavorite;
    if (conversationFilter === 'hidden') return settings?.isHidden;
    return !settings?.isHidden;
  });

  const selectedOtherUser = selectedConversation
    ? conversationOtherUsers.get(selectedConversation)
    : null;
  const selectedSettings = selectedConversation
    ? conversationSettings.get(selectedConversation)
    : null;
  const deleteTargetName = conversationToDelete
    ? conversationOtherUsers.get(conversationToDelete)?.display_name || 'this user'
    : 'this user';

  if (loading) {
    return (
      <BlogLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </BlogLayout>
    );
  }

  return (
    <BlogLayout>
      {deleteModalOpen && conversationToDelete && (
        <BlogDeleteConversationModal
          otherUserName={deleteTargetName}
          onClose={() => { setDeleteModalOpen(false); setConversationToDelete(null); }}
          onConfirm={(permanent) => {
            handleDeleteConversation(conversationToDelete, permanent);
            setDeleteModalOpen(false);
            setConversationToDelete(null);
          }}
        />
      )}

      {newConversationModalOpen && (
        <NewBlogConversationModal
          onClose={() => setNewConversationModalOpen(false)}
          onSelectUser={handleStartNewConversation}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex"
          style={{ height: 'calc(100vh - 140px)', minHeight: 560 }}
        >
          {/* Sidebar */}
          <div className={`w-full md:w-80 flex-shrink-0 border-r border-gray-200 flex flex-col ${isMobile && selectedConversation ? 'hidden' : ''}`}>
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-bold text-gray-900">Messages</h1>
                <button
                  onClick={() => setNewConversationModalOpen(true)}
                  className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors"
                  title="New conversation"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all mb-3"
              />

              <div className="flex gap-1">
                {(['all', 'favorites', 'hidden'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setConversationFilter(filter)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
                      conversationFilter === filter
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter === 'favorites' && <Star className="w-3 h-3" />}
                    {filter === 'all' ? 'All' : filter === 'favorites' ? 'Fav' : 'Hidden'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
                  <MessageCircle className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm font-medium">
                    {conversationFilter === 'favorites'
                      ? 'No favorite conversations'
                      : conversationFilter === 'hidden'
                      ? 'No hidden conversations'
                      : 'No conversations yet'}
                  </p>
                  {conversationFilter === 'all' && (
                    <p className="text-gray-400 text-xs mt-1">Start connecting with other writers</p>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const other = conversationOtherUsers.get(conv.id);
                  const settings = conversationSettings.get(conv.id);
                  const unread = conversationUnreadCounts.get(conv.id) || 0;
                  const isSelected = selectedConversation === conv.id;

                  return (
                    <div
                      key={conv.id}
                      className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                        isSelected ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                      } ${settings?.isFavorite && !isSelected ? 'border-l-4 border-l-amber-400' : ''}`}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <div className="w-11 h-11 rounded-full flex-shrink-0 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                        {other?.avatar_url ? (
                          <img src={other.avatar_url} alt={other.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-base">{other?.display_name?.charAt(0).toUpperCase() || '?'}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`font-semibold text-sm truncate ${unread > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {other?.display_name || 'Unknown writer'}
                          </span>
                          {settings?.isFavorite && (
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">@{other?.username}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {unread > 0 && (
                          <span className="bg-emerald-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-4">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                        <BlogConversationOptionsMenu
                          isFavorite={settings?.isFavorite || false}
                          isHidden={settings?.isHidden || false}
                          onToggleFavorite={() => handleToggleFavorite(conv.id)}
                          onToggleHidden={() => handleToggleHidden(conv.id)}
                          onDelete={() => { setConversationToDelete(conv.id); setDeleteModalOpen(true); }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Message panel */}
          <div className={`flex-1 flex flex-col min-w-0 ${isMobile && !selectedConversation ? 'hidden' : ''}`}>
            {selectedConversation && selectedOtherUser ? (
              <>
                <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 flex-shrink-0 bg-white">
                  {isMobile && (
                    <button
                      onClick={() => { setSelectedConversation(null); navigate('/blog/messages'); }}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors -ml-1"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                  )}
                  <Link to={`/blog/profile/${selectedOtherUser.username}`} className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold overflow-hidden hover:opacity-80 transition-opacity">
                      {selectedOtherUser.avatar_url ? (
                        <img src={selectedOtherUser.avatar_url} alt={selectedOtherUser.display_name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{selectedOtherUser.display_name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/blog/profile/${selectedOtherUser.username}`}
                      className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors text-sm block truncate"
                    >
                      {selectedOtherUser.display_name}
                    </Link>
                    <p className="text-xs text-gray-500">@{selectedOtherUser.username}</p>
                  </div>
                  <BlogConversationOptionsMenu
                    isFavorite={selectedSettings?.isFavorite || false}
                    isHidden={selectedSettings?.isHidden || false}
                    onToggleFavorite={() => handleToggleFavorite(selectedConversation)}
                    onToggleHidden={() => handleToggleHidden(selectedConversation)}
                    onDelete={() => { setConversationToDelete(selectedConversation); setDeleteModalOpen(true); }}
                  />
                </div>

                {otherParticipantBlocked && (
                  <BlogConversationBlockedBanner
                    otherUserName={selectedOtherUser.display_name}
                    onStartNew={handleStartNewConversationWithCurrentOther}
                  />
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                      <MessageCircle className="w-12 h-12 text-gray-200 mb-3" />
                      <p className="text-gray-400 text-sm">No messages yet. Say hello!</p>
                    </div>
                  )}
                  {messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isOwn
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm break-words leading-relaxed">{message.content}</p>
                          <p className={`text-xs mt-1 ${isOwn ? 'text-emerald-100' : 'text-gray-400'}`}>
                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-gray-200 flex-shrink-0 bg-white">
                  {otherParticipantBlocked ? (
                    <div className="text-center py-2 text-sm text-gray-400">
                      You cannot send messages in this conversation.
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Write a message..."
                        rows={1}
                        className="flex-1 resize-none bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                        style={{ maxHeight: 120 }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="p-2.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Select a conversation</p>
                  <p className="text-gray-400 text-sm mt-1">or start a new one with the + button</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </BlogLayout>
  );
}
