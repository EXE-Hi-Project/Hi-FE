import { useEffect, useMemo, useState } from 'react';
import {
  BookmarkSimple,
  CaretLeft,
  CaretRight,
  Eye,
  EyeSlash,
  Heart,
  LockKey,
  MagnifyingGlass,
  Pencil,
  Star,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import type {
  AdminCouplePlace,
  AdminCouplePlaceReviewPage,
  CouplePlaceReport,
  CouplePlaceReview,
  CouplePlaceStatus,
} from '../../types/shared';
import { PLACE_CATEGORY_META, PLACE_CATEGORY_ORDER } from '../couple-map/placeCategoryMeta';
import AdminMapCanvas, { CameraCommand, LatLng, MapBounds, MapViewport } from './AdminMapCanvas';
import AdminPanelSkeleton from './AdminPanelSkeleton';
import Spinner from '../ui/Spinner';

const HCMC_CENTER: LatLng = { lat: 10.7769, lng: 106.7009 };
type DetailTab = 'INFO' | 'REVIEWS';
type ReviewFilter = 'ALL' | 'PUBLISHED' | 'HIDDEN';

function isWithinMapBounds(position: LatLng, bounds: MapBounds) {
  const inLatitude = position.lat >= bounds.south && position.lat <= bounds.north;
  const inLongitude = bounds.west <= bounds.east
    ? position.lng >= bounds.west && position.lng <= bounds.east
    : position.lng >= bounds.west || position.lng <= bounds.east;
  return inLatitude && inLongitude;
}

function isPrivate(place: AdminCouplePlace) {
  return place.visibility === 'COUPLE_PRIVATE' || place.metadataOnly === true;
}

function matchesSearch(place: AdminCouplePlace, query: string) {
  if (!query) return true;
  const meta = PLACE_CATEGORY_META[place.category] ?? PLACE_CATEGORY_META.OTHER;
  return [place.name, place.description, place.location?.address, place.createdByName, meta.label, place.status]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('vi')
    .includes(query);
}

export default function CouplePlacesAdminPanel() {
  const queryClient = useQueryClient();
  const [selectedPlace, setSelectedPlace] = useState<AdminCouplePlace | null>(null);
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailTab, setDetailTab] = useState<DetailTab>('INFO');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('ALL');
  const [reviewPage, setReviewPage] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('OTHER');
  const [editDescription, setEditDescription] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const placesQuery = useQuery({
    queryKey: ['admin-couple-places'],
    queryFn: () => api.get('/admin/couple-places').then((response) => response.data.places as AdminCouplePlace[]),
    refetchOnWindowFocus: false,
  });
  const reportsQuery = useQuery({
    queryKey: ['admin-couple-place-reports'],
    queryFn: () => api.get('/admin/couple-places/reports').then((response) => response.data.reports as CouplePlaceReport[]),
    refetchOnWindowFocus: false,
  });

  const selectedIsPrivate = selectedPlace ? isPrivate(selectedPlace) : false;
  const reviewsQuery = useQuery({
    queryKey: ['admin-couple-place-reviews', selectedPlace?._id, reviewPage, reviewFilter],
    queryFn: () => api.get(`/admin/couple-places/${selectedPlace!._id}/reviews`, {
      params: { page: reviewPage, limit: 20, status: reviewFilter === 'ALL' ? undefined : reviewFilter },
    }).then((response) => response.data.reviews as AdminCouplePlaceReviewPage),
    enabled: Boolean(selectedPlace?._id && !selectedIsPrivate && detailTab === 'REVIEWS'),
    placeholderData: (previous) => previous,
  });

  const refreshPlaces = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-couple-places'] });
    queryClient.invalidateQueries({ queryKey: ['admin-couple-place-reports'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: CouplePlaceStatus }) =>
      api.patch(`/admin/couple-places/${id}/status`, null, { params: { status } }).then((response) => response.data.place as AdminCouplePlace),
    onSuccess: (updatedPlace) => {
      toast.success('Đã cập nhật trạng thái địa điểm');
      refreshPlaces();
      if (selectedPlace?._id === updatedPlace._id) setSelectedPlace(updatedPlace);
    },
    onError: () => toast.error('Không cập nhật được trạng thái địa điểm'),
  });

  const updatePlaceMutation = useMutation({
    mutationFn: ({ id, name, category, description, address }: { id: number; name: string; category: string; description: string; address: string }) =>
      api.put(`/admin/couple-places/${id}`, { name, category, description, address }).then((response) => response.data.place as AdminCouplePlace),
    onSuccess: (updatedPlace) => {
      toast.success('Đã cập nhật thông tin địa điểm');
      setIsEditing(false);
      refreshPlaces();
      setSelectedPlace(updatedPlace);
    },
    onError: () => toast.error('Không thể cập nhật thông tin địa điểm'),
  });

  const deletePlaceMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/couple-places/${id}`),
    onSuccess: () => {
      toast.success('Đã xóa vĩnh viễn địa điểm');
      setSelectedPlace(null);
      refreshPlaces();
    },
    onError: () => toast.error('Không thể xóa địa điểm này'),
  });

  const reviewStatusMutation = useMutation({
    mutationFn: ({ placeId, reviewId, status }: { placeId: number; reviewId: number; status: 'PUBLISHED' | 'HIDDEN' }) =>
      api.patch(`/admin/couple-places/${placeId}/reviews/${reviewId}/status`, null, { params: { status } }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái review');
      queryClient.invalidateQueries({ queryKey: ['admin-couple-place-reviews', selectedPlace?._id] });
      queryClient.invalidateQueries({ queryKey: ['admin-couple-places'] });
    },
    onError: () => toast.error('Không thể cập nhật review'),
  });

  const places = placesQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('vi');
  const searchedPlaces = useMemo(
    () => places.filter((place) => matchesSearch(place, normalizedSearch)),
    [normalizedSearch, places],
  );
  const privatePlaces = useMemo(() => searchedPlaces.filter(isPrivate), [searchedPlaces]);
  const mapPlaces = useMemo(
    () => searchedPlaces.filter((place) => {
      if (isPrivate(place) || !place.location) return false;
      return !viewport || isWithinMapBounds(place.location, viewport.bounds);
    }),
    [searchedPlaces, viewport?.bounds.east, viewport?.bounds.north, viewport?.bounds.south, viewport?.bounds.west],
  );
  const initialCenter = useMemo(() => {
    const first = places.find((place) => !isPrivate(place) && place.location);
    return first?.location ? { lat: first.location.lat, lng: first.location.lng } : HCMC_CENTER;
  }, [places]);

  useEffect(() => {
    if (!selectedPlace) return;
    const updated = places.find((place) => place._id === selectedPlace._id);
    if (updated) setSelectedPlace(updated);
  }, [places]);

  useEffect(() => {
    setDetailTab('INFO');
    setReviewFilter('ALL');
    setReviewPage(0);
    setIsEditing(false);
    if (!selectedPlace) return;
    setEditName(selectedPlace.name);
    setEditCategory(selectedPlace.category);
    setEditDescription(selectedPlace.description ?? '');
    setEditAddress(selectedPlace.location?.address ?? '');
  }, [selectedPlace?._id]);

  if (placesQuery.isLoading || reportsQuery.isLoading) return <AdminPanelSkeleton />;

  const selectedReports = selectedPlace && !selectedIsPrivate
    ? reports.filter((report) => report.placeId === selectedPlace._id)
    : [];
  const publishedCount = places.filter((place) => place.status === 'PUBLISHED').length;
  const hiddenCount = places.filter((place) => place.status === 'HIDDEN').length;

  const handleSelectPlace = (place: AdminCouplePlace) => {
    setSelectedPlace(place);
    if (!isPrivate(place) && place.location) {
      setCameraCommand((current) => ({
        center: { lat: place.location!.lat, lng: place.location!.lng },
        zoom: Math.max(viewport?.zoom ?? 14, 16),
        nonce: (current?.nonce ?? 0) + 1,
      }));
    }
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-slate-100 font-sans">
      <div className="relative z-0 min-h-0 flex-1">
        <AdminMapCanvas
          initialCenter={initialCenter}
          cameraCommand={cameraCommand}
          places={mapPlaces}
          selected={selectedPlace}
          onSelect={handleSelectPlace}
          onViewportChange={setViewport}
        />

        <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center gap-2 md:left-4 md:right-auto">
          <div className="rounded-2xl border border-white/80 bg-white/90 px-3 py-2 shadow-xl backdrop-blur-xl">
            <p className="text-xs font-black text-slate-950">Bản đồ quản trị địa điểm</p>
            <p className="mt-0.5 text-[11px] font-bold text-slate-500">
              {publishedCount} public · {privatePlaces.length} private · {hiddenCount} ẩn · {reports.length} report
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute left-4 top-24 z-10 hidden w-[326px] flex-col gap-2 lg:flex">
          <div className="pointer-events-auto rounded-2xl border border-white/80 bg-white/72 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
            <div className="flex h-11 items-center gap-2 rounded-xl border border-white/80 bg-white/75 px-3 focus-within:border-rose-200">
              <MagnifyingGlass size={18} weight="bold" className="shrink-0 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="Tìm địa điểm, người đóng góp..."
              />
              {searchQuery && (
                <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setSearchQuery('')} className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-700">
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
          </div>

          <div className="pointer-events-auto max-h-[calc(100vh-190px)] space-y-3 overflow-y-auto rounded-2xl border border-white/70 bg-white/55 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
            <PlaceGroup
              title="Trong khung bản đồ"
              places={mapPlaces}
              selectedId={selectedPlace?._id}
              loading={placesQuery.isFetching}
              onSelect={handleSelectPlace}
            />
            {privatePlaces.length > 0 && (
              <PlaceGroup
                title="Metadata riêng tư"
                places={privatePlaces}
                selectedId={selectedPlace?._id}
                onSelect={handleSelectPlace}
              />
            )}
          </div>
        </div>
      </div>

      {selectedPlace && (
        <aside className="absolute bottom-3 right-3 top-3 z-20 flex w-[calc(100%-24px)] flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/92 shadow-2xl backdrop-blur-xl md:w-[390px]">
          <div className="shrink-0 p-3.5 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: (PLACE_CATEGORY_META[selectedPlace.category] ?? PLACE_CATEGORY_META.OTHER).color }}>
                  {selectedIsPrivate && <LockKey size={12} weight="fill" />}
                  {selectedIsPrivate ? 'Chỉ hai người · metadata' : (PLACE_CATEGORY_META[selectedPlace.category] ?? PLACE_CATEGORY_META.OTHER).label}
                </div>
                <h2 className="mt-1 truncate text-base font-black text-slate-950">{selectedPlace.name}</h2>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                  {selectedIsPrivate ? 'Địa chỉ được bảo vệ' : selectedPlace.location?.address || 'Không có địa chỉ cụ thể'}
                </p>
              </div>
              <button type="button" aria-label="Đóng" onClick={() => setSelectedPlace(null)} className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200">
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1.5 text-center">
              <Stat icon={<Star size={15} weight="fill" className="text-amber-400" />} value={selectedPlace.userRatingAvg?.toFixed(1) ?? 'N/A'} label={`${selectedPlace.reviewCount ?? 0} review`} />
              <Stat icon={<Heart size={15} weight="fill" className="text-rose-500" />} value={selectedPlace.likeCount ?? 0} label="Yêu thích" border />
              <Stat icon={<BookmarkSimple size={15} weight="fill" className="text-sky-500" />} value={selectedPlace.saveCount ?? 0} label="Đã lưu" />
            </div>

            {!isEditing && !selectedIsPrivate && (
              <div className="mt-3 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-black">
                <button type="button" onClick={() => setDetailTab('INFO')} className={`h-8 rounded-lg ${detailTab === 'INFO' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Thông tin</button>
                <button type="button" onClick={() => setDetailTab('REVIEWS')} className={`h-8 rounded-lg ${detailTab === 'REVIEWS' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Reviews ({selectedPlace.reviewCount ?? 0})</button>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3">
            {selectedIsPrivate ? (
              <PrivateMetadata place={selectedPlace} />
            ) : detailTab === 'REVIEWS' && !isEditing ? (
              <ReviewsPanel
                data={reviewsQuery.data}
                loading={reviewsQuery.isLoading}
                filter={reviewFilter}
                page={reviewPage}
                pending={reviewStatusMutation.isPending}
                onFilter={(filter) => { setReviewFilter(filter); setReviewPage(0); }}
                onPage={setReviewPage}
                onStatus={(review, status) => selectedPlace._id && reviewStatusMutation.mutate({ placeId: selectedPlace._id, reviewId: review._id, status })}
              />
            ) : (
              <InfoPanel
                place={selectedPlace}
                reports={selectedReports}
                editing={isEditing}
                editName={editName}
                editCategory={editCategory}
                editDescription={editDescription}
                editAddress={editAddress}
                onName={setEditName}
                onCategory={setEditCategory}
                onDescription={setEditDescription}
                onAddress={setEditAddress}
              />
            )}
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white/80 p-3">
            {isEditing ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={updatePlaceMutation.isPending} onClick={() => selectedPlace._id && updatePlaceMutation.mutate({ id: selectedPlace._id, name: editName, category: editCategory, description: editDescription, address: editAddress })} className="h-9 rounded-xl bg-pink-600 text-xs font-bold text-white disabled:opacity-50">Lưu thay đổi</button>
                <button type="button" onClick={() => setIsEditing(false)} className="h-9 rounded-xl bg-slate-200 text-xs font-bold text-slate-700">Hủy</button>
              </div>
            ) : (
              <div className="space-y-2">
                {!selectedIsPrivate && detailTab === 'INFO' && (
                  <button type="button" onClick={() => setIsEditing(true)} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50/50 text-xs font-bold text-pink-700">
                    <Pencil size={15} weight="bold" /> Chỉnh sửa thông tin
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={statusMutation.isPending} onClick={() => selectedPlace._id && statusMutation.mutate({ id: selectedPlace._id, status: selectedPlace.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED' })} className={`flex h-9 items-center justify-center gap-1.5 rounded-xl text-[11px] font-bold text-white ${selectedPlace.status === 'PUBLISHED' ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                    {selectedPlace.status === 'PUBLISHED' ? <EyeSlash size={15} weight="bold" /> : <Eye size={15} weight="bold" />}
                    {selectedPlace.status === 'PUBLISHED' ? 'Ẩn địa điểm' : 'Hiện địa điểm'}
                  </button>
                  <button type="button" disabled={deletePlaceMutation.isPending} onClick={() => selectedPlace._id && window.confirm(`Xóa vĩnh viễn địa điểm "${selectedPlace.name}"?`) && deletePlaceMutation.mutate(selectedPlace._id)} className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-rose-600 text-[11px] font-bold text-white">
                    <Trash size={15} weight="fill" /> Xóa vĩnh viễn
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function PlaceGroup({ title, places, selectedId, loading, onSelect }: { title: string; places: AdminCouplePlace[]; selectedId?: number; loading?: boolean; onSelect: (place: AdminCouplePlace) => void }) {
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between px-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
        <span>{title}</span><span>{places.length}</span>
      </div>
      <div className="space-y-2">
        {loading ? <div className="flex h-20 items-center justify-center rounded-xl bg-white/70"><Spinner size="sm" /></div> : places.length === 0 ? (
          <div className="flex h-20 items-center justify-center rounded-xl bg-white/70 px-4 text-center text-xs font-bold text-slate-500">Không tìm thấy địa điểm nào.</div>
        ) : places.slice(0, 24).map((place) => <PlaceListCard key={place._id} place={place} active={selectedId === place._id} onClick={() => onSelect(place)} />)}
      </div>
    </section>
  );
}

function PlaceListCard({ place, active, onClick }: { place: AdminCouplePlace; active: boolean; onClick: () => void }) {
  const meta = PLACE_CATEGORY_META[place.category] ?? PLACE_CATEGORY_META.OTHER;
  const Icon = meta.Icon;
  const privatePlace = isPrivate(place);
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-xl border p-2.5 text-left shadow-sm transition-colors ${active ? 'border-rose-300 bg-white' : 'border-white/70 bg-white/75 hover:bg-white'}`}>
      <div className="flex items-start gap-2.5">
        <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ color: meta.color, background: meta.soft }}>
          <Icon size={18} weight="fill" />
          {privatePlace && <span className="absolute -right-1 -top-1 rounded-full bg-slate-900 p-0.5 text-white"><LockKey size={9} weight="fill" /></span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black" style={{ color: meta.color }}>{place.name}</span>
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{privatePlace ? `Tạo bởi ${place.createdByName || 'Ẩn danh'}` : place.location?.address || meta.label}</span>
          <span className="mt-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400"><span>{privatePlace ? 'Private' : meta.label}</span><span>·</span><span>{place.status}</span></span>
        </span>
      </div>
    </button>
  );
}

function Stat({ icon, value, label, border }: { icon: React.ReactNode; value: string | number; label: string; border?: boolean }) {
  return <div className={`flex flex-col items-center py-1 ${border ? 'border-x border-slate-200' : ''}`}>{icon}<span className="mt-0.5 text-xs font-black text-slate-900">{value}</span><span className="text-[8px] font-bold uppercase text-slate-400">{label}</span></div>;
}

function PrivateMetadata({ place }: { place: AdminCouplePlace }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
      <div className="flex items-center gap-2 font-black text-slate-800"><LockKey size={17} weight="fill" /> Nội dung riêng tư đã được ẩn</div>
      <p className="leading-relaxed text-slate-500">Admin chỉ xem metadata phục vụ vận hành. Tọa độ, địa chỉ, mô tả, ảnh và nội dung review không được gửi về giao diện này.</p>
      <dl className="grid grid-cols-2 gap-2">
        <Metadata label="Người tạo" value={place.createdByName || 'Ẩn danh'} />
        <Metadata label="Danh mục" value={(PLACE_CATEGORY_META[place.category] ?? PLACE_CATEGORY_META.OTHER).label} />
        <Metadata label="Review" value={place.reviewCount ?? 0} />
        <Metadata label="Báo cáo" value={place.reportCount ?? 0} />
        <Metadata label="Ngày tạo" value={formatDate(place.createdAt)} />
        <Metadata label="Cập nhật" value={formatDate(place.updatedAt)} />
      </dl>
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-white p-2"><dt className="text-[9px] font-black uppercase text-slate-400">{label}</dt><dd className="mt-0.5 truncate font-bold text-slate-700">{value}</dd></div>;
}

function InfoPanel({ place, reports, editing, editName, editCategory, editDescription, editAddress, onName, onCategory, onDescription, onAddress }: { place: AdminCouplePlace; reports: CouplePlaceReport[]; editing: boolean; editName: string; editCategory: string; editDescription: string; editAddress: string; onName: (value: string) => void; onCategory: (value: string) => void; onDescription: (value: string) => void; onAddress: (value: string) => void }) {
  if (editing) return (
    <div className="space-y-3">
      <Field label="Tên địa điểm"><input value={editName} onChange={(event) => onName(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-pink-300" /></Field>
      <Field label="Địa chỉ"><input value={editAddress} onChange={(event) => onAddress(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-pink-300" /></Field>
      <Field label="Danh mục"><select value={editCategory} onChange={(event) => onCategory(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold">{PLACE_CATEGORY_ORDER.map((category) => <option key={category} value={category}>{PLACE_CATEGORY_META[category].label}</option>)}</select></Field>
      <Field label="Mô tả"><textarea rows={4} value={editDescription} onChange={(event) => onDescription(event.target.value)} className="w-full resize-none rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-pink-300" /></Field>
    </div>
  );
  return (
    <div className="space-y-3 text-xs">
      {place.description && <section><p className="text-[10px] font-black uppercase text-slate-400">Mô tả</p><p className="mt-1 rounded-xl border border-slate-100 bg-white p-3 leading-relaxed text-slate-600">{place.description}</p></section>}
      <section><p className="text-[10px] font-black uppercase text-slate-400">Người đóng góp</p><p className="mt-1 font-black text-slate-700">{place.createdByName || 'Hệ thống Hi Lover'}</p></section>
      {reports.length > 0 && <section className="rounded-xl border border-rose-100 bg-rose-50/60 p-2.5"><div className="flex items-center gap-1.5 font-black text-rose-700"><WarningCircle size={15} weight="fill" /> Báo cáo ({reports.length})</div><div className="mt-2 divide-y divide-rose-100">{reports.map((report) => <div key={report._id} className="py-2 text-[10px]"><p className="font-semibold text-rose-900">{report.reason}</p><p className="mt-0.5 font-bold text-rose-400">Bởi {report.userName || 'Ẩn danh'}</p></div>)}</div></section>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{label}</span>{children}</label>;
}

function ReviewsPanel({ data, loading, filter, page, pending, onFilter, onPage, onStatus }: { data?: AdminCouplePlaceReviewPage; loading: boolean; filter: ReviewFilter; page: number; pending: boolean; onFilter: (filter: ReviewFilter) => void; onPage: (page: number) => void; onStatus: (review: CouplePlaceReview, status: 'PUBLISHED' | 'HIDDEN') => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-[10px] font-black">{(['ALL', 'PUBLISHED', 'HIDDEN'] as const).map((item) => <button key={item} type="button" onClick={() => onFilter(item)} className={`h-8 rounded-lg ${filter === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>{item === 'ALL' ? 'Tất cả' : item === 'PUBLISHED' ? 'Đang hiện' : 'Đang ẩn'}</button>)}</div>
      {loading ? <div className="flex h-28 items-center justify-center"><Spinner size="sm" /></div> : !data?.items.length ? <div className="rounded-xl bg-slate-50 p-8 text-center text-xs font-bold text-slate-500">Chưa có review phù hợp.</div> : <div className="space-y-2">{data.items.map((review) => <article key={review._id} className="rounded-xl border border-slate-100 bg-white p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-black text-slate-800">{review.userName || 'Ẩn danh'}</p><p className="mt-0.5 text-[10px] font-bold text-amber-500">{'★'.repeat(review.rating)} <span className="text-slate-400">· {formatDate(review.createdAt)}</span></p></div><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${review.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{review.status}</span></div>{review.content && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{review.content}</p>}<button type="button" disabled={pending} onClick={() => onStatus(review, review.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED')} className="mt-2 flex h-7 items-center gap-1 rounded-lg bg-slate-100 px-2 text-[10px] font-bold text-slate-600 disabled:opacity-50">{review.status === 'PUBLISHED' ? <EyeSlash size={12} /> : <Eye size={12} />}{review.status === 'PUBLISHED' ? 'Ẩn review' : 'Hiện review'}</button></article>)}</div>}
      {data && data.total > data.limit && <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400">Trang {page + 1} · {data.total} review</span><div className="flex gap-1"><button type="button" aria-label="Trang trước" disabled={page === 0} onClick={() => onPage(page - 1)} className="rounded-lg bg-slate-100 p-2 disabled:opacity-40"><CaretLeft size={13} /></button><button type="button" aria-label="Trang sau" disabled={!data.hasMore} onClick={() => onPage(page + 1)} className="rounded-lg bg-slate-100 p-2 disabled:opacity-40"><CaretRight size={13} /></button></div></div>}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
