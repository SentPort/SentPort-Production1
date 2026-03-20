import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'sentport_search_preferences';

interface SearchPreferences {
  includeExternalContent: boolean;
}

const getDefaultPreferences = (): SearchPreferences => ({
  includeExternalContent: false,
});

const getLocalStoragePreferences = (): SearchPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load search preferences from localStorage:', error);
  }
  return getDefaultPreferences();
};

const setLocalStoragePreferences = (preferences: SearchPreferences): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save search preferences to localStorage:', error);
  }
};

export function useSearchPreferences() {
  const { user, userProfile } = useAuth();
  const [preferences, setPreferences] = useState<SearchPreferences>(() => {
    if (user && userProfile?.search_preferences) {
      return userProfile.search_preferences as SearchPreferences;
    }
    return getLocalStoragePreferences();
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && userProfile?.search_preferences) {
      setPreferences(userProfile.search_preferences as SearchPreferences);
      setLocalStoragePreferences(userProfile.search_preferences as SearchPreferences);
    } else if (!user) {
      setPreferences(getLocalStoragePreferences());
    }
  }, [user, userProfile]);

  const updatePreferences = useCallback(
    async (newPreferences: Partial<SearchPreferences>) => {
      const updatedPreferences = { ...preferences, ...newPreferences };

      setPreferences(updatedPreferences);
      setLocalStoragePreferences(updatedPreferences);

      if (user) {
        setLoading(true);
        try {
          const { error } = await supabase
            .from('user_profiles')
            .update({ search_preferences: updatedPreferences })
            .eq('id', user.id);

          if (error) {
            console.error('Failed to update search preferences in database:', error);
          }
        } catch (error) {
          console.error('Failed to update search preferences:', error);
        } finally {
          setLoading(false);
        }
      }
    },
    [preferences, user]
  );

  const setIncludeExternalContent = useCallback(
    (includeExternal: boolean) => {
      updatePreferences({ includeExternalContent: includeExternal });
    },
    [updatePreferences]
  );

  return {
    preferences,
    includeExternalContent: preferences.includeExternalContent,
    setIncludeExternalContent,
    updatePreferences,
    loading,
  };
}
