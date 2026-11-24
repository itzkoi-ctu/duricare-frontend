import React from 'react';
import { t } from '../../i18n';

export interface FarmFormValues {
  name: string;
  location: string;
  area: string;
  latitude: string;
  longitude: string;
}

export interface FarmFieldsProps {
  idPrefix?: string;
  values: FarmFormValues;
  onChange: (field: keyof FarmFormValues, value: string) => void;
  errors?: Record<string, string | undefined>;
  disabled?: boolean;
}

export const defaultFarmFormValues: FarmFormValues = {
  name: '',
  location: '',
  area: '',
  latitude: '',
  longitude: '',
};

export const FarmFields: React.FC<FarmFieldsProps> = ({
  idPrefix = 'farm',
  values,
  onChange,
  errors = {},
  disabled = false,
}) => {
  const inputClass = (hasError?: boolean) =>
    `min-h-11 w-full rounded-lg border px-3 py-2 text-[16px] md:text-sm text-text placeholder:text-gray transition-colors focus:outline-none focus:ring-2 disabled:bg-surface-soft disabled:opacity-60 ${
      hasError
        ? 'border-coral focus:border-coral focus:ring-coral/40'
        : 'border-border bg-surface focus:border-navy focus:ring-navy/40'
    }`;

  const labelClass = 'mb-1.5 block text-sm font-semibold text-text';

  return (
    <div className="space-y-4">
      {/* Field 1: Name */}
      <div>
        <label htmlFor={`${idPrefix}-name`} className={labelClass}>
          {t('Tên vườn')} <span className="text-coral">*</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          autoComplete="organization"
          disabled={disabled}
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder={t('Ví dụ: Vườn Bình Minh')}
          className={inputClass(Boolean(errors.name))}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={
            errors.name ? `${idPrefix}-name-error` : `${idPrefix}-name-help`
          }
        />
        {errors.name ? (
          <p
            id={`${idPrefix}-name-error`}
            role="alert"
            className="mt-1 text-xs text-coral font-medium"
          >
            {errors.name}
          </p>
        ) : (
          <p
            id={`${idPrefix}-name-help`}
            className="mt-1 text-xs text-gray leading-normal"
          >
            {t('Tên định danh hiển thị trên toàn hệ sinh thái và thiết bị đo.')}
          </p>
        )}
      </div>

      {/* Field 2: Location */}
      <div>
        <label htmlFor={`${idPrefix}-location`} className={labelClass}>
          {t('Địa điểm')}
        </label>
        <input
          id={`${idPrefix}-location`}
          type="text"
          autoComplete="street-address"
          disabled={disabled}
          value={values.location}
          onChange={(e) => onChange('location', e.target.value)}
          placeholder={t('Ví dụ: Phong Điền, Cần Thơ')}
          className={inputClass(Boolean(errors.location))}
          aria-invalid={Boolean(errors.location)}
          aria-describedby={
            errors.location ? `${idPrefix}-location-error` : undefined
          }
        />
        {errors.location && (
          <p
            id={`${idPrefix}-location-error`}
            role="alert"
            className="mt-1 text-xs text-coral font-medium"
          >
            {errors.location}
          </p>
        )}
      </div>

      {/* Field 3: Area */}
      <div>
        <label htmlFor={`${idPrefix}-area`} className={labelClass}>
          {t('Diện tích (đơn vị chưa xác nhận)')}
        </label>
        <input
          id={`${idPrefix}-area`}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={values.area}
          onChange={(e) => onChange('area', e.target.value)}
          placeholder={t('Để trống nếu chưa đo đạc chính xác')}
          className={inputClass(Boolean(errors.area))}
          aria-invalid={Boolean(errors.area)}
          aria-describedby={errors.area ? `${idPrefix}-area-error` : undefined}
        />
        {errors.area && (
          <p
            id={`${idPrefix}-area-error`}
            role="alert"
            className="mt-1 text-xs text-coral font-medium"
          >
            {errors.area}
          </p>
        )}
      </div>

      {/* Field 4: Coordinates */}
      <div>
        <span className={labelClass}>{t('Tọa độ địa lý')}</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label
              htmlFor={`${idPrefix}-latitude`}
              className="mb-1 block text-xs font-medium text-gray"
            >
              {t('Vĩ độ')}
            </label>
            <input
              id={`${idPrefix}-latitude`}
              type="text"
              inputMode="decimal"
              disabled={disabled}
              value={values.latitude}
              onChange={(e) => onChange('latitude', e.target.value)}
              placeholder={t('Ví dụ: 10.0352')}
              className={inputClass(Boolean(errors.latitude || errors.coordinates))}
              aria-invalid={Boolean(errors.latitude || errors.coordinates)}
              aria-describedby={
                errors.latitude
                  ? `${idPrefix}-latitude-error`
                  : errors.coordinates
                  ? `${idPrefix}-coords-error`
                  : undefined
              }
            />
            {errors.latitude && (
              <p
                id={`${idPrefix}-latitude-error`}
                role="alert"
                className="mt-1 text-xs text-coral font-medium"
              >
                {errors.latitude}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-longitude`}
              className="mb-1 block text-xs font-medium text-gray"
            >
              {t('Kinh độ')}
            </label>
            <input
              id={`${idPrefix}-longitude`}
              type="text"
              inputMode="decimal"
              disabled={disabled}
              value={values.longitude}
              onChange={(e) => onChange('longitude', e.target.value)}
              placeholder={t('Ví dụ: 105.7891')}
              className={inputClass(Boolean(errors.longitude || errors.coordinates))}
              aria-invalid={Boolean(errors.longitude || errors.coordinates)}
              aria-describedby={
                errors.longitude
                  ? `${idPrefix}-longitude-error`
                  : errors.coordinates
                  ? `${idPrefix}-coords-error`
                  : undefined
              }
            />
            {errors.longitude && (
              <p
                id={`${idPrefix}-longitude-error`}
                role="alert"
                className="mt-1 text-xs text-coral font-medium"
              >
                {errors.longitude}
              </p>
            )}
          </div>
        </div>

        {errors.coordinates && !errors.latitude && !errors.longitude && (
          <p
            id={`${idPrefix}-coords-error`}
            role="alert"
            className="mt-1 text-xs text-coral font-medium"
          >
            {errors.coordinates}
          </p>
        )}

        <div className="mt-2 flex items-start gap-1.5 text-gray">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-sm shrink-0 mt-0.5"
          >
            info
          </span>
          <p className="text-xs leading-normal">
            {t(
              'Điền cả hai tọa độ hoặc để trống. Chưa có tọa độ thì chưa hiển thị thời tiết theo vị trí.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
