import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="text-8xl mb-4">🔍</div>
        <h1 className="text-6xl font-bold text-navy mb-2">404</h1>
        <h2 className="text-xl font-semibold text-text mb-3">
          Không tìm thấy trang
        </h2>
        <p className="text-gray mb-8">
          Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-navy text-white rounded-xl
                     font-medium hover:opacity-90 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Về Dashboard
        </Link>
      </div>
    </div>
  );
}
