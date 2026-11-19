import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { getOwner } from '../api/owner';
import type { OwnerResponse } from '../types/owner';
import OwnerStatusBadge from '../components/owner/OwnerStatusBadge';
import OwnerStatusModal from '../components/owner/OwnerStatusModal';
import OwnerEventsTable from '../components/owner/OwnerEventsTable';

function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} · ${hours}:${mins} (UTC+7)`;
  } catch {
    return isoString;
  }
}

export default function OwnerDetailPage() {
  useLanguage();
  const { id } = useParams<{ id: string }>();
  const ownerId = Number(id);

  const [owner, setOwner] = useState<OwnerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [is404, setIs404] = useState(false);

  // Status modal state & session tracking
  const [modalAction, setModalAction] = useState<'LOCK' | 'UNLOCK' | null>(null);
  const [modalSessionId, setModalSessionId] = useState<number>(0);
  const modalSessionRef = useRef<number>(0);
  const [eventsRefreshTrigger, setEventsRefreshTrigger] = useState(0);

  // Request & route identity tracking refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<number>(0);
  const activeOwnerIdRef = useRef<number>(ownerId);
  activeOwnerIdRef.current = ownerId;

  const handleOpenModal = useCallback((action: 'LOCK' | 'UNLOCK') => {
    if (owner && owner.id === ownerId) {
      modalSessionRef.current += 1;
      setModalSessionId(modalSessionRef.current);
      setModalAction(action);
    }
  }, [owner, ownerId]);

  const handleCloseModal = useCallback(() => {
    modalSessionRef.current += 1;
    setModalAction(null);
  }, []);

  const fetchDetail = useCallback(() => {
    // 1. Abort any previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 2. Invalidate previous request & modal session, close modal immediately
    sessionRef.current += 1;
    modalSessionRef.current += 1;
    const currentSession = sessionRef.current;
    const currentTargetId = ownerId;

    setModalAction(null);

    // 3. Validate route ownerId
    if (!Number.isSafeInteger(currentTargetId) || currentTargetId <= 0) {
      setOwner(null);
      setIs404(true);
      setLoading(false);
      return;
    }

    // 4. Create new AbortController and initiate request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setIs404(false);

    getOwner(currentTargetId, controller.signal)
      .then(data => {
        // Strict guard: must match current session, active route id, target id, payload id, and NOT aborted
        if (
          controller.signal.aborted ||
          sessionRef.current !== currentSession ||
          activeOwnerIdRef.current !== currentTargetId ||
          data.id !== currentTargetId
        ) {
          return;
        }
        setOwner(data);
        setError(null);
        setIs404(false);
      })
      .catch((err: unknown) => {
        if (
          controller.signal.aborted ||
          sessionRef.current !== currentSession ||
          activeOwnerIdRef.current !== currentTargetId
        ) {
          return;
        }
        const e = err as { name?: string; response?: { status?: number } };
        if (e.name === 'CanceledError' || e.name === 'AbortError') {
          return;
        }
        if (e.response?.status === 404) {
          setOwner(null);
          setIs404(true);
        } else {
          setError(t("Không thể tải thông tin chi tiết chủ vườn. Vui lòng thử lại."));
        }
      })
      .finally(() => {
        if (
          !controller.signal.aborted &&
          sessionRef.current === currentSession &&
          activeOwnerIdRef.current === currentTargetId
        ) {
          setLoading(false);
        }
      });
  }, [ownerId]);

  // Route identity change effect: immediately clear stale owner, close modal, and fetch new detail
  useEffect(() => {
    modalSessionRef.current += 1;
    setOwner(null);
    setModalAction(null);
    fetchDetail();

    return () => {
      modalSessionRef.current += 1;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDetail]);

  if (loading || is404 || !owner || owner.id !== ownerId) {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="h-4 w-48 bg-border/60 rounded animate-pulse" />
          <div className="h-8 w-80 bg-border/60 rounded animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 h-72 bg-surface rounded-xl border border-border animate-pulse" />
            <div className="lg:col-span-7 h-72 bg-surface rounded-xl border border-border animate-pulse" />
          </div>
        </div>
      );
    }

    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center space-y-4 max-w-lg mx-auto shadow-xs">
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto border border-red-200 dark:border-red-800">
          <span aria-hidden="true" className="material-symbols-outlined text-2xl">
            error
          </span>
        </div>
        <h2 className="text-base font-bold text-text">
          {t("Không tìm thấy tài khoản chủ vườn")}
        </h2>
        <p className="text-xs text-gray leading-relaxed">
          {error || t("Tài khoản chủ vườn không tồn tại hoặc đã bị xóa khỏi hệ thống.")}
        </p>
        <Link
          to="/settings/owners"
          className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-4 rounded-lg bg-[#1f5ca9] hover:bg-[#174987] text-white text-xs font-semibold transition-colors shadow-xs"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-sm">
            arrow_back
          </span>
          <span>{t("Quay lại danh sách chủ vườn")}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav aria-label={t("Đường dẫn")} className="flex items-center gap-2 text-xs text-gray mb-1 flex-wrap">
            <span>{t("Quản trị")}</span>
            <span aria-hidden="true" className="text-border">/</span>
            <Link
              to="/settings/owners"
              className="hover:text-[#1f5ca9] font-medium text-[#1f5ca9] flex items-center gap-1 transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                arrow_back
              </span>
              <span>{t("Quản lý chủ vườn")}</span>
            </Link>
            <span aria-hidden="true" className="text-border">/</span>
            <span className="text-text font-semibold">{t("Chi tiết tài khoản")}</span>
          </nav>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="owner-email text-xl font-bold text-text break-all">
              {owner.email}
            </h1>
            <OwnerStatusBadge enabled={owner.enabled} />
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchDetail}
            className="h-11 min-h-[44px] px-4 rounded-lg border border-border bg-surface text-text hover:bg-border/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">
              refresh
            </span>
            <span>{t("Làm mới dữ liệu")}</span>
          </button>
        </div>
      </div>

      {/* Two-Column Grid: Left Account Card + Right Audit Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface rounded-xl border border-border p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-[#1f5ca9]">
                  badge
                </span>
                <span>{t("Thuộc tính tài khoản")}</span>
              </h2>
              <span className="text-xs text-gray font-mono">ID: #{owner.id}</span>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <div className="text-xs text-gray mb-1">{t("Email đăng nhập")}</div>
                <div className="owner-email font-medium text-text bg-bg px-3.5 py-2.5 rounded-lg border border-border select-all font-mono text-[13px] break-all">
                  {owner.email}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray mb-1">{t("Vườn canh tác phụ trách")}</div>
                <div className="font-semibold text-[#1f5ca9] dark:text-blue-300 bg-[#eff4ff] dark:bg-blue-950/40 px-3.5 py-2.5 rounded-lg border border-[#cbdbf5] dark:border-blue-800/60 flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    yard
                  </span>
                  <span>{owner.farmName}</span>
                </div>
                <p className="text-[11px] text-gray mt-1 italic">
                  {t("Mỗi tài khoản chủ vườn được liên kết độc quyền với 01 vườn.")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="text-xs text-gray mb-1">{t("Trạng thái")}</div>
                  <OwnerStatusBadge enabled={owner.enabled} />
                </div>
                <div>
                  <div className="text-xs text-gray mb-1">{t("Ngày khởi tạo")}</div>
                  <div className="font-medium text-text text-xs leading-6">
                    {formatDateTime(owner.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Block: Khóa hoặc Mở */}
            <div className="pt-4 border-t border-border">
              {owner.enabled ? (
                <>
                  <div className="p-3.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 mb-3 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <strong>{t("Lưu ý tác vụ quản trị:")}</strong>{' '}
                    {t("Khi tài khoản bị khóa, chủ vườn không thể ghi nhật ký chăm sóc hoặc xem số đo cảm biến. Phiên cũ sẽ bị từ chối ở yêu cầu tiếp theo.")}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenModal('LOCK')}
                    className="w-full h-11 min-h-[44px] rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-base">
                      lock
                    </span>
                    <span>{t("Khóa tài khoản này")}</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="p-3.5 rounded-lg bg-[#eff4ff] dark:bg-blue-950/30 border border-[#cbdbf5] dark:border-blue-800/60 mb-3 text-xs text-[#1e40af] dark:text-blue-200 leading-relaxed">
                    <strong>{t("Lưu ý kích hoạt:")}</strong>{' '}
                    {t("Sau khi mở khóa, chủ vườn có thể đăng nhập và đồng bộ nhật ký canh tác theo vườn đã gán.")}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenModal('UNLOCK')}
                    className="w-full h-11 min-h-[44px] rounded-lg bg-[#1f5ca9] hover:bg-[#174987] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-base">
                      lock_open
                    </span>
                    <span>{t("Mở tài khoản")}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* DTO Isolation & Policy Constraint Note */}
          <div className="p-4 rounded-xl bg-surface border border-border text-xs text-gray space-y-2">
            <div className="font-semibold text-text flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-base text-[#1f5ca9]">
                info
              </span>
              <span>{t("Ràng buộc bảo toàn dữ liệu (DTO Isolation)")}</span>
            </div>
            <p className="leading-relaxed">
              {t("Dữ liệu chi tiết tài khoản và lịch sử thao tác được tải độc lập qua hai lệnh gọi API riêng biệt. Không chứa tính năng đổi email, đổi vườn hoặc cấp lại mật khẩu trực tiếp tại màn hình này.")}
            </p>
          </div>
        </div>

        {/* Right Column (7 Cols): Audit Events Table */}
        <div className="lg:col-span-7">
          <OwnerEventsTable ownerId={owner.id} refreshTrigger={eventsRefreshTrigger} />
        </div>
      </div>

      {/* Lock / Unlock Modal */}
      {modalAction && owner && owner.id === ownerId && (
        <OwnerStatusModal
          key={`${owner.id}-${modalSessionId}`}
          owner={owner}
          action={modalAction}
          isOpen={true}
          onClose={handleCloseModal}
          onSuccess={updatedOwner => {
            // Strict fence: must match current route, target owner id, and active modal session
            if (
              activeOwnerIdRef.current !== ownerId ||
              updatedOwner.id !== ownerId ||
              modalSessionRef.current !== modalSessionId
            ) {
              // Stale or invalidated mutation callback: RETURN IMMEDIATELY, DO NOT WRITE STATE
              return;
            }

            setOwner(updatedOwner);
            setModalAction(null);
            // Refresh audit events timeline
            setEventsRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
