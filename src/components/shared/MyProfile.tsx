import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle, XCircle, Globe, Calendar, Trash2, Shield, CreditCard as Edit2, Lock, Phone, ChevronDown, ChevronUp, Check, X, Eye, EyeOff, AlertCircle, Settings, Star } from 'lucide-react';
import DeleteAccountModal from './DeleteAccountModal';
import SetPrimarySubdomainModal from './SetPrimarySubdomainModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface MyProfileProps {
  email: string;
  isVerified: boolean;
  subdomain?: string | null;
  createdAt: string;
  fullName?: string | null;
  ownedSubdomainCount?: number;
}

export default function MyProfile({ email, isVerified, subdomain, createdAt, fullName, ownedSubdomainCount = 0 }: MyProfileProps) {
  const { isAdmin, userProfile, refreshProfile } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPrimarySubdomainModal, setShowPrimarySubdomainModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Email editing
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Password change
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Phone number
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState('');

  // Last password change
  const [lastPasswordChange, setLastPasswordChange] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setPhoneNumber(userProfile.phone_number || '');
      setLastPasswordChange(userProfile.last_password_change || null);
    }
  }, [userProfile]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength: 2, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: 3, label: 'Strong', color: 'bg-green-500' };
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError('');
    setEmailSuccess('');

    try {
      // Verify current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: emailPassword,
      });

      if (signInError) {
        setEmailError('Incorrect password. Please try again.');
        setEmailLoading(false);
        return;
      }

      // Update email
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) throw updateError;

      setEmailSuccess('Verification email sent to your new address. Please check your inbox.');
      setEditingEmail(false);
      setNewEmail('');
      setEmailPassword('');

      setTimeout(() => setEmailSuccess(''), 5000);
    } catch (error: any) {
      setEmailError(error.message || 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      setPasswordLoading(false);
      return;
    }

    try {
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: currentPassword,
      });

      if (signInError) {
        setPasswordError('Current password is incorrect');
        setPasswordLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Update last_password_change in profile
      await supabase
        .from('user_profiles')
        .update({ last_password_change: new Date().toISOString() })
        .eq('id', userProfile?.id);

      setPasswordSuccess('Password updated successfully!');
      setEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      await refreshProfile();
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePhoneUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneLoading(true);
    setPhoneError('');
    setPhoneSuccess('');

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ phone_number: phoneNumber || null })
        .eq('id', userProfile?.id);

      if (error) throw error;

      setPhoneSuccess(phoneNumber ? 'Phone number updated!' : 'Phone number removed!');
      setEditingPhone(false);

      await refreshProfile();
      setTimeout(() => setPhoneSuccess(''), 5000);
    } catch (error: any) {
      setPhoneError(error.message || 'Failed to update phone number');
    } finally {
      setPhoneLoading(false);
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleManageSubdomainsClick = () => {
    const subdomainDashboard = document.getElementById('subdomain-dashboard');
    if (subdomainDashboard) {
      subdomainDashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrimarySubdomainChanged = () => {
    refreshProfile();
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        </div>

        {/* Account Information Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('account')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
                <p className="text-sm text-gray-500">Email, phone number, and profile details</p>
              </div>
            </div>
            {expandedSection === 'account' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSection === 'account' && (
            <div className="px-6 py-4 bg-gray-50 space-y-6">
              {/* Email */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Email Address</label>
                  {!editingEmail && (
                    <button
                      onClick={() => setEditingEmail(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
                {!editingEmail ? (
                  <p className="text-gray-900">{email}</p>
                ) : (
                  <form onSubmit={handleEmailUpdate} className="space-y-3">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="New email address"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    <input
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder="Current password (to confirm)"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    {emailError && (
                      <div className="text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {emailError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={emailLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        {emailLoading ? 'Updating...' : 'Update Email'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEmail(false);
                          setNewEmail('');
                          setEmailPassword('');
                          setEmailError('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {emailSuccess && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {emailSuccess}
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Phone Number (Optional)</label>
                  {!editingPhone && (
                    <button
                      onClick={() => setEditingPhone(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      {phoneNumber ? 'Edit' : 'Add'}
                    </button>
                  )}
                </div>
                {!editingPhone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{phoneNumber ? formatPhoneDisplay(phoneNumber) : 'No phone number added'}</p>
                  </div>
                ) : (
                  <form onSubmit={handlePhoneUpdate} className="space-y-3">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500">For future account recovery options</p>
                    {phoneError && (
                      <div className="text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {phoneError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={phoneLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        {phoneLoading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPhone(false);
                          setPhoneNumber(userProfile?.phone_number || '');
                          setPhoneError('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {phoneSuccess && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {phoneSuccess}
                  </div>
                )}
              </div>

              {/* Other Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                    {isVerified ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    Verification Status
                  </label>
                  {isVerified ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold flex items-center gap-1.5">
                            <Shield className="w-4 h-4" />
                            Admin
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                            Verified Human
                          </span>
                        )}
                      </div>
                      {userProfile?.last_verification_at && (
                        <p className="text-xs text-gray-500">
                          Verified: {new Date(userProfile.last_verification_at).toLocaleDateString()}
                        </p>
                      )}
                      <Link
                        to="/get-verified"
                        className="inline-block text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        Reverify
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to="/get-verified"
                      className="inline-block px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                    >
                      Get Verified
                    </Link>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-gray-600" />
                    Primary Subdomain
                  </label>
                  {userProfile?.primary_subdomain ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <p className="text-gray-900 font-mono text-sm">
                          {userProfile.primary_subdomain.subdomain}.sentport.com
                        </p>
                        {userProfile.primary_subdomain.status === 'inactive' ? (
                          <span className="text-xs font-semibold text-red-600">
                            (Draft Status)
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-green-600">
                            (Published & Live)
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {ownedSubdomainCount > 1 && (
                          <button
                            onClick={() => setShowPrimarySubdomainModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Change Primary
                          </button>
                        )}
                        <button
                          onClick={handleManageSubdomainsClick}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Manage Subdomains
                        </button>
                      </div>
                    </div>
                  ) : ownedSubdomainCount > 0 ? (
                    <div className="space-y-2">
                      <p className="text-gray-600 text-sm">No primary subdomain set</p>
                      <button
                        onClick={handleManageSubdomainsClick}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Manage Subdomains
                      </button>
                    </div>
                  ) : (
                    <Link
                      to="/make-your-own-site"
                      className="inline-block px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                    >
                      Claim Now
                    </Link>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    Member Since
                  </label>
                  <p className="text-gray-900 text-sm">
                    {new Date(createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Settings Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('security')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                <p className="text-sm text-gray-500">Password management and account security</p>
              </div>
            </div>
            {expandedSection === 'security' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSection === 'security' && (
            <div className="px-6 py-4 bg-gray-50 space-y-6">
              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Password</label>
                  {!editingPassword && (
                    <button
                      onClick={() => setEditingPassword(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Change Password
                    </button>
                  )}
                </div>
                {!editingPassword ? (
                  <div>
                    <p className="text-gray-900">••••••••••••</p>
                    {lastPasswordChange && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last changed: {new Date(lastPasswordChange).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handlePasswordUpdate} className="space-y-3">
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        required
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        required
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPassword && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${passwordStrength.color}`}
                              style={{ width: `${(passwordStrength.strength / 3) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{passwordStrength.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">Use at least 8 characters with letters and numbers</p>
                      </div>
                    )}
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordError && (
                      <div className="text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {passwordError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPassword(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                          setPasswordError('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {passwordSuccess && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {passwordSuccess}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone Section */}
        <div>
          <button
            onClick={() => toggleSection('danger')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-red-900">Danger Zone</h3>
                <p className="text-sm text-red-600">Irreversible account actions</p>
              </div>
            </div>
            {expandedSection === 'danger' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSection === 'danger' && (
            <div className="px-6 py-4 bg-red-50">
              <div className="bg-white border border-red-200 rounded-lg p-4">
                <h4 className="text-md font-bold text-red-900 mb-2">Delete My Account</h4>
                <p className="text-sm text-red-800 mb-4">
                  Once you delete your account, there is a 30-day grace period to restore it by signing back in. After 30 days, all your data will be permanently deleted.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete My Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        subdomainCount={ownedSubdomainCount}
      />

      <SetPrimarySubdomainModal
        isOpen={showPrimarySubdomainModal}
        onClose={() => setShowPrimarySubdomainModal(false)}
        currentPrimaryId={userProfile?.primary_subdomain_id}
        onPrimaryChanged={handlePrimarySubdomainChanged}
      />
    </>
  );
}
