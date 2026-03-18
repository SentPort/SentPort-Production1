interface RetentionDataPoint {
  timestamp: number;
  percentage: number;
}

interface RetentionGraphProps {
  data: RetentionDataPoint[];
  duration: number;
  height?: number;
}

export default function RetentionGraph({ data, duration, height = 300 }: RetentionGraphProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-lg" style={{ height }}>
        <p className="text-gray-500">No retention data available</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const padding = 60;
  const chartHeight = height - 80;
  const chartWidth = 800 - 100;

  const points = data.map((d, i) => {
    const x = padding + (d.timestamp / duration) * chartWidth;
    const y = padding + chartHeight - (d.percentage / 100) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${padding + chartHeight} ${points} ${padding + chartWidth},${padding + chartHeight}`;

  const yAxisLabels = [100, 75, 50, 25, 0];
  const xAxisLabels = [0, duration * 0.25, duration * 0.5, duration * 0.75, duration];

  return (
    <div className="relative">
      <svg viewBox="0 0 800 300" className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="retentionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {yAxisLabels.map((label, i) => {
          const y = padding + (i / (yAxisLabels.length - 1)) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={padding + chartWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {label}%
              </text>
            </g>
          );
        })}

        <polygon
          points={areaPoints}
          fill="url(#retentionGradient)"
        />

        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {xAxisLabels.map((seconds, i) => {
          const x = padding + (seconds / duration) * chartWidth;
          return (
            <g key={i}>
              <line
                x1={x}
                y1={padding + chartHeight}
                x2={x}
                y2={padding + chartHeight + 5}
                stroke="#9ca3af"
                strokeWidth="1"
              />
              <text
                x={x}
                y={padding + chartHeight + 20}
                textAnchor="middle"
                className="text-xs fill-gray-500"
              >
                {formatTime(Math.round(seconds))}
              </text>
            </g>
          );
        })}

        <text
          x={padding + chartWidth / 2}
          y={height - 5}
          textAnchor="middle"
          className="text-xs fill-gray-600 font-medium"
        >
          Video Duration
        </text>

        <text
          x={20}
          y={padding + chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90, 20, ${padding + chartHeight / 2})`}
          className="text-xs fill-gray-600 font-medium"
        >
          Audience Retention
        </text>
      </svg>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="text-blue-600 text-sm font-medium">
            Average Percentage Viewed: {(data.reduce((sum, d) => sum + d.percentage, 0) / data.length).toFixed(1)}%
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          This graph shows the percentage of viewers still watching at each point in your video.
        </p>
      </div>
    </div>
  );
}
