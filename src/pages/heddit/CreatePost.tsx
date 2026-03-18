import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Link as LinkIcon, Image as ImageIcon, AlertCircle } from 'lucide-react';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';
import SubHedditMultiSelect from '../../components/heddit/SubHedditMultiSelect';
import { TagInput } from '../../components/heddit/TagInput';
import HedditMentionTextarea from '../../components/heddit/HedditMentionTextarea';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || selectedSubreddits.length === 0) return;

    // Validate mention count
    const validation = validateMentionCount(content);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    if (selectedSubreddits.length > 1 && !showConfirmation) {
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

      const postData: any = {
        subreddit_id: selectedSubreddits[0].id,
        author_id: hedditAccount.id,
        title: title.trim(),
        type: postType,
        like_count: 0,
        dislike_count: 0,
        comment_count: 0,
        share_count: 0
      };

      if (postType === 'text') {
        postData.content = content.trim();
      } else if (postType === 'link' || postType === 'image') {
        postData.url = url.trim();
        if (postType === 'link') {
          postData.content = content.trim();
        }
      }

      const { data: newPost, error: postError } = await supabase
        .from('heddit_posts')
        .insert(postData)
        .select()
        .single();

      if (postError) throw postError;

      const crossPostInserts = selectedSubreddits.map((subreddit, index) => ({
        post_id: newPost.id,
        subreddit_id: subreddit.id,
        is_primary: index === 0
      }));

      const { error: crossPostError } = await supabase
        .from('heddit_post_subreddits')
        .insert(crossPostInserts);

      if (crossPostError) throw crossPostError;

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
      if (postType !== 'image' && content.trim()) {
        try {
          await saveHedditMentions('post', newPost.id, content.trim(), hedditAccount.id);
        } catch (mentionError) {
          console.error('Error saving mentions:', mentionError);
        }
      }

      navigate('/heddit/feed');
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

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton backButtonPath="/heddit">
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Create a Post</h1>

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
                Image
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={postType === 'image' ? 'https://example.com/image.jpg' : 'https://example.com'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              {postType !== 'image' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {postType === 'text' ? 'Text (optional)' : 'Description (optional)'}
                  </label>
                  <HedditMentionTextarea
                    value={content}
                    onChange={setContent}
                    placeholder="What are your thoughts? Use @ to mention users or @r/ to mention communities"
                    rows={8}
                  />
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
                    onClick={handleSubmit}
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
