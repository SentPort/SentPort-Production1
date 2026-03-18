import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Scale, ArrowLeft, ThumbsUp, ThumbsDown, CheckCircle, XCircle,
  AlertTriangle, Clock, MessageSquare, Shield, Info
} from 'lucide-react';

interface JuryCase {
  id: string;
  case_id: string;
  content_id: string;
  platform: string;
  content_type: string;
  case_type: string;
  admin_notes: string;
  created_at: string;
  status: string;
}

interface JuryAssignment {
  id: string;
  decision: string | null;
  decision_notes: string;
  submitted_at: string | null;
}

export default function JuryCaseReview() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [juryCase, setJuryCase] = useState<JuryCase | null>(null);
  const [assignment, setAssignment] = useState<JuryAssignment | null>(null);
  const [contentData, setContentData] = useState<any>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (caseId && user) {
      fetchCaseData();
    }
  }, [caseId, user]);

  const fetchCaseData = async () => {
    if (!user || !caseId) return;

    setLoading(true);
    try {
      // Fetch jury case
      const { data: caseData, error: caseError } = await supabase
        .from('jury_cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;
      setJuryCase(caseData);

      // Fetch user's assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('jury_assignments')
        .select('*')
        .eq('case_id', caseId)
        .eq('juror_user_id', user.id)
        .maybeSingle();

      if (assignmentError) throw assignmentError;

      if (!assignmentData) {
        setError('You are not assigned to this case.');
        setLoading(false);
        return;
      }

      setAssignment(assignmentData);
      if (assignmentData.decision) {
        setDecision(assignmentData.decision as 'approve' | 'reject');
        setNotes(assignmentData.decision_notes || '');
      }

      // Fetch content based on platform
      let content = null;
      if (caseData.platform === 'hutube' && caseData.content_type === 'video') {
        const { data } = await supabase
          .from('hutube_videos')
          .select('title, description, thumbnail_url, video_url')
          .eq('id', caseData.content_id)
          .maybeSingle();
        content = data;
      } else if (caseData.platform === 'hinsta') {
        const { data } = await supabase
          .from('hinsta_posts')
          .select('caption, media_urls')
          .eq('id', caseData.content_id)
          .maybeSingle();
        content = data;
      } else if (caseData.platform === 'switter') {
        const { data } = await supabase
          .from('switter_tweets')
          .select('content, media_url')
          .eq('id', caseData.content_id)
          .maybeSingle();
        content = data;
      } else if (caseData.platform === 'hubook') {
        const { data } = await supabase
          .from('posts')
          .select('content, media_urls')
          .eq('id', caseData.content_id)
          .maybeSingle();
        content = data;
      }

      setContentData(content);
    } catch (err: any) {
      console.error('Error fetching case:', err);
      setError(err.message || 'Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDecision = async () => {
    if (!decision) {
      setError('Please select a decision before submitting.');
      return;
    }

    if (!notes.trim()) {
      setError('Please provide notes explaining your decision.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('jury_assignments')
        .update({
          decision,
          decision_notes: notes,
          submitted_at: new Date().toISOString()
        })
        .eq('id', assignment!.id);

      if (updateError) throw updateError;

      // Refresh assignment data
      await fetchCaseData();

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting decision:', err);
      setError(err.message || 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error && !juryCase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!juryCase) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Scale className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Jury Case: {juryCase.case_id}</h1>
              <p className="text-purple-100">You have been selected to serve on this community jury</p>
            </div>
          </div>
        </div>

        {assignment?.submitted_at ? (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-bold text-green-900 text-lg">Decision Submitted</h3>
                <p className="text-green-800">
                  You submitted your decision on {new Date(assignment.submitted_at).toLocaleString()}.
                  Thank you for your participation!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <h3 className="font-bold text-yellow-900 text-lg">Your Decision is Pending</h3>
                <p className="text-yellow-800">
                  Please review the content below and submit your decision. Your vote matters!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Case Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Case Information</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Platform:</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                {juryCase.platform}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Content Type:</span>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                {juryCase.content_type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Case Type:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                juryCase.case_type === 'content_review'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {juryCase.case_type === 'content_review' ? 'Content Review (7/12 required)' : 'User Ban (12/12 unanimous)'}
              </span>
            </div>
          </div>
        </div>

        {/* Admin Context */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Context from Moderator</h2>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5 whitespace-pre-wrap">
            {juryCase.admin_notes}
          </div>
        </div>

        {/* Content Under Review */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Content Under Review</h2>
          </div>
          {contentData ? (
            <div className="bg-gray-50 rounded-lg p-5">
              {contentData.title && (
                <h3 className="text-xl font-bold text-gray-900 mb-3">{contentData.title}</h3>
              )}
              {contentData.thumbnail_url && (
                <img
                  src={contentData.thumbnail_url}
                  alt="Content"
                  className="w-full max-w-2xl rounded-lg mb-4"
                />
              )}
              {contentData.media_urls?.[0] && (
                <img
                  src={contentData.media_urls[0]}
                  alt="Content"
                  className="w-full max-w-2xl rounded-lg mb-4"
                />
              )}
              {contentData.media_url && (
                <img
                  src={contentData.media_url}
                  alt="Content"
                  className="w-full max-w-2xl rounded-lg mb-4"
                />
              )}
              <p className="text-gray-800 whitespace-pre-wrap">
                {contentData.description || contentData.caption || contentData.content || 'No text content'}
              </p>
            </div>
          ) : (
            <p className="text-gray-600">Content not available</p>
          )}
        </div>

        {/* Decision Form */}
        {!assignment?.submitted_at && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Your Decision</h2>

            {/* Decision Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setDecision('approve')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  decision === 'approve'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <ThumbsUp className={`w-12 h-12 ${decision === 'approve' ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={`text-lg font-bold ${decision === 'approve' ? 'text-green-900' : 'text-gray-700'}`}>
                    APPROVE
                  </span>
                  <span className="text-sm text-gray-600 text-center">
                    Content should remain visible
                  </span>
                </div>
              </button>

              <button
                onClick={() => setDecision('reject')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  decision === 'reject'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <ThumbsDown className={`w-12 h-12 ${decision === 'reject' ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className={`text-lg font-bold ${decision === 'reject' ? 'text-red-900' : 'text-gray-700'}`}>
                    REJECT
                  </span>
                  <span className="text-sm text-gray-600 text-center">
                    Content should be removed
                  </span>
                </div>
              </button>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Explain Your Decision
                <span className="text-red-600 ml-1">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain your reasoning. Why did you make this decision? What factors did you consider? Be thoughtful and specific..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Your notes help moderators understand community perspectives and make better decisions.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6 text-red-800">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmitDecision}
              disabled={submitting || !decision || !notes.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {submitting ? (
                'Submitting Decision...'
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Submit Your Decision
                </>
              )}
            </button>
          </div>
        )}

        {/* Submitted Decision Display */}
        {assignment?.submitted_at && assignment.decision && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Submitted Decision</h2>
            <div className={`border-2 rounded-lg p-6 mb-4 ${
              assignment.decision === 'approve'
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                {assignment.decision === 'approve' ? (
                  <>
                    <ThumbsUp className="w-8 h-8 text-green-600" />
                    <span className="text-2xl font-bold text-green-900">APPROVE</span>
                  </>
                ) : (
                  <>
                    <ThumbsDown className="w-8 h-8 text-red-600" />
                    <span className="text-2xl font-bold text-red-900">REJECT</span>
                  </>
                )}
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-gray-800 italic">"{assignment.decision_notes}"</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
