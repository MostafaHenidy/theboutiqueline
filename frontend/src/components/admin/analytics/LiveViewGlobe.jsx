import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { Search, Plus, Minus, RotateCcw } from 'lucide-react';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const DEFAULT_CENTER = [30, 24];
const DEFAULT_ZOOM = 1.15;

export default function LiveViewGlobe({ visitors = [], orders = [], ar }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 640, h: 420 });
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState({ coordinates: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setSize({
        w: Math.max(280, Math.floor(width)),
        h: Math.max(280, Math.floor(height)),
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const q = search.trim().toLowerCase();
  const filteredVisitors = useMemo(
    () => (q ? visitors.filter((m) => m.label?.toLowerCase().includes(q)) : visitors),
    [visitors, q],
  );
  const filteredOrders = useMemo(
    () => (q ? orders.filter((m) => m.label?.toLowerCase().includes(q)) : orders),
    [orders, q],
  );

  const handleMoveEnd = useCallback(({ coordinates, zoom }) => {
    setPosition({ coordinates, zoom });
  }, []);

  const zoomIn = () => setPosition((p) => ({ ...p, zoom: Math.min(p.zoom * 1.35, 8) }));
  const zoomOut = () => setPosition((p) => ({ ...p, zoom: Math.max(p.zoom / 1.35, 0.6) }));
  const resetView = () => setPosition({ coordinates: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });

  const scale = Math.max(size.w / 6.2, size.h / 3.4);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[360px] sm:min-h-[420px] bg-[#c8dff0] rounded-xl overflow-hidden border border-[#b8d4e8]"
    >
      <div className="absolute top-3 start-3 end-3 z-20 flex items-center gap-2 pointer-events-none">
        <div className="relative flex-1 max-w-xs pointer-events-auto">
          <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[#616161]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ar ? 'بحث عن موقع' : 'Search location'}
            className="w-full h-8 ps-8 pe-3 text-xs border border-[#c9cccf] rounded-lg bg-white/95 text-[#303030] focus:outline-none focus:border-[#005bd3]"
          />
        </div>
        <button
          type="button"
          onClick={resetView}
          className="p-1.5 rounded-lg bg-white/90 border border-[#c9cccf] text-[#616161] pointer-events-auto hover:bg-white"
          aria-label={ar ? 'إعادة تعيين' : 'Reset view'}
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <ComposableMap
        width={size.w}
        height={size.h}
        projection="geoMercator"
        projectionConfig={{ scale, center: [0, 12] }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
          filterZoomEvent={(evt) => evt.type !== 'wheel' || evt.ctrlKey}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#f1f5f9"
                  stroke="#94a3b8"
                  strokeWidth={0.35}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#e2e8f0', outline: 'none', cursor: 'grab' },
                    pressed: { outline: 'none', cursor: 'grabbing' },
                  }}
                />
              ))
            }
          </Geographies>

          {filteredOrders.map((m, i) => (
            <Marker key={`o-${m.orderNumber || i}`} coordinates={[m.lng, m.lat]}>
              <g transform="translate(-5,-5)">
                <rect width={10} height={10} fill="#8051ff" stroke="#fff" strokeWidth={1.5} transform="rotate(45 5 5)" />
              </g>
              <title>{m.label}</title>
            </Marker>
          ))}

          {filteredVisitors.map((m, i) => (
            <Marker key={`v-${m.sessionId || i}-${m.label}`} coordinates={[m.lng, m.lat]}>
              <circle r={5} fill="#2c6ecb" stroke="#fff" strokeWidth={2} className="animate-pulse" />
              <title>{m.label}</title>
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {filteredVisitors.length === 0 && filteredOrders.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-10">
          <p className="text-xs text-[#616161] bg-white/80 px-3 py-1.5 rounded-lg">
            {ar ? 'ستظهر النقاط عند زيارة المتجر' : 'Markers appear when visitors browse your store'}
          </p>
        </div>
      )}

      <div className="absolute bottom-16 end-3 z-20 flex flex-col rounded-lg overflow-hidden border border-[#c9cccf] bg-white/95 shadow-sm">
        <button type="button" onClick={zoomIn} className="p-2 hover:bg-[#f6f6f7] text-[#303030] border-b border-[#e3e3e3]" aria-label="Zoom in">
          <Plus size={16} />
        </button>
        <button type="button" onClick={zoomOut} className="p-2 hover:bg-[#f6f6f7] text-[#303030]" aria-label="Zoom out">
          <Minus size={16} />
        </button>
      </div>

      <div className="absolute bottom-3 end-3 z-20 flex flex-col gap-1.5 text-xs text-[#303030] bg-white/90 rounded-lg px-3 py-2 border border-[#e3e3e3]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#8051ff] rotate-45" />
          <span>{ar ? 'الطلبات' : 'Orders'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2c6ecb]" />
          <span>{ar ? 'الزوار الآن' : 'Visitors right now'}</span>
        </div>
      </div>
    </div>
  );
}
