import type { GrowthStage } from './zone';

export interface UpdateGrowthStageRequest { growthStage: GrowthStage }

export interface Tree {
  id: number;
  zoneId: number | null;
  zoneCode: string | null;
  variety: string | null;
  plantingDate: string | null;
  growthStage: GrowthStage | null;
}
