import { X } from 'lucide-react';

interface DiscoveryInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DiscoveryInfoModal({ isOpen, onClose }: DiscoveryInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-2xl max-w-lg w-full p-6 relative border-2 border-teal-500/30">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-4">
          <div className="w-12 h-12 bg-teal-900/40 rounded-full flex items-center justify-center mb-4 border border-teal-500/30">
            <svg
              className="w-6 h-6 text-teal-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Discover Something New
          </h3>
          <p className="text-sm text-teal-300 font-medium mb-4">
            Why we share diverse content with you
          </p>
        </div>

        <div className="space-y-4 text-gray-300 leading-relaxed">
          <p>
            Our dear HuBlogger, we here at <span className="font-semibold text-white">Sentient Portal</span> believe
            it to be vital to be introduced and involved in conversations that may typically fall outside
            of our preferences or interests, so we send a couple of these per week to your feed in case
            you decide to read them and comment.
          </p>
          <p>
            Please understand that you are <span className="font-semibold text-white">not required to open any HuBlog post</span> or
            forced to read anything, so if you do not wish to read or engage with any particular posts, you
            can simply ignore it until it goes away.
          </p>
          <p className="text-sm italic text-gray-400 pt-2 border-t border-slate-600/30">
            Kind regards,<br />
            <span className="font-semibold text-gray-200">The Sentient Portal Team</span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 px-4 rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-colors font-medium"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
