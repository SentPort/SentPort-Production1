import { useState, useEffect, useCallback, useRef } from 'react';
import { X, CheckCircle, Globe, Trash2, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface VerifiedDomain {
  id: string;
  domain: string;
  verified_at: string;
  notes: string | null;
}

interface VerifiedExternalDomainsModalProps {
  onClose: () => void;
}

export default function VerifiedExternalDomainsModal({ onClose }: VerifiedExternalDomainsModalProps) {
  const [urlInput, setUrlInput] = useState('');
  const [verifiedDomains, setVerifiedDomains] = useState<VerifiedDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { user } = useAuth();
  const loadingRef = useRef(false);
  const messageTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    if (submitting) {
      return;
    }
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    onClose();
  };

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    if (!mountedRef.current) return;

    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    setMessage({ type, text });
    messageTimeoutRef.current = window.setTimeout(() => {
      if (mountedRef.current) {
        setMessage(null);
      }
      messageTimeoutRef.current = null;
    }, 5000);
  }, []);

  const loadVerifiedDomains = useCallback(async () => {
    if (loadingRef.current || !mountedRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('verified_external_domains')
        .select('*')
        .order('verified_at', { ascending: false });

      if (error) throw error;

      if (mountedRef.current) {
        setVerifiedDomains(data || []);
      }
    } catch (error) {
      console.error('Error loading verified domains:', error);
      if (mountedRef.current) {
        showMessage('error', 'Failed to load verified domains');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [showMessage]);

  // Load domains only once on mount
  useEffect(() => {
    loadVerifiedDomains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extractDomain = (url: string): string | null => {
    try {
      let domain = url.trim();
      if (!domain) return null;

      // Remove protocol
      domain = domain.replace(/^https?:\/\//i, '');
      // Remove www prefix
      domain = domain.replace(/^www\./i, '');
      // Remove everything after the first slash (paths)
      domain = domain.split('/')[0];
      // Remove query strings
      domain = domain.split('?')[0];
      // Remove fragments
      domain = domain.split('#')[0];
      // Remove port numbers
      domain = domain.split(':')[0];

      domain = domain.toLowerCase().trim();

      // Validate it's a proper domain (has at least one dot and no spaces)
      if (domain && domain.includes('.') && !domain.includes(' ')) {
        return domain;
      }
      return null;
    } catch (error) {
      console.error('Error extracting domain:', error);
      return null;
    }
  };

  const parseAndCleanInput = (input: string): string[] => {
    try {
      const lines = input.split('\n');
      const domains = new Set<string>();

      lines.forEach(line => {
        const domain = extractDomain(line);
        if (domain) {
          domains.add(domain);
        }
      });

      return Array.from(domains);
    } catch (error) {
      console.error('Error parsing input:', error);
      return [];
    }
  };

  const handleInputChange = (value: string) => {
    try {
      // Extract domains from the input
      const lines = value.split('\n');
      const cleanedDomains: string[] = [];

      lines.forEach(line => {
        const domain = extractDomain(line);
        if (domain) {
          cleanedDomains.push(domain);
        } else if (line.trim()) {
          // Keep non-domain text temporarily while user is typing
          cleanedDomains.push(line.trim());
        }
      });

      // Remove duplicates while preserving order
      const uniqueDomains = Array.from(new Set(cleanedDomains));
      setUrlInput(uniqueDomains.join('\n'));
    } catch (error) {
      console.error('Error processing input:', error);
      // Fallback to raw input if processing fails
      setUrlInput(value);
    }
  };

  const handleVerifyDomains = useCallback(async () => {
    if (!mountedRef.current) return;

    if (!urlInput.trim()) {
      showMessage('error', 'Please enter at least one URL');
      return;
    }

    if (!user) {
      showMessage('error', 'You must be logged in');
      return;
    }

    setSubmitting(true);
    try {
      const domains = parseAndCleanInput(urlInput);

      if (domains.length === 0) {
        showMessage('error', 'No valid domains found in input');
        if (mountedRef.current) {
          setSubmitting(false);
        }
        return;
      }

      const existingDomains = new Set(verifiedDomains.map(d => d.domain));
      const newDomains = domains.filter(d => !existingDomains.has(d));

      if (newDomains.length === 0) {
        showMessage('error', 'All domains are already verified');
        if (mountedRef.current) {
          setSubmitting(false);
        }
        return;
      }

      const domainsToInsert = newDomains.map(domain => ({
        domain,
        verified_by: user.id
      }));

      const { error } = await supabase
        .from('verified_external_domains')
        .insert(domainsToInsert);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (mountedRef.current) {
        showMessage('success', `Successfully verified ${newDomains.length} domain(s). Processing updates...`);
        setUrlInput('');
      }

      // Give database triggers time to complete batch updates
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadVerifiedDomains();
    } catch (error) {
      console.error('Error verifying domains:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify domains';
      if (mountedRef.current) {
        showMessage('error', errorMessage);
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [urlInput, user, verifiedDomains, showMessage, loadVerifiedDomains]);

  const handleRemoveDomain = useCallback(async (id: string, domain: string) => {
    if (!mountedRef.current) return;

    if (!confirm(`Are you sure you want to remove "${domain}" from verified domains?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('verified_external_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (mountedRef.current) {
        showMessage('success', `Removed "${domain}" from verified domains`);
      }
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadVerifiedDomains();
    } catch (error) {
      console.error('Error removing domain:', error);
      if (mountedRef.current) {
        showMessage('error', 'Failed to remove domain');
      }
    }
  }, [showMessage, loadVerifiedDomains]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col relative">
        {submitting && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
            <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center gap-4 border-2 border-blue-200 max-w-md">
              <Loader className="w-12 h-12 animate-spin text-blue-600" />
              <p className="text-gray-900 font-bold text-lg">Verifying domains...</p>
              <p className="text-sm text-gray-700 text-center">
                Processing domain verification and updating search index. This may take a few moments.
              </p>
              <p className="text-xs text-red-600 font-medium text-center">
                Please wait, do not close this window
              </p>
            </div>
          </div>
        )}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-cyan-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Verified External Domains</h2>
              <p className="text-sm text-blue-100">Manage trusted external sources</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={submitting ? "Cannot close during verification" : "Close"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {message && (
            <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Add Domains to Verify
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Paste URLs or domains below (one per line). Paths and query parameters will be automatically removed - only base domains are verified.
              </p>
              <textarea
                value={urlInput}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="wikipedia.org&#10;example.com&#10;trusted-site.org"
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {urlInput.trim() ? (
                    <>
                      {parseAndCleanInput(urlInput).length} unique domain(s) ready to verify
                    </>
                  ) : (
                    'Enter domains or full URLs - paths will be removed automatically'
                  )}
                </p>
                <button
                  onClick={handleVerifyDomains}
                  disabled={submitting || !urlInput.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Verify External Source</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Currently Verified Domains ({verifiedDomains.length})
              </h3>

              {loading ? (
                <div className="text-center py-8">
                  <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  <p className="text-sm text-gray-600 mt-2">Loading verified domains...</p>
                </div>
              ) : verifiedDomains.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Globe className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No verified external domains yet</p>
                  <p className="text-xs text-gray-500 mt-1">Add some URLs above to get started</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {verifiedDomains.map((domain) => (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">{domain.domain}</p>
                          <p className="text-xs text-gray-600">
                            Verified {new Date(domain.verified_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveDomain(domain.id, domain.domain)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Remove domain"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 mb-1">How this works:</p>
              <ul className="space-y-1 text-xs">
                <li>• Only base domains are verified - all paths under a verified domain are automatically trusted</li>
                <li>• Verified domains get a "Verified Human External" badge in search results</li>
                <li>• Internal subdomains always get "Verified Human Internal" (highest priority)</li>
                <li>• All other external content shows "External Content" (lowest priority)</li>
                <li>• Search rankings automatically prioritize verified content</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
