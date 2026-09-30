import * as turf from '@turf/turf';

export interface LotResult {
  lotNumber: number;
  polygon: turf.Feature<turf.Polygon>;
  area: number;
}

function calculateCartesianArea(polygon: turf.Feature<turf.Polygon>): number {
  const coords = polygon.geometry.coordinates[0];
  let area = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area / 2);
}

export function partitionLots(
  polygon: turf.Feature<turf.Polygon>,
  lotSize: number
): LotResult[] {
  const totalArea = calculateCartesianArea(polygon);
  const bbox = turf.bbox(polygon);

  const [minX, minY, maxX, maxY] = bbox;
  const width = maxX - minX;
  const height = maxY - minY;

  const gridSize = Math.sqrt(lotSize);
  const cols = Math.max(1, Math.floor(width / gridSize));
  const rows = Math.max(1, Math.floor(height / gridSize));

  const exactLotWidth = width / cols;
  const exactLotHeight = height / rows;

  const lots: LotResult[] = [];
  let lotNumber = 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x1 = minX + col * exactLotWidth;
      const y1 = minY + row * exactLotHeight;
      const x2 = x1 + exactLotWidth;
      const y2 = y1 + exactLotHeight;

      const cellPolygon = turf.polygon([[
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
        [x1, y1]
      ]]);

      try {
        const intersection = turf.intersect(
          turf.featureCollection([polygon, cellPolygon])
        );

        if (intersection && intersection.geometry.type === 'Polygon') {
          const intersectionArea = calculateCartesianArea(intersection as turf.Feature<turf.Polygon>);
          const cellArea = exactLotWidth * exactLotHeight;

          if (intersectionArea > cellArea * 0.95) {
            lots.push({
              lotNumber: lotNumber++,
              polygon: cellPolygon,
              area: cellArea
            });
          }
        }
      } catch (error) {
        console.warn('Error processing cell:', error);
      }
    }
  }

  return lots;
}

export function partitionRectangularLots(
  length: number,
  width: number,
  lotSize: number
): LotResult[] {
  const polygon = turf.polygon([[
    [0, 0],
    [length, 0],
    [length, width],
    [0, width],
    [0, 0]
  ]]);

  return partitionLots(polygon, lotSize);
}
