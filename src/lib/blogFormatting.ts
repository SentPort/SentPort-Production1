/**
 * Blog post formatting utilities
 * Converts markdown-style formatting to HTML for display
 */

export interface FormattingRange {
  start: number;
  end: number;
  type: 'bold' | 'italic';
}

/**
 * Parse markdown-style formatting and convert to HTML
 * Supports:
 * - **bold text** -> <strong>bold text</strong>
 * - *italic text* -> <em>italic text</em>
 */
export function parseFormattedText(text: string): string {
  if (!text) return '';

  let result = text;

  // Handle bold: **text** -> <strong>text</strong>
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Handle italic: *text* -> <em>text</em>
  // Use negative lookbehind/lookahead to avoid matching ** from bold
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  return result;
}

/**
 * Insert formatting at cursor position in textarea
 */
export function insertFormatting(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  formatType: 'bold' | 'italic'
): { newText: string; newCursorStart: number; newCursorEnd: number } {
  const marker = formatType === 'bold' ? '**' : '*';
  const markerLength = marker.length;

  // Get selected text
  const selectedText = text.substring(selectionStart, selectionEnd);
  const before = text.substring(0, selectionStart);
  const after = text.substring(selectionEnd);

  // If text is selected, wrap it with formatting
  if (selectedText) {
    const formattedText = `${marker}${selectedText}${marker}`;
    const newText = before + formattedText + after;

    return {
      newText,
      newCursorStart: selectionStart + markerLength,
      newCursorEnd: selectionEnd + markerLength
    };
  }

  // If no text selected, insert markers and place cursor between them
  const newText = before + marker + marker + after;
  const newCursor = selectionStart + markerLength;

  return {
    newText,
    newCursorStart: newCursor,
    newCursorEnd: newCursor
  };
}

/**
 * Check if current selection is within formatting markers
 */
export function getFormattingAtCursor(
  text: string,
  cursorPosition: number
): { bold: boolean; italic: boolean } {
  const before = text.substring(0, cursorPosition);
  const after = text.substring(cursorPosition);

  // Simple check - count markers before and after cursor
  const boldBefore = (before.match(/\*\*/g) || []).length;
  const boldAfter = (after.match(/\*\*/g) || []).length;

  const italicBefore = (before.match(/(?<!\*)\*(?!\*)/g) || []).length;
  const italicAfter = (after.match(/(?<!\*)\*(?!\*)/g) || []).length;

  return {
    bold: boldBefore % 2 === 1,
    italic: italicBefore % 2 === 1
  };
}

/**
 * Remove formatting from selected text
 */
export function removeFormatting(
  text: string,
  selectionStart: number,
  selectionEnd: number
): { newText: string; newCursorStart: number; newCursorEnd: number } {
  const selectedText = text.substring(selectionStart, selectionEnd);
  const before = text.substring(0, selectionStart);
  const after = text.substring(selectionEnd);

  // Remove bold markers
  let cleaned = selectedText.replace(/\*\*/g, '');
  // Remove italic markers
  cleaned = cleaned.replace(/\*/g, '');

  const newText = before + cleaned + after;
  const lengthDiff = selectedText.length - cleaned.length;

  return {
    newText,
    newCursorStart: selectionStart,
    newCursorEnd: selectionEnd - lengthDiff
  };
}
