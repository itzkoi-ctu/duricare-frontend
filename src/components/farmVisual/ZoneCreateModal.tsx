import React, { useState, useEffect, useRef } from 'react';
import type { Zone, ZoneRequest } from '../../types/zone';
import { createZone } from '../../api/zones';
import { t } from '../../i18n';

interface ZoneCreateModalProps {
  isOpen: boolean;
  farmId: number;
  existingCodes: string[];
  onClose: () => void;
  onSuccess: (createdZone: Zone) => void;
}

export default function ZoneCreateModal({
  isOpen,
  farmId,
  existingCodes,
  onClose,
  onSuccess,
}: ZoneCreateModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [area, setArea] = useState<string>('1000');
  const [soilType, setSoilType] = useState('Đất sét pha thịt');
  const [variety, setVariety] = useState('Ri6');
  const [plantingDate, setPlantingDate] = useState('');

  const [codeError, setCodeError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setName('');
      setArea('1000');
      setSoilType('Đất sét pha thịt');
      setVariety('Ri6');
      setPlantingDate(new Date().toISOString().split('T')[0]);
      setCodeError(null);
      setGeneralError(null);
      setIsSubmitting(false);

      requestAnimationFrame(() => {
        if (document.activeElement === document.body || !document.activeElement) {
          initialFocusRef.current?.focus();
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setCode(val);
    if (existingCodes.some(c => c.toLowerCase() === val.toLowerCase())) {
      setCodeError(t('Mã khu vực "{0}" đã tồn tại trong nông trại này.', [val]));
    } else {
      setCodeError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!code.trim()) {
      setCodeError(t('Vui lòng nhập mã khu vực.'));
      return;
    }

    if (existingCodes.some(c => c.toLowerCase() === code.trim().toLowerCase())) {
      setCodeError(t('Mã khu vực "{0}" đã tồn tại trong nông trại này.', [code.trim()]));
      return;
    }

    const parsedArea = parseFloat(area);
    if (isNaN(parsedArea) || parsedArea <= 0) {
      setGeneralError(t('Diện tích phải là một số lớn hơn 0.'));
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    const payload: ZoneRequest = {
      farmId,
      code: code.trim(),
      name: name.trim() || `Khu vực ${code.trim()}`,
      area: parsedArea,
      soilType: soilType.trim(),
      variety: variety.trim(),
      plantingDate: plantingDate ? plantingDate : null,
    };

    try {
      const created = await createZone(payload);
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('Không thể tạo khu vực. Vui lòng kiểm tra lại thông tin.');
      setGeneralError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-zone-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full h-full md:h-auto md:max-w-[520px] bg-white dark:bg-[#0f172a] md:rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[100vh] md:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-[#f8f9ff] dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#004489]/10 text-[#004489] dark:bg-[#60a5fa]/20 dark:text-[#60a5fa] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">add_location_alt</span>
            </div>
            <div>
              <h2 id="create-zone-title" className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">
                {t('Thêm khu vực canh tác')}
              </h2>
              <p className="text-[11px] text-[#64748b] dark:text-slate-400">
                {t('Tạo lô kỹ thuật mới để theo dõi bản đồ và cảm biến')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t('Đóng')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {generalError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <span className="material-symbols-outlined text-red-500 text-base shrink-0 mt-0.5">error</span>
              <span>{generalError}</span>
            </div>
          )}

          {/* Code */}
          <div className="space-y-1">
            <label htmlFor="zone-code" className="block text-xs font-semibold text-[#0b1c30] dark:text-slate-200">
              {t('Mã khu vực (zoneCode)')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={initialFocusRef}
                id="zone-code"
                data-testid="input-zone-code"
                type="text"
                required
                value={code}
                onChange={handleCodeChange}
                placeholder="VD: A01, B02..."
                className={`w-full h-[44px] min-h-[44px] px-3.5 font-mono text-sm rounded-xl border bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 focus:outline-none transition-colors ${
                  codeError
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-300 dark:border-slate-700 focus:border-[#004489]'
                }`}
              />
              {codeError && (
                <span className="material-symbols-outlined text-red-500 absolute right-3 top-1/2 -translate-y-1/2 text-lg">
                  error
                </span>
              )}
            </div>
            {codeError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{codeError}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="zone-name" className="block text-xs font-semibold text-[#0b1c30] dark:text-slate-200">
              {t('Tên khu vực')} <span className="text-red-500">*</span>
            </label>
            <input
              id="zone-name"
              data-testid="input-zone-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="VD: Lô sầu riêng Ri6 đồi A"
              className="w-full h-[44px] min-h-[44px] px-3.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 focus:outline-none focus:border-[#004489]"
            />
          </div>

          {/* Area & Soil Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0b1c30] dark:text-slate-200">
                {t('Diện tích')} <span className="text-[11px] font-normal text-[#64748b]">({t('Đơn vị chưa xác nhận')})</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={area}
                onChange={e => setArea(e.target.value)}
                className="w-full h-[44px] min-h-[44px] px-3.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 focus:outline-none focus:border-[#004489]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0b1c30] dark:text-slate-200">
                {t('Loại đất')}
              </label>
              <input
                type="text"
                value={soilType}
                onChange={e => setSoilType(e.target.value)}
                placeholder="VD: Đất phù sa, Đất sét pha thịt..."
                className="w-full h-[44px] min-h-[44px] px-3.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 focus:outline-none focus:border-[#004489]"
              />
            </div>
          </div>

          {/* Variety & Planting Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0b1c30] dark:text-slate-200">
                {t('Giống cây')}
              </label>
              <input
                type="text"
                value={variety}
                onChange={e => setVariety(e.target.value)}
                placeholder="VD: Ri6, Monthong..."
                className="w-full h-[44px] min-h-[44px] px-3.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 focus:outline-none focus:border-[#004489]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0b1c30] dark:text-slate-200">
                {t('Ngày trồng')}
              </label>
              <input
                type="date"
                value={plantingDate}
                onChange={e => setPlantingDate(e.target.value)}
                className="w-full h-[44px] min-h-[44px] px-3.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 focus:outline-none focus:border-[#004489]"
              />
            </div>
          </div>

          {/* Footer CTAs: Mobile Stacked (Primary above Cancel), Desktop Row */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row-reverse items-stretch md:items-center gap-2.5">
            <button
              type="submit"
              disabled={isSubmitting || Boolean(codeError)}
              data-testid="btn-submit-create-zone"
              className="w-full md:w-auto h-[44px] min-h-[44px] px-5 rounded-xl bg-[#004489] hover:bg-[#184988] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('Đang tạo...')}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">check</span>
                  <span>{t('Tạo khu vực')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full md:w-auto h-[44px] min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#1e293b] dark:text-slate-200 text-xs font-semibold flex items-center justify-center transition-colors"
            >
              {t('Hủy')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
