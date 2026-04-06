import { useNavigate } from 'react-router-dom';

interface HuBookContentRendererProps {
  content: string;
  className?: string;
}

export default function HuBookContentRenderer({
  content,
  className = ''
}: HuBookContentRendererProps) {
  const navigate = useNavigate();

  const renderContent = () => {
    return content.replace(
      /@\[([^\]]+)\]\(([^)]+)\)/g,
      (match, displayName, userId) => {
        return `<a href="/hubook/profile/${userId}" data-mention-user-id="${userId}" class="text-blue-600 font-semibold hover:underline cursor-pointer">@${displayName}</a>`;
      }
    );
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && target.hasAttribute('data-mention-user-id')) {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href) {
        navigate(href);
      }
    }
  };

  return (
    <div
      className={`whitespace-pre-wrap break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: renderContent() }}
      onClick={handleClick}
    />
  );
}
