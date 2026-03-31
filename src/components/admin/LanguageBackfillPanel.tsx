import { useState, useEffect } from 'react';
import { Languages, RefreshCw, TrendingUp, Play, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LanguageStats {
  language: string;
  count: number;
  percentage: number;
}

interface BackfillStatus {
  totalRecords: number;
  processedRecords: number;
  unprocessedRecords: number;
  percentageComplete: number;
}

export default function LanguageBackfillPanel() {
  const [languageStats, setLanguageStats] = useState<LanguageStats[]>([]);
  const [backfillStatus, setBackfillStatus] = useState<BackfillStatus>({
    totalRecords: 0,
    processedRecords: 0,
    unprocessedRecords: 0,
    percentageComplete: 0,
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastBackfillResult, setLastBackfillResult] = useState<string | null>(null);
  const [distributionExpanded, setDistributionExpanded] = useState(false);

  const fetchLanguageStats = async () => {
    setLoading(true);
    try {
      const { data: totalCount } = await supabase
        .from('search_index')
        .select('id', { count: 'exact', head: true });

      const { data: processedCount } = await supabase
        .from('search_index')
        .select('id', { count: 'exact', head: true })
        .eq('language_backfill_processed', true);

      const { data: unprocessedCount } = await supabase
        .from('search_index')
        .select('id', { count: 'exact', head: true })
        .or('language_backfill_processed.eq.false,language_backfill_processed.is.null');

      const total = totalCount?.count || 0;
      const processed = processedCount?.count || 0;
      const unprocessed = unprocessedCount?.count || 0;

      setBackfillStatus({
        totalRecords: total,
        processedRecords: processed,
        unprocessedRecords: unprocessed,
        percentageComplete: total > 0 ? (processed / total) * 100 : 0,
      });

      const { data: languageData, error } = await supabase.rpc('get_language_distribution');

      if (error) {
        console.error('Error fetching language stats:', error);
      } else if (languageData) {
        const statsWithPercentage = languageData.map((stat: any) => ({
          language: stat.language || 'unknown',
          count: stat.count,
          percentage: total > 0 ? (stat.count / total) * 100 : 0,
        }));
        setLanguageStats(statsWithPercentage);
      }
    } catch (error) {
      console.error('Error fetching language statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const runBackfill = async () => {
    if (processing) return;

    setProcessing(true);
    setLastBackfillResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backfill-language-detection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ batchSize: 500 }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setLastBackfillResult(
          `✓ Processed ${result.processed} records. ${result.totalRemaining} remaining.`
        );
        fetchLanguageStats();
      } else {
        setLastBackfillResult(`✗ Error: ${result.error}`);
      }
    } catch (error: any) {
      setLastBackfillResult(`✗ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchLanguageStats();
  }, []);

  const getLanguageName = (code: string): string => {
    const languageNames: { [key: string]: string } = {
      en: 'English',
      ja: 'Japanese',
      zh: 'Chinese',
      ko: 'Korean',
      ru: 'Russian',
      fr: 'French',
      de: 'German',
      es: 'Spanish',
      pt: 'Portuguese',
      it: 'Italian',
      ar: 'Arabic',
      nl: 'Dutch',
      pl: 'Polish',
      tr: 'Turkish',
      th: 'Thai',
      vi: 'Vietnamese',
      he: 'Hebrew',
      hi: 'Hindi',
      el: 'Greek',
      unknown: 'Unknown',
    };
    return languageNames[code] || code.toUpperCase();
  };

  return (
    <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Languages className="w-6 h-6 text-teal-400" />
          <h2 className="text-xl font-semibold text-white">Language Detection & Backfill</h2>
        </div>
        <button
          onClick={fetchLanguageStats}
          disabled={loading}
          className="text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Records</div>
          <div className="text-2xl font-bold text-white">
            {backfillStatus.totalRecords.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-green-500/30 rounded-lg p-4">
          <div className="text-sm text-green-300 mb-1">Processed</div>
          <div className="text-2xl font-bold text-green-400">
            {backfillStatus.processedRecords.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-orange-500/30 rounded-lg p-4">
          <div className="text-sm text-orange-300 mb-1">Unprocessed</div>
          <div className="text-2xl font-bold text-orange-400">
            {backfillStatus.unprocessedRecords.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-blue-500/30 rounded-lg p-4">
          <div className="text-sm text-blue-300 mb-1">Progress</div>
          <div className="text-2xl font-bold text-blue-400">
            {backfillStatus.percentageComplete.toFixed(1)}%
          </div>
        </div>
      </div>

      {backfillStatus.unprocessedRecords > 0 && (
        <div className="mb-6">
          <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${backfillStatus.percentageComplete}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-blue-200">
            <span>
              {backfillStatus.processedRecords.toLocaleString()} / {backfillStatus.totalRecords.toLocaleString()} records processed
            </span>
            <span className="text-gray-400">
              {backfillStatus.unprocessedRecords.toLocaleString()} remaining
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={runBackfill}
          disabled={processing || backfillStatus.unprocessedRecords === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className={`w-4 h-4 ${processing ? 'animate-pulse' : ''}`} />
          {processing ? 'Processing...' : 'Run Backfill (500 records)'}
        </button>

        {lastBackfillResult && (
          <div className={`flex items-center gap-2 text-sm ${lastBackfillResult.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
            {lastBackfillResult.startsWith('✓') ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{lastBackfillResult}</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            Language Distribution
          </h3>
          <button
            onClick={() => setDistributionExpanded(!distributionExpanded)}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            {distributionExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Expand
              </>
            )}
          </button>
        </div>

        {distributionExpanded && (
          <>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading statistics...</div>
            ) : languageStats.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No data available</div>
            ) : (
              <div className="space-y-3">
                {languageStats.slice(0, 15).map((stat) => (
                  <div key={stat.language} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium text-gray-300">
                      {getLanguageName(stat.language)}
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-slate-700 rounded-full h-6">
                        <div
                          className={`h-6 rounded-full flex items-center justify-end px-2 text-xs font-medium text-white transition-all duration-500 ${
                            stat.language === 'en' ? 'bg-green-600 hover:bg-green-500' : 'bg-teal-600 hover:bg-teal-500'
                          }`}
                          style={{ width: `${Math.max(stat.percentage, 2)}%` }}
                        >
                          {stat.percentage >= 5 && `${stat.percentage.toFixed(1)}%`}
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-right text-sm text-gray-400">
                      {stat.count.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {backfillStatus.unprocessedRecords > 0 && (
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-200 mb-1">Backfill in Progress</h4>
              <p className="text-sm text-blue-300">
                {backfillStatus.unprocessedRecords.toLocaleString()} records still need language detection.
                Run the backfill process in batches of 500 to update these records. The crawler will automatically
                classify all new URLs going forward.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
