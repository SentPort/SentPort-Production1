import { supabase } from './supabase';

interface CreateNotificationParams {
  userId: string;
  actorId: string;
  type: 'friend_request' | 'friend_accepted' | 'comment' | 'reply' | 'reaction' | 'share' | 'mention' | 'tag';
  message: string;
  postId?: string;
  commentId?: string;
  shareId?: string;
}

export async function createHuBookNotification(params: CreateNotificationParams) {
  const { userId, actorId, type, message, postId, commentId, shareId } = params;

  try {
    const { data: preferences } = await supabase
      .from('hubook_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const enabledField = `${type.replace('_', '_')}_enabled` as keyof typeof preferences;
    if (preferences && preferences[enabledField] === false) {
      return null;
    }

    if (preferences?.quiet_hours_enabled && preferences.quiet_hours_start && preferences.quiet_hours_end) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const startTime = preferences.quiet_hours_start;
      const endTime = preferences.quiet_hours_end;

      if (startTime < endTime) {
        if (currentTime >= startTime && currentTime <= endTime) {
          return null;
        }
      } else {
        if (currentTime >= startTime || currentTime <= endTime) {
          return null;
        }
      }
    }

    const { data, error } = await supabase
      .from('hubook_notifications')
      .insert({
        user_id: userId,
        actor_id: actorId,
        type,
        message,
        post_id: postId,
        comment_id: commentId,
        share_id: shareId
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating HuBook notification:', error);
    return null;
  }
}

export async function createFriendRequestNotification(userId: string, requesterId: string, requesterName: string) {
  return createHuBookNotification({
    userId,
    actorId: requesterId,
    type: 'friend_request',
    message: `${requesterName} sent you a friend request`
  });
}

export async function createFriendAcceptedNotification(userId: string, accepterId: string, accepterName: string) {
  return createHuBookNotification({
    userId,
    actorId: accepterId,
    type: 'friend_accepted',
    message: `${accepterName} accepted your friend request`
  });
}

export async function createCommentNotification(
  postOwnerId: string,
  commenterId: string,
  commenterName: string,
  postId: string,
  commentId: string
) {
  return createHuBookNotification({
    userId: postOwnerId,
    actorId: commenterId,
    type: 'comment',
    message: `${commenterName} commented on your post`,
    postId,
    commentId
  });
}

export async function createReplyNotification(
  originalCommenterId: string,
  replierId: string,
  replierName: string,
  postId: string,
  commentId: string
) {
  return createHuBookNotification({
    userId: originalCommenterId,
    actorId: replierId,
    type: 'reply',
    message: `${replierName} replied to your comment`,
    postId,
    commentId
  });
}

export async function createReactionNotification(
  postOwnerId: string,
  reactorId: string,
  reactorName: string,
  reactionType: string,
  postId: string
) {
  const reactionText = reactionType === 'like' ? 'liked' : `reacted ${reactionType} to`;
  return createHuBookNotification({
    userId: postOwnerId,
    actorId: reactorId,
    type: 'reaction',
    message: `${reactorName} ${reactionText} your post`,
    postId
  });
}

export async function createShareNotification(
  postOwnerId: string,
  sharerId: string,
  sharerName: string,
  postId: string,
  shareId: string
) {
  return createHuBookNotification({
    userId: postOwnerId,
    actorId: sharerId,
    type: 'share',
    message: `${sharerName} shared your post`,
    postId,
    shareId
  });
}

export async function createMentionNotification(
  mentionedUserId: string,
  mentionerId: string,
  mentionerName: string,
  postId?: string,
  commentId?: string
) {
  const location = commentId ? 'a comment' : 'a post';
  return createHuBookNotification({
    userId: mentionedUserId,
    actorId: mentionerId,
    type: 'mention',
    message: `${mentionerName} mentioned you in ${location}`,
    postId,
    commentId
  });
}

export async function createTagNotification(
  taggedUserId: string,
  taggerId: string,
  taggerName: string,
  postId: string
) {
  return createHuBookNotification({
    userId: taggedUserId,
    actorId: taggerId,
    type: 'tag',
    message: `${taggerName} tagged you in a photo`,
    postId
  });
}
