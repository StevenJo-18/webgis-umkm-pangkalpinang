import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Compass } from 'lucide-react';
import { getCategoryColor } from '../lib/format';
import type { Category, UmkmSummary } from '../types';

export const PANGKALPINANG_CENTER: [number, number] = [-2.1316, 106.1169];
export const PANGKALPINANG_ZOOM = 13;

interface UmkmMapProps {
  umkmList?: UmkmSummary[];
  categories?: Category[];
  selectedId?: number | null;
  onSelectUmkm?: (umkmId: number) => void;
  pickerMode?: boolean;
  pickerCoords?: { latitude: number; longitude: number } | null;
  onPickLocation?: (latitude: number, longitude: number) => void;
  className?: string;
}

function createPinIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 36 : 28;
  const strokeWidth = isSelected ? 3 : 2;
  const html = `
    <div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;transform:translate(-50%,-100%);">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 6px rgba(15,23,42,0.28));">
        <path d="M12 2C7.58172 2 4 5.58172 4 10C4 15.25 12 22 12 22C12 22 20 15.25 20 10C20 5.58172 16.4183 2 12 2Z" fill="${color}" stroke="#FFFFFF" stroke-width="${strokeWidth}"/>
        <circle cx="12" cy="10" r="3" fill="#FFFFFF"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    className: 'umkm-marker-icon',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -size],
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function UmkmMap({
  umkmList = [],
  categories = [],
  selectedId = null,
  onSelectUmkm,
  pickerMode = false,
  pickerCoords = null,
  onPickLocation,
  className = 'h-full w-full',
}: UmkmMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onSelectUmkm);
  const onPickRef = useRef(onPickLocation);

  onSelectRef.current = onSelectUmkm;
  onPickRef.current = onPickLocation;

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      pickerMode && pickerCoords
        ? [pickerCoords.latitude, pickerCoords.longitude]
        : PANGKALPINANG_CENTER;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: pickerMode ? 14 : PANGKALPINANG_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = layerGroup;

    if (pickerMode) {
      map.on('click', (evt: L.LeafletMouseEvent) => {
        const lat = Number(evt.latlng.lat.toFixed(6));
        const lng = Number(evt.latlng.lng.toFixed(6));
        onPickRef.current?.(lat, lng);
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      pickerMarkerRef.current = null;
    };
  }, [pickerMode]);

  // Render Explorer Markers
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer || pickerMode) return;

    layer.clearLayers();

    for (const item of umkmList) {
      const isSelected = item.umkm_id === selectedId;
      const color = getCategoryColor(item.category_name);
      const marker = L.marker([item.latitude, item.longitude], {
        icon: createPinIcon(color, isSelected),
        zIndexOffset: isSelected ? 500 : 0,
      });

      const ratingText =
        item.average_rating !== null
          ? `${item.average_rating.toFixed(1)} (${item.total_reviews} ulasan)`
          : 'Belum ada ulasan';

      const popupDiv = document.createElement('div');
      popupDiv.className = 'p-3.5 text-slate-900';
      popupDiv.innerHTML = `
        <div class="text-xs font-medium text-slate-500 mb-1">${escapeHtml(item.category_name)}</div>
        <div class="font-semibold text-sm text-slate-900 leading-snug mb-1">${escapeHtml(item.business_name)}</div>
        <div class="text-xs text-slate-600 mb-2">${escapeHtml(item.address)}</div>
        <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <span class="text-xs font-mono text-slate-700">${escapeHtml(ratingText)}</span>
          <button type="button" data-umkm-open="${item.umkm_id}" class="text-xs font-semibold text-[#163B65] hover:text-[#0F2E52] cursor-pointer">
            Lihat Detail
          </button>
        </div>
      `;

      const openBtn = popupDiv.querySelector(`[data-umkm-open="${item.umkm_id}"]`);
      openBtn?.addEventListener('click', () => {
        onSelectRef.current?.(item.umkm_id);
      });

      marker.bindPopup(popupDiv);
      marker.on('click', () => {
        onSelectRef.current?.(item.umkm_id);
      });

      marker.addTo(layer);
    }
  }, [umkmList, selectedId, pickerMode]);

  // Smoothly focus selected marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || pickerMode || selectedId === null) return;
    const target = umkmList.find((u) => u.umkm_id === selectedId);
    if (target) {
      map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 15), {
        duration: 0.35,
      });
    }
  }, [selectedId, umkmList, pickerMode]);

  // Render Picker Marker (Admin form)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pickerMode || !pickerCoords) return;

    const latLng: [number, number] = [pickerCoords.latitude, pickerCoords.longitude];
    if (!pickerMarkerRef.current) {
      const marker = L.marker(latLng, {
        icon: createPinIcon('#163B65', true),
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onPickRef.current?.(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
      });
      pickerMarkerRef.current = marker;
    } else {
      pickerMarkerRef.current.setLatLng(latLng);
    }
  }, [pickerMode, pickerCoords]);

  const handleResetView = () => {
    mapRef.current?.flyTo(PANGKALPINANG_CENTER, PANGKALPINANG_ZOOM, { duration: 0.35 });
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={containerRef} className="w-full h-full z-0" />

      {!pickerMode && (
        <>
          <button
            type="button"
            onClick={handleResetView}
            title="Pusatkan peta ke Kota Pangkalpinang"
            className="absolute top-3 right-3 z-[400] inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#163B65]" aria-hidden="true" />
            <span>Pusat Pangkalpinang</span>
          </button>

          {categories.length > 0 && (
            <div className="hidden sm:flex items-center flex-wrap gap-x-4 gap-y-1.5 absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-xs text-slate-700">
              {categories.map((cat) => (
                <div key={cat.category_id} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(cat.category_name) }}
                    aria-hidden="true"
                  />
                  <span>{cat.category_name}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
