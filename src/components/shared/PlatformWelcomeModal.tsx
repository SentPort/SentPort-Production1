import { useEffect, useState } from 'react';
import { X, Sparkles, Users, Shield, Heart, BookOpen, MessageSquare, Camera, Video, Bird } from 'lucide-react';
import CompactShareButtons from '../CompactShareButtons';

interface PlatformWelcomeModalProps {
  onClose: () => void;
  displayName: string;
  platform: 'hubook' | 'blog' | 'heddit' | 'hinsta' | 'hutube' | 'switter';
}

const platformConfig = {
  hubook: {
    icon: Sparkles,
    title: 'Welcome Home to HuBook',
    gradient: 'from-blue-500 via-cyan-500 to-teal-500',
    iconBg: 'bg-blue-500',
    accentColor: 'blue',
    tagline: 'You\'ve just stepped into history. Welcome to HuBook - the world\'s first human-only social network, where real people connect in a space built just for us.',
    nostalgiaText: 'Remember when the internet felt magical? When you knew the person behind every profile was real, when conversations had heart, and when communities thrived on genuine human connection? We\'re bringing that feeling back.',
    features: [
      { icon: Users, title: 'Real Humans', description: 'Every profile is verified, every connection authentic' },
      { icon: Shield, title: 'Your Privacy', description: 'Identity verified, privacy sacred' },
      { icon: Heart, title: 'Genuine Connection', description: 'Interactions that are authentically human' }
    ],
    closingMessage: 'This isn\'t just another platform. This is the beginning of the new internet - where humanity reclaims its digital spaces, where your identity is verified but your privacy is sacred, and where every interaction is authentically, beautifully, undeniably human.',
    cta: 'Start Connecting'
  },
  blog: {
    icon: BookOpen,
    title: 'Welcome to HuBlog',
    gradient: 'from-blue-600 via-teal-500 to-emerald-500',
    iconBg: 'bg-blue-600',
    accentColor: 'blue',
    tagline: 'Welcome to HuBlog - where authentic voices share stories that matter, written by real humans for real humans.',
    nostalgiaText: 'Remember when blogs were personal? When every post had a unique voice, when writers poured their hearts into long-form content, and when readers discovered genuine perspectives instead of algorithmic slop? That era is back.',
    features: [
      { icon: BookOpen, title: 'Authentic Voices', description: 'Every writer is verified, every story is human' },
      { icon: Shield, title: 'Quality Content', description: 'No bots, no spam, just real writing' },
      { icon: Users, title: 'Real Readers', description: 'Build an audience of actual humans' }
    ],
    closingMessage: 'This is more than a blogging platform. This is a sanctuary for genuine thought, a space where your words reach real people who actually care, and where the art of writing is celebrated - not devalued by synthetic noise.',
    cta: 'Start Writing'
  },
  heddit: {
    icon: MessageSquare,
    title: 'Welcome to Heddit',
    gradient: 'from-orange-500 to-red-500',
    iconBg: 'bg-orange-500',
    accentColor: 'orange',
    tagline: 'Welcome to Heddit - the front page of human-verified content, where real people share, discuss, and discover.',
    nostalgiaText: 'Remember when online communities felt like neighborhoods? When upvotes meant something because they came from real humans, when discussions were thoughtful, and when you could trust that the person replying actually existed? We\'re restoring that trust.',
    features: [
      { icon: Users, title: 'Real Communities', description: 'Every member verified, every voice authentic' },
      { icon: Shield, title: 'Genuine Discourse', description: 'Conversations with actual humans' },
      { icon: MessageSquare, title: 'Trusted Votes', description: 'Upvotes from real people who care' }
    ],
    closingMessage: 'This is the front page of the human internet. Here, communities thrive on authentic engagement, your contributions matter to real people, and every interaction is backed by the guarantee that you\'re talking to another verified human.',
    cta: 'Start Exploring'
  },
  hinsta: {
    icon: Camera,
    title: 'Welcome to Hinsta',
    gradient: 'from-pink-500 via-rose-500 to-orange-500',
    iconBg: 'bg-pink-500',
    accentColor: 'pink',
    tagline: 'Welcome to Hinsta - where authentic moments are captured and shared by real humans, not fabricated by algorithms.',
    nostalgiaText: 'Remember when photos online were genuine moments? When you knew the person in every picture was real, when filters enhanced rather than replaced reality, and when visual stories connected hearts instead of gaming engagement metrics? Those days are here again.',
    features: [
      { icon: Camera, title: 'Authentic Moments', description: 'Every photo from a verified human' },
      { icon: Shield, title: 'Real People', description: 'No AI-generated fakery, just life' },
      { icon: Heart, title: 'Genuine Reactions', description: 'Likes from humans who actually care' }
    ],
    closingMessage: 'This is visual storytelling reclaimed. Share your life knowing every viewer is real, every like is genuine, and every moment you capture is valued by actual human beings who see beauty in authenticity.',
    cta: 'Start Sharing'
  },
  hutube: {
    icon: Video,
    title: 'Welcome to HuTube',
    gradient: 'from-red-600 to-red-700',
    iconBg: 'bg-red-600',
    accentColor: 'red',
    tagline: 'Welcome to HuTube - where real creators share authentic video content with actual human audiences.',
    nostalgiaText: 'Remember when online video meant real creators sharing their passions? When viewer counts represented actual humans watching, when comments came from real people, and when going viral meant genuine human interest? We\'re bringing back the authenticity.',
    features: [
      { icon: Video, title: 'Real Creators', description: 'Every channel verified, every video human-made' },
      { icon: Users, title: 'Actual Viewers', description: 'Real humans watching and engaging' },
      { icon: Shield, title: 'Authentic Growth', description: 'Build an audience that actually exists' }
    ],
    closingMessage: 'This is the creator economy as it should be. Your videos reach real viewers, your analytics represent actual humans, and your creative work is valued by people, not manipulated by bots pretending to care.',
    cta: 'Start Creating'
  },
  switter: {
    icon: Bird,
    title: 'Welcome to Switter',
    gradient: 'from-sky-400 to-blue-500',
    iconBg: 'bg-sky-500',
    accentColor: 'sky',
    tagline: 'Welcome to Switter - where conversations happen in real-time between real humans, and every sweet comes from an authentic voice.',
    nostalgiaText: 'Remember when microblogging felt electric? When trending topics reflected real human interest, when viral sweets spread because people actually cared, and when your timeline was filled with genuine thoughts from real individuals? That energy is back.',
    features: [
      { icon: Bird, title: 'Authentic Voices', description: 'Every sweet from a verified human' },
      { icon: Users, title: 'Real Conversations', description: 'Talk to actual people who exist' },
      { icon: Shield, title: 'Genuine Trends', description: 'What\'s trending actually matters' }
    ],
    closingMessage: 'This is microblogging reborn. When you post a sweet, real humans see it. When you go viral, it\'s because actual people resonated with your words. Every resweet, every reply, every like - all unmistakably, verifiably human.',
    cta: 'Start Sweeting'
  }
};

export default function PlatformWelcomeModal({ onClose, displayName, platform }: PlatformWelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = platformConfig[platform];
  const Icon = config.icon;

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleClose = async () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity duration-300">
      <div
        className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="relative">
          <div className={`bg-gradient-to-r ${config.gradient} px-8 py-12 text-center`}>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6 shadow-lg">
              <Icon className={`w-10 h-10 text-${config.accentColor}-500`} />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">{config.title}</h1>
            <p className="text-white text-opacity-90 text-lg font-medium">{displayName}</p>
          </div>

          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="px-8 py-8">
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 leading-relaxed mb-6">
                {config.tagline}
              </p>

              <div className={`bg-gradient-to-br from-${config.accentColor}-50 to-cyan-50 rounded-xl p-6 mb-6`}>
                <p className="text-gray-700 leading-relaxed italic">
                  {config.nostalgiaText}
                </p>
              </div>

              <div className="text-center mb-6 pb-6 border-b border-gray-200">
                <p className="text-gray-600 text-sm mb-3 font-medium">
                  Love this message? Share it with friends and family who'd love the human internet!
                </p>
                <div className="flex justify-center">
                  <CompactShareButtons variant="icons" size="md" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                {config.features.map((feature, index) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div key={index} className="text-center p-4">
                      <div className={`inline-flex items-center justify-center w-12 h-12 bg-${config.accentColor}-100 rounded-full mb-3`}>
                        <FeatureIcon className={`w-6 h-6 text-${config.accentColor}-600`} />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  );
                })}
              </div>

              <p className="text-gray-700 leading-relaxed mb-6">
                {config.closingMessage}
              </p>

              <div className={`bg-gradient-to-r from-gray-50 to-${config.accentColor}-50 rounded-xl p-6 border-l-4 border-${config.accentColor}-500`}>
                <p className="text-gray-800 leading-relaxed font-medium mb-2">
                  Thank you for being a pioneer. Thank you for choosing to be part of something that puts humanity first.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  The future of the internet starts here, and it starts with you.
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={handleClose}
                className={`px-8 py-3 bg-gradient-to-r ${config.gradient} text-white font-semibold rounded-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105`}
              >
                {config.cta}
              </button>
            </div>

            <p className="text-center text-gray-500 text-sm mt-6 italic">
              Welcome to the community. Welcome to {config.title.replace('Welcome to ', '').replace('Welcome Home to ', '')}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
