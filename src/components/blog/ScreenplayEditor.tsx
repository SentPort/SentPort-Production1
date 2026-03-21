import { useState, useRef, useEffect } from 'react';
import { Film, Type, MessageSquare, Move, ChevronRight, Info } from 'lucide-react';

interface ScreenplayEditorProps {
  value: string;
  onChange: (value: string) => void;
}

type FormatType = 'scene' | 'character' | 'dialogue' | 'parenthetical' | 'action' | 'transition';

interface FormatButton {
  type: FormatType;
  label: string;
  icon: typeof Film;
  description: string;
  example: string;
}

export default function ScreenplayEditor({ value, onChange }: ScreenplayEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showGuide, setShowGuide] = useState(false);

  const formatButtons: FormatButton[] = [
    {
      type: 'scene',
      label: 'Scene Heading',
      icon: Film,
      description: 'INT./EXT. location - time',
      example: 'INT. COFFEE SHOP - DAY'
    },
    {
      type: 'character',
      label: 'Character',
      icon: Type,
      description: 'Character name (all caps)',
      example: 'SARAH'
    },
    {
      type: 'dialogue',
      label: 'Dialogue',
      icon: MessageSquare,
      description: 'Character speech',
      example: "I can't believe you said that."
    },
    {
      type: 'parenthetical',
      label: 'Parenthetical',
      icon: Type,
      description: 'Action/emotion note',
      example: '(sarcastically)'
    },
    {
      type: 'action',
      label: 'Action',
      icon: Move,
      description: 'Scene description',
      example: 'Sarah slams her laptop shut and stands abruptly.'
    },
    {
      type: 'transition',
      label: 'Transition',
      icon: ChevronRight,
      description: 'Scene transition',
      example: 'CUT TO:'
    }
  ];

  const insertFormat = (type: FormatType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    let newText = '';
    let cursorOffset = 0;

    switch (type) {
      case 'scene':
        newText = selectedText || 'INT. LOCATION - DAY';
        newText = `\n\n${newText.toUpperCase()}\n\n`;
        cursorOffset = newText.length - 2;
        break;

      case 'character':
        newText = selectedText || 'CHARACTER NAME';
        newText = `\n\n${newText.toUpperCase()}\n`;
        cursorOffset = newText.length;
        break;

      case 'dialogue':
        newText = selectedText || 'Dialogue goes here.';
        newText = `${newText}\n`;
        cursorOffset = newText.length;
        break;

      case 'parenthetical':
        newText = selectedText || 'action';
        newText = `(${newText})\n`;
        cursorOffset = newText.length;
        break;

      case 'action':
        newText = selectedText || 'Describe the action happening in the scene.';
        newText = `\n\n${newText}\n\n`;
        cursorOffset = newText.length - 2;
        break;

      case 'transition':
        newText = selectedText || 'CUT TO';
        newText = `\n\n${newText.toUpperCase()}:\n\n`;
        cursorOffset = newText.length - 2;
        break;

      default:
        return;
    }

    const updatedValue = beforeText + newText + afterText;
    onChange(updatedValue);

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + cursorOffset;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const pageEstimate = Math.ceil(wordCount / 250);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          Screenplay Content *
        </label>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
        >
          <Info className="w-3 h-3" />
          {showGuide ? 'Hide' : 'Show'} Format Guide
        </button>
      </div>

      {showGuide && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-xs text-blue-300 space-y-2">
          <p className="font-semibold">Screenplay Formatting Quick Guide:</p>
          <ul className="space-y-1 ml-4">
            <li>• <strong>Scene Heading:</strong> INT./EXT. LOCATION - TIME (all caps)</li>
            <li>• <strong>Character:</strong> Character name in all caps before dialogue</li>
            <li>• <strong>Dialogue:</strong> What the character says</li>
            <li>• <strong>Parenthetical:</strong> (brief action or emotion) within dialogue</li>
            <li>• <strong>Action:</strong> Scene descriptions and what's happening</li>
            <li>• <strong>Transition:</strong> CUT TO:, FADE IN:, DISSOLVE TO:</li>
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-2">
        {formatButtons.map((button) => {
          const Icon = button.icon;
          return (
            <button
              key={button.type}
              type="button"
              onClick={() => insertFormat(button.type)}
              className="px-3 py-1.5 bg-slate-700/50 border border-slate-600 text-gray-300 rounded-lg hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-300 transition-all text-xs flex items-center gap-1.5"
              title={`${button.description}\nExample: ${button.example}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {button.label}
            </button>
          );
        })}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm leading-relaxed"
        rows={20}
        placeholder="FADE IN:

INT. YOUR LOCATION - DAY

Start writing your screenplay here...

Use the formatting buttons above to add scene headings, character names, dialogue, and action lines."
        required
      />

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{wordCount} words</span>
        <span>~{pageEstimate} {pageEstimate === 1 ? 'page' : 'pages'} (approx.)</span>
      </div>

      <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3 text-xs text-gray-400">
        <p className="mb-1 font-medium text-gray-300">Screenplay Tip:</p>
        <p>Professional screenplays average about 250 words per page. Use the formatting buttons to maintain proper screenplay structure. Readers expect INT./EXT. scene headings, character names in caps, and clear action lines.</p>
      </div>
    </div>
  );
}
