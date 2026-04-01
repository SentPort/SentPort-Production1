import { analyzeQuery } from '../../lib/queryAnalyzer';
import { Calculator } from './Calculator';
import { WikipediaKnowledgePanel } from './WikipediaKnowledgePanel';

interface SearchWidgetContainerProps {
  query: string;
  includeExternalContent: boolean;
}

export function SearchWidgetContainer({ query, includeExternalContent }: SearchWidgetContainerProps) {
  if (!query || query.trim().length === 0) {
    return null;
  }

  const analysis = analyzeQuery(query);

  const showCalculator = analysis.showCalculator;
  const showWikipedia = analysis.showWikipedia && includeExternalContent;

  if (!showCalculator && !showWikipedia) {
    return null;
  }

  return (
    <div className="space-y-6">
      {showCalculator && (
        <Calculator initialExpression={analysis.extractedExpression} />
      )}

      {showWikipedia && (
        <WikipediaKnowledgePanel query={analysis.normalizedQuery} />
      )}
    </div>
  );
}
