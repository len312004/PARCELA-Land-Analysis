import { useRef, useEffect } from 'react';

interface Coordinate {
  x: number;
  y: number;
}

interface Lot {
  lotNumber: number;
  polygon: any;
  area: number;
}

interface PolygonVisualizationProps {
  coordinates: Coordinate[];
  lots: Lot[];
  onExportPNG?: () => void;
}

export function PolygonVisualization({ coordinates, lots, onExportPNG }: PolygonVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  if (!coordinates || coordinates.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg shadow-md p-8 flex items-center justify-center h-[600px]">
        <p className="text-gray-500 text-lg">Generate a layout to see visualization</p>
      </div>
    );
  }

  const allPoints = [...coordinates];
  lots.forEach(lot => {
    const coords = lot.polygon.geometry.coordinates[0];
    coords.forEach((coord: number[]) => {
      allPoints.push({ x: coord[0], y: coord[1] });
    });
  });

  const minX = Math.min(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const maxY = Math.max(...allPoints.map(p => p.y));

  const width = maxX - minX;
  const height = maxY - minY;

  const padding = 40;
  const svgWidth = 800;
  const svgHeight = 600;
  const scale = Math.min(
    (svgWidth - 2 * padding) / width,
    (svgHeight - 2 * padding) / height
  );

  const transformX = (x: number) => (x - minX) * scale + padding;
  const transformY = (y: number) => svgHeight - ((y - minY) * scale + padding);

  const boundaryPath = coordinates
    .map((coord, i) => {
      const x = transformX(coord.x);
      const y = transformY(coord.y);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ') + ' Z';

  const colors = [
    '#FEE2E2', '#DBEAFE', '#D1FAE5', '#FEF3C7', '#E0E7FF',
    '#FCE7F3', '#FED7AA', '#D1D5DB', '#FBCFE8', '#BFDBFE'
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Layout Visualization</h2>
        {onExportPNG && (
          <button
            onClick={onExportPNG}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
          >
            Export PNG
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        className="border border-gray-300 rounded"
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5" />
          </pattern>
        </defs>

        <rect width={svgWidth} height={svgHeight} fill="url(#grid)" />

        <path
          d={boundaryPath}
          fill="none"
          stroke="#1F2937"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {lots.map((lot, index) => {
          const lotCoords = lot.polygon.geometry.coordinates[0];
          const lotPath = lotCoords
            .map((coord: number[], i: number) => {
              const x = transformX(coord[0]);
              const y = transformY(coord[1]);
              return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
            })
            .join(' ') + ' Z';

          const centroid = lotCoords.reduce(
            (acc: { x: number; y: number }, coord: number[]) => ({
              x: acc.x + coord[0],
              y: acc.y + coord[1]
            }),
            { x: 0, y: 0 }
          );
          centroid.x /= lotCoords.length;
          centroid.y /= lotCoords.length;

          return (
            <g key={lot.lotNumber}>
              <path
                d={lotPath}
                fill={colors[index % colors.length]}
                stroke="#6B7280"
                strokeWidth="1"
                opacity="0.7"
              />
              <text
                x={transformX(centroid.x)}
                y={transformY(centroid.y)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-semibold"
                fill="#374151"
              >
                {lot.lotNumber}
              </text>
            </g>
          );
        })}

        {coordinates.map((coord, i) => (
          <circle
            key={i}
            cx={transformX(coord.x)}
            cy={transformY(coord.y)}
            r="4"
            fill="#EF4444"
            stroke="white"
            strokeWidth="2"
          />
        ))}
      </svg>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This system generates conceptual lot partitioning only and is not
          intended for engineering or legal subdivision planning.
        </p>
      </div>
    </div>
  );
}
