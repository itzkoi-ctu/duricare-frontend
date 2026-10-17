export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'SUSPENDED';
export interface ExpertProfile {
  id: number;
  userId: number;
  email: string;
  enabled: boolean;
  role: 'EXPERT';
  fullName: string;
  affiliation: string | null;
  specialties: string;
  verificationStatus: VerificationStatus;
  verificationNote: string | null;
  verifiedBy: number | null;
  verifiedAt: string | null;
  suspendedBy: number | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ExpertProfilePage {
  content: ExpertProfile[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CreateExpertRequest {
  email: string;
  initialPassword: string;
  fullName: string;
  affiliation?: string | null;
  specialties: string;
}

export interface TransitionExpertRequest {
  version: number;
  reason: string;
}

export interface CreateExpertFormValues {
  email: string;
  initialPassword: string;
  fullName: string;
  affiliation: string;
  specialties: string;
}

export interface TransitionFormValues {
  reason: string;
}
