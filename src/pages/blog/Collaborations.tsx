import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Plus, Clock, CheckCircle, XCircle, Sparkles, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function Collaborations() {
  return (
    <PlatformGuard platform="blog">
      <CollaborationsContent />
    </PlatformGuard>
  );
}

interface Collaboration {
  id: string;
  title: string;
  description: string;
  status: string;
  creator_id: string;
  created_at: string;
  is_proposal?: boolean;
  creator: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  member_count: number;
  post_count: number;
}

interface SearchedUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
}

function CollaborationsContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'invited' | 'discover'>('my');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollabTitle, setNewCollabTitle] = useState('');
  const [newCollabDescription, setNewCollabDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (user) {
      loadCollaborations();
    }
  }, [user, activeTab]);

  const enrichCollaboration = async (collab: any) => {
    const { count: memberCount } = await supabase
      .from('blog_collaboration_members')
      .select('*', { count: 'exact', head: true })
      .eq('collaboration_id', collab.id)
      .in('status', ['accepted', 'active']);

    return {
      ...collab,
      member_count: memberCount || 0,
      post_count: collab.published_post_id ? 1 : 0,
    };
  };

  const loadCollaborations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (activeTab === 'my') {
        const { data: memberData } = await supabase
          .from('blog_collaboration_members')
          .select('collaboration_id')
          .eq('user_id', user.id)
          .in('status', ['accepted', 'active']);

        const collabIds = memberData?.map((m) => m.collaboration_id) || [];

        if (collabIds.length > 0) {
          const { data } = await supabase
            .from('blog_collaborations')
            .select(`
              *,
              creator:creator_id (username, display_name, avatar_url)
            `)
            .in('id', collabIds)
            .order('created_at', { ascending: false });

          if (data) {
            const enriched = await Promise.all(data.map(enrichCollaboration));
            setCollaborations(enriched);
          }
        } else {
          setCollaborations([]);
        }
      } else if (activeTab === 'invited') {
        const { data: proposals } = await supabase
          .from('blog_collaboration_proposal_members')
          .select(`
            proposal_id,
            blog_collaboration_proposals (
              id,
              title,
              description,
              status,
              initiator_id,
              created_at,
              initiator:initiator_id (username, display_name, avatar_url)
            )
          `)
          .eq('invitee_id', user.id)
          .eq('status', 'invited');

        if (proposals) {
          const pendingProposals = proposals
            .filter((p: any) => p.blog_collaboration_proposals?.status === 'pending')
            .map((p: any) => ({
              ...p.blog_collaboration_proposals,
              creator: p.blog_collaboration_proposals?.initiator,
              member_count: 0,
              post_count: 0,
              is_proposal: true,
            }));
          setCollaborations(pendingProposals);
        }
      } else {
        const { data } = await supabase
          .from('blog_collaborations')
          .select(`
            *,
            creator:creator_id (username, display_name, avatar_url)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(20);

        if (data) {
          const enriched = await Promise.all(data.map(enrichCollaboration));
          setCollaborations(enriched);
        }
      }
    } catch (error) {
      console.error('Error loading collaborations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceSearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceSearch);
  }, [searchQuery]);

  const searchUsers = async (query: string) => {
    if (!user) return;

    setIsSearching(true);
    try {
      const { data } = await supabase
        .from('blog_accounts')
        .select('id, username, display_name, avatar_url, follower_count')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq('id', user.id)
        .limit(10);

      if (data) {
        const filteredData = data.filter(
          u => !selectedCollaborators.find(sc => sc.id === u.id)
        );
        setSearchResults(filteredData);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const addCollaborator = (user: SearchedUser) => {
    if (selectedCollaborators.length < 4) {
      setSelectedCollaborators([...selectedCollaborators, user]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeCollaborator = (userId: string) => {
    setSelectedCollaborators(selectedCollaborators.filter(u => u.id !== userId));
  };

  const createCollaboration = async () => {
    if (!user || !newCollabTitle.trim() || selectedCollaborators.length === 0) return;

    try {
      // Create the proposal
      const { data: proposal, error: proposalError } = await supabase
        .from('blog_collaboration_proposals')
        .insert({
          title: newCollabTitle.trim(),
          description: newCollabDescription.trim(),
          initiator_id: user.id,
          status: 'pending',
          max_participants: selectedCollaborators.length + 1,
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      if (proposal) {
        // Add initiator as approved member
        await supabase
          .from('blog_collaboration_proposal_members')
          .insert({
            proposal_id: proposal.id,
            invitee_id: user.id,
            status: 'approved',
            is_initiator: true,
          });

        // Add all selected collaborators as invited members
        const memberInserts = selectedCollaborators.map(collab => ({
          proposal_id: proposal.id,
          invitee_id: collab.id,
          status: 'invited',
          is_initiator: false,
        }));

        await supabase
          .from('blog_collaboration_proposal_members')
          .insert(memberInserts);

        // Create notifications for invited members
        const notificationInserts = selectedCollaborators.map(collab => ({
          recipient_id: collab.id,
          actor_id: user.id,
          type: 'collaboration_proposal',
          message: `invited you to collaborate on "${newCollabTitle.trim()}"`,
        }));

        await supabase.rpc('insert_blog_collaboration_notifications', {
          p_notifications: notificationInserts,
        });

        // Reset form and close modal
        setShowCreateModal(false);
        setNewCollabTitle('');
        setNewCollabDescription('');
        setSelectedCollaborators([]);
        setSearchQuery('');

        // Navigate to proposals page
        navigate('/blog/collaborations/proposals');
      }
    } catch (error) {
      console.error('Error creating collaboration proposal:', error);
      alert('Failed to create collaboration proposal. Please try again.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <BlogLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-white">Collaborations</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'my'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-300 hover:bg-gray-100'
            }`}
          >
            My Projects
          </button>
          <button
            onClick={() => setActiveTab('invited')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'invited'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-300 hover:bg-gray-100'
            }`}
          >
            Invitations
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'discover'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-300 hover:bg-gray-100'
            }`}
          >
            Discover
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : collaborations.length === 0 ? (
          <div className="bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-lg p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No collaborations yet</h3>
            <p className="text-gray-300 mb-6">
              {activeTab === 'my'
                ? 'Start a new collaboration project to work with other writers!'
                : activeTab === 'invited'
                ? 'You have no pending collaboration proposals'
                : 'No public collaborations available right now'}
            </p>
            {activeTab === 'my' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Your First Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collaborations.map((collab) => (
              <Link
                key={collab.id}
                to={collab.is_proposal ? `/blog/collaborations/proposal/${collab.id}` : `/blog/collaborations/workspace/${collab.id}`}
                className="bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-white line-clamp-2">{collab.title}</h3>
                  {getStatusIcon(collab.status)}
                </div>
                <p className="text-gray-300 text-sm line-clamp-2 mb-4">{collab.description}</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-sm">
                    {collab.creator.avatar_url ? (
                      <img
                        src={collab.creator.avatar_url}
                        alt={collab.creator.display_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      collab.creator.display_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {collab.creator.display_name}
                    </p>
                    <p className="text-xs text-gray-500">Creator</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{collab.member_count} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    <span>{collab.post_count} posts</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Collaboration</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Title
                </label>
                <input
                  type="text"
                  value={newCollabTitle}
                  onChange={(e) => setNewCollabTitle(e.target.value)}
                  placeholder="e.g., Anthology of Short Stories"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newCollabDescription}
                  onChange={(e) => setNewCollabDescription(e.target.value)}
                  placeholder="Describe your collaboration project..."
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Collaborators ({selectedCollaborators.length} of 4 selected)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for collaborators by name or username..."
                    disabled={selectedCollaborators.length >= 4}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-slate-700 border border-slate-600 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => addCollaborator(user)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-600 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.display_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            user.display_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {user.display_name}
                          </p>
                          <p className="text-xs text-gray-400">@{user.username}</p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {user.follower_count || 0} followers
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {isSearching && (
                  <p className="mt-2 text-sm text-gray-400">Searching...</p>
                )}
                {selectedCollaborators.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCollaborators.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 rounded-full"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.display_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            user.display_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="text-sm text-white">{user.display_name}</span>
                        <button
                          onClick={() => removeCollaborator(user.id)}
                          className="text-gray-300 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  You can invite up to 4 collaborators. Each will receive a notification to review and approve the proposal.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCollabTitle('');
                  setNewCollabDescription('');
                  setSelectedCollaborators([]);
                  setSearchQuery('');
                }}
                className="flex-1 px-4 py-2 border border-slate-600 text-gray-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={createCollaboration}
                disabled={!newCollabTitle.trim() || selectedCollaborators.length === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </BlogLayout>
  );
}
