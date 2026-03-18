import { Shield, CheckCircle } from 'lucide-react';
import CompactShareButtons from './CompactShareButtons';

export default function JoinSection() {
  return (
    <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-block bg-white rounded-full p-6 mb-6">
            <Shield className="text-blue-600" size={48} />
          </div>
          <h2 className="text-white text-5xl font-bold mb-6">Join the Human Web</h2>
          <p className="text-white text-xl max-w-3xl mx-auto leading-relaxed">
            Establish your verified human presence. Claim your own sentport.com subdomain, build your own fully-functioning website, and have your content discovered in our search as verifiably-human.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
            <div className="bg-white/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-white" size={40} />
            </div>
            <h3 className="text-white text-2xl font-bold mb-4">Human Verified</h3>
            <p className="text-white/90 leading-relaxed">
              Prove you're a real human through our multi-step verification process
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
            <div className="bg-white/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-white" size={40} />
            </div>
            <h3 className="text-white text-2xl font-bold mb-4">Own Your Space</h3>
            <p className="text-white/90 leading-relaxed">
              Get your own subdomain and build your presence on the human internet
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
            <div className="bg-white/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-white" size={40} />
            </div>
            <h3 className="text-white text-2xl font-bold mb-4">No Bots, No Slop</h3>
            <p className="text-white/90 leading-relaxed">
              Join a community of verified humans in an authentic digital space
            </p>
          </div>
        </div>

        <div className="text-center">
          <button className="bg-white hover:bg-gray-100 text-blue-600 px-12 py-4 rounded-lg font-bold text-xl shadow-lg">
            Start Free Verification Process
          </button>
          <div className="mt-8">
            <p className="text-white/80 text-sm mb-3">Know someone who'd love this?</p>
            <div className="inline-flex bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <CompactShareButtons variant="icons" size="sm" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
