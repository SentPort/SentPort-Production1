import { useState } from 'react';
import { X, Heart, Sparkles, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GiveKindnessModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverUsername: string;
  receiverDisplayName: string;
  receiverAccountId: string;
  giverAccountId: string;
  receiverCurrentKindness: number;
  onSuccess: () => void;
}

export default function GiveKindnessModal({
  isOpen,
  onClose,
  receiverUsername,
  receiverDisplayName,
  receiverAccountId,
  giverAccountId,
  receiverCurrentKindness,
  onSuccess
}: GiveKindnessModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleGiveKindness = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('give_kindness', {
        p_giver_id: giverAccountId,
        p_receiver_id: receiverAccountId
      });

      if (rpcError) throw rpcError;

      if (data && !data.success) {
        setError(data.error || 'Failed to give kindness');
        setLoading(false);
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error giving kindness:', err);
      setError(err.message || 'Failed to give kindness');
      setLoading(false);
    }
  };

  const newKindness = receiverCurrentKindness + 50;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {success ? (
          <div className="p-8 text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 animate-ping">
                <Heart className="w-16 h-16 text-pink-500 mx-auto fill-current" />
              </div>
              <Heart className="w-16 h-16 text-pink-500 mx-auto fill-current relative" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-4 mb-2">
              Kindness Sent!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {receiverDisplayName} received +50 kindness
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Sparkles className="w-4 h-4" />
              <span>You earned +20 karma!</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Give Kindness</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-pink-200 dark:border-pink-800">
                <p className="text-gray-700 dark:text-gray-300 text-center mb-4">
                  You're about to give kindness to <span className="font-bold text-pink-600 dark:text-pink-400">@{receiverUsername}</span>!
                </p>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">They receive</div>
                    <div className="flex items-center justify-center gap-1 text-pink-600 dark:text-pink-400 font-bold">
                      <Heart className="w-4 h-4" />
                      <span className="text-lg">+50</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Kindness</div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">You receive</div>
                    <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400 font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-lg">+20</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Karma</div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Impact on Quality</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Their kindness will increase from <span className="font-bold">{receiverCurrentKindness}</span> to <span className="font-bold text-pink-600 dark:text-pink-400">{newKindness}</span>, exponentially boosting their quality score!
                </p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                You can only give kindness to each person once. Choose wisely!
              </div>
            </div>

            <div className="flex gap-3 p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleGiveKindness}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4" />
                    <span>Send Kindness</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
