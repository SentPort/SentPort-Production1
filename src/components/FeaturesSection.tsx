import { Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CompactShareButtons from './CompactShareButtons';

export default function FeaturesSection() {
  const navigate = useNavigate();

  return (
    <section className="bg-gradient-to-br from-green-500 to-green-600 py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-white border border-white/20">
            <h3 className="text-2xl font-bold mb-4">Verified Human Content Only</h3>
            <p className="leading-relaxed">
              Every user on SentPort is verified as a real human through our multi-step verification process. No bots, no AI-generated accounts, just authentic human connections.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-white border border-white/20">
            <h3 className="text-2xl font-bold mb-4">Free Subdomains & Website Builder</h3>
            <p className="leading-relaxed">
              Claim up to THREE free yourname.sentport.com subdomains and build your verifiably-human presence to be discovered in our search results of only human-created content within this ecosystem
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-white border border-white/20">
            <h3 className="text-2xl font-bold mb-4">Build with Code or No-Code</h3>
            <p className="leading-relaxed">
              Use our intuitive website builder, or upload your own original code, to create your personal site, portfolio, blog, or business page
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-white border border-white/20">
            <h3 className="text-2xl font-bold mb-4">Human-Only Social Media Platforms</h3>
            <p className="leading-relaxed">
              Access reimagined versions of all your favorite social platforms: Heddit, Switter, HuBook, Hinsta, and HuTube. All verified human users, zero bots or AI spam.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-white border border-white/20">
            <h3 className="text-2xl font-bold mb-4">Free Forever for Verified Humans</h3>
            <p className="leading-relaxed">
              Join our community and access all human-verified platforms at zero cost forever
            </p>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/make-your-own-site')}
            className="bg-white hover:bg-gray-100 text-green-600 px-6 md:px-10 py-3 md:py-4 rounded-lg font-bold text-base md:text-lg shadow-lg flex items-center space-x-2 mx-auto"
          >
            <Globe size={24} />
            <span>Claim Your Free Subdomain Now</span>
          </button>
          <div className="mt-8 pt-8 border-t border-white/20">
            <CompactShareButtons variant="inline" />
          </div>
        </div>
      </div>
    </section>
  );
}
