import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Clock, Trash2, Send, Calendar, AlertCircle } from 'lucide-react';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

const MAX_DRAFTS = 10;

export default function Drafts() {
  return (
    <PlatformGuard platform="blog">
      <DraftsContent />
    </PlatformGuard>
  );
}

interface Draft {
  id: string;
  title: string;
  content: string;
  created_at: string;
  draft_updated_at: string;
  expires_at: string;
  word_count: number;
  is_screenplay: boolean;
  interests: Array<{
    interest: {
      name: string;
    };
  }>;
}

function DraftsContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDrafts();
    }
  }, [user]);

  const loadDrafts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          id,
          title,
          content,
          created_at,
          draft_updated_at,
          expires_at,
          word_count,
          is_screenplay,
          interests:blog_post_interests(
            interest:blog_interests(name)
          )
        `)
        .eq('account_id', user.id)
        .eq('is_draft', true)
        .order('draft_updated_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (err) {
      console.error('Error loading drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getExcerpt = (content: string) => {
    const plainText = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ').trim();
    return plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
  };

  const getDaysUntilExpiration = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleContinueWriting = (draftId: string) => {
    navigate(`/blog/create-post?draft=${draftId}`);
  };

  const handleDeleteClick = (draftId: string) => {
    setDraftToDelete(draftId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!draftToDelete) return;

    setDeletingId(draftToDelete);
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', draftToDelete);

      if (error) throw error;

      setDrafts(drafts.filter(d => d.id !== draftToDelete));
      setShowDeleteModal(false);
      setDraftToDelete(null);
    } catch (err) {
      console.error('Error deleting draft:', err);
      alert('Failed to delete draft. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublishNow = async (draftId: string) => {
    setPublishingId(draftId);
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          is_draft: false,
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', draftId);

      if (error) throw error;

      setDrafts(drafts.filter(d => d.id !== draftId));
      navigate(`/blog/post/${draftId}`);
    } catch (err) {
      console.error('Error publishing draft:', err);
      alert('Failed to publish draft. Please try again.');
    } finally {
      setPublishingId(null);
    }
  };

  if (loading) {
    return (
      <BlogLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        </div>
      </BlogLayout>
    );
  }

  return (
    <BlogLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Drafts</h1>
          <p className="text-gray-600">
            {drafts.length} of {MAX_DRAFTS} drafts • Drafts expire after 60 days
          </p>
        </div>

        {drafts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No drafts yet</h2>
            <p className="text-gray-600 mb-6">
              Start writing and your work will be automatically saved here every 30 seconds.
            </p>
            <button
              onClick={() => navigate('/blog/create-post')}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Start Writing
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => {
              const daysLeft = getDaysUntilExpiration(draft.expires_at);
              const isExpiringSoon = daysLeft <= 7;

              return (
                <div
                  key={draft.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  {isExpiringSoon && (
                    <div className="flex items-center gap-2 text-amber-600 mb-3 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">
                        Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {draft.title || 'Untitled Draft'}
                  </h3>

                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {getExcerpt(draft.content)}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Last saved {formatDate(draft.draft_updated_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Created {formatDate(draft.created_at)}</span>
                    </div>
                    <span>{draft.word_count} words</span>
                    {draft.is_screenplay && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        Screenplay
                      </span>
                    )}
                  </div>

                  {draft.interests && draft.interests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {draft.interests.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm"
                        >
                          {item.interest.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleContinueWriting(draft.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Continue Writing
                    </button>
                    <button
                      onClick={() => handlePublishNow(draft.id)}
                      disabled={publishingId === draft.id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {publishingId === draft.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Publish Now
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(draft.id)}
                      disabled={deletingId === draft.id}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Draft?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. Your draft will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDraftToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!!deletingId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId ? 'Deleting...' : 'Delete Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </BlogLayout>
  );
}
