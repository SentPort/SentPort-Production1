import { useState, useRef, useEffect } from 'react';
import { Loader2, User } from 'lucide-react';
import {
  searchChannelsForMention,
  createMentionMarkup,
  HuTubeChannelSuggestion
} from '../../lib/huTubeMentionHelpers';

interface HuTubeMentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
}

export default function HuTubeMentionTextarea({
  value,
  onChange,
  placeholder = 'Add a comment...',
  maxLength,
  rows = 3,
  className = ''
}: HuTubeMentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<HuTubeChannelSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mentionQuery.length >= 2) {
      searchChannels(mentionQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [mentionQuery]);

  const searchChannels = async (query: string) => {
    setLoading(true);
    try {
      const results = await searchChannelsForMention(query, 8);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Error searching channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(newValue);

    // Check if user just typed @
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);

      // Check if we're still in a mention (no spaces after @)
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

  const closeSuggestions = () => {
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery('');
    setMentionStartPos(-1);
    setSelectedIndex(0);
  };

  const insertMention = (channel: HuTubeChannelSuggestion) => {
    if (mentionStartPos === -1) return;

    const beforeMention = value.substring(0, mentionStartPos);
    const afterMention = value.substring(mentionStartPos + mentionQuery.length + 1); // +1 for @
    const mentionMarkup = createMentionMarkup(channel);

    const newValue = beforeMention + mentionMarkup + ' ' + afterMention;
    onChange(newValue);

    closeSuggestions();

    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + mentionMarkup.length + 1;
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

  const formatSubscriberCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none ${className}`}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}
          {!loading && suggestions.map((channel, index) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => insertMention(channel)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                index === selectedIndex ? 'bg-red-50' : ''
              }`}
            >
              {channel.avatar_url ? (
                <img
                  src={channel.avatar_url}
                  alt={channel.display_name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {channel.display_name}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span className="truncate">@{channel.handle}</span>
                  <span className="text-gray-400">•</span>
                  <span className="flex-shrink-0">
                    {formatSubscriberCount(channel.subscriber_count)} subscribers
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {maxLength && (
        <div className="mt-1 text-xs text-gray-500 text-right">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
}
