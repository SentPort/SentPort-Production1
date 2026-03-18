interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDataPoint[];
  height?: number;
  horizontal?: boolean;
  formatValue?: (value: number) => string;
  showValues?: boolean;
}

export default function BarChart({
  data,
  height = 300,
  horizontal = false,
  formatValue = (v) => v.toLocaleString(),
  showValues = true
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-lg" style={{ height }}>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

  if (horizontal) {
    return (
      <div className="space-y-3" style={{ height }}>
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-32 text-sm text-gray-700 truncate" title={item.label}>
              {item.label}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end px-3 text-white text-sm font-medium transition-all duration-500"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color || colors[i % colors.length]
                  }}
                >
                  {showValues && item.value > 0 && (
                    <span className="whitespace-nowrap">{formatValue(item.value)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end justify-around gap-2 px-4" style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="relative w-full flex items-end justify-center" style={{ height: height - 60 }}>
            <div
              className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer"
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color || colors[i % colors.length]
              }}
              title={`${item.label}: ${formatValue(item.value)}`}
            >
              {showValues && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-sm font-medium text-gray-700 whitespace-nowrap">
                  {formatValue(item.value)}
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-600 text-center truncate w-full" title={item.label}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
