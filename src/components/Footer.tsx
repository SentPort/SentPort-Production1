import { Link } from 'react-router-dom';
import CompactShareButtons from './CompactShareButtons';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="inline-block mb-3 hover:opacity-80 transition-opacity">
              <img
                src="/sentient-portal-logo.png"
                alt="Sentient Portal"
                className="h-16 w-auto"
              />
            </Link>
            <p className="text-sm text-gray-400">
              The Human Internet - where every user is verified as human.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">About</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/manifesto" className="hover:text-white transition-colors">
                  Manifesto
                </Link>
              </li>
              <li>
                <Link to="/get-verified" className="hover:text-white transition-colors">
                  Get Verified
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Platforms</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/hubook" className="hover:text-white transition-colors">
                  HuBook
                </Link>
              </li>
              <li>
                <Link to="/heddit" className="hover:text-white transition-colors">
                  Heddit
                </Link>
              </li>
              <li>
                <Link to="/hutube" className="hover:text-white transition-colors">
                  HuTube
                </Link>
              </li>
              <li>
                <Link to="/hinsta" className="hover:text-white transition-colors">
                  Hinsta
                </Link>
              </li>
              <li>
                <Link to="/switter" className="hover:text-white transition-colors">
                  Switter
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-white transition-colors">
                  HuBlog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Tools</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/make-your-own-site" className="hover:text-white transition-colors">
                  Make Your Site
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <p className="text-sm text-gray-400">
                © {new Date().getFullYear()} SentPort. All rights reserved.
              </p>
              <Link to="/terms-of-service" className="text-sm text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Share the Human Internet:</span>
              <CompactShareButtons variant="icons" size="sm" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
