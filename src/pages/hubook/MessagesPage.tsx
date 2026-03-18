import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHuBook } from '../../contexts/HuBookContext';
import { SearchWithHistory } from '../../components/shared/SearchWithHistory';

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const conversationParam = searchParams.get('conversation');
  const { user } = useAuth();
  const { hubookProfile } = useHuBook();
  const [conversations, setConversations] = useState<any[]>([]);
  const [conversationParticipants, setConversationParticipants] = useState<Map<string, any[]>>(new Map());
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (conversationParam && conversations.length > 0) {
      setSelectedConversation(conversationParam);
    }
  }, [conversationParam, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();

      // Subscribe to new messages
      const channel = supabase
        .channel(`conversation-${selectedConversation}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversation}`
          },
          () => {
            loadMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    if (!user) return;

    const { data: participantData } = await supabase
      .from('conversation_participants')
      .select('conversation_id, conversations(*)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (participantData) {
      const convs = participantData.map(p => p.conversations);
      setConversations(convs);

      // Load participants for each conversation
      const participantsMap = new Map();
      for (const conv of convs) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id, hubook_profiles!conversation_participants_user_id_fkey(*)')
          .eq('conversation_id', conv.id);

        if (participants) {
          participantsMap.set(conv.id, participants.filter(p => p.user_id !== user.id));
        }
      }
      setConversationParticipants(participantsMap);
    }
    setLoading(false);
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;

    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        user_profiles!messages_sender_id_fkey(full_name, id)
      `)
      .eq('conversation_id', selectedConversation)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', selectedConversation)
        .neq('sender_id', user?.id);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        content: newMessage.trim()
      });

    if (!error) {
      setNewMessage('');
      loadMessages();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
      <div className="md:col-span-1 bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <SearchWithHistory
            platform="hubook_messages"
            onSearch={(query) => {
              console.log('Searching messages for:', query);
            }}
            placeholder="Search messages"
            variant="platform"
            inputClassName="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="overflow-y-auto h-full">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const participants = conversationParticipants.get(conv.id) || [];
              const otherUser = participants[0]?.hubook_profiles;

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    selectedConversation === conv.id ? 'bg-blue-50' : ''
                  }`}
                >
                  {otherUser?.profile_photo_url ? (
                    <img
                      src={otherUser.profile_photo_url}
                      alt={otherUser.display_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {otherUser?.display_name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900">
                      {otherUser?.display_name || 'Conversation'}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {otherUser?.work || 'Click to view messages'}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="md:col-span-2 bg-white rounded-lg shadow-sm flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {(() => {
                  const participants = conversationParticipants.get(selectedConversation) || [];
                  const otherUser = participants[0]?.hubook_profiles;
                  return otherUser?.display_name || 'Messages';
                })()}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                return (
                  <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'} rounded-2xl px-4 py-2`}>
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-600'}`}>
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 px-4 py-2 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
