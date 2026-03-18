import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TagInput } from './TagInput';

interface EditTagsModalProps {
  postId: string;
  currentTags: string[];
  onClose: () => void;
  onSave: (tags: string[]) => void;
  subredditId?: string;
  maxTags?: number;
}

export function EditTagsModal({
  postId,
  currentTags,
  onClose,
  onSave,
  subredditId,
  maxTags = 5
}: EditTagsModalProps) {
  const [tags, setTags] = useState<string[]>(currentTags);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existingTags } = await supabase
        .from('heddit_post_tags')
        .select('id, tag_id, heddit_custom_tags(display_name)')
        .eq('post_id', postId);

      const existingTagNames = existingTags?.map((t: any) => t.heddit_custom_tags.display_name) || [];

      const tagsToRemove = existingTags?.filter((t: any) =>
        !tags.includes(t.heddit_custom_tags.display_name)
      ) || [];

      const tagsToAdd = tags.filter(tag => !existingTagNames.includes(tag));

      for (const tagRecord of tagsToRemove) {
        await supabase
          .from('heddit_post_tags')
          .delete()
          .eq('id', tagRecord.id);
      }

      for (const tagName of tagsToAdd) {
        const { data: tagId } = await supabase
          .rpc('get_or_create_tag', { input_tag: tagName });

        if (tagId) {
          await supabase
            .from('heddit_post_tags')
            .insert({
              post_id: postId,
              tag_id: tagId
            });
        }
      }

      onSave(tags);
      onClose();
    } catch (error) {
      console.error('Error updating tags:', error);
      alert('Failed to update tags');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Edit Tags</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <TagInput
            selectedTags={tags}
            onTagsChange={setTags}
            maxTags={maxTags}
            placeholder="Type tags..."
            subredditId={subredditId}
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
            {saving ? 'Saving...' : 'Save Tags'}
          </button>
        </div>
      </div>
    </div>
  );
}
