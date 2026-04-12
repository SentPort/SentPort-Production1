import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'sentport_search_preferences';

interface SearchPreferences {
  includeExternalContent: boolean;
}

interface SearchPreferencesContextType {
  preferences: SearchPreferences;
  includeExternalContent: boolean;
  setIncludeExternalContent: (value: boolean) => void;
  updatePreferences: (newPreferences: Partial<SearchPreferences>) => Promise<void>;
  loading: boolean;
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
  } catch {
    // ignore
  }
  return getDefaultPreferences();
};

const setLocalStoragePreferences = (preferences: SearchPreferences): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // ignore
  }
};

const SearchPreferencesContext = createContext<SearchPreferencesContextType | null>(null);

export function SearchPreferencesProvider({ children }: { children: ReactNode }) {
  const { user, userProfile } = useAuth();
  const [preferences, setPreferences] = useState<SearchPreferences>(getLocalStoragePreferences);
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

  return (
    <SearchPreferencesContext.Provider
      value={{
        preferences,
        includeExternalContent: preferences.includeExternalContent,
        setIncludeExternalContent,
        updatePreferences,
        loading,
      }}
    >
      {children}
    </SearchPreferencesContext.Provider>
  );
}

export function useSearchPreferencesContext(): SearchPreferencesContextType {
  const ctx = useContext(SearchPreferencesContext);
  if (!ctx) {
    throw new Error('useSearchPreferencesContext must be used within a SearchPreferencesProvider');
  }
  return ctx;
}
