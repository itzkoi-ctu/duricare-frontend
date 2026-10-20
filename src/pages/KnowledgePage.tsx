import { Link } from 'react-router-dom';
import useExpertProfile from '../hooks/useExpertProfile';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { EXPERT_STATUS_CONFIG } from '../utils/expertStatus';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';

export default function KnowledgePage() {
  useLanguage();
  const { profile, loading, error, retry } = useExpertProfile();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={t("Không thể tải hồ sơ chuyên gia. Vui lòng thử lại.")} onRetry={retry} />;
  if (!profile) return <section className="rounded-2xl border border-border bg-surface p-6"><h1 className="font-bold text-xl">{t("Chưa có hồ sơ chuyên gia")}</h1><p className="text-gray mt-3">{t("Vui lòng liên hệ quản trị viên để kiểm tra tài khoản.")}</p></section>;
  const status = EXPERT_STATUS_CONFIG[profile.verificationStatus];
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-teal">{t("Tài khoản chuyên gia")}</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-navy mt-2">{t("Hồ sơ của bạn")}</h1>
        <p className="text-sm text-gray mt-2 leading-relaxed">{t("Thông tin chuyên môn và trạng thái xác minh của bạn tại DuriCare.")}</p>
      </div>
      <button
        type="button"
        onClick={retry}
        aria-label={t("Làm mới trạng thái")}
        className="inline-flex self-start sm:self-center items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface text-xs font-semibold text-text hover:bg-bg cursor-pointer transition-colors shadow-2xs"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-base">refresh</span>
        <span>{t("Làm mới trạng thái")}</span>
      </button>
    </div>
    <section aria-label={t("Trạng thái xác minh")} className={`rounded-2xl border p-5 md:p-6 ${status.tone}`}>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="material-symbols-outlined text-2xl">{status.icon}</span>
        <h2 className="font-bold text-lg">{t(status.label)}</h2>
      </div>
      <p className="text-sm leading-relaxed mt-3 text-text">{t(status.explanation)}</p>
      {profile.verificationStatus === 'SUSPENDED' && profile.suspensionReason &&
        <p className="text-sm leading-relaxed mt-3 text-text [overflow-wrap:anywhere]"><span className="font-semibold">{t("Lý do")}: </span>{profile.suspensionReason}</p>}
    </section>
    <section aria-label={t("Thông tin chuyên gia")} className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="p-5 md:p-6 border-b border-border flex items-start gap-4">
        <span aria-hidden="true" className="material-symbols-outlined rounded-xl p-3 bg-teal/10 text-teal text-3xl">school</span>
        <div className="min-w-0">
          <h2 className="font-bold text-xl text-text [overflow-wrap:anywhere]">{profile.fullName}</h2>
          <span className="inline-block mt-2 text-xs font-bold px-2.5 py-1 rounded-full bg-teal/10 text-teal">{t("Chuyên gia")}</span>
        </div>
      </div>
      <dl className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div className="min-w-0"><dt className="text-gray mb-2">{t("Email")}</dt><dd className="font-medium [overflow-wrap:anywhere]">{profile.email}</dd></div>
        <div className="min-w-0"><dt className="text-gray mb-2">{t("Đơn vị công tác")}</dt><dd className="font-medium [overflow-wrap:anywhere]">{profile.affiliation || t("Chưa cập nhật")}</dd></div>
        <div className="md:col-span-2 min-w-0"><dt className="text-gray mb-2">{t("Chuyên môn")}</dt><dd className="font-medium whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{profile.specialties}</dd></div>
      </dl>
    </section>
    <section className="rounded-2xl border border-border p-5 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface shadow-2xs">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="material-symbols-outlined text-teal text-2xl mt-0.5">
          auto_stories
        </span>
        <div>
          <h2 className="font-bold text-base text-text">{t('Nguồn tri thức nông nghiệp')}</h2>
          <p className="mt-1 text-xs text-gray leading-relaxed max-w-xl">
            {profile.verificationStatus === 'VERIFIED'
              ? t('Tài khoản đã xác minh. Bạn có thể tạo hồ sơ tài liệu mới, quản lý các bản nháp trích đoạn kỹ thuật và theo dõi lịch sử kiểm toán.')
              : t('Bạn có thể xem các hồ sơ nguồn tri thức của mình ở chế độ chỉ đọc.')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
        <Link
          to="/knowledge/sources"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-bg text-text hover:bg-surface text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            visibility
          </span>
          <span>{t('Xem nguồn tri thức')}</span>
        </Link>
        {profile.verificationStatus === 'VERIFIED' && (
          <Link
            to="/knowledge/sources/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal text-surface dark:text-bg text-xs font-semibold hover:opacity-95 cursor-pointer shadow-2xs"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              add
            </span>
            <span>{t('Tạo nguồn mới')}</span>
          </Link>
        )}
      </div>
    </section>
  </div>;
}
