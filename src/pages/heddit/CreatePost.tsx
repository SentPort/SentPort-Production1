import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [selectedSubreddits, setSelectedSubreddits] = useState<SubHeddit[]>([]);
  const [postType, setPostType] = useState<'text' | 'link' | 'image'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Rich text and media features
  const [useRichText, setUseRichText] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (title.trim() || content.trim() || mediaUrls.length > 0) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, 30000); // 30 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, mediaUrls, selectedSubreddits, postType, tags, useRichText]);

  const saveDraft = async () => {
    if (!user || !title.trim()) return;

    try {
      const { data: hedditAccount } = await supabase
        .from('heddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!hedditAccount || selectedSubreddits.length === 0) return;

      const draftData: any = {
        subreddit_id: selectedSubreddits[0].id,
        author_id: hedditAccount.id,
        title: title.trim(),
        type: postType,
        content: content.trim(),
        is_draft: true,
        has_rich_formatting: useRichText,
        media_urls: mediaUrls,
        media_types: mediaTypes
      };

      if (postType === 'link' || postType === 'image') {
        draftData.url = url.trim();
      }

      await supabase
        .from('heddit_posts')
        .upsert(draftData, { onConflict: 'id' });

      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const handleMediaChange = (urls: string[], types: string[]) => {
    setMediaUrls(urls);
    setMediaTypes(types);
  };

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();
    if (!user || !title.trim() || selectedSubreddits.length === 0) return;

    // Validate mention count for published posts
    if (!isDraft) {
      const validation = validateMentionCount(content);
      if (!validation.valid) {
        alert(validation.message);
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
        alert('Please create a Heddit account first');
        navigate('/heddit/join');
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

      if (postType === 'text' || postType === 'link') {
        postData.content = content.trim();
      }

      if (postType === 'link' || (postType === 'image' && url.trim())) {
        postData.url = url.trim();
      }

      const { data: newPost, error: postError } = await supabase
        .from('heddit_posts')
        .insert(postData)
        .select()
        .single();

      if (postError) throw postError;

      // Only create cross-posts for published posts
      if (!isDraft) {
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
      alert('Failed to create post');
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
              <h1 className="text-2xl font-bold text-gray-900">Create a Post</h1>
              {lastSaved && (
                <span className="text-sm text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
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

              {postType !== 'image' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {postType === 'text' ? 'Text (optional)' : 'Description (optional)'}
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
                      placeholder="Write your post content with rich formatting..."
                      maxLength={40000}
                    />
                  ) : (
                    <HedditMentionTextarea
                      value={content}
                      onChange={setContent}
                      placeholder="What are your thoughts? Use @ to mention users or @h/ to mention communities"
                      rows={8}
                    />
                  )}
                </div>
              )}

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
                  onClick={() => navigate('/heddit/feed')}
                  className="flex-1 px-6 py-2 border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={loading || !title.trim() || selectedSubreddits.length === 0}
                  className="flex-1 px-6 py-2 border border-orange-600 text-orange-600 rounded-full font-medium hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Draft
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || selectedSubreddits.length === 0}
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
        </div>
      </div>
      </HedditLayout>
    </PlatformGuard>
  );
}
