import { useState, useRef, useEffect } from 'react';
import { Loader2, User, Users } from 'lucide-react';
import {
  searchUsersForMention,
  searchCommunitiesForMention,
  createUserMentionMarkup,
  createCommunityMentionMarkup,
  stripHedditMentionMarkup,
  HedditUserSuggestion,
  HedditCommunitySuggestion
} from '../../lib/hedditMentionHelpers';

interface HedditMentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
}

type SuggestionItem =
  | { type: 'user'; data: HedditUserSuggestion }
  | { type: 'community'; data: HedditCommunitySuggestion };

export default function HedditMentionTextarea({
  value,
  onChange,
  placeholder = 'Add a comment...',
  maxLength,
  rows = 3,
  className = ''
}: HedditMentionTextareaProps) {
  // Internal state: markup value is the source of truth (contains @[username](id))
  // Display value is derived from markup for rendering (shows @username)
  const [markupValue, setMarkupValue] = useState(value);
  const [displayValue, setDisplayValue] = useState(() => stripHedditMentionMarkup(value));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [mentionType, setMentionType] = useState<'user' | 'community'>('user');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Sync internal state when parent value changes (e.g., when clearing the form)
  useEffect(() => {
    if (value !== markupValue) {
      setMarkupValue(value);
      setDisplayValue(stripHedditMentionMarkup(value));
    }
  }, [value]);

  useEffect(() => {
    if (mentionQuery.length >= 2) {
      searchMentions(mentionQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [mentionQuery, mentionType]);

  const searchMentions = async (query: string) => {
    setLoading(true);
    try {
      const results: SuggestionItem[] = [];

      // Search users
      const users = await searchUsersForMention(query, 8);
      results.push(...users.map(u => ({ type: 'user' as const, data: u })));

      // Search communities (limit to 5 to show mix of both)
      const communities = await searchCommunitiesForMention(query, 5);
      results.push(...communities.map(c => ({ type: 'community' as const, data: c })));

      // Sort: communities first (higher engagement potential), then by relevance
      results.sort((a, b) => {
        if (a.type === 'community' && b.type === 'user') return -1;
        if (a.type === 'user' && b.type === 'community') return 1;

        if (a.type === 'community' && b.type === 'community') {
          return b.data.member_count - a.data.member_count;
        }
        if (a.type === 'user' && b.type === 'user') {
          return b.data.karma - a.data.karma;
        }
        return 0;
      });

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Error searching mentions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplayValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    // Update display value
    setDisplayValue(newDisplayValue);

    // Reconstruct markup by intelligently mapping display changes to markup
    const newMarkupValue = reconstructMarkup(markupValue, displayValue, newDisplayValue);
    setMarkupValue(newMarkupValue);
    onChange(newMarkupValue);

    // Check if user just typed @
    const textBeforeCursor = newDisplayValue.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);

      // Check if we're still in a mention (no spaces after @)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStartPos(lastAtSymbol);

        // Check if it's a community mention (starts with h/)
        if (textAfterAt.startsWith('h/')) {
          setMentionType('community');
          setMentionQuery(textAfterAt.substring(2)); // Remove 'h/'
        } else {
          setMentionType('user');
          setMentionQuery(textAfterAt);
        }
      } else {
        closeSuggestions();
      }
    } else {
      closeSuggestions();
    }
  };

  // Reconstruct markup value from display changes while preserving mention markup
  const reconstructMarkup = (oldMarkup: string, oldDisplay: string, newDisplay: string): string => {
    // Parse old markup to find all mentions and their positions in display text
    const mentions: Array<{ displayStart: number; displayEnd: number; markup: string }> = [];
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    let displayOffset = 0;

    // Create a copy of oldMarkup to track position
    let tempMarkup = oldMarkup;
    let searchPos = 0;

    while ((match = mentionRegex.exec(oldMarkup)) !== null) {
      const mentionMarkup = match[0];
      const mentionDisplay = stripHedditMentionMarkup(mentionMarkup);

      // Find position in display text by counting non-markup characters before this mention
      const markupBeforeMention = oldMarkup.substring(0, match.index);
      const displayBeforeMention = stripHedditMentionMarkup(markupBeforeMention);
      const displayStart = displayBeforeMention.length;
      const displayEnd = displayStart + mentionDisplay.length;

      mentions.push({
        displayStart,
        displayEnd,
        markup: mentionMarkup
      });
    }

    // Now reconstruct the markup based on how the display text changed
    let result = '';
    let newDisplayPos = 0;

    for (const mention of mentions) {
      // Find where this mention is in the new display text
      const oldMentionText = oldDisplay.substring(mention.displayStart, mention.displayEnd);

      // Add any text before this mention
      while (newDisplayPos < newDisplay.length) {
        const remainingNew = newDisplay.substring(newDisplayPos);

        // Check if we're at the mention position
        if (remainingNew.startsWith(oldMentionText)) {
          // Add the markup for this mention
          result += mention.markup;
          newDisplayPos += oldMentionText.length;
          break;
        } else {
          // Add regular character
          result += newDisplay[newDisplayPos];
          newDisplayPos++;
        }
      }
    }

    // Add any remaining text after all mentions
    result += newDisplay.substring(newDisplayPos);

    return result;
  };

  const closeSuggestions = () => {
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery('');
    setMentionStartPos(-1);
    setSelectedIndex(0);
  };

  const insertMention = (item: SuggestionItem) => {
    if (mentionStartPos === -1) return;

    const beforeMention = displayValue.substring(0, mentionStartPos);
    const afterMention = displayValue.substring(mentionStartPos + mentionQuery.length + 1 + (mentionType === 'community' ? 2 : 0)); // +1 for @, +2 for h/

    // Create markup version (for database storage)
    const mentionMarkup = item.type === 'user'
      ? createUserMentionMarkup(item.data)
      : createCommunityMentionMarkup(item.data);

    // Create display version (what user sees - clean text)
    const mentionDisplay = item.type === 'user'
      ? `@${item.data.username}`
      : `@h/${item.data.name}`;

    // Update display value with clean text
    const newDisplayValue = beforeMention + mentionDisplay + ' ' + afterMention;
    setDisplayValue(newDisplayValue);

    // Reconstruct markup value by preserving any existing mentions in beforeMention/afterMention
    const beforeMarkup = reconstructMarkup(markupValue, displayValue, beforeMention);
    const afterMarkup = reconstructMarkup(markupValue.substring(beforeMarkup.length), displayValue.substring(beforeMention.length), afterMention);

    const newMarkupValue = beforeMarkup + mentionMarkup + ' ' + afterMarkup;
    setMarkupValue(newMarkupValue);
    onChange(newMarkupValue);

    closeSuggestions();

    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + mentionDisplay.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

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
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${className}`}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}
          {!loading && suggestions.map((item, index) => {
            if (item.type === 'user') {
              const user = item.data;
              return (
                <button
                  key={`user-${user.id}`}
                  type="button"
                  onClick={() => insertMention(item)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      u/{user.username}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatNumber(user.karma)} karma
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                      User
                    </span>
                  </div>
                </button>
              );
            } else {
              const community = item.data;
              return (
                <button
                  key={`community-${community.id}`}
                  type="button"
                  onClick={() => insertMention(item)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-l-4 border-orange-500 ${
                    index === selectedIndex ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      h/{community.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatNumber(community.member_count)} members
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">
                      Community
                    </span>
                  </div>
                </button>
              );
            }
          })}
        </div>
      )}

      {maxLength && (
        <div className="mt-1 text-xs text-gray-500 text-right">
          {displayValue.length}/{maxLength}
        </div>
      )}

      <div className="mt-1 text-xs text-blue-600">
        <span className="font-medium">Tip:</span> Type @ for users, or @h/ for communities (use h/ not r/)
      </div>
    </div>
  );
}
