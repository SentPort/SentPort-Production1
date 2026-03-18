import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Settings {
  report_ratio_threshold: number;
  min_engagements_before_check: number;
}

export default function ModerationSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>({
    report_ratio_threshold: 0.15,
    min_engagements_before_check: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value');

      if (error) throw error;

      if (data && data.length > 0) {
        const settingsMap = data.reduce((acc, row) => {
          acc[row.key] = parseFloat(row.value);
          return acc;
        }, {} as Record<string, number>);

        setSettings({
          report_ratio_threshold: settingsMap.report_ratio_threshold || 0.15,
          min_engagements_before_check: settingsMap.min_engagements_before_check || 10,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (settings.report_ratio_threshold < 0.05 || settings.report_ratio_threshold > 0.50) {
      setMessage({ type: 'error', text: 'Report ratio must be between 5% and 50%' });
      return;
    }

    if (settings.min_engagements_before_check < 1 || settings.min_engagements_before_check > 100) {
      setMessage({ type: 'error', text: 'Minimum engagements must be between 1 and 100' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const updates = [
        {
          key: 'report_ratio_threshold',
          value: settings.report_ratio_threshold.toString(),
        },
        {
          key: 'min_engagements_before_check',
          value: settings.min_engagements_before_check.toString(),
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('admin_settings')
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq('key', update.key);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const calculateExample = () => {
    const reactions = 50;
    const comments = 20;
    const reports = 12;
    const totalEngagements = reactions + comments;

    if (totalEngagements < settings.min_engagements_before_check) {
      return {
        status: 'not-checked',
        text: `Not checked (only ${totalEngagements} engagements, need ${settings.min_engagements_before_check})`,
      };
    }

    const ratio = reports / totalEngagements;
    const isPaused = ratio >= settings.report_ratio_threshold;

    return {
      status: isPaused ? 'paused' : 'active',
      text: `${isPaused ? 'PAUSED' : 'ACTIVE'} (${reports} reports ÷ ${totalEngagements} engagements = ${(ratio * 100).toFixed(1)}%)`,
    };
  };

  const example = calculateExample();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/admin/moderation-controls')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Moderation Controls
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Moderation Settings</h1>
          <p className="text-gray-600">Configure auto-moderation thresholds and behavior</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <label className="block text-lg font-semibold text-gray-900 mb-2">
                Report Ratio Threshold
              </label>
              <p className="text-sm text-gray-600 mb-4">
                Posts are auto-paused when reports exceed this percentage of total engagements
              </p>

              <div className="mb-4">
                <input
                  type="range"
                  min="0.05"
                  max="0.50"
                  step="0.01"
                  value={settings.report_ratio_threshold}
                  onChange={(e) =>
                    setSettings({ ...settings, report_ratio_threshold: parseFloat(e.target.value) })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">5% (Very Strict)</span>
                <span className="text-2xl font-bold text-red-600">
                  {(settings.report_ratio_threshold * 100).toFixed(0)}%
                </span>
                <span className="text-sm text-gray-500">50% (Very Lenient)</span>
              </div>

              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Current setting:</strong> Posts will be paused if reports make up{' '}
                  {(settings.report_ratio_threshold * 100).toFixed(0)}% or more of total engagements
                  (reactions + comments).
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <label className="block text-lg font-semibold text-gray-900 mb-2">
                Minimum Engagements Before Check
              </label>
              <p className="text-sm text-gray-600 mb-4">
                Posts need at least this many engagements before auto-moderation applies
              </p>

              <input
                type="number"
                min="1"
                max="100"
                value={settings.min_engagements_before_check}
                onChange={(e) =>
                  setSettings({ ...settings, min_engagements_before_check: parseInt(e.target.value) || 1 })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />

              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Purpose:</strong> Prevents new posts with few engagements from being paused due to
                  1-2 malicious reports. Posts need {settings.min_engagements_before_check} total engagements
                  before the ratio threshold applies.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-1">Live Example Calculator</h3>
                <p className="text-sm text-purple-800 mb-4">
                  See how your current settings would handle a post with 50 reactions, 20 comments, and 12
                  reports:
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">50</div>
                  <div className="text-sm text-gray-600">Reactions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">20</div>
                  <div className="text-sm text-gray-600">Comments</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">12</div>
                  <div className="text-sm text-gray-600">Reports</div>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg text-center font-bold text-lg ${
                  example.status === 'paused'
                    ? 'bg-red-100 text-red-800'
                    : example.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {example.text}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">How Auto-Moderation Works</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <p>
                  Users can report any post they believe contains fake, misleading, or harmful content.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <p>
                  The system counts total engagements (reactions + comments + shares) to measure post reach.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <p>
                  If a post has enough engagements AND the report ratio exceeds the threshold, it's
                  automatically paused.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                  4
                </div>
                <p>Paused posts appear in the Review Queue for admin review and final decision.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                  5
                </div>
                <p>
                  Admins can approve (restore) or remove the post. All actions are logged in Review History.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={() => navigate('/admin/moderation-controls')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
