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
    <section className="rounded-2xl border border-border p-5 md:p-6 flex gap-3 bg-surface">
      <span aria-hidden="true" className="material-symbols-outlined text-navy">info</span>
      <div><h2 className="font-semibold">{t("Giai đoạn tiếp theo")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray">{t("Không gian đóng góp tri thức sẽ có trong giai đoạn tiếp theo. Hiện tại, trang này giúp bạn theo dõi hồ sơ và trạng thái tài khoản.")}</p>
      </div>
    </section>
  </div>;
}
