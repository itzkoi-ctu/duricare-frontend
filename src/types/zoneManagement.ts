import type { Farm } from './farm';
import type { Tree } from './tree';
import type { Zone, ZoneListEntry, ZoneRequest } from './zone';

export interface FarmPickerProps {
  farms: Farm[];
  value: string;
  onChange: (value: string) => void;
}

export interface ZoneManagementListProps {
  zones: ZoneListEntry[];
}

export interface ZoneFormProps {
  farms: Farm[];
  zones: Zone[];
  zone: Zone | null;
  tree: Tree | null;
  initialFarmId: number | null;
  isSaving: boolean;
  error: string | null;
  onSave: (request: ZoneRequest) => Promise<void>;
}
