interface StatusBadgeProps {
  running: boolean;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ running, size = 'md' }: StatusBadgeProps) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`
          ${dotSize} rounded-full
          ${running ? 'bg-green-500 animate-pulse-dot' : 'bg-red-400'}
        `}
      />
      <span
        className={`
          ${textSize} font-medium
          ${running ? 'text-green-700' : 'text-red-600'}
        `}
      >
        {running ? '运行中' : '已停止'}
      </span>
    </span>
  );
}
