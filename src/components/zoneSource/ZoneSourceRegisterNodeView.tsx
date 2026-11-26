import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { getZoneSourceErrorMessage } from '../../api/zoneSource';
import type { ProviderDiscovery } from '../../types/farmVisual';
import type {
  NodeKind,
  ParsedZoneSourceError,
  RegisterNodeOperationRequest,
  ZoneSourceFieldError,
} from '../../types/zoneSource';
import {
  formatTextValidationMessage,
  validateStrictText,
} from '../../utils/zoneSourceValidation';

interface ZoneSourceRegisterNodeViewProps {
  providers: ProviderDiscovery[];
  submitting: boolean;
  storageUnavailable: boolean;
  serverError: ParsedZoneSourceError | null;
  operationId: string;
  onDirtyChange: (dirty: boolean) => void;
  onSubmit: (command: RegisterNodeOperationRequest, providerLabel: string) => void;
  onCancel: () => void;
}

export default function ZoneSourceRegisterNodeView({
  providers,
  submitting,
  storageUnavailable,
  serverError,
  operationId,
  onDirtyChange,
  onSubmit,
  onCancel,
}: ZoneSourceRegisterNodeViewProps) {
  const activeProviders = providers.filter(p => !p.retiredAt);
  const defaultProviderId =
    activeProviders.find(p => p.adapterKind === 'IOTLAB_HTTP')?.id ??
    activeProviders[0]?.id ??
    '';

  const [providerId, setProviderId] = useState<string>(String(defaultProviderId));
  const [nodeKind, setNodeKind] = useState<NodeKind>('STATION');
  const [externalId, setExternalId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [reason, setReason] = useState('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const externalIdRef = useRef<HTMLInputElement>(null);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!providerId && defaultProviderId) {
      setProviderId(String(defaultProviderId));
    }
  }, [defaultProviderId, providerId]);

  useEffect(() => {
    onDirtyChange(Boolean(externalId || displayName || reason));
  }, [displayName, externalId, onDirtyChange, reason]);

  const mapFieldErrors = (fes: ZoneSourceFieldError[]): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const fe of fes) {
      out[fe.field] = formatTextValidationMessage(fe.field, fe.code, 255, t);
    }
    return out;
  };

  const serverFieldMap = serverError?.fieldErrors ? mapFieldErrors(serverError.fieldErrors) : {};
  const mergedErrors = { ...serverFieldMap, ...clientErrors };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (storageUnavailable || submitting) return;

    const nextErrors: Record<string, string> = {};
    if (!providerId) {
      nextErrors.providerId = t('Vui lòng chọn nhà cung cấp.');
    }
    const extCheck = validateStrictText(externalId, {
      nullable: false,
      maxLength: 255,
      allowBlank: false,
      allowControls: false,
    });
    if (extCheck !== 'OK') {
      nextErrors.externalId = formatTextValidationMessage(t('Mã trạm / thiết bị'), extCheck, 255, t);
    }
    const dnVal = displayName === '' ? null : displayName;
    const dnCheck = validateStrictText(dnVal, {
      nullable: true,
      maxLength: 200,
      allowBlank: true,
      allowControls: true,
    });
    if (dnCheck !== 'OK') {
      nextErrors.displayName = formatTextValidationMessage(t('Tên hiển thị'), dnCheck, 200, t);
    }
    const reasonCheck = validateStrictText(reason, {
      nullable: false,
      maxLength: 1000,
      allowBlank: false,
      allowControls: false,
    });
    if (reasonCheck !== 'OK') {
      nextErrors.reason = formatTextValidationMessage(t('Lý do đăng ký'), reasonCheck, 1000, t);
    }

    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.externalId) externalIdRef.current?.focus();
      else if (nextErrors.displayName) displayNameRef.current?.focus();
      else if (nextErrors.reason) reasonRef.current?.focus();
      return;
    }

    const chosenProvider = providers.find(p => String(p.id) === providerId);
    const command: RegisterNodeOperationRequest = {
      contractVersion: 'ZS-1',
      kind: 'REGISTER_NODE',
      operationId,
      providerId,
      nodeKind,
      externalId,
      displayName: dnVal,
      reason,
    };
    onSubmit(command, chosenProvider?.displayName || chosenProvider?.code || `Provider #${providerId}`);
  };

  return (
    <form data-testid="zs-register-node-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[18px] text-[#1F5CA9] dark:text-[#60A5FA] shrink-0">
          router
        </span>
        <span className="leading-relaxed">
          {t('Việc đăng ký trạm/thiết bị chỉ lưu thông tin danh mục nguồn (Registry), không tự động xác thực hay giao tiếp phần cứng.')}
        </span>
      </div>

      {storageUnavailable && (
        <div
          data-testid="storage-unavailable-banner"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 font-semibold"
        >
          {t('Lưu trữ gián đoạn: Khóa gửi để đảm bảo an toàn biên nhận idempotency.')}
        </div>
      )}

      {serverError && (
        <div
          data-testid="register-node-server-error"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200"
        >
          {getZoneSourceErrorMessage(serverError, t)}
        </div>
      )}

      {/* Provider */}
      <div className="space-y-1.5">
        <label htmlFor="node-provider-select" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          {t('Nhà cung cấp')} <span className="text-red-600">*</span>
        </label>
        <select
          id="node-provider-select"
          data-testid="node-provider-select"
          value={providerId}
          disabled={submitting}
          onChange={e => {
            setProviderId(e.target.value);
            setClientErrors(prev => ({ ...prev, providerId: '' }));
          }}
          className="w-full h-11 min-h-[44px] px-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
        >
          {activeProviders.map(p => (
            <option key={p.id} value={String(p.id)}>
              {p.displayName || p.code} ({p.adapterKind})
            </option>
          ))}
        </select>
        {mergedErrors.providerId && (
          <p className="text-xs text-red-600 dark:text-red-400">{mergedErrors.providerId}</p>
        )}
      </div>

      {/* Node Kind */}
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          {t('Loại nút thiết bị')} <span className="text-red-600">*</span>
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          {(['STATION', 'DEVICE'] as const).map(kind => (
            <label
              key={kind}
              className={`min-h-[44px] px-3 py-2.5 rounded-lg border flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                nodeKind === kind
                  ? 'border-[#1F5CA9] bg-blue-50/60 dark:border-[#60A5FA] dark:bg-blue-950/40 text-[#1F5CA9] dark:text-[#60A5FA]'
                  : 'border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#CBD5E1]'
              }`}
            >
              <input
                type="radio"
                name="nodeKind"
                value={kind}
                checked={nodeKind === kind}
                disabled={submitting}
                onChange={() => setNodeKind(kind)}
                className="w-4 h-4 text-[#1F5CA9]"
              />
              <span>{kind === 'STATION' ? t('Trạm đo (STATION)') : t('Thiết bị (DEVICE)')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* External ID (not trimmed silently) */}
      <div className="space-y-1.5">
        <label htmlFor="node-external-id" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          {t('Mã định danh ngoài (External ID)')} <span className="text-red-600">*</span>
        </label>
        <input
          ref={externalIdRef}
          id="node-external-id"
          data-testid="node-external-id-input"
          type="text"
          value={externalId}
          disabled={submitting}
          maxLength={255}
          onChange={e => {
            setExternalId(e.target.value);
            setClientErrors(prev => ({ ...prev, externalId: '' }));
          }}
          placeholder="9001"
          className="w-full h-11 min-h-[44px] px-3 font-mono text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
        />
        {mergedErrors.externalId && (
          <p data-testid="node-external-id-error" className="text-xs text-red-600 dark:text-red-400">
            {mergedErrors.externalId}
          </p>
        )}
      </div>

      {/* Display Name */}
      <div className="space-y-1.5">
        <label htmlFor="node-display-name" className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          {t('Tên hiển thị')} <span className="text-[#64748B] font-normal">({t('Không bắt buộc')})</span>
        </label>
        <input
          ref={displayNameRef}
          id="node-display-name"
          data-testid="node-display-name-input"
          type="text"
          value={displayName}
          disabled={submitting}
          maxLength={200}
          onChange={e => {
            setDisplayName(e.target.value);
            setClientErrors(prev => ({ ...prev, displayName: '' }));
          }}
          placeholder={t('VD: Trạm quan trắc Khu B')}
          className="w-full h-11 min-h-[44px] px-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
        />
        {mergedErrors.displayName && (
          <p className="text-xs text-red-600 dark:text-red-400">{mergedErrors.displayName}</p>
        )}
      </div>

      {/* Reason */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="node-reason" className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {t('Lý do đăng ký')} <span className="text-red-600">*</span>
          </label>
          <span className="text-[11px] text-[#64748B] font-mono">{reason.length}/1000</span>
        </div>
        <textarea
          ref={reasonRef}
          id="node-reason"
          data-testid="node-reason-input"
          rows={3}
          value={reason}
          disabled={submitting}
          maxLength={1000}
          onChange={e => {
            setReason(e.target.value);
            setClientErrors(prev => ({ ...prev, reason: '' }));
          }}
          placeholder={t('Ghi rõ lý do đăng ký trạm hoặc thiết bị mới...')}
          className="w-full p-3 text-[16px] md:text-sm rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]"
        />
        {mergedErrors.reason && (
          <p data-testid="node-reason-error" className="text-xs text-red-600 dark:text-red-400">
            {mergedErrors.reason}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          data-testid="btn-register-node-cancel"
          disabled={submitting}
          onClick={onCancel}
          className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-sm font-semibold text-[#475569] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {t('Hủy')}
        </button>
        <button
          type="submit"
          data-testid="btn-register-node-submit"
          disabled={submitting || storageUnavailable}
          className="w-full sm:w-auto h-11 min-h-[44px] px-6 rounded-lg bg-[#1F5CA9] hover:bg-[#184A88] dark:bg-[#60A5FA] dark:text-[#0F172A] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? t('Đang đăng ký...') : t('Đăng ký trạm / thiết bị')}
        </button>
      </div>
    </form>
  );
}
