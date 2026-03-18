import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TagInput } from './TagInput';

interface SubHedditSettingsModalProps {
  subredditId: string;
  subredditName: string;
  onClose: () => void;
}

export function SubHedditSettingsModal({
  subredditId,
  subredditName,
  onClose
}: SubHedditSettingsModalProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentTags();
  }, [subredditId]);

  const loadCurrentTags = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('heddit_subreddit_custom_tags')
        .select('heddit_custom_tags(display_name)')
        .eq('subreddit_id', subredditId);

      if (data) {
        setTags(data.map((t: any) => t.heddit_custom_tags.display_name));
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existingTags } = await supabase
        .from('heddit_subreddit_custom_tags')
        .select('id, tag_id, heddit_custom_tags(display_name)')
        .eq('subreddit_id', subredditId);

      const existingTagNames = existingTags?.map((t: any) => t.heddit_custom_tags.display_name) || [];

      const tagsToRemove = existingTags?.filter((t: any) =>
        !tags.includes(t.heddit_custom_tags.display_name)
      ) || [];

      const tagsToAdd = tags.filter(tag => !existingTagNames.includes(tag));

      for (const tagRecord of tagsToRemove) {
        await supabase
          .from('heddit_subreddit_custom_tags')
          .delete()
          .eq('id', tagRecord.id);
      }

      for (const tagName of tagsToAdd) {
        const { data: tagId } = await supabase
          .rpc('get_or_create_tag', { input_tag: tagName });

        if (tagId) {
          await supabase
            .from('heddit_subreddit_custom_tags')
            .insert({
              subreddit_id: subredditId,
              tag_id: tagId
            });
        }
      }

      onClose();
    } catch (error) {
      console.error('Error updating tags:', error);
      alert('Failed to update tags');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full p-6">
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            Manage h/{subredditName} Settings
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Tags
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Add specific tags to help people discover your community (max 10 tags)
          </p>
          <TagInput
            selectedTags={tags}
            onTagsChange={setTags}
            maxTags={10}
            placeholder="Type tags like 'AI', 'baking', 'indie games'..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
