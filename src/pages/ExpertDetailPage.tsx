import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { t, getLocale } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useExpertDetail } from '../hooks/useExpertDetail';
import { useToast } from '../hooks/useToast';
import ExpertStatusBadge from '../components/ExpertStatusBadge';
import ExpertStatusDialog from '../components/ExpertStatusDialog';
import { getAllowedActions, type StatusActionType } from '../utils/expertStatus';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

function formatDateTime(isoString: string | null): string {
  if (!isoString) return t('Chưa cập nhật');
  try {
    const date = new Date(isoString);
    return date.toLocaleString(getLocale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export default function ExpertDetailPage() {
  useLanguage();
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);

  const {
    profile,
    loading,
    error,
    notFound,
    actionPending,
    conflictError,
    reload,
    verify,
    suspend,
  } = useExpertDetail(id);

  const { showSuccess } = useToast();
  const [activeAction, setActiveAction] = useState<StatusActionType | null>(null);

  if (!Number.isSafeInteger(id) || id <= 0 || notFound) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          to="/settings/experts"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-navy dark:text-blue hover:underline"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            arrow_back
          </span>
          {t('Quay lại danh sách chuyên gia')}
        </Link>
        <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-3">
          <span aria-hidden="true" className="material-symbols-outlined text-4xl text-gray">
            person_off
          </span>
          <h1 className="text-lg font-bold text-text">{t('Không tìm thấy hồ sơ chuyên gia')}</h1>
          <p className="text-sm text-gray max-w-sm mx-auto">
            {t('Hồ sơ chuyên gia không tồn tại hoặc đã bị xóa khỏi hệ thống.')}
          </p>
          <div className="pt-2">
            <Link
              to="/settings/experts"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-navy px-4 text-xs font-semibold text-surface dark:text-bg"
            >
              {t('Về danh sách chuyên gia')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !profile) {
    return <LoadingState />;
  }

  if (error && !profile) {
    return <ErrorState message={error} onRetry={() => void reload()} />;
  }

  if (!profile) return null;

  const handleActionConfirm = async (version: number, reason: string): Promise<boolean> => {
    if (activeAction === 'verify' || activeAction === 'reinstate') {
      const res = await verify(version, reason);
      if (res) {
        showSuccess(
          activeAction === 'reinstate'
            ? t('Đã khôi phục xác minh chuyên gia thành công.')
            : t('Đã xác minh hồ sơ chuyên gia thành công.')
        );
        return true;
      }
    } else if (activeAction === 'suspend') {
      const res = await suspend(version, reason);
      if (res) {
        showSuccess(t('Đã tạm đình chỉ quyền chuyên môn thành công.'));
        return true;
      }
    }
    return false;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/settings/experts"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-navy dark:text-blue hover:underline"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            arrow_back
          </span>
          {t('Quay lại danh sách chuyên gia')}
        </Link>
      </div>

      {/* Profile Overview Header Card */}
      <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <span
              aria-hidden="true"
              className="material-symbols-outlined rounded-2xl p-3 bg-teal/10 text-teal text-3xl shrink-0"
            >
              school
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-text [overflow-wrap:anywhere]">
                  {profile.fullName}
                </h1>
                <span className="rounded-full bg-navy/10 dark:bg-blue/15 px-2.5 py-0.5 text-[11px] font-bold text-navy dark:text-blue">
                  {t('Chuyên gia')}
                </span>
              </div>
              <p className="mt-1 text-xs md:text-sm font-mono text-gray [overflow-wrap:anywhere]">
                {profile.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <ExpertStatusBadge status={profile.verificationStatus} size="md" />
          </div>
        </div>

        {/* Action Buttons based on status */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {getAllowedActions(profile.verificationStatus).includes('verify') && (
            <button
              type="button"
              data-testid="action-verify"
              onClick={() => setActiveAction('verify')}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-teal px-4 text-xs font-semibold text-surface dark:text-bg hover:opacity-95 cursor-pointer transition-opacity"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                verified
              </span>
              {t('Xác minh chuyên gia')}
            </button>
          )}

          {getAllowedActions(profile.verificationStatus).includes('suspend') && (
            <button
              type="button"
              data-testid="action-suspend"
              onClick={() => setActiveAction('suspend')}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-coral/30 bg-coral/10 px-4 text-xs font-semibold text-coral hover:bg-coral/20 cursor-pointer transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                pause_circle
              </span>
              {t('Tạm đình chỉ')}
            </button>
          )}

          {getAllowedActions(profile.verificationStatus).includes('reinstate') && (
            <button
              type="button"
              data-testid="action-reinstate"
              onClick={() => setActiveAction('reinstate')}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-teal px-4 text-xs font-semibold text-surface dark:text-bg hover:opacity-95 cursor-pointer transition-opacity"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                published_with_changes
              </span>
              {t('Khôi phục xác minh')}
            </button>
          )}

          <button
            type="button"
            data-testid="action-reload"
            onClick={() => void reload()}
            aria-label={t('Tải lại thông tin hồ sơ')}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-bg px-3.5 text-xs font-semibold text-text hover:bg-surface cursor-pointer transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              refresh
            </span>
            {t('Tải lại')}
          </button>
        </div>
      </div>

      {/* Account Inactivation Notice (if enabled === false) */}
      {!profile.enabled && (
        <div
          role="alert"
          className="rounded-2xl border border-coral/40 bg-coral/10 p-4 md:p-5 text-coral space-y-1"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">block</span>
            <h2 className="font-bold text-sm">{t('Tài khoản bị vô hiệu hóa')}</h2>
          </div>
          <p className="text-xs text-text leading-relaxed pl-7">
            {t('Tài khoản người dùng này hiện đã bị tắt đăng nhập ở mức hệ thống.')}
          </p>
        </div>
      )}

      {/* Details Card */}
      <section
        aria-label={t('Thông tin chi tiết chuyên môn')}
        className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-xs space-y-5"
      >
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <span aria-hidden="true" className="material-symbols-outlined text-navy dark:text-blue">
            description
          </span>
          <h2 className="text-sm font-bold text-text">{t('Thông tin chuyên môn')}</h2>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs md:text-sm">
          <div>
            <dt className="text-gray mb-1">{t('Đơn vị công tác')}</dt>
            <dd className="font-medium text-text [overflow-wrap:anywhere]">
              {profile.affiliation || t('Chưa cập nhật')}
            </dd>
          </div>

          <div>
            <dt className="text-gray mb-1">{t('Trạng thái tài khoản người dùng')}</dt>
            <dd className="font-medium text-text">
              {profile.enabled ? (
                <span className="inline-flex items-center gap-1 text-teal">
                  <span className="w-2 h-2 rounded-full bg-teal" />
                  {t('Đang hoạt động')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-coral">
                  <span className="w-2 h-2 rounded-full bg-coral" />
                  {t('Vô hiệu hóa')}
                </span>
              )}
            </dd>
          </div>

          <div className="md:col-span-2">
            <dt className="text-gray mb-1">{t('Chuyên môn chuyên sâu')}</dt>
            <dd className="font-medium text-text whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere] rounded-xl bg-bg border border-border/80 p-3.5">
              {profile.specialties}
            </dd>
          </div>
        </dl>
      </section>

      {/* Audit & Transition History Card */}
      <section
        aria-label={t('Lịch sử xác minh và kiểm tra')}
        className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <span aria-hidden="true" className="material-symbols-outlined text-navy dark:text-blue">
            history
          </span>
          <h2 className="text-sm font-bold text-text">{t('Thông tin kiểm duyệt')}</h2>
        </div>

        <div className="space-y-4 text-xs md:text-sm">
          {/* Latest Verification Note */}
          {profile.verifiedAt && (
            <div className="rounded-xl border border-teal/30 bg-teal/5 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-teal font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">verified</span>
                  {t('Xác minh lần cuối')}
                </span>
                <span>{formatDateTime(profile.verifiedAt)}</span>
              </div>
              {profile.verifiedBy && (
                <p className="text-xs text-gray">
                  {t('Thực hiện bởi')}: <span className="font-mono text-text">{t('Quản trị viên #{0}', [profile.verifiedBy])}</span>
                </p>
              )}
              {profile.verificationNote && (
                <div className="text-xs pt-1">
                  <span className="text-gray font-medium">{t('Ghi chú xác minh')}: </span>
                  <p className="text-text mt-1 leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
                    {profile.verificationNote}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Latest Suspension Reason */}
          {profile.suspendedAt && (
            <div className="rounded-xl border border-coral/30 bg-coral/5 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-coral font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">pause_circle</span>
                  {t('Tạm đình chỉ lần cuối')}
                </span>
                <span>{formatDateTime(profile.suspendedAt)}</span>
              </div>
              {profile.suspendedBy && (
                <p className="text-xs text-gray">
                  {t('Thực hiện bởi')}: <span className="font-mono text-text">{t('Quản trị viên #{0}', [profile.suspendedBy])}</span>
                </p>
              )}
              {profile.suspensionReason && (
                <div className="text-xs pt-1">
                  <span className="text-gray font-medium">{t('Lý do tạm đình chỉ')}: </span>
                  <p className="text-text mt-1 leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
                    {profile.suspensionReason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Timestamps and version */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-gray border-t border-border/60">
            <div>
              <span>{t('Ngày tạo')}: </span>
              <span className="text-text font-medium">{formatDateTime(profile.createdAt)}</span>
            </div>
            <div>
              <span>{t('Cập nhật')}: </span>
              <span className="text-text font-medium">{formatDateTime(profile.updatedAt)}</span>
            </div>
            <div>
              <span>{t('Phiên bản')}: </span>
              <span className="font-mono text-text font-medium">v{profile.version}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Status Confirmation Modal Dialog */}
      <ExpertStatusDialog
        open={activeAction !== null}
        actionType={activeAction}
        profile={profile}
        pending={actionPending}
        conflictError={conflictError}
        onConfirm={handleActionConfirm}
        onReload={reload}
        onClose={() => setActiveAction(null)}
      />
    </div>
  );
}
