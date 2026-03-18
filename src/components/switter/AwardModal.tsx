import { useEffect, useState } from 'react';
import { X, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AwardModalProps {
  onClose: () => void;
  tweetId: string;
}

interface SwitterAward {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: number;
}

export default function AwardModal({ onClose, tweetId }: AwardModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [awards, setAwards] = useState<SwitterAward[]>([]);
  const [selectedAward, setSelectedAward] = useState<string | null>(null);

  useEffect(() => {
    loadAwards();
  }, []);

  const loadAwards = async () => {
    const { data } = await supabase
      .from('switter_awards')
      .select('*')
      .order('cost', { ascending: true });

    if (data) setAwards(data);
    setLoading(false);
  };

  const giveAward = async () => {
    if (!user || !selectedAward) return;

    const { data: account } = await supabase
      .from('switter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) return;

    await supabase
      .from('switter_tweet_awards')
      .insert({
        tweet_id: tweetId,
        award_id: selectedAward,
        giver_account_id: account.id
      });

    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Give Award
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Show appreciation for exceptional content
            </p>

            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
              {awards.map((award) => (
                <button
                  key={award.id}
                  onClick={() => setSelectedAward(award.id)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    selectedAward === award.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{award.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold">{award.name}</p>
                      <p className="text-sm text-gray-600">{award.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-600">{award.cost}</p>
                      <p className="text-xs text-gray-500">coins</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={giveAward}
              disabled={!selectedAward}
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Give Award
            </button>
          </>
        )}
      </div>
    </div>
  );
}
