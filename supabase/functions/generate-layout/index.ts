/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// deno-lint-ignore-file
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
// @ts-ignore
import * as turf from "npm:@turf/turf@7.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Coordinate {
  x: number;
  y: number;
}

interface GenerateLayoutRequest {
  title: string;
  descriptionType: "rectangular" | "irregular";
  length?: number;
  width?: number;
  technicalDescription?: string;
  coordinates?: Coordinate[];
  inputMode: "lot_size" | "number_of_lots";
  lotSize?: number;
  numberOfLots?: number;
  lotTitles?: string[];
}

// Use turf's Feature/Polygon types throughout
type TurfPolygon = turf.Feature<turf.Polygon>;

interface Lot {
  lotNumber: number;
  polygon: TurfPolygon;
  area: number;
}

function parseTechnicalDescription(description: string): Coordinate[] {
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

function coordinatesToGeoJSON(coordinates: Coordinate[]): TurfPolygon {
  const coords = coordinates.map(c => [c.x, c.y]);

  if (coords[0][0] !== coords[coords.length - 1][0] ||
      coords[0][1] !== coords[coords.length - 1][1]) {
    coords.push([...coords[0]]);
  }

  return turf.polygon([[...coords]]);
}



function calculateCartesianArea(polygon: TurfPolygon): number {
  const coords = polygon.geometry.coordinates[0];
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

// Clip a strip rectangle to the polygon boundary
// Cut a slice from the LEFT or BOTTOM of a polygon
// Clip a rectangle to the polygon
function clipRect(
  polygon: TurfPolygon,
  x1: number, y1: number,
  x2: number, y2: number
): TurfPolygon | null {
  const PAD = 0.001;
  const rect = turf.polygon([[
    [x1 + PAD, y1 + PAD],
    [x2 - PAD, y1 + PAD],
    [x2 - PAD, y2 - PAD],
    [x1 + PAD, y2 - PAD],
    [x1 + PAD, y1 + PAD]
  ]]);
  try {
    const clipped = turf.intersect(turf.featureCollection([polygon, rect]));
    if (clipped && clipped.geometry.type === 'Polygon') {
      const area = calculateCartesianArea(clipped as TurfPolygon);
      if (area > 0.01) return clipped as TurfPolygon;
    }
  } catch { /* skip */ }
  return null;
}

// Divide polygon into `count` equal-area lots using a 2D grid clipped to shape
function divideEqualParts(polygon: TurfPolygon, count: number): Lot[] {
  if (count <= 0) return [];
  if (count === 1) {
    return [{ lotNumber: 1, polygon, area: calculateCartesianArea(polygon) }];
  }

  const bbox = turf.bbox(polygon);
  const [minX, minY, maxX, maxY] = bbox;
  const width = maxX - minX;
  const height = maxY - minY;

  // Find best grid cols x rows where cols*rows = count
  let bestCols = count;
  let bestRows = 1;
  let bestScore = Infinity;
  for (let cols = 1; cols <= count; cols++) {
    if (count % cols !== 0) continue;
    const rows = count / cols;
    const score = Math.abs(Math.log((width / cols) / (height / rows)));
    if (score < bestScore) {
      bestScore = score;
      bestCols = cols;
      bestRows = rows;
    }
  }

  // If count is prime, use next even split
  if (bestCols === count && count > 1) {
    // For primes: use cols = ceil(sqrt(count)), rows = ceil(count/cols)
    const sqr = Math.ceil(Math.sqrt(count));
    bestCols = sqr;
    bestRows = Math.ceil(count / sqr);
  }

  const cellW = width / bestCols;
  const cellH = height / bestRows;
  const lots: Lot[] = [];
  let lotNumber = 1;

  for (let row = 0; row < bestRows && lots.length < count; row++) {
    for (let col = 0; col < bestCols && lots.length < count; col++) {
      const x1 = minX + col * cellW;
      const y1 = minY + row * cellH;
      const x2 = x1 + cellW;
      const y2 = y1 + cellH;

      const clipped = clipRect(polygon, x1, y1, x2, y2);
      if (clipped) {
        const area = calculateCartesianArea(clipped);
        lots.push({ lotNumber: lotNumber++, polygon: clipped, area });
      }
    }
  }

  return lots;
}

// For lot_size mode: calculate count from area and divide equally
function fillWithLotSize(polygon: TurfPolygon, targetLotSize: number): Lot[] {
  const totalArea = calculateCartesianArea(polygon);
  const count = Math.max(1, Math.min(10, Math.round(totalArea / targetLotSize)));
  return divideEqualParts(polygon, count);
}


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData = await req.json() as GenerateLayoutRequest;
    const {
      title,
      descriptionType,
      length,
      width,
      technicalDescription,
      coordinates,
      inputMode,
      lotSize,
      numberOfLots,
      lotTitles
    } = requestData;

    let polygon: TurfPolygon;
    let coords: Coordinate[] = [];

    if (descriptionType === "rectangular") {
      if (!length || !width) {
        throw new Error("Length and width are required for rectangular lots");
      }

      coords = [
        { x: 0, y: 0 },
        { x: length, y: 0 },
        { x: length, y: width },
        { x: 0, y: width },
        { x: 0, y: 0 }
      ];

      polygon = coordinatesToGeoJSON(coords);
    } else {
      if (coordinates && coordinates.length > 0) {
        coords = [...coordinates];
      } else if (technicalDescription) {
        coords = parseTechnicalDescription(technicalDescription);
      } else {
        throw new Error("Either coordinates or technical description is required for irregular lots");
      }

      const minX = Math.min(...coords.map(c => c.x));
      const minY = Math.min(...coords.map(c => c.y));
      coords = coords.map(c => ({ x: c.x - minX, y: c.y - minY }));

      // Validate we have enough points
      if (coords.length < 3) {
        throw new Error("At least 3 coordinates are required to form a polygon");
      }

      polygon = coordinatesToGeoJSON(coords);

      // Validate the polygon is not degenerate
      const testArea = calculateCartesianArea(polygon);
      if (testArea <= 0) {
        throw new Error("The provided coordinates do not form a valid polygon with area > 0");
      }
    }

    const totalArea = calculateCartesianArea(polygon);
    let lots: Lot[];
    let calculatedLotSize: number | undefined;
    let actualNumberOfLots: number;

    if (inputMode === "lot_size") {
      if (!lotSize) {
        throw new Error("Lot size is required when inputMode is 'lot_size'");
      }
      lots = fillWithLotSize(polygon, lotSize);
      actualNumberOfLots = lots.length;
    } else {
      if (!numberOfLots || numberOfLots < 1) {
        throw new Error("Number of lots must be at least 1 when inputMode is 'number_of_lots'");
      }
      if (numberOfLots > 10) {
        throw new Error("Number of lots cannot exceed 10");
      }
      lots = divideEqualParts(polygon, numberOfLots);
      calculatedLotSize = totalArea / lots.length;
      actualNumberOfLots = lots.length;
    }

    const { data: lotInputData, error: lotInputError } = await supabase
      .from("lot_input")
      .insert({
        title,
        description_type: descriptionType,
        length: descriptionType === "rectangular" ? length : null,
        width: descriptionType === "rectangular" ? width : null,
        input_mode: inputMode,
        lot_size: inputMode === "lot_size" ? lotSize : null,
        desired_number_of_lots: inputMode === "number_of_lots" ? numberOfLots : null,
        calculated_lot_size: calculatedLotSize || null,
        total_area: totalArea,
        number_of_lots: actualNumberOfLots
      })
      .select()
      .maybeSingle();

    if (lotInputError) throw lotInputError;

    const { error: polygonError } = await supabase
      .from("polygon_data")
      .insert({
        lot_input_id: lotInputData.id,
        geojson: polygon
      });

    if (polygonError) throw polygonError;

    const lotsToInsert = lots.map((lot, index) => ({
      lot_input_id: lotInputData.id,
      lot_number: lot.lotNumber,
      geojson: lot.polygon,
      area: lot.area,
      lot_title: lotTitles && lotTitles[index] ? lotTitles[index] : null
    }));

    if (lotsToInsert.length > 0) {
      const { error: lotsError } = await supabase
        .from("generated_lots")
        .insert(lotsToInsert);

      if (lotsError) throw lotsError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: lotInputData.id,
        totalArea,
        numberOfLots: actualNumberOfLots,
        calculatedLotSize: calculatedLotSize || (lots.length > 0 ? lots.reduce((sum, l) => sum + l.area, 0) / lots.length : 0),
        polygon,
        lots: lots.map(l => ({
          lotNumber: l.lotNumber,
          area: l.area,
          polygon: l.polygon
        })),
        coordinates: coords
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error message:", errorMessage);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage || "Unknown error occurred"
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});