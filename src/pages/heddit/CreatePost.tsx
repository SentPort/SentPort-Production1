import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Link as LinkIcon, Image as ImageIcon, Video, AlertCircle, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';
import SubHedditMultiSelect from '../../components/heddit/SubHedditMultiSelect';
import { TagInput } from '../../components/heddit/TagInput';
import HedditMentionTextarea from '../../components/heddit/HedditMentionTextarea';
import HedditRichTextEditor from '../../components/heddit/HedditRichTextEditor';
import HedditMediaUploader from '../../components/heddit/HedditMediaUploader';
import Toast from '../../components/heddit/Toast';
import { saveHedditMentions, validateMentionCount } from '../../lib/hedditMentionHelpers';

interface SubHeddit {
  id: string;
  name: string;
  display_name: string;
  description: string;
  member_count: number;
  topics: string[];
  is_member: boolean;
}

export default function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const draftIdFromUrl = searchParams.get('draft');

  const [draftId, setDraftId] = useState<string | null>(draftIdFromUrl);
  const [selectedSubreddits, setSelectedSubreddits] = useState<SubHeddit[]>([]);
  const [postType, setPostType] = useState<'text' | 'link' | 'image'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDraftLimitModal, setShowDraftLimitModal] = useState(false);
  const [existingDrafts, setExistingDrafts] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Rich text and media features
  const [useRichText, setUseRichText] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  // Load draft if editing existing draft
  useEffect(() => {
    if (draftIdFromUrl && user) {
      loadDraft(draftIdFromUrl);
    }
  }, [draftIdFromUrl, user]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (title.trim() || content.trim() || mediaUrls.length > 0) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft(true); // Silent auto-save
      }, 30000); // 30 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, mediaUrls, selectedSubreddits, postType, tags, useRichText]);

  // Save draft when leaving page
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (title.trim() || content.trim() || mediaUrls.length > 0) {
        // Save draft silently
        await saveDraft(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [title, content, mediaUrls, selectedSubreddits, postType, tags, useRichText]);

  const loadDraft = async (id: string) => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: hedditAccount } = await supabase
        .from('heddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!hedditAccount) {
        setToast({ message: 'Heddit account not found', type: 'error' });
        throw new Error('No heddit account found');
      }

      const { data: draft, error } = await supabase
        .from('heddit_posts')
        .select(`
          *,
          heddit_post_tags(tag_id, heddit_custom_tags(tag_name))
        `)
        .eq('id', id)
        .eq('is_draft', true)
        .eq('author_id', hedditAccount.id)
        .maybeSingle();

      if (error || !draft) {
        console.error('Error loading draft:', error);
        setToast({ message: 'Failed to load draft', type: 'error' });
        throw error || new Error('Draft not found');
      }

      // Load the primary subreddit using the subreddit_id field
      if (draft.subreddit_id) {
        const { data: subreddit } = await supabase
          .from('heddit_subreddits')
          .select('*')
          .eq('id', draft.subreddit_id)
          .maybeSingle();

        if (subreddit) {
          setSelectedSubreddits([{
            ...subreddit,
            is_member: true
          }]);
        } else {
          setToast({
            message: 'The subreddit for this draft no longer exists. Please select a new subreddit before posting.',
            type: 'error'
          });
          setSelectedSubreddits([]);
        }
      }

      // Load tags
      if (draft.heddit_post_tags) {
        const tagNames = draft.heddit_post_tags
          .map((pt: any) => pt.heddit_custom_tags?.tag_name)
          .filter(Boolean);
        setTags(tagNames);
      }

      // Set form data
      setTitle(draft.title || '');
      setContent(draft.content || '');
      setUrl(draft.url || '');
      setPostType(draft.type || 'text');
      setUseRichText(draft.has_rich_formatting || false);
      setMediaUrls(draft.media_urls || []);
      setMediaTypes(draft.media_types || []);
    } catch (error) {
      console.error('Error loading draft:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async (silent = true) => {
    if (!user || !title.trim()) return false;

    // Cancel any pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    try {
      if (!silent) setIsSaving(true);

      const { data: hedditAccount } = await supabase
        .from('heddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!hedditAccount) {
        if (!silent) setToast({ message: 'Heddit account not found', type: 'error' });
        return false;
      }

      // Allow saving without subreddit for auto-save
      // Only require subreddit for publishing
      if (!silent && selectedSubreddits.length === 0) {
        setToast({ message: 'Please select a subreddit', type: 'error' });
        return false;
      }

      // Determine actual post type based on media
      let actualPostType = postType;
      if (postType === 'image' && mediaTypes.some(type => type === 'video')) {
        actualPostType = 'video';
      }

      const draftData: any = {
        author_id: hedditAccount.id,
        title: title.trim(),
        type: actualPostType,
        content: content.trim(),
        is_draft: true,
        has_rich_formatting: useRichText,
        media_urls: mediaUrls,
        media_types: mediaTypes
      };

      // Only set subreddit_id if one is selected
      if (selectedSubreddits.length > 0) {
        draftData.subreddit_id = selectedSubreddits[0].id;
      }

      if (url.trim()) {
        draftData.url = url.trim();
      }

      let savedDraft;

      if (draftId) {
        // Update existing draft
        const { data, error } = await supabase
          .from('heddit_posts')
          .update(draftData)
          .eq('id', draftId)
          .select()
          .single();

        if (error) throw error;
        savedDraft = data;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('heddit_posts')
          .insert(draftData)
          .select()
          .single();

        if (error) {
          // Check if it's a draft limit error
          if (error.message?.includes('Draft limit reached')) {
            if (!silent) await showDraftLimitDialog();
            throw error;
          }
          throw error;
        }
        savedDraft = data;
        setDraftId(savedDraft.id);
      }

      // DO NOT save cross-post subreddits for drafts to prevent them from appearing in feeds
      // Delete any existing cross-posts (in case this draft was previously published)
      if (savedDraft) {
        await supabase
          .from('heddit_post_subreddits')
          .delete()
          .eq('post_id', savedDraft.id);
      }

      // Save tags
      if (savedDraft && tags.length > 0) {
        // Delete existing tags
        await supabase
          .from('heddit_post_tags')
          .delete()
          .eq('post_id', savedDraft.id);

        // Insert new tags - wait for all to complete
        const tagInsertPromises = tags.map(async (tagName) => {
          const { data: tagId } = await supabase
            .rpc('get_or_create_tag', { input_tag: tagName });

          if (tagId) {
            await supabase
              .from('heddit_post_tags')
              .insert({
                post_id: savedDraft.id,
                tag_id: tagId
              });
          }
        });

        await Promise.all(tagInsertPromises);
      }

      // All save operations completed successfully
      setLastSaved(new Date());
      return true;
    } catch (error) {
      console.error('Error saving draft:', error);
      if (!silent) {
        setToast({ message: 'Failed to save draft', type: 'error' });
      }
      return false;
    } finally {
      if (!silent) setIsSaving(false);
    }
  };

  const saveAndClose = async () => {
    if (!title.trim()) {
      // If there's nothing to save, just navigate to drafts
      navigate('/heddit/drafts');
      return;
    }

    setIsSaving(true);
    const success = await saveDraft(false);

    if (success) {
      setToast({ message: 'Draft saved successfully!', type: 'success' });
      // Navigate immediately to drafts page
      navigate('/heddit/drafts');
    } else {
      setIsSaving(false);
    }
  };

  const showDraftLimitDialog = async () => {
    if (!user) return;

    const { data: hedditAccount } = await supabase
      .from('heddit_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!hedditAccount) return;

    const { data: drafts } = await supabase
      .from('heddit_posts')
      .select('id, title, created_at')
      .eq('author_id', hedditAccount.id)
      .eq('is_draft', true)
      .order('created_at', { ascending: false });

    if (drafts) {
      setExistingDrafts(drafts);
      setShowDraftLimitModal(true);
    }
  };

  const handleMediaChange = (urls: string[], types: string[]) => {
    setMediaUrls(urls);
    setMediaTypes(types);
  };

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();
    if (!user || !title.trim() || selectedSubreddits.length === 0) return;

    // Prevent form submission while saving draft
    if (isSaving) {
      return;
    }

    // Validate that selected subreddits still exist
    for (const subreddit of selectedSubreddits) {
      const { data: existingSubreddit } = await supabase
        .from('heddit_subreddits')
        .select('id')
        .eq('id', subreddit.id)
        .maybeSingle();

      if (!existingSubreddit) {
        setToast({
          message: `The subreddit "${subreddit.name}" no longer exists. Please select a different subreddit.`,
          type: 'error'
        });
        setSelectedSubreddits(selectedSubreddits.filter(s => s.id !== subreddit.id));
        return;
      }
    }

    // Validate mention count for published posts
    if (!isDraft) {
      const validation = validateMentionCount(content);
      if (!validation.valid) {
        setToast({ message: validation.message, type: 'warning' });
        return;
      }
    }

    if (!isDraft && selectedSubreddits.length > 1 && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setLoading(true);

    try {
      const { data: hedditAccount } = await supabase
        .from('heddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!hedditAccount) {
        setToast({ message: 'Please create a Heddit account first', type: 'warning' });
        setTimeout(() => navigate('/heddit/join'), 1500);
        return;
      }

      // Determine actual post type based on media
      let actualPostType = postType;
      if (postType === 'image' && mediaTypes.some(type => type === 'video')) {
        actualPostType = 'video';
      }

      const postData: any = {
        subreddit_id: selectedSubreddits[0].id,
        author_id: hedditAccount.id,
        title: title.trim(),
        type: actualPostType,
        is_draft: isDraft,
        has_rich_formatting: useRichText,
        media_urls: mediaUrls,
        media_types: mediaTypes,
        like_count: 0,
        dislike_count: 0,
        comment_count: 0,
        share_count: 0
      };

      // Always include content if provided, regardless of post type
      if (content.trim()) {
        postData.content = content.trim();
      }

      if (url.trim()) {
        postData.url = url.trim();
      }

      let newPost;

      // If editing a draft and publishing, update it instead of inserting
      if (draftId && !isDraft) {
        postData.id = draftId;
        const { data, error: postError } = await supabase
          .from('heddit_posts')
          .update(postData)
          .eq('id', draftId)
          .select()
          .single();

        if (postError) throw postError;
        newPost = data;
      } else {
        const { data, error: postError } = await supabase
          .from('heddit_posts')
          .insert(postData)
          .select()
          .single();

        if (postError) throw postError;
        newPost = data;
      }

      // Only create cross-posts for published posts
      if (!isDraft) {
        // First, delete any existing cross-posts (in case converting from draft)
        await supabase
          .from('heddit_post_subreddits')
          .delete()
          .eq('post_id', newPost.id);

        // Then insert new cross-posts
        const crossPostInserts = selectedSubreddits.map((subreddit, index) => ({
          post_id: newPost.id,
          subreddit_id: subreddit.id,
          is_primary: index === 0
        }));

        const { error: crossPostError } = await supabase
          .from('heddit_post_subreddits')
          .insert(crossPostInserts);

        if (crossPostError) throw crossPostError;
      }

      if (tags.length > 0) {
        for (const tagName of tags) {
          const { data: tagId } = await supabase
            .rpc('get_or_create_tag', { input_tag: tagName });

          if (tagId) {
            await supabase
              .from('heddit_post_tags')
              .insert({
                post_id: newPost.id,
                tag_id: tagId
              });
          }
        }
      }

      // Save mentions if present in content
      if (content.trim() && !isDraft) {
        try {
          await saveHedditMentions('post', newPost.id, content.trim(), hedditAccount.id);
        } catch (mentionError) {
          console.error('Error saving mentions:', mentionError);
        }
      }

      if (isDraft) {
        alert('Draft saved successfully!');
        setLastSaved(new Date());
      } else {
        navigate('/heddit/feed');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setToast({ message: 'Failed to create post', type: 'error' });
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const getTotalAudience = () => {
    return selectedSubreddits.reduce((total, sub) => total + sub.member_count, 0);
  };

  const formatAudienceCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const toggleRichText = () => {
    if (useRichText && content.includes('<')) {
      if (!confirm('Switching to plain text will remove formatting. Continue?')) {
        return;
      }
      // Strip HTML tags
      const temp = document.createElement('div');
      temp.innerHTML = content;
      setContent(temp.textContent || '');
    }
    setUseRichText(!useRichText);
  };

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton backButtonPath="/heddit">
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {draftId ? 'Edit Draft' : 'Create a Post'}
              </h1>
              <div className="flex items-center gap-3">
                {isSaving && (
                  <span className="text-sm text-blue-600 flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                )}
                {lastSaved && !isSaving && (
                  <span className="text-sm text-green-600 flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Last saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {!lastSaved && !isSaving && title.trim() && (
                  <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                    Auto-save enabled
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setPostType('text')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors ${
                  postType === 'text'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5" />
                Text
              </button>
              <button
                onClick={() => setPostType('link')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors ${
                  postType === 'link'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <LinkIcon className="w-5 h-5" />
                Link
              </button>
              <button
                onClick={() => setPostType('image')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors ${
                  postType === 'image'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                <Video className="w-5 h-5" />
                Images & Video
              </button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose SubHeddits
                </label>
                <SubHedditMultiSelect
                  selectedSubreddits={selectedSubreddits}
                  onChange={setSelectedSubreddits}
                  maxSelections={5}
                />
                {selectedSubreddits.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Potential reach:</span> ~{formatAudienceCount(getTotalAudience())} people
                    </p>
                  </div>
                )}
                {selectedSubreddits.length > 3 && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                      Posting to {selectedSubreddits.length} SubHeddits at once. Make sure your content is relevant to all communities.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a descriptive title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                  maxLength={300}
                />
              </div>

              {(postType === 'link' || postType === 'image') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL {postType === 'image' && '(optional if uploading media)'}
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={postType === 'image' ? 'https://example.com/image.jpg' : 'https://example.com'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    required={postType === 'link' || (postType === 'image' && mediaUrls.length === 0)}
                  />
                </div>
              )}

              {postType === 'image' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images & Videos
                  </label>
                  <HedditMediaUploader
                    onMediaChange={handleMediaChange}
                    maxFiles={10}
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {postType === 'text' ? 'Text (optional)' : postType === 'image' ? 'Caption & Description (optional)' : 'Description (optional)'}
                  </label>
                  <button
                    type="button"
                    onClick={toggleRichText}
                    className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
                  >
                    {useRichText ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    {useRichText ? 'Rich Text' : 'Plain Text'}
                  </button>
                </div>

                {useRichText ? (
                  <HedditRichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder={postType === 'image' ? 'Add a caption and description for your media...' : 'Write your post content with rich formatting...'}
                    maxLength={40000}
                  />
                ) : (
                  <HedditMentionTextarea
                    value={content}
                    onChange={setContent}
                    placeholder={postType === 'image' ? 'Add a caption and description for your media... Use @ to mention users or @h/ to mention communities' : 'What are your thoughts? Use @ to mention users or @h/ to mention communities'}
                    rows={8}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Tags (Optional)
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Help others discover your post (max 5 tags)
                </p>
                <TagInput
                  selectedTags={tags}
                  onTagsChange={setTags}
                  maxTags={5}
                  placeholder="Type tags..."
                  subredditId={selectedSubreddits[0]?.id}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={saveAndClose}
                  disabled={loading || isSaving}
                  className="flex-1 px-6 py-2 border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save & Close'}
                </button>
                <button
                  type="submit"
                  disabled={loading || isSaving || !title.trim() || selectedSubreddits.length === 0}
                  className="flex-1 px-6 py-2 bg-orange-600 text-white rounded-full font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Posting...' : selectedSubreddits.length > 1 ? `Post to ${selectedSubreddits.length} SubHeddits` : 'Post'}
                </button>
              </div>
            </form>
          </div>

          {showConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Confirm Cross-Post
                </h3>
                <p className="text-gray-600 mb-4">
                  You are about to post to {selectedSubreddits.length} SubHeddits:
                </p>
                <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                  {selectedSubreddits.map((subreddit) => (
                    <div
                      key={subreddit.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">h/{subreddit.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatAudienceCount(subreddit.member_count)} members
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e as any, false)}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50"
                  >
                    {loading ? 'Posting...' : 'Confirm & Post'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showDraftLimitModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Draft Limit Reached
                </h3>
                <p className="text-gray-600 mb-4">
                  You have reached the maximum of 5 drafts. Please delete an existing draft to save this one:
                </p>
                <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                  {existingDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 truncate">{draft.title}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(draft.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await supabase
                            .from('heddit_posts')
                            .delete()
                            .eq('id', draft.id);
                          setShowDraftLimitModal(false);
                          saveDraft(true);
                        }}
                        className="ml-3 px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDraftLimitModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDraftLimitModal(false);
                      navigate('/heddit/drafts');
                    }}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700"
                  >
                    Manage Drafts
                  </button>
                </div>
              </div>
            </div>
          )}

          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}

          {isSaving && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Saving draft...</p>
                    <p className="text-sm text-gray-600">Please wait while we save your work</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </HedditLayout>
    </PlatformGuard>
  );
}
