import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface HuBookProfile {
  id: string;
  user_id: string;
  display_name: string;
  sex: 'male' | 'female';
  age: number;
  bio?: string;
  profile_photo_url?: string;
  cover_photo_url?: string;
  location?: string;
  work?: string;
  education?: string;
  relationship_status?: string;
  interests?: string[];
  joined_at: string;
  updated_at: string;
  welcome_message_shown: boolean;
}

interface HuBookContextType {
  hubookProfile: HuBookProfile | null;
  loading: boolean;
  hasHuBookProfile: boolean;
  createHuBookProfile: (profile: Partial<HuBookProfile>) => Promise<void>;
  updateHuBookProfile: (updates: Partial<HuBookProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const HuBookContext = createContext<HuBookContextType | undefined>(undefined);

export function HuBookProvider({ children }: { children: ReactNode }) {
  const { user, userProfile } = useAuth();
  const [hubookProfile, setHubookProfile] = useState<HuBookProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHuBookProfile = async () => {
    if (!user || !userProfile) {
      setHubookProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('hubook_profiles')
        .select('*')
        .eq('id', userProfile.id)
        .maybeSingle();

      if (error) throw error;
      setHubookProfile(data);
    } catch (error) {
      console.error('Error fetching HuBook profile:', error);
      setHubookProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && userProfile?.id) {
      fetchHuBookProfile();
    }
  }, [user?.id, userProfile?.id]);

  const createHuBookProfile = async (profile: Partial<HuBookProfile>) => {
    if (!user || !userProfile) throw new Error('Must be signed in');

    const { data, error } = await supabase
      .from('hubook_profiles')
      .insert({
        id: userProfile.id,
        user_id: user.id,
        display_name: profile.display_name,
        sex: profile.sex,
        age: profile.age,
        bio: profile.bio || null,
        profile_photo_url: profile.profile_photo_url || null,
        cover_photo_url: profile.cover_photo_url || null,
        location: profile.location || null,
        work: profile.work || null,
        education: profile.education || null,
        relationship_status: profile.relationship_status || null,
        interests: profile.interests || [],
        welcome_message_shown: false
      })
      .select()
      .single();

    if (error) throw error;
    setHubookProfile(data);
  };

  const updateHuBookProfile = async (updates: Partial<HuBookProfile>) => {
    if (!userProfile || !hubookProfile) throw new Error('No profile to update');

    const { data, error } = await supabase
      .from('hubook_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.id)
      .select()
      .single();

    if (error) throw error;
    setHubookProfile(data);
  };

  const refreshProfile = async () => {
    await fetchHuBookProfile();
  };

  return (
    <HuBookContext.Provider
      value={{
        hubookProfile,
        loading,
        hasHuBookProfile: !!hubookProfile,
        createHuBookProfile,
        updateHuBookProfile,
        refreshProfile
      }}
    >
      {children}
    </HuBookContext.Provider>
  );
}

export function useHuBook() {
  const context = useContext(HuBookContext);
  if (context === undefined) {
    throw new Error('useHuBook must be used within a HuBookProvider');
  }
  return context;
}
