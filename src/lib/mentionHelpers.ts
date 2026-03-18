import { supabase } from './supabase';

export interface MentionData {
  id: string;
  display: string;
}

export function parseMentions(content: string): MentionData[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: MentionData[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      display: match[1],
      id: match[2]
    });
  }

  return mentions;
}

export function extractMentionedUserIds(content: string): string[] {
  const mentions = parseMentions(content);
  return mentions.map(m => m.id);
}

export async function saveMentions(
  contentType: 'post' | 'comment',
  contentId: string,
  content: string,
  mentioningUserId: string
): Promise<void> {
  const mentionedUserIds = extractMentionedUserIds(content);

  if (mentionedUserIds.length === 0) {
    return;
  }

  const mentionRecords = mentionedUserIds.map(userId => ({
    content_type: contentType,
    content_id: contentId,
    mentioned_user_id: userId,
    mentioning_user_id: mentioningUserId
  }));

  const { error } = await supabase
    .from('hubook_mentions')
    .insert(mentionRecords);

  if (error) {
    console.error('Error saving mentions:', error);
    throw error;
  }
}

export function renderMentionsAsLinks(content: string): string {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;

  return content.replace(mentionRegex, (match, display, id) => {
    return `<a href="/hubook/user/${id}" class="text-blue-600 font-semibold hover:underline">@${display}</a>`;
  });
}

export function stripMentionMarkup(content: string): string {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  return content.replace(mentionRegex, '@$1');
}
