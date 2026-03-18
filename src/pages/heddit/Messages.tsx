import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';

interface Conversation {
  id: string;
  participant_one_id: string;
  participant_two_id: string;
  last_message_at: string;
  last_message_content: string;
  unread_count_one: number;
  unread_count_two: number;
  other_user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
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
          unread_count: isParticipantOne ? conv.unread_count_one : conv.unread_count_two
        };
      });

      setConversations(formattedConversations);
    }

    setLoading(false);
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
      markMessagesAsRead(conversation.id);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    if (!currentAccountId) return;

    await supabase
      .from('heddit_messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('recipient_id', currentAccountId)
      .eq('read', false);

    const isParticipantOne = selectedConversation?.participant_one_id === currentAccountId;
    const unreadField = isParticipantOne ? 'unread_count_one' : 'unread_count_two';

    await supabase
      .from('heddit_conversations')
      .update({ [unreadField]: 0 })
      .eq('id', conversationId);

    loadConversations();
  };

  const sendMessage = async () => {
    if (!messageContent.trim() || !selectedConversation || !currentAccountId) return;

    setSending(true);

    const { error } = await supabase
      .from('heddit_messages')
      .insert({
        conversation_id: selectedConversation.id,
        sender_id: currentAccountId,
        recipient_id: selectedConversation.other_user.id,
        content: messageContent.trim()
      });

    if (!error) {
      setMessageContent('');
      selectConversation(selectedConversation);
    }

    setSending(false);
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

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton>
        <div className="h-[calc(100vh-64px)] bg-white flex">
          <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-200 flex-col`}>
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Messages
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No messages yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Start a conversation from a user's profile
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                      selectedConversation?.id === conv.id ? 'bg-orange-50' : ''
                    }`}
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

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900 truncate">
                          {conv.other_user.display_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(conv.last_message_at)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {conv.last_message_content}
                        </p>
                        {conv.unread_count > 0 && (
                          <div className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                            {conv.unread_count}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedConversation(null);
                      setSearchParams({});
                    }}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
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
                    className="hover:underline"
                  >
                    <div className="font-semibold text-gray-900">
                      {selectedConversation.other_user.display_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      u/{selectedConversation.other_user.username}
                    </div>
                  </Link>
                </div>

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
                </div>

                <div className="p-4 border-t border-gray-200">
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
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </HedditLayout>
    </PlatformGuard>
  );
}
