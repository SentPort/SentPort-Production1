interface LineChartProps {
  data: { label: string; value: number }[];
  title: string;
  color?: string;
}

export default function LineChart({ data, title, color = '#3B82F6' }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const chartHeight = 200;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-6">{title}</h3>
      <div className="relative" style={{ height: chartHeight + 40 }}>
        <svg width="100%" height={chartHeight + 40} className="overflow-visible">
          <g>
            {data.map((point, i) => {
              const x = (i / (data.length - 1 || 1)) * 100;
              const y = chartHeight - (point.value / maxValue) * chartHeight;
              const nextPoint = data[i + 1];

              return (
                <g key={i}>
                  {nextPoint && (
                    <line
                      x1={`${x}%`}
                      y1={y}
                      x2={`${((i + 1) / (data.length - 1)) * 100}%`}
                      y2={chartHeight - (nextPoint.value / maxValue) * chartHeight}
                      stroke={color}
                      strokeWidth="2"
                    />
                  )}
                  <circle
                    cx={`${x}%`}
                    cy={y}
                    r="4"
                    fill={color}
                  />
                  <text
                    x={`${x}%`}
                    y={chartHeight + 20}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                  >
                    {point.label}
                  </text>
                  <text
                    x={`${x}%`}
                    y={y - 10}
                    textAnchor="middle"
                    className="text-xs fill-gray-700 font-medium"
                  >
                    {point.value}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
