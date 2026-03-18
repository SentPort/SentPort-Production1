import { supabase } from './supabase';

export interface TypographyPreset {
  id: string;
  subdomain_id?: string;
  preset_name: string;
  font_family: string;
  font_size: string;
  font_weight: string;
  line_height: string;
  letter_spacing: string;
  font_style: string;
  category: string;
  block_type: 'heading' | 'paragraph';
  description?: string;
  is_system: boolean;
  created_at?: string;
}

export async function getAllPresets(): Promise<TypographyPreset[]> {
  const { data, error } = await supabase
    .from('builder_typography_presets')
    .select('*')
    .order('category', { ascending: true })
    .order('preset_name', { ascending: true });

  if (error) {
    console.error('Error fetching presets:', error);
    return [];
  }

  return data || [];
}

export async function getPresetsByBlockType(blockType: 'heading' | 'paragraph'): Promise<TypographyPreset[]> {
  const { data, error } = await supabase
    .from('builder_typography_presets')
    .select('*')
    .eq('block_type', blockType)
    .order('category', { ascending: true })
    .order('preset_name', { ascending: true });

  if (error) {
    console.error('Error fetching presets:', error);
    return [];
  }

  return data || [];
}

export async function getPresetsByCategory(category: string, blockType?: 'heading' | 'paragraph'): Promise<TypographyPreset[]> {
  let query = supabase
    .from('builder_typography_presets')
    .select('*')
    .eq('category', category);

  if (blockType) {
    query = query.eq('block_type', blockType);
  }

  const { data, error } = await query
    .order('preset_name', { ascending: true });

  if (error) {
    console.error('Error fetching presets:', error);
    return [];
  }

  return data || [];
}

export async function createCustomPreset(
  subdomainId: string,
  preset: Omit<TypographyPreset, 'id' | 'is_system' | 'created_at'>
): Promise<TypographyPreset | null> {
  const { data, error } = await supabase
    .from('builder_typography_presets')
    .insert({
      ...preset,
      subdomain_id: subdomainId,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating preset:', error);
    return null;
  }

  return data;
}

export async function updateCustomPreset(
  presetId: string,
  updates: Partial<Omit<TypographyPreset, 'id' | 'is_system' | 'subdomain_id' | 'created_at'>>
): Promise<TypographyPreset | null> {
  const { data, error } = await supabase
    .from('builder_typography_presets')
    .update(updates)
    .eq('id', presetId)
    .eq('is_system', false)
    .select()
    .single();

  if (error) {
    console.error('Error updating preset:', error);
    return null;
  }

  return data;
}

export async function deleteCustomPreset(presetId: string): Promise<boolean> {
  const { error } = await supabase
    .from('builder_typography_presets')
    .delete()
    .eq('id', presetId)
    .eq('is_system', false);

  if (error) {
    console.error('Error deleting preset:', error);
    return false;
  }

  return true;
}

export async function getCustomPresets(subdomainId: string): Promise<TypographyPreset[]> {
  const { data, error } = await supabase
    .from('builder_typography_presets')
    .select('*')
    .eq('subdomain_id', subdomainId)
    .eq('is_system', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching custom presets:', error);
    return [];
  }

  return data || [];
}

export async function duplicatePreset(
  presetId: string,
  subdomainId: string,
  newName?: string
): Promise<TypographyPreset | null> {
  const { data: original, error: fetchError } = await supabase
    .from('builder_typography_presets')
    .select('*')
    .eq('id', presetId)
    .single();

  if (fetchError || !original) {
    console.error('Error fetching original preset:', fetchError);
    return null;
  }

  const { data, error } = await supabase
    .from('builder_typography_presets')
    .insert({
      subdomain_id: subdomainId,
      preset_name: newName || `${original.preset_name} (Copy)`,
      font_family: original.font_family,
      font_size: original.font_size,
      font_weight: original.font_weight,
      line_height: original.line_height,
      letter_spacing: original.letter_spacing,
      font_style: original.font_style,
      category: original.category,
      block_type: original.block_type,
      description: original.description,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error duplicating preset:', error);
    return null;
  }

  return data;
}

export function applyPresetToBlock(preset: TypographyPreset): Record<string, any> {
  return {
    font_family: preset.font_family,
    font_size: preset.font_size,
    font_weight: preset.font_weight,
    line_height: preset.line_height,
    letter_spacing: preset.letter_spacing,
    font_style: preset.font_style,
  };
}

export const presetCategories = [
  { id: 'modern', label: 'Modern', description: 'Contemporary sans-serif combinations' },
  { id: 'classic', label: 'Classic', description: 'Traditional serif pairings' },
  { id: 'tech', label: 'Tech', description: 'Futuristic and tech-focused fonts' },
  { id: 'creative', label: 'Creative', description: 'Unique and expressive combinations' },
  { id: 'professional', label: 'Professional', description: 'Corporate and business-friendly' },
];
