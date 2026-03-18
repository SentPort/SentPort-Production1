import { useState } from 'react';
import { X, Scale, AlertTriangle, Users, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SendToJuryModalProps {
  alert: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SendToJuryModal({ alert, onClose, onSuccess }: SendToJuryModalProps) {
  const { userProfile } = useAuth();
  const [caseType, setCaseType] = useState<'content_review' | 'user_ban'>('content_review');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!userProfile?.id) return;
    if (!adminNotes.trim()) {
      setError('Please provide context notes for the jury');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check for minimum number of active volunteers
      const { data: volunteers, error: volError } = await supabase
        .from('jury_pool_volunteers')
        .select('user_id')
        .eq('active_status', true);

      if (volError) throw volError;

      if (!volunteers || volunteers.length < 12) {
        setError(`Not enough active volunteers. Need 12, but only ${volunteers?.length || 0} are available.`);
        setLoading(false);
        return;
      }

      // Shuffle and select 12 random volunteers
      const shuffled = [...volunteers].sort(() => Math.random() - 0.5);
      const selectedJurors = shuffled.slice(0, 12);

      // Generate case ID
      const { data: caseIdData, error: caseIdError } = await supabase
        .rpc('generate_jury_case_id');

      if (caseIdError) throw caseIdError;
      const caseId = caseIdData;

      // Create jury case
      const { data: juryCase, error: caseError } = await supabase
        .from('jury_cases')
        .insert({
          case_id: caseId,
          alert_id: alert.id,
          content_id: alert.content_id,
          platform: alert.platform,
          content_type: alert.content_type,
          case_type: caseType,
          admin_notes: adminNotes,
          created_by: userProfile.id,
          status: 'pending'
        })
        .select()
        .single();

      if (caseError) throw caseError;

      // Create jury assignments
      const assignments = selectedJurors.map(juror => ({
        case_id: juryCase.id,
        juror_user_id: juror.user_id,
        notification_sent_at: new Date().toISOString()
      }));

      const { error: assignError } = await supabase
        .from('jury_assignments')
        .insert(assignments);

      if (assignError) throw assignError;

      // Create initial decision record
      const { error: decisionError } = await supabase
        .from('jury_case_decisions')
        .insert({
          case_id: juryCase.id,
          approve_count: 0,
          reject_count: 0,
          pending_count: 12
        });

      if (decisionError) throw decisionError;

      // Update alert with jury case reference
      const { error: updateError } = await supabase
        .from('admin_report_alerts')
        .update({ jury_case_id: juryCase.id })
        .eq('id', alert.id);

      if (updateError) throw updateError;

      // Send notifications to selected jurors
      const notifications = selectedJurors.map(juror => ({
        user_id: juror.user_id,
        type: 'jury_duty',
        title: `You've Been Selected for Jury Duty - Case ${caseId}`,
        message: `You have been randomly selected to serve on a community jury. Please review the case and submit your decision.`,
        link: `/jury/case/${juryCase.id}`,
        content_type: 'jury_case'
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) console.error('Error sending notifications:', notifError);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating jury case:', err);
      setError(err.message || 'Failed to create jury case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Send to Community Jury</h2>
              <p className="text-blue-100">Let 12 random volunteers help make this decision</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Case Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Case Type</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setCaseType('content_review')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  caseType === 'content_review'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield className={`w-6 h-6 ${caseType === 'content_review' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className={`font-semibold ${caseType === 'content_review' ? 'text-blue-900' : 'text-gray-700'}`}>
                      Content Review
                    </div>
                    <div className="text-xs text-gray-600">Requires 7/12 votes</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setCaseType('user_ban')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  caseType === 'user_ban'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-6 h-6 ${caseType === 'user_ban' ? 'text-red-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className={`font-semibold ${caseType === 'user_ban' ? 'text-red-900' : 'text-gray-700'}`}>
                      User Ban
                    </div>
                    <div className="text-xs text-gray-600">Requires 12/12 unanimous</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className={`border-2 rounded-lg p-4 ${
            caseType === 'content_review'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {caseType === 'content_review' ? (
                <>
                  <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Content Review Process</p>
                    <p>
                      12 random volunteers will review the content. If at least 7 out of 12 vote the same way
                      (approve or reject), that decision becomes binding and you must align your final decision with the jury verdict.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">
                    <p className="font-semibold mb-1">User Ban Process</p>
                    <p>
                      Banning a user requires unanimous agreement from all 12 jury members. If all 12 vote to ban,
                      the decision is binding. This high threshold protects users from wrongful permanent removal.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Context Notes for Jury
              <span className="text-red-600 ml-1">*</span>
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Explain the situation, provide context, and help jurors understand why this case is difficult to decide. Be thorough and objective..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              These notes will be shown to all 12 jurors. Provide enough context for them to make an informed decision.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={loading || !adminNotes.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                'Creating Jury Case...'
              ) : (
                <>
                  <Scale className="w-5 h-5" />
                  Send to Jury Pool
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
