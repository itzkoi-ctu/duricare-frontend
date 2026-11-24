import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n';
import { createOwner, getOwner } from '../../api/owner';
import { getFarms, createFarm, getFarm } from '../../api/farms';
import { getSetupOperation } from '../../api/setupOperations';
import { useAuth } from '../../hooks/useAuth';
import {
  FarmFields,
  type FarmFormValues,
  defaultFarmFormValues,
} from '../farm/FarmFields';
import {
  validateFarmFormValues,
  convertFormValuesToRequest,
} from '../../utils/farmValidation';
import {
  generateOperationId,
  saveStoredOperation,
  getStoredOperation,
  clearStoredOperation,
} from '../../utils/setupOperationStorage';
import type { Farm } from '../../types/farm';
import type { OwnerResponse } from '../../types/owner';
import type { SetupOperationError } from '../../types/setupOperation';
import axios from 'axios';

interface OwnerCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (owner: OwnerResponse) => void;
  initialFarmId?: number | null;
}

type ModalFlowMode =
  | 'EXISTING_FARM' // C00, C01, C05, C06, C07, C08
  | 'NEW_FARM' // C02, C03
  | 'FARM_UNKNOWN' // C04
  | 'FARM_RESOURCE_REMOVED' // R3-2: Committed farm removed / 404 readback
  | 'OWNER_UNKNOWN' // C09
  | 'OWNER_REFRESH' // C10
  | 'OWNER_PASSWORD_MISMATCH' // C11
  | 'SUCCESS'; // D01

export default function OwnerCreateModal({
  isOpen,
  onClose,
  onSuccess,
  initialFarmId,
}: OwnerCreateModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const actorId = user?.id ?? 0;

  const [flowMode, setFlowMode] = useState<ModalFlowMode>('EXISTING_FARM');

  // Existing farm list state
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [farmsLoadError, setFarmsLoadError] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(
    initialFarmId ?? null
  );

  // Inline new farm state
  const [newFarmValues, setNewFarmValues] = useState<FarmFormValues>(
    defaultFarmFormValues
  );
  const [newFarmErrors, setNewFarmErrors] = useState<
    Record<string, string | undefined>
  >({});
  const [isCreatingFarm, setIsCreatingFarm] = useState(false);
  const [committedFarm, setCommittedFarm] = useState<Farm | null>(null);
  const [farmOperationId, setFarmOperationId] = useState<string | null>(null);

  // Owner fields state (CRITICAL: password strictly memory-only)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [retryPassword, setRetryPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingOwner, setIsSubmittingOwner] = useState(false);
  const [ownerOperationId, setOwnerOperationId] = useState<string | null>(null);

  // Errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Result
  const [createdOwner, setCreatedOwner] = useState<OwnerResponse | null>(null);

  // Confirmation Modals
  const [showLeaveUnsavedModal, setShowLeaveUnsavedModal] = useState(false);
  const [showLeavePendingModal, setShowLeavePendingModal] = useState(false);
  const [showLeaveRetainedModal, setShowLeaveRetainedModal] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const confirmDialogRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const loadFarmsList = useCallback(async () => {
    setFarmsLoading(true);
    setFarmsLoadError(false);
    try {
      const data = await getFarms();
      setFarms(data);
    } catch {
      setFarmsLoadError(true);
    } finally {
      setFarmsLoading(false);
    }
  }, []);

  const handleAttemptClose = () => {
    if (isSubmittingOwner || isCreatingFarm || flowMode === 'FARM_UNKNOWN' || flowMode === 'OWNER_UNKNOWN') {
      setShowLeavePendingModal(true);
    } else if (committedFarm) {
      setShowLeaveRetainedModal(true);
    } else if (email.trim() || password || newFarmValues.name.trim()) {
      setShowLeaveUnsavedModal(true);
    } else {
      onClose();
    }
  };

  const handleAttemptCloseRef = useRef(handleAttemptClose);
  handleAttemptCloseRef.current = handleAttemptClose;

  // Modal open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      loadFarmsList();
      if (initialFarmId) {
        setSelectedFarmId(initialFarmId);
      }

      // Check stored operations: FARM_CREATE_INLINE first, then OWNER_CREATE
      if (actorId) {
        const storedFarm = getStoredOperation(actorId, 'FARM_CREATE_INLINE');
        if (storedFarm && (storedFarm.stage === 'UNKNOWN' || storedFarm.stage === 'DISPATCHING')) {
          setFarmOperationId(storedFarm.operationId);
          if (storedFarm.draft) {
            setNewFarmValues(storedFarm.draft as FarmFormValues);
          }
          setFlowMode('FARM_UNKNOWN');
        } else {
          const stored = getStoredOperation(actorId, 'OWNER_CREATE');
          if (stored && (stored.stage === 'UNKNOWN' || stored.stage === 'DISPATCHING')) {
            setOwnerOperationId(stored.operationId);
            if (stored.draft?.email) {
              setEmail(String(stored.draft.email));
            }
            if (stored.farmId) {
              setSelectedFarmId(stored.farmId);
            }
            setFlowMode('OWNER_REFRESH');
          }
        }
      }
    } else {
      // Clean up sensitive data immediately
      setPassword('');
      setRetryPassword('');
      setEmail('');
      setSelectedFarmId(null);
      setCommittedFarm(null);
      setCreatedOwner(null);
      setEmailError(null);
      setPasswordError(null);
      setGeneralError(null);
      setFlowMode('EXISTING_FARM');
      setNewFarmValues(defaultFarmFormValues);
      setNewFarmErrors({});
      setFarmOperationId(null);
      setOwnerOperationId(null);
      triggerRef.current?.focus();
    }
  }, [isOpen, initialFarmId, actorId, loadFarmsList]);

  // Focus trapping and Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLeaveUnsavedModal) {
          setShowLeaveUnsavedModal(false);
          return;
        }
        if (showLeavePendingModal) {
          setShowLeavePendingModal(false);
          return;
        }
        if (showLeaveRetainedModal) {
          setShowLeaveRetainedModal(false);
          return;
        }
        if (isSubmittingOwner || isCreatingFarm) return;
        handleAttemptCloseRef.current();
        return;
      }
      if (e.key === 'Tab') {
        const activeContainer = (showLeaveUnsavedModal || showLeavePendingModal || showLeaveRetainedModal)
          ? confirmDialogRef.current
          : modalRef.current;
        if (!activeContainer) return;
        const focusables = activeContainer.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables).filter((el) => !el.hasAttribute('disabled'));
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmittingOwner, isCreatingFarm, showLeaveUnsavedModal, showLeavePendingModal, showLeaveRetainedModal]);

  // Inline Farm Creation
  const handleCreateInlineFarm = async () => {
    const val = validateFarmFormValues(newFarmValues);
    if (!val.valid) {
      setNewFarmErrors(val.errors);
      return;
    }
    const opId = farmOperationId || generateOperationId();
    setFarmOperationId(opId);
    setIsCreatingFarm(true);
    setNewFarmErrors({});

    const saved = saveStoredOperation({
      version: 1,
      actorId,
      operationId: opId,
      kind: 'FARM_CREATE_INLINE',
      stage: 'DISPATCHING',
      draft: newFarmValues,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!saved) {
      setNewFarmErrors({ name: t('Không thể lưu trạng thái tác vụ. Vui lòng thử lại.') });
      setIsCreatingFarm(false);
      return;
    }

    try {
      const request = convertFormValuesToRequest(newFarmValues);
      const res = await createFarm(request, opId);

      // Verify current resource existence (F3 / R2-3)
      try {
        const currentFarm = await getFarm(res.farm.id);
        setCommittedFarm(currentFarm);
        setSelectedFarmId(currentFarm.id);
        setFarms((prev) => [currentFarm, ...prev.filter((f) => f.id !== currentFarm.id)]);
        clearStoredOperation(actorId, 'FARM_CREATE_INLINE');
        setFarmOperationId(null);
        setFlowMode('EXISTING_FARM');
      } catch (checkErr: unknown) {
        if (axios.isAxiosError(checkErr) && checkErr.response?.status === 404) {
          setNewFarmErrors({ name: t('Vườn đã tạo trên máy chủ nhưng hiện không tìm thấy.') });
          clearStoredOperation(actorId, 'FARM_CREATE_INLINE');
          setFarmOperationId(null);
          setFlowMode('FARM_RESOURCE_REMOVED');
        } else {
          // Non-404 failure: do NOT fall back to snapshot as success!
          saveStoredOperation({
            version: 1,
            actorId,
            operationId: opId,
            kind: 'FARM_CREATE_INLINE',
            stage: 'UNKNOWN',
            draft: newFarmValues,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setNewFarmErrors({ name: t('Vườn đã được tạo nhưng chưa thể xác nhận trạng thái hiện tại do dịch vụ gián đoạn.') });
          setFlowMode('FARM_UNKNOWN');
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as SetupOperationError | undefined;
        if (status === 409 && data?.code === 'FS_OPERATION_REUSED') {
          saveStoredOperation({
            version: 1,
            actorId,
            operationId: opId,
            kind: 'FARM_CREATE_INLINE',
            stage: 'UNKNOWN',
            draft: newFarmValues,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setFlowMode('FARM_UNKNOWN');
          return;
        }
        if (status === 400 && data?.code === 'FS_VALIDATION') {
          const nextErrors: Record<string, string | undefined> = {};
          if (data.fieldErrors) {
            for (const fe of data.fieldErrors) {
              nextErrors[fe.field] = t(fe.message || 'Lỗi nhập liệu.');
            }
          }
          setNewFarmErrors(nextErrors);
          clearStoredOperation(actorId, 'FARM_CREATE_INLINE');
          setFarmOperationId(null);
          return;
        }
        // Unknown outcome
        saveStoredOperation({
          version: 1,
          actorId,
          operationId: opId,
          kind: 'FARM_CREATE_INLINE',
          stage: 'UNKNOWN',
          draft: newFarmValues,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setFlowMode('FARM_UNKNOWN');
      } else {
        setFlowMode('FARM_UNKNOWN');
      }
    } finally {
      setIsCreatingFarm(false);
    }
  };

  const handleRetrySameFarmRequest = async () => {
    if (!farmOperationId) return;
    await handleCreateInlineFarm();
  };

  const handleCheckFarmResult = async () => {
    if (!farmOperationId) return;
    setIsCreatingFarm(true);
    setNewFarmErrors({});
    try {
      const receipt = await getSetupOperation<Farm>(farmOperationId);
      if (receipt.status === 'APPLIED_SNAPSHOT' && receipt.resource) {
        const farmId = receipt.resourceId || receipt.resource.id;
        try {
          const currentFarm = await getFarm(farmId);
          setCommittedFarm(currentFarm);
          setSelectedFarmId(currentFarm.id);
          setFarms((prev) => [currentFarm, ...prev.filter((f) => f.id !== currentFarm.id)]);
          clearStoredOperation(actorId, 'FARM_CREATE_INLINE');
          setFarmOperationId(null);
          setFlowMode('EXISTING_FARM');
        } catch (fetchErr: unknown) {
          if (axios.isAxiosError(fetchErr) && fetchErr.response?.status === 404) {
            setNewFarmErrors({ name: t('Tác vụ đã được ghi nhận trước đây nhưng vườn hiện không tồn tại.') });
            clearStoredOperation(actorId, 'FARM_CREATE_INLINE');
            setFarmOperationId(null);
            setFlowMode('FARM_RESOURCE_REMOVED');
          } else {
            // Non-404: 503 / network
            setNewFarmErrors({ name: t('Dịch vụ đang gián đoạn, chưa thể kiểm tra kết quả hiện tại.') });
          }
        }
      } else {
        setNewFarmErrors({ name: t('Chưa tìm thấy kết quả tác vụ. Vui lòng kiểm tra lại.') });
      }
    } catch {
      setNewFarmErrors({ name: t('Dịch vụ đang gián đoạn, chưa thể kiểm tra kết quả.') });
    } finally {
      setIsCreatingFarm(false);
    }
  };

  // Owner Validation
  const validateOwnerInputs = (pwdToValidate: string): boolean => {
    let valid = true;
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError(t('Vui lòng nhập email đăng nhập.'));
      valid = false;
    } else if (trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(t('Định dạng email không hợp lệ.'));
      valid = false;
    }

    if (!pwdToValidate) {
      setPasswordError(t('Vui lòng nhập mật khẩu ban đầu.'));
      valid = false;
    } else {
      const utf8Bytes = new TextEncoder().encode(pwdToValidate).length;
      if (pwdToValidate.length < 12 || pwdToValidate.length > 72) {
        setPasswordError(t('Mật khẩu phải từ 12 đến 72 ký tự.'));
        valid = false;
      } else if (utf8Bytes > 72) {
        setPasswordError(t('Mật khẩu không được vượt quá 72 byte UTF-8.'));
        valid = false;
      }
    }

    if (!selectedFarmId) {
      setGeneralError(t('Vui lòng chọn vườn canh tác phụ trách.'));
      valid = false;
    }

    return valid;
  };

  // Submit Owner Creation
  const dispatchCreateOwner = async (opId: string, pwdToSend: string) => {
    if (!selectedFarmId) return;
    setIsSubmittingOwner(true);
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);

    const normalizedEmail = email.trim().toLowerCase();

    // Store non-secret draft in sessionStorage
    const saved = saveStoredOperation({
      version: 1,
      actorId,
      operationId: opId,
      kind: 'OWNER_CREATE',
      stage: 'DISPATCHING',
      farmId: selectedFarmId,
      draft: { email: normalizedEmail, farmId: selectedFarmId },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!saved) {
      setGeneralError(t('Không thể lưu trạng thái tác vụ. Vui lòng thử lại.'));
      setIsSubmittingOwner(false);
      return;
    }

    try {
      const result = await createOwner(
        {
          email: normalizedEmail,
          initialPassword: pwdToSend,
          farmId: selectedFarmId,
        },
        opId
      );

      // Verify current resource existence (F3 / R2-3)
      try {
        const currentOwner = await getOwner(result.id);
        setPassword('');
        setRetryPassword('');
        setCreatedOwner(currentOwner);
        clearStoredOperation(actorId, 'OWNER_CREATE');
        setOwnerOperationId(null);
        setFlowMode('SUCCESS');
        if (onSuccess) onSuccess(currentOwner);
      } catch (checkErr: unknown) {
        if (axios.isAxiosError(checkErr) && checkErr.response?.status === 404) {
          setGeneralError(t('Tài khoản đã tạo trên máy chủ nhưng hiện không tìm thấy.'));
          clearStoredOperation(actorId, 'OWNER_CREATE');
          setOwnerOperationId(null);
          setFlowMode('EXISTING_FARM');
        } else {
          // Non-404: 503 / network -> do NOT fall back to success!
          saveStoredOperation({
            version: 1,
            actorId,
            operationId: opId,
            kind: 'OWNER_CREATE',
            stage: 'UNKNOWN',
            farmId: selectedFarmId,
            draft: { email: normalizedEmail, farmId: selectedFarmId },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setGeneralError(t('Tài khoản đã được tạo nhưng chưa thể xác nhận trạng thái hiện tại do dịch vụ gián đoạn. Hãy kiểm tra kết quả.'));
          setFlowMode('OWNER_UNKNOWN');
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as SetupOperationError | undefined;

        if (status === 409) {
          if (data?.code === 'FS_REPLAY_CREDENTIALS_MISMATCH') {
            setFlowMode('OWNER_PASSWORD_MISMATCH');
            return;
          }
          if (data?.code === 'FS_OPERATION_REUSED') {
            saveStoredOperation({
              version: 1,
              actorId,
              operationId: opId,
              kind: 'OWNER_CREATE',
              stage: 'UNKNOWN',
              farmId: selectedFarmId,
              draft: { email: normalizedEmail, farmId: selectedFarmId },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            setFlowMode('OWNER_UNKNOWN');
            return;
          }
          setEmailError(t('Email này đã được sử dụng. Hãy nhập email khác.'));
          clearStoredOperation(actorId, 'OWNER_CREATE');
          setOwnerOperationId(null);
          setFlowMode('EXISTING_FARM');
          emailInputRef.current?.focus();
          return;
        }

        if (status === 400) {
          clearStoredOperation(actorId, 'OWNER_CREATE');
          setOwnerOperationId(null);
          if (data?.fieldErrors) {
            for (const fe of data.fieldErrors) {
              if (fe.field === 'email') setEmailError(t(fe.message));
              if (fe.field === 'initialPassword') setPasswordError(t(fe.message));
            }
          } else {
            setGeneralError(t(data?.message || 'Dữ liệu không hợp lệ.'));
          }
          setFlowMode('EXISTING_FARM');
          return;
        }

        // 503 / Network timeout / Store unavailable
        saveStoredOperation({
          version: 1,
          actorId,
          operationId: opId,
          kind: 'OWNER_CREATE',
          stage: 'UNKNOWN',
          farmId: selectedFarmId,
          draft: { email: normalizedEmail, farmId: selectedFarmId },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setFlowMode('OWNER_UNKNOWN');
      } else {
        setFlowMode('OWNER_UNKNOWN');
      }
    } finally {
      setIsSubmittingOwner(false);
    }
  };

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOwner || !validateOwnerInputs(password)) return;
    const opId = generateOperationId();
    setOwnerOperationId(opId);
    await dispatchCreateOwner(opId, password);
  };

  const handleRetryOwnerSameRequest = async () => {
    if (!ownerOperationId) return;
    const pwd = password || retryPassword;
    if (!pwd) {
      setPasswordError(t('Vui lòng nhập lại mật khẩu ban đầu để thử lại.'));
      return;
    }
    await dispatchCreateOwner(ownerOperationId, pwd);
  };

  const handleCheckOwnerResult = async () => {
    if (!ownerOperationId) return;
    setIsSubmittingOwner(true);
    setGeneralError(null);
    try {
      const receipt = await getSetupOperation<OwnerResponse>(ownerOperationId);
      if (receipt.status === 'APPLIED_SNAPSHOT' && receipt.resource) {
        const ownerId = receipt.resourceId || receipt.resource.id;
        try {
          const currentOwner = await getOwner(ownerId);
          setPassword('');
          setRetryPassword('');
          setCreatedOwner(currentOwner);
          clearStoredOperation(actorId, 'OWNER_CREATE');
          setOwnerOperationId(null);
          setFlowMode('SUCCESS');
          if (onSuccess) onSuccess(currentOwner);
        } catch (checkErr: unknown) {
          if (axios.isAxiosError(checkErr) && checkErr.response?.status === 404) {
            setGeneralError(t('Tác vụ đã được ghi nhận trước đây nhưng tài khoản hiện không tồn tại.'));
            clearStoredOperation(actorId, 'OWNER_CREATE');
            setOwnerOperationId(null);
            setFlowMode('EXISTING_FARM');
          } else {
            // Non-404: 503 / network -> do NOT fall back to success!
            setGeneralError(t('Dịch vụ đang gián đoạn, chưa thể kiểm tra kết quả hiện tại.'));
          }
        }
      } else {
        setGeneralError(t('Chưa tìm thấy kết quả tác vụ. Vui lòng kiểm tra lại.'));
      }
    } catch {
      setGeneralError(t('Dịch vụ đang gián đoạn, chưa thể kiểm tra kết quả.'));
    } finally {
      setIsSubmittingOwner(false);
    }
  };

  if (!isOpen) return null;

  const currentSelectedFarm = farms.find((f) => f.id === selectedFarmId) || committedFarm;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="owner-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAttemptClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full sm:max-w-[520px] h-full sm:h-auto rounded-none sm:rounded-xl bg-surface border-0 sm:border border-border shadow-2xl flex flex-col overflow-hidden max-h-full sm:max-h-[calc(100dvh-48px)]"
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-navy text-xl"
            >
              person_add
            </span>
            <h2 id="owner-dialog-title" className="text-base font-bold text-text">
              {t('Tạo tài khoản chủ vườn')}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            disabled={isSubmittingOwner || isCreatingFarm}
            aria-label={t('Đóng')}
            className="p-1 rounded-lg text-gray hover:text-text hover:bg-surface-soft transition-colors cursor-pointer disabled:opacity-50"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-xl">
              close
            </span>
          </button>
        </header>

        {/* Dialog Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* SUCCESS State D01 */}
          {flowMode === 'SUCCESS' && createdOwner ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mb-3">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-3xl"
                  >
                    check
                  </span>
                </div>
                <h3 className="text-lg font-bold text-text">
                  {t('Tài khoản đã được tạo')}
                </h3>
                <p className="text-xs text-gray mt-1">
                  {t('Tài khoản đã được gán cho vườn dưới đây.')}
                </p>
              </div>

              {/* Summary Box */}
              <div className="rounded-lg border border-border bg-surface-soft p-4 space-y-2 text-xs">
                <div className="flex gap-4">
                  <span className="w-28 text-gray shrink-0">{t('Vườn')}</span>
                  <strong className="font-semibold text-text">
                    {currentSelectedFarm?.name ?? t('Vườn')} · #{selectedFarmId}
                  </strong>
                </div>
                <div className="flex gap-4">
                  <span className="w-28 text-gray shrink-0">{t('Email')}</span>
                  <strong className="font-semibold text-text">
                    {createdOwner.email}
                  </strong>
                </div>
              </div>

              {/* Success Action Footer */}
              <div className="pt-4 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/settings/farm?farmId=${selectedFarmId}`);
                  }}
                  className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center"
                >
                  {t('Cấu hình vườn')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/settings/owners/${createdOwner.id}`);
                  }}
                  className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors shadow-sm cursor-pointer flex items-center justify-center"
                >
                  {t('Xem tài khoản')}
                </button>
              </div>
            </div>
          ) : flowMode === 'FARM_UNKNOWN' ? (
            /* Farm Unknown Recovery C04 */
            <div className="space-y-4">
              {newFarmErrors.name && (
                <div className="rounded-lg border border-coral/30 bg-coral/10 p-3 text-xs text-coral font-medium flex gap-2 items-center">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span>{newFarmErrors.name}</span>
                </div>
              )}

              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 flex gap-3 text-amber-800 dark:text-amber-200">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-lg shrink-0 mt-0.5"
                >
                  warning
                </span>
                <div className="space-y-1">
                  <strong className="block text-sm font-semibold">
                    {t('Chưa xác nhận kết quả')}
                  </strong>
                  <p className="text-xs leading-relaxed">
                    {t(
                      'Kết nối bị gián đoạn. Vườn có thể đã được tạo. Hãy kiểm tra kết quả trước khi thử lại.'
                    )}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray">
                {t('Chưa thể tạo tài khoản cho đến khi xác nhận được vườn.')}
              </p>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isCreatingFarm}
                  onClick={handleRetrySameFarmRequest}
                  className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  {t('Thử lại cùng yêu cầu')}
                </button>
                <button
                  type="button"
                  disabled={isCreatingFarm}
                  onClick={handleCheckFarmResult}
                  className="min-h-11 px-5 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-lg"
                  >
                    refresh
                  </span>
                  {t('Kiểm tra kết quả')}
                </button>
              </div>
            </div>
          ) : flowMode === 'FARM_RESOURCE_REMOVED' ? (
            /* Farm Resource Removed (R3-2) */
            <div className="space-y-4">
              <div className="rounded-lg border border-coral/30 bg-coral/10 p-4 flex gap-3 text-coral">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-xl shrink-0 mt-0.5"
                >
                  error
                </span>
                <div className="space-y-1">
                  <strong className="block text-sm font-semibold">
                    {t('Vườn không còn tồn tại')}
                  </strong>
                  <p className="text-xs leading-relaxed text-coral">
                    {newFarmErrors.name ||
                      t('Vườn có thể đã bị xóa. Chọn vườn khác để tiếp tục. Không tự tạo lại vườn.')}
                  </p>
                </div>
              </div>

              {newFarmValues.name && (
                <div className="rounded-lg border border-border bg-surface-soft p-3 text-xs flex gap-3">
                  <span className="text-gray shrink-0">{t('Vườn')}:</span>
                  <span className="font-semibold text-text truncate">{newFarmValues.name}</span>
                </div>
              )}

              <p className="text-xs text-gray">
                {t('Bạn có thể chọn một vườn có sẵn hoặc tạo một vườn mới khác để tiếp tục.')}
              </p>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium transition-colors cursor-pointer"
                >
                  {t('Đóng')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFlowMode('NEW_FARM');
                    setNewFarmValues(defaultFarmFormValues);
                    setNewFarmErrors({});
                  }}
                  className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium transition-colors cursor-pointer"
                >
                  {t('Tạo vườn mới khác')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFlowMode('EXISTING_FARM');
                    setNewFarmErrors({});
                  }}
                  className="min-h-11 px-5 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  {t('Chọn vườn có sẵn')}
                </button>
              </div>
            </div>
          ) : flowMode === 'OWNER_UNKNOWN' ||
            flowMode === 'OWNER_REFRESH' ||
            flowMode === 'OWNER_PASSWORD_MISMATCH' ? (
            /* Owner Unknown Recovery C09, C10, C11 */
            <div className="space-y-4">
              {flowMode === 'OWNER_PASSWORD_MISMATCH' && (
                <div className="rounded-lg border border-coral/30 bg-coral/10 p-3 text-xs text-coral font-medium">
                  <strong>{t('Mật khẩu nhập lại không khớp')}</strong>
                  <p className="mt-1">
                    {t(
                      'Tài khoản không bị thay đổi. Hãy kiểm tra kết quả để xác nhận thông tin tạo tài khoản.'
                    )}
                  </p>
                </div>
              )}

              {generalError && (
                <div className="rounded-lg border border-coral/30 bg-coral/10 p-3 text-xs text-coral font-medium flex gap-2 items-center">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span>{generalError}</span>
                </div>
              )}
              {passwordError && (
                <div className="rounded-lg border border-coral/30 bg-coral/10 p-3 text-xs text-coral font-medium flex gap-2 items-center">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 flex gap-3 text-amber-800 dark:text-amber-200">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-lg shrink-0 mt-0.5"
                >
                  warning
                </span>
                <div className="space-y-1">
                  <strong className="block text-sm font-semibold">
                    {flowMode === 'OWNER_REFRESH'
                      ? t('Tiếp tục xác nhận tài khoản')
                      : t('Chưa xác nhận kết quả')}
                  </strong>
                  <p className="text-xs leading-relaxed">
                    {flowMode === 'OWNER_REFRESH'
                      ? t(
                          'Bạn vừa tải lại trang. Kiểm tra kết quả để xác nhận tài khoản đã được tạo hay chưa. Không cần mật khẩu để kiểm tra.'
                        )
                      : t(
                          'Kết nối bị gián đoạn. Tài khoản có thể đã được tạo. Hãy kiểm tra kết quả trước khi thử lại.'
                        )}
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-border bg-surface-soft p-4 space-y-2 text-xs">
                <div className="flex gap-4">
                  <span className="w-28 text-gray shrink-0">{t('Vườn')}</span>
                  <strong className="font-semibold text-text">
                    {currentSelectedFarm?.name ?? t('Vườn')} · #{selectedFarmId}
                  </strong>
                </div>
                <div className="flex gap-4">
                  <span className="w-28 text-gray shrink-0">{t('Email')}</span>
                  <strong className="font-semibold text-text">{email}</strong>
                </div>
              </div>

              {flowMode === 'OWNER_REFRESH' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-text">
                    {t('Mật khẩu ban đầu — chỉ nhập lại khi thử lại')}
                  </label>
                  <input
                    type="password"
                    value={retryPassword}
                    onChange={(e) => setRetryPassword(e.target.value)}
                    placeholder={t('Không cần nhập để kiểm tra kết quả')}
                    className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-navy/40"
                  />
                  <p className="text-xs text-gray">
                    {t(
                      'Nếu phải thử lại, nhập đúng mật khẩu ban đầu. Xác nhận tạo tài khoản không giúp khôi phục mật khẩu đã quên.'
                    )}
                  </p>
                </div>
              )}

              {/* Recovery Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  disabled={isSubmittingOwner}
                  onClick={handleRetryOwnerSameRequest}
                  className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  {t('Thử lại cùng yêu cầu')}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingOwner}
                  onClick={handleCheckOwnerResult}
                  className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-lg"
                  >
                    refresh
                  </span>
                  {t('Kiểm tra kết quả')}
                </button>
              </div>
            </div>
          ) : (
            /* Normal Form Flow (C00, C01, C02, C03, C05, C06, C07) */
            <div className="space-y-5">
              {/* Segmented Control */}
              <div className="flex p-1 bg-surface-soft rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setFlowMode('EXISTING_FARM')}
                  className={`flex-1 min-h-9 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    flowMode === 'EXISTING_FARM'
                      ? 'bg-surface text-navy shadow-sm'
                      : 'text-gray hover:text-text'
                  }`}
                >
                  {t('Vườn có sẵn')}
                </button>
                <button
                  type="button"
                  onClick={() => setFlowMode('NEW_FARM')}
                  className={`flex-1 min-h-9 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    flowMode === 'NEW_FARM'
                      ? 'bg-surface text-navy shadow-sm'
                      : 'text-gray hover:text-text'
                  }`}
                >
                  {t('Tạo vườn mới')}
                </button>
              </div>

              {/* FLOW: NEW_FARM (C02, C03) */}
              {flowMode === 'NEW_FARM' ? (
                <div className="space-y-5">
                  <div className="space-y-4">
                    <FarmFields
                      idPrefix="owner-inline-farm"
                      values={newFarmValues}
                      onChange={(f, v) =>
                        setNewFarmValues((prev) => ({ ...prev, [f]: v }))
                      }
                      errors={newFarmErrors}
                      disabled={isCreatingFarm}
                    />

                    {/* Independent Farm Create Action */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-border">
                      <button
                        type="button"
                        disabled={isCreatingFarm}
                        onClick={() => setFlowMode('EXISTING_FARM')}
                        className="min-h-11 px-4 rounded-lg border border-border bg-surface text-text hover:bg-surface-soft text-xs font-medium cursor-pointer disabled:opacity-50"
                      >
                        {t('Quay lại chọn vườn')}
                      </button>
                      <button
                        type="button"
                        disabled={isCreatingFarm}
                        onClick={handleCreateInlineFarm}
                        className="min-h-11 px-5 rounded-lg bg-navy hover:bg-navy-hover text-surface text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isCreatingFarm && (
                          <span
                            aria-hidden="true"
                            className="w-3.5 h-3.5 border-2 border-surface border-r-transparent rounded-full animate-spin"
                          />
                        )}
                        {t(isCreatingFarm ? 'Đang tạo vườn…' : 'Tạo vườn và tiếp tục')}
                      </button>
                    </div>
                  </div>

                  {/* Account fields disabled preview */}
                  <div className="pt-4 border-t border-border space-y-4">
                    <div className="rounded-lg border border-border bg-surface-soft p-3 text-xs text-gray flex items-start gap-2">
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-sm text-navy shrink-0 mt-0.5"
                      >
                        info
                      </span>
                      <div>
                        <strong className="block text-text font-semibold mb-0.5">
                          {t('Thông tin tài khoản được giữ lại')}
                        </strong>
                        <p>
                          {t(
                            'Bạn sẽ tiếp tục nhập tài khoản sau khi vườn được tạo.'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 opacity-50 pointer-events-none">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-text">
                          {t('Email đăng nhập')} <span className="text-coral">*</span>
                        </label>
                        <input
                          type="email"
                          disabled
                          placeholder="chuvuon@domain.invalid"
                          className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-text">
                          {t('Mật khẩu ban đầu')} <span className="text-coral">*</span>
                        </label>
                        <input
                          type="password"
                          disabled
                          placeholder="••••••••••••"
                          className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* FLOW: EXISTING_FARM (C00, C01, C05, C06, C07) */
                <form noValidate onSubmit={handleOwnerSubmit} className="space-y-4">
                  {/* Notice if farm was just created and retained (C05) */}
                  {committedFarm && (
                    <div className="rounded-lg border border-teal/30 bg-teal/10 p-3 text-xs text-teal flex items-start gap-2">
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-sm shrink-0 mt-0.5"
                      >
                        check_circle
                      </span>
                      <div>
                        <strong className="block font-semibold mb-0.5">
                          {t('Vườn đã được tạo và giữ lại')}
                        </strong>
                        <p>
                          {t(
                            'Bạn chỉ cần hoàn tất thông tin tài khoản. Không cần tạo lại vườn.'
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* General Error Banner */}
                  {generalError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-coral/30 bg-coral/10 p-3 text-xs text-coral font-medium"
                    >
                      {generalError}
                    </div>
                  )}

                  {/* Farm Selector or Selected Card */}
                  {committedFarm ? (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-text">
                        {t('Vườn được gán')} <span className="text-coral">*</span>
                      </label>
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-soft">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-navy text-lg shrink-0"
                          >
                            agriculture
                          </span>
                          <div className="min-w-0">
                            <strong className="block text-xs font-semibold text-text truncate">
                              {committedFarm.name}
                            </strong>
                            <span className="text-[11px] text-gray">
                              {t('Mã vườn')} #{committedFarm.id}
                            </span>
                          </div>
                        </div>
                        <span className="h-6 px-2 rounded-md bg-teal/15 text-teal text-[11px] font-semibold flex items-center shrink-0">
                          {t('Đã chọn')}
                        </span>
                      </div>
                    </div>
                  ) : farmsLoadError ? (
                    /* Error state C12 */
                    <div className="rounded-lg border border-coral/30 bg-coral/10 p-3 space-y-2">
                      <p className="text-xs text-coral font-medium">
                        {t('Không tải được danh sách vườn')}
                      </p>
                      <button
                        type="button"
                        onClick={loadFarmsList}
                        className="min-h-9 px-3 rounded-md bg-surface border border-border text-xs font-semibold text-text hover:bg-surface-soft cursor-pointer flex items-center gap-1.5"
                      >
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-sm"
                        >
                          refresh
                        </span>
                        {t('Thử lại')}
                      </button>
                    </div>
                  ) : farmsLoading ? (
                    /* Loading state C13 */
                    <div className="space-y-1">
                      <div className="h-11 rounded-lg border border-border bg-surface-soft animate-pulse" />
                      <p className="text-[11px] text-gray">
                        {t('Đang tải danh sách vườn…')}
                      </p>
                    </div>
                  ) : farms.length === 0 ? (
                    /* Empty state C14 */
                    <div className="rounded-lg border border-border bg-surface-soft p-4 text-center space-y-3">
                      <p className="text-xs text-gray">{t('Chưa có vườn')}</p>
                      <button
                        type="button"
                        onClick={() => setFlowMode('NEW_FARM')}
                        className="min-h-9 px-4 rounded-md bg-navy text-surface text-xs font-semibold cursor-pointer"
                      >
                        {t('Tạo vườn mới')}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="owner-select-farm"
                        className="mb-1.5 block text-xs font-semibold text-text"
                      >
                        {t('Vườn được gán')} <span className="text-coral">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="owner-select-farm"
                          value={selectedFarmId ?? ''}
                          onChange={(e) =>
                            setSelectedFarmId(
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          disabled={isSubmittingOwner}
                          className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text appearance-none focus:outline-none focus:ring-2 focus:ring-navy/40 cursor-pointer disabled:opacity-50"
                        >
                          <option value="">{t('Chọn vườn')}</option>
                          {farms.map((farm) => (
                            <option key={farm.id} value={farm.id}>
                              {farm.name} · #{farm.id}
                            </option>
                          ))}
                        </select>
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray"
                        >
                          expand_more
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Email Field */}
                  <div>
                    <label
                      htmlFor="owner-email"
                      className="mb-1.5 block text-xs font-semibold text-text"
                    >
                      {t('Email đăng nhập')} <span className="text-coral">*</span>
                    </label>
                    <input
                      ref={emailInputRef}
                      id="owner-email"
                      type="email"
                      autoComplete="username"
                      disabled={isSubmittingOwner}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      placeholder="chuvuon@domain.invalid"
                      className={`min-h-11 w-full rounded-lg border px-3 py-2 text-[16px] md:text-sm text-text placeholder:text-gray focus:outline-none focus:ring-2 transition-colors ${
                        emailError
                          ? 'border-coral focus:border-coral focus:ring-coral/40'
                          : 'border-border bg-surface focus:border-navy focus:ring-navy/40'
                      }`}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={
                        emailError ? 'owner-email-error' : undefined
                      }
                    />
                    {emailError && (
                      <p
                        id="owner-email-error"
                        role="alert"
                        className="mt-1 text-xs text-coral font-medium"
                      >
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* Initial Password Field */}
                  <div>
                    <label
                      htmlFor="owner-password"
                      className="mb-1.5 block text-xs font-semibold text-text"
                    >
                      {t('Mật khẩu ban đầu')} <span className="text-coral">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="owner-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        disabled={isSubmittingOwner}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        placeholder={t('Nhập mật khẩu ban đầu')}
                        className={`min-h-11 w-full rounded-lg border px-3 py-2 pr-10 text-[16px] md:text-sm text-text placeholder:text-gray focus:outline-none focus:ring-2 transition-colors ${
                          passwordError
                            ? 'border-coral focus:border-coral focus:ring-coral/40'
                            : 'border-border bg-surface focus:border-navy focus:ring-navy/40'
                        }`}
                        aria-invalid={Boolean(passwordError)}
                        aria-describedby={
                          passwordError ? 'owner-password-error' : 'owner-pwd-help'
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        tabIndex={-1}
                        aria-label={
                          showPassword ? t('Ẩn mật khẩu') : t('Hiện mật khẩu')
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray hover:text-text cursor-pointer"
                      >
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-lg"
                        >
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {passwordError ? (
                      <p
                        id="owner-password-error"
                        role="alert"
                        className="mt-1 text-xs text-coral font-medium"
                      >
                        {passwordError}
                      </p>
                    ) : (
                      <p
                        id="owner-pwd-help"
                        className="mt-1 text-xs text-gray leading-normal"
                      >
                        {t(
                          '12–72 ký tự, tối đa 72 byte UTF-8. Không tự cắt khoảng trắng.'
                        )}
                      </p>
                    )}
                  </div>

                  {/* Actions Footer inside Form */}
                  <div className="pt-4 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={isSubmittingOwner}
                      onClick={handleAttemptClose}
                      className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
                    >
                      {t('Hủy')}
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isSubmittingOwner ||
                        !selectedFarmId ||
                        !email.trim() ||
                        password.length < 12
                      }
                      className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmittingOwner && (
                        <span
                          aria-hidden="true"
                          className="w-4 h-4 border-2 border-surface border-r-transparent rounded-full animate-spin"
                        />
                      )}
                      {t(isSubmittingOwner ? 'Đang tạo tài khoản…' : 'Tạo tài khoản')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal F01: Leave Unsaved Form */}
      {showLeaveUnsavedModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="owner-leave-unsaved-title"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div ref={confirmDialogRef} className="relative w-full max-w-[520px] bg-surface rounded-xl shadow-xl border border-border p-6 space-y-4">
            <h2 id="owner-leave-unsaved-title" className="text-base font-bold text-text">
              {t('Rời form đang chỉnh sửa?')}
            </h2>
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
                  onClose();
                }}
                className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium cursor-pointer"
              >
                {t('Rời form')}
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveUnsavedModal(false)}
                className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold shadow-sm cursor-pointer"
              >
                {t('Giữ lại chỉnh sửa')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal F02: Leave Pending */}
      {showLeavePendingModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="owner-leave-pending-title"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div ref={confirmDialogRef} className="relative w-full max-w-[520px] bg-surface rounded-xl shadow-xl border border-border p-6 space-y-4">
            <h2 id="owner-leave-pending-title" className="text-base font-bold text-text">
              {t('Rời khi chưa xác nhận kết quả?')}
            </h2>
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
                  onClose();
                }}
                className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium cursor-pointer"
              >
                {t('Rời màn hình')}
              </button>
              <button
                type="button"
                onClick={() => setShowLeavePendingModal(false)}
                className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold shadow-sm cursor-pointer"
              >
                {t('Ở lại')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal F03: Leave Retained Farm */}
      {showLeaveRetainedModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="owner-leave-retained-title"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div ref={confirmDialogRef} className="relative w-full max-w-[520px] bg-surface rounded-xl shadow-xl border border-border p-6 space-y-4">
            <h2 id="owner-leave-retained-title" className="text-base font-bold text-text">
              {t('Để sau phần tạo tài khoản?')}
            </h2>
            <p className="text-xs text-gray leading-relaxed">
              {t(
                'Vườn sẽ được giữ lại. Bạn có thể tiếp tục tạo tài khoản sau hoặc chuyển sang cấu hình vườn.'
              )}
            </p>
            {committedFarm && (
              <div className="rounded-lg border border-border bg-surface-soft p-3 text-xs">
                <span className="text-gray mr-3">{t('Vườn')}:</span>
                <strong className="font-semibold text-text">
                  {committedFarm.name} · #{committedFarm.id}
                </strong>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowLeaveRetainedModal(false);
                  setFarmOperationId(null);
                  setOwnerOperationId(null);
                  onClose();
                }}
                className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium cursor-pointer"
              >
                {t('Để sau')}
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveRetainedModal(false)}
                className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold shadow-sm cursor-pointer"
              >
                {t('Tiếp tục tạo tài khoản')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
