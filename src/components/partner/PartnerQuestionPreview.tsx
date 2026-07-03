import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import type { CoupleQuestionSession } from '../../types/shared';
import { useSubscription } from '../../hooks/useSubscription';

interface PartnerQuestionPreviewProps {
  enabled: boolean;
  variant: 'female' | 'male';
}

function statusLabel(question: CoupleQuestionSession) {
  if (question.unlocked) return 'Đã mở câu trả lời';
  if (question.myAnswer) return 'Đang chờ Người ấy';
  return 'Chưa trả lời';
}

export default function PartnerQuestionPreview({ enabled, variant }: PartnerQuestionPreviewProps) {
  const { data: subscription } = useSubscription();
  const hasCouplePremium = subscription?.couplePremium === true;
  const questionQuery = useQuery({
    queryKey: ['partner-question-today'],
    queryFn: () => api.get('/partner/questions/today').then(({ data }) => data.question as CoupleQuestionSession),
    enabled: enabled && hasCouplePremium,
    staleTime: 60_000,
  });

  if (!enabled) return null;

  const accent = variant === 'male'
    ? 'border-blue-100 bg-blue-50/80 text-blue-600'
    : 'border-pink-100 bg-pink-50/80 text-pink-600';

  return (
    <Link
      to="/partner"
      className={`mt-4 block rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm ${accent}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em]">Câu hỏi của chúng mình</p>
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </div>
      {!hasCouplePremium ? (
        <>
          <p className="mt-2 text-sm font-black leading-snug text-slate-800">Mở kết nối sâu hơn mỗi ngày</p>
          <p className="mt-2 text-[11px] font-bold opacity-75">Hi Pro hoặc Hi Max của một người mở quyền cho cả hai</p>
        </>
      ) : questionQuery.isLoading ? (
        <div className="mt-3 space-y-2 animate-pulse">
          <div className="h-3 w-full rounded bg-current opacity-10" />
          <div className="h-3 w-3/4 rounded bg-current opacity-10" />
        </div>
      ) : questionQuery.data ? (
        <>
          <p className="mt-2 line-clamp-2 text-sm font-black leading-snug text-slate-800">
            {questionQuery.data.questionText}
          </p>
          <p className="mt-2 text-[11px] font-bold opacity-75">{statusLabel(questionQuery.data)}</p>
        </>
      ) : (
        <p className="mt-2 text-sm font-bold text-slate-600">Mở không gian của hai bạn</p>
      )}
    </Link>
  );
}
