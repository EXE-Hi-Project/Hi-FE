import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Unhandled render error', error, errorInfo);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-pink-50/40 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <span className="material-symbols-outlined">error</span>
          </div>
          <h1 className="mb-2 text-lg font-bold text-slate-900">Có lỗi xảy ra</h1>
          <p className="text-sm leading-6 text-slate-500">
            Hi chưa thể tải màn hình này. Vui lòng làm mới trang hoặc thử lại sau.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-[#eb477e] px-5 py-2.5 text-sm font-bold text-white"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }
}
