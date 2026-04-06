import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useHuBook } from '../../contexts/HuBookContext';

interface MentionUser {
  id: string;
  display_name: string;
  profile_photo_url?: string;
}

interface MentionMatch {
  start: number;
  end: number;
  display: string;
  id: string;
}

interface CustomMentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  friendsOnly?: boolean;
}

export default function CustomMentionTextarea({
  value,
  onChange,
  placeholder = "What's on your mind?",
  rows = 3,
  className = '',
  disabled = false,
  friendsOnly = false
}: CustomMentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const { hubookProfile } = useHuBook();

  // Parse mentions from text
  const parseMentions = useCallback((text: string): MentionMatch[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: MentionMatch[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push({
        start: match.index,
        end: match.index + match[0].length,
        display: match[1],
        id: match[2]
      });
    }

    return mentions;
  }, []);

  // Search for users
  const searchUsers = async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      if (friendsOnly && hubookProfile) {
        const { data, error } = await supabase
          .from('friendships')
          .select('friend:hubook_profiles!friendships_friend_id_fkey(id, display_name, profile_photo_url)')
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

        setSuggestions(friends);
      } else {
        const { data, error } = await supabase
          .from('hubook_profiles')
          .select('id, display_name, profile_photo_url')
          .ilike('display_name', `%${query}%`)
          .limit(50);

        if (error) throw error;

        const userIds = (data || []).map(u => u.id);
        const { data: privacyData } = await supabase
          .from('user_privacy_settings')
          .select('user_id, tagging_privacy')
          .in('user_id', userIds);

        const privacyMap = new Map(
          (privacyData || []).map(p => [p.user_id, p.tagging_privacy])
        );

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

        const filteredUsers = (data || []).filter(user => {
          const privacy = privacyMap.get(user.id) || 'everyone';
          if (privacy === 'everyone') return true;
          if (privacy === 'no_one') return false;
          if (privacy === 'friends_only') return friendIds.has(user.id);
          return true;
        }).slice(0, 10);

        setSuggestions(filteredUsers);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSuggestions([]);
    }
  };

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(newValue);
    setCursorPosition(cursorPos);

    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const mentions = parseMentions(newValue);
      const isInsideMention = mentions.some(
        m => lastAtSymbol >= m.start && lastAtSymbol < m.end
      );

      if (!isInsideMention) {
        const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
          setMentionStartPos(lastAtSymbol);
          setMentionQuery(textAfterAt);
          setShowSuggestions(true);
          searchUsers(textAfterAt);
        } else {
          closeSuggestions();
        }
      } else {
        closeSuggestions();
      }
    } else {
      closeSuggestions();
    }
  };

  // Close suggestions
  const closeSuggestions = () => {
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery('');
    setMentionStartPos(-1);
    setSelectedIndex(0);
  };

  // Insert mention
  const insertMention = (user: MentionUser) => {
    if (mentionStartPos === -1) return;

    const beforeMention = value.substring(0, mentionStartPos);
    const afterMention = value.substring(mentionStartPos + mentionQuery.length + 1);
    const mentionMarkup = `@[${user.display_name}](${user.id})`;

    const newValue = beforeMention + mentionMarkup + ' ' + afterMention;
    onChange(newValue);

    closeSuggestions();

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + mentionMarkup.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPosition(newCursorPos);
      }
    }, 0);
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSuggestions();
      }
      return;
    }

    const mentions = parseMentions(value);
    const cursorPos = textareaRef.current?.selectionStart || 0;

    if (e.key === 'Backspace' || e.key === 'Delete') {
      const mention = mentions.find(m => {
        if (e.key === 'Backspace') {
          return cursorPos > m.start && cursorPos <= m.end;
        } else {
          return cursorPos >= m.start && cursorPos < m.end;
        }
      });

      if (mention) {
        e.preventDefault();
        const newValue = value.substring(0, mention.start) + value.substring(mention.end);
        onChange(newValue);

        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(mention.start, mention.start);
            setCursorPosition(mention.start);
          }
        }, 0);
      }
    }
  };

  // Handle click to snap cursor
  const handleClick = () => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const mentions = parseMentions(value);

    const insideMention = mentions.find(m => cursorPos > m.start && cursorPos < m.end);

    if (insideMention) {
      const distanceToStart = cursorPos - insideMention.start;
      const distanceToEnd = insideMention.end - cursorPos;
      const snapPos = distanceToStart < distanceToEnd ? insideMention.start : insideMention.end;

      textareaRef.current.setSelectionRange(snapPos, snapPos);
      setCursorPosition(snapPos);
    } else {
      setCursorPosition(cursorPos);
    }
  };

  // Sync scroll
  const handleScroll = () => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Render text with mentions highlighted
  const renderTextWithMentions = () => {
    const mentions = parseMentions(value);
    if (mentions.length === 0) return <span style={{ color: 'transparent' }}>{value}</span>;

    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    mentions.forEach((mention, i) => {
      if (mention.start > lastIndex) {
        parts.push(
          <span key={`text-${i}`} style={{ color: 'transparent' }}>
            {value.substring(lastIndex, mention.start)}
          </span>
        );
      }

      parts.push(
        <span
          key={`mention-${i}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold"
        >
          @{mention.display}
        </span>
      );

      lastIndex = mention.end;
    });

    if (lastIndex < value.length) {
      parts.push(
        <span key="text-end" style={{ color: 'transparent' }}>
          {value.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div
          ref={overlayRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
          style={{
            padding: '9px',
            fontSize: '1.125rem',
            lineHeight: '1.75rem',
            fontFamily: 'inherit',
            wordWrap: 'break-word'
          }}
        >
          {renderTextWithMentions()}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onScroll={handleScroll}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className="w-full resize-none placeholder-gray-500 relative bg-transparent border-0 focus:ring-0 focus:outline-none"
          style={{
            padding: '9px',
            fontSize: '1.125rem',
            lineHeight: '1.75rem',
            caretColor: '#000',
            color: 'transparent'
          }}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((user, index) => (
            <div
              key={user.id}
              onClick={() => insertMention(user)}
              className={`flex items-center gap-3 px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={user.display_name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-semibold">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-medium text-gray-900">{user.display_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
