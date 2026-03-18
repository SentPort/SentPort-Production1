import { useEffect, useState } from 'react';
import { CreditCard as Edit, Trash2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';
import { formatDistanceToNow } from '../../lib/platformHelpers';

interface Draft {
  id: string;
  content: string;
  media_urls: string[] | null;
  schedule_for: string | null;
  is_thread: boolean;
  created_at: string;
  updated_at: string;
}

export default function Drafts() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    if (!user) return;

    setLoading(true);

    const { data: account } = await supabase
      .from('switter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('switter_drafts')
      .select('*')
      .eq('account_id', account.id)
      .order('updated_at', { ascending: false });

    if (data) setDrafts(data);
    setLoading(false);
  };

  const deleteDraft = async (draftId: string) => {
    if (!confirm('Delete this draft?')) return;

    await supabase
      .from('switter_drafts')
      .delete()
      .eq('id', draftId);

    loadDrafts();
  };

  const publishDraft = async (draft: Draft) => {
    if (!user) return;

    const { data: account } = await supabase
      .from('switter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) return;

    await supabase
      .from('switter_tweets')
      .insert({
        author_id: account.id,
        content: draft.content,
        media_urls: draft.media_urls
      });

    await supabase
      .from('switter_drafts')
      .delete()
      .eq('id', draft.id);

    loadDrafts();
  };

  if (loading) {
    return (
      <PlatformGuard platform="switter" redirectTo="/switter/join">
        <SwitterLayout showBackButton>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </SwitterLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="switter" redirectTo="/switter/join">
      <SwitterLayout showBackButton>
        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="border-b border-gray-200 sticky top-0 bg-white z-10 px-4 py-3">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Drafts
            </h1>
          </div>

          {drafts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Edit className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No drafts yet</p>
              <p className="text-sm mt-1">Start writing and save as draft</p>
            </div>
          ) : (
            <div>
              {drafts.map((draft) => (
                <div key={draft.id} className="border-b border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-2">
                        {draft.is_thread && <span className="font-medium">Thread · </span>}
                        Last edited {formatDistanceToNow(draft.updated_at)}
                      </p>
                      <p className="whitespace-pre-wrap mb-2">{draft.content}</p>
                      {draft.media_urls && draft.media_urls.length > 0 && (
                        <div className="flex gap-2 mb-2">
                          {draft.media_urls.slice(0, 4).map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt=""
                              className="w-20 h-20 rounded object-cover"
                            />
                          ))}
                        </div>
                      )}
                      {draft.schedule_for && (
                        <p className="text-sm text-blue-500 flex items-center gap-1 mb-2">
                          <Clock className="w-4 h-4" />
                          Scheduled for {new Date(draft.schedule_for).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => publishDraft(draft)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
                    >
                      Publish Now
                    </button>
                    <button
                      onClick={() => deleteDraft(draft.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
