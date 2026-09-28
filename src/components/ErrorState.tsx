interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6">
      <div className="max-w-sm w-full text-center bg-surface border border-border rounded-2xl p-8">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-lg font-semibold text-text mb-2">
          Không thể tải dữ liệu
        </h2>
        <p className="text-sm text-gray mb-6">
          {message || 'Đã xảy ra lỗi khi kết nối đến máy chủ. Vui lòng thử lại.'}
        </p>
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-navy text-white rounded-xl text-sm font-medium
                     hover:opacity-90 transition-opacity cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
