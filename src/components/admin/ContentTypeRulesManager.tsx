import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Tag, Trash2, AlertCircle, Loader, Newspaper, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DomainRule {
  id: string;
  domain: string;
  content_type: 'news_article' | 'web_page';
  created_at: string;
  notes: string | null;
}

interface ContentTypeRulesManagerProps {
  onClose: () => void;
}

export default function ContentTypeRulesManager({ onClose }: ContentTypeRulesManagerProps) {
  const [newsInput, setNewsInput] = useState('');
  const [webPageInput, setWebPageInput] = useState('');
  const [domainRules, setDomainRules] = useState<DomainRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { user } = useAuth();
  const loadingRef = useRef(false);
  const messageTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

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

  const loadDomainRules = useCallback(async () => {
    if (loadingRef.current || !mountedRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_type_domain_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (mountedRef.current) {
        setDomainRules(data || []);
      }
    } catch (error) {
      console.error('Error loading domain rules:', error);
      if (mountedRef.current) {
        showMessage('error', 'Failed to load domain rules');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [showMessage]);

  useEffect(() => {
    loadDomainRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extractDomain = (url: string): string | null => {
    try {
      let domain = url.trim();
      if (!domain) return null;

      domain = domain.replace(/^https?:\/\//i, '');
      domain = domain.replace(/^www\./i, '');
      domain = domain.split('/')[0];
      domain = domain.split('?')[0];
      domain = domain.split('#')[0];
      domain = domain.split(':')[0];

      domain = domain.toLowerCase().trim();

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


  const handleAddRules = useCallback(async (contentType: 'news_article' | 'web_page', input: string, clearInput: () => void) => {
    if (!mountedRef.current) return;

    if (!input.trim()) {
      showMessage('error', 'Please enter at least one domain');
      return;
    }

    if (!user) {
      showMessage('error', 'You must be logged in');
      return;
    }

    setSubmitting(true);
    try {
      const domains = parseAndCleanInput(input);

      if (domains.length === 0) {
        showMessage('error', 'No valid domains found in input');
        if (mountedRef.current) {
          setSubmitting(false);
        }
        return;
      }

      const { data, error } = await supabase.rpc('bulk_add_content_type_rules', {
        p_domains: domains,
        p_content_type: contentType,
        p_created_by: user.id
      });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const totalUpdated = data?.reduce((sum: number, item: any) => sum + (item.urls_updated || 0), 0) || 0;
      const typeName = contentType === 'news_article' ? 'News Sites' : 'Reference Sites';

      if (mountedRef.current) {
        showMessage('success', `Added ${domains.length} domain(s) to ${typeName}. Updated ${totalUpdated} existing URL(s).`);
        clearInput();
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadDomainRules();
    } catch (error) {
      console.error('Error adding domain rules:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add domain rules';
      if (mountedRef.current) {
        showMessage('error', errorMessage);
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [user, showMessage, loadDomainRules]);

  const handleRemoveRule = useCallback(async (id: string, domain: string) => {
    if (!mountedRef.current) return;

    if (!confirm(`Remove classification rule for "${domain}"?\n\nFuture crawls will use automatic detection for this domain.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('content_type_domain_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (mountedRef.current) {
        showMessage('success', `Removed rule for "${domain}"`);
      }
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadDomainRules();
    } catch (error) {
      console.error('Error removing domain rule:', error);
      if (mountedRef.current) {
        showMessage('error', 'Failed to remove domain rule');
      }
    }
  }, [showMessage, loadDomainRules]);

  const newsSites = domainRules.filter(r => r.content_type === 'news_article');
  const webPageSites = domainRules.filter(r => r.content_type === 'web_page');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative">
        {submitting && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
            <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center gap-4 border-2 border-purple-200 max-w-md">
              <Loader className="w-12 h-12 animate-spin text-purple-600" />
              <p className="text-gray-900 font-bold text-lg">Processing domain rules...</p>
              <p className="text-sm text-gray-700 text-center">
                Updating content classification and search index. This may take a few moments.
              </p>
              <p className="text-xs text-red-600 font-medium text-center">
                Please wait, do not close this window
              </p>
            </div>
          </div>
        )}

        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-pink-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Content Type Classification Rules</h2>
              <p className="text-sm text-purple-100">Manage how domains are classified in search</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={submitting ? "Cannot close during processing" : "Close"}
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
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-600">
                <Newspaper className="w-5 h-5" />
                <h3 className="font-bold text-lg">News Sites</h3>
              </div>
              <p className="text-sm text-gray-600">
                Domains that should always be classified as news articles
              </p>
              <textarea
                value={newsInput}
                onChange={(e) => setNewsInput(e.target.value)}
                placeholder="cnn.com&#10;bbc.com&#10;reuters.com"
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {newsInput.trim() ? `${parseAndCleanInput(newsInput).length} domain(s) ready` : 'Enter news domains'}
                </p>
                <button
                  onClick={() => handleAddRules('news_article', newsInput, () => setNewsInput(''))}
                  disabled={submitting || !newsInput.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Add News Sites
                </button>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Current News Sites ({newsSites.length})
                </p>
                {loading ? (
                  <div className="text-center py-4">
                    <Loader className="w-6 h-6 animate-spin text-red-600 mx-auto" />
                  </div>
                ) : newsSites.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">No news sites configured</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {newsSites.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Newspaper className="w-4 h-4 text-red-600 flex-shrink-0" />
                          <p className="font-medium text-gray-900 text-sm truncate">{rule.domain}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveRule(rule.id, rule.domain)}
                          className="p-1.5 text-red-600 hover:bg-red-200 rounded transition-colors flex-shrink-0"
                          title="Remove rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <FileText className="w-5 h-5" />
                <h3 className="font-bold text-lg">Reference Sites</h3>
              </div>
              <p className="text-sm text-gray-600">
                Domains that should always be classified as web pages (not news)
              </p>
              <textarea
                value={webPageInput}
                onChange={(e) => setWebPageInput(e.target.value)}
                placeholder="wikipedia.org&#10;dictionary.com&#10;phys.org"
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {webPageInput.trim() ? `${parseAndCleanInput(webPageInput).length} domain(s) ready` : 'Enter reference domains'}
                </p>
                <button
                  onClick={() => handleAddRules('web_page', webPageInput, () => setWebPageInput(''))}
                  disabled={submitting || !webPageInput.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Add Reference Sites
                </button>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Current Reference Sites ({webPageSites.length})
                </p>
                {loading ? (
                  <div className="text-center py-4">
                    <Loader className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                  </div>
                ) : webPageSites.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">No reference sites configured</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {webPageSites.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <p className="font-medium text-gray-900 text-sm truncate">{rule.domain}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveRule(rule.id, rule.domain)}
                          className="p-1.5 text-blue-600 hover:bg-blue-200 rounded transition-colors flex-shrink-0"
                          title="Remove rule"
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
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 mb-1">How classification works:</p>
              <ul className="space-y-1 text-xs">
                <li>• Admin rules have highest priority - they always override automatic detection</li>
                <li>• When you add a domain, ALL existing content from that domain is immediately reclassified</li>
                <li>• Future crawls will use your classification for these domains</li>
                <li>• News sites appear in the "News" search tab, reference sites appear in "All" but not "News"</li>
                <li>• Removing a rule returns the domain to automatic detection on next crawl</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
