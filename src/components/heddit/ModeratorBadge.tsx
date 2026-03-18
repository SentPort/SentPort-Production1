import { Shield, Crown } from 'lucide-react';

interface ModeratorBadgeProps {
  role: 'creator' | 'moderator';
  size?: 'sm' | 'md';
}

export default function ModeratorBadge({ role, size = 'sm' }: ModeratorBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  const iconSize = size === 'sm' ? 12 : 14;

  if (role === 'creator') {
    return (
      <span className={`inline-flex items-center gap-1 ${sizeClasses} bg-yellow-100 text-yellow-800 rounded font-semibold`}>
        <Crown size={iconSize} className="fill-yellow-600" />
        Creator
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${sizeClasses} bg-orange-100 text-orange-800 rounded font-semibold`}>
      <Shield size={iconSize} />
      Mod
    </span>
  );
}
