import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuthStore } from '../../store/authStore';

export default function Layout() {
  const { user } = useAuthStore();
  const location = useLocation();
  const isMale = user?.gender === 'male';
  const isCoupleMap = location.pathname === '/couple-map';
  const pageBg = isMale ? 'bg-[#f5fbff]' : 'bg-[#fff1f6]';
  const blobs = isMale
    ? {
        first: 'bg-sky-200/45',
        second: 'bg-indigo-100/40',
        third: 'bg-blue-100/35',
      }
    : {
        first: 'bg-pink-200/30',
        second: 'bg-rose-100/25',
        third: 'bg-violet-100/20',
      };

  return (
    <div className={`relative min-h-screen overflow-x-hidden font-sans ${pageBg}`}>
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className={`absolute -left-28 -top-28 h-[420px] w-[420px] rounded-full blur-3xl ${blobs.first}`} />
        <div className={`absolute right-[-120px] top-32 h-[360px] w-[360px] rounded-full blur-3xl ${blobs.second}`} />
        <div className={`absolute bottom-[-140px] left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-3xl ${blobs.third}`} />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className={isCoupleMap ? 'flex-1 pb-0 pt-0 flex flex-col h-screen w-screen relative' : 'flex-1 pb-16 pt-6'}>
          <div className={isCoupleMap ? 'w-full px-0 flex flex-col flex-1 h-full w-full' : 'mx-auto w-full max-w-[1200px] px-4 md:px-8'}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
