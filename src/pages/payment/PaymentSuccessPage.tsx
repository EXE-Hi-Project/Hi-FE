import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function PaymentSuccessPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const dashboardPath = user?.gender === 'male' ? '/male-dashboard' : '/female-dashboard';

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    void queryClient.invalidateQueries({ queryKey: ['partner-cycles'] });
    void queryClient.invalidateQueries({ queryKey: ['partner-question-today'] });
  }, [queryClient]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-br from-pink-50 via-white to-pink-100/30 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-xl shadow-pink-100/50 backdrop-blur-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 text-4xl text-pink-500 animate-bounce">
          🎉
        </div>
        <h1 className="hi-page-title mt-6 text-3xl font-sans">
          Thanh toán thành công!
        </h1>
        <p className="mt-3 text-base text-gray-500 font-sans">
          Chào mừng bạn đến với <span className="font-semibold text-pink-500">Hi Pro / Hi Max</span>. Tài khoản của bạn đã được nâng cấp thành công.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            to={dashboardPath}
            className="hi-btn-primary flex w-full items-center justify-center rounded-2xl px-6 py-3.5 text-base font-semibold"
          >
            Về Dashboard của tôi
          </Link>
          <Link
            to="/settings"
            className="flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200"
          >
            Quản lý tài khoản
          </Link>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-400">
            Nếu bạn gặp bất kỳ vấn đề gì, vui lòng liên hệ bộ phận hỗ trợ qua email{' '}
            <a href="mailto:support@hilover.space" className="font-medium text-pink-500 hover:underline">
              support@hilover.space
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
