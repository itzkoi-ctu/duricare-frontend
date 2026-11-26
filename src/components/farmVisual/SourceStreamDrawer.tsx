import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useZoneSourcePanel } from '../../hooks/useZoneSourcePanel';
import type { Zone } from '../../types/zone';
import ZoneSourceHeader from '../zoneSource/ZoneSourceHeader';
import ZoneSourceCurrentTab from '../zoneSource/ZoneSourceCurrentTab';
import ZoneSourceHistoryTab from '../zoneSource/ZoneSourceHistoryTab';
import ZoneSourceEvidenceView from '../zoneSource/ZoneSourceEvidenceView';
import ZoneSourcePickerView from '../zoneSource/ZoneSourcePickerView';
import ZoneSourceRegisterNodeView from '../zoneSource/ZoneSourceRegisterNodeView';
import ZoneSourceRegisterStreamView from '../zoneSource/ZoneSourceRegisterStreamView';
import ZoneSourcePartialNodeView from '../zoneSource/ZoneSourcePartialNodeView';
import ZoneSourceAssignOrReplaceView from '../zoneSource/ZoneSourceAssignOrReplaceView';
import ZoneSourceStopView from '../zoneSource/ZoneSourceStopView';
import ZoneSourceConflictView from '../zoneSource/ZoneSourceConflictView';
import {
  ZoneSourceReceiptResultView,
  ZoneSourceUnknownView,
} from '../zoneSource/ZoneSourceRecoveryView';

export interface SourceStreamDrawerProps {
  isOpen: boolean;
  zone: Zone | null;
  farmId?: number | null;
  farmName?: string | null;
  isOwner?: boolean;
  onClose: () => void;
}

export default function SourceStreamDrawer({
  isOpen,
  zone,
  farmId = null,
  farmName = null,
  isOwner: isOwnerProp,
  onClose,
}: SourceStreamDrawerProps) {
  useLanguage();
  const { user } = useAuth();
  const isOwner = isOwnerProp ?? user?.role === 'OWNER';
  const drawerRef = useRef<HTMLElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const panel = useZoneSourcePanel({
    isOpen,
    zoneCode: zone?.code ?? null,
    zoneId: zone?.id ?? null,
    farmId,
    actorId: user?.id ?? null,
    isOwner,
    onClose,
  });

  // Capture trigger element on open and restore focus cleanly on close
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      triggerElementRef.current = document.activeElement as HTMLElement | null;
      wasOpenRef.current = true;
      setTimeout(() => {
        const closeBtn = drawerRef.current?.querySelector<HTMLElement>(
          '[data-testid="btn-close-source-drawer"]'
        );
        closeBtn?.focus();
      }, 20);
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerElementRef.current?.focus();
      triggerElementRef.current = null;
    }
  }, [isOpen]);

  // Escape handling
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (panel.leaveConfirmOpen) {
          panel.cancelLeave();
        } else {
          panel.requestCloseDrawer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, panel]);

  const sensors = useMemo(() => panel.statusData?.items ?? [], [panel.statusData]);

  const totalActiveAssignments = useMemo(
    () => sensors.reduce((sum, s) => sum + s.currentAssignments.length, 0),
    [sensors]
  );

  const primaryQuickAssignSensor = useMemo(() => {
    if (sensors.length === 0) return null;
    const expanded = sensors.find(s => panel.expandedSensorIds[s.sensorId]);
    if (expanded) return expanded;
    return sensors.find(s => s.sensorType === 'SOIL_MOISTURE') ?? sensors[0];
  }, [panel.expandedSensorIds, sensors]);

  if (!isOpen || !zone) return null;

  const getHeaderMeta = (): {
    title: string;
    subtitle: string;
    canGoBack: boolean;
    onBack?: () => void;
    showRefresh: boolean;
  } => {
    switch (panel.subflow.view) {
      case 'EVIDENCE':
        return {
          title: t('Chi tiết bằng chứng ghi nhận'),
          subtitle: `${panel.subflow.assignment.publicProviderLabel} · #${panel.subflow.assignment.streamId}`,
          canGoBack: true,
          onBack: () => {
            panel.setActiveTab(panel.subflow.view === 'EVIDENCE' ? panel.subflow.returnTab : 'CURRENT');
            panel.setSubflow({ view: 'MAIN' });
          },
          showRefresh: false,
        };
      case 'PICKER':
        return {
          title:
            panel.subflow.mode === 'REPLACE'
              ? t('Chọn nguồn thay thế')
              : t('Chọn nguồn cho cảm biến'),
          subtitle: t('Chọn luồng nguồn đã đăng ký hoặc tạo mới trạm/luồng.'),
          canGoBack: true,
          onBack: panel.navigateBackToMain,
          showRefresh: true,
        };
      case 'REGISTER_NODE':
        return {
          title: t('Đăng ký trạm / thiết bị mới'),
          subtitle: t('Thêm trạm quan trắc hoặc thiết bị đo vào danh mục Registry.'),
          canGoBack: true,
          onBack: () => {
            const ret =
              panel.subflow.view === 'REGISTER_NODE' ? panel.subflow.returnToPicker : undefined;
            if (ret) {
              panel.setFormDirty(false);
              panel.setInlineSubmitError(null);
              panel.setSubflow({ view: 'PICKER', ...ret });
            } else {
              panel.navigateBackToMain();
            }
          },
          showRefresh: false,
        };
      case 'PARTIAL_NODE_RETAINED':
        return {
          title: t('Trạm / thiết bị đã được giữ lại'),
          subtitle: t('Có thể đăng ký luồng cho trạm vừa tạo hoặc để sau.'),
          canGoBack: false,
          showRefresh: false,
        };
      case 'REGISTER_STREAM':
        return {
          title: t('Đăng ký luồng dữ liệu mới'),
          subtitle: t('Khai báo luồng theo trạm/thiết bị hoặc Topic MQTT 3 tầng.'),
          canGoBack: true,
          onBack: panel.navigateBackToMain,
          showRefresh: false,
        };
      case 'ASSIGN_OR_REPLACE':
        return {
          title:
            panel.subflow.mode === 'REPLACE'
              ? t('Thay thế nguồn dữ liệu')
              : panel.subflow.mode === 'CONFIGURE'
              ? t('Cấu hình nguồn đang gán')
              : panel.subflow.streamDetail.provider.adapterKind === 'IOTLAB_HTTP'
              ? t('Gán nguồn IoTLab Gateway')
              : t('Gán nguồn MQTT'),
          subtitle: `${panel.subflow.targetSensor.sensorType} #${panel.subflow.targetSensor.sensorId}`,
          canGoBack: true,
          onBack: panel.navigateBackToMain,
          showRefresh: false,
        };
      case 'STOP':
        return {
          title:
            panel.subflow.assignment.acquisitionSupport === 'LEGACY_MQTT_COMPATIBLE' ||
            panel.subflow.assignment.mqttTopic
              ? t('Ngừng gán nguồn MQTT')
              : t('Ngừng gán nguồn IoTLab'),
          subtitle: `#${panel.subflow.assignment.assignmentId} · ${panel.subflow.assignment.publicProviderLabel}`,
          canGoBack: true,
          onBack: panel.navigateBackToMain,
          showRefresh: false,
        };
      case 'CONFLICT':
        return {
          title: t('Xung đột cập nhật (409)'),
          subtitle: t('Dữ liệu nguồn hoặc phiên bản đã thay đổi trên máy chủ.'),
          canGoBack: true,
          onBack: panel.navigateBackToMain,
          showRefresh: false,
        };
      case 'UNKNOWN':
        return {
          title: t('Chưa xác nhận kết quả'),
          subtitle: t('Kiểm tra biên nhận trước khi thực hiện thao tác khác.'),
          canGoBack: false,
          showRefresh: false,
        };
      case 'RECEIPT_RESULT':
        return {
          title: t('Biên nhận thao tác nguồn'),
          subtitle: t('Bản ghi lịch sử bất biến từ máy chủ'),
          canGoBack: false,
          showRefresh: false,
        };
      case 'MAIN':
      default:
        return {
          title: t('Nguồn dữ liệu cảm biến'),
          subtitle: isOwner
            ? t('Xem nguồn dữ liệu và lịch sử tiếp nhận trong phạm vi nông trại.')
            : t('Cấu hình nguồn nhận cho từng cảm biến trong khu vực.'),
          canGoBack: false,
          showRefresh: true,
        };
    }
  };

  const headerMeta = getHeaderMeta();

  const handleRefresh = () => {
    if (panel.subflow.view === 'PICKER') {
      void panel.loadPickerStreams();
    } else {
      void panel.loadSourceStatus();
      if (panel.activeTab === 'HISTORY' && panel.historySensorId) {
        void panel.loadHistory(panel.historySensorId);
      }
    }
  };

  const drawerContent = (
    <div
      data-testid="zone-source-drawer-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-[1px]"
      onClick={e => {
        if (e.target === e.currentTarget) {
          panel.requestCloseDrawer();
        }
      }}
    >
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="zone-source-drawer-title"
        data-testid="zone-source-drawer"
        className="relative w-full md:w-[720px] max-w-full h-[100dvh] md:h-full bg-white dark:bg-[#1E293B] border-l border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] shadow-2xl flex flex-col overflow-hidden"
      >
        <ZoneSourceHeader
          farmName={farmName}
          farmId={farmId}
          zoneName={zone.name ?? ''}
          zoneCode={zone.code}
          isOwner={isOwner}
          title={headerMeta.title}
          subtitle={headerMeta.subtitle}
          canGoBack={headerMeta.canGoBack}
          onBack={headerMeta.onBack}
          onRefresh={headerMeta.showRefresh ? handleRefresh : undefined}
          refreshing={panel.statusLoading || panel.pickerLoading}
          onClose={panel.requestCloseDrawer}
          disableActions={panel.submitting || panel.checkingReceipt}
        />

        {/* Main Tabs (only visible on MAIN view) */}
        {panel.subflow.view === 'MAIN' && (
          <div
            role="tablist"
            className="px-4 sm:px-6 border-b border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] flex items-center gap-6 shrink-0"
          >
            <button
              type="button"
              role="tab"
              data-testid="tab-current-sources"
              aria-selected={panel.activeTab === 'CURRENT'}
              onClick={() => panel.setActiveTab('CURRENT')}
              className={`min-h-[44px] py-2.5 text-sm font-semibold border-b-2 -mb-px inline-flex items-center gap-2 transition-colors ${
                panel.activeTab === 'CURRENT'
                  ? 'text-[#1F5CA9] dark:text-[#60A5FA] border-[#1F5CA9] dark:border-[#60A5FA]'
                  : 'text-[#64748B] dark:text-[#94A3B8] border-transparent hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <span>{t('Nguồn hiện tại')}</span>
              <span
                className={`h-5 px-1.5 rounded-[6px] text-[11px] font-bold inline-flex items-center ${
                  panel.activeTab === 'CURRENT'
                    ? 'bg-blue-50 text-[#1F5CA9] border border-blue-200 dark:bg-blue-950 dark:text-[#60A5FA] dark:border-blue-800'
                    : 'bg-slate-100 text-[#64748B] dark:bg-slate-800 dark:text-[#94A3B8]'
                }`}
              >
                {totalActiveAssignments}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              data-testid="tab-assignment-history"
              aria-selected={panel.activeTab === 'HISTORY'}
              onClick={() => {
                panel.setActiveTab('HISTORY');
                const targetId = panel.historySensorId ?? sensors[0]?.sensorId ?? null;
                if (targetId) {
                  void panel.loadHistory(targetId);
                }
              }}
              className={`min-h-[44px] py-2.5 text-sm font-semibold border-b-2 -mb-px inline-flex items-center gap-2 transition-colors ${
                panel.activeTab === 'HISTORY'
                  ? 'text-[#1F5CA9] dark:text-[#60A5FA] border-[#1F5CA9] dark:border-[#60A5FA]'
                  : 'text-[#64748B] dark:text-[#94A3B8] border-transparent hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <span>{t('Lịch sử gán')}</span>
            </button>
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Retained Node Banner when returning to MAIN */}
          {panel.subflow.view === 'MAIN' && !isOwner && panel.retainedNode && (
            <div
              data-testid="main-retained-node-banner"
              className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200"
            >
              <span>
                {t('Trạm #{0} ({1}) đã đăng ký nhưng chưa tạo luồng.', [
                  panel.retainedNode.nodeId,
                  panel.retainedNode.externalId,
                ])}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    panel.setSubflow({
                      view: 'REGISTER_STREAM',
                      prefillNode: panel.retainedNode,
                    })
                  }
                  className="h-9 px-3 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-semibold whitespace-nowrap"
                >
                  {t('Đăng ký luồng')}
                </button>
                <button
                  type="button"
                  onClick={panel.dismissRetainedNode}
                  className="h-9 px-2.5 rounded-lg text-amber-800 dark:text-amber-300 hover:underline font-medium"
                >
                  {t('Ẩn')}
                </button>
              </div>
            </div>
          )}

          {panel.subflow.view === 'MAIN' && panel.activeTab === 'CURRENT' && (
            <ZoneSourceCurrentTab
              isOwner={isOwner}
              loading={panel.statusLoading}
              loadingMore={panel.statusLoadingMore}
              statusData={panel.statusData}
              statusError={panel.statusError}
              fallbackSensors={panel.fallbackSensors}
              expandedSensorIds={panel.expandedSensorIds}
              onToggleSensor={sensorId =>
                panel.setExpandedSensorIds(prev => ({
                  ...prev,
                  [sensorId]: !prev[sensorId],
                }))
              }
              onRetryStatus={() => void panel.loadSourceStatus()}
              onLoadMoreSensors={() => void panel.loadSourceStatus({ append: true })}
              onOpenEvidence={(assignment, evidence) =>
                panel.setSubflow({
                  view: 'EVIDENCE',
                  assignment,
                  evidence,
                  returnTab: 'CURRENT',
                })
              }
              onOpenAssignForSensor={sensor => panel.openPickerForSensor(sensor, 'ASSIGN')}
              onConfigureAssignment={(sensor, assignment) =>
                void panel.openConfigureForAssignment(sensor, assignment)
              }
              onReplaceAssignment={(sensor, assignment) =>
                panel.openPickerForSensor(sensor, 'REPLACE', assignment)
              }
              onStopAssignment={(sensor, assignment) => {
                panel.setInlineSubmitError(null);
                panel.setSubflow({ view: 'STOP', targetSensor: sensor, assignment });
              }}
            />
          )}

          {panel.subflow.view === 'MAIN' && panel.activeTab === 'HISTORY' && (
            <ZoneSourceHistoryTab
              isOwner={isOwner}
              sensors={sensors}
              selectedSensorId={panel.historySensorId}
              onSelectSensor={sid => void panel.loadHistory(sid)}
              loading={panel.historyLoading}
              loadingMore={panel.historyLoadingMore}
              items={panel.historyItems}
              nextAfterAssignmentId={panel.historyNextAfterId}
              error={panel.historyError}
              onRetry={() =>
                panel.historySensorId && void panel.loadHistory(panel.historySensorId)
              }
              onLoadMore={() =>
                panel.historySensorId &&
                void panel.loadHistory(panel.historySensorId, { append: true })
              }
              onOpenEvidence={(assignment, evidence) =>
                panel.setSubflow({
                  view: 'EVIDENCE',
                  assignment,
                  evidence,
                  returnTab: 'HISTORY',
                })
              }
            />
          )}

          {panel.subflow.view === 'EVIDENCE' && (
            <ZoneSourceEvidenceView
              assignment={panel.subflow.assignment}
              evidence={panel.subflow.evidence}
              isOwner={isOwner}
              onBack={() => {
                const retTab =
                  panel.subflow.view === 'EVIDENCE' ? panel.subflow.returnTab : 'CURRENT';
                panel.setActiveTab(retTab);
                panel.setSubflow({ view: 'MAIN' });
              }}
            />
          )}

          {panel.subflow.view === 'PICKER' && (() => {
            const sub = panel.subflow;
            const targetSensor =
              sensors.find(s => s.sensorId === sub.targetSensorId) ?? sensors[0];
            if (!targetSensor) return null;
            return (
              <ZoneSourcePickerView
                targetSensor={targetSensor}
                mode={sub.mode}
                replacingAssignment={sub.replacingAssignment}
                providers={panel.providers}
                streams={panel.pickerStreams}
                nextAfterId={panel.pickerNextAfterId}
                loading={panel.pickerLoading}
                loadingMore={panel.pickerLoadingMore}
                error={panel.pickerError}
                selectedStreamId={panel.selectedPickerStreamId}
                selectedStreamDetail={panel.selectedStreamDetail}
                detailLoading={panel.streamDetailLoading}
                detailError={panel.streamDetailError}
                filterProviderId={panel.filterProviderId}
                filterAdapterKind={panel.filterAdapterKind}
                filterSensorType={panel.filterSensorType}
                filterIncludeRetired={panel.filterIncludeRetired}
                filterSearch={panel.filterSearch}
                retainedNode={panel.retainedNode}
                onChangeProviderFilter={val => {
                  panel.setFilterProviderId(val);
                  void panel.loadPickerStreams({ providerId: val });
                }}
                onChangeAdapterFilter={val => panel.setFilterAdapterKind(val)}
                onChangeSensorTypeFilter={val => {
                  panel.setFilterSensorType(val);
                  void panel.loadPickerStreams({ sensorType: val });
                }}
                onChangeIncludeRetired={val => {
                  panel.setFilterIncludeRetired(val);
                  void panel.loadPickerStreams({ includeRetired: val });
                }}
                onChangeSearch={panel.setFilterSearch}
                onRetry={() => void panel.loadPickerStreams()}
                onLoadMore={() => void panel.loadPickerStreams({ append: true })}
                onSelectStream={sid => void panel.selectAndRefreshStream(sid)}
                onOpenRegisterNode={() => {
                  panel.setInlineSubmitError(null);
                  void panel.loadProvidersAndContract();
                  panel.setSubflow({
                    view: 'REGISTER_NODE',
                    returnToPicker: {
                      targetSensorId: sub.targetSensorId,
                      mode: sub.mode,
                      replacingAssignment: sub.replacingAssignment,
                    },
                  });
                }}
                onOpenRegisterStream={prefill => {
                  panel.setInlineSubmitError(null);
                  void panel.loadProvidersAndContract();
                  panel.setSubflow({
                    view: 'REGISTER_STREAM',
                    prefillNode: prefill ?? null,
                    returnToPicker: {
                      targetSensorId: sub.targetSensorId,
                      mode: sub.mode,
                      replacingAssignment: sub.replacingAssignment,
                    },
                  });
                }}
                onBack={panel.navigateBackToMain}
                onProceed={() => {
                  if (panel.selectedPickerStreamId !== null) {
                    void panel.proceedFromPickerToAssignOrReplace(
                      targetSensor,
                      sub.mode,
                      panel.selectedPickerStreamId,
                      sub.replacingAssignment
                    );
                  }
                }}
              />
            );
          })()}

          {panel.subflow.view === 'REGISTER_NODE' && (
            <ZoneSourceRegisterNodeView
              providers={panel.providers}
              submitting={panel.submitting}
              storageUnavailable={panel.storageUnavailable}
              serverError={panel.inlineSubmitError}
              operationId={panel.createNewOperationId()}
              onDirtyChange={panel.setFormDirty}
              onSubmit={(cmd, providerLabel) => {
                const returnToPicker =
                  panel.subflow.view === 'REGISTER_NODE'
                    ? panel.subflow.returnToPicker
                    : undefined;
                void panel.submitCommand(cmd, null, {
                  contextProviderLabel: providerLabel,
                  returnToPicker,
                });
              }}
              onCancel={() => {
                const ret =
                  panel.subflow.view === 'REGISTER_NODE'
                    ? panel.subflow.returnToPicker
                    : undefined;
                if (ret) {
                  panel.setFormDirty(false);
                  panel.setInlineSubmitError(null);
                  panel.setSubflow({ view: 'PICKER', ...ret });
                } else {
                  panel.navigateBackToMain();
                }
              }}
            />
          )}

          {panel.subflow.view === 'PARTIAL_NODE_RETAINED' && (
            <ZoneSourcePartialNodeView
              retainedNode={panel.subflow.retainedNode}
              onContinueStream={() => {
                if (panel.subflow.view !== 'PARTIAL_NODE_RETAINED') return;
                panel.setSubflow({
                  view: 'REGISTER_STREAM',
                  prefillNode: panel.subflow.retainedNode,
                  returnToPicker: panel.subflow.returnToPicker,
                });
              }}
              onDefer={() => {
                const ret =
                  panel.subflow.view === 'PARTIAL_NODE_RETAINED'
                    ? panel.subflow.returnToPicker
                    : undefined;
                if (ret) {
                  panel.setSubflow({ view: 'PICKER', ...ret });
                } else {
                  panel.setSubflow({ view: 'MAIN' });
                }
              }}
            />
          )}

          {panel.subflow.view === 'REGISTER_STREAM' && (
            <ZoneSourceRegisterStreamView
              zoneCode={zone.code}
              providers={panel.providers}
              nodes={panel.nodes}
              nodesLoading={panel.nodesLoading}
              nodesError={panel.nodesError}
              prefillNode={panel.subflow.prefillNode}
              submitting={panel.submitting}
              storageUnavailable={panel.storageUnavailable}
              serverError={panel.inlineSubmitError}
              operationId={panel.createNewOperationId()}
              onLoadNodes={pid => void panel.loadNodesForProvider(pid)}
              onDirtyChange={panel.setFormDirty}
              onOpenRegisterNode={() => {
                const ret =
                  panel.subflow.view === 'REGISTER_STREAM'
                    ? panel.subflow.returnToPicker
                    : undefined;
                panel.setFormDirty(false);
                panel.setSubflow({ view: 'REGISTER_NODE', returnToPicker: ret });
              }}
              onSubmit={cmd => {
                const ret =
                  panel.subflow.view === 'REGISTER_STREAM'
                    ? panel.subflow.returnToPicker
                    : undefined;
                void panel.submitCommand(cmd, null, { returnToPicker: ret });
              }}
              onCancel={panel.navigateBackToMain}
            />
          )}

          {panel.subflow.view === 'ASSIGN_OR_REPLACE' && (
            <ZoneSourceAssignOrReplaceView
              key={`${panel.subflow.mode}-${panel.subflow.targetSensor.sensorId}-${panel.subflow.streamDetail.id}-${panel.subflow.streamDetail.latestAssignmentVersion ?? 0}`}
              mode={panel.subflow.mode}
              zoneCode={zone.code}
              zoneId={zone.id}
              farmId={farmId}
              targetSensor={panel.subflow.targetSensor}
              streamDetail={panel.subflow.streamDetail}
              currentAssignment={panel.subflow.currentAssignment}
              replacingAssignment={panel.subflow.replacingAssignment}
              routingContract={panel.routingContract}
              iotLabMappings={panel.iotLabMappings}
              iotLabMappingsLoading={panel.iotLabMappingsLoading}
              iotLabMappingsError={panel.iotLabMappingsError}
              submitting={panel.submitting}
              storageUnavailable={panel.storageUnavailable}
              serverError={panel.inlineSubmitError}
              operationId={panel.createNewOperationId()}
              onDirtyChange={panel.setFormDirty}
              onSubmit={(cmd, snap) => void panel.submitCommand(cmd, snap)}
              onCancel={panel.navigateBackToMain}
              makeTargetSnapshot={panel.makeTargetSnapshot}
            />
          )}

          {panel.subflow.view === 'STOP' && (
            <ZoneSourceStopView
              zoneCode={zone.code}
              targetSensor={panel.subflow.targetSensor}
              assignment={panel.subflow.assignment}
              submitting={panel.submitting}
              storageUnavailable={panel.storageUnavailable}
              serverError={panel.inlineSubmitError}
              operationId={panel.createNewOperationId()}
              onDirtyChange={panel.setFormDirty}
              onSubmit={(cmd, snap) => void panel.submitCommand(cmd, snap)}
              onCancel={panel.navigateBackToMain}
            />
          )}

          {panel.subflow.view === 'CONFLICT' && (
            <ZoneSourceConflictView
              error={panel.subflow.error}
              pendingRecord={panel.subflow.pendingRecord}
              latestStreamDetail={panel.subflow.latestStreamDetail}
              latestAssignment={panel.subflow.latestAssignment}
              onRefreshStatus={() => void panel.loadSourceStatus()}
              onBackToMain={() => {
                panel.setInlineSubmitError(null);
                panel.setSubflow({ view: 'MAIN' });
              }}
            />
          )}

          {panel.subflow.view === 'UNKNOWN' && (
            <ZoneSourceUnknownView
              pendingRecord={panel.subflow.pendingRecord}
              receipt404={panel.subflow.receipt404}
              error={panel.subflow.error}
              checkingReceipt={panel.checkingReceipt}
              retrying={panel.submitting}
              storageUnavailable={panel.storageUnavailable}
              onCheckReceipt={() =>
                panel.subflow.view === 'UNKNOWN' &&
                void panel.checkPendingReceipt(panel.subflow.pendingRecord)
              }
              onRetrySameRequest={() =>
                panel.subflow.view === 'UNKNOWN' &&
                panel.retrySamePendingRequest(panel.subflow.pendingRecord)
              }
              onRequestLeave={panel.requestCloseDrawer}
            />
          )}

          {panel.subflow.view === 'RECEIPT_RESULT' && (
            <ZoneSourceReceiptResultView
              receipt={panel.subflow.receipt}
              liveStatusError={panel.subflow.liveStatusError}
              reloadingStatus={panel.statusLoading}
              onReloadLiveStatus={async () => {
                await panel.loadSourceStatus();
                if (panel.subflow.view === 'RECEIPT_RESULT' && !panel.statusError) {
                  panel.setSubflow({
                    ...panel.subflow,
                    liveStatusError: null,
                  });
                }
              }}
              onDone={() => {
                panel.setSubflow({ view: 'MAIN' });
                void panel.loadSourceStatus();
              }}
            />
          )}
        </div>

        {/* Anchored Drawer Footer (visible on MAIN view) */}
        {panel.subflow.view === 'MAIN' && (
          <footer className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              data-testid="btn-drawer-footer-close"
              onClick={panel.requestCloseDrawer}
              className="h-11 min-h-[44px] px-5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-sm font-semibold text-[#475569] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('Đóng')}
            </button>

            {isOwner ? (
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {t('Phạm vi: Nông trại của bạn (Chỉ xem)')}
              </span>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8] hidden sm:inline">
                  {t('Chọn cảm biến hoặc bắt đầu gán nguồn')}
                </span>
                <button
                  type="button"
                  data-testid="btn-footer-open-picker"
                  disabled={!primaryQuickAssignSensor || Boolean(panel.statusError?.isDisabledFeature)}
                  onClick={() =>
                    primaryQuickAssignSensor &&
                    panel.openPickerForSensor(primaryQuickAssignSensor, 'ASSIGN')
                  }
                  className="h-11 min-h-[44px] px-5 rounded-lg bg-[#1F5CA9] hover:bg-[#184A88] dark:bg-[#60A5FA] dark:text-[#0F172A] text-white text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>{t('Chọn nguồn để gán')}</span>
                </button>
              </div>
            )}
          </footer>
        )}

        {/* Single-layer Pending/Dirty Leave Confirmation Overlay inside Drawer */}
        {panel.leaveConfirmOpen && (
          <div
            data-testid="leave-confirm-overlay"
            className="absolute inset-0 z-20 bg-slate-900/45 dark:bg-black/70 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-4"
          >
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] p-5 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[24px] text-[#1F5CA9] dark:text-[#60A5FA] shrink-0">
                  help
                </span>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {t('Xác nhận rời khỏi màn hình?')}
                  </h4>
                  <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    {panel.subflow.view === 'UNKNOWN' || panel.submitting || panel.checkingReceipt
                      ? t(
                          'Yêu cầu thao tác nguồn có thể vẫn đang được xử lý trên máy chủ. Việc rời khỏi màn hình sẽ KHÔNG hủy tác vụ đang chạy và biên nhận vẫn được lưu để kiểm tra lại.'
                        )
                      : t('Các thay đổi chưa lưu trong biểu mẫu sẽ bị bỏ qua.')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  data-testid="btn-leave-stay"
                  onClick={panel.cancelLeave}
                  className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {panel.subflow.view === 'UNKNOWN'
                    ? t('Ở lại tiếp tục đợi')
                    : t('Ở lại tiếp tục')}
                </button>
                <button
                  type="button"
                  data-testid="btn-leave-confirm"
                  onClick={panel.confirmLeave}
                  className="w-full sm:w-auto h-11 min-h-[44px] px-5 rounded-lg bg-[#1F5CA9] hover:bg-[#184A88] dark:bg-[#60A5FA] dark:text-[#0F172A] text-white text-sm font-semibold transition-colors"
                >
                  {t('Rời màn hình')}
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : null;
}
