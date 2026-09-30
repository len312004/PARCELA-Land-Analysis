import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Coordinate {
  x: number;
  y: number;
}

interface InputFormProps {
  onGenerate: (data: FormData) => Promise<void>;
  loading: boolean;
}

export interface FormData {
  title: string;
  descriptionType: 'rectangular' | 'irregular';
  length?: number;
  width?: number;
  technicalDescription?: string;
  coordinates?: Coordinate[];
  inputMode: 'lot_size' | 'number_of_lots';
  lotSize?: number;
  numberOfLots?: number;
  lotTitles?: string[];
}

export function InputForm({ onGenerate, loading }: InputFormProps) {
  const [title, setTitle] = useState('');
  const [descriptionType, setDescriptionType] = useState<'rectangular' | 'irregular'>('rectangular');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [technicalDescription, setTechnicalDescription] = useState('');
  const [coordinatesText, setCoordinatesText] = useState('');
  const [irregularInputMethod, setIrregularInputMethod] = useState<'sides' | 'coordinates' | 'technical'>('sides');
  const [numberOfSides, setNumberOfSides] = useState('');
  const [polygonRadius, setPolygonRadius] = useState('');
  const [inputMode, setInputMode] = useState<'lot_size' | 'number_of_lots'>('lot_size');
  const [lotSize, setLotSize] = useState('');
  const [numberOfLots, setNumberOfLots] = useState('');
  const [lotTitlesInput, setLotTitlesInput] = useState('');
  const [lotTitlesFile, setLotTitlesFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData: FormData = {
      title,
      descriptionType,
      inputMode
    };

    if (inputMode === 'lot_size') {
      if (!lotSize) {
        alert('Please enter lot size');
        return;
      }
      formData.lotSize = parseFloat(lotSize);
    } else {
      if (!numberOfLots) {
        alert('Please enter number of lots');
        return;
      }
      formData.numberOfLots = parseInt(numberOfLots);
    }

    let lotTitles: string[] = [];
    if (lotTitlesFile) {
      try {
        const fileText = await lotTitlesFile.text();
        lotTitles = fileText
          .split(/[\n,]/)
          .map(t => t.trim())
          .filter(t => t.length > 0);
      } catch {
        alert('Error reading file. Please try again.');
        return;
      }
    } else if (lotTitlesInput.trim()) {
      lotTitles = lotTitlesInput
        .split(/[\n,]/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
    }

    if (lotTitles.length > 0) {
      formData.lotTitles = lotTitles;
    }

    if (descriptionType === 'rectangular') {
      formData.length = parseFloat(length);
      formData.width = parseFloat(width);
    } else {
      if (irregularInputMethod === 'sides') {
        const sides = parseInt(numberOfSides);
        const radius = parseFloat(polygonRadius);

        if (!sides || sides < 3) {
          alert('Number of sides must be at least 3');
          return;
        }
        if (!radius || radius <= 0) {
          alert('Please enter a valid radius');
          return;
        }

        // Generate regular polygon coordinates
        const coords: Coordinate[] = [];
        for (let i = 0; i < sides; i++) {
          const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
          coords.push({
            x: parseFloat((radius * Math.cos(angle)).toFixed(4)),
            y: parseFloat((radius * Math.sin(angle)).toFixed(4))
          });
        }
        formData.coordinates = coords;

      } else if (irregularInputMethod === 'coordinates' && coordinatesText.trim()) {
        try {
          const coords = coordinatesText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
              // Handle formats: "60, 20" or "(60, 20)" or "60 20"
              const cleaned = line.replace(/[()]/g, '').trim();
              const parts = cleaned.split(/[\s,]+/).map(v => parseFloat(v.trim()));
              if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
                throw new Error(`Invalid line: "${line}" — use format: x, y`);
              }
              return { x: parts[0], y: parts[1] };
            });

          if (coords.length < 3) {
            alert('Please enter at least 3 coordinate points to form a polygon');
            return;
          }

          formData.coordinates = coords;
        } catch (error) {
          alert(
            `Invalid coordinate format.\n\nUse one coordinate per line:\n0, 0\n50, 0\n50, 40\n0, 40\n\n${error instanceof Error ? error.message : ''}`
          );
          return;
        }

      } else if (irregularInputMethod === 'technical' && technicalDescription.trim()) {
        formData.technicalDescription = technicalDescription;
      } else {
        alert('Please provide the required information for the selected input method');
        return;
      }
    }

    await onGenerate(formData);
  };

  return (
    <div className="bg-white rounded-xl shadow-xl border-2 border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#7D1D1D] to-[#5A1515] px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Lot Input Form</h2>
        <p className="text-gray-200 text-sm mt-1">Enter parcel details to generate subdivision layout</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Parcel Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D1D1D] focus:border-transparent transition-all"
            placeholder="e.g., Residential Lot A"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Parcel Shape
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDescriptionType('rectangular')}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                descriptionType === 'rectangular'
                  ? 'bg-[#7D1D1D] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rectangular
            </button>
            <button
              type="button"
              onClick={() => setDescriptionType('irregular')}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                descriptionType === 'irregular'
                  ? 'bg-[#7D1D1D] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Irregular
            </button>
          </div>
        </div>

        {descriptionType === 'rectangular' ? (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Dimensions</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Length (m)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D1D1D] focus:border-transparent transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Width (m)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D1D1D] focus:border-transparent transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Parcel Boundaries</p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIrregularInputMethod('sides')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                  irregularInputMethod === 'sides'
                    ? 'bg-[#7D1D1D] text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                By Sides
              </button>
              <button
                type="button"
                onClick={() => setIrregularInputMethod('coordinates')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                  irregularInputMethod === 'coordinates'
                    ? 'bg-[#7D1D1D] text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Coordinates
              </button>
              <button
                type="button"
                onClick={() => setIrregularInputMethod('technical')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                  irregularInputMethod === 'technical'
                    ? 'bg-[#7D1D1D] text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Technical
              </button>
            </div>

            {irregularInputMethod === 'sides' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Number of Sides
                  </label>
                  <input
                    type="number"
                    min="3"
                    step="1"
                    value={numberOfSides}
                    onChange={(e) => setNumberOfSides(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D1D1D] focus:border-transparent transition-all"
                    placeholder="e.g., 5 for pentagon, 6 for hexagon"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Radius (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={polygonRadius}
                    onChange={(e) => setPolygonRadius(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D1D1D] focus:border-transparent transition-all"
                    placeholder="Distance from center to vertex"
                  />
                </div>
              </div>
            )}

            {irregularInputMethod === 'technical' && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Technical Description
                </label>
                <textarea
                  value={technicalDescription}
                  onChange={(e) => setTechnicalDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D1D1D] focus:border-transparent font-mono text-sm transition-all"
                  rows={3}
                  placeholder="N 30 E 50m, S 60 E 40m..."
                />
              </div>
            )}

            {irregularInputMethod === 'coordinates' && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Manual Coordinates (x, y per line)
                </label>
                <textarea
                  value={coordinatesText}
                  onChange={(e) => setCoordinatesText(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D1D1D] focus:border-transparent font-mono text-sm transition-all"
                  rows={5}
                  placeholder={`0, 0\n50, 0\n60, 20\n40, 40\n0, 40`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter one coordinate per line as: x, y — minimum 3 points required
                </p>
              </div>
            )}
          </div>
        )}

        <div className="border-t-2 border-gray-200 pt-5">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Subdivision Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setInputMode('lot_size')}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                inputMode === 'lot_size'
                  ? 'bg-[#7D1D1D] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              By Lot Size
            </button>
            <button
              type="button"
              onClick={() => setInputMode('number_of_lots')}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                inputMode === 'number_of_lots'
                  ? 'bg-[#7D1D1D] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              By Count
            </button>
          </div>
        </div>

        {inputMode === 'lot_size' ? (
          <div className="bg-[#7D1D1D]/5 p-4 rounded-lg border-2 border-[#7D1D1D]/20">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Target Lot Size (m²)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D1D1D] focus:border-transparent transition-all text-lg font-semibold"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              System will calculate the number of lots
            </p>
          </div>
        ) : (
          <div className="bg-[#7D1D1D]/5 p-4 rounded-lg border-2 border-[#7D1D1D]/20">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Desired Number of Lots
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="10"
              value={numberOfLots}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (e.target.value === "") {
                  setNumberOfLots("");
                } else if (!isNaN(val)) {
                  setNumberOfLots(String(Math.min(10, Math.max(1, val))));
                }
              }}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D1D1D] focus:border-transparent transition-all text-lg font-semibold"
              placeholder="1 - 10"
            />
            <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              System will calculate the lot size (maximum 10 lots)
            </p>
          </div>
        )}

        <div className="border-t-2 border-gray-200 pt-5 mt-5">
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            Custom Lot Titles (Optional)
          </label>
          <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200 mb-3">
            <p className="text-sm text-green-900">
              Upload a file or manually enter lot names to assign custom titles to your parcels
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Upload File (CSV or TXT)
              </label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={(e) => setLotTitlesFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D1D1D] focus:border-transparent"
              />
              <p className="text-xs text-gray-600 mt-1">
                File should contain one lot name per line or comma-separated
              </p>
            </div>

            <div className="text-center text-gray-500 font-semibold">OR</div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Manual Entry
              </label>
              <textarea
                value={lotTitlesInput}
                onChange={(e) => setLotTitlesInput(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D1D1D] focus:border-transparent"
                placeholder={`Lot 1\nLot 2\nBlock A\nParcel 3B`}
              />
              <p className="text-xs text-gray-600 mt-1">
                Enter lot names separated by new lines or commas. Examples: Lot 1, Block A, Parcel 3B
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#7D1D1D] to-[#5A1515] hover:from-[#5A1515] hover:to-[#7D1D1D] text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-3 h-6 w-6" />
              <span className="text-lg">Generating Layout...</span>
            </>
          ) : (
            <span className="text-lg">Generate Subdivision Layout</span>
          )}
        </button>
      </form>
    </div>
  );
}