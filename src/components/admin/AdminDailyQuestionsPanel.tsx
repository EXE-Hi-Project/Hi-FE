import { useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Question,
  Tag,
} from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { getUserFacingError } from '../../lib/userFacingError';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

interface DailyQuestion {
  _id: string;
  category: string;
  prompt: string;
  displayOrder: number;
  active: boolean;
  updatedAt?: string;
}

interface QuestionForm {
  category: string;
  prompt: string;
  active: boolean;
}

const EMPTY_FORM: QuestionForm = {
  category: 'Kết nối',
  prompt: '',
  active: true,
};

function errorMessage(error: unknown, fallback: string) {
  return getUserFacingError(error, fallback);
}

export default function AdminDailyQuestionsPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);

  const questionsQuery = useQuery({
    queryKey: ['admin-daily-questions'],
    queryFn: () => api.get('/admin/daily-questions').then(({ data }) => data.questions as DailyQuestion[]),
  });

  const questions = questionsQuery.data ?? [];
  const categories = useMemo(
    () => Array.from(new Set(questions.map((item) => item.category))).sort((a, b) => a.localeCompare(b, 'vi')),
    [questions]
  );
  const visibleQuestions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('vi');
    return questions.filter((item) => {
      if (category !== 'ALL' && item.category !== category) return false;
      if (status === 'ACTIVE' && !item.active) return false;
      if (status === 'INACTIVE' && item.active) return false;
      if (!normalizedSearch) return true;
      return `${item.prompt} ${item.category}`.toLocaleLowerCase('vi').includes(normalizedSearch);
    });
  }, [category, questions, search, status]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-daily-questions'] });

  const saveQuestion = useMutation({
    mutationFn: () => editingId
      ? api.put(`/admin/daily-questions/${editingId}`, form)
      : api.post('/admin/daily-questions', form),
    onSuccess: () => {
      toast.success(editingId ? 'Đã cập nhật câu hỏi' : 'Đã thêm câu hỏi');
      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, 'Không thể lưu câu hỏi')),
  });

  const toggleQuestion = useMutation({
    mutationFn: (question: DailyQuestion) => api.put(`/admin/daily-questions/${question._id}`, {
      category: question.category,
      prompt: question.prompt,
      active: !question.active,
    }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái câu hỏi');
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, 'Không thể cập nhật trạng thái')),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, category: categories[0] ?? EMPTY_FORM.category });
    setFormOpen(true);
  };

  const openEdit = (question: DailyQuestion) => {
    setEditingId(question._id);
    setForm({
      category: question.category,
      prompt: question.prompt,
      active: question.active,
    });
    setFormOpen(true);
  };

  const activeCount = questions.filter((item) => item.active).length;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard icon={<Question size={20} />} label="Tổng câu hỏi" value={questions.length} tone="rose" />
        <SummaryCard icon={<CheckCircle size={20} />} label="Đang sử dụng" value={activeCount} tone="emerald" />
        <SummaryCard icon={<Tag size={20} />} label="Nhóm nội dung" value={categories.length} tone="blue" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck size={22} className="text-rose-500" />
              <h2 className="text-lg font-extrabold text-slate-950">Ngân hàng câu hỏi cặp đôi</h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Hệ thống chọn một câu đang hoạt động theo ngày. Câu hỏi đã giao cho cặp đôi được lưu riêng,
              vì vậy thay đổi tại đây chỉ áp dụng cho những phiên tiếp theo.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              <Clock size={15} />
              Tạo phiên tự động lúc 08:05 · Asia/Ho_Chi_Minh
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus size={17} className="mr-2" />
            Thêm câu hỏi
          </Button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_180px]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm nội dung hoặc nhóm..."
            leftIcon={<MagnifyingGlass size={17} />}
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          >
            <option value="ALL">Tất cả nhóm</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="ACTIVE">Đang dùng</option>
            <option value="INACTIVE">Đã tắt</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-extrabold text-slate-950">Danh sách câu hỏi</h3>
          <span className="text-xs font-semibold text-slate-400">{visibleQuestions.length} kết quả</span>
        </div>

        {questionsQuery.isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : questionsQuery.isError ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-red-600">Không tải được kho câu hỏi.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => questionsQuery.refetch()}>Thử lại</Button>
          </div>
        ) : visibleQuestions.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-400">Không có câu hỏi phù hợp bộ lọc.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleQuestions.map((question) => (
              <article key={question._id} className="grid gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 md:grid-cols-[70px_minmax(0,1fr)_150px_190px] md:items-center">
                <span className="text-xs font-extrabold tabular-nums text-slate-400">#{question.displayOrder}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-6 text-slate-900">{question.prompt}</p>
                  <span className="mt-1.5 inline-flex rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700">
                    {question.category}
                  </span>
                </div>
                <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  question.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {question.active ? 'Đang dùng' : 'Đã tắt'}
                </span>
                <div className="flex justify-start gap-2 md:justify-end">
                  <Button size="sm" variant="outline" onClick={() => openEdit(question)}>
                    <PencilSimple size={14} className="mr-1.5" />
                    Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant={question.active ? 'danger' : 'outline'}
                    loading={toggleQuestion.isPending && toggleQuestion.variables?._id === question._id}
                    onClick={() => toggleQuestion.mutate(question)}
                  >
                    {question.active ? 'Tắt' : 'Bật'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Sửa câu hỏi hằng ngày' : 'Thêm câu hỏi hằng ngày'}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Hủy</Button>
            <Button
              disabled={!form.category.trim() || !form.prompt.trim()}
              loading={saveQuestion.isPending}
              onClick={() => saveQuestion.mutate()}
            >
              {editingId ? 'Lưu thay đổi' : 'Thêm câu hỏi'}
            </Button>
          </div>
        )}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveQuestion.mutate();
          }}
        >
          <Input
            label="Nhóm nội dung"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            placeholder="Ví dụ: Kết nối"
            list="daily-question-categories"
          />
          <datalist id="daily-question-categories">
            {categories.map((item) => <option key={item} value={item} />)}
          </datalist>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Nội dung câu hỏi</span>
            <textarea
              value={form.prompt}
              onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
              placeholder="Viết câu hỏi ngắn, rõ ràng và không gây áp lực..."
              maxLength={500}
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
            <span className="mt-1 block text-right text-xs text-slate-400">{form.prompt.length}/500</span>
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3">
            <span>
              <span className="block text-sm font-bold text-slate-800">Sử dụng ngay</span>
              <span className="block text-xs text-slate-500">Cho phép hệ thống chọn câu này cho phiên mới.</span>
            </span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
              className="h-5 w-5 accent-rose-500"
            />
          </label>
          <button type="submit" className="hidden">Lưu</button>
        </form>
      </Modal>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'rose' | 'emerald' | 'blue';
}) {
  const tones = {
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-extrabold text-slate-950">{value}</p>
      </div>
    </div>
  );
}
