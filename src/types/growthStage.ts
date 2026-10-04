import type { GrowthStage } from './zone';

export interface GrowthStageFormValues { growthStage: GrowthStage }
export interface GrowthStageControlProps {
  stage: GrowthStage | null;
  treeId: number | null;
  isSaving: boolean;
  error: string | null;
  saved: boolean;
  onSave: (stage: GrowthStage) => Promise<boolean>;
  onOpen: () => void;
}
