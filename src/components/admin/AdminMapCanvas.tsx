import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import maplibregl, { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
import type { AdminCouplePlace } from '../../types/shared';
import { PLACE_CATEGORY_META } from '../couple-map/placeCategoryMeta';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewport {
  center: LatLng;
  zoom: number;
  bounds: MapBounds;
}

export interface CameraCommand {
  center: LatLng;
  zoom: number;
  nonce: number;
}

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

interface AdminMapCanvasProps {
  initialCenter: LatLng;
  cameraCommand: CameraCommand | null;
  places: AdminCouplePlace[];
  selected?: AdminCouplePlace | null;
  onSelect: (place: AdminCouplePlace) => void;
  onViewportChange: (viewport: MapViewport) => void;
}

export default function AdminMapCanvas({
  initialCenter,
  cameraCommand,
  places,
  selected,
  onSelect,
  onViewportChange,
}: AdminMapCanvasProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, MapLibreMarker>>(new Map());
  const [ready, setReady] = useState(false);

  const onViewportChangeRef = useRef(onViewportChange);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
    onSelectRef.current = onSelect;
  }, [onViewportChange, onSelect]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapEl.current,
      style: OPENFREEMAP_STYLE,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 14,
      pitch: 58,
      bearing: 28,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      addBuildingExtrusions(map);
      setReady(true);
      onViewportChangeRef.current(viewportFromMap(map));
    });

    const handleMoveEnd = () => onViewportChangeRef.current(viewportFromMap(map));
    map.on('moveend', handleMoveEnd);

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !cameraCommand) return;
    mapRef.current.flyTo({
      center: [cameraCommand.center.lng, cameraCommand.center.lat],
      zoom: cameraCommand.zoom,
      pitch: 58,
      bearing: 28,
      speed: 1.15,
      curve: 1.35,
      essential: true,
    });
  }, [ready, cameraCommand?.nonce]);

  // 3. Render Status Markers
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const nextKeys = new Set(places.map(adminPlaceKey));
    markersRef.current.forEach((marker, key) => {
      if (!nextKeys.has(key)) {
        marker.remove();
        markersRef.current.delete(key);
      }
    });

    places.forEach((place) => {
      if (!isValidLatLng(place.location)) return;

      const active = !!selected && selected._id === place._id;
      const hasReports = (place.reportCount ?? 0) > 0;
      const key = adminPlaceKey(place);
      let marker = markersRef.current.get(key);
      const element = marker?.getElement() ?? document.createElement('button');
      element.setAttribute('type', 'button');

      const categoryMeta = PLACE_CATEGORY_META[place.category] ?? PLACE_CATEGORY_META.OTHER;
      const badge = statusBadgeMeta(place, hasReports);

      element.style.cursor = 'pointer';
      element.style.background = 'transparent';
      element.style.border = '0';
      element.style.padding = '0';
      element.style.zIndex = active ? '20' : '5';
      element.title = place.name;
      element.innerHTML = adminMarkerHtml(
        categoryMeta.color,
        categoryMeta.Icon,
        place.name,
        badge,
        active,
      );

      element.onclick = (event) => {
        event.stopPropagation();
        onSelectRef.current(place);
      };

      if (!marker) {
        marker = new maplibregl.Marker({ element, anchor: 'bottom' })
          .setLngLat([place.location.lng, place.location.lat])
          .addTo(mapRef.current!);
        markersRef.current.set(key, marker);
      } else {
        marker.setLngLat([place.location.lng, place.location.lat]);
      }
    });
  }, [ready, places, selected?._id]);

  return <div ref={mapEl} className="h-full w-full animate-fade-in" />;
}

function adminMarkerHtml(
  color: string,
  Icon: (typeof PLACE_CATEGORY_META)[keyof typeof PLACE_CATEGORY_META]['Icon'],
  name: string,
  badge: ReturnType<typeof statusBadgeMeta>,
  active: boolean,
) {
  const safeName = escapeHtml(name);
  const safeStatus = escapeHtml(badge.label);
  const size = active ? 46 : 40;
  const icon = renderToStaticMarkup(<Icon size={18} color={color} weight="fill" />);
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;transform:scale(${active ? 1.14 : 1});transition:transform .18s ease">
      <div style="display:flex;align-items:center;gap:6px;max-width:190px;border:1px solid ${color}44;border-radius:999px;background:rgba(255,255,255,.94);padding:5px 8px;box-shadow:0 10px 24px rgba(15,23,42,.16);font:800 11px/1.2 sans-serif;color:#0f172a;backdrop-filter:blur(10px)">
        <span style="max-width:125px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${safeName}</span>
        <span style="display:inline-flex;align-items:center;border-radius:999px;border:1px solid ${badge.border};background:${badge.background};color:${badge.color};padding:2px 6px;font-size:9px;font-weight:900;white-space:nowrap">${safeStatus}</span>
      </div>
      <div style="position:relative;width:${size}px;height:${size}px">
        <div style="position:absolute;inset:0;border-radius:50% 50% 50% 0;background:${color};border:3px solid ${badge.ring};box-shadow:0 14px 28px ${color}55;transform:rotate(-45deg)">
          <span style="position:absolute;inset:9px;border-radius:999px;background:white;color:${color};display:flex;align-items:center;justify-content:center;transform:rotate(45deg)">${icon}</span>
        </div>
      </div>
    </div>`;
}

function statusBadgeMeta(place: AdminCouplePlace, hasReports: boolean) {
  if (hasReports) {
    return {
      label: `${place.reportCount ?? 0} report`,
      color: '#be123c',
      background: 'rgba(255,241,242,.96)',
      border: 'rgba(244,63,94,.38)',
      ring: '#f43f5e',
    };
  }
  if (place.visibility === 'COUPLE_PRIVATE' || place.metadataOnly) {
    return {
      label: 'Private',
      color: '#92400e',
      background: 'rgba(254,243,199,.96)',
      border: 'rgba(245,158,11,.38)',
      ring: '#f59e0b',
    };
  }
  if (place.status === 'HIDDEN') {
    return {
      label: 'Ẩn',
      color: '#475569',
      background: 'rgba(241,245,249,.96)',
      border: 'rgba(148,163,184,.5)',
      ring: '#94a3b8',
    };
  }
  if (place.status === 'ARCHIVED') {
    return {
      label: 'Lưu trữ',
      color: '#334155',
      background: 'rgba(226,232,240,.96)',
      border: 'rgba(100,116,139,.5)',
      ring: '#64748b',
    };
  }
  return {
    label: 'Public',
    color: '#047857',
    background: 'rgba(236,253,245,.96)',
    border: 'rgba(16,185,129,.38)',
    ring: '#10b981',
  };
}

function adminPlaceKey(place: AdminCouplePlace) {
  return place._id ? `hi-${place._id}` : `${place.name}-${place.location?.lat}-${place.location?.lng}`;
}

function isValidLatLng(position: LatLng | null | undefined): position is LatLng {
  return !!position
    && Number.isFinite(position.lat)
    && Number.isFinite(position.lng)
    && position.lat >= -90
    && position.lat <= 90
    && position.lng >= -180
    && position.lng <= 180;
}

function viewportFromMap(map: MapLibreMap): MapViewport {
  const center = map.getCenter();
  const bounds = map.getBounds();
  return {
    center: { lat: center.lat, lng: center.lng },
    zoom: map.getZoom(),
    bounds: {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    },
  };
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function addBuildingExtrusions(map: MapLibreMap) {
  if (map.getLayer('admin-hi-3d-buildings')) return;
  const layers = map.getStyle().layers ?? [];
  const labelLayer = layers.find((layer) => layer.type === 'symbol' && 'text-field' in (layer.layout ?? {}));
  if (!map.getSource('openmaptiles')) return;

  map.addLayer(
    {
      id: 'admin-hi-3d-buildings',
      source: 'openmaptiles',
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': '#f3d6df',
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
        'fill-extrusion-opacity': 0.42,
      },
    },
    labelLayer?.id
  );
}
