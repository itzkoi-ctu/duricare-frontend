/** Matches backend enum: ctu.project.DuriCare.device.enums.GrowthStage */
export type GrowthStage =
  | 'KIEN_THIET_CO_BAN'
  | 'XIET_NUOC'
  | 'RA_HOA'
  | 'DAU_TRAI'
  | 'PHAT_TRIEN_TRAI'
  | 'TRUOC_THU_HOACH'
  | 'CHIN_THU_HOACH';

/** Human-readable labels for each growth stage */
export const GROWTH_STAGE_LABELS: Record<GrowthStage, string> = {
  KIEN_THIET_CO_BAN: 'Kiến thiết cơ bản',
  XIET_NUOC: 'Xiết nước',
  RA_HOA: 'Ra hoa',
  DAU_TRAI: 'Đậu trái',
  PHAT_TRIEN_TRAI: 'Phát triển trái',
  TRUOC_THU_HOACH: 'Trước thu hoạch',
  CHIN_THU_HOACH: 'Chín thu hoạch',
};

/**
 * Matches backend DTO: ctu.project.DuriCare.device.dto.ZoneResponse
 * Fields exactly mirror the Java record field names (Jackson default serialization).
 */
export interface Zone {
  id: number;
  farmId: number | null;
  farmName: string | null;
  code: string;
  name: string | null;
  area: number | null;
  soilType: string | null;
  representativeTreeId: number | null;
  growthStage: GrowthStage | null;
}

export interface ZoneRequest {
  farmId: number;
  code: string;
  name: string;
  area: number;
  soilType: string;
  variety: string;
  plantingDate: string | null;
}

export interface ZoneListEntry extends Zone {
  variety: string | null;
}

export interface ZoneFormValues extends Omit<ZoneRequest, 'farmId' | 'plantingDate'> {
  farmId: string;
  plantingDate: string;
}
