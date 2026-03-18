import { X } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ReportContentModalProps {
  platform: 'hubook' | 'heddit' | 'hutube' | 'hinsta' | 'switter';
  contentType: string;
  contentId: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Misinformation or fake news',
  'AI-generated or bot content',
  'Spam or misleading',
  'Harmful or dangerous',
  'Other fake content'
];

export default function ReportContentModal({
  platform,
  contentType,
  contentId,
  onClose
}: ReportContentModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      await supabase.from('platform_reports').insert({
        user_id: user.user?.id,
        platform,
        content_type: contentType,
        content_id: contentId,
        reason,
        description
      });

      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Report Fake Content</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <div className="text-green-600 text-lg font-semibold mb-2">
              Report Submitted Successfully
            </div>
            <p className="text-gray-600">
              Thank you for helping keep our platform authentic and human-verified.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why are you reporting this content?
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a reason</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Provide more context about why this content appears fake or misleading..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reason}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}