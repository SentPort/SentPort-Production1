interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  title: string;
}

export default function PieChart({ data, title }: PieChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No data available</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const slices = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const sliceAngle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += sliceAngle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (currentAngle - 90) * (Math.PI / 180);

    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);

    const largeArcFlag = sliceAngle > 180 ? 1 : 0;

    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return {
      ...item,
      pathData,
      percentage: percentage.toFixed(1)
    };
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-6">{title}</h3>
      <div className="flex items-center justify-between gap-8">
        <div className="flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-48 h-48">
            {slices.map((slice, index) => (
              <path
                key={index}
                d={slice.pathData}
                fill={slice.color}
                stroke="white"
                strokeWidth="1"
              />
            ))}
          </svg>
        </div>
        <div className="flex-1 space-y-3">
          {slices.map((slice, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-sm text-gray-700">{slice.label}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {slice.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
