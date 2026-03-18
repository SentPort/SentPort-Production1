import { useState } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Tag {
  id: string;
  tag_name: string;
  display_name: string;
  usage_count: number;
}

interface TagFlagModalProps {
  tag: Tag;
  onClose: () => void;
  onSuccess: () => void;
}

const FLAG_REASONS = [
  { value: 'suspected_duplicate', label: 'Suspected Duplicate', description: 'This tag appears to be a duplicate of another tag' },
  { value: 'needs_rename', label: 'Needs Rename', description: 'This tag name could be improved or corrected' },
  { value: 'potentially_inappropriate', label: 'Potentially Inappropriate', description: 'This tag may violate content policies' },
  { value: 'manual_review', label: 'Manual Review Needed', description: 'This tag requires admin attention' },
  { value: 'other', label: 'Other', description: 'Other reason not listed above' }
];

export default function TagFlagModal({ tag, onClose, onSuccess }: TagFlagModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFlag = async () => {
    if (!selectedReason) {
      setError('Please select a reason for flagging this tag');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: flagError } = await supabase.rpc('flag_heddit_tag', {
        p_tag_id: tag.id,
        p_flagged_by: user.id,
        p_flag_reason: selectedReason,
        p_flag_notes: notes || null
      });

      if (flagError) throw flagError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to flag tag');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="bg-yellow-600 text-white p-6 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flag className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Flag Tag for Review</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Tag to Flag</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="font-medium text-gray-900">{tag.display_name}</div>
              <div className="text-sm text-gray-600 mt-1">
                {tag.usage_count} total uses
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Reason for Flagging <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {FLAG_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedReason === reason.value
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-yellow-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="flag_reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 text-yellow-600 focus:ring-yellow-500"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">{reason.label}</div>
                    <div className="text-sm text-gray-600">{reason.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context or information about this flag..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleFlag}
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Flagging...' : 'Flag Tag'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
