import { Link } from 'react-router-dom';
import useAlerts from '../hooks/useAlerts';
import type { FilterSource } from '../hooks/useAlerts';
import { formatRelativeTime } from '../utils/formatTime';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import type { AlertSource } from '../types/alert';

function SourceBadge({ source }: { source: AlertSource }) {
  if (source === 'HARD') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                       bg-coral/10 text-coral border border-coral/20">
        🛡️ HARD
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                     bg-amber/10 text-amber border border-amber/20">
      🤖 AGENTIC
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const sev = severity.toUpperCase();
  if (sev === 'CRITICAL' || sev === 'DANGER') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
        🔴 {severity}
      </span>
    );
  }
  if (sev === 'WARNING') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber/10 text-amber border border-amber/20">
        ⚠️ {severity}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue/10 text-blue border border-blue/20">
      ℹ️ {severity}
    </span>
  );
}

export default function AlertsPage() {
  const {
    filteredAlerts,
    loading,
    error,
    filterSource,
    setFilterSource,
    searchQuery,
    setSearchQuery,
    counts,
    retry,
  } = useAlerts();

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={retry} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Danh sách Cảnh báo</h1>
          <p className="text-sm text-gray mt-1">
            Tổng hợp các cảnh báo chưa xử lý trong toàn bộ hệ thống
          </p>
        </div>

        {/* Counter Summary Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-medium">
          <span className="px-3 py-1.5 rounded-xl bg-surface border border-border text-text">
            Tất cả: <strong className="font-bold text-navy ml-1">{counts.total}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-surface border border-coral/30 text-coral">
            🛡️ HARD: <strong className="font-bold ml-1">{counts.hard}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-surface border border-amber/30 text-amber">
            🤖 AGENTIC: <strong className="font-bold ml-1">{counts.agentic}</strong>
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-surface border border-border rounded-2xl">
        {/* Source Dropdown Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="source-filter" className="text-xs font-medium text-gray whitespace-nowrap">
            Nguồn cảnh báo:
          </label>
          <select
            id="source-filter"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as FilterSource)}
            className="px-3 py-1.5 text-sm rounded-xl border border-border bg-bg text-text focus:outline-none focus:ring-2 focus:ring-navy/30 cursor-pointer"
          >
            <option value="ALL">Tất cả ({counts.total})</option>
            <option value="HARD">Chỉ HARD ({counts.hard})</option>
            <option value="AGENTIC">Chỉ AGENTIC ({counts.agentic})</option>
          </select>
        </div>

        {/* Search input */}
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            placeholder="Tìm theo vùng, mã, nội dung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl border border-border bg-bg text-text focus:outline-none focus:ring-2 focus:ring-navy/30"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray text-xs">
            🔍
          </span>
        </div>
      </div>

      {/* Alerts Table / List */}
      {filteredAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface border border-border rounded-2xl text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-base font-semibold text-text mb-1">
            Không tìm thấy cảnh báo phù hợp
          </h3>
          <p className="text-xs text-gray">
            {searchQuery || filterSource !== 'ALL'
              ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
              : 'Hiện không có cảnh báo nào chưa được xử lý'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile Card View (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/zones/${alert.zoneCode}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
                  >
                    📍 {alert.zoneCode}
                  </Link>
                  <SourceBadge source={alert.source} />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-medium text-text">
                    {alert.type}
                  </span>
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-xs text-gray ml-auto">
                    ⏱️ {formatRelativeTime(alert.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-text leading-relaxed mt-1">
                  {alert.message}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg/60 border-b border-border text-xs font-semibold text-gray uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3">Vùng</th>
                    <th scope="col" className="px-4 py-3">Nguồn</th>
                    <th scope="col" className="px-4 py-3">Loại / Mức độ</th>
                    <th scope="col" className="px-4 py-3">Nội dung thông báo</th>
                    <th scope="col" className="px-4 py-3 text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAlerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className="hover:bg-border/30 transition-colors"
                    >
                      {/* Zone Code */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link
                          to={`/zones/${alert.zoneCode}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
                        >
                          📍 {alert.zoneCode}
                        </Link>
                      </td>

                      {/* Source Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <SourceBadge source={alert.source} />
                      </td>

                      {/* Type & Severity */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-xs font-medium text-text font-mono">
                            {alert.type}
                          </span>
                          <SeverityBadge severity={alert.severity} />
                        </div>
                      </td>

                      {/* Message */}
                      <td className="px-4 py-3.5">
                        <p className="text-xs sm:text-sm text-text leading-relaxed max-w-2xl">
                          {alert.message}
                        </p>
                      </td>

                      {/* Relative Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs text-gray font-medium">
                        <span title={new Date(alert.createdAt).toLocaleString('vi-VN')}>
                          ⏱️ {formatRelativeTime(alert.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
