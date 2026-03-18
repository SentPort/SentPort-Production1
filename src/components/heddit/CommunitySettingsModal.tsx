import { useState, useEffect } from 'react';
import { X, Settings, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TagInput } from './TagInput';

interface Topic {
  id: string;
  name: string;
  slug: string;
}

interface CommunitySettingsModalProps {
  communityId: string;
  communityName: string;
  currentDisplayName: string;
  currentDescription: string;
  currentTopics: string[];
  canDelete: boolean;
  postCount: number;
  memberCount: number;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function CommunitySettingsModal({
  communityId,
  communityName,
  currentDisplayName,
  currentDescription,
  currentTopics,
  canDelete,
  postCount,
  memberCount,
  onClose,
  onUpdate,
  onDelete
}: CommunitySettingsModalProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [description, setDescription] = useState(currentDescription);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTopics();
    fetchCurrentTags();
    fetchCurrentTopicIds();
  }, []);

  const fetchTopics = async () => {
    const { data } = await supabase
      .from('heddit_topics')
      .select('*')
      .order('name');

    if (data) setAllTopics(data);
  };

  const fetchCurrentTopicIds = async () => {
    const { data } = await supabase
      .from('heddit_subreddit_topics')
      .select('topic_id')
      .eq('subreddit_id', communityId);

    if (data) {
      setSelectedTopics(data.map(t => t.topic_id));
    }
  };

  const fetchCurrentTags = async () => {
    const { data } = await supabase
      .from('heddit_subreddit_custom_tags')
      .select('heddit_custom_tags(display_name)')
      .eq('subreddit_id', communityId);

    if (data) {
      setCustomTags(data.map((t: any) => t.heddit_custom_tags.display_name));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('heddit_subreddits')
        .update({
          display_name: displayName,
          description: description
        })
        .eq('id', communityId);

      if (updateError) throw updateError;

      await supabase
        .from('heddit_subreddit_topics')
        .delete()
        .eq('subreddit_id', communityId);

      if (selectedTopics.length > 0) {
        const topicMappings = selectedTopics.map(topicId => ({
          subreddit_id: communityId,
          topic_id: topicId
        }));

        await supabase
          .from('heddit_subreddit_topics')
          .insert(topicMappings);
      }

      await supabase
        .from('heddit_subreddit_custom_tags')
        .delete()
        .eq('subreddit_id', communityId);

      if (customTags.length > 0) {
        for (const tagName of customTags) {
          const { data: tagId } = await supabase
            .rpc('get_or_create_tag', { input_tag: tagName });

          if (tagId) {
            await supabase
              .from('heddit_subreddit_custom_tags')
              .insert({
                subreddit_id: communityId,
                tag_id: tagId
              });
          }
        }
      }

      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update community');
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-orange-600" />
            <h2 className="text-2xl font-bold">Community Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">Community Name</p>
                <p className="mb-1">The community name <span className="font-mono bg-gray-200 px-1 rounded">h/{communityName}</span> cannot be changed.</p>
                <p className="text-xs text-gray-600">You can only change the display name and description.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Cool Community"
              required
            />
            <p className="text-sm text-gray-600 mt-1">
              The public-facing name for your community
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              rows={4}
              placeholder="What is this community about?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Topics
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Help people discover your SubHeddit by selecting relevant topics
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
              {allTopics.map(topic => {
                const isSelected = selectedTopics.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleTopic(topic.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {topic.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Custom Tags
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Add specific tags to help people discover your community
            </p>
            <TagInput
              selectedTags={customTags}
              onTagsChange={setCustomTags}
              maxTags={10}
              placeholder="Type tags..."
            />
          </div>

          {canDelete && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
                <AlertCircle size={20} />
                Danger Zone
              </h3>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Delete this community
                    </h4>
                    <p className="text-sm text-gray-700 mb-2">
                      Permanently delete this community and all its content. This action cannot be undone.
                    </p>
                    <p className="text-xs text-gray-600">
                      This will delete {postCount} post{postCount !== 1 ? 's' : ''} and remove {memberCount} member{memberCount !== 1 ? 's' : ''}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium whitespace-nowrap"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="border-t p-4 flex gap-3">
          <button
            onClick={onClose}
            type="button"
            className="flex-1 bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
