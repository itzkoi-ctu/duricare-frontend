import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { useCreateExpert } from '../hooks/useCreateExpert';
import { useToast } from '../hooks/useToast';
import type { CreateExpertFormValues } from '../types/expert';

const inputStyle =
  'min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60 [color-scheme:light] dark:[color-scheme:dark]';
const labelStyle = 'mb-1.5 block text-xs font-semibold text-text';

export default function ExpertCreatePage() {
  useLanguage();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const { isPending, error, submit, clearError } = useCreateExpert();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateExpertFormValues>({
    defaultValues: {
      email: '',
      initialPassword: '',
      fullName: '',
      affiliation: '',
      specialties: '',
    },
  });

  const busy = isPending || isSubmitting;

  const onSubmit = async (values: CreateExpertFormValues) => {
    clearError();
    const result = await submit({
      email: values.email.trim().toLowerCase(),
      initialPassword: values.initialPassword,
      fullName: values.fullName.trim(),
      affiliation: values.affiliation.trim() ? values.affiliation.trim() : null,
      specialties: values.specialties.trim(),
    });

    if (result) {
      // Clear password from memory form state immediately
      setValue('initialPassword', '');
      showSuccess(t('Đã tạo tài khoản chuyên gia thành công.'));
      navigate(`/settings/experts/${result.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
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

      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text">{t('Thêm chuyên gia mới')}</h1>
        <p className="mt-1 text-xs md:text-sm text-gray">
          {t('Cấp tài khoản chuyên môn cho chuyên gia nông nghiệp.')}
        </p>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="rounded-2xl border border-border bg-surface p-5 md:p-7 shadow-xs space-y-5"
      >
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <span aria-hidden="true" className="material-symbols-outlined text-navy dark:text-blue">
            person_add
          </span>
          <h2 className="text-sm font-bold text-text">{t('Thông tin chuyên gia')}</h2>
        </div>

        <fieldset disabled={busy} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="expert-email" className={labelStyle}>
              {t('Email')} <span className="text-coral">*</span>
            </label>
            <input
              id="expert-email"
              type="email"
              autoComplete="off"
              spellCheck={false}
              placeholder="expert@example.com"
              className={inputStyle}
              {...register('email', {
                required: 'Vui lòng nhập email.',
                maxLength: { value: 254, message: 'Email tối đa 254 ký tự.' },
                pattern: {
                  value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                  message: 'Email không đúng định dạng.',
                },
                validate: value => Boolean(value.trim()) || 'Vui lòng nhập email.',
              })}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'expert-email-error' : undefined}
            />
            {errors.email && (
              <p id="expert-email-error" role="alert" className="mt-1 text-xs text-coral">
                {t(errors.email.message || 'Vui lòng nhập email.')}
              </p>
            )}
          </div>

          {/* Initial Password */}
          <div>
            <label htmlFor="expert-password" className={labelStyle}>
              {t('Mật khẩu ban đầu')} <span className="text-coral">*</span>
            </label>
            <div className="relative">
              <input
                id="expert-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('Tối thiểu 12 ký tự, tối đa 72 byte')}
                className={`${inputStyle} pr-12 font-mono`}
                {...register('initialPassword', {
                  required: 'Vui lòng nhập mật khẩu ban đầu.',
                  validate: value => {
                    if (!value || value.length < 12) {
                      return 'Mật khẩu phải có tối thiểu 12 ký tự.';
                    }
                    const utf8Length = new TextEncoder().encode(value).length;
                    if (utf8Length > 72) {
                      return 'Mật khẩu không được vượt quá 72 byte UTF-8.';
                    }
                    return true;
                  },
                })}
                aria-invalid={Boolean(errors.initialPassword)}
                aria-describedby="expert-password-help expert-password-error"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={t(showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu')}
                className="absolute right-1 top-1 bottom-1 px-3 flex items-center justify-center text-gray hover:text-text cursor-pointer rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {errors.initialPassword && (
              <p id="expert-password-error" role="alert" className="mt-1 text-xs text-coral">
                {t(errors.initialPassword.message || 'Mật khẩu không hợp lệ.')}
              </p>
            )}
            <p id="expert-password-help" className="mt-1.5 text-xs text-gray leading-relaxed">
              {t(
                'Gửi thông tin đăng nhập cho chuyên gia qua kênh riêng. Tài khoản mới sẽ ở trạng thái chờ xác minh.'
              )}
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="expert-fullname" className={labelStyle}>
              {t('Họ và tên')} <span className="text-coral">*</span>
            </label>
            <input
              id="expert-fullname"
              type="text"
              placeholder={t('Nguyễn Văn A')}
              className={inputStyle}
              {...register('fullName', {
                required: 'Vui lòng nhập họ và tên.',
                maxLength: { value: 200, message: 'Họ và tên tối đa 200 ký tự.' },
                validate: value => Boolean(value.trim()) || 'Vui lòng nhập họ và tên.',
              })}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'expert-fullname-error' : undefined}
            />
            {errors.fullName && (
              <p id="expert-fullname-error" role="alert" className="mt-1 text-xs text-coral">
                {t(errors.fullName.message || 'Vui lòng nhập họ và tên.')}
              </p>
            )}
          </div>

          {/* Affiliation */}
          <div>
            <label htmlFor="expert-affiliation" className={labelStyle}>
              {t('Đơn vị công tác')} <span className="text-gray text-[11px] font-normal">({t('Không bắt buộc')})</span>
            </label>
            <input
              id="expert-affiliation"
              type="text"
              placeholder={t('Trường Đại học Cần Thơ, Viện Cây ăn quả Miền Nam...')}
              className={inputStyle}
              {...register('affiliation', {
                maxLength: { value: 300, message: 'Đơn vị công tác tối đa 300 ký tự.' },
              })}
              aria-invalid={Boolean(errors.affiliation)}
              aria-describedby={errors.affiliation ? 'expert-affiliation-error' : undefined}
            />
            {errors.affiliation && (
              <p id="expert-affiliation-error" role="alert" className="mt-1 text-xs text-coral">
                {t(errors.affiliation.message || '')}
              </p>
            )}
          </div>

          {/* Specialties */}
          <div>
            <label htmlFor="expert-specialties" className={labelStyle}>
              {t('Chuyên môn')} <span className="text-coral">*</span>
            </label>
            <textarea
              id="expert-specialties"
              rows={4}
              placeholder={t('Dinh dưỡng khoáng, quản lý nước, bệnh xì mủ sầu riêng...')}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-gray/70 focus:outline-none focus:ring-2 focus:ring-navy/40 disabled:opacity-60 resize-y min-h-[100px]"
              {...register('specialties', {
                required: 'Vui lòng nhập chuyên môn của chuyên gia.',
                maxLength: { value: 4000, message: 'Chuyên môn tối đa 4000 ký tự.' },
                validate: value => Boolean(value.trim()) || 'Vui lòng nhập chuyên môn của chuyên gia.',
              })}
              aria-invalid={Boolean(errors.specialties)}
              aria-describedby={errors.specialties ? 'expert-specialties-error' : undefined}
            />
            {errors.specialties && (
              <p id="expert-specialties-error" role="alert" className="mt-1 text-xs text-coral">
                {t(errors.specialties.message || 'Vui lòng nhập chuyên môn.')}
              </p>
            )}
          </div>
        </fieldset>

        {/* Server Error Message */}
        {error && (
          <div role="alert" className="rounded-xl border border-coral/30 bg-coral/10 p-3.5 text-xs text-coral leading-relaxed">
            {t(error)}
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-navy px-6 text-sm font-semibold text-surface dark:text-bg hover:opacity-95 disabled:opacity-50 cursor-pointer transition-opacity"
          >
            {busy && (
              <div className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
            )}
            <span>{t(busy ? 'Đang tạo tài khoản...' : 'Tạo tài khoản chuyên gia')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
