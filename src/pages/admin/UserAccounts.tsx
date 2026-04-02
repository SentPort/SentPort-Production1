import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Mail, Shield, CheckCircle, XCircle, Globe, Calendar, Clock } from 'lucide-react';

interface UserAccount {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  full_name: string | null;
  is_admin: boolean;
  is_verified: boolean;
  subdomain_count: number;
}

interface SubdomainInfo {
  id: string;
  subdomain: string;
  status: string;
  is_primary: boolean;
  created_at: string;
}

interface SubdomainsModalProps {
  userId: string;
  userEmail: string;
  onClose: () => void;
}

function SubdomainsModal({ userId, userEmail, onClose }: SubdomainsModalProps) {
  const [subdomains, setSubdomains] = useState<SubdomainInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubdomains = async () => {
      try {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('primary_subdomain_id')
          .eq('id', userId)
          .maybeSingle();

        const primarySubdomainId = profileData?.primary_subdomain_id;

        const { data, error } = await supabase
          .from('subdomains')
          .select('id, subdomain, status, created_at')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const enrichedData = (data || []).map(sub => ({
          ...sub,
          is_primary: sub.id === primarySubdomainId
        }));

        setSubdomains(enrichedData);
      } catch (error) {
        console.error('Error fetching subdomains:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubdomains();
  }, [userId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">User Subdomains</h2>
              <p className="text-blue-100">{userEmail}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : subdomains.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No subdomains found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Subdomain</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Primary</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {subdomains.map((subdomain) => (
                    <tr key={subdomain.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{subdomain.subdomain}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(subdomain.status)}`}>
                          {subdomain.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {subdomain.is_primary ? (
                          <span className="inline-flex items-center gap-1 text-yellow-600 font-medium">
                            <span className="text-lg">★</span> Primary
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {formatDate(subdomain.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={`https://${subdomain.subdomain}.sentport.com`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                        >
                          Visit →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UserAccounts() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmailVerified, setFilterEmailVerified] = useState<boolean | null>(null);
  const [filterFullyVerified, setFilterFullyVerified] = useState<boolean | null>(null);
  const [filterAdmin, setFilterAdmin] = useState<boolean | null>(null);
  const [sortField, setSortField] = useState<'created_at' | 'last_sign_in_at' | 'email' | 'full_name'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, filterEmailVerified, filterFullyVerified, filterAdmin, sortField, sortDirection, currentPage, pageSize]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let countQuery = supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      let dataQuery = supabase
        .from('user_profiles')
        .select('id, email, full_name, is_admin, is_verified, created_at');

      if (searchTerm) {
        const searchPattern = `%${searchTerm}%`;
        countQuery = countQuery.or(`email.ilike.${searchPattern},full_name.ilike.${searchPattern}`);
        dataQuery = dataQuery.or(`email.ilike.${searchPattern},full_name.ilike.${searchPattern}`);
      }

      if (filterFullyVerified !== null) {
        countQuery = countQuery.eq('is_verified', filterFullyVerified);
        dataQuery = dataQuery.eq('is_verified', filterFullyVerified);
      }

      if (filterAdmin !== null) {
        countQuery = countQuery.eq('is_admin', filterAdmin);
        dataQuery = dataQuery.eq('is_admin', filterAdmin);
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      const { data: profilesData, error: profilesError } = await dataQuery
        .order(sortField, { ascending: sortDirection === 'asc' })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (profilesError) throw profilesError;

      const userIds = (profilesData || []).map(p => p.id);

      const { data: authData } = await supabase.auth.admin.listUsers();

      const { data: subdomainCounts } = await supabase
        .from('subdomains')
        .select('owner_id')
        .in('owner_id', userIds);

      const subdomainCountMap = (subdomainCounts || []).reduce((acc, sub) => {
        acc[sub.owner_id] = (acc[sub.owner_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const enrichedUsers: UserAccount[] = (profilesData || []).map(profile => {
        const authUser = authData?.users.find(u => u.id === profile.id);

        return {
          id: profile.id,
          email: profile.email,
          email_confirmed_at: authUser?.email_confirmed_at || null,
          last_sign_in_at: authUser?.last_sign_in_at || null,
          created_at: profile.created_at,
          full_name: profile.full_name,
          is_admin: profile.is_admin,
          is_verified: profile.is_verified,
          subdomain_count: subdomainCountMap[profile.id] || 0
        };
      });

      let filteredUsers = enrichedUsers;
      if (filterEmailVerified !== null) {
        filteredUsers = filteredUsers.filter(u =>
          filterEmailVerified ? u.email_confirmed_at !== null : u.email_confirmed_at === null
        );
      }

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterEmailVerified(null);
    setFilterFullyVerified(null);
    setFilterAdmin(null);
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    searchTerm !== '',
    filterEmailVerified !== null,
    filterFullyVerified !== null,
    filterAdmin !== null
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">User Accounts</h1>
                <p className="text-blue-100">Manage and view all registered users</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{totalCount}</div>
              <div className="text-blue-100 text-sm">Total Users</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Search by Email or Name
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Enter email or name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Verified</label>
              <select
                value={filterEmailVerified === null ? '' : filterEmailVerified.toString()}
                onChange={(e) => {
                  setFilterEmailVerified(e.target.value === '' ? null : e.target.value === 'true');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fully Verified (Didit)</label>
              <select
                value={filterFullyVerified === null ? '' : filterFullyVerified.toString()}
                onChange={(e) => {
                  setFilterFullyVerified(e.target.value === '' ? null : e.target.value === 'true');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Status</label>
              <select
                value={filterAdmin === null ? '' : filterAdmin.toString()}
                onChange={(e) => {
                  setFilterAdmin(e.target.value === '' ? null : e.target.value === 'true');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="true">Admin</option>
                <option value="false">Non-Admin</option>
              </select>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Clear Filters ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-24">
              <Users className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl mb-2">No users found</p>
              <p className="text-gray-400">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('full_name')}
                      >
                        Name {sortField === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Admin
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Verified
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Subdomains
                        </div>
                      </th>
                      <th
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Created {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('last_sign_in_at')}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Last Login {sortField === 'last_sign_in_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{user.email}</span>
                            {user.email_confirmed_at && (
                              <CheckCircle className="w-4 h-4 text-green-500" title="Email Verified" />
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-700">
                          {user.full_name || <span className="text-gray-400 italic">Not set</span>}
                        </td>
                        <td className="py-4 px-6">
                          {user.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold border border-red-200">
                              <Shield className="w-3 h-3" />
                              Yes
                            </span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {user.is_verified ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold border border-blue-200">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {user.subdomain_count > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setSelectedUserEmail(user.email);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold border border-indigo-200 hover:bg-indigo-200 transition-colors"
                            >
                              <Globe className="w-3 h-3" />
                              {user.subdomain_count}
                            </button>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-gray-600 text-sm">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="py-4 px-6 text-gray-600 text-sm">
                          {formatRelativeTime(user.last_sign_in_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-4 py-2 text-sm font-medium text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedUserId && (
        <SubdomainsModal
          userId={selectedUserId}
          userEmail={selectedUserEmail}
          onClose={() => {
            setSelectedUserId(null);
            setSelectedUserEmail('');
          }}
        />
      )}
    </div>
  );
}
