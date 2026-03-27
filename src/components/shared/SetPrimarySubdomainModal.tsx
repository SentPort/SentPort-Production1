import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Subdomain {
  id: string;
  subdomain: string;
  status: string;
}

interface SetPrimarySubdomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentPrimaryId?: string;
}

export default function SetPrimarySubdomainModal({
  isOpen,
  onClose,
  onSuccess,
  currentPrimaryId
}: SetPrimarySubdomainModalProps) {
  const { user } = useAuth();
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [selectedId, setSelectedId] = useState<string>(currentPrimaryId || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchSubdomains();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (currentPrimaryId) {
      setSelectedId(currentPrimaryId);
    }
  }, [currentPrimaryId]);

  const fetchSubdomains = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subdomains')
        .select('id, subdomain, status')
        .eq('owner_id', user.id)
        .in('status', ['active', 'inactive'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSubdomains(data || []);
    } catch (err) {
      console.error('Error fetching subdomains:', err);
      setError('Failed to load subdomains');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !selectedId) return;

    try {
      setSaving(true);
      setError('');

      const { data: existingPreference } = await supabase
        .from('user_subdomain_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingPreference) {
        const { error: updateError } = await supabase
          .from('user_subdomain_preferences')
          .update({ primary_subdomain_id: selectedId, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_subdomain_preferences')
          .insert({
            user_id: user.id,
            primary_subdomain_id: selectedId
          });

        if (insertError) throw insertError;
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error saving primary subdomain:', err);
      setError('Failed to save primary subdomain');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Set Primary Subdomain
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Your primary subdomain appears in your profile and is displayed first in your subdomain list.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading subdomains...</div>
        ) : subdomains.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No subdomains found</div>
        ) : (
          <div className="space-y-3 mb-6">
            {subdomains.map((subdomain) => (
              <label
                key={subdomain.id}
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedId === subdomain.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="primary-subdomain"
                  value={subdomain.id}
                  checked={selectedId === subdomain.id}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {subdomain.subdomain}.sentport.com
                    </span>
                    {currentPrimaryId === subdomain.id && selectedId !== subdomain.id && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                        Current
                      </span>
                    )}
                    {selectedId === subdomain.id && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedId || loading}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Primary'}
          </button>
        </div>
      </div>
    </div>
  );
}
