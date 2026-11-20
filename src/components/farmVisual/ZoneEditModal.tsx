import React, { useState, useEffect, useRef } from 'react';
import type { Zone, ZoneRequest } from '../../types/zone';
import { updateZone } from '../../api/zones';
import { getTree } from '../../api/trees';
import { t } from '../../i18n';

interface ZoneEditModalProps {
  isOpen: boolean;
  zone: Zone | null;
  onClose: () => void;
  onSuccess: (updatedZone: Zone) => void;
}

export default function ZoneEditModal({
  isOpen,
  zone,
  onClose,
  onSuccess,
}: ZoneEditModalProps) {
  const [name, setName] = useState('');
  const [area, setArea] = useState<string>('');
  const [soilType, setSoilType] = useState('');
  const [variety, setVariety] = useState('');
  const [plantingDate, setPlantingDate] = useState('');

  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [treeFetchError, setTreeFetchError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const initialFocusRef = useRef<HTMLInputElement>(null);
  const activeSessionRef = useRef(0);
  const userEditedVarietyRef = useRef(false);

  const fetchTreeInfo = (treeId: number, currentSession: number) => {
    setLoadingPrefill(true);
    setTreeFetchError(false);
    getTree(treeId)
      .then(treeData => {
        if (activeSessionRef.current !== currentSession) return;
        if (treeData) {
          if (!userEditedVarietyRef.current && treeData.variety) {
            setVariety(treeData.variety);
          }
          if (treeData.plantingDate) {
            setPlantingDate(treeData.plantingDate);
          }
        }
      })
      .catch(() => {
        if (activeSessionRef.current === currentSession) {
          setTreeFetchError(true);
        }
      })
      .finally(() => {
        if (activeSessionRef.current === currentSession) {
          setLoadingPrefill(false);
        }
      });
  };

  useEffect(() => {
    if (isOpen && zone) {
      const currentSession = ++activeSessionRef.current;
      userEditedVarietyRef.current = false;
      setName(zone.name || '');
      setArea(zone.area !== null ? String(zone.area) : '1000');
      setSoilType(zone.soilType || 'Đất sét pha thịt');
      setVariety('');
      setPlantingDate('');
      setTreeFetchError(false);
      setGeneralError(null);
      setIsSubmitting(false);

      // Attempt to prefill variety and plantingDate from representative tree if available
      if (zone.representativeTreeId) {
        fetchTreeInfo(zone.representativeTreeId, currentSession);
      }

      setTimeout(() => {
        initialFocusRef.current?.focus();
      }, 50);
    } else {
      activeSessionRef.current++;
    }
  }, [isOpen, zone]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !zone) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const parsedArea = parseFloat(area);
    if (isNaN(parsedArea) || parsedArea <= 0) {
      setGeneralError(t('Diện tích phải là một số lớn hơn 0.'));
      return;
    }

    // F3: Block mutation if representativeTreeId exists and prefill failed leaving variety empty!
    if (zone.representativeTreeId && (loadingPrefill || (treeFetchError && !variety.trim()))) {
      setGeneralError(
        t('Không thể lưu khi chưa có thông tin giống cây từ cây đại diện. Vui lòng thử lại tải thông tin hoặc nhập giống cây để tránh xóa dữ liệu.'),
      );
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    const payload: ZoneRequest = {
      farmId: zone.farmId || 1,
      code: zone.code, // Code is preserved exactly
      name: name.trim() || zone.code,
      area: parsedArea,
      soilType: soilType.trim(),
      variety: variety.trim(),
      plantingDate: plantingDate ? plantingDate : null,
    };

    try {
      const updated = await updateZone(zone.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('Không thể cập nhật khu vực. Vui lòng kiểm tra lại thông tin.');
      setGeneralError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-zone-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full h-full md:h-auto md:max-w-[520px] bg-white dark:bg-[#0f172a] md:rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[100vh] md:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-[#f8f9ff] dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#004489]/10 text-[#004489] dark:bg-[#60a5fa]/20 dark:text-[#60a5fa] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">edit_square</span>
            </div>
            <div>
              <h2 id="edit-zone-title" className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">
                {t('Sửa thông tin khu vực')}
              </h2>
              <p className="text-[11px] text-[#64748b] dark:text-slate-400">
                {t('Mã {0} · Thuộc {1}', [zone.code, zone.farmName || t('Vườn hiện tại')])}
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

          {/* Locked Code & Farm Notice */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#0b1c30] dark:text-slate-200">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-sm">lock</span>
                {t('Thuộc tính khóa kỹ thuật (Read-only)')}
              </span>
              <span className="font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[#004489] dark:text-[#60a5fa] font-bold">
                {zone.code}
              </span>
            </div>
            <p className="text-[11px] text-[#64748b] dark:text-slate-400 leading-relaxed">
              {t('Mã khu vực và Nông trại liên kết bị khóa cố định để đảm bảo tính toàn vẹn của broker MQTT và cấu hình sensor. Cần quy trình phối hợp nếu muốn đổi mã.')}
            </p>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#0b1c30] dark:text-slate-200">
              {t('Tên khu vực')} <span className="text-red-500">*</span>
            </label>
            <input
              ref={initialFocusRef}
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

          {/* Tree Prefill Error Banner */}
          {treeFetchError && !variety.trim() && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between gap-2.5 text-xs text-red-700 dark:text-red-300">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-red-500">warning</span>
                <span>{t('Không thể nạp giống cây từ cây đại diện. Nhập giống cây hoặc thử lại để tránh xóa dữ liệu.')}</span>
              </div>
              {zone.representativeTreeId && (
                <button
                  type="button"
                  onClick={() => fetchTreeInfo(zone.representativeTreeId!, activeSessionRef.current)}
                  className="h-11 min-h-[44px] px-3.5 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-100 text-xs font-semibold shrink-0 flex items-center justify-center transition-colors"
                >
                  {t('Thử lại')}
                </button>
              )}
            </div>
          )}

          {/* Variety & Planting Date (With prefill indicator) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#0b1c30] dark:text-slate-200">
                  {t('Giống cây')}
                </label>
                {loadingPrefill && (
                  <span className="text-[10px] text-slate-400 animate-pulse">{t('Nạp từ cây...')}</span>
                )}
              </div>
              <input
                type="text"
                value={variety}
                onChange={e => {
                  userEditedVarietyRef.current = true;
                  setVariety(e.target.value);
                }}
                placeholder="VD: Ri6, Monthong..."
                className="w-full h-[44px] min-h-[44px] px-3.5 text-base md:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 focus:outline-none focus:border-[#004489]"
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
                className="w-full h-[44px] min-h-[44px] px-3.5 text-base md:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-slate-100 focus:outline-none focus:border-[#004489]"
              />
            </div>
          </div>

          {/* Footer CTAs: Mobile Stacked (Primary above Cancel), Desktop Row */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row-reverse items-stretch md:items-center gap-2.5">
            <button
              type="submit"
              disabled={isSubmitting || loadingPrefill || (!!zone.representativeTreeId && treeFetchError && !variety.trim())}
              data-testid="btn-submit-edit-zone"
              className="w-full md:w-auto h-[44px] min-h-[44px] px-5 rounded-xl bg-[#004489] hover:bg-[#184988] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('Đang lưu...')}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">check</span>
                  <span>{t('Lưu thay đổi')}</span>
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
