import { useState } from 'react';
import { Scale, Info, X, Check, Users, Shield, Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface JuryPoolVolunteerButtonProps {
  requireVerified?: boolean;
  variant?: 'compact' | 'homepage';
}

export default function JuryPoolVolunteerButton({
  requireVerified = false,
  variant = 'compact'
}: JuryPoolVolunteerButtonProps) {
  const { user, userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');

  // Check if user is already a volunteer
  useState(() => {
    const checkVolunteerStatus = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('jury_pool_volunteers')
          .select('active_status')
          .eq('user_id', user.id)
          .maybeSingle();

        setIsVolunteer(!!data?.active_status);
      } catch (error) {
        console.error('Error checking volunteer status:', error);
      } finally {
        setChecking(false);
      }
    };

    checkVolunteerStatus();
  });

  const handleVolunteer = async () => {
    if (!user || !userProfile) {
      setMessage('Please sign in to volunteer for jury duty.');
      return;
    }

    if (requireVerified && !userProfile.verified && !isAdmin) {
      setMessage('You must be a Verified user to volunteer for jury duty.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('jury_pool_volunteers')
        .insert({
          user_id: user.id,
          email: userProfile.email || '',
          full_name: userProfile.full_name || 'Anonymous User'
        });

      if (error) {
        if (error.code === '23505') {
          // Already exists, update to active
          const { error: updateError } = await supabase
            .from('jury_pool_volunteers')
            .update({ active_status: true })
            .eq('user_id', user.id);

          if (updateError) throw updateError;
        } else {
          throw error;
        }
      }

      setIsVolunteer(true);
      setMessage('Thank you for volunteering! You may be randomly selected for jury duty when cases need community input.');
      setTimeout(() => {
        setShowModal(false);
        setMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error volunteering:', error);
      setMessage('There was an error signing up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnvolunteer = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('jury_pool_volunteers')
        .update({ active_status: false })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsVolunteer(false);
      setMessage('You have been removed from the jury pool.');
      setTimeout(() => {
        setShowModal(false);
        setMessage('');
      }, 2000);
    } catch (error) {
      console.error('Error unvolunteering:', error);
      setMessage('There was an error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking && variant !== 'homepage') return null;

  if (variant === 'homepage') {
    return (
      <>
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 shadow-xl transition-all flex items-center gap-3"
          >
            <Scale className="w-6 h-6" />
            Volunteer for Our Jury Pool
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-white/90 hover:bg-white text-blue-700 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all border-2 border-blue-300 hover:border-blue-500"
            title="Learn about the Jury Pool"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
        {renderModal()}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
          isVolunteer
            ? 'bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
        }`}
      >
        <Scale className="w-5 h-5" />
        {isVolunteer ? 'Jury Pool Member' : 'Join Jury Pool'}
        <Info className="w-4 h-4 opacity-75" />
      </button>
      {renderModal()}
    </>
  );

  function renderModal() {
    if (!showModal) return null;

    const canVolunteer = user && (!requireVerified || userProfile?.verified || isAdmin);
    const needsSignIn = !user;
    const needsVerification = user && requireVerified && !userProfile?.verified && !isAdmin;

    return (

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Scale className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-1">Community Jury Pool</h2>
                  <p className="text-blue-100">Help shape our community standards</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="space-y-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-blue-900 text-lg mb-2">What is the Jury Pool?</h3>
                      <p className="text-blue-800">
                        When our moderation team faces difficult decisions about reported content,
                        they can submit it to a community jury. 12 volunteers are randomly selected
                        to review the content and vote to approve or reject it.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 text-xl flex items-center gap-2">
                    <Users className="w-6 h-6 text-purple-600" />
                    How It Works
                  </h3>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-purple-600">1</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Random Selection</p>
                        <p className="text-gray-600 text-sm">
                          When a case is submitted, 12 volunteers are randomly chosen from the pool
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-purple-600">2</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Review and Vote</p>
                        <p className="text-gray-600 text-sm">
                          You receive a notification with context, view the content, and vote to approve or reject
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-purple-600">3</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Share Your Reasoning</p>
                        <p className="text-gray-600 text-sm">
                          Write notes explaining your decision to help admins understand community perspectives
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-purple-600">4</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Decision Made</p>
                        <p className="text-gray-600 text-sm">
                          For content: 7 out of 12 votes creates a binding verdict. For user bans: all 12 must agree
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 text-xl flex items-center gap-2">
                    <Shield className="w-6 h-6 text-green-600" />
                    What You'll Review
                  </h3>
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
                    <p className="text-green-800 mb-3">
                      You will typically see <strong>borderline or difficult cases</strong> where the decision
                      is not immediately clear. The most obvious violations are handled directly by our team.
                    </p>
                    <p className="text-green-800">
                      Examples include posts with ambiguous content, context-dependent humor, cultural nuances,
                      or cases where community standards aren't black-and-white.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 text-xl flex items-center gap-2">
                    <Heart className="w-6 h-6 text-red-600" />
                    Why This Matters
                  </h3>
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-5">
                    <ul className="space-y-2 text-gray-800">
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>Democratic decision-making that reflects community values</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>Protects both content creators and the community</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>Helps us scale fairly as the platform grows</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>Prevents any single person from having too much power</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 text-yellow-700 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-yellow-900 mb-2">Your Commitment</p>
                      <p className="text-yellow-800 text-sm">
                        Jury duty is voluntary and you can opt out at any time. When selected,
                        please review the case thoughtfully and respond within a reasonable timeframe.
                        Your participation helps maintain a fair and balanced community.
                      </p>
                    </div>
                  </div>
                </div>

                {message && (
                  <div className={`p-4 rounded-lg ${
                    message.includes('error') || message.includes('must be') || message.includes('sign in')
                      ? 'bg-red-50 text-red-800 border-2 border-red-200'
                      : 'bg-green-50 text-green-800 border-2 border-green-200'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="flex gap-3">
                  {needsSignIn ? (
                    <>
                      <button
                        onClick={() => navigate('/signin')}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        Sign In to Volunteer
                      </button>
                      <button
                        onClick={() => setShowModal(false)}
                        className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Close
                      </button>
                    </>
                  ) : needsVerification ? (
                    <>
                      <button
                        onClick={() => navigate('/get-verified')}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        Get Verified for Free to Join
                      </button>
                      <button
                        onClick={() => setShowModal(false)}
                        className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Close
                      </button>
                    </>
                  ) : !isVolunteer ? (
                    <>
                      <button
                        onClick={handleVolunteer}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          'Processing...'
                        ) : (
                          <>
                            <Scale className="w-6 h-6" />
                            Volunteer for Jury Pool
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowModal(false)}
                        className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Maybe Later
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowModal(false)}
                        className="flex-1 bg-green-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Check className="w-6 h-6" />
                        You're a Volunteer!
                      </button>
                      <button
                        onClick={handleUnvolunteer}
                        disabled={loading}
                        className="px-6 py-4 border-2 border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Updating...' : 'Opt Out'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
    );
  }
}
