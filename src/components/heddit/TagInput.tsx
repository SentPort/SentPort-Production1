import { useState, useEffect, useRef } from 'react';
import { X, Tag, Info, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TagSuggestion {
  id: string;
  tag_name: string;
  display_name: string;
  usage_count: number;
}

interface TagInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
  subredditId?: string;
}

export function TagInput({
  selectedTags,
  onTagsChange,
  maxTags = 10,
  placeholder = "Type tags separated by commas, or press Enter...",
  subredditId
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [previewTags, setPreviewTags] = useState<string[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parseCommaSeparatedTags(inputValue);
    setPreviewTags(parsed.length > 1 ? parsed : []);
  }, [inputValue]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const currentSegment = getCurrentTagSegment(inputValue);

      if (currentSegment.trim().length < 1) {
        const { data } = await supabase
          .rpc('search_tags_autocomplete', {
            search_query: '',
            result_limit: 10
          });

        if (data) {
          setSuggestions(data.filter((tag: TagSuggestion) =>
            !selectedTags.includes(tag.display_name) && !previewTags.includes(tag.display_name)
          ));
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('search_tags_autocomplete', {
            search_query: currentSegment.trim(),
            result_limit: 10
          });

        if (!error && data) {
          setSuggestions(data.filter((tag: TagSuggestion) =>
            !selectedTags.includes(tag.display_name) && !previewTags.includes(tag.display_name)
          ));
        }
      } catch (err) {
        console.error('Error fetching tag suggestions:', err);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [inputValue, selectedTags, previewTags]);

  useEffect(() => {
    if (subredditId && inputValue.trim().length === 0 && showSuggestions) {
      const fetchPopularTags = async () => {
        try {
          const { data, error } = await supabase
            .rpc('get_subreddit_popular_tags', {
              subreddit_uuid: subredditId,
              result_limit: 5
            });

          if (!error && data) {
            setSuggestions(data.filter((tag: TagSuggestion) =>
              !selectedTags.includes(tag.display_name)
            ));
          }
        } catch (err) {
          console.error('Error fetching popular tags:', err);
        }
      };

      fetchPopularTags();
    }
  }, [subredditId, inputValue, selectedTags, showSuggestions]);

  const parseCommaSeparatedTags = (input: string): string[] => {
    return input
      .split(/[,;]/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0 && tag.length <= 50);
  };

  const getCurrentTagSegment = (input: string): string => {
    const parts = input.split(/[,;]/);
    return parts[parts.length - 1] || '';
  };

  const addMultipleTags = (tags: string[]) => {
    const validTags = tags.filter(tag => {
      const trimmed = tag.trim();
      return trimmed && !selectedTags.some(t => t.toLowerCase() === trimmed.toLowerCase());
    });

    const availableSlots = maxTags - selectedTags.length;
    const tagsToAdd = validTags.slice(0, availableSlots);

    if (tagsToAdd.length > 0) {
      onTagsChange([...selectedTags, ...tagsToAdd]);
      setInputValue('');
      setPreviewTags([]);
      setSuggestions([]);
      setSelectedIndex(-1);
      inputRef.current?.focus();
    }

    if (validTags.length > availableSlots) {
      alert(`Only ${availableSlots} tag slots available. Maximum ${maxTags} tags allowed.`);
    }
  };

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    if (selectedTags.length >= maxTags) {
      alert(`Maximum ${maxTags} tags allowed`);
      return;
    }

    if (selectedTags.some(t => t.toLowerCase() === trimmedTag.toLowerCase())) {
      return;
    }

    onTagsChange([...selectedTags, trimmedTag]);
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleAddTag(suggestions[selectedIndex].display_name);
      } else if (previewTags.length > 1) {
        addMultipleTags(previewTags);
      } else if (inputValue.trim()) {
        const parsed = parseCommaSeparatedTags(inputValue);
        if (parsed.length > 1) {
          addMultipleTags(parsed);
        } else {
          handleAddTag(inputValue);
        }
      }
    } else if (e.key === ',' || e.key === ';') {
      const currentSegment = getCurrentTagSegment(inputValue);
      if (currentSegment.trim()) {
        return;
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <span className="bg-yellow-100 font-semibold">{text.slice(index, index + query.length)}</span>
        {text.slice(index + query.length)}
      </>
    );
  };

  const currentQuery = getCurrentTagSegment(inputValue);
  const hasCommaSeparated = previewTags.length > 1;

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className={`flex flex-wrap gap-2 p-3 border rounded-lg bg-white transition-all ${
          hasCommaSeparated
            ? 'border-orange-400 ring-2 ring-orange-200'
            : 'border-gray-300 focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500'
        }`}>
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium"
            >
              <Tag className="w-3 h-3" />
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-red-600 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {previewTags.map((tag, idx) => (
            <span
              key={`preview-${idx}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-md text-sm font-medium animate-pulse"
            >
              <Plus className="w-3 h-3" />
              {tag}
            </span>
          ))}
          <div className="relative flex-1 min-w-[120px]">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={handleKeyDown}
              placeholder={selectedTags.length === 0 ? placeholder : ''}
              disabled={selectedTags.length >= maxTags}
              className="w-full outline-none text-sm disabled:cursor-not-allowed"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleAddTag(suggestion.display_name)}
                    className={`w-full text-left px-3 py-2 hover:bg-orange-50 flex items-center justify-between transition-colors ${
                      index === selectedIndex ? 'bg-orange-100' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">
                        {highlightMatch(suggestion.display_name, currentQuery)}
                      </span>
                    </span>
                    <span className="text-xs text-gray-500">
                      {suggestion.usage_count.toLocaleString()} uses
                    </span>
                  </button>
                ))}
                {currentQuery.trim() && !suggestions.some(s => s.display_name.toLowerCase() === currentQuery.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleAddTag(currentQuery)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 text-gray-600"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Create new tag: <span className="font-semibold">{currentQuery}</span></span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {hasCommaSeparated && (
          <div className="absolute -top-2 left-3 px-2 bg-white">
            <span className="text-xs font-medium text-orange-600 animate-pulse">
              Press Enter to add all {previewTags.length} tags
            </span>
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-2 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {selectedTags.length}/{maxTags} tags
          </span>
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Tag input help"
            >
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div className="absolute left-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
                <p className="font-semibold mb-1">How to add tags:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Type and press Enter to add one tag</li>
                  <li>Use commas to add multiple tags at once</li>
                  <li>Click suggestions from the dropdown</li>
                  <li>Press Backspace to remove the last tag</li>
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-400 italic">
          Examples: web-development, tutorials, beginner-friendly
        </div>
      </div>
    </div>
  );
}
