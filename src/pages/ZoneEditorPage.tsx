import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { t } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import useZoneEditor from '../hooks/useZoneEditor';
import ZoneForm from '../components/ZoneForm';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { useOverviewContext } from '../context/OverviewContext';

export default function ZoneEditorPage() {
  const { code } = useParams<{ code: string }>();
  return <ZoneEditorContent key={code ?? 'new'} code={code} />;
}

function ZoneEditorContent({ code }: { code?: string }) {
  useLanguage();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const overview = useOverviewContext();
  const state = useZoneEditor(code);
  const parsedId = Number(params.get('farmId'));
  const farmId = Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
  useEffect(() => {
    if (state.zone?.farmId && state.zone.farmId !== farmId) {
      const next = new URLSearchParams(params); next.set('farmId', String(state.zone.farmId)); setParams(next, { replace: true });
    }
  }, [state.zone?.farmId, farmId, params, setParams]);
  return <div className="mx-auto max-w-3xl space-y-4 md:space-y-5">
    <Link to={`/settings/zones${state.zone?.farmId || farmId ? `?farmId=${state.zone?.farmId ?? farmId}` : ''}`} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-navy dark:text-blue">
      <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_back</span>{t('Quay lại quản lý khu vực')}</Link>
    <div><h1 className="text-xl md:text-2xl font-bold text-text">{t(code ? 'Sửa khu vực' : 'Tạo khu vực mới')}</h1>
      <p className="mt-1 text-xs md:text-sm text-gray">{t(code ? 'Cập nhật thông tin khu vực và cây đại diện.' : 'Kết nối khu vực mới với nông trại và thiết bị đo.')}</p></div>
    {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} onRetry={state.retry} /> : state.farms.length === 0 ? <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-gray">{t('Cần có nông trại trước khi tạo khu vực.')}</div>
      : <ZoneForm farms={state.farms} zones={state.zones} zone={state.zone} tree={state.tree} initialFarmId={farmId} isSaving={state.isSaving} error={state.saveError} onSave={async request => {
        const result = await state.save(request);
        if (result) { await overview.refresh(); navigate(`/zones/${encodeURIComponent(result.code)}?farmId=${result.farmId}`, { state: { zoneSaved: code ? 'updated' : 'created' } }); }
      }} />}
  </div>;
}
