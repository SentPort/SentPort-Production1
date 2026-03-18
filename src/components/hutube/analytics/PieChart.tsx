interface PieDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieDataPoint[];
  size?: number;
  showLegend?: boolean;
  formatValue?: (value: number) => string;
}

export default function PieChart({
  data,
  size = 300,
  showLegend = true,
  formatValue = (v) => v.toLocaleString()
}: PieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-lg" style={{ width: size, height: size }}>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ef4444', '#06b6d4'];

  let currentAngle = -90;
  const slices = data.map((item, i) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (currentAngle * Math.PI) / 180;

    const x1 = 150 + 120 * Math.cos(startRad);
    const y1 = 150 + 120 * Math.sin(startRad);
    const x2 = 150 + 120 * Math.cos(endRad);
    const y2 = 150 + 120 * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = `M 150 150 L ${x1} ${y1} A 120 120 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return {
      path,
      color: item.color || colors[i % colors.length],
      label: item.label,
      value: item.value,
      percentage: percentage.toFixed(1)
    };
  });

  return (
    <div className="flex items-center gap-8">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 300 300" className="w-full h-full">
          {slices.map((slice, i) => (
            <g key={i}>
              <path
                d={slice.path}
                fill={slice.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <title>{`${slice.label}: ${formatValue(slice.value)} (${slice.percentage}%)`}</title>
              </path>
            </g>
          ))}
          <circle cx="150" cy="150" r="60" fill="white" />
          <text x="150" y="145" textAnchor="middle" className="text-2xl font-bold fill-gray-800">
            {data.length}
          </text>
          <text x="150" y="165" textAnchor="middle" className="text-xs fill-gray-500">
            sources
          </text>
        </svg>
      </div>

      {showLegend && (
        <div className="flex-1 space-y-2">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: slice.color }}
              />
              <div className="flex-1 flex items-center justify-between gap-2">
                <span className="text-sm text-gray-700">{slice.label}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatValue(slice.value)} ({slice.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
