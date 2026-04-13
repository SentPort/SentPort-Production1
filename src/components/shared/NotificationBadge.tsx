interface NotificationBadgeProps {
  label: string | null;
}

export default function NotificationBadge({ label }: NotificationBadgeProps) {
  if (!label) return null;

  return (
    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none pointer-events-none">
      {label}
    </span>
  );
}
