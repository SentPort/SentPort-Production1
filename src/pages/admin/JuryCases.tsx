import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Scale, ArrowLeft, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Clock, AlertTriangle, User as UserIcon, MessageSquare,
  Calendar, ThumbsUp, ThumbsDown, Shield, Users
} from 'lucide-react';

interface JuryCase {
  id: string;
  case_id: string;
  content_id: string;
  platform: string;
  content_type: string;
  case_type: string;
  status: string;
  admin_notes: string;
  created_at: string;
  completed_at: string | null;
  final_verdict: string | null;
  created_by: string | null;
}

interface JuryAssignment {
  id: string;
  juror_user_id: string;
  decision: string | null;
  decision_notes: string;
  submitted_at: string | null;
  juror: {
    full_name: string;
    email: string;
  };
}

interface JuryDecision {
  approve_count: number;
  reject_count: number;
  pending_count: number;
  verdict_threshold_met: boolean;
  recommended_verdict: string | null;
}

interface ExtendedJuryCase extends JuryCase {
  assignments?: JuryAssignment[];
  decision?: JuryDecision;
  contentData?: any;
}

export default function JuryCases() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [cases, setCases] = useState<ExtendedJuryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [processingDecision, setProcessingDecision] = useState<string | null>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const { data: casesData, error } = await supabase
        .from('jury_cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch additional data for each case
      const enrichedCases = await Promise.all(
        (casesData || []).map(async (caseItem) => {
          // Fetch assignments with juror details
          const { data: assignments } = await supabase
            .from('jury_assignments')
            .select(`
              *,
              juror:user_profiles!jury_assignments_juror_user_id_fkey(full_name, email)
            `)
            .eq('case_id', caseItem.id);

          // Fetch decision tally
          const { data: decision } = await supabase
            .from('jury_case_decisions')
            .select('*')
            .eq('case_id', caseItem.id)
            .maybeSingle();

          // Fetch content preview based on platform
          let contentData = null;
          if (caseItem.platform === 'hutube' && caseItem.content_type === 'video') {
            const { data } = await supabase
              .from('hutube_videos')
              .select('title, description, thumbnail_url')
              .eq('id', caseItem.content_id)
              .maybeSingle();
            contentData = data;
          } else if (caseItem.platform === 'hinsta') {
            const { data } = await supabase
              .from('hinsta_posts')
              .select('caption, media_urls')
              .eq('id', caseItem.content_id)
              .maybeSingle();
            contentData = data;
          } else if (caseItem.platform === 'switter') {
            const { data } = await supabase
              .from('switter_tweets')
              .select('content')
              .eq('id', caseItem.content_id)
              .maybeSingle();
            contentData = data;
          } else if (caseItem.platform === 'hubook') {
            const { data } = await supabase
              .from('posts')
              .select('content')
              .eq('id', caseItem.content_id)
              .maybeSingle();
            contentData = data;
          }

          return {
            ...caseItem,
            assignments: assignments || [],
            decision,
            contentData
          };
        })
      );

      setCases(enrichedCases);
    } catch (error) {
      console.error('Error fetching jury cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeDecision = async (caseItem: ExtendedJuryCase, decision: 'approve' | 'reject') => {
    if (!userProfile?.id) return;

    // Check if jury verdict allows this decision
    if (caseItem.decision?.verdict_threshold_met && caseItem.decision.recommended_verdict !== decision) {
      alert(`The jury has reached a binding verdict to ${caseItem.decision.recommended_verdict}. You must align with their decision.`);
      return;
    }

    setProcessingDecision(caseItem.id);

    try {
      const now = new Date().toISOString();

      // Update jury case
      const { error: caseError } = await supabase
        .from('jury_cases')
        .update({
          final_verdict: decision === 'approve' ? 'approved' : 'rejected',
          admin_final_decision_by: userProfile.id,
          admin_final_decision_at: now,
          status: 'completed',
          completed_at: now
        })
        .eq('id', caseItem.id);

      if (caseError) throw caseError;

      // Update decision record
      const { error: decisionError } = await supabase
        .from('jury_case_decisions')
        .update({
          admin_final_decision: decision,
          decided_at: now,
          auto_enforced: true
        })
        .eq('case_id', caseItem.id);

      if (decisionError) throw decisionError;

      // Enforce the verdict on the content
      if (caseItem.platform === 'hutube' && caseItem.content_type === 'video') {
        await supabase
          .from('hutube_videos')
          .update({
            status: decision === 'approve' ? 'active' : 'removed',
            moderation_status: decision === 'approve' ? 'approved' : 'rejected'
          })
          .eq('id', caseItem.content_id);
      } else if (caseItem.platform === 'hinsta') {
        await supabase
          .from('hinsta_posts')
          .update({
            status: decision === 'approve' ? 'active' : 'removed',
            moderation_status: decision === 'approve' ? 'approved' : 'rejected'
          })
          .eq('id', caseItem.content_id);
      } else if (caseItem.platform === 'switter') {
        await supabase
          .from('switter_tweets')
          .update({
            status: decision === 'approve' ? 'active' : 'deleted',
            moderation_status: decision === 'approve' ? 'approved' : 'rejected'
          })
          .eq('id', caseItem.content_id);
      } else if (caseItem.platform === 'hubook') {
        await supabase
          .from('posts')
          .update({
            status: decision === 'approve' ? 'active' : 'deleted'
          })
          .eq('id', caseItem.content_id);
      }

      // Mark alert as reviewed
      await supabase
        .from('admin_report_alerts')
        .update({
          reviewed: true,
          reviewed_by: userProfile.id,
          reviewed_at: now
        })
        .eq('jury_case_id', caseItem.id);

      // Create review history entry
      await supabase
        .from('review_history')
        .insert({
          alert_id: caseItem.id,
          platform: caseItem.platform,
          content_preview: JSON.stringify(caseItem.contentData),
          review_outcome: decision === 'approve' ? 'approved' : 'removed',
          reviewed_by: userProfile.id,
          reviewed_at: now,
          jury_case_id: caseItem.id
        });

      // Notify all jurors of the final decision
      const jurorNotifications = (caseItem.assignments || []).map(assignment => ({
        user_id: assignment.juror_user_id,
        type: 'jury_decision_final',
        title: `Jury Case ${caseItem.case_id} Completed`,
        message: `The case you served on has been finalized. The final decision was to ${decision} the content. Thank you for your participation!`,
        link: `/jury/case/${caseItem.id}`,
        content_type: 'jury_case'
      }));

      await supabase.from('notifications').insert(jurorNotifications);

      await fetchCases();
    } catch (error) {
      console.error('Error finalizing decision:', error);
      alert('Failed to finalize decision. Please try again.');
    } finally {
      setProcessingDecision(null);
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.case_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.platform.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const paginatedCases = filteredCases.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredCases.length / pageSize);

  const stats = {
    total: cases.length,
    pending: cases.filter(c => c.status === 'pending').length,
    in_progress: cases.filter(c => c.status === 'in_progress').length,
    completed: cases.filter(c => c.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/admin/moderation-controls')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Moderation Controls
        </button>

        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <Scale className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Jury Cases</h1>
              <p className="text-purple-100">Review cases submitted to community juries and finalize decisions</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Total Cases</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Scale className="w-12 h-12 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{stats.in_progress}</p>
              </div>
              <Users className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by case ID or platform..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Cases List */}
        <div className="space-y-4">
          {paginatedCases.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Scale className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Jury Cases</h3>
              <p className="text-gray-600">No cases have been submitted to the community jury yet.</p>
            </div>
          ) : (
            paginatedCases.map((caseItem) => (
              <div key={caseItem.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedCase(expandedCase === caseItem.id ? null : caseItem.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{caseItem.case_id}</h3>
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                          {caseItem.platform} - {caseItem.content_type}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          caseItem.case_type === 'content_review'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {caseItem.case_type === 'content_review' ? 'Content Review' : 'User Ban'}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Created {new Date(caseItem.created_at).toLocaleDateString()}
                        </div>
                        {caseItem.decision && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4 text-green-600" />
                              <span className="font-semibold">{caseItem.decision.approve_count}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ThumbsDown className="w-4 h-4 text-red-600" />
                              <span className="font-semibold">{caseItem.decision.reject_count}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold">{caseItem.decision.pending_count}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
                        caseItem.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : caseItem.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {caseItem.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : caseItem.status === 'in_progress' ? (
                          <Users className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                        {caseItem.status.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {caseItem.decision?.verdict_threshold_met && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-semibold">
                          <Shield className="w-5 h-5" />
                          Verdict: {caseItem.decision.recommended_verdict}
                        </div>
                      )}
                      {expandedCase === caseItem.id ? (
                        <ChevronUp className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedCase === caseItem.id && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    {/* Admin Notes */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        Admin Context Notes
                      </h4>
                      <div className="bg-white rounded-lg p-4 text-gray-800 whitespace-pre-wrap">
                        {caseItem.admin_notes || 'No notes provided'}
                      </div>
                    </div>

                    {/* Content Preview */}
                    {caseItem.contentData && (
                      <div className="mb-6">
                        <h4 className="font-bold text-gray-900 mb-2">Content Under Review</h4>
                        <div className="bg-white rounded-lg p-4">
                          {caseItem.contentData.title && (
                            <div className="font-bold text-lg mb-2">{caseItem.contentData.title}</div>
                          )}
                          {caseItem.contentData.thumbnail_url && (
                            <img
                              src={caseItem.contentData.thumbnail_url}
                              alt="Content"
                              className="w-full max-w-md rounded-lg mb-3"
                            />
                          )}
                          {caseItem.contentData.media_urls?.[0] && (
                            <img
                              src={caseItem.contentData.media_urls[0]}
                              alt="Content"
                              className="w-full max-w-md rounded-lg mb-3"
                            />
                          )}
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {caseItem.contentData.description || caseItem.contentData.caption || caseItem.contentData.content || 'No content'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Juror Decisions */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-600" />
                        Juror Decisions ({caseItem.assignments?.filter(a => a.decision).length || 0}/12)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {caseItem.assignments?.map((assignment) => (
                          <div
                            key={assignment.id}
                            className={`rounded-lg p-4 border-2 ${
                              assignment.decision === 'approve'
                                ? 'bg-green-50 border-green-300'
                                : assignment.decision === 'reject'
                                ? 'bg-red-50 border-red-300'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-gray-600" />
                                <span className="font-semibold text-gray-900">
                                  {assignment.juror?.full_name || 'Juror'}
                                </span>
                              </div>
                              {assignment.decision ? (
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                  assignment.decision === 'approve'
                                    ? 'bg-green-200 text-green-900'
                                    : 'bg-red-200 text-red-900'
                                }`}>
                                  {assignment.decision.toUpperCase()}
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-200 text-gray-600">
                                  PENDING
                                </span>
                              )}
                            </div>
                            {assignment.decision_notes && (
                              <p className="text-sm text-gray-700 mt-2 italic">
                                "{assignment.decision_notes}"
                              </p>
                            )}
                            {assignment.submitted_at && (
                              <p className="text-xs text-gray-500 mt-2">
                                Submitted {new Date(assignment.submitted_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Verdict Summary */}
                    {caseItem.decision && caseItem.decision.pending_count === 0 && caseItem.status !== 'completed' && (
                      <div className="mb-6">
                        <div className={`border-2 rounded-lg p-6 ${
                          caseItem.decision.verdict_threshold_met
                            ? 'bg-purple-50 border-purple-300'
                            : 'bg-yellow-50 border-yellow-300'
                        }`}>
                          {caseItem.decision.verdict_threshold_met ? (
                            <>
                              <div className="flex items-center gap-3 mb-3">
                                <Shield className="w-8 h-8 text-purple-600" />
                                <div>
                                  <h4 className="font-bold text-purple-900 text-lg">Binding Verdict Reached</h4>
                                  <p className="text-purple-700">
                                    The jury recommends: <strong>{caseItem.decision.recommended_verdict?.toUpperCase()}</strong>
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm text-purple-800">
                                {caseItem.case_type === 'content_review'
                                  ? `${caseItem.decision.approve_count >= 7 ? caseItem.decision.approve_count : caseItem.decision.reject_count} out of 12 jurors voted to ${caseItem.decision.recommended_verdict}. This creates a binding verdict.`
                                  : 'All 12 jurors unanimously voted to ban this user. This creates a binding verdict.'}
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 mb-3">
                                <AlertTriangle className="w-8 h-8 text-yellow-600" />
                                <div>
                                  <h4 className="font-bold text-yellow-900 text-lg">No Binding Verdict</h4>
                                  <p className="text-yellow-700">
                                    Votes: {caseItem.decision.approve_count} Approve, {caseItem.decision.reject_count} Reject
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm text-yellow-800">
                                {caseItem.case_type === 'content_review'
                                  ? 'The jury did not reach the required 7/12 threshold. You may make the final decision based on your judgment.'
                                  : 'The jury did not reach unanimous agreement. The user cannot be banned without 12/12 votes.'}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Finalize Decision Buttons */}
                    {caseItem.status === 'completed' && caseItem.final_verdict ? (
                      <div className={`border-2 rounded-lg p-6 ${
                        caseItem.final_verdict === 'approved'
                          ? 'bg-green-50 border-green-300'
                          : 'bg-red-50 border-red-300'
                      }`}>
                        <div className="flex items-center gap-3">
                          {caseItem.final_verdict === 'approved' ? (
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          ) : (
                            <XCircle className="w-8 h-8 text-red-600" />
                          )}
                          <div>
                            <h4 className="font-bold text-lg">
                              Final Decision: {caseItem.final_verdict.toUpperCase()}
                            </h4>
                            <p className="text-sm text-gray-700">
                              Finalized on {new Date(caseItem.admin_final_decision_at!).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : caseItem.decision?.pending_count === 0 && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleFinalizeDecision(caseItem, 'approve')}
                          disabled={processingDecision === caseItem.id}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <CheckCircle className="w-6 h-6" />
                          Finalize: APPROVE
                        </button>
                        <button
                          onClick={() => handleFinalizeDecision(caseItem, 'reject')}
                          disabled={processingDecision === caseItem.id || (caseItem.case_type === 'user_ban' && !caseItem.decision?.verdict_threshold_met)}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <XCircle className="w-6 h-6" />
                          Finalize: REJECT
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredCases.length)} of{' '}
                {filteredCases.length} cases
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-purple-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
