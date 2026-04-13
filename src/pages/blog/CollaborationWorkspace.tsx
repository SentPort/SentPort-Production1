import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Save,
  Eye,
  Send,
  X,
  Check,
  MoreVertical,
  Rocket,
  Image as ImageIcon
} from 'lucide-react';
import PlatformGuard from '../../components/shared/PlatformGuard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';

export default function CollaborationWorkspace() {
  return (
    <PlatformGuard platform="blog">
      <CollaborationWorkspaceContent />
    </PlatformGuard>
  );
}

interface CollaborationMember {
  id: string;
  user_id: string;
  role: string;
  user_profile: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface ChatMessage {
  id: string;
  sender_id: string;
  message_content: string;
  message_type: string;
  created_at: string;
  sender: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface ActiveEditor {
  user_id: string;
  is_typing: boolean;
  last_active_at: string;
  cursor_position: {
    line: number;
    column: number;
  };
  user_profile: {
    display_name: string;
    avatar_url: string | null;
  };
}

const EDITOR_COLORS = [
  'from-purple-400 to-pink-400',
  'from-blue-400 to-cyan-400',
  'from-green-400 to-emerald-400',
  'from-orange-400 to-yellow-400',
  'from-red-400 to-rose-400',
];

function CollaborationWorkspaceContent() {
  const { collaborationId } = useParams();
  const { user } = useAuth();

  const [collaboration, setCollaboration] = useState<any>(null);
  const [members, setMembers] = useState<CollaborationMember[]>([]);
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>([]);
  const [content, setContent] = useState('');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showChat, setShowChat] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishExcerpt, setPublishExcerpt] = useState('');
  const [publishTags, setPublishTags] = useState<string[]>([]);
  const [publishCoverImage, setPublishCoverImage] = useState('');
  const [tagInput, setTagInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && collaborationId) {
      loadCollaboration();
      loadMembers();
      loadWorkspaceContent();
      loadChatMessages();
      updateEditorPresence();
    }

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      removeEditorPresence();
    };
  }, [user, collaborationId]);

  useEffect(() => {
    if (collaborationId) {
      // Subscribe to chat messages
      const chatChannel = supabase
        .channel(`collaboration-chat-${collaborationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'blog_collaboration_workspace_messages',
            filter: `collaboration_id=eq.${collaborationId}`,
          },
          () => {
            loadChatMessages();
          }
        )
        .subscribe();

      // Subscribe to active editors
      const editorsChannel = supabase
        .channel(`collaboration-editors-${collaborationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'blog_collaboration_active_editors',
            filter: `collaboration_id=eq.${collaborationId}`,
          },
          () => {
            loadActiveEditors();
          }
        )
        .subscribe();

      // Subscribe to content updates
      const contentChannel = supabase
        .channel(`collaboration-content-${collaborationId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'blog_collaboration_workspace_content',
            filter: `collaboration_id=eq.${collaborationId}`,
          },
          (payload) => {
            // Only update if edited by someone else
            if (payload.new.last_edited_by !== user?.id) {
              loadWorkspaceContent();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(chatChannel);
        supabase.removeChannel(editorsChannel);
        supabase.removeChannel(contentChannel);
      };
    }
  }, [collaborationId, user]);

  useEffect(() => {
    scrollChatToBottom();
  }, [chatMessages]);

  // Auto-save content
  useEffect(() => {
    if (content && documentId) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        saveContent();
      }, 3000);
    }
  }, [content]);

  const loadCollaboration = async () => {
    if (!collaborationId) return;

    try {
      const { data } = await supabase
        .from('blog_collaborations')
        .select('*')
        .eq('id', collaborationId)
        .single();

      if (data) {
        setCollaboration(data);
        if (data.title) {
          setPublishTitle(data.title);
        }
        if (data.description) {
          setPublishExcerpt(data.description);
        }
      }
    } catch (error) {
      console.error('Error loading collaboration:', error);
    }
  };

  const loadMembers = async () => {
    if (!collaborationId) return;

    try {
      const { data } = await supabase
        .from('blog_collaboration_members')
        .select(`
          *,
          user_profile:user_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('collaboration_id', collaborationId)
        .in('status', ['active', 'accepted']);

      if (data) {
        setMembers(data);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadActiveEditors = async () => {
    if (!collaborationId || !user) return;

    try {
      const { data } = await supabase
        .from('blog_collaboration_active_editors')
        .select(`
          user_id,
          is_typing,
          last_active_at,
          cursor_position,
          user_profile:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('collaboration_id', collaborationId)
        .neq('user_id', user.id)
        .gte('last_active_at', new Date(Date.now() - 2 * 60 * 1000).toISOString());

      if (data) {
        setActiveEditors(data);
      }
    } catch (error) {
      console.error('Error loading active editors:', error);
    }
  };

  const loadWorkspaceContent = async () => {
    if (!collaborationId) return;

    try {
      const { data } = await supabase
        .from('blog_collaboration_workspace_content')
        .select('*')
        .eq('collaboration_id', collaborationId)
        .single();

      if (data) {
        setDocumentId(data.id);
        if (data.content && data.content.text) {
          setContent(data.content.text);
        }
        if (data.last_edited_at) {
          setLastSaved(new Date(data.last_edited_at));
        }
      }
    } catch (error) {
      console.error('Error loading workspace content:', error);
    }
  };

  const loadChatMessages = async () => {
    if (!collaborationId) return;

    try {
      const { data } = await supabase
        .from('blog_collaboration_workspace_messages')
        .select(`
          *,
          sender:sender_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('collaboration_id', collaborationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) {
        setChatMessages(data);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const saveContent = async () => {
    if (!documentId || !user || !collaborationId) return;

    setIsSaving(true);
    try {
      await supabase
        .from('blog_collaboration_workspace_content')
        .update({
          content: { text: content },
          last_edited_by: user.id,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving content:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditorPresence = async (cursorPos?: { line: number; column: number }) => {
    if (!user || !collaborationId) return;

    try {
      const updateData: any = {
        collaboration_id: collaborationId,
        user_id: user.id,
        is_typing: isTyping,
        last_active_at: new Date().toISOString(),
      };

      if (cursorPos) {
        updateData.cursor_position = cursorPos;
      }

      await supabase
        .from('blog_collaboration_active_editors')
        .upsert(updateData);
    } catch (error) {
      console.error('Error updating editor presence:', error);
    }
  };

  const removeEditorPresence = async () => {
    if (!user || !collaborationId) return;

    try {
      await supabase
        .from('blog_collaboration_active_editors')
        .delete()
        .eq('collaboration_id', collaborationId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error removing editor presence:', error);
    }
  };

  const getCursorPosition = (textarea: HTMLTextAreaElement) => {
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;
    return { line, column };
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Get cursor position
    const cursorPos = getCursorPosition(e.target);

    // Update typing status and cursor position
    if (!isTyping) {
      setIsTyping(true);
      updateEditorPresence(cursorPos);
    } else {
      updateEditorPresence(cursorPos);
    }

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      updateEditorPresence(cursorPos);
    }, 1000);
  };

  const handleCursorMove = (e: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!editorRef.current) return;
    const cursorPos = getCursorPosition(editorRef.current);
    updateEditorPresence(cursorPos);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !collaborationId) return;

    try {
      await supabase
        .from('blog_collaboration_workspace_messages')
        .insert({
          collaboration_id: collaborationId,
          sender_id: user.id,
          message_content: newMessage.trim(),
          message_type: 'text',
        });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollChatToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getMemberColor = (index: number) => {
    return EDITOR_COLORS[index % EDITOR_COLORS.length];
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !publishTags.includes(tagInput.trim())) {
      setPublishTags([...publishTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setPublishTags(publishTags.filter((t) => t !== tag));
  };

  const handlePublish = async () => {
    if (!publishTitle.trim() || !publishExcerpt.trim()) {
      alert('Please provide a title and excerpt');
      return;
    }

    if (!content.trim()) {
      alert('Cannot publish empty content');
      return;
    }

    setPublishing(true);
    try {
      const { data: postId, error } = await supabase.rpc('publish_collaboration_to_blog', {
        p_collaboration_id: collaborationId,
        p_title: publishTitle.trim(),
        p_excerpt: publishExcerpt.trim(),
        p_tags: publishTags,
        p_cover_image_url: publishCoverImage || null,
      });

      if (error) throw error;

      setShowPublishModal(false);
      loadCollaboration();
    } catch (error: any) {
      console.error('Error publishing:', error);
      alert(error.message || 'Failed to publish. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  if (!collaboration) {
    return (
      <BlogLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </BlogLayout>
    );
  }

  return (
    <BlogLayout>
      <div className="h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="bg-slate-800/70 backdrop-blur-md border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/blog/collaborations"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">{collaboration.title}</h1>
                <p className="text-sm text-gray-400">
                  {isSaving ? (
                    <span className="flex items-center gap-1">
                      <Save className="w-3 h-3 animate-pulse" />
                      Saving...
                    </span>
                  ) : lastSaved ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Saved {lastSaved.toLocaleTimeString()}
                    </span>
                  ) : (
                    'Untitled document'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Active collaborators */}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <div className="flex -space-x-2">
                  {members.slice(0, 5).map((member, index) => (
                    <div
                      key={member.id}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${getMemberColor(
                        index
                      )} flex items-center justify-center text-white text-xs font-semibold border-2 border-slate-800`}
                      title={member.user_profile.display_name}
                    >
                      {member.user_profile.avatar_url ? (
                        <img
                          src={member.user_profile.avatar_url}
                          alt={member.user_profile.display_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        member.user_profile.display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                  ))}
                  {members.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-semibold border-2 border-slate-800">
                      +{members.length - 5}
                    </div>
                  )}
                </div>
              </div>

              {collaboration?.status !== 'published' && (
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all"
                >
                  <Rocket className="w-4 h-4" />
                  Publish
                </button>
              )}

              <button
                onClick={() => setShowChat(!showChat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  showChat
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
            </div>
          </div>

          {/* Active editors indicator */}
          {activeEditors.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
              {activeEditors.map((editor, index) => (
                <span key={editor.user_id} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full animate-pulse bg-gradient-to-br ${getMemberColor(index).split(' ')[0].replace('from-', 'bg-')}`}></div>
                  {editor.user_profile.display_name}
                  {editor.is_typing && ' is typing...'}
                  {editor.cursor_position && (
                    <span className="text-xs text-gray-500">
                      (Line {editor.cursor_position.line + 1}, Col {editor.cursor_position.column + 1})
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Published banner */}
        {collaboration?.status === 'published' && collaboration?.published_post_id && (
          <div className="bg-green-500/20 border-b border-green-500/30 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-green-400 font-semibold">This collaboration has been published!</p>
                  <p className="text-sm text-gray-400">The workspace is now in archive mode</p>
                </div>
              </div>
              <Link
                to={`/blog/post/${collaboration.published_post_id}`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
              >
                View Published Post
              </Link>
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleContentChange}
              onClick={handleCursorMove}
              onKeyUp={handleCursorMove}
              placeholder="Start writing your collaborative blog post..."
              className="w-full h-full px-8 py-6 bg-transparent text-white resize-none focus:outline-none text-lg leading-relaxed"
              disabled={collaboration?.status === 'published'}
            />
          </div>

          {/* Chat sidebar */}
          {showChat && (
            <div className="w-96 bg-slate-800/50 border-l border-slate-700 flex flex-col">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Team Chat
                </h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((message) => {
                  const isMe = message.sender_id === user?.id;
                  const isSystem = message.message_type === 'system';

                  if (isSystem) {
                    return (
                      <div key={message.id} className="text-center">
                        <p className="text-xs text-gray-500 italic">{message.message_content}</p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {message.sender?.avatar_url ? (
                          <img
                            src={message.sender.avatar_url}
                            alt={message.sender.display_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          message.sender?.display_name?.charAt(0).toUpperCase() || '?'
                        )}
                      </div>
                      <div className={`flex-1 ${isMe ? 'text-right' : ''}`}>
                        <p className="text-xs text-gray-500 mb-1">
                          {message.sender?.display_name || 'Unknown'}
                        </p>
                        <div
                          className={`inline-block px-3 py-2 rounded-lg ${
                            isMe
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-700 text-gray-200'
                          }`}
                        >
                          <p className="text-sm">{message.message_content}</p>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Publish Modal */}
        {showPublishModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Publish Collaboration</h2>
                  <p className="text-sm text-gray-400">Share your collaborative work with the world</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Post Title *
                  </label>
                  <input
                    type="text"
                    value={publishTitle}
                    onChange={(e) => setPublishTitle(e.target.value)}
                    placeholder="Enter a compelling title"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Excerpt *
                  </label>
                  <textarea
                    value={publishExcerpt}
                    onChange={(e) => setPublishExcerpt(e.target.value)}
                    placeholder="A brief summary that appears in feeds"
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add a tag and press Enter"
                      className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all"
                    >
                      Add
                    </button>
                  </div>
                  {publishTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {publishTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm border border-green-500/30"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-green-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cover Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={publishCoverImage}
                      onChange={(e) => setPublishCoverImage(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400"
                    />
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  {publishCoverImage && (
                    <img
                      src={publishCoverImage}
                      alt="Cover preview"
                      className="mt-2 w-full h-32 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-semibold text-white mb-2">Publishing Details</h3>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• All collaboration members will be credited as co-authors</li>
                      <li>• The post will be published to the initiator's blog</li>
                      <li>• Members will receive a notification when published</li>
                      <li>• The workspace will become read-only after publishing</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPublishModal(false)}
                  disabled={publishing}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishing || !publishTitle.trim() || !publishExcerpt.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BlogLayout>
  );
}
