import { useNavigate } from 'react-router-dom';

interface HedditContentRendererProps {
  content: string;
  className?: string;
  hasRichFormatting?: boolean;
}

export default function HedditContentRenderer({
  content,
  className = '',
  hasRichFormatting = false
}: HedditContentRendererProps) {
  const navigate = useNavigate();

  const sanitizeHtml = (html: string): string => {
    // Basic HTML sanitization to prevent XSS
    const temp = document.createElement('div');
    temp.textContent = html;
    let sanitized = temp.innerHTML;

    // Allow safe HTML tags for rich text
    const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h1', 'h2', 'h3',
                         'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a'];

    // If content appears to be HTML (contains tags), parse and sanitize it
    if (html.includes('<') && html.includes('>')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Remove script tags and event handlers
      const scripts = doc.querySelectorAll('script');
      scripts.forEach(script => script.remove());

      // Remove dangerous attributes
      const allElements = doc.querySelectorAll('*');
      allElements.forEach(el => {
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('on') || attr.name === 'javascript:') {
            el.removeAttribute(attr.name);
          }
        });

        // Remove elements not in allowed list
        if (!allowedTags.includes(el.tagName.toLowerCase()) && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
          el.replaceWith(...Array.from(el.childNodes));
        }
      });

      sanitized = doc.body.innerHTML;
    }

    return sanitized;
  };

  const renderContent = () => {
    let rendered = hasRichFormatting ? sanitizeHtml(content) : content;

    // Render community mentions as clickable links
    rendered = rendered.replace(
      /@\[h\/([^\]]+)\]\(([^)]+)\)/g,
      (match, communityName) => {
        return `<a href="/heddit/h/${communityName}" data-mention-type="community" class="text-orange-600 font-semibold hover:underline cursor-pointer">@h/${communityName}</a>`;
      }
    );

    // Render user mentions as clickable links
    rendered = rendered.replace(
      /@\[([^\]]+)\]\(([^)]+)\)/g,
      (match, username) => {
        return `<a href="/heddit/user/${username}" data-mention-type="user" class="text-blue-600 font-semibold hover:underline cursor-pointer">@${username}</a>`;
      }
    );

    return rendered;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      if (target.hasAttribute('data-mention-type')) {
        e.preventDefault();
        const href = target.getAttribute('href');
        if (href) {
          navigate(href);
        }
      }
    }
  };

  // For rich text content, add prose styling
  const finalClassName = hasRichFormatting
    ? `${className} prose prose-sm max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-l-orange-500`
    : className;

  return (
    <div
      className={finalClassName}
      dangerouslySetInnerHTML={{ __html: renderContent() }}
      onClick={handleClick}
    />
  );
}
