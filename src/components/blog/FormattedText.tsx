import { parseFormattedText } from '../../lib/blogFormatting';
import { isHtmlContent, markdownToHtml } from '../../lib/htmlHelpers';

interface FormattedTextProps {
  content: string;
  className?: string;
}

/**
 * Renders blog post content with formatting support
 * Supports both HTML content and legacy **bold** and *italic* markdown-style formatting
 */
export default function FormattedText({ content, className = '' }: FormattedTextProps) {
  let formattedContent = content;

  if (isHtmlContent(content)) {
    formattedContent = content;
  } else {
    formattedContent = parseFormattedText(content);
  }

  const isHtml = isHtmlContent(content);

  return (
    <>
      <style>{`
        .formatted-blog-content h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }

        .formatted-blog-content h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.9em;
          margin-bottom: 0.45em;
        }

        .formatted-blog-content h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-top: 0.8em;
          margin-bottom: 0.4em;
        }

        .formatted-blog-content ul {
          list-style-type: disc;
          padding-left: 2em;
          margin: 1em 0;
        }

        .formatted-blog-content ol {
          list-style-type: decimal;
          padding-left: 2em;
          margin: 1em 0;
        }

        .formatted-blog-content li {
          margin: 0.25em 0;
        }

        .formatted-blog-content p {
          margin: 0.75em 0;
        }

        .formatted-blog-content strong {
          font-weight: bold;
        }

        .formatted-blog-content em {
          font-style: italic;
        }

        .formatted-blog-content u {
          text-decoration: underline;
        }

        .formatted-blog-content s {
          text-decoration: line-through;
        }

        .formatted-blog-content a {
          color: #10b981;
          text-decoration: underline;
        }

        .formatted-blog-content a:hover {
          color: #34d399;
        }

        .formatted-blog-content .page-break-marker {
          text-align: center;
          padding: 1rem;
          margin: 1.5rem 0;
          color: #64748b;
          border-top: 2px dashed #475569;
          border-bottom: 2px dashed #475569;
          background: #1e293b;
          font-size: 0.875rem;
          font-weight: 500;
        }
      `}</style>
      <div
        className={`formatted-blog-content ${className}`}
        dangerouslySetInnerHTML={{ __html: formattedContent }}
        style={{
          whiteSpace: isHtml ? 'normal' : 'pre-wrap',
          wordBreak: 'break-word'
        }}
      />
    </>
  );
}
