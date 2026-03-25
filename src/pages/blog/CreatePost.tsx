import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, Info, Film, AlertCircle, Save, Clock } from 'lucide-react';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformBackButton from '../../components/shared/PlatformBackButton';
import PlatformGuard from '../../components/shared/PlatformGuard';
import { parsePageBreaks } from '../../lib/blogPaginationHelpers';
import ScreenplayEditor from '../../components/blog/ScreenplayEditor';
import ScreenplayInspirationSelector from '../../components/blog/ScreenplayInspirationSelector';
import RichTextEditor from '../../components/blog/RichTextEditor';
import { getWordCount, parsePageBreaksFromHtml, sanitizeHtml } from '../../lib/htmlHelpers';

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
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');

  const [loading, setLoading] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [availableInterests, setAvailableInterests] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    privacy: 'public',
    autoPaginate: false
  });
  const [error, setError] = useState('');
  const [screenplayInspirations, setScreenplayInspirations] = useState<SelectedInspiration[]>([]);
  const [screenplayMode, setScreenplayMode] = useState(false);
  const [showScreenplayWarning, setShowScreenplayWarning] = useState(false);

  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [daysUntilExpiration, setDaysUntilExpiration] = useState<number | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  const isScreenplay = screenplayMode || interests.includes('Screenplays');

  useEffect(() => {
    loadInterests();
    if (draftId) {
      loadDraft(draftId);
    }
  }, []);

  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if ((formData.title.trim() || formData.content.trim()) && !loading) {
      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave();
      }, 30000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData.title, formData.content, interests, screenplayMode]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((formData.title.trim() || formData.content.trim()) && autoSaveStatus !== 'saving') {
        handleAutoSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, interests, screenplayMode, autoSaveStatus]);

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

  const loadDraft = async (draftIdToLoad: string) => {
    try {
      // First, load the basic draft data with interests
      const { data: draft, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          interests:blog_post_interests(
            interest:blog_interests(*)
          )
        `)
        .eq('id', draftIdToLoad)
        .eq('is_draft', true)
        .maybeSingle();

      if (error) throw error;
      if (!draft) {
        setError('Draft not found or has been published');
        return;
      }

      setFormData({
        title: draft.title || '',
        content: draft.content || '',
        privacy: draft.privacy || 'public',
        autoPaginate: draft.auto_paginate || false
      });

      const interestNames = draft.interests?.map((item: any) => item.interest.name) || [];
      setInterests(interestNames);

      setScreenplayMode(draft.is_screenplay || false);

      // Separately load screenplay inspirations if this is a screenplay
      if (draft.is_screenplay) {
        try {
          const { data: inspirationsData, error: inspirationsError } = await supabase
            .from('blog_post_screenplay_inspirations')
            .select(`
              inspired_by_post_id,
              attribution_note,
              inspired_by_post:blog_posts!inspired_by_post_id(
                id,
                title,
                excerpt,
                account:blog_accounts!account_id(
                  username,
                  display_name,
                  avatar_url
                )
              )
            `)
            .eq('screenplay_post_id', draftIdToLoad);

          if (inspirationsError) throw inspirationsError;

          if (inspirationsData && inspirationsData.length > 0) {
            const mappedInspirations = inspirationsData.map((insp: any) => ({
              post: {
                id: insp.inspired_by_post.id,
                title: insp.inspired_by_post.title,
                excerpt: insp.inspired_by_post.excerpt,
                account: insp.inspired_by_post.account
              },
              note: insp.attribution_note || ''
            }));
            setScreenplayInspirations(mappedInspirations);
          }
        } catch (inspError) {
          console.error('Error loading screenplay inspirations:', inspError);
          // Continue loading the draft even if inspirations fail
        }
      }

      setLastSavedAt(new Date(draft.draft_updated_at));

      if (draft.expires_at) {
        const daysLeft = Math.ceil((new Date(draft.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        setDaysUntilExpiration(daysLeft);
      }
    } catch (err) {
      console.error('Error loading draft:', err);
      setError('Failed to load draft');
    }
  };

  const checkDraftLimit = async () => {
    if (!user) return true;

    const { data, error } = await supabase
      .from('blog_posts')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', user.id)
      .eq('is_draft', true);

    if (error) {
      console.error('Error checking draft limit:', error);
      return true;
    }

    return (data || 0) < 10;
  };

  const handleAutoSave = useCallback(async () => {
    if (!user || !formData.title.trim() || !formData.content.trim()) return;
    if (autoSaveStatus === 'saving') return;

    setAutoSaveStatus('saving');

    try {
      const sanitizedContent = sanitizeHtml(formData.content);
      const pageBreaks = isScreenplay
        ? parsePageBreaks(formData.content)
        : parsePageBreaksFromHtml(sanitizedContent);

      if (currentDraftId) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            title: formData.title,
            content: sanitizedContent,
            privacy: formData.privacy,
            auto_paginate: formData.autoPaginate,
            page_breaks: pageBreaks,
            is_screenplay: isScreenplay
          })
          .eq('id', currentDraftId);

        if (updateError) throw updateError;
      } else {
        const canCreate = await checkDraftLimit();
        if (!canCreate) {
          setAutoSaveStatus('error');
          setError('Draft limit reached (10 drafts max). Please delete old drafts before creating new ones.');
          return;
        }

        const { data: newDraft, error: insertError } = await supabase
          .from('blog_posts')
          .insert({
            account_id: user.id,
            title: formData.title,
            content: sanitizedContent,
            privacy: formData.privacy,
            status: 'draft',
            is_draft: true,
            page_breaks: pageBreaks,
            auto_paginate: formData.autoPaginate,
            is_screenplay: isScreenplay
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setCurrentDraftId(newDraft.id);

        const interestIds = availableInterests
          .filter(i => interests.includes(i.name))
          .map(i => i.id);

        if (interestIds.length > 0) {
          await supabase
            .from('blog_post_interests')
            .insert(
              interestIds.map(interestId => ({
                post_id: newDraft.id,
                interest_id: interestId
              }))
            );
        }

        if (isScreenplay && screenplayInspirations.length > 0) {
          await supabase
            .from('blog_post_screenplay_inspirations')
            .insert(
              screenplayInspirations.map(inspiration => ({
                screenplay_post_id: newDraft.id,
                inspired_by_post_id: inspiration.post.id,
                attribution_note: inspiration.note || null
              }))
            );
        }
      }

      if (currentDraftId && interests.length > 0) {
        await supabase
          .from('blog_post_interests')
          .delete()
          .eq('post_id', currentDraftId);

        const interestIds = availableInterests
          .filter(i => interests.includes(i.name))
          .map(i => i.id);

        if (interestIds.length > 0) {
          await supabase
            .from('blog_post_interests')
            .insert(
              interestIds.map(interestId => ({
                post_id: currentDraftId,
                interest_id: interestId
              }))
            );
        }
      }

      setAutoSaveStatus('saved');
      setLastSavedAt(new Date());
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error auto-saving draft:', err);
      setAutoSaveStatus('error');
    }
  }, [user, formData, interests, screenplayMode, currentDraftId, availableInterests, screenplayInspirations]);

  const handleSaveAsDraft = async () => {
    if (!user) return;

    if (interests.length === 0) {
      setError('Please select at least one interest category');
      return;
    }

    setSavingDraft(true);
    setError('');

    try {
      await handleAutoSave();
      navigate('/blog/drafts');
    } catch (err: any) {
      console.error('Error saving draft:', err);
      setError(err.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
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
      const sanitizedContent = sanitizeHtml(formData.content);
      const pageBreaks = isScreenplay
        ? parsePageBreaks(formData.content)
        : parsePageBreaksFromHtml(sanitizedContent);

      if (currentDraftId) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            title: formData.title,
            content: sanitizedContent,
            privacy: formData.privacy,
            status: 'published',
            is_draft: false,
            published_at: new Date().toISOString(),
            page_breaks: pageBreaks,
            auto_paginate: formData.autoPaginate,
            is_screenplay: isScreenplay
          })
          .eq('id', currentDraftId);

        if (updateError) throw updateError;

        await supabase
          .from('blog_post_interests')
          .delete()
          .eq('post_id', currentDraftId);

        const interestIds = availableInterests
          .filter(i => interests.includes(i.name))
          .map(i => i.id);

        const { error: interestsError } = await supabase
          .from('blog_post_interests')
          .insert(
            interestIds.map(interestId => ({
              post_id: currentDraftId,
              interest_id: interestId
            }))
          );

        if (interestsError) throw interestsError;

        if (isScreenplay) {
          await supabase
            .from('blog_post_screenplay_inspirations')
            .delete()
            .eq('screenplay_post_id', currentDraftId);

          if (screenplayInspirations.length > 0) {
            await supabase
              .from('blog_post_screenplay_inspirations')
              .insert(
                screenplayInspirations.map(inspiration => ({
                  screenplay_post_id: currentDraftId,
                  inspired_by_post_id: inspiration.post.id,
                  attribution_note: inspiration.note || null
                }))
              );
          }
        }

        navigate(`/blog/post/${currentDraftId}`);
      } else {
        const { data: post, error: postError } = await supabase
          .from('blog_posts')
          .insert({
            account_id: user.id,
            title: formData.title,
            content: sanitizedContent,
            privacy: formData.privacy,
            status: 'published',
            is_draft: false,
            published_at: new Date().toISOString(),
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
      }
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const pageBreaksCount = isScreenplay
    ? parsePageBreaks(formData.content).length
    : parsePageBreaksFromHtml(formData.content).length;
  const wordCount = isScreenplay
    ? formData.content.trim().split(/\s+/).length
    : getWordCount(formData.content);

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
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">
              {currentDraftId ? 'Edit Draft' : 'Write a New Post'}
            </h1>
            <div className="flex items-center gap-2 text-sm">
              {autoSaveStatus === 'saving' && (
                <span className="flex items-center gap-2 text-blue-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  Auto-saving...
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  All changes saved
                </span>
              )}
              {autoSaveStatus === 'error' && (
                <span className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  Save failed
                </span>
              )}
              {lastSavedAt && autoSaveStatus === 'idle' && (
                <span className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  Last saved {new Date(lastSavedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {daysUntilExpiration !== null && daysUntilExpiration <= 7 && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-300">
                <p className="font-medium">Draft expiring soon</p>
                <p>This draft will expire in {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''}. Publish it or save changes to extend the expiration.</p>
              </div>
            </div>
          )}

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
                  <span className="text-xs text-gray-400">
                    {wordCount} words
                    {pageBreaksCount > 0 && ` • ${pageBreaksCount + 1} pages`}
                  </span>
                </div>
                <RichTextEditor
                  content={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                  placeholder="Start writing your post... Use the toolbar to format text and insert page breaks."
                />
                <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-300">
                      <p className="font-medium mb-1">Rich Text Editor</p>
                      <p>Use the formatting toolbar to style your text. Click the page break button (—) to split your post into multiple pages. Format text by selecting it and clicking a button, or use keyboard shortcuts like Ctrl+B for bold.</p>
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveAsDraft}
                disabled={savingDraft || loading || !formData.title.trim() || !formData.content.trim()}
                className="flex-1 bg-slate-600 text-white py-3 px-4 rounded-lg hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {savingDraft ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="submit"
                disabled={loading || interests.length === 0}
                className="flex-1 bg-emerald-500 text-white py-3 px-4 rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg hover:shadow-emerald-500/50"
              >
                {loading ? 'Publishing...' : 'Publish Post'}
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </BlogLayout>
  );
}
