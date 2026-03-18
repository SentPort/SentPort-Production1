import { Video as LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  formatValue?: (value: number | string) => string;
  subtitle?: string;
}

export default function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-blue-600',
  formatValue,
  subtitle
}: MetricCardProps) {
  const displayValue = formatValue ? formatValue(value) : value;
  const isPositive = change !== undefined && change >= 0;
  const hasChange = change !== undefined && change !== 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{displayValue}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {hasChange && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-sm font-medium ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500">vs previous period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-opacity-10 ${iconColor.replace('text-', 'bg-')}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
