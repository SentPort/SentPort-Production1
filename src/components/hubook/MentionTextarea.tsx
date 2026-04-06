import { useEffect, useState } from 'react';
import { Mention, MentionsInput, SuggestionDataItem } from 'react-mentions';
import { supabase } from '../../lib/supabase';
import { useHuBook } from '../../contexts/HuBookContext';

interface MentionUser {
  id: string;
  display: string;
  profile_photo_url?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  friendsOnly?: boolean;
}

export default function MentionTextarea({
  value,
  onChange,
  placeholder = 'What\'s on your mind?',
  rows = 3,
  className = '',
  disabled = false,
  friendsOnly = false
}: MentionTextareaProps) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const { hubookProfile } = useHuBook();

  const fetchUsers = async (query: string, callback: (data: SuggestionDataItem[]) => void) => {
    if (!query) {
      callback([]);
      return;
    }

    try {
      let queryBuilder;

      if (friendsOnly && hubookProfile) {
        // Only show friends when friendsOnly is true
        const { data, error } = await supabase
          .from('friendships')
          .select(`
            friend:hubook_profiles!friendships_friend_id_fkey(id, display_name, profile_photo_url)
          `)
          .eq('user_id', hubookProfile.id)
          .eq('status', 'accepted');

        if (error) throw error;

        const friends = (data || [])
          .map(f => f.friend)
          .filter(friend =>
            friend &&
            friend.display_name &&
            friend.display_name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 10);

        const suggestions: SuggestionDataItem[] = friends.map(user => ({
          id: user.id,
          display: user.display_name
        }));

        callback(suggestions);
      } else {
        // Show all users
        const { data, error } = await supabase
          .from('hubook_profiles')
          .select('id, display_name, profile_photo_url')
          .ilike('display_name', `%${query}%`)
          .limit(50);

        if (error) throw error;

        // Get privacy settings for all users
        const userIds = (data || []).map(u => u.id);
        const { data: privacyData } = await supabase
          .from('user_privacy_settings')
          .select('user_id, tagging_privacy')
          .in('user_id', userIds);

        const privacyMap = new Map(
          (privacyData || []).map(p => [p.user_id, p.tagging_privacy])
        );

        // Get current user's friends if needed for privacy filtering
        let friendIds = new Set<string>();
        if (hubookProfile) {
          const { data: friendships } = await supabase
            .from('friendships')
            .select('user_id, friend_id')
            .eq('status', 'accepted')
            .or(`user_id.eq.${hubookProfile.id},friend_id.eq.${hubookProfile.id}`);

          friendIds = new Set(
            (friendships || []).map(f =>
              f.user_id === hubookProfile.id ? f.friend_id : f.user_id
            )
          );
        }

        // Filter users based on tagging privacy
        const filteredUsers = (data || []).filter(user => {
          const privacy = privacyMap.get(user.id) || 'everyone';

          if (privacy === 'everyone') return true;
          if (privacy === 'no_one') return false;
          if (privacy === 'friends_only') {
            return friendIds.has(user.id);
          }
          return true;
        }).slice(0, 10);

        const suggestions: SuggestionDataItem[] = filteredUsers.map(user => ({
          id: user.id,
          display: user.display_name
        }));

        callback(suggestions);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      callback([]);
    }
  };

  const mentionStyle = {
    control: {
      fontSize: 16,
      fontWeight: 'normal',
      minHeight: rows * 24
    },
    '&multiLine': {
      control: {
        fontFamily: 'inherit',
        minHeight: rows * 24,
        position: 'relative' as const
      },
      highlighter: {
        padding: 9,
        border: '0',
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none' as const,
        whiteSpace: 'pre-wrap' as const,
        wordWrap: 'break-word' as const
      },
      input: {
        padding: 9,
        border: '0',
        outline: 'none',
        fontSize: '1.125rem',
        lineHeight: '1.75rem',
        position: 'relative' as const,
        background: 'transparent',
        color: 'transparent',
        caretColor: '#000'
      }
    },
    suggestions: {
      list: {
        backgroundColor: 'white',
        border: '1px solid rgba(0,0,0,0.15)',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        fontSize: 14,
        maxHeight: '200px',
        overflowY: 'auto' as const,
        zIndex: 50
      },
      item: {
        padding: '8px 12px',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        cursor: 'pointer',
        '&focused': {
          backgroundColor: '#EFF6FF'
        }
      }
    }
  };

  const mentionDisplayStyle = {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    fontWeight: '600',
    padding: '0 2px',
    borderRadius: '2px'
  };

  return (
    <div className={className}>
      <MentionsInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={mentionStyle}
        disabled={disabled}
        className="w-full resize-none text-gray-900 placeholder-gray-500"
        a11ySuggestionsListLabel="Suggested users to mention"
      >
        <Mention
          trigger="@"
          data={fetchUsers}
          style={mentionDisplayStyle}
          displayTransform={(id, display) => `@${display}`}
          markup="@[__display__](__id__)"
          appendSpaceOnAdd
        />
      </MentionsInput>
    </div>
  );
}
