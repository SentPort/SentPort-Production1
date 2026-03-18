import { supabase } from './supabase';

export interface HuTubeMentionData {
  channelId: string;
  handle: string;
  displayName: string;
}

export interface HuTubeChannelSuggestion {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  subscriber_count: number;
}

/**
 * Parse mentions from content in format: @[Display Name (@handle)](channelId)
 */
export function parseHuTubeMentions(content: string): HuTubeMentionData[] {
  const mentionRegex = /@\[([^@]+)\(@([^)]+)\)\]\(([^)]+)\)/g;
  const mentions: HuTubeMentionData[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      displayName: match[1].trim(),
      handle: match[2],
      channelId: match[3]
    });
  }

  return mentions;
}

/**
 * Extract channel IDs from mentions
 */
export function extractMentionedChannelIds(content: string): string[] {
  const mentions = parseHuTubeMentions(content);
  return mentions.map(m => m.channelId);
}

/**
 * Smart search for channels by handle OR display name
 * Returns channels matching either field
 */
export async function searchChannelsForMention(
  query: string,
  limit: number = 10
): Promise<HuTubeChannelSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const searchTerm = `%${query}%`;

  const { data, error } = await supabase
    .from('hutube_channels')
    .select('id, handle, display_name, avatar_url, subscriber_count')
    .or(`handle.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
    .order('subscriber_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error searching channels:', error);
    return [];
  }

  return data || [];
}

/**
 * Save mentions to database and create notifications
 */
export async function saveHuTubeMentions(
  contentType: 'comment' | 'video_description',
  contentId: string,
  content: string,
  mentioningChannelId: string
): Promise<void> {
  const mentions = parseHuTubeMentions(content);

  if (mentions.length === 0) {
    return;
  }

  const mentionRecords = mentions.map(mention => ({
    content_type: contentType,
    content_id: contentId,
    mentioned_channel_id: mention.channelId,
    mentioning_channel_id: mentioningChannelId,
    mentioned_handle: mention.handle,
    mentioned_display_name: mention.displayName
  }));

  const { error } = await supabase
    .from('hutube_mentions')
    .insert(mentionRecords);

  if (error) {
    console.error('Error saving HuTube mentions:', error);
    throw error;
  }
}

/**
 * Render mentions as clickable links
 */
export function renderHuTubeMentionsAsLinks(content: string): string {
  const mentionRegex = /@\[([^@]+)\(@([^)]+)\)\]\(([^)]+)\)/g;

  return content.replace(mentionRegex, (match, displayName, handle, channelId) => {
    return `<a href="/hutube/channel/${channelId}" class="text-red-600 font-semibold hover:underline">@${handle}</a>`;
  });
}

/**
 * Strip mention markup to plain text
 */
export function stripHuTubeMentionMarkup(content: string): string {
  const mentionRegex = /@\[([^@]+)\(@([^)]+)\)\]\(([^)]+)\)/g;
  return content.replace(mentionRegex, '@$2');
}

/**
 * Format channel for mention display in autocomplete
 */
export function formatChannelForDisplay(channel: HuTubeChannelSuggestion): string {
  return `${channel.display_name} (@${channel.handle})`;
}

/**
 * Create mention markup from channel data
 */
export function createMentionMarkup(channel: HuTubeChannelSuggestion): string {
  return `@[${channel.display_name} (@${channel.handle})](${channel.id})`;
}
