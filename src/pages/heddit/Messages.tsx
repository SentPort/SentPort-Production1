import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MessageCircle, Send, ArrowLeft, Star, CreditCard as Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';
import { ConversationOptionsMenu } from '../../components/heddit/ConversationOptionsMenu';
import { DeleteConversationModal } from '../../components/heddit/DeleteConversationModal';
import { ConversationBlockedBanner } from '../../components/heddit/ConversationBlockedBanner';
import { NewConversationModal } from '../../components/heddit/NewConversationModal';

type ConversationFilter = 'all' | 'favorites' | 'hidden';

interface Conversation {
  id: string;
  participant_one_id: string;
  participant_two_id: string;
  last_message_at: string;
  last_message_content: string;
  unread_count_one: number;
  unread_count_two: number;
  is_favorite_one: boolean;
  is_favorite_two: boolean;
  is_hidden_one: boolean;
  is_hidden_two: boolean;
  permanently_blocked_one: boolean;
  permanently_blocked_two: boolean;
  other_user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  unread_count: number;
  isFavorite: boolean;
  isHidden: boolean;
  isPermanentlyBlocked: boolean;
  otherUserPermanentlyBlocked: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get('conversation');

  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetConversation, setDeleteTargetConversation] = useState<Conversation | null>(null);
  const [newConversationModalOpen, setNewConversationModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentAccount();
  }, []);

  useEffect(() => {
    if (currentAccountId) {
      loadConversations();
    }
  }, [currentAccountId]);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        selectConversation(conv);
      }
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadCurrentAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('heddit_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setCurrentAccountId(data.id);
    }
  };

  const loadConversations = async () => {
    if (!currentAccountId) return;

    const { data, error } = await supabase
      .from('heddit_conversations')
      .select(`
        *,
        participant_one:heddit_accounts!participant_one_id(id, username, display_name, avatar_url),
        participant_two:heddit_accounts!participant_two_id(id, username, display_name, avatar_url)
      `)
      .or(`participant_one_id.eq.${currentAccountId},participant_two_id.eq.${currentAccountId}`)
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      const formattedConversations = data.map((conv: any) => {
        const isParticipantOne = conv.participant_one_id === currentAccountId;
        const otherUser = isParticipantOne ? conv.participant_two : conv.participant_one;

        return {
          ...conv,
          other_user: otherUser,
          unread_count: isParticipantOne ? conv.unread_count_one : conv.unread_count_two,
          isFavorite: isParticipantOne ? conv.is_favorite_one : conv.is_favorite_two,
          isHidden: isParticipantOne ? conv.is_hidden_one : conv.is_hidden_two,
          isPermanentlyBlocked: isParticipantOne ? conv.permanently_blocked_one : conv.permanently_blocked_two,
          otherUserPermanentlyBlocked: isParticipantOne ? conv.permanently_blocked_two : conv.permanently_blocked_one,
        };
      });

      setConversations(formattedConversations);
    }

    setLoading(false);
  };

  const getFilteredConversations = () => {
    return conversations.filter(conv => {
      if (conv.isPermanentlyBlocked) return false;
      if (filter === 'favorites') return conv.isFavorite;
      if (filter === 'hidden') return conv.isHidden;
      return !conv.isHidden;
    });
  };

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSearchParams({ conversation: conversation.id });

    const { data, error } = await supabase
      .from('heddit_messages')
      .select(`
        *,
        sender:heddit_accounts!sender_id(username, display_name, avatar_url)
      `)
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      markMessagesAsRead(conversation);
    }
  };

  const markMessagesAsRead = async (conversation: Conversation) => {
    if (!currentAccountId) return;

    await supabase
      .from('heddit_messages')
      .update({ read: true })
      .eq('conversation_id', conversation.id)
      .eq('recipient_id', currentAccountId)
      .eq('read', false);

    const isParticipantOne = conversation.participant_one_id === currentAccountId;
    const unreadField = isParticipantOne ? 'unread_count_one' : 'unread_count_two';

    await supabase
      .from('heddit_conversations')
      .update({ [unreadField]: 0 })
      .eq('id', conversation.id);

    loadConversations();
  };

  const sendMessage = async () => {
    if (!messageContent.trim() || !selectedConversation || !currentAccountId) return;
    if (selectedConversation.otherUserPermanentlyBlocked) return;

    setSending(true);

    const isParticipantOne = selectedConversation.participant_one_id === currentAccountId;
    const unreadField = isParticipantOne ? 'unread_count_two' : 'unread_count_one';

    const { error } = await supabase
      .from('heddit_messages')
      .insert({
        conversation_id: selectedConversation.id,
        sender_id: currentAccountId,
        recipient_id: selectedConversation.other_user.id,
        content: messageContent.trim()
      });

    if (!error) {
      await supabase
        .from('heddit_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_content: messageContent.trim(),
          [unreadField]: (selectedConversation.unread_count_one || selectedConversation.unread_count_two || 0) + 1
        })
        .eq('id', selectedConversation.id);

      setMessageContent('');
      selectConversation(selectedConversation);
    }

    setSending(false);
  };

  const toggleFavorite = async (conv: Conversation) => {
    if (!currentAccountId) return;
    const isParticipantOne = conv.participant_one_id === currentAccountId;
    const field = isParticipantOne ? 'is_favorite_one' : 'is_favorite_two';

    await supabase
      .from('heddit_conversations')
      .update({ [field]: !conv.isFavorite })
      .eq('id', conv.id);

    loadConversations();
  };

  const toggleHidden = async (conv: Conversation) => {
    if (!currentAccountId) return;
    const isParticipantOne = conv.participant_one_id === currentAccountId;
    const hiddenField = isParticipantOne ? 'is_hidden_one' : 'is_hidden_two';
    const hiddenAtField = isParticipantOne ? 'hidden_at_one' : 'hidden_at_two';
    const newHidden = !conv.isHidden;

    await supabase
      .from('heddit_conversations')
      .update({
        [hiddenField]: newHidden,
        [hiddenAtField]: newHidden ? new Date().toISOString() : null
      })
      .eq('id', conv.id);

    if (selectedConversation?.id === conv.id && newHidden && filter !== 'hidden') {
      setSelectedConversation(null);
      setSearchParams({});
    }

    loadConversations();
  };

  const handleDeleteConversation = (conv: Conversation) => {
    setDeleteTargetConversation(conv);
    setDeleteModalOpen(true);
  };

  const confirmDeleteConversation = async (permanent: boolean) => {
    if (!deleteTargetConversation || !currentAccountId) return;
    const conv = deleteTargetConversation;
    const isParticipantOne = conv.participant_one_id === currentAccountId;

    if (permanent) {
      const blockedField = isParticipantOne ? 'permanently_blocked_one' : 'permanently_blocked_two';
      const blockedAtField = isParticipantOne ? 'blocked_at_one' : 'blocked_at_two';
      const hiddenField = isParticipantOne ? 'is_hidden_one' : 'is_hidden_two';
      const hiddenAtField = isParticipantOne ? 'hidden_at_one' : 'hidden_at_two';

      await supabase
        .from('heddit_conversations')
        .update({
          [blockedField]: true,
          [blockedAtField]: new Date().toISOString(),
          [hiddenField]: true,
          [hiddenAtField]: new Date().toISOString()
        })
        .eq('id', conv.id);
    } else {
      const hiddenField = isParticipantOne ? 'is_hidden_one' : 'is_hidden_two';
      const hiddenAtField = isParticipantOne ? 'hidden_at_one' : 'hidden_at_two';

      await supabase
        .from('heddit_conversations')
        .update({
          [hiddenField]: true,
          [hiddenAtField]: new Date().toISOString()
        })
        .eq('id', conv.id);
    }

    if (selectedConversation?.id === conv.id) {
      setSelectedConversation(null);
      setSearchParams({});
    }

    setDeleteTargetConversation(null);
    loadConversations();
  };

  const handleStartNewConversation = async (targetAccountId: string) => {
    if (!currentAccountId) return;

    const smallerId = currentAccountId < targetAccountId ? currentAccountId : targetAccountId;
    const largerId = currentAccountId < targetAccountId ? targetAccountId : currentAccountId;

    const { data: newConv, error } = await supabase
      .from('heddit_conversations')
      .insert({
        participant_one_id: smallerId,
        participant_two_id: largerId,
        last_message_at: new Date().toISOString(),
        last_message_content: ''
      })
      .select(`
        *,
        participant_one:heddit_accounts!participant_one_id(id, username, display_name, avatar_url),
        participant_two:heddit_accounts!participant_two_id(id, username, display_name, avatar_url)
      `)
      .single();

    if (!error && newConv) {
      await loadConversations();
      const isParticipantOne = newConv.participant_one_id === currentAccountId;
      const otherUser = isParticipantOne ? newConv.participant_two : newConv.participant_one;
      const conv: Conversation = {
        ...newConv,
        other_user: otherUser,
        unread_count: 0,
        isFavorite: false,
        isHidden: false,
        isPermanentlyBlocked: false,
        otherUserPermanentlyBlocked: false,
      };
      selectConversation(conv);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredConversations = getFilteredConversations();

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton>
        <div className="h-[calc(100vh-64px)] bg-white flex">
          <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-200 flex-col`}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Messages
                </h1>
                <button
                  onClick={() => setNewConversationModalOpen(true)}
                  className="p-2 hover:bg-orange-50 rounded-full transition-colors text-orange-500 hover:text-orange-600"
                  title="New Conversation"
                >
                  <Edit className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['all', 'favorites', 'hidden'] as ConversationFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                      filter === f
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  {filter === 'favorites' ? (
                    <>
                      <p className="text-gray-500">No favorite conversations</p>
                      <p className="text-sm text-gray-400 mt-1">Star a conversation to add it here</p>
                    </>
                  ) : filter === 'hidden' ? (
                    <>
                      <p className="text-gray-500">No hidden conversations</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Start a conversation from a user's profile
                      </p>
                    </>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group relative flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 cursor-pointer ${
                      selectedConversation?.id === conv.id ? 'bg-orange-50' : ''
                    }`}
                    onClick={() => selectConversation(conv)}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {conv.other_user.avatar_url ? (
                        <img
                          src={conv.other_user.avatar_url}
                          alt={conv.other_user.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-semibold">
                          {conv.other_user.display_name[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-gray-900 truncate text-sm">
                            {conv.other_user.display_name}
                          </span>
                          {conv.isFavorite && (
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                          <span className="text-xs text-gray-500">
                            {formatTime(conv.last_message_at)}
                          </span>
                          <ConversationOptionsMenu
                            conversationId={conv.id}
                            isFavorite={conv.isFavorite}
                            isHidden={conv.isHidden}
                            onToggleFavorite={() => toggleFavorite(conv)}
                            onToggleHidden={() => toggleHidden(conv)}
                            onDelete={() => handleDeleteConversation(conv)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                          {conv.last_message_content || 'No messages yet'}
                        </p>
                        {conv.unread_count > 0 && (
                          <div className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2 flex-shrink-0">
                            {conv.unread_count}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => {
                      setSelectedConversation(null);
                      setSearchParams({});
                    }}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {selectedConversation.other_user.avatar_url ? (
                      <img
                        src={selectedConversation.other_user.avatar_url}
                        alt={selectedConversation.other_user.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-semibold text-sm">
                        {selectedConversation.other_user.display_name[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/heddit/u/${selectedConversation.other_user.username}`}
                    className="hover:underline flex-1 min-w-0"
                  >
                    <div className="font-semibold text-gray-900 truncate">
                      {selectedConversation.other_user.display_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      u/{selectedConversation.other_user.username}
                    </div>
                  </Link>
                </div>

                {selectedConversation.otherUserPermanentlyBlocked && (
                  <ConversationBlockedBanner
                    otherUserDisplayName={selectedConversation.other_user.display_name}
                    onStartNewConversation={() => setNewConversationModalOpen(true)}
                  />
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => {
                    const isSender = message.sender_id === currentAccountId;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-md ${isSender ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg p-3`}>
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          <div className={`text-xs mt-1 ${isSender ? 'text-orange-100' : 'text-gray-500'}`}>
                            {formatTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-200 flex-shrink-0">
                  {selectedConversation.otherUserPermanentlyBlocked ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Messages cannot be sent in this conversation"
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                        disabled
                      />
                      <button
                        disabled
                        className="px-4 py-2 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        disabled={sending}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!messageContent.trim() || sending}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg">Select a conversation to start messaging</p>
                  <button
                    onClick={() => setNewConversationModalOpen(true)}
                    className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                  >
                    Start New Conversation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DeleteConversationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setDeleteTargetConversation(null);
          }}
          onConfirm={confirmDeleteConversation}
          otherParticipantName={deleteTargetConversation?.other_user.display_name}
        />

        {currentAccountId && (
          <NewConversationModal
            isOpen={newConversationModalOpen}
            currentAccountId={currentAccountId}
            onClose={() => setNewConversationModalOpen(false)}
            onSelectUser={handleStartNewConversation}
          />
        )}
      </HedditLayout>
    </PlatformGuard>
  );
}
