interface HeatmapProps {
  data: number[][];
  rowLabels: string[];
  columnLabels: string[];
  formatValue?: (value: number) => string;
  title?: string;
}

export default function Heatmap({
  data,
  rowLabels,
  columnLabels,
  formatValue = (v) => v.toLocaleString(),
  title = 'Activity Heatmap'
}: HeatmapProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-lg h-64">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.flat(), 1);

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity === 0) return '#f3f4f6';
    if (intensity < 0.2) return '#dbeafe';
    if (intensity < 0.4) return '#bfdbfe';
    if (intensity < 0.6) return '#93c5fd';
    if (intensity < 0.8) return '#60a5fa';
    return '#3b82f6';
  };

  return (
    <div className="bg-white rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex">
            <div className="w-20 flex-shrink-0"></div>
            <div className="flex-1 flex">
              {columnLabels.map((label, i) => (
                <div
                  key={i}
                  className="flex-1 text-center text-xs font-medium text-gray-600 pb-2"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {data.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center">
              <div className="w-20 flex-shrink-0 text-xs font-medium text-gray-600 pr-2 text-right">
                {rowLabels[rowIndex]}
              </div>
              <div className="flex-1 flex gap-1">
                {row.map((value, colIndex) => (
                  <div
                    key={colIndex}
                    className="flex-1 aspect-square rounded flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all group relative"
                    style={{ backgroundColor: getColor(value) }}
                    title={`${rowLabels[rowIndex]} ${columnLabels[colIndex]}: ${formatValue(value)}`}
                  >
                    <span className="text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100">
                      {value > 0 ? formatValue(value) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-xs text-gray-600">Less</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded"
            style={{ backgroundColor: getColor(intensity * maxValue) }}
          />
        ))}
        <span className="text-xs text-gray-600">More</span>
      </div>
    </div>
  );
}
