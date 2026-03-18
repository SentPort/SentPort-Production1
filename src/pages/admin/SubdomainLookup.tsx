import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Globe, Search, User, Mail, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SubdomainRecord {
  id: string;
  subdomain: string;
  owner_id: string;
  owner_email: string;
  owner_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SubdomainWithProfile extends SubdomainRecord {
  owner_profile?: {
    is_verified: boolean;
    is_admin: boolean;
    created_at: string;
  };
}

export default function SubdomainLookup() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'subdomain' | 'email' | 'name'>('subdomain');
  const [results, setResults] = useState<SubdomainWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      let query = supabase.from('subdomains').select('*');

      if (searchType === 'subdomain') {
        query = query.ilike('subdomain', `%${searchTerm}%`);
      } else if (searchType === 'email') {
        query = query.ilike('owner_email', `%${searchTerm}%`);
      } else if (searchType === 'name') {
        query = query.ilike('owner_name', `%${searchTerm}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedResults = await Promise.all(
        (data || []).map(async (subdomain) => {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('is_verified, is_admin, created_at')
            .eq('id', subdomain.owner_id)
            .maybeSingle();

          return {
            ...subdomain,
            owner_profile: profileData || undefined
          };
        })
      );

      setResults(enrichedResults);
    } catch (error) {
      console.error('Error searching subdomains:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <Globe className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Subdomain Lookup</h1>
              <p className="text-purple-100">Search and manage all claimed subdomains</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search By
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchType('subdomain')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    searchType === 'subdomain'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Subdomain
                </button>
                <button
                  onClick={() => setSearchType('email')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    searchType === 'email'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Email
                </button>
                <button
                  onClick={() => setSearchType('name')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    searchType === 'name'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Name
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Term
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={`Enter ${searchType}...`}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-600">Try a different search term or search type.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="text-sm font-semibold text-gray-700">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
            </div>

            {results.map((record) => (
              <div key={record.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Globe className="w-6 h-6 text-purple-600" />
                        <h3 className="text-2xl font-bold text-gray-900">
                          {record.subdomain}.sentport.com
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm font-semibold text-gray-700">Owner Email</div>
                            <div className="text-gray-900">{record.owner_email}</div>
                          </div>
                        </div>

                        {record.owner_name && (
                          <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                              <div className="text-sm font-semibold text-gray-700">Owner Name</div>
                              <div className="text-gray-900">{record.owner_name}</div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm font-semibold text-gray-700">Claimed On</div>
                            <div className="text-gray-900">
                              {new Date(record.created_at).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm font-semibold text-gray-700">Last Updated</div>
                            <div className="text-gray-900">
                              {new Date(record.updated_at).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-6">
                      <div className={`px-4 py-2 rounded-full font-bold text-center ${getStatusColor(record.status)}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </div>
                    </div>
                  </div>

                  {record.owner_profile && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="text-sm font-semibold text-gray-700 mb-3">Owner Account Details</div>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          {record.owner_profile.is_verified ? (
                            <>
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-semibold text-green-700">Verified Human</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-red-600" />
                              <span className="text-sm font-semibold text-red-700">Not Verified</span>
                            </>
                          )}
                        </div>

                        {record.owner_profile.is_admin && (
                          <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold">
                            Admin Account
                          </div>
                        )}

                        <div className="text-sm text-gray-600">
                          Account created: {new Date(record.owner_profile.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
