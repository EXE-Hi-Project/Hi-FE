import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CycleRecord } from '../../types/shared';

export default function PartnerCycleReportChart({ cycles }: { cycles: CycleRecord[] }) {
  const data = [...cycles].reverse().map((cycle) => ({
    date: new Date(`${cycle.startDate.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    cycleLength: cycle.cycleLength ?? 28,
    periodLength: cycle.periodLength ?? 5,
  }));

  return (
    <div className="h-72 w-full" aria-label="Biểu đồ xu hướng chu kỳ của Người ấy">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="cycleLength" name="Độ dài chu kỳ" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="periodLength" name="Số ngày kinh" stroke="#f472b6" strokeWidth={3} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
