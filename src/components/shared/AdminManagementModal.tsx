import { useState, FormEvent } from 'react';
import { X, UserPlus, UserMinus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminManagementModalProps {
  onClose: () => void;
}

type OperationMode = 'add' | 'remove';
type MessageType = 'success' | 'error' | 'warning' | 'info';

interface Message {
  type: MessageType;
  text: string;
}

interface UserProfile {
  id: string;
  email: string;
  is_admin: boolean;
  is_verified: boolean;
  full_name: string | null;
}

export default function AdminManagementModal({ onClose }: AdminManagementModalProps) {
  const [mode, setMode] = useState<OperationMode>('add');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const lookupUser = async (email: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, is_admin, is_verified, full_name')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  };

  const updateAdminStatus = async (userId: string, isAdmin: boolean): Promise<void> => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setUserProfile(null);

    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    if (!validateEmail(email.trim())) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);

    try {
      const profile = await lookupUser(email.trim());

      if (!profile) {
        setMessage({ type: 'error', text: 'No user found with this email address' });
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      if (mode === 'add') {
        if (profile.is_admin) {
          setMessage({ type: 'info', text: 'This user is already an admin' });
          setLoading(false);
          return;
        }

        await updateAdminStatus(profile.id, true);

        if (!profile.is_verified) {
          setMessage({
            type: 'warning',
            text: `Admin privileges granted successfully! Note: ${profile.email} is not verified. Please remind them to complete verification.`
          });
        } else {
          setMessage({
            type: 'success',
            text: `Admin privileges granted successfully to ${profile.email}!`
          });
        }

        setEmail('');
        setUserProfile(null);
      } else {
        if (!profile.is_admin) {
          setMessage({ type: 'info', text: 'This user is not currently an admin' });
          setLoading(false);
          return;
        }

        await updateAdminStatus(profile.id, false);
        setMessage({
          type: 'success',
          text: `Admin privileges removed successfully from ${profile.email}!`
        });

        setEmail('');
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error managing admin:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const getMessageIcon = (type: MessageType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getMessageStyles = (type: MessageType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'add' ? 'Add Admin' : 'Remove Admin'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('add');
                setMessage(null);
                setUserProfile(null);
              }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'add'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Add Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('remove');
                setMessage(null);
                setUserProfile(null);
              }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'remove'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserMinus className="w-4 h-4" />
              Remove Admin
            </button>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              disabled={loading}
            />
          </div>

          {message && (
            <div className={`flex items-start gap-3 p-4 rounded-lg border ${getMessageStyles(message.type)}`}>
              {getMessageIcon(message.type)}
              <p className="text-sm font-medium flex-1">{message.text}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                mode === 'add'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : mode === 'add' ? (
                'Grant Admin Access'
              ) : (
                'Remove Admin Access'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
