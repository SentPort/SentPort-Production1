import { supabase } from './supabase';

export interface HedditUserMentionData {
  type: 'user';
  userId: string;
  username: string;
}

export interface HedditCommunityMentionData {
  type: 'community';
  communityId: string;
  communityName: string;
}

export type HedditMentionData = HedditUserMentionData | HedditCommunityMentionData;

export interface HedditUserSuggestion {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  karma: number;
}

export interface HedditCommunitySuggestion {
  id: string;
  name: string;
  display_name: string;
  member_count: number;
}

/**
 * Parse user mentions from content in format: @[username](userId)
 */
export function parseHedditUserMentions(content: string): HedditUserMentionData[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: HedditUserMentionData[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Skip if it's a community mention (starts with h/)
    if (!match[1].startsWith('h/')) {
      mentions.push({
        type: 'user',
        username: match[1],
        userId: match[2]
      });
    }
  }

  return mentions;
}

/**
 * Parse community mentions from content in format: @[h/communityname](communityId)
 */
export function parseHedditCommunityMentions(content: string): HedditCommunityMentionData[] {
  const mentionRegex = /@\[h\/([^\]]+)\]\(([^)]+)\)/g;
  const mentions: HedditCommunityMentionData[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      type: 'community',
      communityName: match[1],
      communityId: match[2]
    });
  }

  return mentions;
}

/**
 * Parse all mentions (both user and community)
 */
export function parseAllHedditMentions(content: string): HedditMentionData[] {
  const userMentions = parseHedditUserMentions(content);
  const communityMentions = parseHedditCommunityMentions(content);
  return [...userMentions, ...communityMentions];
}

/**
 * Search for users by username
 */
export async function searchUsersForMention(
  query: string,
  limit: number = 10,
  excludeUserId?: string
): Promise<HedditUserSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const searchTerm = `%${query}%`;

  let queryBuilder = supabase
    .from('heddit_accounts')
    .select('id, username, display_name, avatar_url, karma')
    .ilike('username', searchTerm)
    .order('karma', { ascending: false })
    .limit(limit);

  if (excludeUserId) {
    queryBuilder = queryBuilder.neq('id', excludeUserId);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return data || [];
}

/**
 * Search for communities by name
 */
export async function searchCommunitiesForMention(
  query: string,
  limit: number = 5
): Promise<HedditCommunitySuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const searchTerm = `%${query}%`;

  const { data, error } = await supabase
    .from('heddit_subreddits')
    .select('id, name, display_name, member_count')
    .ilike('name', searchTerm)
    .order('member_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error searching communities:', error);
    return [];
  }

  return data || [];
}

/**
 * Save mentions to database for notifications and karma rewards.
 * The FIRST community mention (@h/communityname) in each post/comment awards +10 karma to the mentioning user.
 * User mentions (@username) do not award karma but still trigger notifications to the mentioned user.
 * Community mentions trigger notifications to all moderators of the mentioned community.
 */
export async function saveHedditMentions(
  contentType: 'post' | 'comment',
  contentId: string,
  content: string,
  mentioningUserId: string
): Promise<void> {
  const allMentions = parseAllHedditMentions(content);

  if (allMentions.length === 0) {
    return;
  }

  // Limit community mentions to 3 per post to prevent spam
  const communityMentions = allMentions.filter(m => m.type === 'community').slice(0, 3);

  // Filter out self-mentions (no self-notifications needed)
  const userMentions = allMentions
    .filter(m => m.type === 'user')
    .filter(m => m.userId !== mentioningUserId);

  const limitedMentions = [...userMentions, ...communityMentions];

  if (limitedMentions.length === 0) {
    return;
  }

  const mentionRecords = limitedMentions.map(mention => {
    if (mention.type === 'user') {
      return {
        content_type: contentType,
        content_id: contentId,
        mention_type: 'user',
        mentioned_user_id: mention.userId,
        mentioned_community_id: null,
        mentioning_user_id: mentioningUserId
      };
    } else {
      return {
        content_type: contentType,
        content_id: contentId,
        mention_type: 'community',
        mentioned_user_id: null,
        mentioned_community_id: mention.communityId,
        mentioning_user_id: mentioningUserId
      };
    }
  });

  const { error } = await supabase
    .from('heddit_mentions')
    .insert(mentionRecords);

  if (error) {
    console.error('Error saving Heddit mentions:', error);
    throw error;
  }
}

/**
 * Render mentions as clickable links
 */
export function renderHedditMentionsAsLinks(content: string): string {
  // First render community mentions
  let rendered = content.replace(
    /@\[h\/([^\]]+)\]\(([^)]+)\)/g,
    (match, communityName, communityId) => {
      return `<a href="/heddit/h/${communityName}" class="text-orange-600 font-semibold hover:underline">@h/${communityName}</a>`;
    }
  );

  // Then render user mentions
  rendered = rendered.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    (match, username, userId) => {
      return `<a href="/heddit/user/${username}" class="text-blue-600 font-semibold hover:underline">@${username}</a>`;
    }
  );

  return rendered;
}

/**
 * Strip mention markup to plain text
 */
export function stripHedditMentionMarkup(content: string): string {
  return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

/**
 * Create mention markup for user
 */
export function createUserMentionMarkup(user: HedditUserSuggestion): string {
  return `@[${user.username}](${user.id})`;
}

/**
 * Create mention markup for community
 */
export function createCommunityMentionMarkup(community: HedditCommunitySuggestion): string {
  return `@[h/${community.name}](${community.id})`;
}

/**
 * Validate mention count (especially community mentions)
 */
export function validateMentionCount(content: string): { valid: boolean; message?: string } {
  const communityMentions = parseHedditCommunityMentions(content);

  if (communityMentions.length > 3) {
    return {
      valid: false,
      message: 'You can only mention up to 3 communities per post to prevent spam.'
    };
  }

  return { valid: true };
}
