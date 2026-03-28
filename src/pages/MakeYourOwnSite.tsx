import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Info, ShieldCheck } from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import SubdomainDashboardNotification from '../components/shared/SubdomainDashboardNotification';

interface UserProfile {
  id: string;
  email: string;
  is_verified: boolean;
  is_admin: boolean;
  subdomain: string | null;
  created_at: string;
  updated_at: string;
}

interface SubdomainRecord {
  id: string;
  subdomain: string;
  owner_id: string;
  status: string;
}

export default function MakeYourOwnSite() {
  const { user, isVerified, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [subdomain, setSubdomain] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userSubdomains, setUserSubdomains] = useState<SubdomainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showDashboardNotification, setShowDashboardNotification] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert([
            {
              id: user.id,
              email: user.email,
              is_verified: false,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile);
      } else {
        setProfile(data);
        if (data.subdomain) {
          setSubdomain(data.subdomain);
        }
      }

      const { data: subdomainsData, error: subdomainsError } = await supabase
        .from('subdomains')
        .select('*')
        .eq('owner_id', user.id)
        .in('status', ['active', 'inactive'])
        .order('created_at', { ascending: true });

      if (subdomainsError) throw subdomainsError;
      setUserSubdomains(subdomainsData || []);

    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSubdomain = async () => {
    if (!user || !profile) return;

    if (!isVerified && !isAdmin) {
      setShowVerificationModal(true);
      return;
    }

    if (!subdomain.trim()) {
      setError('Please enter a subdomain');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      setError('Subdomain can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    setClaiming(true);
    setError('');

    try {
      const subdomainLower = subdomain.toLowerCase();

      // Check subdomain count before attempting to insert
      const { data: existingSubdomains, error: countError } = await supabase
        .from('subdomains')
        .select('id')
        .eq('owner_id', user.id)
        .in('status', ['active', 'inactive']);

      if (countError) throw countError;

      if (existingSubdomains && existingSubdomains.length >= 3) {
        setError('You have reached the maximum limit of 3 subdomains per account');
        return;
      }

      const { error: subdomainError } = await supabase
        .from('subdomains')
        .insert([
          {
            subdomain: subdomainLower,
            owner_id: user.id,
            owner_email: profile.email,
            owner_name: profile.full_name,
            status: 'inactive'
          }
        ]);

      if (subdomainError) {
        if (subdomainError.code === '23505') {
          setError('This subdomain is already taken');
        } else if (subdomainError.message?.includes('maximum limit of 3 subdomains')) {
          setError('You have reached the maximum limit of 3 subdomains per account');
        } else {
          throw subdomainError;
        }
        return;
      }

      await fetchUserProfile();
      setSubdomain('');
      setShowDashboardNotification(true);
    } catch (err) {
      console.error('Error claiming subdomain:', err);
      setError('Failed to claim subdomain. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const handleVerification = () => {
    navigate('/hubook/get-verified');
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center pt-20">
          <div className="text-gray-600">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4 pt-20 pb-12">
        <div className="max-w-4xl w-full">
          {showDashboardNotification && (
            <div className="mb-8">
              <SubdomainDashboardNotification
                onDismiss={() => setShowDashboardNotification(false)}
                autoShow={false}
              />
            </div>
          )}

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6">
              <Globe className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Make Your Own Free Site</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Claim your unique space on the human-only web. Build your site with our tools or code it yourself. Up to three free sites per user!
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            {!user ? (
              <>
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Choose Your Subdomain
                  </label>
                  <div className="flex items-center gap-0">
                    <input
                      type="text"
                      placeholder="yourname"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      disabled
                    />
                    <div className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-700 font-medium">
                      .sentport.com
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                    <Info className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Sign In Required</h3>
                  <p className="text-gray-700 mb-6">You need to sign in to claim a subdomain</p>
                  <button
                    onClick={() => navigate('/signin')}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
                  >
                    Sign In Now
                  </button>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-gray-600">
                    Already have an account?{' '}
                    <button
                      onClick={() => navigate('/signin')}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      Sign in to get started
                    </button>
                  </p>
                </div>
              </>
            ) : userSubdomains.length > 0 && (isVerified || isAdmin) ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                  <ShieldCheck className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Subdomains</h2>
                <p className="text-gray-600 mb-6">
                  You have {userSubdomains.length} of 3 subdomains claimed
                </p>

                <div className="space-y-4 mb-8">
                  {userSubdomains.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-gradient-to-r from-blue-50 to-green-50 border border-gray-200 rounded-xl p-6"
                    >
                      <p className="text-lg font-bold text-blue-600 mb-4">
                        {sub.subdomain}.sentport.com
                      </p>
                      <button
                        onClick={() => navigate(`/builder/${sub.id}`)}
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
                      >
                        Launch Website Builder
                      </button>
                    </div>
                  ))}
                </div>

                {userSubdomains.length < 3 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Claim Another Subdomain
                    </h3>
                    <div className="mb-4">
                      <div className="flex items-center gap-0 max-w-md mx-auto">
                        <input
                          type="text"
                          value={subdomain}
                          onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                          placeholder="yourname"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                        <div className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-700 font-medium">
                          .sentport.com
                        </div>
                      </div>
                      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
                    </div>
                    <button
                      onClick={handleClaimSubdomain}
                      disabled={claiming}
                      className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                    >
                      {claiming ? 'Claiming...' : 'Claim Subdomain'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Choose Your Subdomain
                  </label>
                  <div className="flex items-center gap-0">
                    <input
                      type="text"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                      placeholder="yourname"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      disabled={!isVerified && !isAdmin}
                    />
                    <div className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-700 font-medium">
                      .sentport.com
                    </div>
                  </div>
                  {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
                </div>

                {!isVerified && !isAdmin ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                      <ShieldCheck className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Verification Required</h3>
                    <p className="text-gray-700 mb-6">
                      You need to get verified as a real human to claim your subdomain and access the website builder
                    </p>
                    <button
                      onClick={() => setShowVerificationModal(true)}
                      className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200"
                    >
                      Start Free Verification Process
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleClaimSubdomain}
                    disabled={claiming}
                    className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {claiming ? 'Claiming...' : 'Claim Subdomain'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Get Verified as a Real Human</h3>
              <p className="text-gray-600 mb-6">
                Unlock exclusive access to human-only platforms and communities
              </p>
              <button
                onClick={handleVerification}
                className="w-full bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 mb-4"
              >
                Start Free Verification Process
              </button>
              <button
                onClick={() => setShowVerificationModal(false)}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
