import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface PlatformCounts {
  heddit: number;
  hubook: number;
  hutube: number;
  hinsta: number;
  switter: number;
  hublog: number;
}

interface PlatformNotificationsContextType {
  counts: PlatformCounts;
  formatBadge: (count: number) => string | null;
  refreshCount: (platform: keyof PlatformCounts) => void;
}

const defaultCounts: PlatformCounts = {
  heddit: 0,
  hubook: 0,
  hutube: 0,
  hinsta: 0,
  switter: 0,
  hublog: 0,
};

const PlatformNotificationsContext = createContext<PlatformNotificationsContextType>({
  counts: defaultCounts,
  formatBadge: () => null,
  refreshCount: () => {},
});

export function usePlatformNotifications() {
  return useContext(PlatformNotificationsContext);
}

export function PlatformNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, isVerified, platformAccounts } = useAuth();
  const [counts, setCounts] = useState<PlatformCounts>(defaultCounts);
  const hedditAccountIdRef = useRef<string | null>(null);
  const hinstaAccountIdRef = useRef<string | null>(null);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const formatBadge = useCallback((count: number): string | null => {
    if (count <= 0) return null;
    if (count > 9) return '9+';
    return String(count);
  }, []);

  const fetchHedditCount = useCallback(async () => {
    if (!hedditAccountIdRef.current) return;
    const { count } = await supabase
      .from('heddit_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', hedditAccountIdRef.current)
      .eq('is_read', false);
    setCounts(prev => ({ ...prev, heddit: count || 0 }));
  }, []);

  const fetchHubookCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('hubook_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .eq('read', false);
    setCounts(prev => ({ ...prev, hubook: count || 0 }));
  }, [user]);

  const fetchHutubeCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('hutube_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .eq('read', false);
    setCounts(prev => ({ ...prev, hutube: count || 0 }));
  }, [user]);

  const fetchHinstaCount = useCallback(async () => {
    if (!hinstaAccountIdRef.current) return;
    const { count } = await supabase
      .from('hinsta_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', hinstaAccountIdRef.current)
      .eq('is_read', false);
    setCounts(prev => ({ ...prev, hinsta: count || 0 }));
  }, []);

  const fetchSwitterCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('switter_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setCounts(prev => ({ ...prev, switter: count || 0 }));
  }, [user]);

  const fetchHublogCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('blog_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
    setCounts(prev => ({ ...prev, hublog: count || 0 }));
  }, [user]);

  const refreshCount = useCallback((platform: keyof PlatformCounts) => {
    switch (platform) {
      case 'heddit': fetchHedditCount(); break;
      case 'hubook': fetchHubookCount(); break;
      case 'hutube': fetchHutubeCount(); break;
      case 'hinsta': fetchHinstaCount(); break;
      case 'switter': fetchSwitterCount(); break;
      case 'hublog': fetchHublogCount(); break;
    }
  }, [fetchHedditCount, fetchHubookCount, fetchHutubeCount, fetchHinstaCount, fetchSwitterCount, fetchHublogCount]);

  useEffect(() => {
    if (!user || !isVerified) {
      setCounts(defaultCounts);
      hedditAccountIdRef.current = null;
      hinstaAccountIdRef.current = null;
      return;
    }

    const setupCounts = async () => {
      const [hedditData, hinstaData] = await Promise.all([
        platformAccounts.heddit
          ? supabase.from('heddit_accounts').select('id').eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        platformAccounts.hinsta
          ? supabase.from('hinsta_accounts').select('id').eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (hedditData.data) hedditAccountIdRef.current = hedditData.data.id;
      if (hinstaData.data) hinstaAccountIdRef.current = hinstaData.data.id;

      const fetches: Promise<void>[] = [];
      if (platformAccounts.heddit && hedditAccountIdRef.current) fetches.push(fetchHedditCount());
      if (platformAccounts.hubook) fetches.push(fetchHubookCount());
      if (platformAccounts.hutube) fetches.push(fetchHutubeCount());
      if (platformAccounts.hinsta && hinstaAccountIdRef.current) fetches.push(fetchHinstaCount());
      if (platformAccounts.switter) fetches.push(fetchSwitterCount());
      if (platformAccounts.blog) fetches.push(fetchHublogCount());
      await Promise.all(fetches);
    };

    setupCounts();

    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (platformAccounts.heddit) {
      const ch = supabase
        .channel('platform-notif-heddit')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'heddit_notifications' }, fetchHedditCount)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'heddit_notifications' }, fetchHedditCount)
        .subscribe();
      channels.push(ch);
    }

    if (platformAccounts.hubook) {
      const ch = supabase
        .channel('platform-notif-hubook')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hubook_notifications' }, fetchHubookCount)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hubook_notifications' }, fetchHubookCount)
        .subscribe();
      channels.push(ch);
    }

    if (platformAccounts.hutube) {
      const ch = supabase
        .channel('platform-notif-hutube')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hutube_notifications' }, fetchHutubeCount)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hutube_notifications' }, fetchHutubeCount)
        .subscribe();
      channels.push(ch);
    }

    if (platformAccounts.hinsta) {
      const ch = supabase
        .channel('platform-notif-hinsta')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hinsta_notifications' }, fetchHinstaCount)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hinsta_notifications' }, fetchHinstaCount)
        .subscribe();
      channels.push(ch);
    }

    if (platformAccounts.switter) {
      const ch = supabase
        .channel('platform-notif-switter')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'switter_notifications' }, fetchSwitterCount)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'switter_notifications' }, fetchSwitterCount)
        .subscribe();
      channels.push(ch);
    }

    if (platformAccounts.blog) {
      const ch = supabase
        .channel('platform-notif-hublog')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blog_notifications' }, fetchHublogCount)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'blog_notifications' }, fetchHublogCount)
        .subscribe();
      channels.push(ch);
    }

    channelsRef.current = channels;

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [user, isVerified, platformAccounts.heddit, platformAccounts.hubook, platformAccounts.hutube, platformAccounts.hinsta, platformAccounts.switter, platformAccounts.blog]);

  return (
    <PlatformNotificationsContext.Provider value={{ counts, formatBadge, refreshCount }}>
      {children}
    </PlatformNotificationsContext.Provider>
  );
}
