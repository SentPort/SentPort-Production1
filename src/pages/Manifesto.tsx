import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Heart, Globe, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import CompactShareButtons from '../components/CompactShareButtons';
import Footer from '../components/Footer';

export default function Manifesto() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkVerificationStatus();
    }
  }, [user]);

  const checkVerificationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_verified, is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setIsVerified(data?.is_admin || data?.is_verified || false);
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  };

  const handleGetStarted = () => {
    if (!user) {
      navigate('/signin');
    } else if (!isVerified) {
      setShowVerificationModal(true);
    } else {
      navigate('/');
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <img
              src="/sentient-portal-logo.png"
              alt="Sentient Portal Logo"
              className="h-32 w-auto drop-shadow-lg"
            />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">The SentPort Manifesto</h1>
          <p className="text-xl text-gray-600">
            Building a human-first internet where authenticity matters
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <Shield className="text-blue-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Human Verified</h2>
            <p className="text-gray-700 leading-relaxed">
              Every user is verified as a real human through our multi-step behavioral and identity verification process. No bots, no artificial impostors, just real people with real accounts.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="bg-green-50 rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <Users className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Community Driven</h2>
            <p className="text-gray-700 leading-relaxed">
              Our platform is built on democratic principles where verified humans both create and help moderate content to shape the future of the platform together.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="bg-purple-50 rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <Heart className="text-purple-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ethical Design</h2>
            <p className="text-gray-700 leading-relaxed">
              No infinite scroll, no predatory engagement algorithms that push low-quality, exploitatively addictive cheap content, no dark patterns. We design our platforms to value and respect your time and attention, letting you log off when you want to. Real sentience not only deserves, but requires choice and a fair chance!
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="bg-orange-50 rounded-full w-16 h-16 flex items-center justify-center mb-6">
              <Globe className="text-orange-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Open Platform</h2>
            <p className="text-gray-700 leading-relaxed">
              Claim your own subdomain, build your own site, and own your digital presence. SentPort gives you the tools to create without corporate control, so others know your content comes from a real person.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-10 shadow-sm border border-gray-200 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Now?</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            As artificially-generated accounts and content become increasingly sophisticated, the internet is being flooded with synthetic content, bot-farm manipulation networks, and abusively exploitative algorithmic manipulation. Major platforms prioritize modern 'engagement to profit' pathways over user wellbeing, using addictive design patterns to maximize screen time at the expense of human flourishing.
          </p>
          <p className="text-gray-700 leading-relaxed mb-6 font-semibold">
            We believe there is a better way. A human-first internet where:
          </p>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">•</span>
              <span>Real humans connect with real humans</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">•</span>
              <span>Content is created by people, and algorithms should merely assist them with being discovered and rewarded for high-quality content</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">•</span>
              <span>Design respects human attention and dignity</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">•</span>
              <span>Communities are self-governed through democratically-respected moderation practices</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-10 shadow-lg text-white">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg leading-relaxed mb-6">
            SentPort exists to preserve and protect authentic human connection in an increasingly synthetic digital world. We provide the tools and platforms for verified humans to create, share, and discover content they can trust comes from real people.
          </p>
          <p className="text-lg leading-relaxed mb-6">
            By combining rigorous identity verification with ethical design principles and community governance, we're building a digital ecosystem where humanity comes first.
          </p>
          <p className="text-lg leading-relaxed font-semibold">
            Join us in reclaiming the internet for humans.
          </p>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={handleGetStarted}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-colors"
          >
            Get Started
          </button>
          <div className="mt-8 pt-8 border-t border-gray-200">
            <CompactShareButtons variant="minimal" />
          </div>
        </div>
      </div>
      <Footer />

      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowVerificationModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mb-6">
                <CheckCircle2 className="text-blue-600" size={40} />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Get Verified
              </h2>

              <p className="text-gray-600 mb-6 leading-relaxed">
                To access all SentPort features and platforms, you need to complete the human verification process. This ensures our community remains authentic and bot-free.
              </p>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Get Verified
              </button>

              <button
                onClick={() => setShowVerificationModal(false)}
                className="mt-3 text-gray-500 hover:text-gray-700"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
