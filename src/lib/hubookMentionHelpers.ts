import { supabase } from './supabase';

export interface HuBookUserMentionData {
  userId: string;
  displayName: string;
}

export interface HuBookUserSuggestion {
  id: string;
  display_name: string;
  profile_photo_url: string | null;
  user_id: string;
}

export function parseHuBookMentions(content: string): HuBookUserMentionData[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: HuBookUserMentionData[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      displayName: match[1],
      userId: match[2]
    });
  }

  return mentions;
}

export async function searchUsersForMention(
  query: string,
  limit: number = 10,
  excludeUserId?: string
): Promise<HuBookUserSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const searchTerm = `%${query}%`;

  let queryBuilder = supabase
    .from('hubook_profiles')
    .select('id, display_name, profile_photo_url, user_id')
    .ilike('display_name', searchTerm)
    .order('display_name', { ascending: true })
    .limit(limit);

  if (excludeUserId) {
    queryBuilder = queryBuilder.neq('user_id', excludeUserId);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return data || [];
}

export async function saveHuBookMentions(
  contentType: 'post' | 'comment' | 'album_media_comment',
  contentId: string,
  content: string,
  mentioningUserId: string
): Promise<void> {
  const mentions = parseHuBookMentions(content);

  if (mentions.length === 0) {
    return;
  }

  const uniqueMentions = mentions.filter((mention, index, self) =>
    index === self.findIndex(m => m.userId === mention.userId)
  );

  const mentionRecords = uniqueMentions
    .filter(mention => mention.userId !== mentioningUserId)
    .map(mention => ({
      content_type: contentType,
      content_id: contentId,
      mentioned_user_id: mention.userId,
      mentioning_user_id: mentioningUserId
    }));

  if (mentionRecords.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('hubook_mentions')
    .insert(mentionRecords);

  if (error) {
    console.error('Error saving HuBook mentions:', error);
    throw error;
  }
}

export function renderHuBookMentionsAsLinks(content: string): string {
  return content.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    (match, displayName, userId) => {
      return `<a href="/hubook/profile/${userId}" data-mention-user-id="${userId}" class="text-blue-600 font-semibold hover:underline cursor-pointer">@${displayName}</a>`;
    }
  );
}

export function stripHuBookMentionMarkup(content: string): string {
  return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

export function createUserMentionMarkup(user: HuBookUserSuggestion): string {
  return `@[${user.display_name}](${user.user_id})`;
}
