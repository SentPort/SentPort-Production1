import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, Info, Film, AlertCircle, ArrowLeft } from 'lucide-react';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformBackButton from '../../components/shared/PlatformBackButton';
import PlatformGuard from '../../components/shared/PlatformGuard';
import { parsePageBreaks } from '../../lib/blogPaginationHelpers';
import ScreenplayEditor from '../../components/blog/ScreenplayEditor';
import ScreenplayInspirationSelector from '../../components/blog/ScreenplayInspirationSelector';
import RichTextEditor from '../../components/blog/RichTextEditor';
import { getWordCount, parsePageBreaksFromHtml, sanitizeHtml, isHtmlContent, markdownToHtml } from '../../lib/htmlHelpers';

export default function EditPost() {
  return (
    <PlatformGuard platform="blog">
      <EditPostContent />
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

function EditPostContent() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingPost, setLoadingPost] = useState(true);
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
  const [screenplayInspirations, setScreenplayInspirations] = useState<SelectedInspiration[]>([]);
  const [screenplayMode, setScreenplayMode] = useState(false);
  const [showScreenplayWarning, setShowScreenplayWarning] = useState(false);
  const [originalPost, setOriginalPost] = useState<any>(null);

  const isScreenplay = screenplayMode || interests.includes('Screenplays');

  useEffect(() => {
    loadInterests();
    loadPost();
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

  const loadPost = async () => {
    if (!postId) return;

    setLoadingPost(true);
    try {
      const { data: post, error: postError } = await supabase
        .from('blog_posts')
        .select(`
          *,
          account:blog_accounts!blog_posts_account_id_fkey(
            id,
            username,
            display_name
          ),
          interests:blog_post_interests(
            interest:blog_interests(*)
          )
        `)
        .eq('id', postId)
        .maybeSingle();

      if (postError) throw postError;
      if (!post) {
        setError('Post not found');
        return;
      }

      let coauthors = [];
      const { data: coauthorData } = await supabase
        .from('blog_post_coauthors')
        .select('user_id')
        .eq('post_id', postId);
      coauthors = coauthorData || [];

      const { data: inspirationsData } = await supabase
        .from('blog_post_screenplay_inspirations')
        .select(`
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
        .eq('screenplay_post_id', postId);

      const isAuthor = post.account_id === user?.id;
      const isCoAuthor = coauthors.some((ca: any) => ca.user_id === user?.id);

      if (!isAuthor && !isCoAuthor && !isAdmin) {
        setError('You do not have permission to edit this post');
        return;
      }

      setOriginalPost(post);

      let content = post.content;
      if (!isHtmlContent(content)) {
        content = markdownToHtml(content);
      }

      setFormData({
        title: post.title,
        content: content,
        privacy: post.privacy,
        status: post.status,
        autoPaginate: post.auto_paginate || false
      });

      const postInterests = post.interests?.map((pi: any) => pi.interest.name) || [];
      setInterests(postInterests);
      setScreenplayMode(post.is_screenplay || false);

      if (inspirationsData && inspirationsData.length > 0) {
        const inspirations = inspirationsData.map((insp: any) => ({
          post: {
            id: insp.inspired_by_post.id,
            title: insp.inspired_by_post.title,
            excerpt: insp.inspired_by_post.excerpt,
            account: insp.inspired_by_post.account
          },
          note: insp.attribution_note || ''
        }));
        setScreenplayInspirations(inspirations);
      }
    } catch (err: any) {
      console.error('Error loading post:', err);
      setError(err.message || 'Failed to load post');
    } finally {
      setLoadingPost(false);
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

    if (!user || !postId) {
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

      const { error: postError } = await supabase
        .from('blog_posts')
        .update({
          title: formData.title,
          content: sanitizedContent,
          privacy: formData.privacy,
          status: formData.status,
          page_breaks: pageBreaks,
          auto_paginate: formData.autoPaginate,
          is_screenplay: isScreenplay,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (postError) throw postError;

      await supabase
        .from('blog_post_interests')
        .delete()
        .eq('post_id', postId);

      const interestIds = availableInterests
        .filter(i => interests.includes(i.name))
        .map(i => i.id);

      const { error: interestsError } = await supabase
        .from('blog_post_interests')
        .insert(
          interestIds.map(interestId => ({
            post_id: postId,
            interest_id: interestId
          }))
        );

      if (interestsError) throw interestsError;

      await supabase
        .from('blog_post_screenplay_inspirations')
        .delete()
        .eq('screenplay_post_id', postId);

      if (isScreenplay && screenplayInspirations.length > 0) {
        const { error: inspirationsError } = await supabase
          .from('blog_post_screenplay_inspirations')
          .insert(
            screenplayInspirations.map(inspiration => ({
              screenplay_post_id: postId,
              inspired_by_post_id: inspiration.post.id,
              attribution_note: inspiration.note || null
            }))
          );

        if (inspirationsError) {
          console.error('Error saving screenplay inspirations:', inspirationsError);
        }
      }

      navigate(`/blog/post/${postId}`);
    } catch (err: any) {
      console.error('Error updating post:', err);
      setError(err.message || 'Failed to update post');
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

  if (loadingPost) {
    return (
      <BlogLayout showCreateButton={false}>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-12 px-4 flex items-center justify-center">
          <div className="text-white text-lg">Loading post...</div>
        </div>
      </BlogLayout>
    );
  }

  if (error && !originalPost) {
    return (
      <BlogLayout showCreateButton={false}>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-lg">
              {error}
            </div>
            <button
              onClick={() => navigate('/blog/my-posts')}
              className="mt-4 flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to My Posts
            </button>
          </div>
        </div>
      </BlogLayout>
    );
  }

  return (
    <BlogLayout showCreateButton={false}>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-12 px-4 relative overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-slate-600/20 rounded-full blur-3xl"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="mb-6">
            <PlatformBackButton fallbackPath={`/blog/post/${postId}`} />
          </div>

        <div className="bg-slate-800/70 backdrop-blur-md rounded-lg shadow-lg border border-slate-600/50 p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Edit Post</h1>

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

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(`/blog/post/${postId}`)}
                className="flex-1 bg-slate-700 text-white py-3 px-4 rounded-lg hover:bg-slate-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || interests.length === 0}
                className="flex-1 bg-emerald-500 text-white py-3 px-4 rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg hover:shadow-emerald-500/50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </BlogLayout>
  );
}
