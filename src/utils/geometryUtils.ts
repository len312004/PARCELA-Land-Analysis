import * as turf from '@turf/turf';

export interface Coordinate {
  x: number;
  y: number;
}

export interface TechnicalDescriptionSegment {
  direction: string;
  distance: number;
}

export function parseTechnicalDescription(description: string): Coordinate[] {
  const segments = description.split(',').map(s => s.trim());
  const coordinates: Coordinate[] = [{ x: 0, y: 0 }];

  let currentX = 0;
  let currentY = 0;

  for (const segment of segments) {
    const match = segment.match(/([NSEW\s]+)\s+([\d.]+)\s*m?/i);

    if (!match) continue;

    const direction = match[1].trim().toUpperCase();
    const distance = parseFloat(match[2]);

    const angle = directionToAngle(direction);
    const deltaX = distance * Math.sin(angle * Math.PI / 180);
    const deltaY = distance * Math.cos(angle * Math.PI / 180);

    currentX += deltaX;
    currentY += deltaY;

    coordinates.push({ x: currentX, y: currentY });
  }

  return coordinates;
}

function directionToAngle(direction: string): number {
  const dirMap: Record<string, number> = {
    'N': 0,
    'NE': 45,
    'E': 90,
    'SE': 135,
    'S': 180,
    'SW': 225,
    'W': 270,
    'NW': 315
  };

  direction = direction.replace(/\s+/g, '');

  if (dirMap[direction] !== undefined) {
    return dirMap[direction];
  }

  const match = direction.match(/([NS])(\d+)([EW])/);
  if (match) {
    const [, ns, degrees, ew] = match;
    const angle = parseFloat(degrees);

    if (ns === 'N' && ew === 'E') return angle;
    if (ns === 'S' && ew === 'E') return 180 - angle;
    if (ns === 'S' && ew === 'W') return 180 + angle;
    if (ns === 'N' && ew === 'W') return 360 - angle;
  }

  return 0;
}

export function createRectangularPolygon(length: number, width: number): Coordinate[] {
  return [
    { x: 0, y: 0 },
    { x: length, y: 0 },
    { x: length, y: width },
    { x: 0, y: width },
    { x: 0, y: 0 }
  ];
}

export function coordinatesToGeoJSON(coordinates: Coordinate[]): turf.Feature<turf.Polygon> {
  const coords = coordinates.map(c => [c.x, c.y]);

  if (coords[0][0] !== coords[coords.length - 1][0] ||
      coords[0][1] !== coords[coords.length - 1][1]) {
    coords.push(coords[0]);
  }

  return turf.polygon([[...coords]]);
}

export function calculateArea(polygon: turf.Feature<turf.Polygon>): number {
  return turf.area(polygon);
}

export function getBoundingBox(polygon: turf.Feature<turf.Polygon>) {
  const bbox = turf.bbox(polygon);
  return {
    minX: bbox[0],
    minY: bbox[1],
    maxX: bbox[2],
    maxY: bbox[3],
    width: bbox[2] - bbox[0],
    height: bbox[3] - bbox[1]
  };
}

export function normalizeCoordinates(coordinates: Coordinate[]): Coordinate[] {
  if (coordinates.length === 0) return [];

  const minX = Math.min(...coordinates.map(c => c.x));
  const minY = Math.min(...coordinates.map(c => c.y));

  return coordinates.map(c => ({
    x: c.x - minX,
    y: c.y - minY
  }));
}
