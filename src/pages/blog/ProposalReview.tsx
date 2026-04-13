import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, CreditCard as Edit3, Users, Clock, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function ProposalReview() {
  return (
    <PlatformGuard platform="blog">
      <ProposalReviewContent />
    </PlatformGuard>
  );
}

interface ProposalMember {
  id: string;
  invitee_id: string;
  status: string;
  is_initiator: boolean;
  invitee: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface Revision {
  id: string;
  version_number: number;
  previous_title: string;
  previous_description: string;
  new_title: string;
  new_description: string;
  revision_notes: string;
  created_at: string;
  revised_by: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

function ProposalReviewContent() {
  const { proposalId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState<any>(null);
  const [members, setMembers] = useState<ProposalMember[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [myStatus, setMyStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionTitle, setRevisionTitle] = useState('');
  const [revisionDescription, setRevisionDescription] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRescindModal, setShowRescindModal] = useState(false);
  const [rescinding, setRescinding] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);

  useEffect(() => {
    if (user && proposalId) {
      loadProposal();
      loadMembers();
      loadRevisions();
    }
  }, [user, proposalId]);

  const loadProposal = async () => {
    if (!proposalId) return;

    try {
      const { data } = await supabase
        .from('blog_collaboration_proposals')
        .select(`
          *,
          initiator:initiator_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('id', proposalId)
        .single();

      if (data) {
        setProposal(data);
        setRevisionTitle(data.title);
        setRevisionDescription(data.description);
      }
    } catch (error) {
      console.error('Error loading proposal:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!proposalId || !user) return;

    try {
      const { data } = await supabase
        .from('blog_collaboration_proposal_members')
        .select(`
          *,
          invitee:invitee_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('proposal_id', proposalId);

      if (data) {
        setMembers(data);
        const myMembership = data.find((m: any) => m.invitee_id === user.id);
        if (myMembership) {
          setMyStatus(myMembership.status);
          setIsInitiator(myMembership.is_initiator);
        }
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadRevisions = async () => {
    if (!proposalId) return;

    try {
      const { data } = await supabase
        .from('blog_collaboration_proposal_revisions')
        .select(`
          *,
          revised_by:revised_by_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('proposal_id', proposalId)
        .order('version_number', { ascending: false });

      if (data) {
        setRevisions(data);
      }
    } catch (error) {
      console.error('Error loading revisions:', error);
    }
  };

  const sendCollabNotifications = async (
    recipients: ProposalMember[],
    message: string
  ) => {
    if (!user || recipients.length === 0) return;
    const notifications = recipients.map(m => ({
      recipient_id: m.invitee_id,
      actor_id: user.id,
      type: 'collaboration_proposal',
      message,
    }));
    await supabase.rpc('insert_blog_collaboration_notifications', {
      p_notifications: notifications,
    });
  };

  const handleApprove = async () => {
    if (!user || !proposalId) return;

    try {
      await supabase
        .from('blog_collaboration_proposal_members')
        .update({
          status: 'approved',
          responded_at: new Date().toISOString(),
        })
        .eq('proposal_id', proposalId)
        .eq('invitee_id', user.id);

      const otherMembers = members.filter(m => m.invitee_id !== user.id);
      await sendCollabNotifications(
        otherMembers,
        `approved the collaboration proposal "${proposal.title}"`
      );

      const { data: allMembers } = await supabase
        .from('blog_collaboration_proposal_members')
        .select('status, invitee_id, is_initiator')
        .eq('proposal_id', proposalId);

      const allApproved = allMembers?.every(m => m.status === 'approved');

      if (allApproved) {
        const { data: existingCollab } = await supabase
          .from('blog_collaborations')
          .select('id')
          .eq('proposal_id', proposalId)
          .maybeSingle();

        if (existingCollab) {
          navigate(`/blog/collaborations/workspace/${existingCollab.id}`);
          return;
        }

        const { data: collab } = await supabase
          .from('blog_collaborations')
          .insert({
            title: proposal.title,
            description: proposal.description,
            creator_id: proposal.initiator_id,
            status: 'active',
            proposal_id: proposalId,
            workspace_active: true,
          })
          .select()
          .single();

        if (collab) {
          const memberInserts = (allMembers || []).map(m => ({
            collaboration_id: collab.id,
            user_id: m.invitee_id,
            role: m.is_initiator ? 'creator' : 'editor',
            status: 'active',
          }));

          await supabase
            .from('blog_collaboration_members')
            .insert(memberInserts);

          await supabase
            .from('blog_collaboration_workspace_content')
            .insert({ collaboration_id: collab.id });

          await supabase
            .from('blog_collaboration_workspace_messages')
            .insert({
              collaboration_id: collab.id,
              sender_id: user.id,
              message_content: 'Collaboration has been activated! Start writing together.',
              message_type: 'system',
            });

          navigate(`/blog/collaborations/workspace/${collab.id}`);
        }
      } else {
        navigate('/blog/collaborations/proposals');
      }
    } catch (error) {
      console.error('Error approving proposal:', error);
      alert('Failed to approve proposal');
    }
  };

  const handleReject = async () => {
    if (!user || !proposalId) return;

    try {
      await supabase
        .from('blog_collaboration_proposal_members')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('proposal_id', proposalId)
        .eq('invitee_id', user.id);

      await supabase
        .from('blog_collaboration_proposals')
        .update({ status: 'rejected' })
        .eq('id', proposalId);

      const otherMembers = members.filter(m => m.invitee_id !== user.id);
      await sendCollabNotifications(
        otherMembers,
        `declined the collaboration proposal "${proposal.title}"`
      );

      navigate('/blog/collaborations/proposals');
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      alert('Failed to reject proposal');
    }
  };

  const handleRequestRevision = async () => {
    if (!user || !proposalId || !revisionNotes.trim()) return;
    if (revisionNotes.trim().length < 20) {
      alert('Please provide at least 20 characters explaining what needs to be revised');
      return;
    }

    try {
      // Create revision record
      await supabase
        .from('blog_collaboration_proposal_revisions')
        .insert({
          proposal_id: proposalId,
          revised_by_id: user.id,
          previous_title: proposal.title,
          previous_description: proposal.description,
          new_title: revisionTitle.trim(),
          new_description: revisionDescription.trim(),
          revision_notes: revisionNotes.trim(),
          version_number: (proposal.current_version || 1) + 1,
        });

      const otherMembers = members.filter(m => m.invitee_id !== user.id);
      await sendCollabNotifications(
        otherMembers,
        `revised the proposal "${proposal.title}"`
      );

      setShowRevisionModal(false);
      setRevisionNotes('');
      navigate('/blog/collaborations/proposals');
    } catch (error) {
      console.error('Error requesting revision:', error);
      alert('Failed to submit revision');
    }
  };

  const handleRescind = async () => {
    if (!proposalId) return;

    setRescinding(true);
    try {
      const { error } = await supabase.rpc('rescind_collaboration_proposal', {
        p_proposal_id: proposalId,
      });

      if (error) throw error;

      navigate('/blog/collaborations/proposals');
    } catch (error) {
      console.error('Error rescinding proposal:', error);
      alert('Failed to rescind proposal. Please try again.');
    } finally {
      setRescinding(false);
    }
  };

  const getMemberStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="text-xs text-green-400">Approved</span>;
      case 'invited':
        return <span className="text-xs text-yellow-400">Pending</span>;
      case 'revision_requested':
        return <span className="text-xs text-orange-400">Revision</span>;
      case 'rejected':
        return <span className="text-xs text-red-400">Rejected</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <BlogLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </BlogLayout>
    );
  }

  if (!proposal) {
    return (
      <BlogLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Proposal not found</h2>
          <Link to="/blog/collaborations/proposals" className="text-purple-400 hover:underline">
            Back to Proposals
          </Link>
        </div>
      </BlogLayout>
    );
  }

  const approvedCount = members.filter(m => m.status === 'approved').length;
  const totalCount = members.length;

  return (
    <BlogLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link
          to="/blog/collaborations/proposals"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Proposals
        </Link>

        <div className="bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{proposal.title}</h1>
              <div className="flex items-center gap-2">
                {proposal.current_version > 1 && (
                  <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                    Version {proposal.current_version}
                  </span>
                )}
                {proposal.status === 'rescinded' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                    <XCircle className="w-3 h-3" />
                    Rescinded
                  </span>
                )}
              </div>
            </div>
            {isInitiator && proposal.status === 'pending' && (
              <button
                onClick={() => setShowRescindModal(true)}
                className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg font-medium hover:bg-red-600/30 transition-all border border-red-500/30"
              >
                Rescind Proposal
              </button>
            )}
          </div>

          <p className="text-gray-300 mb-6 whitespace-pre-wrap">{proposal.description}</p>

          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-700">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
              {proposal.initiator.avatar_url ? (
                <img
                  src={proposal.initiator.avatar_url}
                  alt={proposal.initiator.display_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                proposal.initiator.display_name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{proposal.initiator.display_name}</p>
              <p className="text-xs text-gray-500">Initiator</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Collaborators ({approvedCount}/{totalCount} approved)
              </h3>
            </div>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-semibold">
                      {member.invitee.avatar_url ? (
                        <img
                          src={member.invitee.avatar_url}
                          alt={member.invitee.display_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        member.invitee.display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {member.invitee.display_name}
                        {member.is_initiator && (
                          <span className="ml-2 text-xs text-purple-400">(Initiator)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">@{member.invitee.username}</p>
                    </div>
                  </div>
                  {getMemberStatusBadge(member.status)}
                </div>
              ))}
            </div>
          </div>

          {proposal.status === 'rescinded' && (
            <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400 font-medium">
                This proposal has been rescinded by the initiator.
              </p>
            </div>
          )}

          {myStatus !== 'approved' && proposal.status !== 'rejected' && proposal.status !== 'rescinded' && (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
              >
                <CheckCircle className="w-5 h-5" />
                Approve
              </button>
              <button
                onClick={() => setShowRevisionModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-all"
              >
                <Edit3 className="w-5 h-5" />
                Request Revision
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            </div>
          )}

          {myStatus === 'approved' && proposal.status !== 'active' && (
            <div className="flex items-center gap-2 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400" />
              <p className="text-blue-400 font-medium">
                You've approved this proposal. Waiting for other collaborators...
              </p>
            </div>
          )}
        </div>

        {revisions.length > 0 && (
          <div className="bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Revision History
            </h2>
            <div className="space-y-4">
              {revisions.map((revision) => (
                <div key={revision.id} className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-semibold">
                        {revision.revised_by.avatar_url ? (
                          <img
                            src={revision.revised_by.avatar_url}
                            alt={revision.revised_by.display_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          revision.revised_by.display_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {revision.revised_by.display_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Version {revision.version_number} •{' '}
                          {new Date(revision.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm text-gray-400 mb-1">Revision Notes:</p>
                    <p className="text-sm text-white">{revision.revision_notes}</p>
                  </div>
                  {(revision.previous_title !== revision.new_title ||
                    revision.previous_description !== revision.new_description) && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <p className="text-xs text-gray-500 mb-2">Changes:</p>
                      {revision.previous_title !== revision.new_title && (
                        <div className="mb-2">
                          <p className="text-xs text-red-400 line-through">
                            {revision.previous_title}
                          </p>
                          <p className="text-xs text-green-400">{revision.new_title}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showRevisionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Request Revision</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Revised Title
                </label>
                <input
                  type="text"
                  value={revisionTitle}
                  onChange={(e) => setRevisionTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Revised Description
                </label>
                <textarea
                  value={revisionDescription}
                  onChange={(e) => setRevisionDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Revision Notes (min 20 characters)
                </label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Explain what needs to be changed and why..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none placeholder-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {revisionNotes.length}/20 characters
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRevisionModal(false);
                  setRevisionNotes('');
                }}
                className="flex-1 px-4 py-2 border border-slate-600 text-gray-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRevision}
                disabled={revisionNotes.trim().length < 20}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Revision
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <h2 className="text-2xl font-bold text-white">Reject Proposal?</h2>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to reject this collaboration proposal? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border border-slate-600 text-gray-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {showRescindModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Rescind Proposal</h2>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to rescind this proposal? All invited members will be
              notified that this proposal has been withdrawn.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRescindModal(false)}
                disabled={rescinding}
                className="flex-1 px-4 py-2 border border-slate-600 text-gray-300 rounded-lg font-semibold hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRescind}
                disabled={rescinding}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {rescinding ? 'Rescinding...' : 'Rescind Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </BlogLayout>
  );
}
