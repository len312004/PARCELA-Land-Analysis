import { useState } from 'react';
import { InputForm, FormData } from './components/InputForm';
import { LeafletMap } from './components/LeafletMap';
import { ResultsDisplay } from './components/ResultsDisplay';
import { exportAsJSON, exportLeafletMapAsPNG, exportAsPDF } from './utils/exportUtils';

interface Coordinate {
  x: number;
  y: number;
}

interface Lot {
  lotNumber: number;
  polygon: unknown;
  area: number;
}

interface LayoutResult {
  id: string;
  totalArea: number;
  numberOfLots: number;
  polygon: unknown;
  lots: Lot[];
  coordinates: Coordinate[];
  calculatedLotSize?: number;
}

function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LayoutResult | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const handleGenerate = async (data: FormData) => {
    setLoading(true);

    // ── DEBUG: remove these 3 lines once working ──
    console.log('SUPABASE URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('ANON KEY set:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    // ─────────────────────────────────────────────

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          'Missing environment variables. Create a .env file in your project root with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.'
        );
      }

      const apiUrl = `${supabaseUrl}/functions/v1/generate-layout`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || 'Failed to generate layout');
      }

      setResult(responseData);
      setFormData(data);
    } catch (error) {
      console.error('Error generating layout:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate layout');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = () => {
    if (!result || !formData) return;
    exportAsJSON({
      title: formData.title,
      totalArea: result.totalArea,
      lotSize: formData.lotSize ?? 0,
      numberOfLots: result.numberOfLots,
      coordinates: result.coordinates,
      lots: result.lots,
      timestamp: new Date().toISOString(),
    });
  };

  const handleExportPNG = () => {
    const mapContainer = document.querySelector('.leaflet-container')?.parentElement;
    if (mapContainer) {
      exportLeafletMapAsPNG(mapContainer as HTMLElement);
    }
  };

  const handleExportPDF = () => {
    if (!result || !formData) return;
    const mapContainer = document.querySelector('.leaflet-container')?.parentElement;
    if (mapContainer) {
      exportAsPDF(
        {
          title: formData.title,
          totalArea: result.totalArea,
          lotSize: formData.lotSize || result.calculatedLotSize || 0,
          numberOfLots: result.numberOfLots,
          coordinates: result.coordinates,
          lots: result.lots,
          timestamp: new Date().toISOString(),
        },
        mapContainer as HTMLElement
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <header className="bg-gradient-to-r from-[#7D1D1D] to-[#5A1515] shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="PARCELA Logo" className="h-16 w-16 drop-shadow-lg" />
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">PARCELA</h1>
              <p className="text-sm text-gray-200 mt-1 font-medium">
                Partitioning and Allocation of Real-property using Computational Engine for Land Analysis
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <InputForm onGenerate={handleGenerate} loading={loading} />
            {result && (
              <ResultsDisplay
                totalArea={result.totalArea}
                lotSize={formData?.lotSize}
                numberOfLots={result.numberOfLots}
                coordinates={result.coordinates}
                lots={result.lots}
                onExportJSON={handleExportJSON}
                onExportPDF={handleExportPDF}
                calculatedLotSize={result.calculatedLotSize}
              />
            )}
          </div>
          <div className="lg:col-span-3">
            <LeafletMap
              coordinates={result?.coordinates || []}
              lots={result?.lots || []}
              onExportPNG={result ? handleExportPNG : undefined}
              lotTitles={formData?.lotTitles}
            />
          </div>
        </div>
      </main>

      <footer className="mt-16 py-8 bg-gradient-to-r from-[#7D1D1D] to-[#5A1515] border-t-4 border-black">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-white font-semibold text-lg">PARCELA - Land Partitioning Analysis System</p>
          <p className="mt-2 text-gray-200 text-sm">For conceptual planning purposes only</p>
          <p className="mt-3 text-gray-300 text-xs">© 2026 PARCELA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;