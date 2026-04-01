import { useState, useEffect } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { WikipediaSummary, findExactWikipediaMatch } from '../../lib/wikipediaService';

interface WikipediaKnowledgePanelProps {
  query: string;
  onClose?: () => void;
}

export function WikipediaKnowledgePanel({ query, onClose }: WikipediaKnowledgePanelProps) {
  const [summary, setSummary] = useState<WikipediaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchWikipediaData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await findExactWikipediaMatch(query);

        if (!mounted) return;

        if (data) {
          setSummary(data);
        } else {
          setError('No Wikipedia article found');
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Error fetching Wikipedia data:', err);
        setError('Failed to load Wikipedia data');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchWikipediaData();

    return () => {
      mounted = false;
    };
  }, [query]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading from Wikipedia...</span>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return null;
  }

  const maxLength = 300;
  const extract = summary.extract || '';
  const shouldTruncate = extract.length > maxLength;
  const displayText = expanded || !shouldTruncate
    ? extract
    : extract.substring(0, maxLength) + '...';

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/8/80/Wikipedia-logo-v2.svg"
            alt="Wikipedia"
            className="w-6 h-6"
          />
          <h3 className="font-semibold text-gray-900">Wikipedia</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-600 hover:bg-gray-200 rounded p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4">
        {summary.thumbnail && (
          <div className="float-right ml-4 mb-4">
            <img
              src={summary.thumbnail.source}
              alt={summary.title}
              className="rounded-lg shadow-md max-w-[200px] w-full h-auto"
            />
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 mb-2">{summary.title}</h2>

        {summary.description && (
          <p className="text-sm text-gray-600 italic mb-3">{summary.description}</p>
        )}

        <div className="text-gray-700 leading-relaxed mb-4">
          {displayText}
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-200">
          {shouldTruncate && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
            >
              {expanded ? (
                <>
                  Show less
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Read more
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          <a
            href={summary.content_urls.desktop.page}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors ml-auto"
          >
            View on Wikipedia
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Content from{' '}
            <a
              href="https://www.wikipedia.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Wikipedia
            </a>
            , available under{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/3.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              CC BY-SA 3.0
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
