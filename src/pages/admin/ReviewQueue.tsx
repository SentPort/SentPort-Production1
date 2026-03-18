import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  AlertTriangle, CheckCircle, XCircle, MessageSquare,
  Heart, Share2, Eye, Calendar, User as UserIcon, ArrowLeft, Scale
} from 'lucide-react';
import SendToJuryModal from '../../components/admin/SendToJuryModal';

interface ReportAlert {
  id: string;
  post_id: string | null;
  content_id: string;
  content_type: string;
  platform: string;
  report_ratio: number;
  total_engagements: number;
  total_reports: number;
  flagged_at: string;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  jury_case_id: string | null;
}

interface ContentDetails {
  id: string;
  content?: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  created_at: string;
  author_id?: string;
  channel_id?: string;
  status: string;
}

interface AlertWithDetails extends ReportAlert {
  contentData?: ContentDetails;
  author?: any;
  reports?: any[];
}

export default function ReviewQueue() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [alerts, setAlerts] = useState<AlertWithDetails[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [juryModalAlert, setJuryModalAlert] = useState<AlertWithDetails | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('admin_report_alerts')
        .select('*')
        .order('flagged_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('reviewed', false);
      }

      const { data: alertsData, error } = await query;

      if (error) throw error;

      const enrichedAlerts = await Promise.all(
        (alertsData || []).map(async (alert) => {
          let contentData = null;
          let author = null;
          let reports: any[] = [];

          // Fetch content based on platform and content_type
          if (alert.platform === 'hutube' && alert.content_type === 'video') {
            // Fetch HuTube video
            const { data: videoData } = await supabase
              .from('hutube_videos')
              .select('*, channel:hutube_channels(*)')
              .eq('id', alert.content_id)
              .maybeSingle();

            if (videoData) {
              contentData = videoData;
              const channelData = Array.isArray(videoData.channel) ? videoData.channel[0] : videoData.channel;

              if (channelData?.user_id) {
                const { data: profileData } = await supabase
                  .from('user_profiles')
                  .select('*')
                  .eq('id', channelData.user_id)
                  .maybeSingle();

                author = {
                  ...channelData,
                  display_name: channelData.display_name,
                  profile_photo_url: channelData.avatar_url,
                  user_id: channelData.user_id,
                  full_name: profileData?.full_name
                };
              }
            }

            // Fetch video reports
            const { data: reportsData } = await supabase
              .from('platform_reports')
              .select('*, reporter:user_profiles!user_id(*)')
              .eq('platform', 'hutube')
              .eq('content_type', 'video')
              .eq('content_id', alert.content_id);

            reports = reportsData || [];
          } else if (alert.platform === 'hinsta' && alert.content_type === 'post') {
            // Fetch Hinsta post
            const { data: postData } = await supabase
              .from('hinsta_posts')
              .select('*')
              .eq('id', alert.content_id)
              .maybeSingle();

            contentData = postData;

            if (postData?.author_id) {
              const { data: accountData } = await supabase
                .from('hinsta_accounts')
                .select('*')
                .eq('user_id', postData.author_id)
                .maybeSingle();

              if (accountData) {
                const { data: profileData } = await supabase
                  .from('user_profiles')
                  .select('*')
                  .eq('id', postData.author_id)
                  .maybeSingle();

                author = {
                  ...accountData,
                  display_name: accountData.username,
                  profile_photo_url: accountData.profile_photo_url,
                  user_id: postData.author_id,
                  full_name: profileData?.full_name
                };
              }
            }

            // Fetch Hinsta post reports
            const { data: reportsData } = await supabase
              .from('platform_reports')
              .select('*, reporter:user_profiles!user_id(*)')
              .eq('platform', 'hinsta')
              .eq('content_type', 'post')
              .eq('content_id', alert.content_id);

            reports = reportsData || [];
          } else if (alert.platform === 'switter' && alert.content_type === 'tweet') {
            // Fetch Switter tweet
            const { data: tweetData } = await supabase
              .from('switter_tweets')
              .select('*')
              .eq('id', alert.content_id)
              .maybeSingle();

            contentData = tweetData;

            if (tweetData?.user_id) {
              const { data: accountData } = await supabase
                .from('switter_accounts')
                .select('*')
                .eq('user_id', tweetData.user_id)
                .maybeSingle();

              if (accountData) {
                const { data: profileData } = await supabase
                  .from('user_profiles')
                  .select('*')
                  .eq('id', tweetData.user_id)
                  .maybeSingle();

                author = {
                  ...accountData,
                  display_name: accountData.display_name || accountData.username,
                  profile_photo_url: accountData.avatar_url,
                  user_id: tweetData.user_id,
                  full_name: profileData?.full_name
                };
              }
            }

            // Fetch Switter tweet reports
            const { data: reportsData } = await supabase
              .from('platform_reports')
              .select('*, reporter:user_profiles!user_id(*)')
              .eq('platform', 'switter')
              .eq('content_type', 'tweet')
              .eq('content_id', alert.content_id);

            reports = reportsData || [];
          } else {
            // Fetch HuBook post (backward compatibility)
            const contentId = alert.content_id || alert.post_id;
            const { data: postData } = await supabase
              .from('posts')
              .select('*')
              .eq('id', contentId)
              .maybeSingle();

            contentData = postData;

            if (postData) {
              const { data: authorData } = await supabase
                .from('hubook_profiles')
                .select('*')
                .eq('id', postData.author_id)
                .maybeSingle();
              author = authorData;
            }

            // Fetch post reports
            const { data: reportsData } = await supabase
              .from('post_reports')
              .select('*, reporter:hubook_profiles!reporter_user_id(*)')
              .eq('post_id', contentId);

            reports = reportsData || [];
          }

          return {
            ...alert,
            contentData,
            author,
            reports
          };
        })
      );

      setAlerts(enrichedAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (alertId: string, contentId: string, approved: boolean) => {
    if (!userProfile) return;

    try {
      const reviewedAt = new Date().toISOString();
      const alert = alerts.find(a => a.id === alertId);

      if (!alert) return;

      // Get author email for search functionality
      let authorEmail = null;
      if (alert.author) {
        const authorUserId = alert.author.user_id || alert.author.id;
        const { data: userProfileData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('id', authorUserId)
          .maybeSingle();
        authorEmail = userProfileData?.email || null;
      }

      // Create content preview based on content type
      let contentPreview = 'Content unavailable';
      let fullContent = 'Content unavailable';

      if (alert.contentData) {
        if (alert.content_type === 'video') {
          contentPreview = alert.contentData.title?.substring(0, 200) || 'Video';
          fullContent = `${alert.contentData.title}\n\n${alert.contentData.description || ''}`;
        } else if (alert.platform === 'hinsta') {
          contentPreview = alert.contentData.caption?.substring(0, 200) || 'Hinsta Post';
          fullContent = alert.contentData.caption || 'Content unavailable';
        } else if (alert.platform === 'switter') {
          contentPreview = alert.contentData.content?.substring(0, 200) || 'Tweet';
          fullContent = alert.contentData.content || 'Content unavailable';
        } else {
          contentPreview = alert.contentData.content?.substring(0, 200) || 'Post';
          fullContent = alert.contentData.content || 'Content unavailable';
        }
      }

      // Create review history entry
      await supabase
        .from('review_history')
        .insert({
          alert_id: alertId,
          post_id: alert.content_type === 'post' ? contentId : null,
          platform: alert.platform,
          author_id: alert.author?.user_id || alert.author?.id || null,
          author_email: authorEmail,
          author_name: alert.author?.display_name || alert.author?.full_name || 'Unknown User',
          content_preview: contentPreview,
          full_content: fullContent,
          report_ratio: alert.report_ratio,
          total_engagements: alert.total_engagements,
          total_reports: alert.total_reports,
          review_outcome: approved ? 'approved' : 'removed',
          reviewed_by: userProfile.id,
          reviewed_at: reviewedAt
        });

      // Update alert as reviewed
      await supabase
        .from('admin_report_alerts')
        .update({
          reviewed: true,
          reviewed_by: userProfile.id,
          reviewed_at: reviewedAt
        })
        .eq('id', alertId);

      // Update content based on platform and content type
      if (alert.platform === 'hutube' && alert.content_type === 'video') {
        if (!approved) {
          await supabase
            .from('hutube_videos')
            .update({ status: 'removed', moderation_status: 'rejected' })
            .eq('id', contentId);

          // Notify video owner
          if (alert.author?.user_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: alert.author.user_id,
                type: 'content_review',
                title: 'Video Removed',
                message: 'Your video has been removed after admin review due to community reports.',
                link: '/hutube',
                content_type: 'hutube_video'
              });
          }
        } else {
          await supabase
            .from('hutube_videos')
            .update({ status: 'active', moderation_status: 'approved' })
            .eq('id', contentId);

          // Notify video owner
          if (alert.author?.user_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: alert.author.user_id,
                type: 'content_review',
                title: 'Video Approved',
                message: 'Your video has been reviewed and approved. It is now active again.',
                link: `/hutube/watch/${contentId}`,
                content_type: 'hutube_video'
              });
          }
        }
      } else if (alert.platform === 'hinsta' && alert.content_type === 'post') {
        if (!approved) {
          await supabase
            .from('hinsta_posts')
            .update({ status: 'removed', moderation_status: 'rejected' })
            .eq('id', contentId);

          // Notify post author
          if (alert.author?.user_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: alert.author.user_id,
                type: 'content_review',
                title: 'Post Removed',
                message: 'Your post has been removed after admin review due to community reports.',
                link: '/hinsta',
                content_type: 'hinsta_post'
              });
          }
        } else {
          await supabase
            .from('hinsta_posts')
            .update({ status: 'active', moderation_status: 'approved' })
            .eq('id', contentId);

          // Notify post author
          if (alert.author?.user_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: alert.author.user_id,
                type: 'content_review',
                title: 'Post Approved',
                message: 'Your post has been reviewed and approved. It is now active again.',
                link: '/hinsta',
                content_type: 'hinsta_post'
              });
          }
        }
      } else if (alert.platform === 'switter' && alert.content_type === 'tweet') {
        if (!approved) {
          await supabase
            .from('switter_tweets')
            .update({ status: 'deleted', moderation_status: 'rejected' })
            .eq('id', contentId);

          // Notify tweet author
          if (alert.author?.user_id) {
            await supabase
              .from('switter_notifications')
              .insert({
                user_id: alert.author.user_id,
                type: 'tweet_removed',
                content: 'Your tweet has been removed after admin review due to community reports.',
                tweet_id: contentId,
                created_at: new Date().toISOString(),
                read: false
              });
          }
        } else {
          await supabase
            .from('switter_tweets')
            .update({ status: 'active', moderation_status: 'approved' })
            .eq('id', contentId);

          // Notify tweet author
          if (alert.author?.user_id) {
            await supabase
              .from('switter_notifications')
              .insert({
                user_id: alert.author.user_id,
                type: 'tweet_approved',
                content: 'Your tweet has been reviewed and approved. It is now active again.',
                tweet_id: contentId,
                created_at: new Date().toISOString(),
                read: false
              });
          }
        }

        // Update flagged_post_notifications for Switter
        await supabase
          .from('flagged_post_notifications')
          .update({
            review_completed_at: reviewedAt,
            review_outcome: approved ? 'approved' : 'removed'
          })
          .eq('post_id', contentId)
          .eq('platform', 'switter')
          .is('review_completed_at', null);
      } else {
        // Handle HuBook posts (backward compatibility)
        if (!approved) {
          await supabase
            .from('posts')
            .update({ status: 'deleted' })
            .eq('id', contentId);

          await supabase
            .from('flagged_post_notifications')
            .update({
              review_completed_at: reviewedAt,
              review_outcome: 'removed'
            })
            .eq('post_id', contentId)
            .is('review_completed_at', null);
        } else {
          await supabase
            .from('posts')
            .update({ status: 'active', moderation_status: 'reviewed' })
            .eq('id', contentId);

          await supabase
            .from('flagged_post_notifications')
            .update({
              review_completed_at: reviewedAt,
              review_outcome: 'approved'
            })
            .eq('post_id', contentId)
            .is('review_completed_at', null);
        }
      }

      fetchAlerts();
    } catch (error) {
      console.error('Error reviewing alert:', error);
    }
  };

  const pendingCount = alerts.filter(a => !a.reviewed).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
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

        <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Review Queue</h1>
              <p className="text-red-100">Content flagged with high report ratios requiring admin review</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'pending'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Alerts ({alerts.length})
            </button>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">All Clear!</h3>
            <p className="text-gray-600">No content flagged for review at the moment.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex gap-4">
                      {alert.author?.profile_photo_url ? (
                        <img
                          src={alert.author.profile_photo_url}
                          alt={alert.author.display_name}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-xl">
                          {alert.author?.display_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-gray-900 text-lg">
                          {alert.author?.display_name || 'Unknown User'}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {alert.content_type === 'video' ? 'Uploaded' : 'Posted'} {new Date(alert.contentData?.created_at || '').toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            Flagged {new Date(alert.flagged_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div
                        className={`px-4 py-2 rounded-full font-bold ${
                          alert.reviewed
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {alert.reviewed ? 'Reviewed' : 'Pending Review'}
                      </div>
                      <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                        {alert.platform} - {alert.content_type}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    {alert.content_type === 'video' && alert.contentData ? (
                      <div>
                        {alert.contentData.thumbnail_url && (
                          <img
                            src={alert.contentData.thumbnail_url}
                            alt={alert.contentData.title}
                            className="w-full max-w-md rounded-lg mb-3"
                          />
                        )}
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{alert.contentData.title || 'Untitled Video'}</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{alert.contentData.description || 'No description'}</p>
                      </div>
                    ) : alert.platform === 'hinsta' && alert.contentData ? (
                      <div>
                        {alert.contentData.media_url && (
                          <img
                            src={alert.contentData.media_url}
                            alt="Post media"
                            className="w-full max-w-md rounded-lg mb-3"
                          />
                        )}
                        {alert.contentData.media_urls && Array.isArray(alert.contentData.media_urls) && alert.contentData.media_urls.length > 0 && (
                          <img
                            src={alert.contentData.media_urls[0]}
                            alt="Post media"
                            className="w-full max-w-md rounded-lg mb-3"
                          />
                        )}
                        <p className="text-gray-900 whitespace-pre-wrap">{alert.contentData.caption || 'No caption'}</p>
                      </div>
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap">{alert.contentData?.content || 'Content unavailable'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-600 mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-sm font-semibold">Report Ratio</span>
                      </div>
                      <div className="text-3xl font-bold text-red-700">
                        {(alert.report_ratio * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-purple-600 mb-2">
                        <Eye className="w-5 h-5" />
                        <span className="text-sm font-semibold">Engagements</span>
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{alert.total_engagements}</div>
                    </div>

                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-orange-600 mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-sm font-semibold">Reports</span>
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{alert.total_reports}</div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <UserIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold">Reporters</span>
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{alert.reports?.length || 0}</div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-900">
                        Report Details ({alert.reports?.length || 0})
                      </h4>
                      <button
                        onClick={() => setSelectedAlert(selectedAlert === alert.id ? null : alert.id)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        {selectedAlert === alert.id ? 'Hide' : 'View'} Details
                      </button>
                    </div>

                    {selectedAlert === alert.id && (
                      <div className="space-y-2 mb-4">
                        {alert.reports?.map((report: any) => (
                          <div key={report.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {report.reporter?.display_name || report.reporter?.full_name || 'Anonymous'}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">{report.report_reason || report.reason}</div>
                                {report.description && (
                                  <div className="text-sm text-gray-500 mt-1 italic">{report.description}</div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(report.reported_at || report.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!alert.reviewed && !alert.jury_case_id && (
                      <div className="space-y-3 mt-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReview(alert.id, alert.content_id, true)}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Approve Content
                          </button>
                          <button
                            onClick={() => handleReview(alert.id, alert.content_id, false)}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                            Remove Content
                          </button>
                        </div>
                        <button
                          onClick={() => setJuryModalAlert(alert)}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                        >
                          <Scale className="w-5 h-5" />
                          Send to Community Jury
                        </button>
                      </div>
                    )}

                    {alert.jury_case_id && (
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mt-4">
                        <div className="flex items-center gap-3">
                          <Scale className="w-6 h-6 text-purple-600" />
                          <div>
                            <div className="font-semibold text-purple-900">Sent to Community Jury</div>
                            <div className="text-sm text-purple-700 mt-1">
                              This case has been submitted to a jury of 12 community volunteers for review.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {alert.reviewed && alert.reviewed_at && (
                      <div className="bg-gray-50 rounded-lg p-4 mt-4">
                        <div className="text-sm font-semibold text-gray-900 mb-1">Reviewed</div>
                        <div className="text-sm text-gray-600">
                          {new Date(alert.reviewed_at).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {juryModalAlert && (
        <SendToJuryModal
          alert={juryModalAlert}
          onClose={() => setJuryModalAlert(null)}
          onSuccess={() => {
            setJuryModalAlert(null);
            fetchAlerts();
          }}
        />
      )}
    </div>
  );
}
