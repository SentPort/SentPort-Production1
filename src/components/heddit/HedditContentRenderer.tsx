import { useNavigate } from 'react-router-dom';

interface HedditContentRendererProps {
  content: string;
  className?: string;
}

export default function HedditContentRenderer({ content, className = '' }: HedditContentRendererProps) {
  const navigate = useNavigate();

  const renderContent = () => {
    let rendered = content;

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
    if (target.tagName === 'A' && target.hasAttribute('data-mention-type')) {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href) {
        navigate(href);
      }
    }
  };

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: renderContent() }}
      onClick={handleClick}
    />
  );
}
