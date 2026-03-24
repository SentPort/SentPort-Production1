import { parseFormattedText } from '../../lib/blogFormatting';

interface FormattedTextProps {
  content: string;
  className?: string;
}

/**
 * Renders blog post content with formatting support
 * Supports **bold** and *italic* markdown-style formatting
 */
export default function FormattedText({ content, className = '' }: FormattedTextProps) {
  const formattedContent = parseFormattedText(content);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: formattedContent }}
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}
    />
  );
}
