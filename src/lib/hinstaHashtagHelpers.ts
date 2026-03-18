import { supabase } from './supabase';

export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex);
  if (!matches) return [];

  return [...new Set(matches.map(tag => tag.toLowerCase().substring(1)))];
}

export async function savePostHashtags(postId: string, caption: string) {
  const hashtags = extractHashtags(caption);

  for (const tag of hashtags) {
    let { data: existingTag } = await supabase
      .from('hinsta_hashtags')
      .select('id')
      .eq('tag', tag)
      .maybeSingle();

    let tagId: string;

    if (existingTag) {
      tagId = existingTag.id;

      await supabase
        .from('hinsta_hashtags')
        .update({ post_count: supabase.raw('post_count + 1') })
        .eq('id', tagId);
    } else {
      const { data: newTag } = await supabase
        .from('hinsta_hashtags')
        .insert({ tag, post_count: 1 })
        .select()
        .single();

      tagId = newTag!.id;
    }

    await supabase
      .from('hinsta_post_hashtags')
      .insert({
        post_id: postId,
        hashtag_id: tagId
      });
  }
}

export async function removePostHashtags(postId: string) {
  const { data: postHashtags } = await supabase
    .from('hinsta_post_hashtags')
    .select('hashtag_id')
    .eq('post_id', postId);

  if (postHashtags) {
    for (const ph of postHashtags) {
      await supabase
        .from('hinsta_hashtags')
        .update({ post_count: supabase.raw('GREATEST(post_count - 1, 0)') })
        .eq('id', ph.hashtag_id);
    }
  }

  await supabase
    .from('hinsta_post_hashtags')
    .delete()
    .eq('post_id', postId);
}

export function makeHashtagsClickable(text: string): string {
  return text.replace(/#([\w]+)/g, '<a href="/hinsta/hashtag/$1" class="text-blue-600 hover:underline font-semibold">#$1</a>');
}
