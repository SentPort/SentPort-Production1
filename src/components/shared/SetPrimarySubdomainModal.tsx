import { useState, useEffect } from 'react';
import { X, Globe, Check, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Subdomain {
  id: string;
  subdomain: string;
  status: string;
  created_at: string;
}

interface SetPrimarySubdomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrimaryId?: string | null;
  onPrimaryChanged: () => void;
}

export default function SetPrimarySubdomainModal({
  isOpen,
  onClose,
  currentPrimaryId,
  onPrimaryChanged
}: SetPrimarySubdomainModalProps) {
  const { user, refreshProfile } = useAuth();
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(currentPrimaryId || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fetchingSubdomains, setFetchingSubdomains] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchSubdomains();
    }
  }, [isOpen, user]);

  useEffect(() => {
    setSelectedId(currentPrimaryId || null);
  }, [currentPrimaryId]);

  const fetchSubdomains = async () => {
    if (!user) return;

    setFetchingSubdomains(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('subdomains')
        .select('id, subdomain, status, created_at')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setSubdomains(data || []);
    } catch (err: any) {
      console.error('Error fetching subdomains:', err);
      setError('Failed to load subdomains. Please try again.');
    } finally {
      setFetchingSubdomains(false);
    }
  };

  const handleSetPrimary = async () => {
    if (!user || !selectedId) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error: rpcError } = await supabase.rpc('set_primary_subdomain', {
        p_subdomain_id: selectedId,
        p_user_id: user.id,
      });

      if (rpcError) throw rpcError;

      if (data && data.success) {
        setSuccess(`Primary subdomain set to ${data.subdomain}.sentport.com`);
        await refreshProfile();

        setTimeout(() => {
          onPrimaryChanged();
          handleClose();
        }, 1500);
      } else {
        setError(data?.message || 'Failed to set primary subdomain');
      }
    } catch (err: any) {
      console.error('Error setting primary subdomain:', err);
      setError('Failed to set primary subdomain. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      setSuccess('');
      setSelectedId(currentPrimaryId || null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Set Primary Subdomain</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {fetchingSubdomains ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  Choose which subdomain should be displayed as your primary subdomain in your profile.
                </p>
                <p className="text-sm text-gray-500">
                  Your primary subdomain is shown in your Account Information and represents your main website.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {success}
                </div>
              )}

              {subdomains.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No active subdomains found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subdomains.map((subdomain) => {
                    const isCurrentPrimary = subdomain.id === currentPrimaryId;
                    const isSelected = subdomain.id === selectedId;

                    return (
                      <label
                        key={subdomain.id}
                        className={`
                          flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }
                          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <input
                          type="radio"
                          name="primary-subdomain"
                          value={subdomain.id}
                          checked={isSelected}
                          onChange={() => setSelectedId(subdomain.id)}
                          disabled={loading}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <span className="font-mono font-semibold text-gray-900">
                              {subdomain.subdomain}.sentport.com
                            </span>
                            {isCurrentPrimary && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                <Star className="w-3 h-3 fill-current" />
                                Current Primary
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Created {new Date(subdomain.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetPrimary}
                  disabled={loading || !selectedId || selectedId === currentPrimaryId || subdomains.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Set as Primary</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
