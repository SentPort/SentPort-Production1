import { useNavigate } from 'react-router-dom';

interface DidYouMeanProps {
  originalQuery: string;
  suggestions: Array<{ correctedQuery: string; confidence: number }>;
  onSuggestionClick?: (suggestion: string) => void;
  showMultiple?: boolean;
}

export function DidYouMean({
  originalQuery,
  suggestions,
  onSuggestionClick,
  showMultiple = false
}: DidYouMeanProps) {
  const navigate = useNavigate();

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const topSuggestion = suggestions[0];
  const displaySuggestions = showMultiple ? suggestions.slice(0, 3) : [topSuggestion];

  const handleSuggestionClick = (suggestion: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion)}`);
    }
  };

  if (topSuggestion.confidence >= 0.9 && !showMultiple) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              Showing results for{' '}
              <button
                onClick={() => handleSuggestionClick(topSuggestion.correctedQuery)}
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                {topSuggestion.correctedQuery}
              </button>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Search instead for{' '}
              <button
                onClick={() => handleSuggestionClick(originalQuery)}
                className="text-gray-800 hover:underline font-medium"
              >
                {originalQuery}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showMultiple) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 mb-2">
              Try searching for:
            </p>
            <div className="flex flex-wrap gap-2">
              {displaySuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.correctedQuery)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-300 rounded-full text-sm text-gray-800 hover:bg-amber-100 hover:border-amber-400 transition-colors"
                >
                  <span>{suggestion.correctedQuery}</span>
                  <span className="text-xs text-gray-500">
                    ({Math.round(suggestion.confidence * 100)}% match)
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <p className="text-sm text-gray-600">
        Did you mean:{' '}
        <button
          onClick={() => handleSuggestionClick(topSuggestion.correctedQuery)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          {topSuggestion.correctedQuery}
        </button>
        {topSuggestion.confidence >= 0.7 && (
          <span className="ml-2 text-xs text-gray-500">
            ({Math.round(topSuggestion.confidence * 100)}% confidence)
          </span>
        )}
      </p>
    </div>
  );
}
