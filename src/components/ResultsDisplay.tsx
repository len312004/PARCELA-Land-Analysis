import { Download, FileText } from 'lucide-react';

interface Coordinate {
  x: number;
  y: number;
}

interface Lot {
  lotNumber: number;
  polygon: any;
  area: number;
}

interface ResultsDisplayProps {
  totalArea: number;
  lotSize?: number;
  numberOfLots: number;
  coordinates: Coordinate[];
  lots: Lot[];
  onExportJSON: () => void;
  onExportPDF: () => void;
  calculatedLotSize?: number;
}

export function ResultsDisplay({
  totalArea,
  lotSize,
  numberOfLots,
  coordinates,
  lots,
  onExportJSON,
  onExportPDF,
  calculatedLotSize
}: ResultsDisplayProps) {
  if (!totalArea) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-xl border-2 border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#7D1D1D] to-[#5A1515] px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Analysis Results</h2>
        <p className="text-gray-200 text-sm mt-1">Subdivision calculations and metrics</p>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border-2 border-blue-200 shadow-md">
            <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Total Area</p>
            <p className="text-3xl font-bold text-blue-900">
              {totalArea.toFixed(2)}
            </p>
            <p className="text-sm text-blue-700 font-medium mt-1">square meters</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border-2 border-green-200 shadow-md">
            <p className="text-xs font-semibold text-green-600 uppercase mb-2">
              {calculatedLotSize ? 'Calculated Lot Size' : 'Target Lot Size'}
            </p>
            <p className="text-3xl font-bold text-green-900">
              {(calculatedLotSize || lotSize || 0).toFixed(2)}
            </p>
            <p className="text-sm text-green-700 font-medium mt-1">square meters</p>
          </div>

          <div className="bg-gradient-to-br from-[#7D1D1D]/10 to-[#7D1D1D]/20 p-5 rounded-xl border-2 border-[#7D1D1D]/30 shadow-md col-span-2">
            <p className="text-xs font-semibold text-[#7D1D1D] uppercase mb-2">Lots Generated</p>
            <p className="text-4xl font-bold text-[#5A1515]">
              {numberOfLots}
            </p>
            <p className="text-sm text-[#7D1D1D] font-medium mt-1">subdivided parcels</p>
          </div>
        </div>

        <div className="border-t-2 border-gray-200 pt-5">
          <h3 className="font-bold text-gray-800 mb-3 text-lg">Individual Lot Details</h3>
          <div className="max-h-56 overflow-y-auto space-y-2 pr-2">
            {lots.map((lot, index) => (
              <div
                key={lot.lotNumber}
                className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-all"
              >
                <span className="font-bold text-gray-800 flex items-center gap-2">
                  <span className="bg-[#7D1D1D] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                    {lot.lotNumber}
                  </span>
                  Lot {lot.lotNumber}
                </span>
                <span className="text-sm font-semibold text-gray-700 bg-white px-3 py-1 rounded-full border border-gray-300">
                  {lot.area.toFixed(2)} m²
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onExportPDF}
            className="bg-[#7D1D1D] hover:bg-[#5A1515] text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileText className="mr-2 h-5 w-5" />
            <span className="text-base">Export PDF</span>
          </button>
          <button
            onClick={onExportJSON}
            className="bg-black hover:bg-gray-900 text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="mr-2 h-5 w-5" />
            <span className="text-base">Export JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
