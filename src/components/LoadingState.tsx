export default function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-navy/30 border-t-navy rounded-full animate-spin" />
        <span className="text-sm text-gray">Đang tải dữ liệu...</span>
      </div>
    </div>
  );
}
