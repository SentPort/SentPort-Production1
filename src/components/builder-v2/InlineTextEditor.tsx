import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface InlineTextEditorProps {
  initialValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  multiline?: boolean;
}

export default function InlineTextEditor({
  initialValue,
  onSave,
  onCancel,
  multiline = false,
}: InlineTextEditorProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSave = () => {
    onSave(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="inline-text-editor" onClick={(e) => e.stopPropagation()}>
      <div className="absolute -top-12 left-0 bg-white shadow-lg rounded-lg border border-gray-200 p-2 flex items-center gap-1 z-50">
        <button
          type="button"
          onClick={handleSave}
          className="p-1.5 bg-blue-500 text-white hover:bg-blue-600 rounded transition-colors"
          title="Save (Cmd+S)"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title="Cancel (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[100px] px-3 py-2 border-2 border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          style={{ fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 border-2 border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
        />
      )}

      <div className="text-xs text-gray-500 mt-1">
        Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> to save,{' '}
        <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> to cancel
      </div>
    </div>
  );
}
