interface LineChartProps {
  data: { date: string; value: number }[];
  color?: string;
  height?: number;
}

export default function LineChart({ data, color = '#3b82f6', height = 200 }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available for the selected period
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const width = 800;
  const padding = 40;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - (d.value / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * chartWidth;
          const y = padding + chartHeight - (d.value / maxValue) * chartHeight;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill={color}
            />
          );
        })}
        <line
          x1={padding}
          y1={padding + chartHeight}
          x2={width - padding}
          y2={padding + chartHeight}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i, arr) => {
          const index = data.indexOf(d);
          const x = padding + (index / (data.length - 1)) * chartWidth;
          return (
            <text
              key={i}
              x={x}
              y={height - 10}
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
            >
              {formatDate(d.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
