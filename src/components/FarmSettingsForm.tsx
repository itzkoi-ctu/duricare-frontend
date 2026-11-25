import { useState, useEffect } from 'react';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import {
  FarmFields,
  type FarmFormValues,
} from './farm/FarmFields';
import {
  validateFarmFormValues,
  convertFormValuesToRequest,
} from '../utils/farmValidation';
import type { FarmSettingsFormProps } from '../types/farm';

export default function FarmSettingsForm({
  farm,
  isSaving,
  error,
  isUncertain = false,
  onSave,
  onReconcile,
}: FarmSettingsFormProps) {
  useLanguage();

  const [values, setValues] = useState<FarmFormValues>({
    name: farm.name,
    location: farm.location ?? '',
    area: farm.area !== null && farm.area !== undefined ? String(farm.area) : '',
    latitude: farm.latitude !== null && farm.latitude !== undefined ? String(farm.latitude) : '',
    longitude: farm.longitude !== null && farm.longitude !== undefined ? String(farm.longitude) : '',
  });

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [showClearCoordinatesModal, setShowClearCoordinatesModal] = useState(false);

  useEffect(() => {
    setValues({
      name: farm.name,
      location: farm.location ?? '',
      area: farm.area !== null && farm.area !== undefined ? String(farm.area) : '',
      latitude: farm.latitude !== null && farm.latitude !== undefined ? String(farm.latitude) : '',
      longitude: farm.longitude !== null && farm.longitude !== undefined ? String(farm.longitude) : '',
    });
    setErrors({});
  }, [farm]);

  const handleChange = (field: keyof FarmFormValues, val: string) => {
    setValues((prev) => ({ ...prev, [field]: val }));
    if (errors[field] || errors.coordinates) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
        coordinates:
          field === 'latitude' || field === 'longitude' ? undefined : prev.coordinates,
      }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const val = validateFarmFormValues(values);
    if (!val.valid) {
      setErrors(val.errors);
      return;
    }

    // Check if clearing previously saved coordinates (E05)
    const hadCoords = farm.latitude !== null && farm.longitude !== null;
    const nowHasEmptyCoords = !values.latitude.trim() && !values.longitude.trim();
    if (hadCoords && nowHasEmptyCoords) {
      setShowClearCoordinatesModal(true);
      return;
    }

    const request = convertFormValuesToRequest(values);
    await onSave(request);
  };

  const handleConfirmClearCoordinates = async () => {
    setShowClearCoordinatesModal(false);
    const clearedValues = { ...values, latitude: '', longitude: '' };
    const request = convertFormValuesToRequest(clearedValues);
    await onSave(request);
  };

  const handleKeepCoordinates = () => {
    setShowClearCoordinatesModal(false);
    setValues((prev) => ({
      ...prev,
      latitude: farm.latitude !== null ? String(farm.latitude) : '',
      longitude: farm.longitude !== null ? String(farm.longitude) : '',
    }));
  };

  return (
    <>
      <form
        noValidate
        aria-label={t('Cài đặt nông trại')}
        onSubmit={handleFormSubmit}
        className="rounded-xl border border-border bg-surface p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <span aria-hidden="true" className="material-symbols-outlined text-navy">
            agriculture
          </span>
          <h2 className="text-base font-bold text-text">
            {t('Thông tin vườn')}
          </h2>
        </div>

        {isUncertain && (
          <div className="mb-5 space-y-4">
            <div>
              <button
                type="button"
                disabled={isSaving}
                onClick={onReconcile}
                className="min-h-11 px-5 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  refresh
                </span>
                {t('Tải lại thông tin hiện tại')}
              </button>
            </div>
            <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 flex gap-3 text-amber-800 dark:text-amber-200">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-lg shrink-0 mt-0.5"
              >
                warning
              </span>
              <div className="space-y-1">
                <strong className="block text-sm font-semibold">
                  {t('Chưa xác nhận được thay đổi')}
                </strong>
                <p className="text-xs leading-relaxed">
                  {t(
                    'Kết nối bị gián đoạn. Hãy tải lại thông tin hiện tại trước khi quyết định gửi lại.'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <fieldset disabled={isSaving || isUncertain} className="space-y-4">
          <FarmFields
            idPrefix="farm-settings"
            values={values}
            onChange={handleChange}
            errors={errors}
            disabled={isSaving || isUncertain}
          />
        </fieldset>

        {error && (
          <p role="alert" className="mt-3 text-xs text-coral font-medium">
            {t(error)}
          </p>
        )}

        <div className="mt-6 pt-5 border-t border-border flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSaving || isUncertain}
            className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span
                  aria-hidden="true"
                  className="w-4 h-4 border-2 border-surface border-r-transparent rounded-full animate-spin"
                />
                <span>{t('Đang lưu…')}</span>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  save
                </span>
                <span>{t('Lưu thay đổi')}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal E05: Clear Saved Coordinates */}
      {showClearCoordinatesModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-coords-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-[520px] bg-surface rounded-xl shadow-xl border border-border p-6 space-y-4">
            <h2 id="clear-coords-title" className="text-base font-bold text-text">
              {t('Xóa tọa độ đã lưu?')}
            </h2>
            <p className="text-xs text-gray leading-relaxed">
              {t(
                'Thông tin thời tiết theo vị trí sẽ không còn khả dụng cho vị trí hiện tại của vườn. Dữ liệu thời tiết đã lưu không bị xóa bởi thao tác này.'
              )}
            </p>

            <div className="rounded-lg border border-border bg-surface-soft p-3 text-xs">
              <span className="text-gray mr-3">{t('Vườn')}:</span>
              <strong className="font-semibold text-text">
                {farm.name} · #{farm.id}
              </strong>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={handleConfirmClearCoordinates}
                className="min-h-11 px-5 rounded-lg border border-border bg-surface hover:bg-surface-soft text-text text-sm font-medium cursor-pointer"
              >
                {t('Xóa tọa độ và lưu')}
              </button>
              <button
                type="button"
                onClick={handleKeepCoordinates}
                className="min-h-11 px-6 rounded-lg bg-navy hover:bg-navy-hover text-surface text-sm font-semibold shadow-sm cursor-pointer"
              >
                {t('Giữ tọa độ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
