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
    const { data, error } = await supabase
      .rpc('correct_search_query', { input_query: query })
      .single();

    if (error) {
      console.error('[SpellCorrection] Error correcting query:', error);
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
  resultCount: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .rpc('record_spell_check_attempt', {
        p_original_query: originalQuery,
        p_suggested_query: suggestedQuery,
        p_confidence: confidence,
        p_result_count: resultCount
      });

    if (error) {
      console.error('[SpellCorrection] Error recording spell check attempt:', error);
      return null;
    }

    return data as string;
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
