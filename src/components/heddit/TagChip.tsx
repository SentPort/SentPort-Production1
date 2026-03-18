import { Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TagChipProps {
  tag: string;
  onClick?: () => void;
  size?: 'sm' | 'md';
  clickable?: boolean;
}

export function TagChip({ tag, onClick, size = 'sm', clickable = true }: TagChipProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else if (clickable) {
      navigate(`/heddit/tag/${encodeURIComponent(tag)}`);
    }
  };

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-3 py-1 text-sm';

  return (
    <button
      onClick={handleClick}
      disabled={!clickable && !onClick}
      className={`inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full ${sizeClasses} ${
        clickable || onClick
          ? 'hover:bg-gray-200 cursor-pointer transition-colors'
          : 'cursor-default'
      }`}
    >
      <Tag className="w-3 h-3" />
      <span>{tag}</span>
    </button>
  );
}
