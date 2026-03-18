import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, TrendingUp, MessageSquare, Share2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useHuBook } from '../../../contexts/HuBookContext';

export default function ModerationDashboard() {
  const { hubookProfile } = useHuBook();
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchQueue();
  }, [filter]);

  const fetchQueue = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('moderation_queue')
        .select(`
          *,
          posts (
            id,
            content,
            created_at,
            author_id,
            privacy,
            status
          )
        `)
        .order('flagged_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('review_status', 'pending');
      }

      const { data, error } = await query;

      if (error) throw error;

      const itemsWithDetails = await Promise.all(
        (data || []).map(async (item) => {
          const [authorRes, reportsRes, metricsRes, mediaRes] = await Promise.all([
            supabase
              .from('hubook_profiles')
              .select('*')
              .eq('id', item.posts.author_id)
              .single(),
            supabase
              .from('post_reports')
              .select('*, reporter:hubook_profiles!reporter_user_id(*)')
              .eq('post_id', item.post_id),
            supabase
              .from('post_engagement_metrics')
              .select('*')
              .eq('post_id', item.post_id)
              .single(),
            supabase
              .from('post_media')
              .select('*')
              .eq('post_id', item.post_id)
          ]);

          return {
            ...item,
            author: authorRes.data,
            reports: reportsRes.data || [],
            metrics: metricsRes.data,
            media: mediaRes.data || []
          };
        })
      );

      setQueueItems(itemsWithDetails);
    } catch (error) {
      console.error('Error fetching moderation queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (queueItemId: string, postId: string, decision: 'approved' | 'rejected') => {
    if (!hubookProfile) return;

    try {
      await supabase
        .from('moderation_queue')
        .update({
          review_status: decision,
          reviewed_by: hubookProfile.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: reviewNotes || null
        })
        .eq('id', queueItemId);

      if (decision === 'approved') {
        await supabase
          .from('posts')
          .update({
            status: 'active',
            moderation_status: 'reviewed'
          })
          .eq('id', postId);
      } else {
        await supabase
          .from('posts')
          .update({
            status: 'deleted',
            moderation_status: 'reviewed'
          })
          .eq('id', postId);
      }

      setReviewNotes('');
      setSelectedPost(null);
      fetchQueue();
    } catch (error) {
      console.error('Error reviewing post:', error);
      alert('Failed to process review');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg shadow-lg p-6 mb-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-1">Content Moderation Dashboard</h1>
            <p className="text-red-100">Review flagged content and maintain community standards</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending ({queueItems.filter((i) => i.review_status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Items ({queueItems.length})
          </button>
        </div>
      </div>

      {queueItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clear!</h3>
          <p className="text-gray-600">No posts in the moderation queue at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queueItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-3">
                    {item.author?.profile_photo_url ? (
                      <img
                        src={item.author.profile_photo_url}
                        alt={item.author.display_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                        {item.author?.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="font-semibold text-gray-900">{item.author?.display_name}</div>
                      <div className="text-sm text-gray-500">
                        Posted on {new Date(item.posts.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Flagged on {new Date(item.flagged_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      item.review_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : item.review_status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.review_status.charAt(0).toUpperCase() + item.review_status.slice(1)}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-900 whitespace-pre-wrap">{item.posts.content}</p>

                  {item.media.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {item.media.map((media: any) => (
                        <img
                          key={media.id}
                          src={media.media_url}
                          alt="Post media"
                          className="w-full h-32 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs font-medium">Reactions</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{item.metrics?.total_reactions || 0}</div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs font-medium">Comments</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{item.metrics?.total_comments || 0}</div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-purple-600 mb-1">
                      <Share2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Shares</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{item.metrics?.total_shares || 0}</div>
                  </div>

                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-600 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-medium">Reports</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{item.metrics?.report_count || 0}</div>
                    <div className="text-xs text-red-600 font-semibold mt-1">
                      Ratio: {((item.metrics?.report_ratio || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Reports ({item.reports.length})</h4>
                    <button
                      onClick={() => setSelectedPost(selectedPost === item.id ? null : item.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {selectedPost === item.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>

                  {selectedPost === item.id && (
                    <div className="space-y-2 mb-4">
                      {item.reports.map((report: any) => (
                        <div key={report.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-sm text-gray-900">
                                {report.reporter?.display_name || 'Unknown User'}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">{report.report_reason}</div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(report.reported_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.review_status === 'pending' && (
                    <div className="space-y-3">
                      <textarea
                        value={selectedPost === item.id ? reviewNotes : ''}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Add review notes (optional)..."
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReview(item.id, item.post_id, 'approved')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Approve & Restore
                        </button>
                        <button
                          onClick={() => handleReview(item.id, item.post_id, 'rejected')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="w-5 h-5" />
                          Delete Permanently
                        </button>
                      </div>
                    </div>
                  )}

                  {item.review_status !== 'pending' && item.reviewer_notes && (
                    <div className="bg-gray-50 rounded-lg p-3 mt-3">
                      <div className="text-sm font-medium text-gray-900 mb-1">Review Notes:</div>
                      <div className="text-sm text-gray-600">{item.reviewer_notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
