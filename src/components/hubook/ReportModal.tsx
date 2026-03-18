import { useState, useEffect } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';

interface ReportModalProps {
  postId: string;
  onClose: () => void;
}

const reportReasons = [
  { value: 'false_information', label: 'False Information', description: 'Contains factually incorrect claims' },
  { value: 'misleading', label: 'Misleading Content', description: 'Deceptive or manipulative content' },
  { value: 'spam', label: 'Spam', description: 'Unwanted or repetitive content' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying or abusive behavior' },
  { value: 'other', label: 'Other', description: 'Specify your concern below' }
];

export default function ReportModal({ postId, onClose }: ReportModalProps) {
  const { hubookProfile } = useHuBook();
  const [selectedReason, setSelectedReason] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [reportThreshold, setReportThreshold] = useState(0.15);
  const [minEngagements, setMinEngagements] = useState(10);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('key, value')
          .in('key', ['report_ratio_threshold', 'min_engagements_before_check']);

        if (data) {
          data.forEach((setting) => {
            if (setting.key === 'report_ratio_threshold') {
              setReportThreshold(parseFloat(setting.value) || 0.15);
            } else if (setting.key === 'min_engagements_before_check') {
              setMinEngagements(parseInt(setting.value) || 10);
            }
          });
        }
      } catch (err) {
        console.error('Error fetching moderation settings:', err);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason || !hubookProfile) return;

    setLoading(true);
    setError('');

    try {
      const reason = reportReasons.find((r) => r.value === selectedReason);
      const fullReason = additionalInfo
        ? `${reason?.label}: ${additionalInfo}`
        : reason?.label || selectedReason;

      const { error: reportError } = await supabase
        .from('post_reports')
        .insert({
          post_id: postId,
          reporter_user_id: hubookProfile.id,
          report_reason: fullReason
        });

      if (reportError) {
        if (reportError.code === '23505') {
          setError('You have already reported this post');
        } else {
          throw reportError;
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Flag className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Report Fake Content</h2>
              <p className="text-sm text-gray-600">Help us keep HuBook safe and authentic</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Flag className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Report Submitted</h3>
            <p className="text-gray-600">
              Thank you for helping keep HuBook authentic. Our team will review this content.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-2">How Automated Moderation Works</p>
                  <p className="mb-2">
                    Your report helps protect authenticity on HuBook! Posts are automatically paused when reports reach{' '}
                    <span className="font-semibold">{(reportThreshold * 100).toFixed(0)}%</span> of total engagements
                    (reactions + comments).
                  </p>
                  <p className="mb-2">
                    At least <span className="font-semibold">{minEngagements} engagements</span> are required before
                    this threshold applies. This protects popular content while ensuring fake content is quickly reviewed.
                  </p>
                  <p className="text-xs bg-blue-100 rounded px-2 py-1 inline-block">
                    Example: A post with 100 total engagements would need {Math.ceil(100 * reportThreshold)} reports to be auto-paused
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Why are you reporting this post?
              </label>
              <div className="space-y-2">
                {reportReasons.map((reason) => (
                  <label
                    key={reason.value}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedReason === reason.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
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
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Additional Information (Optional)
              </label>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Provide any additional details that might help our review..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedReason || loading}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
