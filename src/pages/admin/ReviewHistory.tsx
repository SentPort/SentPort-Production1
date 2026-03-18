import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  History, Search, X, ChevronLeft, ChevronRight,
  Trash2, Plus, Tag as TagIcon, Filter, Download, MessageSquare, ArrowLeft
} from 'lucide-react';
import PostDetailsModal from '../../components/admin/PostDetailsModal';
import TagManagementModal from '../../components/admin/TagManagementModal';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';

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
  comment_count?: number;
}

interface ReviewTag {
  id: string;
  tag_name: string;
}

export default function ReviewHistory() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [reviews, setReviews] = useState<ReviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [pageInput, setPageInput] = useState('1');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'removed'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<ReviewTag[]>([]);

  // Modals
  const [selectedReviewForDetails, setSelectedReviewForDetails] = useState<ReviewHistoryItem | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchReviews();
    fetchAllTags();
  }, [currentPage, pageSize, statusFilter, platformFilter, emailSearch, selectedTagFilters]);

  const fetchAllTags = async () => {
    try {
      const { data, error } = await supabase
        .from('review_custom_tags')
        .select('*')
        .order('tag_name');

      if (error) throw error;
      setAllTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('review_history')
        .select('*', { count: 'exact' });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('review_outcome', statusFilter);
      }

      if (platformFilter !== 'all') {
        query = query.eq('platform', platformFilter);
      }

      if (emailSearch.trim()) {
        query = query.ilike('author_email', `%${emailSearch.trim()}%`);
      }

      // Calculate offset
      const offset = (currentPage - 1) * pageSize;

      const { data, error, count } = await query
        .order('reviewed_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      setTotalCount(count || 0);

      // Fetch tags and comment counts for each review
      const reviewsWithTags = await Promise.all(
        (data || []).map(async (review) => {
          const { data: tagData } = await supabase
            .from('review_tag_associations')
            .select('tag_id, review_custom_tags(id, tag_name)')
            .eq('review_id', review.id);

          const tags = (tagData || [])
            .map((t: any) => t.review_custom_tags)
            .filter(Boolean);

          // Fetch comment count
          const { count: commentCount } = await supabase
            .from('review_admin_comments')
            .select('*', { count: 'exact', head: true })
            .eq('review_id', review.id);

          return {
            ...review,
            tags,
            comment_count: commentCount || 0
          };
        })
      );

      // Apply tag filter if selected
      let filteredReviews = reviewsWithTags;
      if (selectedTagFilters.length > 0) {
        filteredReviews = reviewsWithTags.filter(review =>
          selectedTagFilters.some(tagId =>
            review.tags?.some(tag => tag.id === tagId)
          )
        );
      }

      setReviews(filteredReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSelectAll = () => {
    if (selectedReviews.size === reviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(reviews.map(r => r.id)));
    }
  };

  const handleSelectReview = (id: string) => {
    const newSelected = new Set(selectedReviews);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedReviews(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedReviews.size === 0) return;

    try {
      // Delete tag associations first
      await supabase
        .from('review_tag_associations')
        .delete()
        .in('review_id', Array.from(selectedReviews));

      // Delete reviews
      await supabase
        .from('review_history')
        .delete()
        .in('id', Array.from(selectedReviews));

      setSelectedReviews(new Set());
      setShowDeleteModal(false);
      fetchReviews();
    } catch (error) {
      console.error('Error deleting reviews:', error);
    }
  };

  const handleSingleDelete = async (id: string) => {
    setSelectedReviews(new Set([id]));
    setShowDeleteModal(true);
  };

  const handleGoToPage = () => {
    const page = parseInt(pageInput);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const clearAllFilters = () => {
    setStatusFilter('all');
    setPlatformFilter('all');
    setEmailSearch('');
    setSelectedTagFilters([]);
    setCurrentPage(1);
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/admin/moderation-controls')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Moderation Controls
        </button>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <History className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Review History</h1>
                <p className="text-blue-100">Complete archive of all moderation decisions</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold">{totalCount}</div>
              <div className="text-blue-100 text-sm">Total Reviews</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-bold text-gray-900">Filters</h2>
            {(statusFilter !== 'all' || platformFilter !== 'all' || emailSearch || selectedTagFilters.length > 0) && (
              <button
                onClick={clearAllFilters}
                className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="removed">Removed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Platform
              </label>
              <select
                value={platformFilter}
                onChange={(e) => {
                  setPlatformFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Platforms</option>
                <option value="HuBook">HuBook</option>
                <option value="Heddit">Heddit</option>
                <option value="HuTube">HuTube</option>
                <option value="Hinsta">Hinsta</option>
                <option value="Switter">Switter</option>
                <option value="HuBlog">HuBlog</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Author Email
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={emailSearch}
                  onChange={(e) => {
                    setEmailSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Custom Tags
              </label>
              <button
                onClick={() => setShowTagModal(true)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <TagIcon className="w-4 h-4" />
                Manage Tags
              </button>
            </div>
          </div>
        </div>

        {/* Selection Actions */}
        {selectedReviews.size > 0 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-bold text-blue-900">
                  {selectedReviews.size} review{selectedReviews.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedReviews(new Set())}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Clear Selection
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowTagModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-semibold"
                >
                  <TagIcon className="w-4 h-4" />
                  Tag Selected
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={reviews.length > 0 && selectedReviews.size === reviews.length}
                      onChange={handleSelectAll}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Author
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Content Preview
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Report Ratio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Reports
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Reviewed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reviews.map((review) => (
                  <tr
                    key={review.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('input, button')) return;
                      setSelectedReviewForDetails(review);
                    }}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedReviews.has(review.id)}
                        onChange={() => handleSelectReview(review.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {review.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-semibold text-gray-900">{review.author_name}</div>
                        <div className="text-sm text-gray-500">{review.author_email || 'No email'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="text-sm text-gray-900 truncate">{review.content_preview}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {review.tags && review.tags.length > 0 && (
                          <>
                            {review.tags.map(tag => (
                              <span
                                key={tag.id}
                                className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold"
                              >
                                {tag.tag_name}
                              </span>
                            ))}
                          </>
                        )}
                        {review.comment_count && review.comment_count > 0 && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {review.comment_count}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${
                          review.review_outcome === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {review.review_outcome === 'approved' ? 'Approved' : 'Removed'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-900">
                        {(review.report_ratio * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">{review.total_reports}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {new Date(review.reviewed_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(review.reviewed_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSingleDelete(review.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {reviews.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Reviews Found</h3>
              <p className="text-gray-600">
                {statusFilter !== 'all' || platformFilter !== 'all' || emailSearch || selectedTagFilters.length > 0
                  ? 'Try adjusting your filters'
                  : 'Review history will appear here once content is moderated'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {reviews.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} reviews
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">10 per page</option>
                    <option value="20">20 per page</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold text-gray-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Page</span>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGoToPage();
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">of {totalPages}</span>
                    <button
                      onClick={handleGoToPage}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
                    >
                      Go
                    </button>
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold text-gray-700"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedReviewForDetails && (
        <PostDetailsModal
          review={selectedReviewForDetails}
          onClose={() => setSelectedReviewForDetails(null)}
          onRefresh={fetchReviews}
        />
      )}

      {showTagModal && (
        <TagManagementModal
          selectedReviews={Array.from(selectedReviews)}
          allTags={allTags}
          onClose={() => {
            setShowTagModal(false);
            fetchReviews();
            fetchAllTags();
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmationModal
          count={selectedReviews.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
