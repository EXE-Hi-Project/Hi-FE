import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HealthVideo } from '../../types/shared';
import api from '../../lib/api';
import ResponsiveModal from '../ui/ResponsiveModal';

const VIDEOS_PER_PAGE = 3;

export default function HealthVideoSection() {
  const [selectedVideo, setSelectedVideo] = useState<HealthVideo | null>(null);
  const [page, setPage] = useState(0);
  const videosQuery = useQuery<HealthVideo[]>({
    queryKey: ['health-video-recommendations'],
    queryFn: () => api.get('/health-videos/recommendations', { params: { limit: 18 } }).then(({ data }) => data.videos ?? []),
  });
  const videos = videosQuery.data ?? [];
  const totalPages = Math.max(1, Math.ceil(videos.length / VIDEOS_PER_PAGE));
  const pageVideos = useMemo(
    () => videos.slice(page * VIDEOS_PER_PAGE, page * VIDEOS_PER_PAGE + VIDEOS_PER_PAGE),
    [page, videos],
  );

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(totalPages - 1, 0));
  }, [page, totalPages]);

  const canPage = videos.length > VIDEOS_PER_PAGE;
  const goPrevious = () => setPage((current) => Math.max(current - 1, 0));
  const goNext = () => setPage((current) => Math.min(current + 1, totalPages - 1));

  return (
    <>
      <section className="md:col-span-4 rounded-3xl border border-white/80 bg-white/90 p-7 shadow-sm backdrop-blur-sm">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Video dành cho bạn</h3>
            <p className="mt-1 text-sm text-slate-500">Video công khai từ nguồn được duyệt, phát bằng trình nhúng chính thức của YouTube.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-rose-500">Ưu tiên nội dung tiếng Việt</span>
            {canPage && (
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500">
                {page + 1}/{totalPages}
              </span>
            )}
          </div>
        </div>

        {videosQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
            <span className="material-symbols-outlined text-3xl text-slate-300">video_library</span>
            <p className="mt-2 text-sm font-bold text-slate-700">Nội dung đang được tuyển chọn</p>
            <p className="mt-1 text-xs text-slate-500">Video sẽ xuất hiện sau khi quản trị viên duyệt nguồn phù hợp.</p>
          </div>
        ) : (
          <div className="relative">
            {canPage && (
              <>
                <button
                  type="button"
                  onClick={goPrevious}
                  disabled={page === 0}
                  className="absolute -left-4 top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-white/95 text-slate-500 shadow-lg transition-all hover:-translate-x-0.5 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-35 lg:flex"
                  aria-label="Video trước"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={page >= totalPages - 1}
                  className="absolute -right-4 top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-white/95 text-slate-500 shadow-lg transition-all hover:translate-x-0.5 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-35 lg:flex"
                  aria-label="Video sau"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              {pageVideos.map((video) => (
                <button
                  key={video._id}
                  type="button"
                  onClick={() => setSelectedVideo(video)}
                  className="group overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="relative aspect-video overflow-hidden bg-slate-100">
                    <img src={video.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    <span className="material-symbols-outlined absolute left-3 top-3 flex size-10 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-sm">play_arrow</span>
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm font-extrabold leading-snug text-slate-800">{video.title}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(video.topicTags ?? []).slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-500">{tag}</span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-500">Nguồn: {video.channelName}</p>
                  </div>
                </button>
              ))}
            </div>

            {canPage && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={goPrevious}
                  disabled={page === 0}
                  className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm disabled:opacity-35 lg:hidden"
                  aria-label="Video trước"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <div className="flex gap-1.5">
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setPage(index)}
                      className={`h-2 rounded-full transition-all ${index === page ? 'w-6 bg-rose-400' : 'w-2 bg-slate-200 hover:bg-rose-200'}`}
                      aria-label={`Trang video ${index + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={page >= totalPages - 1}
                  className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm disabled:opacity-35 lg:hidden"
                  aria-label="Video sau"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <ResponsiveModal
        open={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        title={selectedVideo?.title ?? 'Video sức khỏe'}
        description={selectedVideo?.channelName}
        icon="play_circle"
        maxWidthClassName="sm:max-w-4xl"
        footer={selectedVideo && (
          <div className="flex justify-end">
            <a
              href={selectedVideo.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="hi-btn-primary rounded-xl px-5 py-3 text-sm font-bold"
            >
              Xem trên YouTube
            </a>
          </div>
        )}
      >
        {selectedVideo && (
          <div className="bg-slate-950 p-3 sm:p-5">
            <div className="aspect-video overflow-hidden rounded-2xl bg-black">
              <iframe
                title={selectedVideo.title}
                src={`https://www.youtube-nocookie.com/embed/${selectedVideo.youtubeVideoId}?rel=0`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-200">Nguồn: {selectedVideo.channelName}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Video được phát bằng trình nhúng chính thức của YouTube. Nếu video không phát trong ứng dụng, hãy mở nguồn trên YouTube.
            </p>
          </div>
        )}
      </ResponsiveModal>
    </>
  );
}
