import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center py-16 px-4 space-y-5">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertCircle className="h-7 w-7" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
              Đã xảy ra sự cố hiển thị
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Rất tiếc, đã có lỗi phát sinh trong quá trình hiển thị trang này. Bạn có thể tải lại hoặc quay về trang chủ.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn-primary !py-2.5 !px-4 text-xs font-semibold inline-flex items-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Tải lại trang</span>
            </button>

            <a
              href="/"
              className="btn-ghost !py-2.5 !px-4 text-xs font-medium inline-flex items-center gap-2"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Về trang chủ</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
