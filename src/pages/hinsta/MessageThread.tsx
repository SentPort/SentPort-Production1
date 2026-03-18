import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Loader2, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import HinstaLayout from '../../components/shared/HinstaLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function MessageThread() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myAccount, setMyAccount] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadMyAccount();
    }
  }, [user]);

  useEffect(() => {
    if (myAccount && conversationId) {
      loadConversation();
      loadMessages();
      markMessagesAsRead();

      const channel = supabase
        .channel(`conversation:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'hinsta_messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
            if (payload.new.sender_id !== myAccount.id) {
              markMessagesAsRead();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [myAccount, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMyAccount = async () => {
    const { data } = await supabase
      .from('hinsta_accounts')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data) setMyAccount(data);
  };

  const loadConversation = async () => {
    const { data: convData } = await supabase
      .from('hinsta_conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (!convData) {
      navigate('/hinsta/messages');
      return;
    }

    setConversation(convData);

    const otherUserId = convData.participant1_id === myAccount.id
      ? convData.participant2_id
      : convData.participant1_id;

    const { data: userData } = await supabase
      .from('hinsta_accounts')
      .select('id, username, display_name, avatar_url')
      .eq('id', otherUserId)
      .maybeSingle();

    if (userData) setOtherUser(userData);
  };

  const loadMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hinsta_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
    setLoading(false);
  };

  const markMessagesAsRead = async () => {
    await supabase
      .from('hinsta_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', myAccount?.id)
      .eq('is_read', false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await supabase
        .from('hinsta_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: myAccount.id,
          message: newMessage.trim()
        });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
    setSending(false);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDateHeader = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const shouldShowDateHeader = (currentMsg: Message, prevMsg: Message | undefined) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    return currentDate !== prevDate;
  };

  if (loading || !otherUser) {
    return (
      <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
        <HinstaLayout showBackButton backButtonPath="/hinsta/messages">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          </div>
        </HinstaLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
      <HinstaLayout showBackButton backButtonPath="/hinsta/messages">
        <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <button
              onClick={() => navigate(`/hinsta/${otherUser.username}`)}
              className="flex items-center gap-3 hover:opacity-70 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  {otherUser.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                      {otherUser.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">{otherUser.username}</div>
                <div className="text-xs text-gray-500">{otherUser.display_name}</div>
              </div>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Info className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-white p-4 space-y-4">
            {messages.map((message, index) => {
              const isMe = message.sender_id === myAccount.id;
              const showDateHeader = shouldShowDateHeader(message, messages[index - 1]);

              return (
                <div key={message.id}>
                  {showDateHeader && (
                    <div className="flex justify-center my-4">
                      <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                        {formatDateHeader(message.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`px-4 py-2 rounded-3xl ${
                          isMe
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="break-words">{message.message}</p>
                      </div>
                      <div className={`text-xs text-gray-500 mt-1 px-2 ${isMe ? 'text-right' : 'text-left'}`}>
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t border-gray-200 p-4">
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="p-2 text-pink-500 hover:text-pink-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Send className="w-6 h-6" />
                )}
              </button>
            </form>
          </div>
        </div>
      </HinstaLayout>
    </PlatformGuard>
  );
}
