import { supabase } from './supabase';

export interface SpellCorrectionResult {
  correctedQuery: string;
  confidence: number;
  changed: boolean;
}

export interface SpellingSuggestion {
  suggestion: string;
  confidence: number;
  frequency: number;
  source: 'exact' | 'known' | 'edit1' | 'fuzzy';
}

export async function correctSearchQuery(query: string): Promise<SpellCorrectionResult | null> {
  try {
    console.log('[SpellCorrection] Calling correct_search_query for:', query);
    const { data, error } = await supabase
      .rpc('correct_search_query', { input_query: query })
      .single();

    if (error) {
      console.error('[SpellCorrection] Error correcting query:', error);
      console.error('[SpellCorrection] Full error details:', JSON.stringify(error, null, 2));
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      correctedQuery: data.corrected_query,
      confidence: data.confidence,
      changed: data.changed
    };
  } catch (error) {
    console.error('[SpellCorrection] Exception correcting query:', error);
    return null;
  }
}

export async function getSpellingSuggestions(
  word: string,
  maxSuggestions: number = 3
): Promise<SpellingSuggestion[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_spelling_suggestions', {
        input_word: word,
        max_suggestions: maxSuggestions
      });

    if (error) {
      console.error('[SpellCorrection] Error getting suggestions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[SpellCorrection] Exception getting suggestions:', error);
    return [];
  }
}

export async function recordSpellCorrection(
  originalQuery: string,
  correctedQuery: string,
  resultCount: number
): Promise<void> {
  try {
    const { error } = await supabase
      .rpc('record_spell_correction', {
        original_query: originalQuery,
        corrected_query: correctedQuery,
        result_count: resultCount
      });

    if (error) {
      console.error('[SpellCorrection] Error recording correction:', error);
    }
  } catch (error) {
    console.error('[SpellCorrection] Exception recording correction:', error);
  }
}

export async function recordSpellCheckAttempt(
  originalQuery: string,
  suggestedQuery: string | null,
  confidence: number,
  resultCount: number,
  source: 'database' | 'wikipedia' | 'wikipedia_opensearch' | 'combined' = 'database'
): Promise<string | null> {
  try {
    console.log('[SpellCorrection] Recording spell check attempt for:', originalQuery);
    const { data: logId, error: rpcError } = await supabase
      .rpc('record_spell_check_attempt', {
        p_original_query: originalQuery,
        p_suggested_query: suggestedQuery,
        p_confidence: confidence,
        p_result_count: resultCount
      });

    if (rpcError) {
      console.error('[SpellCorrection] Error recording spell check attempt:', rpcError);
      console.error('[SpellCorrection] Full error details:', JSON.stringify(rpcError, null, 2));
      return null;
    }

    if (logId && source !== 'database') {
      const { error: updateError } = await supabase
        .from('spell_check_log')
        .update({ source })
        .eq('id', logId);

      if (updateError) {
        console.error('[SpellCorrection] Error updating source:', updateError);
      }
    }

    return logId as string;
  } catch (error) {
    console.error('[SpellCorrection] Exception recording spell check attempt:', error);
    return null;
  }
}

export async function markSuggestionClicked(
  logId: string,
  resultCountSuggested: number
): Promise<void> {
  try {
    const { error } = await supabase
      .rpc('mark_suggestion_clicked', {
        p_log_id: logId,
        p_result_count_suggested: resultCountSuggested
      });

    if (error) {
      console.error('[SpellCorrection] Error marking suggestion clicked:', error);
    }
  } catch (error) {
    console.error('[SpellCorrection] Exception marking suggestion clicked:', error);
  }
}

export interface WikipediaLearningResult {
  original: string;
  correction: string;
  clickCount: number;
  avgConfidence: number;
  learned: boolean;
}

export async function learnFromWikipediaCorrections(): Promise<WikipediaLearningResult[]> {
  try {
    const { data, error } = await supabase
      .rpc('learn_from_wikipedia_corrections');

    if (error) {
      console.error('[SpellCorrection] Error learning from Wikipedia:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      original: row.original,
      correction: row.correction,
      clickCount: row.click_count,
      avgConfidence: row.avg_confidence,
      learned: row.learned
    }));
  } catch (error) {
    console.error('[SpellCorrection] Exception learning from Wikipedia:', error);
    return [];
  }
}

export interface WikipediaLearningStats {
  totalWikipediaSuggestions: number;
  clickedSuggestions: number;
  learnableCorrections: number;
  alreadyLearned: number;
  clickThroughRate: number;
}

export async function getWikipediaLearningStats(): Promise<WikipediaLearningStats | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_wikipedia_learning_stats')
      .single();

    if (error) {
      console.error('[SpellCorrection] Error getting learning stats:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      totalWikipediaSuggestions: data.total_wikipedia_suggestions,
      clickedSuggestions: data.clicked_suggestions,
      learnableCorrections: data.learnable_corrections,
      alreadyLearned: data.already_learned,
      clickThroughRate: data.click_through_rate
    };
  } catch (error) {
    console.error('[SpellCorrection] Exception getting learning stats:', error);
    return null;
  }
}
