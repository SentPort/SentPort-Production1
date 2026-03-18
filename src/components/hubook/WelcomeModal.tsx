import { useEffect, useState } from 'react';
import { X, Sparkles, Users, Shield, Heart } from 'lucide-react';
import CompactShareButtons from '../CompactShareButtons';

interface WelcomeModalProps {
  onClose: () => void;
  displayName: string;
}

export default function WelcomeModal({ onClose, displayName }: WelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(false);

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
          <div className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 px-8 py-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6 shadow-lg">
              <Sparkles className="w-10 h-10 text-blue-500" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Welcome Home to HuBook</h1>
            <p className="text-blue-50 text-lg font-medium">{displayName}</p>
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
                You've just stepped into history. Welcome to HuBook - the world's first human-only social network, where real people connect in a space built just for us.
              </p>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 mb-6">
                <p className="text-gray-700 leading-relaxed italic">
                  Remember when the internet felt magical? When you knew the person behind every profile was real, when conversations had heart, and when communities thrived on genuine human connection? We're bringing that feeling back.
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
                <div className="text-center p-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Real Humans</h3>
                  <p className="text-sm text-gray-600">Every profile is verified, every connection authentic</p>
                </div>

                <div className="text-center p-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-cyan-100 rounded-full mb-3">
                    <Shield className="w-6 h-6 text-cyan-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Your Privacy</h3>
                  <p className="text-sm text-gray-600">Identity verified, privacy sacred</p>
                </div>

                <div className="text-center p-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-teal-100 rounded-full mb-3">
                    <Heart className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Genuine Connection</h3>
                  <p className="text-sm text-gray-600">Interactions that are authentically human</p>
                </div>
              </div>

              <p className="text-gray-700 leading-relaxed mb-6">
                This isn't just another platform. This is the beginning of the new internet - where humanity reclaims its digital spaces, where your identity is verified but your privacy is sacred, and where every interaction is authentically, beautifully, undeniably human.
              </p>

              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border-l-4 border-blue-500">
                <p className="text-gray-800 leading-relaxed font-medium mb-2">
                  Thank you for being a pioneer. Thank you for choosing to be part of something that puts humanity first.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  The future of social connection starts here, and it starts with you.
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Start Connecting
              </button>
            </div>

            <p className="text-center text-gray-500 text-sm mt-6 italic">
              Welcome to the community. Welcome to HuBook.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
