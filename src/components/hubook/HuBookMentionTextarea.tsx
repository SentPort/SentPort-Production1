import { useState, useRef, useEffect } from 'react';
import { Loader2, User } from 'lucide-react';
import {
  searchUsersForMention,
  createUserMentionMarkup,
  stripHuBookMentionMarkup,
  HuBookUserSuggestion
} from '../../lib/hubookMentionHelpers';

interface HuBookMentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
}

export default function HuBookMentionTextarea({
  value,
  onChange,
  placeholder = 'Write something...',
  maxLength,
  rows = 3,
  className = ''
}: HuBookMentionTextareaProps) {
  const [markupValue, setMarkupValue] = useState(value);
  const [displayValue, setDisplayValue] = useState(() => stripHuBookMentionMarkup(value));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<HuBookUserSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== markupValue) {
      setMarkupValue(value);
      setDisplayValue(stripHuBookMentionMarkup(value));
    }
  }, [value]);

  useEffect(() => {
    if (mentionQuery.length >= 2) {
      searchMentions(mentionQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [mentionQuery]);

  const searchMentions = async (query: string) => {
    setLoading(true);
    try {
      const users = await searchUsersForMention(query, 10);
      setSuggestions(users);
      setShowSuggestions(users.length > 0);
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

    setDisplayValue(newDisplayValue);

    const newMarkupValue = reconstructMarkup(markupValue, displayValue, newDisplayValue);
    setMarkupValue(newMarkupValue);
    onChange(newMarkupValue);

    const textBeforeCursor = newDisplayValue.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);

      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStartPos(lastAtSymbol);
        setMentionQuery(textAfterAt);
      } else {
        closeSuggestions();
      }
    } else {
      closeSuggestions();
    }
  };

  const reconstructMarkup = (oldMarkup: string, oldDisplay: string, newDisplay: string): string => {
    const mentions: Array<{ displayStart: number; displayEnd: number; markup: string }> = [];
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = mentionRegex.exec(oldMarkup)) !== null) {
      const mentionMarkup = match[0];
      const mentionDisplay = stripHuBookMentionMarkup(mentionMarkup);

      const markupBeforeMention = oldMarkup.substring(0, match.index);
      const displayBeforeMention = stripHuBookMentionMarkup(markupBeforeMention);
      const displayStart = displayBeforeMention.length;
      const displayEnd = displayStart + mentionDisplay.length;

      mentions.push({
        displayStart,
        displayEnd,
        markup: mentionMarkup
      });
    }

    let result = '';
    let newDisplayPos = 0;

    for (const mention of mentions) {
      const oldMentionText = oldDisplay.substring(mention.displayStart, mention.displayEnd);

      while (newDisplayPos < newDisplay.length) {
        const remainingNew = newDisplay.substring(newDisplayPos);

        if (remainingNew.startsWith(oldMentionText)) {
          result += mention.markup;
          newDisplayPos += oldMentionText.length;
          break;
        } else {
          result += newDisplay[newDisplayPos];
          newDisplayPos++;
        }
      }
    }

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

  const insertMention = (user: HuBookUserSuggestion) => {
    if (mentionStartPos === -1) return;

    const beforeMention = displayValue.substring(0, mentionStartPos);
    const afterMention = displayValue.substring(mentionStartPos + mentionQuery.length + 1);

    const mentionMarkup = createUserMentionMarkup(user);
    const mentionDisplay = `@${user.display_name}`;

    const newDisplayValue = beforeMention + mentionDisplay + ' ' + afterMention;
    setDisplayValue(newDisplayValue);

    const beforeMarkup = reconstructMarkup(markupValue, displayValue, beforeMention);
    const afterMarkup = reconstructMarkup(markupValue.substring(beforeMarkup.length), displayValue.substring(beforeMention.length), afterMention);

    const newMarkupValue = beforeMarkup + mentionMarkup + ' ' + afterMarkup;
    setMarkupValue(newMarkupValue);
    onChange(newMarkupValue);

    closeSuggestions();

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
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${className}`}
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
          {!loading && suggestions.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={user.display_name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {user.display_name}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {maxLength && (
        <div className="mt-1 text-xs text-gray-500 text-right">
          {displayValue.length}/{maxLength}
        </div>
      )}

      <div className="mt-1 text-xs text-blue-600">
        <span className="font-medium">Tip:</span> Type @ to mention someone
      </div>
    </div>
  );
}
