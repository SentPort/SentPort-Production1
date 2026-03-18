import React, { useState } from 'react';
import { X, UserCheck, UserX, AlertTriangle, Loader2, UserPlus, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AccountManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'add' | 'remove' | 'restore';

interface UserLookupResult {
  id: string;
  email: string;
  is_verified: boolean;
  full_name: string | null;
  subdomain_count: number;
  subdomains: Array<{ subdomain: string; status: string; scheduled_deletion_at: string | null }>;
  account_status: string;
  deletion_scheduled_at: string | null;
  removal_type: string | null;
  removed_by_admin_id: string | null;
}

export function AccountManagementModal({ isOpen, onClose }: AccountManagementModalProps) {
  const [mode, setMode] = useState<Mode>('add');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);
  const [userLookup, setUserLookup] = useState<UserLookupResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const lookupUser = async () => {
    if (!validateEmail(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setUserLookup(null);

    try {
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('id, email, is_verified, full_name, account_status, deletion_scheduled_at, removal_type, removed_by_admin_id')
        .eq('email', email)
        .maybeSingle();

      if (userError) throw userError;

      if (!userProfile) {
        setMessage({ type: 'error', text: 'No account found with this email address.' });
        setLoading(false);
        return;
      }

      const { data: subdomainData } = await supabase
        .from('subdomains')
        .select('subdomain, status, scheduled_deletion_at')
        .eq('owner_id', userProfile.id);

      const subdomains = subdomainData || [];
      const subdomain_count = subdomains.length;

      setUserLookup({
        ...userProfile,
        subdomain_count,
        subdomains
      });

      if (mode === 'add' && userProfile.is_verified) {
        setMessage({ type: 'info', text: 'This account already has full verification access.' });
      } else if (mode === 'remove' && subdomain_count > 0) {
        setMessage({
          type: 'warning',
          text: `Warning: This user owns ${subdomain_count} subdomain${subdomain_count > 1 ? 's' : ''} that will be paused for 30 days.`
        });
      } else if (mode === 'restore') {
        const suspendedCount = subdomains.filter(s => s.status === 'suspended').length;
        if (suspendedCount > 0) {
          setMessage({
            type: 'info',
            text: `This account has ${suspendedCount} paused subdomain${suspendedCount > 1 ? 's' : ''} that can be restored.`
          });
        } else {
          setMessage({ type: 'info', text: 'This account has no paused subdomains to restore.' });
        }
      }
    } catch (error) {
      console.error('Error looking up user:', error);
      setMessage({ type: 'error', text: 'Failed to lookup user. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const addAccount = async () => {
    if (!userLookup) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_verified: true })
        .eq('id', userLookup.id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `Account added successfully! ${userLookup.email} now has full verification privileges.`
      });

      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (error) {
      console.error('Error adding account:', error);
      setMessage({ type: 'error', text: 'Failed to add account. Please try again.' });
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const removeAccount = async () => {
    if (!userLookup) return;

    setLoading(true);
    setMessage(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      const { data: result, error } = await supabase.rpc('admin_remove_account', {
        admin_id: user.user.id,
        target_user_id: userLookup.id
      });

      if (error) throw error;

      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      const deletionDate = new Date(result.deletion_date).toLocaleDateString();

      setMessage({
        type: 'success',
        text: `Account removed successfully. ${result.subdomains_paused > 0 ? `${result.subdomains_paused} subdomain${result.subdomains_paused > 1 ? 's' : ''} paused. ` : ''}User cannot sign in until restored. Permanent deletion scheduled for ${deletionDate}.`
      });

      setTimeout(() => {
        resetForm();
      }, 5000);
    } catch (error) {
      console.error('Error removing account:', error);
      setMessage({ type: 'error', text: 'Failed to remove account. Please try again.' });
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const restoreAccount = async () => {
    if (!userLookup) return;

    setLoading(true);
    setMessage(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      const { data: result, error } = await supabase.rpc('admin_restore_account', {
        admin_id: user.user.id,
        target_user_id: userLookup.id
      });

      if (error) throw error;

      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      setMessage({
        type: 'success',
        text: `Account restored successfully! ${result.subdomains_restored > 0 ? `${result.subdomains_restored} subdomain${result.subdomains_restored > 1 ? 's' : ''} reactivated. ` : ''}User can now sign in.`
      });

      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (error) {
      console.error('Error restoring account:', error);
      setMessage({ type: 'error', text: 'Failed to restore account. Please try again.' });
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const handleAction = () => {
    setShowConfirmation(true);
  };

  const confirmAction = () => {
    if (mode === 'add') {
      addAccount();
    } else if (mode === 'remove') {
      removeAccount();
    } else if (mode === 'restore') {
      restoreAccount();
    }
  };

  const resetForm = () => {
    setEmail('');
    setUserLookup(null);
    setMessage(null);
    setShowConfirmation(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Account Management</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('add'); resetForm(); }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'add'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Add Account
            </button>
            <button
              onClick={() => { setMode('remove'); resetForm(); }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'remove'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <UserX className="w-4 h-4 inline mr-2" />
              Remove Account
            </button>
            <button
              onClick={() => { setMode('restore'); resetForm(); }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'restore'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className="w-4 h-4 inline mr-2" />
              Restore Account
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && lookupUser()}
                placeholder="user@example.com"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={lookupUser}
                disabled={loading || !email}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lookup'}
              </button>
            </div>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              message.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
              message.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              <div className="flex items-start gap-2">
                {message.type === 'warning' && <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                {message.type === 'success' && <UserCheck className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          )}

          {userLookup && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">Account Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Email:</span>
                  <span className="font-medium text-slate-900">{userLookup.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Full Name:</span>
                  <span className="font-medium text-slate-900">{userLookup.full_name || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Verification Status:</span>
                  <span className={`font-medium ${userLookup.is_verified ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {userLookup.is_verified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Account Status:</span>
                  <span className={`font-medium px-2 py-0.5 rounded text-xs ${
                    userLookup.account_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    userLookup.account_status === 'pending_deletion' ? 'bg-rose-100 text-rose-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {userLookup.account_status === 'pending_deletion' ? 'PENDING DELETION' : userLookup.account_status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </div>
                {userLookup.account_status === 'pending_deletion' && userLookup.deletion_scheduled_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Scheduled Deletion:</span>
                    <span className="font-medium text-rose-600">{new Date(userLookup.deletion_scheduled_at).toLocaleDateString()}</span>
                  </div>
                )}
                {userLookup.removal_type && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Removal Type:</span>
                    <span className={`font-medium ${userLookup.removal_type === 'admin_initiated' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {userLookup.removal_type === 'admin_initiated' ? 'Admin Initiated' : 'User Requested'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Subdomains Owned:</span>
                  <span className="font-medium text-slate-900">{userLookup.subdomain_count}</span>
                </div>
                {userLookup.subdomains.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <span className="text-slate-600 block mb-2">Subdomain List:</span>
                    <div className="space-y-1">
                      {userLookup.subdomains.map((sub, index) => (
                        <div key={index} className="flex justify-between items-center text-xs bg-white px-3 py-2 rounded border border-slate-200">
                          <span className="font-mono font-medium">{sub.subdomain}</span>
                          <span className={`px-2 py-0.5 rounded ${
                            sub.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            sub.status === 'suspended' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {sub.status}
                            {sub.status === 'suspended' && sub.scheduled_deletion_at && (
                              <span className="ml-1">
                                (deletes {new Date(sub.scheduled_deletion_at).toLocaleDateString()})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {showConfirmation && userLookup && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 mb-1">
                    {mode === 'add' && 'Confirm Account Addition'}
                    {mode === 'remove' && 'Confirm Account Removal'}
                    {mode === 'restore' && 'Confirm Account Restoration'}
                  </p>
                  <p className="text-sm text-amber-800">
                    {mode === 'add' && `Grant full verification to ${userLookup.email}?`}
                    {mode === 'remove' && `Remove ${userLookup.email}? User will be blocked from signing in. ${userLookup.subdomain_count > 0 ? `${userLookup.subdomain_count} subdomain${userLookup.subdomain_count !== 1 ? 's' : ''} will be paused. ` : ''}Account will be permanently deleted in 30 days unless restored.`}
                    {mode === 'restore' && `Restore account and reactivate all paused subdomains for ${userLookup.email}? User will be able to sign in immediately.`}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmAction}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                    mode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    mode === 'remove' ? 'bg-rose-600 hover:bg-rose-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {userLookup && !showConfirmation && (
            <button
              onClick={handleAction}
              disabled={loading ||
                (mode === 'add' && userLookup.is_verified) ||
                (mode === 'remove' && userLookup.account_status === 'pending_deletion') ||
                (mode === 'restore' && userLookup.account_status !== 'pending_deletion')
              }
              className={`w-full px-6 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' :
                mode === 'remove' ? 'bg-rose-600 hover:bg-rose-700' :
                'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {mode === 'add' && (userLookup.is_verified ? 'Already Verified' : 'Add Account & Grant Verification')}
              {mode === 'remove' && (userLookup.account_status === 'pending_deletion' ? 'Already Pending Deletion' : 'Remove Account (Blocks Sign-In)')}
              {mode === 'restore' && (userLookup.account_status !== 'pending_deletion' ? 'Account Not Pending Deletion' : 'Restore Account (Allow Sign-In)')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
