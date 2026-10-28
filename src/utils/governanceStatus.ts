import type {
  RevisionStatus,
  SourceType,
  Topic,
  GrowthStage,
  Tier,
  AssignmentStatus,
  DecisionOutcome,
} from '../types/governance';

export interface StatusConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
  icon: string;
  description: string;
}

export const REVISION_STATUS_CONFIG: Record<RevisionStatus, StatusConfig> = {
  DRAFT: {
    label: 'Bản nháp',
    badgeClass: 'bg-gray/10 text-gray border-gray/30 dark:bg-gray/20 dark:text-gray/90',
    dotClass: 'bg-gray',
    icon: 'edit_note',
    description: 'Hồ sơ đang trong quá trình soạn thảo, chưa gửi thẩm định.',
  },
  SUBMITTED: {
    label: 'Đã gửi thẩm định',
    badgeClass: 'bg-amber/10 text-amber border-amber/30 dark:bg-amber/20 dark:text-amber',
    dotClass: 'bg-amber',
    icon: 'schedule',
    description: 'Hồ sơ đã được gửi và đang chờ quản trị viên phân công chuyên gia thẩm định.',
  },
  IN_REVIEW: {
    label: 'Đang thẩm định',
    badgeClass: 'bg-blue/10 text-blue border-blue/30 dark:bg-blue/20 dark:text-blue',
    dotClass: 'bg-blue',
    icon: 'rate_review',
    description: 'Chuyên gia được phân công đang tiến hành đánh giá và thẩm định hồ sơ.',
  },
  CHANGES_REQUESTED: {
    label: 'Yêu cầu sửa đổi',
    badgeClass: 'bg-coral/10 text-coral border-coral/30 dark:bg-coral/20 dark:text-coral',
    dotClass: 'bg-coral',
    icon: 'feedback',
    description: 'Người thẩm định yêu cầu tác giả điều chỉnh hoặc bổ sung căn cứ cho hồ sơ.',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    badgeClass: 'bg-teal/10 text-teal border-teal/30 dark:bg-teal/20 dark:text-teal',
    dotClass: 'bg-teal',
    icon: 'verified',
    description: 'Hồ sơ nguồn đã được thẩm định đạt tiêu chuẩn chuyên môn.',
  },
  REJECTED: {
    label: 'Từ chối',
    badgeClass: 'bg-coral/15 text-coral border-coral/40 dark:bg-coral/25 dark:text-coral',
    dotClass: 'bg-coral',
    icon: 'cancel',
    description: 'Hồ sơ không đạt yêu cầu thẩm định chuyên môn.',
  },
  WITHDRAWN: {
    label: 'Đã rút',
    badgeClass: 'bg-border/60 text-gray border-border dark:bg-border/40 dark:text-gray',
    dotClass: 'bg-gray',
    icon: 'archive',
    description: 'Tác giả đã chủ động rút hồ sơ này.',
  },
};

export const ASSIGNMENT_STATUS_CONFIG: Record<AssignmentStatus, StatusConfig> = {
  ACTIVE: {
    label: 'Đang thực hiện',
    badgeClass: 'bg-blue/10 text-blue border-blue/30 dark:bg-blue/20 dark:text-blue',
    dotClass: 'bg-blue',
    icon: 'pending_actions',
    description: 'Nhiệm vụ thẩm định đang được chuyên gia tiến hành.',
  },
  COMPLETED: {
    label: 'Đã hoàn thành',
    badgeClass: 'bg-teal/10 text-teal border-teal/30 dark:bg-teal/20 dark:text-teal',
    dotClass: 'bg-teal',
    icon: 'task_alt',
    description: 'Chuyên gia đã đưa ra quyết định thẩm định cuối cùng.',
  },
  REPLACED: {
    label: 'Đã thay thế',
    badgeClass: 'bg-amber/10 text-amber border-amber/30 dark:bg-amber/20 dark:text-amber',
    dotClass: 'bg-amber',
    icon: 'change_circle',
    description: 'Quản trị viên đã phân công nhiệm vụ cho chuyên gia khác.',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'bg-border/60 text-gray border-border dark:bg-border/40 dark:text-gray',
    dotClass: 'bg-gray',
    icon: 'cancel',
    description: 'Nhiệm vụ bị hủy do tác giả rút hồ sơ.',
  },
};

export const DECISION_OUTCOME_CONFIG: Record<DecisionOutcome, { label: string; badgeClass: string; icon: string }> = {
  APPROVED: {
    label: 'Phê duyệt',
    badgeClass: 'bg-teal/15 text-teal border-teal/40 font-bold',
    icon: 'check_circle',
  },
  CHANGES_REQUESTED: {
    label: 'Yêu cầu sửa đổi',
    badgeClass: 'bg-amber/15 text-amber border-amber/40 font-bold',
    icon: 'edit_document',
  },
  REJECTED: {
    label: 'Từ chối',
    badgeClass: 'bg-coral/15 text-coral border-coral/40 font-bold',
    icon: 'cancel',
  },
};

export const SOURCE_TYPE_CONFIG: Record<SourceType, string> = {
  OFFICIAL_DOCUMENT: 'Văn bản chính thức',
  RESEARCH_PUBLICATION: 'Nghiên cứu khoa học',
  RESEARCH_INSTITUTE_GUIDE: 'Hướng dẫn kỹ thuật viện nghiên cứu',
  COOPERATIVE_MANUAL: 'Quy trình HTX / tổ chức sản xuất',
  COMMERCIAL_GUIDE: 'Tài liệu thương mại / nhà cung cấp',
  FIELD_INTERVIEW: 'Kinh nghiệm / phỏng vấn thực địa',
  OTHER: 'Khác',
};

export const TOPIC_CONFIG: Record<Topic, string> = {
  IRRIGATION: 'Tưới nước & quản lý ẩm',
  FERTILIZATION: 'Dinh dưỡng & bón phân',
  GENERAL: 'Tổng quát & canh tác',
};

export const GROWTH_STAGE_CONFIG: Record<GrowthStage, string> = {
  KIEN_THIET_CO_BAN: 'Kiến thiết cơ bản (0 - 4 năm)',
  XIET_NUOC: 'Xiết nước (tạo mầm hoa)',
  RA_HOA: 'Ra hoa (mầm hoa đến nở)',
  DAU_TRAI: 'Đậu trái (0 - 30 ngày)',
  PHAT_TRIEN_TRAI: 'Phát triển trái (tạo cơm)',
  TRUOC_THU_HOACH: 'Trước thu hoạch',
  CHIN_THU_HOACH: 'Chín & thu hoạch',
};

export const TIER_CONFIG: Record<Tier, { label: string; desc: string; badgeClass: string }> = {
  A: {
    label: 'Tầng A',
    desc: 'Văn bản cơ quan chuyên ngành / Nghiên cứu khoa học thẩm định',
    badgeClass: 'bg-teal/15 text-teal border-teal/40 font-bold',
  },
  B: {
    label: 'Tầng B',
    desc: 'Hướng dẫn kỹ thuật viện nghiên cứu / khuyến nông',
    badgeClass: 'bg-blue/15 text-blue border-blue/40 font-bold',
  },
  C: {
    label: 'Tầng C',
    desc: 'Quy trình hợp tác xã / tổ chức sản xuất có hồ sơ',
    badgeClass: 'bg-navy/15 text-navy dark:text-blue border-navy/40 font-bold',
  },
  D: {
    label: 'Tầng D',
    desc: 'Tài liệu thương mại / nhà cung cấp có xuất xứ',
    badgeClass: 'bg-amber/15 text-amber border-amber/40 font-bold',
  },
  E: {
    label: 'Tầng E',
    desc: 'Kinh nghiệm / phỏng vấn thực địa có biên bản',
    badgeClass: 'bg-coral/15 text-coral border-coral/40 font-bold',
  },
  UNKNOWN: {
    label: 'Chưa phân tầng',
    desc: 'Chưa đủ bằng chứng xếp hạng, chờ reviewer thẩm định',
    badgeClass: 'bg-gray/15 text-gray border-gray/40 font-medium',
  },
};
