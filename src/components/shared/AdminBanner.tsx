import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Globe, Users, UserCheck, Search, CheckCircle, BarChart3, Pin, Tags } from 'lucide-react';
import AdminManagementModal from './AdminManagementModal';
import { AccountManagementModal } from './AccountManagementModal';
import VerifiedExternalDomainsModal from './VerifiedExternalDomainsModal';

export default function AdminBanner() {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showVerifiedDomainsModal, setShowVerifiedDomainsModal] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Admin Account
              </h2>
              <p className="text-red-100 text-sm">You have administrative privileges</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/moderation-controls"
              className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg text-white font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm border-2 border-white/30"
            >
              <Shield className="w-4 h-4" />
              <span>Moderation Controls</span>
            </Link>
            <Link
              to="/admin/subdomain-lookup"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm"
            >
              <Globe className="w-4 h-4" />
              <span>Subdomain Lookup</span>
            </Link>
            <button
              onClick={() => setShowAdminModal(true)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm"
            >
              <Users className="w-4 h-4" />
              <span>Add/Remove Admin</span>
            </button>
            <button
              onClick={() => setShowAccountModal(true)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm"
            >
              <UserCheck className="w-4 h-4" />
              <span>Add/Remove Account</span>
            </button>
            <button
              onClick={() => setShowVerifiedDomainsModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Verified External</span>
            </button>
            <Link
              to="/admin/web-crawler"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm"
            >
              <Search className="w-4 h-4" />
              <span>Web Crawler Dashboard</span>
            </Link>
            <Link
              to="/admin/analytics"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics & Metrics</span>
            </Link>
            <Link
              to="/admin/pins-management"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm"
            >
              <Pin className="w-4 h-4" />
              <span>Manage Pinned Content</span>
            </Link>
            <Link
              to="/admin/tag-management"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm"
            >
              <Tags className="w-4 h-4" />
              <span>Tag Management</span>
            </Link>
          </div>
        </div>
      </div>

      {showAdminModal && (
        <AdminManagementModal onClose={() => setShowAdminModal(false)} />
      )}

      {showAccountModal && (
        <AccountManagementModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
        />
      )}

      {showVerifiedDomainsModal && (
        <VerifiedExternalDomainsModal onClose={() => setShowVerifiedDomainsModal(false)} />
      )}
    </>
  );
}
