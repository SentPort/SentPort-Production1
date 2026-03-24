import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, Scissors, Info, Film, AlertCircle, Bold, Italic } from 'lucide-react';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformBackButton from '../../components/shared/PlatformBackButton';
import PlatformGuard from '../../components/shared/PlatformGuard';
import { parsePageBreaks, PAGE_BREAK_MARKER } from '../../lib/blogPaginationHelpers';
import ScreenplayEditor from '../../components/blog/ScreenplayEditor';
import ScreenplayInspirationSelector from '../../components/blog/ScreenplayInspirationSelector';
import { insertFormatting } from '../../lib/blogFormatting';

export default function CreatePost() {
  return (
    <PlatformGuard platform="blog">
      <CreatePostContent />
    </PlatformGuard>
  );
}

interface SelectedInspiration {
  post: {
    id: string;
    title: string;
    excerpt: string;
    account: {
      username: string;
      display_name: string;
      avatar_url: string;
    };
  };
  note: string;
}

function CreatePostContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [availableInterests, setAvailableInterests] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    privacy: 'public',
    status: 'published',
    autoPaginate: false
  });
  const [error, setError] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [screenplayInspirations, setScreenplayInspirations] = useState<SelectedInspiration[]>([]);
  const [screenplayMode, setScreenplayMode] = useState(false);
  const [showScreenplayWarning, setShowScreenplayWarning] = useState(false);

  const isScreenplay = screenplayMode || interests.includes('Screenplays');

  useEffect(() => {
    loadInterests();
  }, []);

  const loadInterests = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_interests')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableInterests(data || []);
    } catch (err) {
      console.error('Error loading interests:', err);
    }
  };

  const toggleInterest = (interestName: string) => {
    if (interestName === 'Screenplays') {
      const isCurrentlySelected = interests.includes('Screenplays');
      if (!isCurrentlySelected) {
        setScreenplayMode(true);
      } else {
        if (formData.content.trim().length > 0 && screenplayMode) {
          setShowScreenplayWarning(true);
          return;
        }
        setScreenplayMode(false);
      }
    }

    setInterests(prev =>
      prev.includes(interestName)
        ? prev.filter(i => i !== interestName)
        : [...prev, interestName]
    );
  };

  const toggleScreenplayMode = () => {
    if (screenplayMode && formData.content.trim().length > 0) {
      setShowScreenplayWarning(true);
      return;
    }

    const newMode = !screenplayMode;
    setScreenplayMode(newMode);

    if (newMode) {
      if (!interests.includes('Screenplays')) {
        setInterests(prev => [...prev, 'Screenplays']);
      }
    }
  };

  const confirmDisableScreenplayMode = () => {
    setScreenplayMode(false);
    setInterests(prev => prev.filter(i => i !== 'Screenplays'));
    setShowScreenplayWarning(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      return;
    }

    if (interests.length === 0) {
      setError('Please select at least one interest category');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const pageBreaks = parsePageBreaks(formData.content);

      const { data: post, error: postError } = await supabase
        .from('blog_posts')
        .insert({
          account_id: user.id,
          title: formData.title,
          content: formData.content,
          privacy: formData.privacy,
          status: formData.status,
          page_breaks: pageBreaks,
          auto_paginate: formData.autoPaginate,
          is_screenplay: isScreenplay
        })
        .select()
        .single();

      if (postError) throw postError;

      const interestIds = availableInterests
        .filter(i => interests.includes(i.name))
        .map(i => i.id);

      const { error: interestsError } = await supabase
        .from('blog_post_interests')
        .insert(
          interestIds.map(interestId => ({
            post_id: post.id,
            interest_id: interestId
          }))
        );

      if (interestsError) throw interestsError;

      if (isScreenplay && screenplayInspirations.length > 0) {
        const { error: inspirationsError } = await supabase
          .from('blog_post_screenplay_inspirations')
          .insert(
            screenplayInspirations.map(inspiration => ({
              screenplay_post_id: post.id,
              inspired_by_post_id: inspiration.post.id,
              attribution_note: inspiration.note || null
            }))
          );

        if (inspirationsError) {
          console.error('Error saving screenplay inspirations:', inspirationsError);
        }
      }

      navigate('/blog/my-posts');
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleInsertPageBreak = () => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = formData.content.substring(0, start);
    const after = formData.content.substring(end);

    const newContent = before + '\n\n' + PAGE_BREAK_MARKER + '\n\n' + after;
    setFormData({ ...formData, content: newContent });

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + PAGE_BREAK_MARKER.length + 4;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleFormat = (formatType: 'bold' | 'italic') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const { newText, newCursorStart, newCursorEnd } = insertFormatting(
      formData.content,
      start,
      end,
      formatType
    );

    setFormData({ ...formData, content: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };

  const pageBreaksCount = parsePageBreaks(formData.content).length;
  const wordCount = formData.content.trim().split(/\s+/).length;

  return (
    <BlogLayout showCreateButton={false}>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-12 px-4 relative overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-slate-600/20 rounded-full blur-3xl"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="mb-6">
            <PlatformBackButton fallbackPath="/blog" />
          </div>

        <div className="bg-slate-800/70 backdrop-blur-md rounded-lg shadow-lg border border-slate-600/50 p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Write a New Post</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter your post title..."
                required
              />
            </div>

            <div className="bg-gradient-to-r from-slate-700/50 to-slate-700/30 border-2 border-slate-600/50 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Film className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium flex items-center gap-2">
                      Is this a screenplay?
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Enable professional screenplay formatting tools
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleScreenplayMode}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                    screenplayMode
                      ? 'bg-emerald-500'
                      : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                      screenplayMode ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {screenplayMode && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-emerald-300">
                      <p className="font-medium mb-1">Screenplay mode enabled</p>
                      <p>Use the formatting buttons below to structure your script professionally with scene headings, character names, dialogue, action lines, and transitions.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showScreenplayWarning && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-600">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Disable Screenplay Mode?
                      </h3>
                      <p className="text-sm text-gray-300">
                        You have content written in screenplay format. Disabling screenplay mode may cause formatting to be lost when you switch back to the regular editor.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowScreenplayWarning(false)}
                      className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDisableScreenplayMode}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isScreenplay ? (
              <ScreenplayEditor
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
              />
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Content *
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">
                      {wordCount} words
                      {pageBreaksCount > 0 && ` • ${pageBreaksCount + 1} pages`}
                    </span>
                    <button
                      type="button"
                      onClick={handleInsertPageBreak}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      title="Insert page break at cursor position"
                    >
                      <Scissors className="w-3 h-3" />
                      Insert Page Break
                    </button>
                  </div>
                </div>
                <div className="mb-2 flex items-center gap-2 p-2 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <span className="text-xs text-gray-400 font-medium">Format:</span>
                  <button
                    type="button"
                    onClick={() => handleFormat('bold')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-slate-600/50 hover:bg-slate-600 rounded transition-colors"
                    title="Bold (wrap with **text**)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                    Bold
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormat('italic')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-slate-600/50 hover:bg-slate-600 rounded transition-colors"
                    title="Italic (wrap with *text*)"
                  >
                    <Italic className="w-3.5 h-3.5" />
                    Italic
                  </button>
                  <span className="text-xs text-gray-500 ml-2">
                    Select text and click a button, or use **bold** and *italic* syntax
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
                  rows={16}
                  placeholder="Write your post content..."
                  required
                />
                <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-300">
                      <p className="font-medium mb-1">Page Breaks</p>
                      <p>Insert {PAGE_BREAK_MARKER} to split your post into multiple pages. Readers can navigate between pages, and reading stats will track progress across all pages.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Categories * (select at least one)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableInterests.map((interest) => {
                  const isScreenplayCategory = interest.name === 'Screenplays';
                  const isSelected = interests.includes(interest.name);
                  const isLocked = isScreenplayCategory && screenplayMode;

                  return (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => toggleInterest(interest.name)}
                      disabled={isLocked}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500'
                      } ${isLocked ? 'opacity-75 cursor-not-allowed' : ''}`}
                      title={isLocked ? 'Required for screenplay mode - disable screenplay mode to remove' : ''}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        )}
                        <span className="font-medium text-sm">{interest.name}</span>
                        {isLocked && (
                          <Film className="w-4 h-4 text-emerald-400 ml-auto flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {isScreenplay && (
              <ScreenplayInspirationSelector
                selectedInspirations={screenplayInspirations}
                onInspirationsChange={setScreenplayInspirations}
              />
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Privacy
                </label>
                <select
                  value={formData.privacy}
                  onChange={(e) => setFormData({ ...formData, privacy: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Auto-Paginate
                </label>
                <select
                  value={formData.autoPaginate ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, autoPaginate: e.target.value === 'true' })}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  title="Enable auto-pagination for posts over 5,000 words"
                >
                  <option value="false">No</option>
                  <option value="true">Yes (5000+ words)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || interests.length === 0}
              className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg hover:shadow-emerald-500/50"
            >
              {loading ? 'Publishing...' : 'Publish Post'}
            </button>
          </form>
        </div>
        </div>
      </div>
    </BlogLayout>
  );
}
