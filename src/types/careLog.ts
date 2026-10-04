export interface CareLog {
  id: number;
  zoneId?: number | null;
  zoneCode?: string | null;
  treeId?: number | null;
  actionType: string;
  note?: string | null;
  performBy?: string | null;
  performedAt?: string | null;
}

export interface CareLogRequest {
  zoneId: number;
  actionType: string;
  note?: string | null;
  performBy?: string | null;
  treeId?: number | null;
  performedAt?: string;
}
export interface CareLogFormValues { actionType: string; note: string }
export interface CareLogTimelineProps { zoneCode: string; zoneId: number }
export interface CareLogFormProps {
  onSubmit: (values: CareLogFormValues) => Promise<boolean>;
  onClose: () => void;
  isSaving: boolean;
  error: string | null;
}

export const ACTION_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  WATERING: { label: 'Tưới nước', icon: 'water_drop' },
  FERTILIZING: { label: 'Bón phân', icon: 'eco' },
  PRUNING: { label: 'Tỉa cành', icon: 'content_cut' },
  PEST_CONTROL: { label: 'Phòng trừ sâu bệnh', icon: 'pest_control' },
  HARVESTING: { label: 'Thu hoạch', icon: 'agriculture' },
  INSPECTION: { label: 'Kiểm tra', icon: 'search' },
};
