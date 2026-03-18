import { X, AlertTriangle, Calendar, User, Eye, Tag as TagIcon, MessageSquare, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import ReviewCommentsModal from './ReviewCommentsModal';

interface ReviewHistoryItem {
  id: string;
  alert_id: string;
  post_id: string;
  platform: string;
  author_id: string | null;
  author_email: string | null;
  author_name: string;
  content_preview: string;
  full_content: string;
  report_ratio: number;
  total_engagements: number;
  total_reports: number;
  review_outcome: 'approved' | 'removed';
  reviewed_by: string;
  reviewed_at: string;
  created_at: string;
  tags?: ReviewTag[];
}

interface ReviewTag {
  id: string;
  tag_name: string;
}

interface AdminComment {
  id: string;
  review_id: string;
  commenter_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  commenter?: {
    full_name: string;
    email: string;
  };
}

interface Report {
  id: string;
  reporter_user_id: string;
  report_reason: string;
  reported_at: string;
  reporter?: {
    display_name: string;
    email?: string;
  };
}

interface PostDetailsModalProps {
  review: ReviewHistoryItem;
  onClose: () => void;
  onRefresh: () => void;
}

export default function PostDetailsModal({ review, onClose, onRefresh }: PostDetailsModalProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [reviewer, setReviewer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchDetails();
    fetchComments();
    getCurrentUser();
  }, [review.id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchDetails = async () => {
    try {
      // Fetch reports
      const { data: reportsData } = await supabase
        .from('post_reports')
        .select('*, reporter:hubook_profiles!reporter_user_id(*)')
        .eq('post_id', review.post_id);

      setReports(reportsData || []);

      // Fetch reviewer info
      const { data: reviewerData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', review.reviewed_by)
        .maybeSingle();

      setReviewer(reviewerData);
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('review_admin_comments')
        .select(`
          *,
          commenter:user_profiles!commenter_id(full_name, email)
        `)
        .eq('review_id', review.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUserId) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('review_admin_comments')
        .insert({
          review_id: review.id,
          commenter_id: currentUserId,
          comment_text: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      await fetchComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Review Details</h2>
            <p className="text-blue-100">Complete moderation record</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-1">Platform</div>
              <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-bold inline-block">
                {review.platform}
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-1">Decision</div>
              <span
                className={`px-4 py-2 rounded-full text-sm font-bold inline-block ${
                  review.review_outcome === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {review.review_outcome === 'approved' ? 'Approved' : 'Removed'}
              </span>
            </div>
          </div>

          {/* Author Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5" />
              Author Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-600">Name</div>
                <div className="text-gray-900">{review.author_name}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600">Email</div>
                <div className="text-gray-900">{review.author_email || 'Not available'}</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-gray-900 mb-3">Post Content</h3>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-gray-900 whitespace-pre-wrap">{review.full_content}</p>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-semibold">Report Ratio</span>
              </div>
              <div className="text-3xl font-bold text-red-700">
                {(review.report_ratio * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Eye className="w-5 h-5" />
                <span className="text-sm font-semibold">Engagements</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{review.total_engagements}</div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-semibold">Total Reports</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{review.total_reports}</div>
            </div>
          </div>

          {/* Tags */}
          {review.tags && review.tags.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <TagIcon className="w-5 h-5" />
                Custom Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {review.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold"
                  >
                    {tag.tag_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reports */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-gray-900 mb-3">
              Individual Reports ({reports.length})
            </h3>
            <div className="space-y-2">
              {reports.length === 0 ? (
                <p className="text-gray-500 text-sm">No report details available</p>
              ) : (
                reports.map((report: any) => (
                  <div key={report.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {report.reporter?.display_name || 'Anonymous'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{report.report_reason}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(report.reported_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Review Info */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Review Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-600">Reviewed By</div>
                <div className="text-gray-900">{reviewer?.full_name || 'Admin'}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600">Reviewed At</div>
                <div className="text-gray-900">
                  {new Date(review.reviewed_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Admin Comments Section */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Admin Comments
                {comments.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                    {comments.length}
                  </span>
                )}
              </h3>
              {comments.length > 3 && (
                <button
                  onClick={() => setShowAllComments(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  View All Comments
                </button>
              )}
            </div>

            {/* Latest 3 Comments */}
            {comments.length > 0 ? (
              <div className="space-y-3 mb-4">
                {comments.slice(0, 3).map((comment) => (
                  <div key={comment.id} className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {comment.commenter?.full_name?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-gray-900">
                            {comment.commenter?.full_name || 'Admin'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(comment.created_at)}
                            {comment.is_edited && (
                              <span className="ml-1 italic">(edited)</span>
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment_text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mb-4">No comments yet. Be the first to comment!</p>
            )}

            {/* New Comment Input */}
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment for other admins..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                rows={3}
                maxLength={1000}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">{newComment.length}/1000</span>
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
        </div>
      </div>

      {showAllComments && (
        <ReviewCommentsModal
          reviewId={review.id}
          onClose={() => {
            setShowAllComments(false);
            fetchComments();
          }}
        />
      )}
    </>
  );
}
