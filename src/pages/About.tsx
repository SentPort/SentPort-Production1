import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Globe, AlertTriangle, Bot, Target, CheckCircle2, X, Sparkles, Lock, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import CompactShareButtons from '../components/CompactShareButtons';
import Footer from '../components/Footer';

export default function About() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

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
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <img
              src="/sentient-portal-logo.png"
              alt="Sentient Portal Logo"
              className="h-40 w-auto drop-shadow-lg"
            />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">About Sentient Portal</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Reclaiming the internet for real human voices in an age of bot-farms, mass-produced fake AI accounts, and exploitative algorithmic manipulation
          </p>
        </div>

        <div className="bg-white rounded-xl p-10 shadow-sm border border-gray-200 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Who We Are</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Sentient Portal is a human-first digital ecosystem built on a simple but radical premise: the internet should be for real people, created by real people, governed by real people.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            We're technologists, designers, and community builders who believe that the current state of the internet has strayed from its original promise. Instead of connecting humanity through high-quality content, major platforms have become exploitative engagement 'slop' machines optimized for profit, not people.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Our team is dedicated to creating a digital space where authenticity matters, where your data belongs to you, and where communities can thrive without corporate interference.
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-gray-800 rounded-xl p-10 shadow-lg mb-12 text-white">
          <h2 className="text-3xl font-bold mb-6 text-center">We Pose Just One Question</h2>
          <p className="text-2xl font-semibold text-center mb-6 text-cyan-300">
            Has the modern internet made you feel better about your life over the years, or worse with time?
          </p>
          <p className="text-gray-200 leading-relaxed mb-4">
            If you are anything like most modern people, you know exactly what the answer is. The problems and their reasons are many, but we do not believe that the solutions are impossible to deliver on. The hard truth is that things must change, and we're hoping that can start right here at Sentient Portal.
          </p>
          <p className="text-gray-200 leading-relaxed">
            Sentient Portal functions as an internet within the broader internet. Where real verified-human beings can once again truly interact with each other without unknowingly having conversations with bots, or discovering a creepy ad in front of you soon after merely thinking about something, as just a couple of examples.
          </p>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">The Problems We All Face</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-red-100">
              <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <Bot className="text-red-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Bot Armies & AI Imposters</h3>
              <p className="text-gray-700 leading-relaxed">
                The internet is increasingly flooded with bots, fake accounts, and AI-generated content masquerading as human voices. It's becoming impossible to know who or what is real online.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-orange-100">
              <div className="bg-orange-50 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <Target className="text-orange-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Algorithmic Manipulation</h3>
              <p className="text-gray-700 leading-relaxed">
                Most modern mainstream engagement algorithms prioritize controversy and addiction over well-being, using dark patterns to maximize screen time and manipulate behavior for profit.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-yellow-100">
              <div className="bg-yellow-50 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <AlertTriangle className="text-yellow-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Data Exploitation</h3>
              <p className="text-gray-700 leading-relaxed">
                Your personal information is harvested, packaged, and sold to the highest bidder. You're not the customer, you're the product.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100">
              <div className="bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <Lock className="text-slate-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Platform Lock-In</h3>
              <p className="text-gray-700 leading-relaxed">
                Corporate platforms own your content, your audience, and your digital identity. You're building someone else's empire, not your own digital presence.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Solution</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 border border-blue-200">
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mb-6 shadow-sm">
                <Shield className="text-blue-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Human Verification</h3>
              <p className="text-gray-700 leading-relaxed">
                Every user undergoes rigorous multi-step behavioral and identity verification. No bots, no fake accounts or impostors, just verified humans.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 border border-green-200">
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mb-6 shadow-sm">
                <Users className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Human Connection</h3>
              <p className="text-gray-700 leading-relaxed">
                Verified humans can interact with high quality trust once again. You can search the web and be guaranteed to see Human-Verified Content from our own free subdomain owners, as well as the external internet.
              </p>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-8 border border-cyan-200">
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mb-6 shadow-sm">
                <Globe className="text-cyan-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Human-verified Presence</h3>
              <p className="text-gray-700 leading-relaxed">
                Claim your own free subdomain, build your own site, and control your digital identity. Your human-only content, your human-only platform.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-10 shadow-lg text-white">
            <div className="flex items-start gap-4 mb-6">
              <Sparkles className="flex-shrink-0 mt-1" size={32} />
              <div>
                <h3 className="text-2xl font-bold mb-3">For Verified Members</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-cyan-200 font-bold mr-3">•</span>
                    <span>Access to all SentPort platforms: HuBook, HuTube, Hinsta, Switter, Heddit, and HuBlog - <em>(human/sentient versions)</em></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan-200 font-bold mr-3">•</span>
                    <span>Verified badge proving you're a real human, not a bot</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan-200 font-bold mr-3">•</span>
                    <span>No disingenuous algorithmic manipulation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan-200 font-bold mr-3">•</span>
                    <span>Connect with other verified humans you can trust</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-4 mt-8 pt-8 border-t border-cyan-400">
              <Heart className="flex-shrink-0 mt-1" size={32} />
              <div>
                <h3 className="text-2xl font-bold mb-3">For Subdomain Owners</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-cyan-200 font-bold mr-3">•</span>
                    <span>Your own corner of the internet: yourname.sentientportal.com</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan-200 font-bold mr-3">•</span>
                    <span>Build and customize your personal site with our easy tools</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan-200 font-bold mr-3">•</span>
                    <span>Verified ownership proving your content comes from a real person</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan-200 font-bold mr-3">•</span>
                    <span>Priority placement in our search results over non-verified content</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-10 shadow-sm border border-gray-200 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Commitment</h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p className="flex items-start">
              <CheckCircle2 className="text-green-600 flex-shrink-0 mr-3 mt-1" size={20} />
              <span><strong>Ethical Design:</strong> No infinite scroll, no exploitative engagement algorithms, no addiction tactics. Respect for transparency, your time, and your valued human attention.</span>
            </p>
            <p className="flex items-start">
              <CheckCircle2 className="text-green-600 flex-shrink-0 mr-3 mt-1" size={20} />
              <span><strong>Transparency:</strong> Open about our practices, our code, and our decision-making processes.</span>
            </p>
            <p className="flex items-start">
              <CheckCircle2 className="text-green-600 flex-shrink-0 mr-3 mt-1" size={20} />
              <span><strong>Community Driven:</strong> The goal of our platform will always be to bring back the days of actual online human-only communities and maintain them as a necessity for all of our futures.</span>
            </p>
            <p className="flex items-start">
              <CheckCircle2 className="text-green-600 flex-shrink-0 mr-3 mt-1" size={20} />
              <span><strong>Human First:</strong> Technology serves humanity, not the other way around.</span>
            </p>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Join the Movement</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Be part of building a better internet. One where real humans connect within high-quality atmospheres, create, and thrive without corporate manipulation or artificial interference.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-colors"
          >
            Get Started Today
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
