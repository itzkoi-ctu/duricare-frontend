import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useAuth } from '../hooks/useAuth';
import {
  FarmFields,
  type FarmFormValues,
  defaultFarmFormValues,
} from '../components/farm/FarmFields';
import {
  validateFarmFormValues,
  convertFormValuesToRequest,
} from '../utils/farmValidation';
import { createFarm, getFarm } from '../api/farms';
import { getSetupOperation } from '../api/setupOperations';
import {
  generateOperationId,
  saveStoredOperation,
  getStoredOperation,
  clearStoredOperation,
} from '../utils/setupOperationStorage';
import type { Farm } from '../types/farm';
import type { SetupOperationError } from '../types/setupOperation';
import axios from 'axios';

type PageMode =
  | 'FORM' // B01, B02, B03
  | 'UNKNOWN' // B04
  | 'CHECKING' // B05
  | 'NOT_FOUND' // B06
  | 'CHECK_ERROR' // B07
  | 'READBACK_UNAVAILABLE' // F3 / R2-3: POST/receipt succeeded, current GET 503/network
  | 'RESOURCE_REMOVED' // F3 / R2-3: Receipt APPLIED_SNAPSHOT confirmed, but current GET returned 404
  | 'SUCCESS'; // B08

export default function FarmCreatePage() {
  useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const actorId = user?.id ?? 0;

  const [mode, setMode] = useState<PageMode>('FORM');
  const [values, setValues] = useState<FarmFormValues>(defaultFarmFormValues);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdFarm, setCreatedFarm] = useState<Farm | null>(null);
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);

  // Modals F01 (leave-unsaved) and F02 (leave-pending)
  const [showLeaveUnsavedModal, setShowLeaveUnsavedModal] = useState(false);
  const [showLeavePendingModal, setShowLeavePendingModal] = useState(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);

  const [initialDraft] = useState<FarmFormValues>(defaultFarmFormValues);

  const isDirty =
    values.name !== initialDraft.name ||
    values.location !== initialDraft.location ||
    values.area !== initialDraft.area ||
    values.latitude !== initialDraft.latitude ||
    values.longitude !== initialDraft.longitude;

  const isPendingGuarded =
    isSubmitting ||
    mode === 'UNKNOWN' ||
    mode === 'CHECKING' ||
    mode === 'NOT_FOUND' ||
    mode === 'CHECK_ERROR' ||
    mode === 'READBACK_UNAVAILABLE' ||
    mode === 'RESOURCE_REMOVED';

  const isFormDirtyGuarded = mode === 'FORM' && isDirty;
  const isGuarded = isFormDirtyGuarded || isPendingGuarded;

  const isGuardedRef = useRef(isGuarded);
  isGuardedRef.current = isGuarded;

  const isPendingGuardedRef = useRef(isPendingGuarded);
  isPendingGuardedRef.current = isPendingGuarded;

  // Protect against accidental native browser navigation (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGuardedRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Protect against browser Back button (popstate) without pushing state on every dependency transition
  useEffect(() => {
    const guardKey = 'farm_create_guard';
    window.history.pushState({ [guardKey]: true }, '', window.location.href);

    const handlePopState = () => {
      if (isGuardedRef.current) {
        window.history.pushState({ [guardKey]: true }, '', window.location.href);
        if (isPendingGuardedRef.current) {
          setShowLeavePendingModal(true);
        } else {
          setShowLeaveUnsavedModal(true);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Intercept in-app route changes (React Router links, sidebar links, header links) via document capture
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!isGuardedRef.current) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || anchor.target === '_blank') {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const targetUrl = new URL(anchor.href, window.location.href);
      if (currentUrl.pathname === targetUrl.pathname && currentUrl.search === targetUrl.search) {
        return;
      }

      // Intercept in-app link navigation
      e.preventDefault();
      e.stopPropagation();
      setPendingNavigationUrl(href);
      if (isPendingGuardedRef.current) {
        setShowLeavePendingModal(true);
      } else {
        setShowLeaveUnsavedModal(true);
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, []);

  // Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLeaveUnsavedModal || showLeavePendingModal) {
          setShowLeaveUnsavedModal(false);
          setShowLeavePendingModal(false);
          return;
        }
        if (isSubmitting) return;
        if (isPendingGuardedRef.current) {
          setShowLeavePendingModal(true);
        } else if (isFormDirtyGuarded) {
          setShowLeaveUnsavedModal(true);
        } else if (mode === 'SUCCESS') {
          navigate('/settings/farm');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormDirtyGuarded, isSubmitting, mode, showLeaveUnsavedModal, showLeavePendingModal, navigate]);

  // Restore pending operation on mount if any
  useEffect(() => {
    if (!actorId) return;
    const stored = getStoredOperation(actorId, 'FARM_CREATE');
    if (stored) {
      if (stored.stage === 'UNKNOWN' || stored.stage === 'DISPATCHING') {
        setActiveOperationId(stored.operationId);
        if (stored.draft && typeof stored.draft === 'object') {
          const draftVals: FarmFormValues = {
            name: String(stored.draft.name ?? ''),
            location: String(stored.draft.location ?? ''),
            area: String(stored.draft.area ?? ''),
            latitude: String(stored.draft.latitude ?? ''),
            longitude: String(stored.draft.longitude ?? ''),
          };
          setValues(draftVals);
        }
        setMode('UNKNOWN');
      }
    }
  }, [actorId]);

  const handleFieldChange = useCallback(
    (field: keyof FarmFormValues, value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      if (errors[field] || errors.coordinates) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
          coordinates:
            field === 'latitude' || field === 'longitude'
              ? undefined
              : prev.coordinates,
        }));
      }
    },
    [errors]
  );

  const dispatchCreateFarm = async (operationId: string, currentValues: FarmFormValues) => {
    setIsSubmitting(true);
    setErrors({});
    const request = convertFormValuesToRequest(currentValues);

    const saved = saveStoredOperation({
      version: 1,
      actorId,
      operationId,
      kind: 'FARM_CREATE',
      stage: 'DISPATCHING',
      draft: currentValues,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!saved) {
      setIsSubmitting(false);
      setErrors({
        general: t(
          'Không thể lưu trạng thái phục hồi vào trình duyệt (bộ nhớ đầy hoặc bị chặn). Vui lòng giải phóng bộ nhớ trước khi tiếp tục.'
        ),
      });
      return;
    }

    try {
      const res = await createFarm(request, operationId);
      // Fetch CURRENT resource (F3 / R2-3)
      try {
        const currentFarm = await getFarm(res.farm.id);
        setCreatedFarm(currentFarm);
        clearStoredOperation(actorId, 'FARM_CREATE');
        setActiveOperationId(null);
        setMode('SUCCESS');
      } catch (fetchErr: unknown) {
        if (axios.isAxiosError(fetchErr) && fetchErr.response?.status === 404) {
          setErrors({
            general: t('Nông trại đã tạo theo biên nhận nhưng hiện không còn tồn tại trên máy chủ.'),
          });
          clearStoredOperation(actorId, 'FARM_CREATE');
          setActiveOperationId(null);
          setMode('RESOURCE_REMOVED');
          return;
        }
        // Non-404: 503 / network / 403 -> do NOT fall back to success snapshot!
        saveStoredOperation({
          version: 1,
          actorId,
          operationId,
          kind: 'FARM_CREATE',
          stage: 'UNKNOWN',
          draft: currentValues,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setErrors({
          general: t('Nông trại đã được tạo nhưng chưa thể xác nhận trạng thái hiện tại do dịch vụ gián đoạn.'),
        });
        setMode('READBACK_UNAVAILABLE');
        return;
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as SetupOperationError | undefined;

        if (status === 400 && data?.code === 'FS_VALIDATION') {
          // Validation error: map field errors
          const nextErrors: Record<string, string | undefined> = {};
          if (data.fieldErrors && Array.isArray(data.fieldErrors)) {
            for (const fe of data.fieldErrors) {
              if (fe.field === 'name') {
                nextErrors.name =
                  fe.code === 'TEXT_NUL'
                    ? t('Ký tự NUL không được chấp nhận.')
                    : fe.code === 'TEXT_UNICODE'
                    ? t('Chuỗi Unicode không hợp lệ.')
                    : t(fe.message || 'Tên vườn không hợp lệ.');
              } else if (fe.field === 'location') {
                nextErrors.location =
                  fe.code === 'TEXT_NUL'
                    ? t('Ký tự NUL không được chấp nhận.')
                    : fe.code === 'TEXT_UNICODE'
                    ? t('Chuỗi Unicode không hợp lệ.')
                    : t(fe.message || 'Địa điểm không hợp lệ.');
              } else if (fe.field === 'area') {
                nextErrors.area = t(fe.message || 'Diện tích phải lớn hơn 0.');
              } else if (fe.field === 'latitude') {
                nextErrors.latitude = t(fe.message || 'Vĩ độ không hợp lệ.');
              } else if (fe.field === 'longitude') {
                nextErrors.longitude = t(fe.message || 'Kinh độ không hợp lệ.');
              } else {
                nextErrors.general = t(fe.message);
              }
            }
          } else {
            nextErrors.general = t(data.message || 'Dữ liệu không hợp lệ.');
          }
          setErrors(nextErrors);
          clearStoredOperation(actorId, 'FARM_CREATE');
          setActiveOperationId(null);
          setMode('FORM');
          return;
        }

        if (status === 409 && data?.code === 'FS_OPERATION_REUSED') {
          // Reused operation key with conflicting payload -> recovery needed
          saveStoredOperation({
            version: 1,
            actorId,
            operationId,
            kind: 'FARM_CREATE',
            stage: 'UNKNOWN',
            draft: currentValues,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            errorCode: 'FS_OPERATION_REUSED',
          });
          setMode('UNKNOWN');
          return;
        }

        // 503 / Network timeout / Store unavailable
        saveStoredOperation({
          version: 1,
          actorId,
          operationId,
          kind: 'FARM_CREATE',
          stage: 'UNKNOWN',
          draft: currentValues,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setMode('UNKNOWN');
      } else {
        // Unknown error -> mark unknown
        saveStoredOperation({
          version: 1,
          actorId,
          operationId,
          kind: 'FARM_CREATE',
          stage: 'UNKNOWN',
          draft: currentValues,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setMode('UNKNOWN');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validation = validateFarmFormValues(values);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const opId = generateOperationId();
    setActiveOperationId(opId);
    await dispatchCreateFarm(opId, values);
  };

  const handleRetrySameRequest = async () => {
    if (!activeOperationId || isSubmitting) return;
    await dispatchCreateFarm(activeOperationId, values);
  };

  const handleCheckResult = async () => {
    if (!activeOperationId || isSubmitting) return;
    setMode('CHECKING');
    setIsSubmitting(true);
    setErrors({});
    try {
      const receipt = await getSetupOperation<Farm>(activeOperationId);
      if (receipt.status === 'APPLIED_SNAPSHOT' && receipt.resource) {
        // Finding F3 / R2-3: Fetch current resource after receipt recovery
        const farmId = receipt.resourceId || receipt.resource.id;
        try {
          const currentFarm = await getFarm(farmId);
          setCreatedFarm(currentFarm);
          clearStoredOperation(actorId, 'FARM_CREATE');
          setActiveOperationId(null);
          setMode('SUCCESS');
        } catch (fetchErr: unknown) {
          if (axios.isAxiosError(fetchErr) && fetchErr.response?.status === 404) {
            setErrors({
              general: t('Nông trại đã tạo theo biên nhận nhưng hiện không còn tồn tại trên máy chủ.'),
            });
            clearStoredOperation(actorId, 'FARM_CREATE');
            setActiveOperationId(null);
            setMode('RESOURCE_REMOVED');
            return;
          }
          // Non-404: 503 / network
          setErrors({
            general: t('Dịch vụ đang gián đoạn, chưa thể kiểm tra kết quả hiện tại.'),
          });
          setMode('READBACK_UNAVAILABLE');
          return;
        }
      } else {
        setMode('CHECK_ERROR');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          // Receipt not committed yet
          setMode('NOT_FOUND');
          return;
        }
      }
      setMode('CHECK_ERROR');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isPendingGuardedRef.current) {
      setShowLeavePendingModal(true);
    } else if (isDirty) {
      setShowLeaveUnsavedModal(true);
    } else {
      navigate('/settings/farm');
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="pagehead">
        <div className="mb-2 flex items-center gap-2">
          <Link
            to="/settings/farm"
            onClick={(e) => {
              if (mode === 'UNKNOWN' || isSubmitting) {
                e.preventDefault();
                setShowLeavePendingModal(true);
              } else if (isDirty && mode === 'FORM') {
                e.preventDefault();
                setShowLeaveUnsavedModal(true);
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs text-gray hover:text-navy transition-colors font-medium"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            {t('Quay lại cài đặt vườn')}
          </Link>
        </div>
        <div className="text-xs text-gray mb-1">
          {t('Quản trị / Cài đặt vườn')}
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-text">
          {mode === 'SUCCESS'
            ? t('Tạo vườn')
            : mode === 'UNKNOWN' || mode === 'CHECKING' || mode === 'NOT_FOUND' || mode === 'CHECK_ERROR'
            ? t('Xác nhận tạo vườn')
            : t('Tạo vườn')}
        </h1>
        {mode === 'FORM' && (
          <p className="mt-1 text-xs md:text-sm text-gray">
            {t('Chỉ cần tên vườn để bắt đầu. Bạn có thể bổ sung thông tin và khu vực sau.')}
          </p>
        )}
      </div>

      {/* Main Content Area */}
      {mode === 'FORM' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,680px)_280px] gap-6 items-start">
          {/* Left Form Card */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-base font-semibold text-text mb-4">
              {t('Thông tin vườn')}
            </h3>

            {errors.general && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-coral/30 bg-coral/10 p-3 text-xs text-coral font-medium"
              >
                {errors.general}
              </div>
            )}

            <form noValidate onSubmit={handleSubmit}>
              <FarmFields
                idPrefix="farm-create"
                values={values}
                onChange={handleFieldChange}
                errors={errors}
                disabled={isSubmitting}
              />

              {/* Actions row */}
              <div className="mt-6 pt-5 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCancel}
                  className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {t('Hủy')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && (
                    <span
                      aria-hidden="true"
                      className="w-4 h-4 border-2 border-surface border-r-transparent rounded-full animate-spin"
                    />
                  )}
                  {t(isSubmitting ? 'Đang tạo vườn…' : 'Tạo vườn')}
                </button>
              </div>
            </form>
          </section>

          {/* Right Contextual Guide Panel (280px) */}
          <aside className="hidden lg:block w-[280px] shrink-0 rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-navy text-[20px]"
              >
                assistant_navigation
              </span>
              <h3 className="text-base font-semibold text-text">
                {t('Sau khi tạo vườn')}
              </h3>
            </div>
            <p className="text-xs text-gray mb-4 leading-relaxed">
              {t(
                'Hệ thống sẽ khởi tạo mã định danh cho vườn và cho phép thực hiện ngay các bước thiết lập tiếp theo:'
              )}
            </p>
            <div className="flex flex-col gap-4">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-navy/10 text-navy font-bold text-xs flex items-center justify-center shrink-0 border border-navy/20">
                  1
                </div>
                <div className="flex flex-col">
                  <h4 className="text-xs font-semibold text-text">
                    {t('Thêm khu vực')}
                  </h4>
                  <p className="text-xs text-gray mt-0.5 leading-normal">
                    {t('Phân chia các lô hoặc phân khu canh tác (A, B, C...) để chuẩn bị kết nối dữ liệu.')}
                  </p>
                </div>
              </div>
              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-navy/10 text-navy font-bold text-xs flex items-center justify-center shrink-0 border border-navy/20">
                  2
                </div>
                <div className="flex flex-col">
                  <h4 className="text-xs font-semibold text-text">
                    {t('Tạo tài khoản chủ vườn')}
                  </h4>
                  <p className="text-xs text-gray mt-0.5 leading-normal">
                    {t('Cấp quyền truy cập cho chủ hộ theo dõi chỉ số độ ẩm và nhật ký chăm sóc.')}
                  </p>
                </div>
              </div>
              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-navy/10 text-navy font-bold text-xs flex items-center justify-center shrink-0 border border-navy/20">
                  3
                </div>
                <div className="flex flex-col">
                  <h4 className="text-xs font-semibold text-text">
                    {t('Theo dõi dữ liệu khi có cảm biến')}
                  </h4>
                  <p className="text-xs text-gray mt-0.5 leading-normal">
                    {t('Dữ liệu độ ẩm, khí hậu và cảnh báo vận hành sẽ tự động hiển thị khi trạm kết nối.')}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Recovery / Unknown States (B04, B05, B06, B07, READBACK_UNAVAILABLE) */}
      {(mode === 'UNKNOWN' ||
        mode === 'CHECKING' ||
        mode === 'NOT_FOUND' ||
        mode === 'CHECK_ERROR' ||
        mode === 'READBACK_UNAVAILABLE') && (
        <section className="max-w-[680px] rounded-xl border border-border bg-surface p-6 shadow-sm space-y-5">
          {/* General Error Banner */}
          {errors.general && (
            <div className="rounded-lg border border-coral/30 bg-coral/10 p-3 text-xs text-coral font-medium flex gap-2 items-center">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{errors.general}</span>
            </div>
          )}

          {mode === 'CHECKING' ? (
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="w-5 h-5 border-2 border-navy border-r-transparent rounded-full animate-spin shrink-0"
              />
              <h3 className="text-base font-semibold text-text">
                {t('Đang kiểm tra kết quả…')}
              </h3>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 flex gap-3 text-amber-800 dark:text-amber-200">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-lg shrink-0 mt-0.5"
              >
                warning
              </span>
              <div className="space-y-1">
                <strong className="block text-sm font-semibold">
                  {mode === 'NOT_FOUND'
                    ? t('Chưa tìm thấy kết quả')
                    : mode === 'CHECK_ERROR' || mode === 'READBACK_UNAVAILABLE'
                    ? t('Chưa thể kiểm tra kết quả')
                    : t('Chưa xác nhận kết quả')}
                </strong>
                <p className="text-xs leading-relaxed">
                  {mode === 'NOT_FOUND'
                    ? t(
                        'Yêu cầu trước có thể vẫn đang xử lý. Giữ nguyên thông tin và kiểm tra lại, hoặc thử lại cùng yêu cầu.'
                      )
                    : mode === 'READBACK_UNAVAILABLE'
                    ? t(
                        'Nông trại đã được tạo nhưng chưa thể xác nhận trạng thái hiện tại do dịch vụ gián đoạn. Hãy kiểm tra kết quả.'
                      )
                    : mode === 'CHECK_ERROR'
                    ? t(
                        'Dịch vụ đang gián đoạn. Thông tin yêu cầu được giữ lại để bạn kiểm tra lại sau.'
                      )
                    : t(
                        'Kết nối bị gián đoạn. Vườn có thể đã được tạo. Hãy kiểm tra kết quả trước khi thử lại.'
                      )}
                </p>
              </div>
            </div>
          )}

          {/* Summary Box */}
          <div className="rounded-lg border border-border bg-surface-soft p-4 space-y-2">
            <div className="flex gap-4 text-xs">
              <span className="w-28 text-gray shrink-0">{t('Vườn')}</span>
              <strong className="font-semibold text-text">
                {values.name || t('Chưa đặt tên')}
              </strong>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            {mode !== 'READBACK_UNAVAILABLE' && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRetrySameRequest}
                className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {t('Thử lại cùng yêu cầu')}
              </button>
            )}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCheckResult}
              className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                refresh
              </span>
              {t('Kiểm tra kết quả')}
            </button>
          </div>
        </section>
      )}

      {/* State: RESOURCE_REMOVED (Finding F3 / R2-3) */}
      {mode === 'RESOURCE_REMOVED' && (
        <section className="max-w-[680px] rounded-xl border border-border bg-surface p-6 shadow-sm space-y-6">
          <div className="rounded-lg border border-coral/30 bg-coral/10 p-4 flex gap-3 text-coral">
            <span aria-hidden="true" className="material-symbols-outlined text-xl shrink-0 mt-0.5">
              error
            </span>
            <div className="space-y-1">
              <strong className="block text-sm font-semibold">
                {t('Nông trại không còn tồn tại')}
              </strong>
              <p className="text-xs leading-relaxed text-coral">
                {errors.general ||
                  t('Nông trại đã tạo theo biên nhận nhưng hiện không còn tồn tại trên máy chủ.')}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface-soft p-4 space-y-2">
            <div className="flex gap-4 text-xs">
              <span className="w-28 text-gray shrink-0">{t('Vườn')}</span>
              <strong className="font-semibold text-text">
                {values.name || t('Chưa đặt tên')}
              </strong>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setValues(defaultFarmFormValues);
                setErrors({});
                setMode('FORM');
              }}
              className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium transition-colors flex items-center justify-center cursor-pointer"
            >
              {t('Tạo vườn mới')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings/farm')}
              className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors shadow-sm flex items-center justify-center cursor-pointer"
            >
              {t('Danh sách nông trại')}
            </button>
          </div>
        </section>
      )}

      {/* Success State (B08) */}
      {mode === 'SUCCESS' && createdFarm && (
        <section className="max-w-[680px] rounded-xl border border-border bg-surface p-6 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mb-4">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl">
                check
              </span>
            </div>
            <h2 className="text-xl font-bold text-text">
              {t('Đã tạo vườn thành công')}
            </h2>
            <p className="mt-1 text-xs md:text-sm text-gray max-w-md">
              {t('Vườn đã được lưu. Bạn có thể chọn bước tiếp theo hoặc cấu hình sau.')}
            </p>
          </div>

          {/* Summary Box */}
          <div className="rounded-lg border border-border bg-surface-soft p-4">
            <div className="flex gap-4 text-xs">
              <span className="w-28 text-gray shrink-0">{t('Vườn')}</span>
              <strong className="font-semibold text-text">
                {createdFarm.name} · #{createdFarm.id}
              </strong>
            </div>
          </div>

          {/* Exact Vertical Action Stack in Order: 1. Configure Farm, 2. Create Owner, 3. Later */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => navigate(`/settings/farm?farmId=${createdFarm.id}`)}
              className="min-h-11 w-full rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                settings
              </span>
              {t('Cấu hình vườn')}
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(`/settings/owners?create=1&farmId=${createdFarm.id}`)
              }
              className="min-h-11 w-full rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                person
              </span>
              {t('Tạo tài khoản chủ vườn')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings/farm')}
              className="min-h-11 w-full rounded-lg text-gray hover:text-text hover:bg-surface-soft text-sm font-medium transition-colors flex items-center justify-center cursor-pointer"
            >
              {t('Để sau')}
            </button>
          </div>
        </section>
      )}

      {/* Confirmation Modal F01: Leave Unsaved Form */}
      {showLeaveUnsavedModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-unsaved-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-[520px] bg-surface rounded-xl shadow-xl border border-border p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h2 id="leave-unsaved-title" className="text-base font-bold text-text">
                {t('Rời form đang chỉnh sửa?')}
              </h2>
              <button
                type="button"
                onClick={() => setShowLeaveUnsavedModal(false)}
                aria-label={t('Đóng')}
                className="text-gray hover:text-text p-1 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  close
                </span>
              </button>
            </div>
            <p className="text-xs text-gray leading-relaxed">
              {t(
                'Thông tin chưa lưu sẽ không được gửi. Bạn có thể ở lại để tiếp tục chỉnh sửa.'
              )}
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowLeaveUnsavedModal(false);
                  if (pendingNavigationUrl) {
                    navigate(pendingNavigationUrl);
                  } else {
                    navigate('/settings/farm');
                  }
                }}
                className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium transition-colors cursor-pointer"
              >
                {t('Rời form')}
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveUnsavedModal(false)}
                className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                {t('Giữ lại chỉnh sửa')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal F02: Leave Pending Request */}
      {showLeavePendingModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-pending-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-[520px] bg-surface rounded-xl shadow-xl border border-border p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h2 id="leave-pending-title" className="text-base font-bold text-text">
                {t('Rời khi chưa xác nhận kết quả?')}
              </h2>
              <button
                type="button"
                onClick={() => setShowLeavePendingModal(false)}
                aria-label={t('Đóng')}
                className="text-gray hover:text-text p-1 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  close
                </span>
              </button>
            </div>
            <p className="text-xs text-gray leading-relaxed">
              {t(
                'Yêu cầu đã gửi có thể vẫn được xử lý. Rời màn hình không xác nhận rằng thao tác đã bị hủy. Khi quay lại, hãy kiểm tra kết quả trước khi gửi thêm.'
              )}
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowLeavePendingModal(false);
                  if (pendingNavigationUrl) {
                    navigate(pendingNavigationUrl);
                  } else {
                    navigate('/settings/farm');
                  }
                }}
                className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium transition-colors cursor-pointer"
              >
                {t('Rời màn hình')}
              </button>
              <button
                type="button"
                onClick={() => setShowLeavePendingModal(false)}
                className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                {t('Ở lại')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
