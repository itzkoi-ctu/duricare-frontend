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
  location: string;
  area: number;
  latitude: number;
  longitude: number;
}

export interface FarmSettingsFormProps {
  farm: Farm;
  isSaving: boolean;
  error: string | null;
  onSave: (request: FarmRequest) => Promise<boolean>;
}
