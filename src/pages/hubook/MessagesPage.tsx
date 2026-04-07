import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Star, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHuBook } from '../../contexts/HuBookContext';
import { SearchWithHistory } from '../../components/shared/SearchWithHistory';
import { MessageReactionPicker } from '../../components/hubook/MessageReactionPicker';
import { ConversationOptionsMenu } from '../../components/hubook/ConversationOptionsMenu';
import { DeleteConversationModal } from '../../components/hubook/DeleteConversationModal';

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const conversationParam = searchParams.get('conversation');
  const recipientParam = searchParams.get('recipient');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hubookProfile } = useHuBook();
  const [conversations, setConversations] = useState<any[]>([]);
  const [conversationParticipants, setConversationParticipants] = useState<Map<string, any[]>>(new Map());
  const [conversationSettings, setConversationSettings] = useState<Map<string, { isFavorite: boolean; isHidden: boolean }>>(new Map());
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [recipientProfile, setRecipientProfile] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageReactions, setMessageReactions] = useState<Map<string, any[]>>(new Map());
  const [userReactions, setUserReactions] = useState<Map<string, string>>(new Map());
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingNewConversation, setLoadingNewConversation] = useState(false);
  const [conversationFilter, setConversationFilter] = useState<'all' | 'favorites' | 'hidden'>('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const processedConversationParam = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    const loadRecipientProfile = async () => {
      if (!recipientParam) {
        setRecipientProfile(null);
        return;
      }

      const { data: profile } = await supabase
        .from('hubook_profiles')
        .select('*')
        .eq('id', recipientParam)
        .maybeSingle();

      if (profile) {
        setRecipientProfile(profile);
      }
    };

    loadRecipientProfile();
  }, [recipientParam]);

  useEffect(() => {
    const handleConversationParam = async () => {
      if (!conversationParam || !user || processedConversationParam.current === conversationParam) return;

      setLoadingNewConversation(true);
      processedConversationParam.current = conversationParam;

      const conversationExists = conversations.some(c => c.id === conversationParam);

      if (conversationExists) {
        setSelectedConversation(conversationParam);
        setLoadingNewConversation(false);
        return;
      }

      setSelectedConversation(conversationParam);

      const fetchConversationWithRetry = async (attempt = 0): Promise<boolean> => {
        const { data: specificConversation, error: convError } = await supabase
          .from('conversation_participants')
          .select('conversation_id, conversations!conversation_participants_conversation_id_fkey(*)')
          .eq('user_id', user.id)
          .eq('conversation_id', conversationParam)
          .maybeSingle();

        if (convError) {
          console.error('Error fetching conversation:', convError);
        }

        if (specificConversation?.conversations) {
          const conv = specificConversation.conversations as any;
          setConversations(prev => {
            const exists = prev.some(c => c.id === conv.id);
            if (exists) return prev;
            return [conv, ...prev];
          });

          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id, user_profiles!conversation_participants_user_id_fkey(id, hubook_profiles(*))')
            .eq('conversation_id', conv.id);

          if (participants) {
            const transformedParticipants = participants
              .filter((p: any) => p.user_id !== user.id)
              .map((p: any) => ({
                user_id: p.user_id,
                hubook_profiles: p.user_profiles?.hubook_profiles || null
              }));

            setConversationParticipants(prev => {
              const newMap = new Map(prev);
              newMap.set(conv.id, transformedParticipants);
              return newMap;
            });
          }

          return true;
        }

        if (attempt < 4) {
          const delay = [500, 1000, 1500, 2000][attempt];
          console.log(`Retry attempt ${attempt + 1}, waiting ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchConversationWithRetry(attempt + 1);
        }

        return false;
      };

      fetchConversationWithRetry().then(success => {
        if (!success) {
          console.log('Conversation details loading in background, but message input is ready');
        }
        setLoadingNewConversation(false);
      });
    };

    handleConversationParam();
  }, [conversationParam, user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();

      // Subscribe to new messages and reactions
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
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hubook_message_reactions'
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

  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;

    const { data: participantData } = await supabase
      .from('conversation_participants')
      .select('conversation_id, is_favorite, is_hidden, conversations!conversation_participants_conversation_id_fkey(*)')
      .eq('user_id', user.id)
      .order('is_favorite', { ascending: false })
      .order('joined_at', { ascending: false });

    if (participantData) {
      const convs = participantData.map((p: any) => p.conversations);
      setConversations(convs);

      // Store conversation settings
      const settingsMap = new Map();
      participantData.forEach((p: any) => {
        settingsMap.set(p.conversation_id, {
          isFavorite: p.is_favorite || false,
          isHidden: p.is_hidden || false
        });
      });
      setConversationSettings(settingsMap);

      // Load participants for each conversation
      const participantsMap = new Map();
      for (const conv of convs) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id, user_profiles!conversation_participants_user_id_fkey(id, hubook_profiles(*))')
          .eq('conversation_id', (conv as any).id);

        if (participants) {
          const transformedParticipants = participants
            .filter((p: any) => p.user_id !== user.id)
            .map((p: any) => ({
              user_id: p.user_id,
              hubook_profiles: p.user_profiles?.hubook_profiles || null
            }));
          participantsMap.set((conv as any).id, transformedParticipants);
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
      .select('*')
      .eq('conversation_id', selectedConversation)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', selectedConversation)
        .neq('sender_id', user?.id);

      loadMessageReactions(data.map(m => m.id));
    }
  };

  const loadMessageReactions = async (messageIds: string[]) => {
    if (messageIds.length === 0 || !user) return;

    const { data: reactions } = await supabase
      .from('hubook_message_reactions')
      .select('*')
      .in('message_id', messageIds);

    if (reactions) {
      const reactionsMap = new Map();
      const userReactionsMap = new Map();

      reactions.forEach((reaction: any) => {
        if (!reactionsMap.has(reaction.message_id)) {
          reactionsMap.set(reaction.message_id, []);
        }
        reactionsMap.get(reaction.message_id).push(reaction);

        if (reaction.user_id === user.id) {
          userReactionsMap.set(reaction.message_id, reaction.emoji);
        }
      });

      setMessageReactions(reactionsMap);
      setUserReactions(userReactionsMap);
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

  const handleToggleFavorite = async (conversationId: string) => {
    if (!user) return;

    const settings = conversationSettings.get(conversationId);
    const newFavoriteStatus = !settings?.isFavorite;

    await supabase
      .from('conversation_participants')
      .update({ is_favorite: newFavoriteStatus })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    setConversationSettings(prev => {
      const newMap = new Map(prev);
      newMap.set(conversationId, {
        ...settings,
        isFavorite: newFavoriteStatus
      } as any);
      return newMap;
    });

    loadConversations();
  };

  const handleToggleHidden = async (conversationId: string) => {
    if (!user) return;

    const settings = conversationSettings.get(conversationId);
    const newHiddenStatus = !settings?.isHidden;

    await supabase
      .from('conversation_participants')
      .update({
        is_hidden: newHiddenStatus,
        hidden_at: newHiddenStatus ? new Date().toISOString() : null
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    setConversationSettings(prev => {
      const newMap = new Map(prev);
      newMap.set(conversationId, {
        ...settings,
        isHidden: newHiddenStatus
      } as any);
      return newMap;
    });

    loadConversations();
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!user) return;

    await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    setConversations(prev => prev.filter(c => c.id !== conversationId));

    if (selectedConversation === conversationId) {
      setSelectedConversation(null);
      navigate('/hubook/messages');
    }
  };

  const getReactionCounts = (messageId: string) => {
    const reactions = messageReactions.get(messageId) || [];
    const counts: Record<string, number> = {};

    reactions.forEach((reaction: any) => {
      counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
    });

    return counts;
  };

  if (loading || loadingNewConversation) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">
          {loadingNewConversation ? 'Loading your conversation...' : 'Loading messages...'}
        </div>
      </div>
    );
  }

  const filteredConversations = conversations.filter(conv => {
    const settings = conversationSettings.get(conv.id);
    if (conversationFilter === 'favorites') return settings?.isFavorite;
    if (conversationFilter === 'hidden') return settings?.isHidden;
    return !settings?.isHidden;
  });

  return (
    <>
      <DeleteConversationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setConversationToDelete(null);
        }}
        onConfirm={() => {
          if (conversationToDelete) {
            handleDeleteConversation(conversationToDelete);
          }
        }}
        otherParticipantName={
          conversationToDelete
            ? conversationParticipants.get(conversationToDelete)?.[0]?.hubook_profiles?.display_name
            : undefined
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
        <div className="md:col-span-1 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <SearchWithHistory
              platform="hubook_messages"
              onSearch={(query) => {
                console.log('Searching messages for:', query);
              }}
              placeholder="Search messages"
              variant="platform"
              inputClassName="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />

            <div className="flex gap-1 mt-3">
              <button
                onClick={() => setConversationFilter('all')}
                className={`flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                  conversationFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setConversationFilter('favorites')}
                className={`flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  conversationFilter === 'favorites'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Star className="w-3 h-3" />
                Fav
              </button>
              <button
                onClick={() => setConversationFilter('hidden')}
                className={`flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                  conversationFilter === 'hidden'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Hidden
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                <p>
                  {conversationFilter === 'favorites'
                    ? 'No favorite conversations'
                    : conversationFilter === 'hidden'
                    ? 'No hidden conversations'
                    : 'No conversations yet'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const participants = conversationParticipants.get(conv.id) || [];
                const otherUser = participants[0]?.hubook_profiles;
                const settings = conversationSettings.get(conv.id);

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                      selectedConversation === conv.id ? 'bg-blue-50' : ''
                    } ${settings?.isFavorite ? 'border-l-4 border-l-yellow-400' : ''}`}
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
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {otherUser?.display_name || 'Conversation'}
                        {settings?.isFavorite && (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        )}
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
              {(() => {
                const participants = conversationParticipants.get(selectedConversation) || [];
                const otherUser = participants[0]?.hubook_profiles || recipientProfile;
                const settings = conversationSettings.get(selectedConversation);

                if (!otherUser) {
                  return (
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex items-center gap-3">
                    <Link to={`/hubook/user/${otherUser.id}`} className="flex-shrink-0">
                      {otherUser.profile_photo_url ? (
                        <img
                          src={otherUser.profile_photo_url}
                          alt={otherUser.display_name}
                          className="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold hover:opacity-80 transition-opacity">
                          {otherUser.display_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/hubook/user/${otherUser.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 transition-colors block"
                      >
                        {otherUser.display_name}
                      </Link>
                      {otherUser.work && (
                        <p className="text-sm text-gray-600 truncate">{otherUser.work}</p>
                      )}
                    </div>
                    <ConversationOptionsMenu
                      conversationId={selectedConversation}
                      isFavorite={settings?.isFavorite || false}
                      isHidden={settings?.isHidden || false}
                      onToggleFavorite={() => handleToggleFavorite(selectedConversation)}
                      onToggleHidden={() => handleToggleHidden(selectedConversation)}
                      onDelete={() => {
                        setConversationToDelete(selectedConversation);
                        setDeleteModalOpen(true);
                      }}
                    />
                  </div>
                );
              })()}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                const reactionCounts = getReactionCounts(message.id);
                const hasReactions = Object.keys(reactionCounts).length > 0;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    onMouseEnter={() => setHoveredMessage(message.id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    <div className="flex flex-col gap-1 max-w-xs">
                      <div className="flex items-end gap-2">
                        {!isOwn && hoveredMessage === message.id && (
                          <MessageReactionPicker
                            messageId={message.id}
                            userReaction={userReactions.get(message.id)}
                            onReactionChange={() => loadMessages()}
                          />
                        )}
                        <div
                          className={`${
                            isOwn ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'
                          } rounded-2xl px-4 py-2 break-words`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-600'}`}>
                            {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        {isOwn && hoveredMessage === message.id && (
                          <MessageReactionPicker
                            messageId={message.id}
                            userReaction={userReactions.get(message.id)}
                            onReactionChange={() => loadMessages()}
                          />
                        )}
                      </div>

                      {hasReactions && (
                        <div className={`flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(reactionCounts).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => {}}
                              className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                                userReactions.get(message.id) === emoji
                                  ? 'bg-blue-100 border border-blue-300'
                                  : 'bg-gray-100 border border-gray-300'
                              }`}
                              title={`${count} reaction${count > 1 ? 's' : ''}`}
                            >
                              <span>{emoji}</span>
                              <span className="text-gray-700">{count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
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
    </>
  );
}
