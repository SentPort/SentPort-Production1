import { supabase } from './supabase';
import { MessageSquare, Share2, Tv, Camera, User, Users, BookOpen } from 'lucide-react';

export interface PlatformMembership {
  platform: string;
  display_name: string;
  icon_color: string;
  route: string;
  joined_at: string;
}

export interface PlatformInfo {
  name: string;
  displayName: string;
  route: string;
  icon: any;
  iconColor: string;
  joined: boolean;
  joinedAt?: string;
}

const PLATFORM_ICONS = {
  hubook: MessageSquare,
  switter: Share2,
  hutube: Tv,
  hinsta: Camera,
  heddit: Users,
  hublog: BookOpen,
};

export const ALL_PLATFORMS: Omit<PlatformInfo, 'joined' | 'joinedAt'>[] = [
  { name: 'hubook', displayName: 'HuBook', route: '/hubook', icon: MessageSquare, iconColor: 'bg-blue-600' },
  { name: 'switter', displayName: 'Switter', route: '/switter', icon: Share2, iconColor: 'bg-yellow-500' },
  { name: 'hutube', displayName: 'HuTube', route: '/hutube', icon: Tv, iconColor: 'bg-red-600' },
  { name: 'hinsta', displayName: 'Hinsta', route: '/hinsta', icon: Camera, iconColor: 'bg-pink-600' },
  { name: 'heddit', displayName: 'Heddit', route: '/heddit', icon: Users, iconColor: 'bg-orange-600' },
  { name: 'hublog', displayName: 'HuBlog', route: '/blog', icon: BookOpen, iconColor: 'bg-green-600' },
];

export async function getUserPlatformMemberships(userId: string): Promise<PlatformMembership[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_platform_memberships', {
      user_uuid: userId,
    });

    if (error) {
      console.error('Error fetching platform memberships:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching platform memberships:', error);
    return [];
  }
}

export async function getUserPlatformCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('count_user_platforms', {
      user_uuid: userId,
    });

    if (error) {
      console.error('Error counting platforms:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error counting platforms:', error);
    return 0;
  }
}

export async function getUserPlatformsWithStatus(userId: string): Promise<PlatformInfo[]> {
  try {
    const memberships = await getUserPlatformMemberships(userId);
    const membershipMap = new Map(
      memberships.map((m) => [m.platform, m])
    );

    return ALL_PLATFORMS.map((platform) => {
      const membership = membershipMap.get(platform.name);
      return {
        ...platform,
        joined: !!membership,
        joinedAt: membership?.joined_at,
      };
    });
  } catch (error) {
    console.error('Error getting platforms with status:', error);
    return ALL_PLATFORMS.map((platform) => ({
      ...platform,
      joined: false,
    }));
  }
}

export function getPlatformIcon(platformName: string) {
  return PLATFORM_ICONS[platformName as keyof typeof PLATFORM_ICONS] || User;
}

export function formatDistanceToNow(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y`;
}
