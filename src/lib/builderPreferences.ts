import { supabase } from './supabase';
import { DeviceBreakpoint } from '../types/builder';

export interface BuilderPreferences {
  showGrid: boolean;
  currentDevice: DeviceBreakpoint;
  showPageSettings: boolean;
  propertiesPanelTab?: 'content' | 'design' | 'advanced';
}

export const DEFAULT_BUILDER_PREFERENCES: BuilderPreferences = {
  showGrid: false,
  currentDevice: 'desktop',
  showPageSettings: false,
  propertiesPanelTab: 'content',
};

export async function loadBuilderPreferences(
  userId: string,
  subdomainId: string
): Promise<BuilderPreferences> {
  try {
    const { data, error } = await supabase
      .from('builder_user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .eq('subdomain_id', subdomainId)
      .maybeSingle();

    if (error) {
      console.error('Error loading builder preferences:', error);
      return DEFAULT_BUILDER_PREFERENCES;
    }

    if (!data) {
      return DEFAULT_BUILDER_PREFERENCES;
    }

    return {
      ...DEFAULT_BUILDER_PREFERENCES,
      ...(data.preferences as Partial<BuilderPreferences>),
    };
  } catch (err) {
    console.error('Failed to load builder preferences:', err);
    return DEFAULT_BUILDER_PREFERENCES;
  }
}

export async function saveBuilderPreferences(
  userId: string,
  subdomainId: string,
  preferences: BuilderPreferences
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('builder_user_preferences')
      .upsert(
        {
          user_id: userId,
          subdomain_id: subdomainId,
          preferences: preferences as any,
        },
        {
          onConflict: 'user_id,subdomain_id',
        }
      );

    if (error) {
      console.error('Error saving builder preferences:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to save builder preferences:', err);
    return false;
  }
}

export async function resetBuilderPreferences(
  userId: string,
  subdomainId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('builder_user_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('subdomain_id', subdomainId);

    if (error) {
      console.error('Error resetting builder preferences:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to reset builder preferences:', err);
    return false;
  }
}

export function createDebouncedSave<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}
