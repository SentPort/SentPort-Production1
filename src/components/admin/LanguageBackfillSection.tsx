import { useState, useEffect, useRef } from 'react';
import { Globe, Languages, Play, Pause, RotateCcw, CheckCircle, XCircle, Clock, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface BackfillProgress {
  id: string;
  total_urls: number;
  processed_count: number;
  successful_count: number;
  failed_count: number;
  batch_size: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  current_batch: number;
  started_at: string | null;
  completed_at: string | null;
  last_batch_at: string | null;
  processing_rate: number;
  created_at: string;
  updated_at: string;
}

interface BackfillLog {
  id: string;
  progress_id: string;
  batch_number: number;
  urls_processed: number;
  successful: number;
  failed: number;
  errors: any[];
  processing_time_ms: number;
  created_at: string;
}

interface LanguageBackfillSectionProps {
  session: Session | null;
}

export default function LanguageBackfillSection({ session }: LanguageBackfillSectionProps) {
  const [progress, setProgress] = useState<BackfillProgress | null>(null);
  const [logs, setLogs] = useState<BackfillLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const processingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress?.status === 'running' && !processing) {
      startProcessingLoop();
    }
  }, [progress?.status]);

  const fetchProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('language_backfill_progress')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setProgress(data);

      if (data?.id) {
        const { data: logsData } = await supabase
          .from('language_backfill_log')
          .select('*')
          .eq('progress_id', data.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (logsData) setLogs(logsData);
      }
    } catch (err) {
      console.error('Error fetching backfill progress:', err);
    }
  };

  const callBackfillFunction = async (action: string) => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backfill-language-detection`;

    const bypassKey = import.meta.env.VITE_ADMIN_BYPASS_KEY;
    const bypassUserId = import.meta.env.VITE_ADMIN_USER_ID;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (bypassKey && bypassUserId) {
      headers['X-Admin-Bypass-Key'] = bypassKey;
      headers['X-Admin-User-ID'] = bypassUserId;
    } else if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else {
      throw new Error('No active session or bypass credentials');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Request failed');
    }

    return await response.json();
  };

  const handleInitialize = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await callBackfillFunction('initialize');
      setSuccess('Backfill initialized successfully');
      await fetchProgress();
      startProcessingLoop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize backfill');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    setError(null);

    try {
      await callBackfillFunction('pause');
      setSuccess('Backfill paused');
      stopProcessingLoop();
      await fetchProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause backfill');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await callBackfillFunction('resume');
      setSuccess('Backfill resumed');
      await fetchProgress();
      startProcessingLoop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume backfill');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset the backfill? This will delete all progress and logs.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await callBackfillFunction('reset');
      setSuccess('Backfill reset successfully');
      stopProcessingLoop();
      await fetchProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset backfill');
    } finally {
      setLoading(false);
    }
  };

  const startProcessingLoop = () => {
    if (processingIntervalRef.current) return;

    setProcessing(true);
    processBatch();

    processingIntervalRef.current = window.setInterval(() => {
      processBatch();
    }, 3000);
  };

  const stopProcessingLoop = () => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    setProcessing(false);
  };

  const processBatch = async () => {
    try {
      const result = await callBackfillFunction('process');

      if (result.progress?.is_complete) {
        stopProcessingLoop();
        setSuccess('Backfill completed successfully!');
      }

      await fetchProgress();
    } catch (err) {
      console.error('Error processing batch:', err);
      stopProcessingLoop();
      setError(err instanceof Error ? err.message : 'Batch processing failed');
    }
  };

  const getProgressPercentage = () => {
    if (!progress || progress.total_urls === 0) return 0;
    return Math.round((progress.processed_count / progress.total_urls) * 100);
  };

  const getEstimatedTimeRemaining = () => {
    if (!progress || progress.processing_rate === 0) return 'Calculating...';
    const remaining = progress.total_urls - progress.processed_count;
    const minutesRemaining = remaining / progress.processing_rate;

    if (minutesRemaining < 1) return 'Less than 1 minute';
    if (minutesRemaining < 60) return `${Math.round(minutesRemaining)} minutes`;
    const hours = Math.floor(minutesRemaining / 60);
    const minutes = Math.round(minutesRemaining % 60);
    return `${hours}h ${minutes}m`;
  };

  if (!progress) {
    return (
      <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3">
          <Languages className="w-5 h-5 text-purple-400 animate-pulse" />
          <h2 className="text-xl font-semibold text-white">Language Detection Backfill</h2>
        </div>
        <p className="text-gray-400 mt-4">Loading backfill status...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Languages className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Language Detection Backfill</h2>
        </div>
        <div className="flex items-center gap-2">
          {progress.status === 'idle' && (
            <button
              onClick={handleInitialize}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              {loading ? 'Starting...' : 'Start Backfill'}
            </button>
          )}
          {progress.status === 'running' && (
            <button
              onClick={handlePause}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pause className="w-4 h-4" />
              {loading ? 'Pausing...' : 'Pause'}
            </button>
          )}
          {progress.status === 'paused' && (
            <>
              <button
                onClick={handleResume}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                {loading ? 'Resuming...' : 'Resume'}
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                {loading ? 'Resetting...' : 'Reset'}
              </button>
            </>
          )}
          {progress.status === 'completed' && (
            <button
              onClick={handleReset}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              {loading ? 'Resetting...' : 'Reset'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-red-300 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <p className="text-green-300 text-sm">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">×</button>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            progress.status === 'completed' ? 'bg-green-500/20 text-green-300' :
            progress.status === 'running' ? 'bg-blue-500/20 text-blue-300 animate-pulse' :
            progress.status === 'paused' ? 'bg-yellow-500/20 text-yellow-300' :
            progress.status === 'failed' ? 'bg-red-500/20 text-red-300' :
            'bg-gray-500/20 text-gray-300'
          }`}>
            {progress.status.toUpperCase()}
          </span>
        </div>

        {progress.status !== 'idle' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Progress:</span>
                <span className="text-white font-semibold">{getProgressPercentage()}%</span>
              </div>
              <div className="bg-slate-900/50 rounded-lg overflow-hidden h-4">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <div className="text-xs text-gray-400">Total URLs</div>
                </div>
                <div className="text-xl font-bold text-white">{progress.total_urls.toLocaleString()}</div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <div className="text-xs text-gray-400">Processed</div>
                </div>
                <div className="text-xl font-bold text-purple-400">{progress.processed_count.toLocaleString()}</div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <div className="text-xs text-gray-400">Successful</div>
                </div>
                <div className="text-xl font-bold text-green-400">{progress.successful_count.toLocaleString()}</div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <div className="text-xs text-gray-400">Failed</div>
                </div>
                <div className="text-xl font-bold text-red-400">{progress.failed_count.toLocaleString()}</div>
              </div>
            </div>

            {progress.status === 'running' && (
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-200 text-sm">Processing Rate:</span>
                  <span className="text-blue-100 font-semibold">{Math.round(progress.processing_rate)} URLs/min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-200 text-sm">Estimated Time Remaining:</span>
                  <span className="text-blue-100 font-semibold">{getEstimatedTimeRemaining()}</span>
                </div>
              </div>
            )}

            {logs.length > 0 && (
              <div>
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-2"
                >
                  {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span className="font-medium">Recent Batch Logs ({logs.length})</span>
                </button>

                {showLogs && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {logs.map((log) => (
                      <div key={log.id} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-300">Batch #{log.batch_number}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Processed:</span>{' '}
                            <span className="text-white font-medium">{log.urls_processed}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Success:</span>{' '}
                            <span className="text-green-400 font-medium">{log.successful}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Failed:</span>{' '}
                            <span className="text-red-400 font-medium">{log.failed}</span>
                          </div>
                        </div>
                        {log.errors && log.errors.length > 0 && (
                          <div className="mt-2 text-xs text-red-300">
                            {log.errors.length} error(s) occurred
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {progress.status === 'idle' && (
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
            <p className="text-purple-200 text-sm">
              This backfill will process <span className="font-bold">{progress.total_urls.toLocaleString()}</span> external URLs
              to detect their language. Only English content will appear in search results.
            </p>
            <p className="text-purple-300 text-sm mt-2">
              Estimated time: {Math.round((progress.total_urls / 50) * 3 / 3600 * 10) / 10} - {Math.round((progress.total_urls / 50) * 4 / 3600 * 10) / 10} hours
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
