import type { VerificationStatus } from '../types/expert';

export interface ExpertStatusDescriptor {
  label: string;
  icon: string;
  tone: string;
  badgeTone: string;
  explanation: string;
}

export const EXPERT_STATUS_CONFIG: Record<VerificationStatus, ExpertStatusDescriptor> = {
  PENDING: {
    label: 'Chờ xác minh',
    icon: 'hourglass_top',
    tone: 'text-amber bg-amber/10 border-amber/30',
    badgeTone: 'bg-amber/10 text-amber border-amber/30',
    explanation: 'Hồ sơ của bạn đang chờ quản trị viên xác minh. Quyền chuyên môn sẽ được mở sau khi hồ sơ được duyệt.',
  },
  VERIFIED: {
    label: 'Đã xác minh',
    icon: 'verified',
    tone: 'text-teal bg-teal/10 border-teal/30',
    badgeTone: 'bg-teal/10 text-teal border-teal/30',
    explanation: 'Hồ sơ chuyên gia của bạn đã được xác minh. Không gian đóng góp tri thức sẽ được triển khai trong giai đoạn tiếp theo.',
  },
  SUSPENDED: {
    label: 'Tạm đình chỉ',
    icon: 'pause_circle',
    tone: 'text-coral bg-coral/10 border-coral/30',
    badgeTone: 'bg-coral/10 text-coral border-coral/30',
    explanation: 'Quyền chuyên môn của tài khoản đang tạm đình chỉ. Bạn vẫn có thể xem trạng thái của mình. Vui lòng liên hệ quản trị viên để được xem xét khôi phục.',
  },
};

export type StatusActionType = 'verify' | 'suspend' | 'reinstate';

export function getAllowedActions(status: VerificationStatus): StatusActionType[] {
  switch (status) {
    case 'PENDING':
      return ['verify', 'suspend'];
    case 'VERIFIED':
      return ['suspend'];
    case 'SUSPENDED':
      return ['reinstate'];
  }
}
