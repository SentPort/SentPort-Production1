import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Link as LinkIcon, Image as ImageIcon, Video, Trash2, CreditCard as Edit, Send, Calendar, Clock } from 'lucide-react';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';
import Toast from '../../components/heddit/Toast';

interface Draft {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  draft_updated_at: string;
  expires_at: string;
  media_urls: string[];
  media_types: string[];
  url: string;
  has_rich_formatting: boolean;
  subreddit_id: string;
  heddit_subreddits: {
    name: string;
    display_name: string;
  };
}

export default function Drafts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Check for toast message from navigation state
  useEffect(() => {
    const navigationToast = (location.state as any)?.toast;
    if (navigationToast) {
      setToast(navigationToast);
      // Clear the navigation state to prevent showing toast on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (user) {
      loadDrafts();
    }
  }, [user]);

  const loadDrafts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: hedditAccount } = await supabase
        .from('heddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!hedditAccount) {
        setDrafts([]);
        return;
      }

      const { data, error } = await supabase
        .from('heddit_posts')
        .select(`
          *,
          heddit_subreddits(name, display_name)
        `)
        .eq('author_id', hedditAccount.id)
        .eq('is_draft', true)
        .order('draft_updated_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('heddit_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDrafts(drafts.filter(d => d.id !== id));
      setShowDeleteConfirm(false);
      setDraftToDelete(null);
      setToast({ message: 'Draft deleted successfully', type: 'success' });
    } catch (error) {
      console.error('Error deleting draft:', error);
      setToast({ message: 'Failed to delete draft', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/heddit/create-post?draft=${id}`);
  };

  const getDaysUntilExpiration = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'link':
        return <LinkIcon className="w-5 h-5" />;
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getThumbnail = (draft: Draft) => {
    if (draft.media_urls && draft.media_urls.length > 0) {
      return draft.media_urls[0];
    }
    return null;
  };

  const getExcerpt = (content: string, hasRichFormatting: boolean) => {
    if (!content) return 'No content';

    if (hasRichFormatting) {
      const temp = document.createElement('div');
      temp.innerHTML = content;
      const text = temp.textContent || '';
      return text.substring(0, 150) + (text.length > 150 ? '...' : '');
    }

    return content.substring(0, 150) + (content.length > 150 ? '...' : '');
  };

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton backButtonPath="/heddit/feed">
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">My Drafts</h1>
              <div className="text-sm text-gray-600">
                {drafts.length} of 5 drafts
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <p className="mt-4 text-gray-600">Loading drafts...</p>
              </div>
            ) : drafts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No drafts yet</h2>
                <p className="text-gray-600 mb-6">
                  Start creating a post and save it as a draft to work on it later.
                </p>
                <button
                  onClick={() => navigate('/heddit/create-post')}
                  className="px-6 py-2 bg-orange-600 text-white rounded-full font-medium hover:bg-orange-700 transition-colors"
                >
                  Create Post
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft) => {
                  const daysLeft = getDaysUntilExpiration(draft.expires_at);
                  const thumbnail = getThumbnail(draft);

                  return (
                    <div
                      key={draft.id}
                      className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-4">
                        {thumbnail && (
                          <div className="flex-shrink-0">
                            <img
                              src={thumbnail}
                              alt=""
                              className="w-24 h-24 object-cover rounded-lg"
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="text-orange-600">
                                {getPostTypeIcon(draft.type)}
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {draft.title}
                              </h3>
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 mb-3">
                            h/{draft.heddit_subreddits.name}
                          </p>

                          {draft.content && (
                            <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                              {getExcerpt(draft.content, draft.has_rich_formatting)}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Created {new Date(draft.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Updated {new Date(draft.draft_updated_at).toLocaleDateString()}
                            </div>
                            <div className={`flex items-center gap-1 ${daysLeft < 7 ? 'text-red-600 font-medium' : ''}`}>
                              Expires in {daysLeft} days
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(draft.id)}
                              className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setDraftToDelete(draft.id);
                                setShowDeleteConfirm(true);
                              }}
                              disabled={deletingId === draft.id}
                              className="px-4 py-2 border border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              {deletingId === draft.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {showDeleteConfirm && draftToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Delete Draft?
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this draft? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDraftToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(draftToDelete)}
                    disabled={deletingId === draftToDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingId === draftToDelete ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      </HedditLayout>
    </PlatformGuard>
  );
}
