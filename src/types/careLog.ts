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

export const ACTION_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  WATERING: { label: 'Tưới nước', icon: '💧' },
  FERTILIZING: { label: 'Bón phân', icon: '🌿' },
  PRUNING: { label: 'Tỉa cành', icon: '✂️' },
  PEST_CONTROL: { label: 'Phòng trừ sâu bệnh', icon: '🛡️' },
  HARVESTING: { label: 'Thu hoạch', icon: '🧺' },
  INSPECTION: { label: 'Kiểm tra', icon: '🔍' },
};
