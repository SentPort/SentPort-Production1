import { useMemo } from 'react';

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  showDots?: boolean;
  formatValue?: (value: number) => string;
  formatLabel?: (date: string) => string;
}

export default function LineChart({
  data,
  height = 300,
  color = '#3b82f6',
  showGrid = true,
  showDots = true,
  formatValue = (v) => v.toLocaleString(),
  formatLabel = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}: LineChartProps) {
  const { points, maxValue, minValue, yAxisLabels } = useMemo(() => {
    if (data.length === 0) {
      return { points: '', maxValue: 0, minValue: 0, yAxisLabels: [] };
    }

    const values = data.map(d => d.value);
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    const padding = 40;
    const chartHeight = height - 60;
    const chartWidth = 800 - 80;

    const pointsArray = data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - ((d.value - min) / range) * chartHeight;
      return `${x},${y}`;
    });

    const yLabels = [max, max * 0.75, max * 0.5, max * 0.25, 0].map(v => Math.round(v));

    return {
      points: pointsArray.join(' '),
      maxValue: max,
      minValue: min,
      yAxisLabels: yLabels
    };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-lg" style={{ height }}>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const padding = 40;
  const chartHeight = height - 60;
  const chartWidth = 800 - 80;

  return (
    <div className="relative">
      <svg viewBox="0 0 800 300" className="w-full" style={{ height }}>
        {showGrid && yAxisLabels.map((label, i) => {
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
                {formatValue(label)}
              </text>
            </g>
          );
        })}

        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {showDots && data.map((d, i) => {
          const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
          const y = padding + chartHeight - ((d.value - minValue) / (maxValue - minValue || 1)) * chartHeight;
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="4"
                fill={color}
                className="hover:r-6 transition-all cursor-pointer"
              />
              <title>{`${formatLabel(d.date)}: ${formatValue(d.value)}`}</title>
            </g>
          );
        })}

        {data.length <= 30 && data.map((d, i) => {
          if (i % Math.ceil(data.length / 7) !== 0 && i !== data.length - 1) return null;
          const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
          return (
            <text
              key={i}
              x={x}
              y={height - 20}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {formatLabel(d.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
