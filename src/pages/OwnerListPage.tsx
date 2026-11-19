import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { listOwners } from '../api/owner';
import { getFarms } from '../api/farms';
import type { Farm } from '../types/farm';
import type { OwnerResponse } from '../types/owner';
import OwnerStatusBadge from '../components/owner/OwnerStatusBadge';
import OwnerCreateModal from '../components/owner/OwnerCreateModal';

function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return isoString;
  }
}

export default function OwnerListPage() {
  useLanguage();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const size = 20;

  // Filters
  const [selectedFarmId, setSelectedFarmId] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'locked'>('all');

  // Farms lookup
  const [farms, setFarms] = useState<Farm[]>([]);

  // Owners data
  const [owners, setOwners] = useState<OwnerResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Load farms once
  useEffect(() => {
    let cancelled = false;
    getFarms()
      .then(data => {
        if (!cancelled) setFarms(data);
      })
      .catch(() => {
        // Silently fail or keep empty
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch owners
  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);

    const farmIdParam = selectedFarmId === 'all' ? null : selectedFarmId;
    const enabledParam =
      selectedStatus === 'all' ? null : selectedStatus === 'active';

    const controller = new AbortController();

    listOwners(
      {
        page,
        size,
        farmId: farmIdParam,
        enabled: enabledParam,
      },
      controller.signal
    )
      .then(res => {
        if (!controller.signal.aborted) {
          setOwners(res.content ?? []);
          setTotalElements(res.totalElements ?? 0);
          setTotalPages(res.totalPages ?? 1);
        }
      })
      .catch(err => {
        if (!controller.signal.aborted && err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setError(t("Không thể tải dữ liệu chủ vườn. Vui lòng thử lại."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [page, size, selectedFarmId, selectedStatus]);

  useEffect(() => {
    const cancel = loadData();
    return () => cancel();
  }, [loadData]);

  // Handle filter changes (reset page to 0)
  const handleFarmFilterChange = (val: string) => {
    setSelectedFarmId(val === 'all' ? 'all' : Number(val));
    setPage(0);
  };

  const handleStatusFilterChange = (val: string) => {
    setSelectedStatus(val as 'all' | 'active' | 'locked');
    setPage(0);
  };

  const handleResetFilters = () => {
    setSelectedFarmId('all');
    setSelectedStatus('all');
    setPage(0);
  };

  const isFiltered = selectedFarmId !== 'all' || selectedStatus !== 'all';
  const startRecord = totalElements === 0 ? 0 : page * size + 1;
  const endRecord = Math.min((page + 1) * size, totalElements);

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <nav aria-label={t("Đường dẫn")} className="flex items-center gap-2 text-xs text-gray mb-2">
          <span>{t("Quản trị")}</span>
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            chevron_right
          </span>
          <span className="text-text font-medium">{t("Quản lý chủ vườn")}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text tracking-tight">
              {t("Quản lý chủ vườn")}
            </h1>
            <p className="text-sm text-gray mt-1 leading-[22px]">
              {t("Tạo tài khoản và quản lý quyền truy cập theo vườn.")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-11 min-h-[44px] px-5 rounded-lg bg-[#1f5ca9] hover:bg-[#174987] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0 w-full sm:w-auto"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              person_add
            </span>
            <span>{t("Tạo tài khoản")}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-wrap">
          {/* Farm filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="filter-farm" className="text-xs md:text-sm font-medium text-gray shrink-0">
              {t("Vườn:")}
            </label>
            <div className="relative">
              <select
                id="filter-farm"
                value={selectedFarmId}
                onChange={e => handleFarmFilterChange(e.target.value)}
                className="w-full sm:w-auto h-11 md:h-10 min-h-[44px] pl-3 pr-8 rounded-lg border border-border bg-bg text-sm font-medium text-text hover:border-gray/50 focus:outline-none focus:ring-2 focus:ring-[#1f5ca9]/20 focus:border-[#1f5ca9] cursor-pointer appearance-none"
              >
                <option value="all">{t("Tất cả vườn")}</option>
                {farms.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-gray"
              >
                expand_more
              </span>
            </div>
          </div>

          {/* Status filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="filter-status" className="text-xs md:text-sm font-medium text-gray shrink-0">
              {t("Trạng thái:")}
            </label>
            <div className="relative">
              <select
                id="filter-status"
                value={selectedStatus}
                onChange={e => handleStatusFilterChange(e.target.value)}
                className="w-full sm:w-auto h-11 md:h-10 min-h-[44px] pl-3 pr-8 rounded-lg border border-border bg-bg text-sm font-medium text-text hover:border-gray/50 focus:outline-none focus:ring-2 focus:ring-[#1f5ca9]/20 focus:border-[#1f5ca9] cursor-pointer appearance-none"
              >
                <option value="all">{t("Tất cả trạng thái")}</option>
                <option value="active">{t("Đang hoạt động")}</option>
                <option value="locked">{t("Đã khóa")}</option>
              </select>
              <span
                aria-hidden="true"
                className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-gray"
              >
                expand_more
              </span>
            </div>
          </div>

          {/* Active summary & reset */}
          <div className="flex items-center justify-between md:ml-auto w-full md:w-auto gap-3 text-xs md:text-sm text-gray pt-1 md:pt-0">
            <span>
              {t("Bộ lọc:")}{' '}
              <strong className="font-semibold text-text">
                {t("{0} tài khoản", [totalElements])}
              </strong>
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[#1f5ca9] hover:underline font-medium cursor-pointer"
              >
                {t("Đặt lại")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-surface border border-border rounded-xl p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 bg-border/60 rounded animate-pulse" />
            <div className="h-5 w-24 bg-border/60 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 w-full bg-border/30 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-surface p-6 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50/40 dark:bg-red-950/20 flex items-start gap-3">
          <span aria-hidden="true" className="material-symbols-outlined text-red-600 text-xl shrink-0 mt-0.5">
            sync_problem
          </span>
          <div className="space-y-2 flex-1">
            <h3 className="text-sm font-bold text-red-900 dark:text-red-300">
              {t("Không thể tải dữ liệu chủ vườn")}
            </h3>
            <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
              {error}
            </p>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-surface hover:bg-red-50 text-xs font-semibold cursor-pointer transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                refresh
              </span>
              <span>{t("Thử lại")}</span>
            </button>
          </div>
        </div>
      ) : owners.length === 0 ? (
        isFiltered ? (
          /* Filtered empty state */
          <div className="bg-surface p-8 rounded-xl border border-border text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
              <span aria-hidden="true" className="material-symbols-outlined text-2xl">
                filter_list_off
              </span>
            </div>
            <h2 className="text-sm font-bold text-text">
              {t("Không tìm thấy tài khoản phù hợp")}
            </h2>
            <p className="text-xs text-gray max-w-sm mx-auto leading-relaxed">
              {t("Không có tài khoản nào khớp với bộ lọc vườn và trạng thái đã chọn.")}
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 h-10 min-h-[44px] px-4 rounded-lg border border-border bg-surface hover:bg-border/40 text-text text-xs font-semibold cursor-pointer transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                clear_all
              </span>
              <span>{t("Xóa bộ lọc")}</span>
            </button>
          </div>
        ) : (
          /* Unfiltered empty state */
          <div className="bg-surface p-8 rounded-xl border border-border text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-bg text-gray flex items-center justify-center mx-auto border border-border">
              <span aria-hidden="true" className="material-symbols-outlined text-2xl">
                person_off
              </span>
            </div>
            <h2 className="text-sm font-bold text-text">
              {t("Chưa có tài khoản chủ vườn nào")}
            </h2>
            <p className="text-xs text-gray max-w-sm mx-auto leading-relaxed">
              {t("Hệ thống chưa ghi nhận tài khoản chủ vườn trong cơ sở dữ liệu CTU Agronomy.")}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 h-10 min-h-[44px] px-4 rounded-lg bg-[#1f5ca9] hover:bg-[#174987] text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                add
              </span>
              <span>{t("Tạo tài khoản đầu tiên")}</span>
            </button>
          </div>
        )
      ) : (
        /* List with data */
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
          {/* Desktop Table View (lg+) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg border-b border-border text-xs font-semibold text-gray uppercase tracking-wider select-none">
                  <th scope="col" className="py-3.5 px-6">
                    {t("Email")}
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    {t("Vườn")}
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    {t("Trạng thái")}
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    {t("Ngày tạo")}
                  </th>
                  <th scope="col" className="py-3.5 px-6 text-right">
                    {t("Thao tác")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {owners.map(owner => (
                  <tr key={owner.id} className="hover:bg-bg/60 transition-colors">
                    <td className="owner-email py-4 px-6 font-medium text-text break-all">
                      {owner.email}
                    </td>
                    <td className="py-4 px-6 text-text/80">
                      {owner.farmName}
                    </td>
                    <td className="py-4 px-6">
                      <OwnerStatusBadge enabled={owner.enabled} />
                    </td>
                    <td className="py-4 px-6 text-gray text-xs">
                      {formatDateTime(owner.createdAt)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/settings/owners/${owner.id}`}
                        className="owner-order-link inline-flex items-center justify-center min-h-[44px] px-3 text-xs font-semibold text-[#1f5ca9] hover:text-[#174987] hover:bg-[#eff4ff] dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        {t("Xem chi tiết")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (< lg) */}
          <div className="lg:hidden p-4 space-y-3" data-owner-mobile-list>
            {owners.map(owner => (
              <div
                key={owner.id}
                className="p-4 rounded-xl border border-border bg-bg/50 shadow-2xs flex flex-col space-y-3"
              >
                <div className="owner-card-heading flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="owner-email text-sm font-semibold text-text break-all leading-snug">
                      {owner.email}
                    </span>
                  </div>
                  <OwnerStatusBadge enabled={owner.enabled} className="shrink-0" />
                </div>

                <div className="grid grid-cols-1 gap-1.5 pt-1 text-gray text-xs">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#1f5ca9] shrink-0">
                      yard
                    </span>
                    <span className="text-text font-medium truncate">
                      {owner.farmName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-gray shrink-0">
                      calendar_today
                    </span>
                    <span className="tabular-nums">
                      {t("Ngày tạo: {0}", [formatDateTime(owner.createdAt)])}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 flex justify-end">
                  <Link
                    to={`/settings/owners/${owner.id}`}
                    className="owner-order-link min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 text-xs font-semibold text-[#1f5ca9] hover:bg-[#eff4ff] dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                  >
                    <span>{t("Xem chi tiết")}</span>
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      chevron_right
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Table Footer with Pagination */}
          <div className="px-6 py-4 bg-surface border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray">
            <div>
              {t("Hiển thị {0} - {1} trong tổng số {2} tài khoản (20 bản ghi / trang)", [
                startRecord,
                endRecord,
                totalElements,
              ])}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                aria-label={t("Trang trước")}
                className="h-11 min-h-[44px] px-3.5 rounded-lg border border-border text-text bg-surface hover:bg-border/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-colors"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  chevron_left
                </span>
                <span>{t("Trước")}</span>
              </button>

              <div className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg border border-[#1f5ca9] bg-[#eff4ff] dark:bg-blue-950/50 text-[#1f5ca9] dark:text-blue-300 font-semibold flex items-center justify-center text-xs">
                {page + 1}
              </div>

              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                aria-label={t("Trang tiếp")}
                className="h-11 min-h-[44px] px-3.5 rounded-lg border border-border text-text bg-surface hover:bg-border/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-colors"
              >
                <span>{t("Sau")}</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explanatory note */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray px-1">
        <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-gray shrink-0">
          info
        </span>
        <span>
          {t("Tài khoản chủ vườn được phân quyền truy cập nhật ký chăm sóc và dữ liệu cảm biến trực thuộc từng vườn.")}
        </span>
      </div>

      {/* Create Modal */}
      <OwnerCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={newOwner => {
          setIsCreateOpen(false);
          // Navigate to new owner detail page
          navigate(`/settings/owners/${newOwner.id}`);
        }}
      />
    </div>
  );
}
