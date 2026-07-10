import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { HealthVideo, HealthVideoStatus, HealthVideoTargetAudience, UpsertHealthVideoDto } from '../../types/shared';
import api from '../../lib/api';
import { getUserFacingError } from '../../lib/userFacingError';

const EMPTY_FORM: UpsertHealthVideoDto = {
  youtubeVideoId: '',
  title: '',
  description: '',
  channelName: '',
  topicTags: [],
  interestTags: [],
  goalTags: [],
  phaseTags: [],
  language: 'vi',
  priority: 0,
  status: 'DRAFT',
  targetAudience: 'BOTH',
};

function tagsToText(tags?: string[]) {
  return (tags ?? []).join(', ');
}

function textToTags(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function extractYouTubeVideoId(value: string) {
  const cleaned = value.trim();
  if (/^[A-Za-z0-9_-]{6,20}$/.test(cleaned)) return cleaned;
  const match = cleaned.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/)
    ?? cleaned.match(/[?&]v=([A-Za-z0-9_-]{6,20})/);
  return match?.[1] ?? '';
}

type TagField = 'topicTags' | 'interestTags' | 'goalTags' | 'phaseTags';

export default function HealthVideoAdminPanel() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UpsertHealthVideoDto>(EMPTY_FORM);
  const [tagText, setTagText] = useState<Record<TagField, string>>({
    topicTags: '',
    interestTags: '',
    goalTags: '',
    phaseTags: '',
  });
  const videosQuery = useQuery<HealthVideo[]>({
    queryKey: ['admin-health-videos'],
    queryFn: () => api.get('/admin/health-videos').then(({ data }) => data.videos ?? []),
  });

  const reset = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTagText({ topicTags: '', interestTags: '', goalTags: '', phaseTags: '' });
  };

  const buildPayload = () => {
    const youtubeVideoId = extractYouTubeVideoId(form.youtubeVideoId);
    if (!youtubeVideoId) throw new Error('YouTube URL hoặc video ID không hợp lệ');
    return {
      ...form,
      youtubeVideoId,
      topicTags: textToTags(tagText.topicTags),
      interestTags: textToTags(tagText.interestTags),
      goalTags: textToTags(tagText.goalTags),
      phaseTags: textToTags(tagText.phaseTags),
      targetAudience: form.targetAudience ?? 'BOTH',
    };
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload();
      return editingId
        ? api.put(`/admin/health-videos/${editingId}`, payload)
        : api.post('/admin/health-videos', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Đã cập nhật video' : 'Đã thêm video');
      queryClient.invalidateQueries({ queryKey: ['admin-health-videos'] });
      queryClient.invalidateQueries({ queryKey: ['health-video-recommendations'] });
      reset();
    },
    onError: (error: unknown) => toast.error(getUserFacingError(error, 'Không thể lưu video')),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/health-videos/${id}`),
    onSuccess: () => {
      toast.success('Đã ẩn video');
      queryClient.invalidateQueries({ queryKey: ['admin-health-videos'] });
      queryClient.invalidateQueries({ queryKey: ['health-video-recommendations'] });
    },
    onError: () => toast.error('Không thể ẩn video'),
  });

  const edit = (video: HealthVideo) => {
    setEditingId(video._id);
    setForm({
      youtubeVideoId: video.youtubeVideoId,
      title: video.title,
      description: video.description ?? '',
      channelName: video.channelName,
      topicTags: video.topicTags,
      interestTags: video.interestTags,
      goalTags: video.goalTags,
      phaseTags: video.phaseTags,
      language: video.language,
      priority: video.priority,
      status: video.status,
      targetAudience: video.targetAudience ?? 'BOTH',
    });
    setTagText({
      topicTags: tagsToText(video.topicTags),
      interestTags: tagsToText(video.interestTags),
      goalTags: tagsToText(video.goalTags),
      phaseTags: tagsToText(video.phaseTags),
    });
  };

  const extractedVideoId = extractYouTubeVideoId(form.youtubeVideoId);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(320px,.9fr)_minmax(0,1.1fr)]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-3 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm"
      >
        <div>
          <h2 className="text-base font-bold text-slate-800">{editingId ? 'Sửa video' : 'Thêm video kiểm duyệt'}</h2>
          <p className="mt-1 text-[11px] text-slate-400">Chỉ nhập video từ nguồn uy tín và cho phép nhúng công khai.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="YouTube URL hoặc ID" value={form.youtubeVideoId} onChange={(value) => setForm((current) => ({ ...current, youtubeVideoId: value }))} required />
          <Field label="Tên kênh" value={form.channelName} onChange={(value) => setForm((current) => ({ ...current, channelName: value }))} required />
        </div>
        {form.youtubeVideoId.trim() && (
          <p className={`-mt-1 text-[11px] font-bold ${extractedVideoId ? 'text-slate-400' : 'text-red-500'}`}>
            {extractedVideoId ? `ID đã nhận: ${extractedVideoId}` : 'Dán link YouTube hợp lệ hoặc nhập video ID, ví dụ dQw4w9WgXcQ.'}
          </p>
        )}
        <Field label="Tiêu đề" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} required />
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mô tả</span>
          <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Chủ đề, cách nhau bằng dấu phẩy" value={tagText.topicTags} onChange={(value) => setTagText((current) => ({ ...current, topicTags: value }))} />
          <Field label="Sở thích onboarding" value={tagText.interestTags} onChange={(value) => setTagText((current) => ({ ...current, interestTags: value }))} />
          <Field label="Mục tiêu onboarding" value={tagText.goalTags} onChange={(value) => setTagText((current) => ({ ...current, goalTags: value }))} />
          <Field label="Phase chu kỳ" value={tagText.phaseTags} onChange={(value) => setTagText((current) => ({ ...current, phaseTags: value }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Ngôn ngữ" value={form.language ?? 'vi'} onChange={(value) => setForm((current) => ({ ...current, language: value }))} />
          <Field label="Ưu tiên" type="number" value={String(form.priority ?? 0)} onChange={(value) => setForm((current) => ({ ...current, priority: Number(value) }))} />
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Trạng thái</span>
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as HealthVideoStatus }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300">
              <option value="DRAFT">Nháp</option>
              <option value="PUBLISHED">Đã duyệt</option>
              <option value="ARCHIVED">Đã ẩn</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Hiển thị cho</span>
            <select value={form.targetAudience ?? 'BOTH'} onChange={(event) => setForm((current) => ({ ...current, targetAudience: event.target.value as HealthVideoTargetAudience }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300">
              <option value="BOTH">Cả hai</option>
              <option value="FEMALE">User nữ</option>
              <option value="MALE">User nam</option>
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saveMutation.isPending} className="hi-btn-primary rounded-xl px-4 py-2.5 text-sm font-bold">
            {saveMutation.isPending ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm video'}
          </button>
          {editingId && <button type="button" onClick={reset} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">Hủy</button>}
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-800">Danh mục video</h2>
          <p className="mt-1 text-[11px] text-slate-400">Dashboard người dùng chỉ hiển thị video ở trạng thái Đã duyệt và đúng nhóm user.</p>
        </div>
        {videosQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">Đang tải...</p>
        ) : (videosQuery.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">Chưa có video.</p>
        ) : (
          <div className="space-y-3">
            {(videosQuery.data ?? []).map((video) => (
              <article key={video._id} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                <img src={video.thumbnailUrl} alt="" className="h-20 w-32 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-bold text-slate-800">{video.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{video.channelName} · {video.language.toUpperCase()} · ưu tiên {video.priority}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${video.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600' : video.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'}`}>
                      {video.status}
                    </span>
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                      {video.targetAudience === 'FEMALE' ? 'User nữ' : video.targetAudience === 'MALE' ? 'User nam' : 'Cả hai'}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button type="button" onClick={() => edit(video)} className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-500">Sửa</button>
                  {video.status !== 'ARCHIVED' && <button type="button" onClick={() => archiveMutation.mutate(video._id)} className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-bold text-slate-400 hover:bg-red-50 hover:text-red-500">Ẩn</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300" />
    </label>
  );
}
