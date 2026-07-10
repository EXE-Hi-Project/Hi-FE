import { useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import maplibregl, { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  BookmarkSimple,
  CaretDown,
  Check,
  ClockCounterClockwise,
  Compass,
  Flag,
  GlobeHemisphereWest,
  Heart,
  LockKey,
  MagnifyingGlass,
  MapPin,
  NavigationArrow,
  Crosshair,
  Plus,
  Star,
  ThumbsDown,
  Trash,
  X,
} from '@phosphor-icons/react';
import api from '../lib/api';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { useAuthStore } from '../store/authStore';
import { PLACE_CATEGORY_META, PLACE_CATEGORY_ORDER } from '../components/couple-map/placeCategoryMeta';
import type { CouplePlace, CouplePlaceCategory, CouplePlaceVisibility, CreateCouplePlaceDto } from '../types/shared';

type LatLng = { lat: number; lng: number };
type MapBounds = { north: number; south: number; east: number; west: number };
type MapViewport = { center: LatLng; zoom: number; bounds: MapBounds };
type CameraCommand = { center: LatLng; zoom: number; nonce: number; bounds?: MapBounds };
type SortMode = 'recommended' | 'distance' | 'rating' | 'popular';
type MapViewMode = 'nearby' | 'saved';
type LocationStatus = 'locating' | 'ready' | 'denied' | 'unsupported' | 'error';
type IdentityMode = 'real' | 'anonymous' | 'nickname';
type DetailPanel = 'review' | 'report' | null;
type SearchSuggestion = {
  id: string;
  name: string;
  address: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
  source?: 'HI' | 'TOMTOM' | 'PHOTON';
  visibility?: CouplePlaceVisibility;
  distanceMeters?: number;
};

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const RECENT_SEARCHES_KEY = 'hi.coupleMap.recentSearches.v1';

const CATEGORIES = [
  { id: 'ALL', label: 'Tất cả', Icon: Compass },
  ...PLACE_CATEGORY_ORDER.filter((id) => id !== 'OTHER').map((id) => ({ id, ...PLACE_CATEGORY_META[id] })),
] as const;

const FORM_CATEGORIES = PLACE_CATEGORY_ORDER.map((id) => ({ id, ...PLACE_CATEGORY_META[id] }));

const SORTS: Array<{ id: SortMode; label: string }> = [
  { id: 'recommended', label: 'Gợi ý' },
  { id: 'distance', label: 'Gần nhất' },
  { id: 'rating', label: 'Đánh giá' },
  { id: 'popular', label: 'Phổ biến' },
];

const CATEGORY_LABEL = Object.fromEntries(
  PLACE_CATEGORY_ORDER.map((id) => [id, PLACE_CATEGORY_META[id].label]),
) as Record<CouplePlaceCategory, string>;

const CATEGORY_COLORS = {
  ALL: 'bg-slate-700 text-white shadow-sm',
  ...Object.fromEntries(PLACE_CATEGORY_ORDER.map((id) => [id, PLACE_CATEGORY_META[id].activeClass])),
} as Record<CouplePlaceCategory | 'ALL', string>;

const CATEGORY_MARKER = PLACE_CATEGORY_META;

function formatDistance(value?: number) {
  if (value == null) return 'Gần bạn';
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(1)} km`;
}

function distanceMetersBetween(a: LatLng | null | undefined, b: LatLng | null | undefined) {
  if (!a || !b) return undefined;
  const earthRadius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function isWithinBounds(position: LatLng, bounds: MapBounds) {
  const inLatitude = position.lat >= bounds.south && position.lat <= bounds.north;
  const inLongitude = bounds.west <= bounds.east
    ? position.lng >= bounds.west && position.lng <= bounds.east
    : position.lng >= bounds.west || position.lng <= bounds.east;
  return inLatitude && inLongitude;
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

function boundsForPlaces(places: CouplePlace[]): MapBounds | undefined {
  const locations = places.map((place) => place.location).filter(isValidLatLng);
  if (locations.length < 2) return undefined;
  return locations.reduce<MapBounds>((bounds, location) => ({
    north: Math.max(bounds.north, location.lat),
    south: Math.min(bounds.south, location.lat),
    east: Math.max(bounds.east, location.lng),
    west: Math.min(bounds.west, location.lng),
  }), { north: -90, south: 90, east: -180, west: 180 });
}

function sortSavedPlaces(places: CouplePlace[], sort: SortMode) {
  const copy = [...places];
  copy.sort((a, b) => {
    if (sort === 'distance') return (a.distanceMeters ?? Number.MAX_VALUE) - (b.distanceMeters ?? Number.MAX_VALUE);
    if (sort === 'rating') return (ratingOf(b) ?? 0) - (ratingOf(a) ?? 0);
    if (sort === 'popular') return ((b.likeCount ?? 0) + (b.saveCount ?? 0) - 2 * (b.dislikeCount ?? 0)) - ((a.likeCount ?? 0) + (a.saveCount ?? 0) - 2 * (a.dislikeCount ?? 0));
    return ((b.savedByMe ? 10 : 0) + (ratingOf(b) ?? 0)) - ((a.savedByMe ? 10 : 0) + (ratingOf(a) ?? 0));
  });
  return copy;
}

function MapViewToggle({ value, onChange }: { value: MapViewMode; onChange: (value: MapViewMode) => void }) {
  return (
    <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
      <button type="button" onClick={() => onChange('nearby')} className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-black transition-colors ${value === 'nearby' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
        <NavigationArrow size={14} weight="fill" /> Gần bạn
      </button>
      <button type="button" onClick={() => onChange('saved')} className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-black transition-colors ${value === 'saved' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
        <BookmarkSimple size={15} weight="fill" /> Đã lưu
      </button>
    </div>
  );
}

function LocationPermissionOverlay({
  status,
  onRetry,
}: {
  status: LocationStatus;
  onRetry: () => void;
}) {
  const locating = status === 'locating';
  const title = locating
    ? 'Đang lấy vị trí của bạn'
    : status === 'unsupported'
      ? 'Trình duyệt chưa hỗ trợ định vị'
      : status === 'denied'
        ? 'Hi Map cần quyền vị trí'
        : 'Chưa lấy được vị trí hiện tại';
  const description = locating
    ? 'Map sẽ mở tại vị trí thật của bạn để khoảng cách không bị sai.'
    : status === 'unsupported'
      ? 'Hãy mở Hi Lover trên trình duyệt có hỗ trợ định vị để dùng bản đồ gần bạn.'
      : status === 'denied'
        ? 'Vui lòng cấp quyền vị trí trong trình duyệt, sau đó bấm thử lại. Hi không lưu tọa độ này vào hồ sơ.'
        : 'Kiểm tra GPS/kết nối mạng rồi thử lại. Hi không dùng TP.HCM làm vị trí thay thế để tránh sai khoảng cách.';

  return (
    <div className="absolute inset-0 z-30 flex h-[100dvh] w-full items-center justify-center bg-[linear-gradient(135deg,#f8fbff_0%,#fff1f6_100%)] p-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/85 bg-white/88 p-5 text-center shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
          {locating ? <Spinner size="md" /> : <NavigationArrow size={25} weight="fill" />}
        </div>
        <h2 className="mt-4 text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{description}</p>
        {!locating ? (
          <Button type="button" className="mt-5 w-full" onClick={onRetry}>
            <Crosshair size={17} weight="bold" />
            Thử lại định vị
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function viewportRadius(viewport: MapViewport | null) {
  if (!viewport) return 10_000;
  const corner = { lat: viewport.bounds.north, lng: viewport.bounds.east };
  return Math.min(50_000, Math.max(500, Math.ceil(distanceMetersBetween(viewport.center, corner) ?? 10_000)));
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

function categoryIconMarkup(category: CouplePlaceCategory, color: string, size = 18) {
  const Icon = PLACE_CATEGORY_META[category]?.Icon ?? MapPin;
  return renderToStaticMarkup(<Icon size={size} color={color} weight="fill" />);
}

function privateIconMarkup(size = 11) {
  return renderToStaticMarkup(<LockKey size={size} color="#ffffff" weight="fill" />);
}

function ratingOf(place: CouplePlace) {
  return place.userRatingAvg && place.userRatingAvg > 0 ? place.userRatingAvg : place.googleRating;
}

function placeKey(place: CouplePlace) {
  return place._id ? `hi-${place._id}` : `osm-${place.googlePlaceId ?? place.name}`;
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function loadRecentSearches(): SearchSuggestion[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && isValidLatLng(item)).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(items: SearchSuggestion[]) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items.slice(0, 5)));
  } catch {
    // Search remains usable when storage is unavailable.
  }
}

function FreeMapCanvas({
  initialCenter,
  cameraCommand,
  userPosition,
  searchPin,
  searchPinCategory,
  places,
  selected,
  onSelect,
  onMapPick,
  onViewportChange,
}: {
  initialCenter: LatLng;
  cameraCommand: CameraCommand | null;
  userPosition?: LatLng | null;
  searchPin?: SearchSuggestion | null;
  searchPinCategory?: CouplePlaceCategory;
  places: CouplePlace[];
  selected?: CouplePlace | null;
  onSelect: (place: CouplePlace) => void;
  onMapPick: (position: LatLng) => void;
  onViewportChange: (viewport: MapViewport) => void;
}) {
  const onViewportChangeRef = useRef(onViewportChange);
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, MapLibreMarker>>(new Map());
  const userMarkerRef = useRef<MapLibreMarker | null>(null);
  const searchMarkerRef = useRef<MapLibreMarker | null>(null);
  const [ready, setReady] = useState(false);

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
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.on('load', () => {
      addBuildingExtrusions(map);
      setReady(true);
      onViewportChangeRef.current(viewportFromMap(map));
    });
    map.on('click', (event) => onMapPick({ lat: event.lngLat.lat, lng: event.lngLat.lng }));
    const handleMoveEnd = () => onViewportChangeRef.current(viewportFromMap(map));
    map.on('moveend', handleMoveEnd);
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      userMarkerRef.current?.remove();
      searchMarkerRef.current?.remove();
      markersRef.current.clear();
      userMarkerRef.current = null;
      searchMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !cameraCommand) return;
    if (cameraCommand.bounds) {
      mapRef.current.fitBounds(
        [
          [cameraCommand.bounds.west, cameraCommand.bounds.south],
          [cameraCommand.bounds.east, cameraCommand.bounds.north],
        ],
        { padding: 90, maxZoom: 16, duration: 900 },
      );
      return;
    }
    mapRef.current.flyTo({
      center: [cameraCommand.center.lng, cameraCommand.center.lat],
      zoom: cameraCommand.zoom,
      pitch: 58,
      bearing: 28,
      speed: 0.9,
      essential: true,
    });
  }, [ready, cameraCommand?.nonce]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const nextKeys = new Set(places.map(placeKey));
    markersRef.current.forEach((marker, key) => {
      if (!nextKeys.has(key)) {
        marker.remove();
        markersRef.current.delete(key);
      }
    });

    places.forEach((place) => {
      if (!isValidLatLng(place.location)) return;
      const key = placeKey(place);
      const active = !!selected && placeKey(selected) === key;
      const markerStyle = CATEGORY_MARKER[place.category] ?? CATEGORY_MARKER.OTHER;
      let marker = markersRef.current.get(key);
      const element = marker?.getElement() ?? document.createElement('button');
      element.setAttribute('type', 'button');
      element.style.cursor = 'pointer';
      element.style.background = 'transparent';
      element.style.border = '0';
      element.style.padding = '0';
      element.style.zIndex = active ? '20' : '5';
      element.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;transform:scale(${active ? 1.16 : 1});transition:transform .18s ease">
          <div style="display:flex;align-items:center;gap:5px;max-width:180px;border:1px solid ${markerStyle.color}33;border-radius:999px;background:rgba(255,255,255,.94);padding:5px 9px;box-shadow:0 10px 24px rgba(15,23,42,.14);font-size:11px;font-weight:900;color:#0f172a;overflow:hidden;white-space:nowrap;backdrop-filter:blur(10px)">
            ${place.visibility === 'COUPLE_PRIVATE' ? `<span style="display:flex;width:17px;height:17px;flex:none;align-items:center;justify-content:center;border-radius:999px;background:#e11d48">${privateIconMarkup()}</span>` : ''}
            <span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(place.name)}</span>
          </div>
          ${categoryPinHtml(markerStyle, { size: active ? 46 : 40, iconHtml: categoryIconMarkup(place.category, markerStyle.color) })}
        </div>
      `;
      element.title = place.name;
      element.onclick = (event) => {
        event.stopPropagation();
        onSelect(place);
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
  }, [places, selected, ready, onSelect]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (!isValidLatLng(userPosition)) return;

    const element = document.createElement('div');
    element.className = 'relative h-9 w-9';
    element.innerHTML = `
      <span style="position:absolute;inset:0;border-radius:999px;background:rgba(59,130,246,.22);animation:pulse 1.8s cubic-bezier(0.4,0,0.6,1) infinite"></span>
      <span style="position:absolute;left:8px;top:8px;width:20px;height:20px;border-radius:999px;background:#2563eb;border:3px solid white;box-shadow:0 10px 24px rgba(37,99,235,.35)"></span>
    `;
    userMarkerRef.current = new maplibregl.Marker({ element, anchor: 'center' })
      .setLngLat([userPosition.lng, userPosition.lat])
      .addTo(mapRef.current);
  }, [ready, userPosition?.lat, userPosition?.lng]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    searchMarkerRef.current?.remove();
    searchMarkerRef.current = null;
    if (!isValidLatLng(searchPin)) return;
      const marker = CATEGORY_MARKER[searchPinCategory ?? 'DATE_SPOT'];
    const markerCategory = searchPinCategory ?? 'DATE_SPOT';

    const element = document.createElement('div');
    element.className = 'flex -translate-y-1 flex-col items-center gap-1';
    element.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;max-width:260px;border:1px solid ${marker.color}44;border-radius:999px;background:rgba(255,255,255,.95);padding:7px 11px;box-shadow:0 16px 32px rgba(15,23,42,.18);font-size:12px;font-weight:800;color:#0f172a;backdrop-filter:blur(10px)">
        <span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:${marker.soft};color:${marker.color};font-size:13px;line-height:1">${categoryIconMarkup(markerCategory, marker.color, 14)}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(searchPin.name || searchPin.displayName)}</span>
      </div>
      ${categoryPinHtml(marker, { size: 54, iconHtml: categoryIconMarkup(markerCategory, marker.color, 18) })}
    `;
    searchMarkerRef.current = new maplibregl.Marker({ element, anchor: 'bottom' })
      .setLngLat([searchPin.lng, searchPin.lat])
      .addTo(mapRef.current);
  }, [ready, searchPin?.id, searchPin?.lat, searchPin?.lng, searchPinCategory]);

  return <div ref={mapEl} className="h-full min-h-[520px] w-full" />;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function categoryPinHtml(
  marker: { color: string; soft: string },
  options: { size?: number; iconHtml?: string } = {}
) {
  const size = options.size ?? 42;
  const inset = Math.max(7, Math.round(size * 0.2));
  const iconHtml = options.iconHtml ?? categoryIconMarkup('OTHER', marker.color);

  return `
    <div style="position:relative;width:${size}px;height:${size}px">
      <div style="position:absolute;inset:0;border-radius:50% 50% 50% 0;background:${marker.color};border:3px solid white;box-shadow:0 16px 30px ${marker.color}55,0 5px 10px rgba(15,23,42,.18);transform:rotate(-45deg)">
        <span style="position:absolute;inset:${inset}px;border-radius:999px;background:white;color:${marker.color};display:flex;align-items:center;justify-content:center;font-size:${Math.max(12, Math.round(size * 0.28))}px;font-weight:900;line-height:0;box-shadow:inset 0 0 0 1px ${marker.color}22;transform:rotate(45deg)">${iconHtml}</span>
      </div>
      <span style="position:absolute;left:50%;bottom:-6px;width:${Math.round(size * 0.38)}px;height:5px;border-radius:999px;background:${marker.color};opacity:.28;filter:blur(2px);transform:translateX(-50%)"></span>
    </div>
  `;
}

function placeNameFromReverseGeocode(data: {
  name?: string;
  address?: Record<string, string | undefined>;
}) {
  const address = data.address ?? {};
  return (
    data.name ||
    address.amenity ||
    address.shop ||
    address.tourism ||
    address.leisure ||
    address.building ||
    address.road ||
    ''
  ).trim();
}

function categoryFromSuggestion(suggestion: SearchSuggestion | null, selectedCategory: CouplePlaceCategory | 'ALL'): CouplePlaceCategory {
  if (selectedCategory !== 'ALL') return selectedCategory;
  const text = `${suggestion?.type ?? ''} ${suggestion?.name ?? ''} ${suggestion?.address ?? ''}`.toLowerCase();
  if (text.includes('cafe') || text.includes('coffee') || text.includes('cà phê')) return 'CAFE';
  if (text.includes('restaurant') || text.includes('food') || text.includes('quán ăn') || text.includes('ăn uống')) return 'FOOD';
  if (text.includes('cinema') || text.includes('rạp')) return 'CINEMA';
  if (text.includes('park') || text.includes('công viên')) return 'PARK';
  if (text.includes('shop') || text.includes('mall') || text.includes('siêu thị')) return 'SHOPPING';
  if (text.includes('karaoke') || text.includes('game') || text.includes('bowling')) return 'ENTERTAINMENT';
  return 'DATE_SPOT';
}

function addBuildingExtrusions(map: MapLibreMap) {
  if (map.getLayer('hi-3d-buildings')) return;
  const layers = map.getStyle().layers ?? [];
  const labelLayer = layers.find((layer) => layer.type === 'symbol' && 'text-field' in (layer.layout ?? {}));
  if (!map.getSource('openmaptiles')) return;
  map.addLayer(
    {
      id: 'hi-3d-buildings',
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

function PlaceCard({ place, active, onSelect }: { place: CouplePlace; active: boolean; onSelect: () => void }) {
  const rating = ratingOf(place);
  const categoryMeta = CATEGORY_MARKER[place.category] ?? CATEGORY_MARKER.OTHER;
  const CategoryIcon = PLACE_CATEGORY_META[place.category]?.Icon ?? Compass;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-3 text-left transition-all ${
        active ? 'border-rose-300 bg-rose-50 shadow-sm' : 'border-slate-100 bg-white hover:border-rose-200 hover:bg-rose-50/50'
      }`}
    >
      <div className="flex gap-3">
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border"
          style={{ backgroundColor: categoryMeta.soft, borderColor: `${categoryMeta.color}33`, color: categoryMeta.color }}
        >
          {place.coverPhotoUrl ? (
            <img src={place.coverPhotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="relative h-9 w-9">
              <div
                className="absolute inset-0 rounded-[50%_50%_50%_0] border-[3px] border-white shadow-lg"
                style={{ backgroundColor: categoryMeta.color, transform: 'rotate(-45deg)' }}
              >
                <span className="absolute inset-[7px] flex items-center justify-center rounded-full bg-white shadow-inner" style={{ color: categoryMeta.color, transform: 'rotate(45deg)' }}>
                  <CategoryIcon size={15} weight="fill" />
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1.5 line-clamp-1 text-sm font-black" style={{ color: categoryMeta.color }}>
              {place.visibility === 'COUPLE_PRIVATE' ? <LockKey size={13} weight="fill" className="shrink-0 text-rose-500" /> : null}
              <span className="truncate">{place.name}</span>
            </p>
            <span className="shrink-0 text-[11px] font-bold text-slate-400">{formatDistance(place.distanceMeters)}</span>
          </div>
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{place.location.address || CATEGORY_LABEL[place.category]}</p>
          <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <span className="inline-flex items-center gap-1 text-amber-500">
              <Star size={13} weight="fill" />
              {rating ? rating.toFixed(1) : 'Mới'}
            </span>
            <span>{place.likeCount ?? 0} thích · {place.dislikeCount ?? 0} không thích</span>
            <span className={place.source === 'OSM' ? 'text-sky-500' : 'text-rose-500'}>{place.source === 'OSM' ? 'OSM' : 'Hi'}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function PlaceDetail({
  place,
  onClose,
  onSaveExternal,
  onLike,
  onDislike,
  onSave,
  onReview,
  onReport,
  busy,
  userPosition,
}: {
  place: CouplePlace;
  onClose: () => void;
  onSaveExternal: () => void;
  onLike: () => void;
  onDislike: () => void;
  onSave: () => void;
  onReview: (rating: number, content: string, identityMode: IdentityMode, nickname: string) => void;
  onReport: (reason: string) => void;
  busy: boolean;
  userPosition: LatLng | null;
}) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [identityMode, setIdentityMode] = useState<IdentityMode>('real');
  const [nickname, setNickname] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [activePanel, setActivePanel] = useState<DetailPanel>(null);
  const isPersisted = !!place._id;
  const currentRating = ratingOf(place);
  const categoryMeta = CATEGORY_MARKER[place.category] ?? CATEGORY_MARKER.OTHER;
  const distanceFromUser = place.distanceMeters ?? distanceMetersBetween(userPosition, place.location);

  useEffect(() => {
    setContent('');
    setReportReason('');
    setRating(5);
    setIdentityMode('real');
    setNickname('');
    setActivePanel(null);
  }, [placeKey(place)]);

  return (
    <aside className="absolute bottom-3 left-3 right-3 z-20 max-h-[62%] overflow-y-auto rounded-2xl border border-white/80 bg-white/92 p-2.5 shadow-2xl shadow-slate-900/10 backdrop-blur md:bottom-4 md:left-auto md:right-4 md:top-[168px] md:max-h-[calc(100%-184px)] md:w-[340px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-rose-400">
            {place.visibility === 'COUPLE_PRIVATE' ? <LockKey size={13} weight="fill" /> : null}
            {place.visibility === 'COUPLE_PRIVATE' ? 'Chỉ hai người' : CATEGORY_LABEL[place.category]}
          </p>
          <h2 className="mt-1 text-lg font-black leading-tight" style={{ color: categoryMeta.color }}>{place.name}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{place.location.address || 'Địa điểm gần bạn'}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng" title="Đóng" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-500"><X size={15} weight="bold" /></button>
      </div>

      <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
        <span className="inline-flex items-center gap-1 text-amber-500"><Star size={14} weight="fill" />{currentRating ? currentRating.toFixed(1) : 'Mới'}</span>
        <span className="inline-flex items-center gap-1 text-rose-500"><Heart size={14} weight="fill" />{place.likeCount ?? 0}</span>
        <span className="inline-flex items-center gap-1 text-slate-400"><ThumbsDown size={14} weight="fill" />{place.dislikeCount ?? 0}</span>
        <span className="ml-auto inline-flex items-center gap-1"><MapPin size={14} weight="fill" />{formatDistance(distanceFromUser)}</span>
      </div>

      <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-slate-600">{place.description || 'Một điểm hẹn hò đang chờ cộng đồng Hi Lover khám phá.'}</p>
      {place.createdByName ? <p className="mt-1 text-xs font-bold text-slate-400">Đóng góp bởi {place.createdByName}</p> : null}

      {!isPersisted ? (
        <Button className="mt-4 w-full" onClick={onSaveExternal} disabled={busy}>
          Lưu vào Hi Map
        </Button>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            <button
              type="button"
              onClick={onLike}
              disabled={busy}
              title={place.likedByMe ? 'Bỏ yêu thích' : 'Yêu thích'}
              className={`inline-flex h-10 items-center justify-center rounded-xl border transition-all active:scale-[0.98] disabled:opacity-60 ${
                place.likedByMe
                  ? 'border-rose-400 bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'border-rose-100 bg-white/90 text-rose-500 hover:bg-rose-50'
              }`}
            >
              <Heart size={20} weight={place.likedByMe ? 'fill' : 'bold'} />
            </button>
            <button type="button" onClick={onDislike} disabled={busy} title={place.dislikedByMe ? 'Bỏ không thích' : 'Không thích'} className={`inline-flex h-10 items-center justify-center rounded-xl border transition-all active:scale-[0.98] disabled:opacity-60 ${place.dislikedByMe ? 'border-slate-500 bg-slate-600 text-white' : 'border-slate-200 bg-white/90 text-slate-500 hover:bg-slate-50'}`}>
              <ThumbsDown size={19} weight={place.dislikedByMe ? 'fill' : 'bold'} />
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={busy}
              title={place.savedByMe ? 'Bỏ lưu' : 'Lưu lại'}
              className={`inline-flex h-10 items-center justify-center rounded-xl border transition-all active:scale-[0.98] disabled:opacity-60 ${
                place.savedByMe
                  ? 'border-sky-400 bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'border-sky-100 bg-white/90 text-sky-500 hover:bg-sky-50'
              }`}
            >
              <BookmarkSimple size={20} weight={place.savedByMe ? 'fill' : 'bold'} />
            </button>
            {([
              ['review', 'Viết review', Star],
              ['report', 'Báo cáo', Flag],
            ] as Array<[Exclude<DetailPanel, null>, string, typeof Star]>).map(([panel, label, Icon]) => (
              <button key={panel} type="button" title={label} aria-label={label} onClick={() => setActivePanel((current) => current === panel ? null : panel)} className={`inline-flex h-10 items-center justify-center rounded-xl border transition-colors ${activePanel === panel ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}>
                <Icon size={18} weight={activePanel === panel ? 'fill' : 'bold'} />
              </button>
            ))}
          </div>

          {activePanel === 'review' ? <div className="mt-3 rounded-xl bg-slate-50 p-2.5">
            <p className="text-sm font-black text-slate-900">Viết review</p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-white p-1 shadow-sm">
              {([['real', 'Tên thật'], ['anonymous', 'Ẩn danh'], ['nickname', 'Biệt danh']] as Array<[IdentityMode, string]>).map(([mode, label]) => (
                <button key={mode} type="button" onClick={() => setIdentityMode(mode)} className={`h-8 rounded-lg text-[11px] font-black transition-colors ${identityMode === mode ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-rose-50'}`}>{label}</button>
              ))}
            </div>
            {identityMode === 'nickname' ? <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-rose-300" placeholder="Nhập biệt danh" /> : null}
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" onClick={() => setRating(value)} className={value <= rating ? 'text-amber-400' : 'text-slate-300'}>
                  <Star size={20} weight="fill" />
                </button>
              ))}
            </div>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium outline-none focus:border-rose-300"
              placeholder="Điều bạn thích ở địa điểm này..."
            />
            <Button size="sm" className="mt-2 w-full" disabled={busy || (identityMode === 'nickname' && !nickname.trim())} onClick={() => onReview(rating, content, identityMode, nickname)}>
              Gửi review
            </Button>
            {(place.recentReviews ?? []).length > 0 ? <div className="mt-3 space-y-1.5">{(place.recentReviews ?? []).slice(0, 2).map((review) => <div key={review._id} className="rounded-lg bg-white p-2"><div className="flex items-center justify-between"><p className="text-xs font-black text-slate-800">{review.userName}</p><span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-500"><Star size={11} weight="fill" />{review.rating}</span></div>{review.content ? <p className="mt-1 text-xs font-medium text-slate-600">{review.content}</p> : null}</div>)}</div> : null}
          </div> : null}

          {activePanel === 'report' ? <div className="mt-3 rounded-xl border border-slate-100 p-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-slate-500">
              <Flag size={15} />
              Báo cáo nội dung
            </div>
            <input
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
              placeholder="Lý do báo cáo"
            />
            <button type="button" disabled={busy || !reportReason.trim()} onClick={() => onReport(reportReason)} className="mt-2 text-xs font-black text-rose-500 disabled:text-slate-300">
              Gửi báo cáo
            </button>
          </div> : null}
        </>
      )}
    </aside>
  );
}

function CreatePlaceModal({
  position,
  onClose,
  onSubmit,
  busy,
  selectedSuggestion,
  initialCategory,
  userPosition,
  hasPartner,
}: {
  position: LatLng;
  onClose: () => void;
  onSubmit: (payload: CreateCouplePlaceDto) => void;
  busy: boolean;
  selectedSuggestion: SearchSuggestion | null;
  initialCategory: CouplePlaceCategory;
  userPosition: LatLng | null;
  hasPartner: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CouplePlaceCategory>(initialCategory);
  const [address, setAddress] = useState('');
  const [formPosition, setFormPosition] = useState(position);
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [identityMode, setIdentityMode] = useState<IdentityMode>('real');
  const [nickname, setNickname] = useState('');
  const [visibility, setVisibility] = useState<CouplePlaceVisibility>('PUBLIC');

  const importAddress = async (target: LatLng, options: { replaceName: boolean }) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${target.lat}&lon=${target.lng}&accept-language=vi`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          const importedName = placeNameFromReverseGeocode(data);
          if (options.replaceName && importedName) setName(importedName);
          setAddress(data.display_name);
          return;
        }
      }
    } catch (e) {
      console.warn("Nominatim reverse geocode failed", e);
    }

    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${target.lat}&longitude=${target.lng}&localityLanguage=vi`
      );
      if (res.ok) {
        const data = await res.json();
        const parts = [data.locality, data.city, data.principalSubdivision].filter(Boolean);
        if (parts.length > 0) {
          if (options.replaceName && data.locality) setName(data.locality);
          setAddress(parts.join(', '));
        }
      }
    } catch (e) {
      console.warn("BigDataCloud reverse geocode failed", e);
    }
  };

  useEffect(() => {
    setFormPosition(position);
    if (selectedSuggestion) {
      setName(selectedSuggestion.name || selectedSuggestion.displayName.split(',')[0] || selectedSuggestion.displayName);
      setAddress(selectedSuggestion.address || selectedSuggestion.displayName);
      setCategory(initialCategory);
      return;
    }
    importAddress(position, { replaceName: true });
  }, [position, selectedSuggestion, initialCategory]);

  const useMyAddress = () => {
    const applyPosition = async (target: LatLng) => {
      setLocatingAddress(true);
      setFormPosition(target);
      await importAddress(target, { replaceName: false });
      setLocatingAddress(false);
    };

    if (userPosition) {
      applyPosition(userPosition);
      return;
    }

    if (!navigator.geolocation) return;
    setLocatingAddress(true);
    navigator.geolocation.getCurrentPosition(
      (geo) => applyPosition({ lat: geo.coords.latitude, lng: geo.coords.longitude }),
      () => setLocatingAddress(false),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm md:items-center">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Thêm địa điểm yêu thích</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {visibility === 'PUBLIC' ? 'Mọi người trên Hi Map đều có thể xem.' : 'Chỉ bạn và Người ấy có thể xem khi còn kết nối.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">Đóng</button>
        </div>
        <div className="mt-3 space-y-2">
          <input value={name} onChange={(event) => setName(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-rose-300" placeholder="Tên địa điểm" />
          <div className="flex gap-2">
            <input value={address} onChange={(event) => setAddress(event.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-rose-300" placeholder="Địa chỉ hoặc mô tả vị trí" />
            <button
              type="button"
              onClick={useMyAddress}
              disabled={locatingAddress}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-60"
              title="Dùng địa chỉ của tôi"
              aria-label="Dùng địa chỉ của tôi"
            >
              {locatingAddress ? <Spinner size="sm" /> : <Crosshair size={18} weight="bold" />}
            </button>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-2">
            <p className="px-1 pb-2 text-xs font-black text-slate-700">Ai có thể xem?</p>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 shadow-sm">
              <button type="button" onClick={() => setVisibility('PUBLIC')} className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-[11px] font-black transition-colors ${visibility === 'PUBLIC' ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-rose-50'}`}>
                <GlobeHemisphereWest size={15} weight="bold" /> Công khai
              </button>
              <button type="button" onClick={() => hasPartner && setVisibility('COUPLE_PRIVATE')} disabled={!hasPartner} title={hasPartner ? 'Chỉ hai người' : 'Bạn cần kết nối với Người ấy trước'} className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-[11px] font-black transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${visibility === 'COUPLE_PRIVATE' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                <LockKey size={15} weight="fill" /> Chỉ hai người
              </button>
            </div>
            {!hasPartner ? <p className="px-1 pt-2 text-[11px] font-semibold text-slate-400">Kết nối với Người ấy để dùng chế độ riêng tư.</p> : null}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-2">
            <p className="px-1 pb-2 text-xs font-black text-slate-700">Hiển thị người đóng góp</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1 shadow-sm">
              {([['real', 'Tên thật'], ['anonymous', 'Ẩn danh'], ['nickname', 'Biệt danh']] as Array<[IdentityMode, string]>).map(([mode, label]) => (
                <button key={mode} type="button" onClick={() => setIdentityMode(mode)} className={`h-8 rounded-lg text-[11px] font-black transition-colors ${identityMode === mode ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-rose-50'}`}>{label}</button>
              ))}
            </div>
            {identityMode === 'nickname' ? <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-rose-300" placeholder={visibility === 'PUBLIC' ? 'Biệt danh sẽ hiển thị công khai' : 'Biệt danh sẽ hiển thị với Người ấy'} /> : null}
          </div>
          <div className="grid grid-cols-[64px_1fr] items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-2">
            <p className="px-1 pt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Danh mục</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {FORM_CATEGORIES.map(({ id, label, Icon }) => {
                const active = category === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategory(id)}
                    className={`flex h-9 items-center justify-center gap-1 rounded-lg border px-1.5 text-[10px] font-black transition-all ${
                      active
                        ? 'border-rose-200 bg-white text-rose-600 shadow-sm shadow-rose-100'
                        : 'border-white bg-white/70 text-slate-500 hover:border-rose-100 hover:text-rose-500'
                    }`}
                  >
                    <Icon size={15} weight={active ? 'fill' : 'bold'} />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-rose-300" placeholder="Lý do các cặp đôi nên đến đây..." />
        </div>
        <Button className="mt-3 w-full" disabled={busy || !name.trim() || (identityMode === 'nickname' && !nickname.trim())} onClick={() => onSubmit({ name, description, category, address, lat: formPosition.lat, lng: formPosition.lng, anonymous: identityMode === 'anonymous', nickname: identityMode === 'nickname' ? nickname.trim() : undefined, visibility })}>
          {visibility === 'PUBLIC' ? 'Đăng lên bản đồ' : 'Lưu cho hai người'}
        </Button>
      </div>
    </div>
  );
}

export default function CoupleMapPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);
  const [userPosition, setUserPosition] = useState<LatLng | null>(null);
  const [category, setCategory] = useState<CouplePlaceCategory | 'ALL'>('ALL');
  const [sort, setSort] = useState<SortMode>('recommended');
  const [sortOpen, setSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<MapViewMode>('nearby');
  const [selected, setSelected] = useState<CouplePlace | null>(null);
  const [pendingPosition, setPendingPosition] = useState<LatLng | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<SearchSuggestion | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('locating');
  const [searchValue, setSearchValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SearchSuggestion | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<SearchSuggestion[]>(loadRecentSearches);
  const lastSavedFitRef = useRef('');
  const debouncedSearch = useDebouncedValue(searchValue.trim(), 250);

  const hasUserPosition = isValidLatLng(userPosition);
  const mapAvailable = hasUserPosition && (locationStatus === 'ready' || locationStatus === 'locating');
  const locationReady = locationStatus === 'ready' && hasUserPosition;
  const queryCenter = mapAvailable ? (viewport?.center ?? userPosition) : null;
  const queryParams = useMemo(() => {
    if (!queryCenter) return null;
    return {
      lat: queryCenter.lat,
      lng: queryCenter.lng,
      radius: viewportRadius(viewport),
      category: category === 'ALL' ? undefined : category,
      sort,
    };
  }, [queryCenter?.lat, queryCenter?.lng, viewport?.bounds.north, viewport?.bounds.east, category, sort]);

  const placesQuery = useQuery({
    queryKey: ['couple-places-nearby', queryParams],
    queryFn: () => {
      if (!queryParams) return Promise.resolve([] as CouplePlace[]);
      return api.get('/couple-places/nearby', { params: queryParams }).then((r) => r.data.places as CouplePlace[]);
    },
    enabled: viewMode === 'nearby' && locationReady && !!viewport && !!queryParams,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });

  const savedPlacesQuery = useQuery({
    queryKey: ['couple-places-saved'],
    queryFn: () => api.get('/couple-places/saved').then((r) => r.data.places as CouplePlace[]),
    enabled: viewMode === 'saved' && locationReady,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const searchQuery = useQuery({
    queryKey: ['couple-place-search-v2', debouncedSearch, queryCenter?.lat, queryCenter?.lng],
    queryFn: ({ signal }) => {
      if (!queryCenter) return Promise.resolve([] as SearchSuggestion[]);
      return api.get('/couple-places/search', {
        params: { q: debouncedSearch, lat: queryCenter.lat, lng: queryCenter.lng },
        signal,
      }).then((r) => r.data.suggestions as SearchSuggestion[]);
    },
    enabled: locationReady && searchFocused && debouncedSearch.length >= 2 && !!queryCenter,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const placeDetailQuery = useQuery({
    queryKey: ['couple-place', selected?._id],
    queryFn: () => api.get(`/couple-places/${selected?._id}`).then((r) => r.data.place as CouplePlace),
    enabled: !!selected?._id,
  });

  const detailPlace = placeDetailQuery.data ?? selected;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['couple-places-nearby'] });
    queryClient.invalidateQueries({ queryKey: ['couple-places-saved'] });
    if (selected?._id) queryClient.invalidateQueries({ queryKey: ['couple-place', selected._id] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateCouplePlaceDto) => api.post('/couple-places', payload).then((r) => r.data.place as CouplePlace),
    onSuccess: (place) => {
      toast.success(place.visibility === 'COUPLE_PRIVATE' ? 'Đã lưu địa điểm cho hai người' : 'Đã công khai địa điểm lên bản đồ');
      setSelected(place);
      setPendingPosition(null);
      setPendingSuggestion(null);
      invalidate();
    },
    onError: () => toast.error('Không thể tạo địa điểm'),
  });

  const reactionMutation = useMutation({
    mutationFn: ({ id, type, active }: { id: number; type: 'like' | 'dislike' | 'save'; active: boolean }) => {
      const method = active ? api.post : api.delete;
      return method(`/couple-places/${id}/${type}`).then((r) => r.data.place as CouplePlace);
    },
    onSuccess: (place) => {
      setSelected(place);
      invalidate();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, rating, content, identityMode, nickname }: { id: number; rating: number; content: string; identityMode: IdentityMode; nickname: string }) => api.post(`/couple-places/${id}/reviews`, { rating, content, anonymous: identityMode === 'anonymous', nickname: identityMode === 'nickname' ? nickname.trim() : undefined }).then((r) => r.data.review),
    onSuccess: () => {
      toast.success('Đã gửi review');
      invalidate();
    },
    onError: () => toast.error('Không gửi được review'),
  });

  const reportMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api.post(`/couple-places/${id}/report`, { reason }).then((r) => r.data.report),
    onSuccess: () => toast.success('Đã gửi báo cáo'),
    onError: () => toast.error('Không gửi được báo cáo'),
  });

  const locateMe = () => {
    setLocationStatus('locating');
    if (!navigator.geolocation) {
      setUserPosition(null);
      setViewport(null);
      setLocationStatus('unsupported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserPosition(nextPosition);
        setLocationStatus('ready');
        setCameraCommand((current) => ({ center: nextPosition, zoom: 15, nonce: (current?.nonce ?? 0) + 1 }));
      },
      (error) => {
        setUserPosition(null);
        setViewport(null);
        setLocationStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  useEffect(() => {
    locateMe();
  }, []);

  const places = useMemo(() => {
    if (viewMode === 'saved') {
      const saved = (savedPlacesQuery.data ?? [])
        .filter((place) => category === 'ALL' || place.category === category)
        .map((place) => ({
          ...place,
          distanceMeters: place.distanceMeters ?? distanceMetersBetween(userPosition, place.location),
        }));
      return sortSavedPlaces(saved, sort);
    }
    const data = placesQuery.data ?? [];
    if (!viewport) return data;
    return data.filter((place) => isValidLatLng(place.location) && isWithinBounds(place.location, viewport.bounds));
  }, [viewMode, savedPlacesQuery.data, placesQuery.data, category, sort, userPosition?.lat, userPosition?.lng, viewport?.bounds.north, viewport?.bounds.south, viewport?.bounds.east, viewport?.bounds.west]);

  useEffect(() => {
    if (viewMode !== 'saved' || savedPlacesQuery.isFetching || places.length === 0) return;
    const signature = places.map(placeKey).sort().join('|');
    if (lastSavedFitRef.current === signature) return;
    lastSavedFitRef.current = signature;
    const bounds = boundsForPlaces(places);
    if (bounds) {
      const center = { lat: (bounds.north + bounds.south) / 2, lng: (bounds.east + bounds.west) / 2 };
      setCameraCommand((current) => ({ center, zoom: 14, bounds, nonce: (current?.nonce ?? 0) + 1 }));
    } else if (places[0]?.location) {
      setCameraCommand((current) => ({ center: places[0].location, zoom: 16, nonce: (current?.nonce ?? 0) + 1 }));
    }
  }, [viewMode, savedPlacesQuery.isFetching, places]);
  const suggestions = searchQuery.data ?? [];
  const visibleSuggestions = searchValue.trim().length >= 2 ? suggestions : recentSearches;
  const showSuggestions = searchFocused && (searchValue.trim().length >= 2 || recentSearches.length > 0);
  const busy = createMutation.isPending || reactionMutation.isPending || reviewMutation.isPending || reportMutation.isPending;
  const activePlacesQuery = viewMode === 'saved' ? savedPlacesQuery : placesQuery;
  const selectedSuggestionCategory = categoryFromSuggestion(selectedSuggestion, category);
  const pendingSuggestionCategory = categoryFromSuggestion(pendingSuggestion ?? selectedSuggestion, category);

  const changeViewMode = (nextMode: MapViewMode) => {
    if (nextMode === 'saved') lastSavedFitRef.current = '';
    setViewMode(nextMode);
    setSelected(null);
  };

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    const nextCenter = { lat: suggestion.lat, lng: suggestion.lng };
    setCameraCommand((current) => ({ center: nextCenter, zoom: 16, nonce: (current?.nonce ?? 0) + 1 }));
    setSelected(null);
    setSelectedSuggestion(suggestion);
    setSearchValue(suggestion.name || suggestion.displayName);
    setSearchFocused(false);
    setActiveSuggestionIndex(0);
    setRecentSearches((current) => {
      const next = [suggestion, ...current.filter((item) => item.id !== suggestion.id)].slice(0, 5);
      saveRecentSearches(next);
      return next;
    });
  };

  const openAddPlace = () => {
    const sourceSuggestion = selectedSuggestion ?? (searchValue.trim() && suggestions[0] ? suggestions[0] : null);
    if (sourceSuggestion) {
      setPendingSuggestion(sourceSuggestion);
      setPendingPosition({ lat: sourceSuggestion.lat, lng: sourceSuggestion.lng });
      setSearchValue(sourceSuggestion.name || sourceSuggestion.displayName);
      setSelectedSuggestion(sourceSuggestion);
      return;
    }
    setPendingSuggestion(null);
    if (mapAvailable) {
      setPendingPosition(viewport?.center ?? userPosition!);
    }
  };

  const openExternalPlaceModal = (place: CouplePlace) => {
    const suggestion: SearchSuggestion = {
      id: place.googlePlaceId ?? placeKey(place),
      name: place.name,
      address: place.location.address ?? '',
      displayName: [place.name, place.location.address].filter(Boolean).join(', '),
      lat: place.location.lat,
      lng: place.location.lng,
      type: place.category,
      source: place.source === 'OSM' ? 'PHOTON' : 'HI',
    };
    setPendingSuggestion(suggestion);
    setPendingPosition(place.location);
    setSelected(null);
  };

  const selectPlaceFromList = (place: CouplePlace) => {
    setSelected(place);
    setCameraCommand((current) => ({
      center: place.location,
      zoom: Math.max(viewport?.zoom ?? 14, 16),
      nonce: (current?.nonce ?? 0) + 1,
    }));
  };

  return (
    <div className="absolute inset-0 h-[100dvh] w-screen overflow-hidden bg-white z-0">
      {mapAvailable ? (
        <FreeMapCanvas
          initialCenter={userPosition!}
          cameraCommand={cameraCommand}
          userPosition={userPosition}
          searchPin={selectedSuggestion}
          searchPinCategory={selectedSuggestionCategory}
          places={places}
          selected={detailPlace}
          onSelect={setSelected}
          onMapPick={(position) => {
            setSelectedSuggestion(null);
            setPendingSuggestion(null);
            setPendingPosition(position);
          }}
          onViewportChange={setViewport}
        />
      ) : (
        <LocationPermissionOverlay status={locationStatus} onRetry={locateMe} />
      )}

      {mapAvailable ? <div data-guide="map-search" className="pointer-events-none absolute inset-x-0 top-[92px] z-10 p-3 md:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-4xl flex-col gap-2 rounded-2xl border border-white/80 bg-white/92 p-2 shadow-xl backdrop-blur lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <div className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-rose-300">
              <MagnifyingGlass size={18} weight="bold" className="shrink-0 text-slate-400" />
              <input
                value={searchValue}
                onChange={(event) => {
                  setSearchValue(event.target.value);
                  setActiveSuggestionIndex(0);
                  if (!event.target.value.trim()) {
                    setSelectedSuggestion(null);
                  }
                }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown' && visibleSuggestions.length > 0) {
                    event.preventDefault();
                    setActiveSuggestionIndex((index) => Math.min(index + 1, visibleSuggestions.length - 1));
                  } else if (event.key === 'ArrowUp' && visibleSuggestions.length > 0) {
                    event.preventDefault();
                    setActiveSuggestionIndex((index) => Math.max(index - 1, 0));
                  } else if (event.key === 'Enter' && visibleSuggestions[activeSuggestionIndex]) {
                    event.preventDefault();
                    selectSuggestion(visibleSuggestions[activeSuggestionIndex]);
                  } else if (event.key === 'Escape') {
                    setSearchFocused(false);
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="Tìm địa điểm, quán cafe, địa chỉ..."
              />
              {searchValue ? (
                <button
                  type="button"
                  aria-label="Xóa tìm kiếm"
                  onClick={() => {
                    setSearchValue('');
                    setSelectedSuggestion(null);
                    setActiveSuggestionIndex(0);
                  }}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={15} weight="bold" />
                </button>
              ) : null}
            </div>
            {showSuggestions ? (
              <div className="absolute left-0 right-0 top-[52px] z-40 max-h-80 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl shadow-slate-900/15">
                {!searchValue.trim() && recentSearches.length > 0 ? (
                  <div className="mb-1 flex items-center justify-between px-3 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-slate-400"><ClockCounterClockwise size={14} /> Gần đây</span>
                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setRecentSearches([]); saveRecentSearches([]); }} className="inline-flex items-center gap-1 text-[11px] font-black text-slate-400 hover:text-rose-500"><Trash size={13} /> Xóa</button>
                  </div>
                ) : null}
                {searchValue.trim().length >= 2 && searchQuery.isFetching ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm font-bold text-slate-500">
                    <Spinner size="sm" />
                    Đang tìm địa chỉ...
                  </div>
                ) : searchValue.trim().length >= 2 && searchQuery.isError ? (
                  <div className="px-3 py-3 text-sm font-bold text-rose-500">
                    Không kết nối được dịch vụ gợi ý. Thử lại sau vài giây.
                  </div>
                ) : visibleSuggestions.length > 0 ? (
                  visibleSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.id}-${suggestion.lat}-${suggestion.lng}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectSuggestion(suggestion)}
                      className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${index === activeSuggestionIndex ? 'bg-rose-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start gap-2.5">
                        {searchValue.trim() ? <MapPin size={18} weight="fill" className="mt-0.5 shrink-0 text-rose-400" /> : <ClockCounterClockwise size={18} weight="bold" className="mt-0.5 shrink-0 text-slate-400" />}
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-black text-slate-900">{suggestion.name || suggestion.displayName}</p>
                          <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-400">
                            {suggestion.address || suggestion.type || 'Địa chỉ'}{suggestion.distanceMeters ? ` · ${formatDistance(suggestion.distanceMeters)}` : ''}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-sm font-bold text-slate-500">Không tìm thấy gợi ý phù hợp.</div>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={locateMe} disabled={locationStatus === 'locating'}>
              <NavigationArrow size={16} weight="fill" />
              {locationStatus === 'locating' ? 'Đang định vị' : 'Vị trí của tôi'}
            </Button>
            <Button size="sm" onClick={openAddPlace} disabled={!mapAvailable}>
              <Plus size={16} weight="bold" />
              Thêm địa điểm
            </Button>
          </div>
          <div className="lg:hidden">
            <MapViewToggle value={viewMode} onChange={changeViewMode} />
          </div>
        </div>
      </div> : null}

      {mapAvailable ? <aside data-guide="map-list" className="absolute bottom-4 left-4 top-[168px] z-10 hidden w-[312px] flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/92 shadow-2xl shadow-slate-900/10 backdrop-blur lg:flex">
        <div className="border-b border-slate-100 p-3">
          <MapViewToggle value={viewMode} onChange={changeViewMode} />
          <div className="mb-2 flex items-center justify-between">
            <p className="mt-3 text-sm font-black text-slate-900">{viewMode === 'saved' ? 'Địa điểm đã lưu' : 'Địa điểm gần bạn'}</p>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
              {activePlacesQuery.isFetching ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" /> : null}
              {places.length} địa điểm
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {CATEGORIES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                title={label}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-black leading-tight transition-colors ${
                  category === id ? CATEGORY_COLORS[id] : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-500'
                }`}
              >
                <Icon size={15} weight={category === id ? 'fill' : 'bold'} />
                <span className="line-clamp-2 text-center">{label}</span>
              </button>
            ))}
          </div>
          <div className="relative mt-2">
            <button type="button" onClick={() => setSortOpen((open) => !open)} className="flex h-10 w-full items-center justify-between rounded-xl border border-white/80 bg-white/75 px-3 text-xs font-black text-slate-800 shadow-sm backdrop-blur-xl">
              <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Sắp xếp</span>
              <span className="inline-flex items-center gap-1.5">{SORTS.find((item) => item.id === sort)?.label}<CaretDown size={14} weight="bold" /></span>
            </button>
            {sortOpen ? <div className="absolute left-0 right-0 top-11 z-30 grid gap-1 rounded-xl border border-white/80 bg-white/90 p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-xl">
              {SORTS.map((item) => <button key={item.id} type="button" onClick={() => { setSort(item.id); setSortOpen(false); }} className={`flex h-9 items-center justify-between rounded-lg px-3 text-xs font-black transition-colors ${sort === item.id ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50'}`}>{item.label}{sort === item.id ? <Check size={14} weight="bold" /> : null}</button>)}
            </div> : null}
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {activePlacesQuery.isLoading ? (
            <div className="flex h-40 items-center justify-center"><Spinner size="md" /></div>
          ) : activePlacesQuery.isError ? (
            <div className="rounded-xl bg-rose-50 p-4 text-center text-sm font-semibold text-rose-600">Không tải được danh sách địa điểm.</div>
          ) : places.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500">{viewMode === 'saved' ? 'Bạn chưa lưu địa điểm nào.' : 'Chưa có địa điểm nào quanh khu vực này.'}</div>
          ) : (
            places.map((place) => (
              <PlaceCard key={placeKey(place)} place={place} active={!!detailPlace && placeKey(detailPlace) === placeKey(place)} onSelect={() => selectPlaceFromList(place)} />
            ))
          )}
        </div>
      </aside> : null}

      {mapAvailable ? <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-2 overflow-x-auto lg:hidden">
        {(viewMode === 'saved' ? places : places.slice(0, 8)).map((place) => (
          <button key={placeKey(place)} type="button" onClick={() => selectPlaceFromList(place)} className="min-w-[240px] rounded-2xl border border-white/80 bg-white/95 p-3 text-left shadow-xl">
            <p className="flex items-center gap-1.5 line-clamp-1 text-sm font-black text-slate-900">{place.visibility === 'COUPLE_PRIVATE' ? <LockKey size={13} weight="fill" className="shrink-0 text-rose-500" /> : null}<span className="truncate">{place.name}</span></p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{formatDistance(place.distanceMeters)} · {CATEGORY_LABEL[place.category]}</p>
          </button>
        ))}
      </div> : null}

      {mapAvailable && detailPlace ? (
        <PlaceDetail
          place={detailPlace}
          onClose={() => setSelected(null)}
          onSaveExternal={() => openExternalPlaceModal(detailPlace)}
          onLike={() => detailPlace._id && reactionMutation.mutate({ id: detailPlace._id, type: 'like', active: !detailPlace.likedByMe })}
          onDislike={() => detailPlace._id && reactionMutation.mutate({ id: detailPlace._id, type: 'dislike', active: !detailPlace.dislikedByMe })}
          onSave={() => detailPlace._id && reactionMutation.mutate({ id: detailPlace._id, type: 'save', active: !detailPlace.savedByMe })}
          onReview={(rating, content, identityMode, nickname) => detailPlace._id && reviewMutation.mutate({ id: detailPlace._id, rating, content, identityMode, nickname })}
          onReport={(reason) => detailPlace._id && reportMutation.mutate({ id: detailPlace._id, reason })}
          busy={busy}
          userPosition={userPosition}
        />
      ) : null}

      {mapAvailable && pendingPosition ? (
        <CreatePlaceModal
          position={pendingPosition}
          onClose={() => {
            setPendingPosition(null);
            setPendingSuggestion(null);
          }}
          onSubmit={(payload) => createMutation.mutate(payload)}
          busy={createMutation.isPending}
          selectedSuggestion={pendingSuggestion}
          initialCategory={pendingSuggestionCategory}
          userPosition={userPosition}
          hasPartner={!!user?.partnerId}
        />
      ) : null}
    </div>
  );
}
