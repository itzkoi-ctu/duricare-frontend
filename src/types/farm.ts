export interface Farm {
  id: number;
  name: string;
  location: string | null;
  area: number | null;
  zoneIds: number[];
  latitude: number | null;
  longitude: number | null;
}

export interface FarmRequest {
  name: string;
  location?: string | null;
  area?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface FarmSettingsFormProps {
  farm: Farm;
  isSaving: boolean;
  error: string | null;
  isUncertain?: boolean;
  onSave: (request: FarmRequest) => Promise<boolean>;
  onReconcile?: () => Promise<void>;
  onClearCoordinates?: () => void;
}
