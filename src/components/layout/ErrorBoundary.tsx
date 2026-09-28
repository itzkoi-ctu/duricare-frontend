import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-6">
          <div className="max-w-md w-full text-center bg-surface border border-border rounded-2xl p-8 shadow-lg">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-text mb-2">
              Đã xảy ra lỗi
            </h1>
            <p className="text-gray mb-6">
              Ứng dụng gặp sự cố không mong muốn. Vui lòng tải lại trang.
            </p>
            {this.state.error && (
              <pre className="text-sm text-coral bg-bg border border-border rounded-lg p-3 mb-6 overflow-auto text-left">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-navy text-white rounded-xl font-medium
                         hover:opacity-90 transition-opacity cursor-pointer"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
