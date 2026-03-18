import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, CheckCircle, FileText, AlertCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function ProposalsDashboard() {
  return (
    <PlatformGuard platform="blog">
      <ProposalsDashboardContent />
    </PlatformGuard>
  );
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  initiator_id: string;
  current_version: number;
  created_at: string;
  initiator: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  total_members: number;
  approved_members: number;
  my_status: string;
  is_initiator: boolean;
}

function ProposalsDashboardContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'active'>('received');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescindingId, setRescindingId] = useState<string | null>(null);
  const [showRescindModal, setShowRescindModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  useEffect(() => {
    if (user) {
      loadProposals();
    }
  }, [user, activeTab]);

  const loadProposals = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('blog_collaboration_proposal_members')
        .select(`
          proposal_id,
          status,
          is_initiator,
          blog_collaboration_proposals (
            id,
            title,
            description,
            status,
            initiator_id,
            current_version,
            created_at,
            initiator:initiator_id (
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('invitee_id', user.id);

      if (activeTab === 'received') {
        query = query.eq('is_initiator', false).in('status', ['invited', 'revision_requested']);
      } else if (activeTab === 'sent') {
        query = query.eq('is_initiator', true).neq('blog_collaboration_proposals.status', 'active');
      } else {
        query = query.eq('blog_collaboration_proposals.status', 'active');
      }

      const { data } = await query;

      if (data) {
        const proposalsWithCounts = await Promise.all(
          data.map(async (item: any) => {
            const proposal = item.blog_collaboration_proposals;

            const { count: totalMembers } = await supabase
              .from('blog_collaboration_proposal_members')
              .select('*', { count: 'exact', head: true })
              .eq('proposal_id', proposal.id);

            const { count: approvedMembers } = await supabase
              .from('blog_collaboration_proposal_members')
              .select('*', { count: 'exact', head: true })
              .eq('proposal_id', proposal.id)
              .eq('status', 'approved');

            return {
              ...proposal,
              total_members: totalMembers || 0,
              approved_members: approvedMembers || 0,
              my_status: item.status,
              is_initiator: item.is_initiator,
            };
          })
        );

        setProposals(proposalsWithCounts);
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRescindClick = (e: React.MouseEvent, proposal: Proposal) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProposal(proposal);
    setShowRescindModal(true);
  };

  const handleRescindConfirm = async () => {
    if (!selectedProposal) return;

    setRescindingId(selectedProposal.id);
    try {
      const { error } = await supabase.rpc('rescind_collaboration_proposal', {
        p_proposal_id: selectedProposal.id,
      });

      if (error) throw error;

      setShowRescindModal(false);
      setSelectedProposal(null);
      loadProposals();
    } catch (error) {
      console.error('Error rescinding proposal:', error);
      alert('Failed to rescind proposal. Please try again.');
    } finally {
      setRescindingId(null);
    }
  };

  const getStatusBadge = (proposal: Proposal) => {
    if (proposal.status === 'rescinded') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
          <XCircle className="w-3 h-3" />
          Rescinded
        </span>
      );
    }

    if (proposal.status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      );
    }

    if (proposal.my_status === 'invited') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
          <Clock className="w-3 h-3" />
          Needs Review
        </span>
      );
    }

    if (proposal.my_status === 'revision_requested') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
          <AlertCircle className="w-3 h-3" />
          Revision Needed
        </span>
      );
    }

    if (proposal.my_status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
          <CheckCircle className="w-3 h-3" />
          You Approved
        </span>
      );
    }

    return null;
  };

  return (
    <BlogLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-500" />
            <h1 className="text-3xl font-bold text-white">Collaboration Proposals</h1>
          </div>
          <Link
            to="/blog/collaborations"
            className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-all"
          >
            Back to Collaborations
          </Link>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'received'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:bg-slate-700'
            }`}
          >
            Received
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'sent'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:bg-slate-700'
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'active'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:bg-slate-700'
            }`}
          >
            Active
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No proposals yet</h3>
            <p className="text-gray-400 mb-6">
              {activeTab === 'received'
                ? 'You have no pending proposals to review'
                : activeTab === 'sent'
                ? 'You haven\'t sent any proposals yet'
                : 'You have no active collaborations'}
            </p>
            {activeTab === 'sent' && (
              <Link
                to="/blog/collaborations"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Create New Proposal
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="relative">
                <Link
                  to={`/blog/collaborations/proposal/${proposal.id}`}
                  className="block bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:border-purple-500/50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-white line-clamp-2 flex-1">
                      {proposal.title}
                    </h3>
                    {getStatusBadge(proposal)}
                  </div>

                <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                  {proposal.description}
                </p>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {proposal.initiator.display_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {proposal.is_initiator ? 'You initiated' : 'Initiator'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{proposal.total_members} members</span>
                  </div>
                  <div className="text-gray-400">
                    {proposal.approved_members}/{proposal.total_members} approved
                  </div>
                </div>

                  {proposal.current_version > 1 && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <p className="text-xs text-gray-500">
                        Version {proposal.current_version}
                      </p>
                    </div>
                  )}
                </Link>

                {activeTab === 'sent' &&
                  proposal.is_initiator &&
                  proposal.status === 'pending' && (
                    <button
                      onClick={(e) => handleRescindClick(e, proposal)}
                      disabled={rescindingId === proposal.id}
                      className="absolute top-4 right-4 px-3 py-1.5 bg-red-600/20 text-red-400 text-xs rounded-lg font-medium hover:bg-red-600/30 transition-all border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rescindingId === proposal.id ? 'Rescinding...' : 'Rescind'}
                    </button>
                  )}
              </div>
            ))}
          </div>
        )}

        {showRescindModal && selectedProposal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Rescind Proposal</h3>
                  <p className="text-sm text-gray-400">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-gray-300 mb-6">
                Are you sure you want to rescind the proposal "
                <span className="font-semibold text-white">{selectedProposal.title}</span>"?
                All invited members will be notified that this proposal has been withdrawn.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRescindModal(false);
                    setSelectedProposal(null);
                  }}
                  disabled={rescindingId === selectedProposal.id}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRescindConfirm}
                  disabled={rescindingId === selectedProposal.id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {rescindingId === selectedProposal.id ? 'Rescinding...' : 'Rescind Proposal'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BlogLayout>
  );
}
