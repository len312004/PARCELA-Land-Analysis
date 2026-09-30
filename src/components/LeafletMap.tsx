import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Coordinate {
  x: number;
  y: number;
}

interface Lot {
  lotNumber: number;
  polygon: { geometry: { coordinates: number[][][] } };
  area: number;
}

interface LeafletMapProps {
  coordinates: Coordinate[];
  lots: Lot[];
  onExportPNG?: () => void;
  lotTitles?: string[];
}

interface LotDetails {
  lotNumber: number;
  area: number;
  perimeter: number;
  vertices: Coordinate[];
}

// Shoelace formula — correct area for ANY polygon shape
function calcPolygonArea(coords: number[][]): number {
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    area += coords[i][0] * coords[i + 1][1];
    area -= coords[i + 1][0] * coords[i][1];
  }
  return Math.abs(area / 2);
}

// Perimeter from vertex distances
function calcPolygonPerimeter(coords: number[][]): number {
  let perimeter = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1][0] - coords[i][0];
    const dy = coords[i + 1][1] - coords[i][1];
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

export function LeafletMap({ coordinates, lots, onExportPNG, lotTitles }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedLot, setSelectedLot] = useState<LotDetails | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || coordinates.length === 0) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
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

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const metersToLatitude = (meters: number) => meters / 111320;
    const metersToLongitude = (meters: number) => meters / 111320;

    const baseLatitude = 0;
    const baseLongitude = 0;

    const mapCenterLat = baseLatitude + metersToLatitude(centerY);
    const mapCenterLng = baseLongitude + metersToLongitude(centerX);

    const map = L.map(mapContainerRef.current, {
      center: [mapCenterLat, mapCenterLng],
      zoom: 18,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 10
    }).addTo(map);

    const convertToLatLng = (x: number, y: number) => {
      const lat = baseLatitude + metersToLatitude(y);
      const lng = baseLongitude + metersToLongitude(x);
      return L.latLng(lat, lng);
    };

    const boundaryLatLngs = coordinates.map(coord => convertToLatLng(coord.x, coord.y));

    L.polygon(boundaryLatLngs, {
      color: '#1F2937',
      weight: 4,
      fill: false,
      opacity: 1
    }).addTo(map).bindPopup('<strong>Original Parcel Boundary</strong>');

    const bounds = L.latLngBounds(boundaryLatLngs);
    map.fitBounds(bounds, { padding: [50, 50] });

    const colors = [
      '#FEE2E2', '#DBEAFE', '#D1FAE5', '#FEF3C7', '#E0E7FF',
      '#FCE7F3', '#FED7AA', '#D1D5DB', '#FBCFE8', '#BFDBFE'
    ];

    lots.forEach((lot, index) => {
      const lotCoords: number[][] = lot.polygon.geometry.coordinates[0];
      const lotLatLngs = lotCoords.map((coord: number[]) => convertToLatLng(coord[0], coord[1]));

      // Always recalculate area from actual polygon coords (fixes irregular shape areas)
      const trueArea = calcPolygonArea(lotCoords);
      const truePerimeter = calcPolygonPerimeter(lotCoords);

      const polygon = L.polygon(lotLatLngs, {
        color: '#6B7280',
        weight: 2,
        fillColor: colors[index % colors.length],
        fillOpacity: 0.7
      }).addTo(map);

      polygon.on('mouseover', () => {
        polygon.setStyle({ color: '#7D1D1D', weight: 3, fillOpacity: 0.9 });
      });

      polygon.on('mouseout', () => {
        polygon.setStyle({ color: '#6B7280', weight: 2, fillOpacity: 0.7 });
      });

      polygon.on('click', () => {
        const vertices = lotCoords.map((coord: number[]) => ({ x: coord[0], y: coord[1] }));
        setSelectedLot({
          lotNumber: lot.lotNumber,
          area: trueArea,
          perimeter: truePerimeter,
          vertices
        });
      });

      // Centroid for label placement
      const centroid = lotCoords.slice(0, -1).reduce(
        (acc: { x: number; y: number }, coord: number[]) => ({
          x: acc.x + coord[0],
          y: acc.y + coord[1]
        }),
        { x: 0, y: 0 }
      );
      const n = lotCoords.length - 1;
      centroid.x /= n;
      centroid.y /= n;

      const markerLatLng = convertToLatLng(centroid.x, centroid.y);

      // Lot number circle
      const lotLabel = lotTitles && lotTitles[index] ? lotTitles[index] : `${lot.lotNumber}`;
      const divIcon = L.divIcon({
        html: `<div style="
          background: white;
          border: 2px solid #7D1D1D;
          border-radius: 50%;
          min-width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: bold;
          color: #7D1D1D;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          padding: 0 8px;
          white-space: nowrap;
        ">${lotLabel}</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(markerLatLng, { icon: divIcon }).addTo(map);
      marker.on('click', () => {
        const vertices = lotCoords.map((coord: number[]) => ({ x: coord[0], y: coord[1] }));
        setSelectedLot({
          lotNumber: lot.lotNumber,
          area: trueArea,
          perimeter: truePerimeter,
          vertices
        });
      });

      // Area label below the number circle
      const areaIcon = L.divIcon({
        html: `<div style="
          background: rgba(125, 29, 29, 0.95);
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          border: 1px solid white;
        ">${trueArea.toFixed(2)} m²</div>`,
        className: '',
        iconSize: [60, 20],
        iconAnchor: [30, -8]
      });

      L.marker(markerLatLng, { icon: areaIcon }).addTo(map);
    });

    // Vertex markers
    coordinates.forEach((coord, i) => {
      const latLng = convertToLatLng(coord.x, coord.y);
      L.circleMarker(latLng, {
        radius: 6,
        color: 'white',
        weight: 3,
        fillColor: '#EF4444',
        fillOpacity: 1
      }).addTo(map).bindPopup(
        `<strong>Vertex ${i + 1}</strong><br>Coordinates: (${coord.x.toFixed(2)}, ${coord.y.toFixed(2)}) m`
      );
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [coordinates, lots, lotTitles]);

  if (!coordinates || coordinates.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-xl border-2 border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-[#7D1D1D] to-[#5A1515] px-6 py-4">
          <h2 className="text-2xl font-bold text-white">Layout Visualization</h2>
          <p className="text-gray-200 text-sm mt-1">Interactive map view of subdivision</p>
        </div>
        <div className="p-8 flex items-center justify-center h-[600px] bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-200">
              <p className="text-gray-600 text-lg font-medium mb-2">No Layout Generated</p>
              <p className="text-gray-500 text-sm">Complete the input form and click generate to view visualization</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xl border-2 border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#7D1D1D] to-[#5A1515] px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Layout Visualization</h2>
          <p className="text-gray-200 text-sm mt-1">Interactive map view of subdivision</p>
        </div>
        {onExportPNG && (
          <button
            onClick={onExportPNG}
            className="bg-white hover:bg-gray-100 text-[#7D1D1D] font-bold py-3 px-5 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Export PNG
          </button>
        )}
      </div>

      <div className="p-6">
        <div className="relative">
          <div
            ref={mapContainerRef}
            className="border-4 border-gray-200 rounded-xl overflow-hidden shadow-inner"
            style={{ height: '600px', width: '100%' }}
          />

          {selectedLot && (
            <div className="absolute top-4 right-4 bg-white rounded-xl shadow-2xl border-2 border-[#7D1D1D] p-5 max-w-xs z-[1000]">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-[#7D1D1D]">Lot {selectedLot.lotNumber}</h3>
                <button
                  onClick={() => setSelectedLot(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Total Area</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedLot.area.toFixed(2)} m²</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Perimeter</p>
                  <p className="text-lg font-bold text-gray-900">{selectedLot.perimeter.toFixed(2)} m</p>
                </div>

                <div className="border-t-2 border-gray-200 pt-3">
                  <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Vertices</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedLot.vertices.slice(0, -1).map((vertex, idx) => (
                      <div key={idx} className="flex justify-between text-xs bg-gray-50 p-2 rounded border border-gray-200">
                        <span className="font-semibold text-gray-600">Point {idx + 1}:</span>
                        <span className="font-mono text-gray-800">({vertex.x.toFixed(2)}, {vertex.y.toFixed(2)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
          <p className="text-sm text-blue-900 flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>Interactive Map:</strong> The subdivision is overlaid on OpenStreetMap. Zoom and pan to explore. Hover over lots to highlight them, or click on lot numbers to view detailed information. Red vertices mark parcel boundaries.
            </span>
          </p>
        </div>

        <div className="mt-3 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg">
          <p className="text-sm text-yellow-900 flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>Disclaimer:</strong> This system generates conceptual lot partitioning only and is not intended for engineering or legal subdivision planning. Professional surveying is required for official use.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}