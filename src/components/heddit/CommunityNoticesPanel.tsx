import { useState } from 'react';
import { Megaphone, Pencil, Trash2, Send, X, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const MAX_NOTICES = 15;
const MAX_CONTENT_LENGTH = 2000;

export interface CommunityNotice {
  id: string;
  subreddit_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  heddit_accounts: {
    username: string;
    display_name: string;
  };
}

interface Props {
  subredditId: string;
  notices: CommunityNotice[];
  isModerator: boolean;
  currentAccountId: string | null;
  onNoticesChange: (notices: CommunityNotice[]) => void;
}

export default function CommunityNoticesPanel({
  subredditId,
  notices,
  isModerator,
  currentAccountId,
  onNoticesChange,
}: Props) {
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handlePostNotice = async () => {
    if (!newContent.trim() || !currentAccountId) return;

    if (notices.length >= MAX_NOTICES) {
      setSubmitError(`This community has reached the maximum of ${MAX_NOTICES} notices. Please delete an older notice before posting a new one.`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const { data, error } = await supabase
      .from('heddit_community_notices')
      .insert({
        subreddit_id: subredditId,
        author_id: currentAccountId,
        content: newContent.trim(),
      })
      .select(`
        *,
        heddit_accounts(username, display_name)
      `)
      .single();

    if (error) {
      setSubmitError('Failed to post notice. Please try again.');
      setSubmitting(false);
      return;
    }

    if (data) {
      onNoticesChange([...notices, data]);
      setNewContent('');
    }
    setSubmitting(false);
  };

  const handleStartEdit = (notice: CommunityNotice) => {
    setEditingId(notice.id);
    setEditContent(notice.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (noticeId: string) => {
    if (!editContent.trim()) return;

    setSavingEdit(true);

    const { data, error } = await supabase
      .from('heddit_community_notices')
      .update({ content: editContent.trim() })
      .eq('id', noticeId)
      .select(`
        *,
        heddit_accounts(username, display_name)
      `)
      .single();

    if (error) {
      setSavingEdit(false);
      return;
    }

    if (data) {
      onNoticesChange(notices.map(n => n.id === noticeId ? data : n));
    }

    setEditingId(null);
    setEditContent('');
    setSavingEdit(false);
  };

  const handleDeleteNotice = async (noticeId: string) => {
    setDeletingId(noticeId);

    const { error } = await supabase
      .from('heddit_community_notices')
      .delete()
      .eq('id', noticeId);

    if (!error) {
      onNoticesChange(notices.filter(n => n.id !== noticeId));
    }

    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 flex items-center gap-2">
        <Megaphone size={16} className="text-orange-600 flex-shrink-0" />
        <h3 className="font-bold text-orange-900 text-sm">Moderator Notices</h3>
        {notices.length > 0 && (
          <span className="ml-auto text-xs text-orange-600 font-medium">
            {notices.length}/{MAX_NOTICES}
          </span>
        )}
      </div>

      {isModerator && (
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <textarea
            value={newContent}
            onChange={(e) => {
              setNewContent(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            placeholder="Write a notice for this community..."
            rows={3}
            maxLength={MAX_CONTENT_LENGTH}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
          <div className="flex items-center justify-between mt-2 gap-2">
            <span className="text-xs text-gray-400">
              {newContent.length}/{MAX_CONTENT_LENGTH}
            </span>
            <button
              onClick={handlePostNotice}
              disabled={!newContent.trim() || submitting}
              className="flex items-center gap-1.5 bg-orange-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={14} />
              {submitting ? 'Posting...' : 'Share Notice'}
            </button>
          </div>
          {submitError && (
            <div className="mt-2 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {notices.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            No moderator notices yet.
          </div>
        ) : (
          notices.map((notice) => (
            <div key={notice.id} className="p-4">
              {editingId === notice.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    maxLength={MAX_CONTENT_LENGTH}
                    className="w-full text-sm border border-orange-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{editContent.length}/{MAX_CONTENT_LENGTH}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                      >
                        <X size={12} />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(notice.id)}
                        disabled={!editContent.trim() || savingEdit}
                        className="flex items-center gap-1 text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 disabled:opacity-50 transition-colors"
                      >
                        <Check size={12} />
                        {savingEdit ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                    {notice.content}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-gray-500">
                      <span className="font-medium text-orange-700">
                        u/{notice.heddit_accounts?.username || 'moderator'}
                      </span>
                      <span className="mx-1">·</span>
                      <span>
                        {new Date(notice.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {notice.updated_at !== notice.created_at && (
                        <span className="italic ml-1">(edited)</span>
                      )}
                    </div>
                    {isModerator && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(notice)}
                          className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                          title="Edit notice"
                        >
                          <Pencil size={13} />
                        </button>
                        {confirmDeleteId === notice.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-600 font-medium">Delete?</span>
                            <button
                              onClick={() => handleDeleteNotice(notice.id)}
                              disabled={deletingId === notice.id}
                              className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded hover:bg-red-700 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-300 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(notice.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete notice"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
