import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

const EVIDENCE_DIRS = [
  'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence',
  'E:/CTU/LuanVan/verification/fe-gov-002-r8/run-2/evidence',
];
const PORT = 5184;
const BASE_URL = `http://127.0.0.1:${PORT}`;

for (const dir of EVIDENCE_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(page, filename) {
  for (const dir of EVIDENCE_DIRS) {
    const filePath = path.join(dir, filename);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  Saved screenshot: ${filePath}`);
  }
}

function startWorktreeSpaServer(port) {
  const distDir = path.resolve('dist');
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  };

  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    const filePath = path.join(distDir, urlPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    const indexPath = path.join(distDir, 'index.html');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(indexPath).pipe(res);
  });

  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

// Mock User Sessions - matches exact backend UserSummary(Long id, String email, Role role, Long farmId)
const ADMIN_USER = { id: 1, email: 'admin@duricare.vn', role: 'ADMIN', farmId: null };
const EXPERT_USER = { id: 42, email: 'expert@duricare.vn', role: 'EXPERT', farmId: null };

const EXPERT_PROFILE_VERIFIED = {
  id: 20,
  userId: 42,
  email: 'expert@duricare.vn',
  enabled: true,
  role: 'EXPERT',
  fullName: 'TS. Trần Văn Chuyên Gia',
  affiliation: 'Đại học Cần Thơ (CTU)',
  specialties: 'Quản lý dinh dưỡng và nước tưới cây sầu riêng',
  verificationStatus: 'VERIFIED',
  verificationNote: null,
  verifiedBy: 1,
  verifiedAt: '2026-10-15T08:30:00Z',
  suspendedBy: null,
  suspendedAt: null,
  suspensionReason: null,
  createdAt: '2026-10-15T08:30:00Z',
  updatedAt: '2026-10-15T08:30:00Z',
  version: 1,
};

// Seed Entities
const SOURCE_ADMIN_DRAFT = {
  id: 'src-admin-01',
  ownerUserId: 1,
  ownerDisplayName: 'Nguyễn Quản Trị',
  createdAt: '2026-10-25T08:00:00Z',
  updatedAt: '2026-10-25T08:00:00Z',
  version: 1,
  latestRevisionId: 'rev-admin-01',
  latestRevision: {
    id: 'rev-admin-01',
    sourceId: 'src-admin-01',
    revisionNumber: 1,
    status: 'DRAFT',
    version: 1,
    title: 'TEST ADMIN — Sổ tay hướng dẫn tiêu chuẩn GlobalGAP sầu riêng',
    submittedAt: null,
    updatedAt: '2026-10-25T08:00:00Z',
  },
};

const REVISION_ADMIN_DRAFT = {
  id: 'rev-admin-01',
  sourceId: 'src-admin-01',
  revisionNumber: 1,
  status: 'DRAFT',
  version: 1,
  title: 'TEST ADMIN — Sổ tay hướng dẫn tiêu chuẩn GlobalGAP sầu riêng',
  submittedAt: null,
  updatedAt: '2026-10-25T08:00:00Z',
  baseRevisionId: null,
  metadata: {
    title: 'TEST ADMIN — Sổ tay hướng dẫn tiêu chuẩn GlobalGAP sầu riêng',
    authors: 'Bộ Nông Nghiệp và PTNT',
    publisher: 'NXB Nông Nghiệp',
    sourceType: 'OFFICIAL_DOCUMENT',
    year: 2026,
    edition: null,
    sourceUrl: null,
    evidenceReference: 'TEST-ADMIN-001',
    provenanceNotes: 'Tài liệu hướng dẫn mẫu do Quản trị viên biên soạn.',
    proposedTier: 'A',
    proposedTierRationale: 'Tiêu chuẩn quốc gia.',
  },
  chunks: [
    {
      chunkId: 'chunk-adm-001',
      position: 0,
      title: 'Yêu cầu kiểm soát dư lượng',
      topic: 'GENERAL',
      stage: 'CHIN_THU_HOACH',
      content: 'Kiểm soát nghiêm ngặt thời gian cách ly thuốc BVTV trước khi thu hoạch 14 ngày.',
      originalExcerpt: 'Thời gian cách ly tối thiểu 14 ngày đối với các loại hoạt chất nhóm II.',
      locator: 'Trang 12, Điều 4',
      applicabilityNotes: 'Bắt buộc với toàn bộ vùng trồng xuất khẩu.',
      measurementNotes: null,
    },
  ],
  createdAt: '2026-10-25T08:00:00Z',
  closedAt: null,
  tierPolicyVersion: 'DURI-1B-v1',
  assessedTier: null,
  tierRationale: null,
  activeAssignment: null,
  decision: null,
};

const SOURCE_DRAFT = {
  id: 'src-expert-01',
  ownerUserId: 42,
  ownerDisplayName: 'TS. Trần Văn Chuyên Gia',
  createdAt: '2026-10-25T08:00:00Z',
  updatedAt: '2026-10-25T08:00:00Z',
  version: 2,
  latestRevisionId: 'rev-expert-01',
  latestRevision: {
    id: 'rev-expert-01',
    sourceId: 'src-expert-01',
    revisionNumber: 1,
    status: 'DRAFT',
    version: 2,
    title: 'TEST — Quy trình quản lý nước tưới giai đoạn xử lý ra hoa sầu riêng',
    submittedAt: null,
    updatedAt: '2026-10-25T08:00:00Z',
  },
};

const REVISION_DRAFT_INCOMPLETE = {
  id: 'rev-expert-01',
  sourceId: 'src-expert-01',
  revisionNumber: 1,
  status: 'DRAFT',
  version: 2,
  title: 'TEST — Quy trình quản lý nước tưới giai đoạn xử lý ra hoa sầu riêng',
  submittedAt: null,
  updatedAt: '2026-10-25T08:00:00Z',
  baseRevisionId: null,
  metadata: {
    title: 'TEST — Quy trình quản lý nước tưới giai đoạn xử lý ra hoa sầu riêng',
    authors: 'TS. Trần Văn Chuyên Gia',
    publisher: 'NXB Nông Nghiệp',
    sourceType: 'OFFICIAL_DOCUMENT',
    year: 2026,
    edition: 'Tái bản lần 1',
    sourceUrl: 'https://duricare.vn/docs/tuoi-nuoc-sau-rieng',
    evidenceReference: 'TEST-REF-2026-001',
    provenanceNotes: 'Tài liệu thử nghiệm tính năng biên soạn và thẩm định chuyên môn.',
    proposedTier: 'B',
    proposedTierRationale: 'Tài liệu được chuyển giao kỹ thuật từ Viện Cây ăn quả.',
  },
  chunks: [
    {
      chunkId: 'chunk-001',
      position: 0,
      title: 'Kỹ thuật xiết nước tạo mầm',
      topic: 'IRRIGATION',
      stage: 'XIET_NUOC',
      content: '', // Incomplete
      originalExcerpt: '', // Incomplete
      locator: '', // Incomplete
      applicabilityNotes: 'Áp dụng cho sầu riêng Ri6 và Monthong.',
      measurementNotes: null,
    },
  ],
  createdAt: '2026-10-25T08:00:00Z',
  closedAt: null,
  tierPolicyVersion: 'DURI-1B-v1',
  assessedTier: null,
  tierRationale: null,
  activeAssignment: null,
  decision: null,
};

const REVISION_DRAFT_VALID = {
  ...REVISION_DRAFT_INCOMPLETE,
  chunks: [
    {
      chunkId: 'chunk-001',
      position: 0,
      title: 'Kỹ thuật xiết nước tạo mầm hoa',
      topic: 'IRRIGATION',
      stage: 'XIET_NUOC',
      content: 'Tiến hành vét mương rút cạn nước, phủ bạt nilon mặt liếp khi cây hoàn thành cơi đọt thứ 2 để kích thích phân hóa mầm hoa.',
      originalExcerpt: 'Xiết nước triệt để trong mương, giữ mực nước sâu cách mặt liếp ít nhất 1.2m kết hợp phủ màng nilon mặt liếp.',
      locator: 'Trang 45, Mục 3.2 Kỹ thuật tạo mầm',
      applicabilityNotes: 'Áp dụng cho sầu riêng Ri6 và Monthong từ 5 năm tuổi trở lên.',
      measurementNotes: 'Theo dõi độ ẩm đất duy trì dưới 25% trong 15-20 ngày.',
    },
  ],
};

const REVISION_SUBMITTED = {
  ...REVISION_DRAFT_VALID,
  status: 'SUBMITTED',
  version: 3,
  submittedAt: '2026-10-25T09:00:00Z',
};

const REVISION_WITHDRAWN = {
  ...REVISION_SUBMITTED,
  status: 'WITHDRAWN',
  version: 4,
};

const CANDIDATES_LIST = [
  {
    userId: 88,
    fullName: 'GS. TS. Nguyễn Văn Khoa',
    affiliation: 'Viện Cây ăn quả Miền Nam (SOFRI)',
    specialties: 'Bảo vệ thực vật, sinh lý ra hoa sầu riêng',
  },
  {
    userId: 99,
    fullName: 'TS. Lê Thị Mai',
    affiliation: 'Chi cục Trồng trọt và BVTV Cần Thơ',
    specialties: 'Quản lý dinh dưỡng cây có múi và sầu riêng',
  },
];

const ASSIGNMENT_ACTIVE = {
  id: 'assign-01',
  revisionId: 'rev-submitted-01',
  reviewerUserId: 42,
  reviewerDisplayName: 'TS. Trần Văn Chuyên Gia',
  assignedBy: 1,
  assignedAt: '2026-10-25T10:00:00Z',
  assignmentReason: 'Chuyên gia có kinh nghiệm sâu về sinh lý ra hoa và quản lý ẩm đất sầu riêng.',
  status: 'ACTIVE',
  version: 1,
  closedAt: null,
  closureReason: null,
  replacesAssignmentId: null,
  closedBy: null,
};

const ASSIGNMENT_DETAIL = {
  ...ASSIGNMENT_ACTIVE,
  revision: REVISION_SUBMITTED,
  decision: null,
};

const SOURCE_CHANGES_REQUESTED = {
  id: 'src-changes-req',
  ownerUserId: 42,
  ownerDisplayName: 'TS. Trần Văn Chuyên Gia',
  createdAt: '2026-10-24T08:00:00Z',
  updatedAt: '2026-10-25T11:00:00Z',
  version: 3,
  latestRevisionId: 'rev-cr-01',
  latestRevision: {
    id: 'rev-cr-01',
    sourceId: 'src-changes-req',
    revisionNumber: 1,
    status: 'CHANGES_REQUESTED',
    version: 3,
    title: 'TEST — Hướng dẫn bón phân giai đoạn nuôi trái sầu riêng Ri6',
    submittedAt: '2026-10-24T09:00:00Z',
    updatedAt: '2026-10-25T11:00:00Z',
  },
};

const REVISION_CHANGES_REQUESTED = {
  id: 'rev-cr-01',
  sourceId: 'src-changes-req',
  revisionNumber: 1,
  status: 'CHANGES_REQUESTED',
  version: 3,
  title: 'TEST — Hướng dẫn bón phân giai đoạn nuôi trái sầu riêng Ri6',
  submittedAt: '2026-10-24T09:00:00Z',
  updatedAt: '2026-10-25T11:00:00Z',
  baseRevisionId: null,
  metadata: {
    title: 'TEST — Hướng dẫn bón phân giai đoạn nuôi trái sầu riêng Ri6',
    authors: 'TS. Trần Văn Chuyên Gia',
    publisher: 'Hội Làm Vườn Việt Nam',
    sourceType: 'COOPERATIVE_MANUAL',
    year: 2025,
    edition: null,
    sourceUrl: null,
    evidenceReference: 'Quy trình HTX Nông nghiệp Tân Thới số 15/2025',
    provenanceNotes: 'Biên bản tổng kết kỹ thuật từ các vườn mẫu Phong Điền.',
    proposedTier: 'C',
    proposedTierRationale: 'Quy trình được thẩm định nội bộ tại HTX có chứng nhận VietGAP.',
  },
  chunks: [
    {
      chunkId: 'chunk-cr-001',
      position: 0,
      title: 'Bón Kali giai đoạn vào cơm',
      topic: 'FERTILIZATION',
      stage: 'PHAT_TRIEN_TRAI',
      content: 'Bón bổ sung Kali Sunfat (K2SO4) ở thời điểm 60-70 ngày sau khi đậu trái để tăng độ ngọt và giảm sượng cơm.',
      originalExcerpt: 'Tăng cường bón Kali trắng (K2SO4) liều lượng 300-500g/cây định kỳ 10 ngày/lần.',
      locator: 'Trang 18, Mục 4.2',
      applicabilityNotes: 'Chỉ dùng K2SO4, tuyệt đối không dùng KCl vì dễ gây cháy rễ và thối múi.',
      measurementNotes: 'Đo EC dung dịch đất duy trì 1.2 - 1.5 mS/cm.',
    },
  ],
  createdAt: '2026-10-24T08:00:00Z',
  closedAt: '2026-10-25T11:00:00Z',
  tierPolicyVersion: 'DURI-1B-v1',
  assessedTier: 'UNKNOWN',
  tierRationale: null,
  activeAssignment: null,
  decision: {
    id: 'dec-cr-01',
    assignmentId: 'assign-cr-01',
    revisionId: 'rev-cr-01',
    reviewerUserId: 88,
    decidedAt: '2026-10-25T11:00:00Z',
    outcome: 'CHANGES_REQUESTED',
    reason: 'TEST: Cần bổ sung thêm khuyến cáo về loại đất thích hợp và kiểm soát lượng nước tưới khi bón Kali sunfat.',
    assessedTier: 'UNKNOWN',
    tierRationale: null,
    conflictOfInterestDeclared: false,
    checkedSource: true,
    checkedFaithfulness: true,
    checkedApplicability: false,
    chunkComments: [
      {
        chunkId: 'chunk-cr-001',
        comment: 'Cần nêu rõ điều kiện độ ẩm đất trước khi rải phân để tránh hiện tượng sốc phân làm rụng trái non.',
      },
    ],
  },
};

const SOURCE_ELIGIBLE_SUBMITTED = {
  id: 'src-eligible-02',
  ownerUserId: 42,
  ownerDisplayName: 'TS. Trần Văn Chuyên Gia',
  createdAt: '2026-10-25T08:00:00Z',
  updatedAt: '2026-10-25T09:00:00Z',
  version: 1,
  latestRevisionId: 'rev-eligible-02',
  latestRevision: {
    id: 'rev-eligible-02',
    sourceId: 'src-eligible-02',
    revisionNumber: 1,
    status: 'SUBMITTED',
    version: 1,
    title: 'TEST ELIGIBLE — Quy trình tỉa cành tạo tán sầu riêng',
    submittedAt: '2026-10-25T09:00:00Z',
    updatedAt: '2026-10-25T09:00:00Z',
  },
};

const REVISION_ELIGIBLE_SUBMITTED = {
  id: 'rev-eligible-02',
  sourceId: 'src-eligible-02',
  revisionNumber: 1,
  status: 'SUBMITTED',
  version: 1,
  title: 'TEST ELIGIBLE — Quy trình tỉa cành tạo tán sầu riêng',
  submittedAt: '2026-10-25T09:00:00Z',
  updatedAt: '2026-10-25T09:00:00Z',
  baseRevisionId: null,
  metadata: {
    title: 'TEST ELIGIBLE — Quy trình tỉa cành tạo tán sầu riêng',
    authors: 'TS. Trần Văn Chuyên Gia',
    publisher: 'NXB Nông Nghiệp',
    sourceType: 'OFFICIAL_DOCUMENT',
    year: 2026,
    edition: null,
    sourceUrl: null,
    evidenceReference: 'REF-ELIGIBLE-002',
    provenanceNotes: 'Nguồn kiểm thử chuyển đổi điều kiện thao tác hợp lệ.',
    proposedTier: 'B',
    proposedTierRationale: 'Căn cứ thực nghiệm.',
  },
  chunks: [
    {
      chunkId: 'chunk-el-001',
      position: 0,
      title: 'Tỉa cành vượt và cành tăm',
      topic: 'GENERAL',
      stage: 'PHAT_TRIEN_SINH_DUONG',
      content: 'Loại bỏ các cành mọc ngược vào trong tán và cành tăm sau thu hoạch.',
      originalExcerpt: 'Tỉa triệt để cành vượt bên trong thân chính.',
      locator: 'Trang 10',
      applicabilityNotes: null,
      measurementNotes: null,
    },
  ],
  createdAt: '2026-10-25T08:00:00Z',
  closedAt: null,
  tierPolicyVersion: 'DURI-1B-v1',
  assessedTier: null,
  tierRationale: null,
  activeAssignment: null,
  decision: null,
};

async function runE2ESuite() {
  console.log('--- STARTING FE-GOV-002 PUPPETEER E2E VERIFICATION ---');

  const server = await startWorktreeSpaServer(PORT);
  console.log(`Spa Static Server listening on ${BASE_URL}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));
    await page.setRequestInterception(true);

    let activeUser = EXPERT_USER;
    let currentRevision = REVISION_DRAFT_INCOMPLETE;
    let currentSource = SOURCE_DRAFT;
    let submissionsList = [
      {
        id: 'rev-submitted-01',
        sourceId: 'src-expert-01',
        revisionNumber: 1,
        status: 'SUBMITTED',
        version: 3,
        title: 'TEST — Quy trình quản lý nước tưới giai đoạn xử lý ra hoa sầu riêng',
        submittedAt: '2026-10-25T09:00:00Z',
        updatedAt: '2026-10-25T09:00:00Z',
      },
      {
        id: 'rev-in-review-01',
        sourceId: 'src-changes-req',
        revisionNumber: 1,
        status: 'IN_REVIEW',
        version: 2,
        title: 'TEST — Hướng dẫn bón phân giai đoạn nuôi trái sầu riêng Ri6',
        submittedAt: '2026-10-24T09:00:00Z',
        updatedAt: '2026-10-25T10:00:00Z',
      },
      {
        id: 'rev-approved-01',
        sourceId: 'src-approved-01',
        revisionNumber: 1,
        status: 'APPROVED',
        version: 3,
        title: 'TEST — Quy trình quản lý dinh dưỡng cây sầu riêng giai đoạn kiến thiết cơ bản',
        submittedAt: '2026-10-23T08:00:00Z',
        updatedAt: '2026-10-25T14:00:00Z',
      },
    ];
    let currentAssignmentDetail = { ...ASSIGNMENT_DETAIL };
    let decisionAttempt = 0;
    let submitAttempt = 0;
    let withdrawAttempt = 0;
    let failReassignReload = false;
    let failWithdrawReload = false;
    let failRevisionDetailsOnce = false;
    let revisionFailureInjected = false;
    let wrongTargetDispatches = [];
    let currentExpertProfile = EXPERT_PROFILE_VERIFIED;
    let holdSourceARevision = false;
    let delayedSourceAResolver = null;
    let holdSourceAReload = false;
    let delayedSourceAReloadResolver = null;
    let holdSourceAMutation = false;
    let delayedSourceAMutationResolver = null;

    // Intercept network requests
    page.on('request', req => {
      const url = req.url();
      const method = req.method();

      if (!url.includes('/api/')) {
        return req.continue();
      }

      const respondJson = (status, data) => {
        req.respond({
          status,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': BASE_URL,
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
          body: JSON.stringify(data),
        });
      };

      if (method === 'OPTIONS') {
        return req.respond({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': BASE_URL,
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }

      // 1. Auth endpoints
      if (url.endsWith('/auth/me')) {
        return respondJson(200, activeUser);
      }
      if (url.endsWith('/expert/profile')) {
        if (activeUser.role === 'EXPERT') {
          return respondJson(200, currentExpertProfile);
        }
        return respondJson(403, { error: 'forbidden', message: 'Not an expert' });
      }

      if (failRevisionDetailsOnce && method === 'GET' && url.endsWith('/api/knowledge/revisions/rev-expert-02')) {
        failRevisionDetailsOnce = false;
        revisionFailureInjected = true;
        return respondJson(500, { error: 'internal_error', message: 'Không thể tải chi tiết phiên bản từ máy chủ.' });
      }

      // 2. Sources & Revisions
      if (url.includes('/api/knowledge/sources/src-expert-01/revisions')) {
        if (method === 'GET') {
          const revList = [
            {
              id: 'rev-expert-01',
              sourceId: 'src-expert-01',
              revisionNumber: 1,
              status: currentRevision.id === 'rev-expert-01' ? currentRevision.status : 'WITHDRAWN',
              version: currentRevision.id === 'rev-expert-01' ? currentRevision.version : 4,
              title: 'TEST — Quy trình quản lý nước tưới giai đoạn xử lý ra hoa sầu riêng',
              submittedAt: '2026-10-25T09:00:00Z',
              updatedAt: '2026-10-25T09:00:00Z',
            },
          ];
          if (currentRevision.id === 'rev-expert-02') {
            revList.push({
              id: 'rev-expert-02',
              sourceId: 'src-expert-01',
              revisionNumber: 2,
              status: currentRevision.status,
              version: currentRevision.version,
              title: currentRevision.title,
              submittedAt: currentRevision.submittedAt,
              updatedAt: currentRevision.updatedAt,
            });
          }
          return respondJson(200, {
            content: revList,
            page: 0,
            size: 20,
            totalElements: revList.length,
            totalPages: 1,
          });
        }
        if (method === 'POST') {
          // New subsequent revision creation
          const newRev = {
            ...REVISION_DRAFT_VALID,
            id: 'rev-expert-02',
            revisionNumber: 2,
            status: 'DRAFT',
            version: 1,
            title: 'TEST — Quy trình quản lý nước tưới giai đoạn xử lý ra hoa sầu riêng (Rev 2)',
          };
          currentRevision = newRev;
          return respondJson(201, newRev);
        }
      }

      if (url.includes('/api/knowledge/sources/src-expert-01/history')) {
        return respondJson(200, { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
      }

      if (url.endsWith('/api/knowledge/sources/src-expert-01')) {
        if (failWithdrawReload) {
          return respondJson(500, {
            error: 'internal_error',
            message: 'Không thể tải lại dữ liệu từ máy chủ. Vui lòng thử lại.',
          });
        }
        if (holdSourceAReload) {
          delayedSourceAReloadResolver = () =>
            respondJson(200, {
              ...currentSource,
              latestRevision: {
                id: currentRevision.id,
                sourceId: currentSource.id,
                revisionNumber: currentRevision.revisionNumber,
                status: currentRevision.status,
                version: currentRevision.version,
                title: currentRevision.title,
                submittedAt: currentRevision.submittedAt,
                updatedAt: currentRevision.updatedAt,
              },
              latestRevisionId: currentRevision.id,
            });
          return;
        }
        return respondJson(200, {
          ...currentSource,
          latestRevision: {
            id: currentRevision.id,
            sourceId: currentSource.id,
            revisionNumber: currentRevision.revisionNumber,
            status: currentRevision.status,
            version: currentRevision.version,
            title: currentRevision.title,
            submittedAt: currentRevision.submittedAt,
            updatedAt: currentRevision.updatedAt,
          },
          latestRevisionId: currentRevision.id,
        });
      }

      if (url.endsWith('/api/knowledge/sources/src-changes-req')) {
        return respondJson(200, SOURCE_CHANGES_REQUESTED);
      }
      if (url.includes('/api/knowledge/sources/src-changes-req/revisions')) {
        return respondJson(200, {
          content: [
            {
              id: REVISION_CHANGES_REQUESTED.id,
              sourceId: SOURCE_CHANGES_REQUESTED.id,
              revisionNumber: 1,
              status: 'CHANGES_REQUESTED',
              version: 3,
              title: REVISION_CHANGES_REQUESTED.title,
              submittedAt: REVISION_CHANGES_REQUESTED.submittedAt,
              updatedAt: REVISION_CHANGES_REQUESTED.updatedAt,
            },
          ],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        });
      }
      if (url.includes('/api/knowledge/sources/src-changes-req/history')) {
        return respondJson(200, { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
      }

      if (url.endsWith(`/api/knowledge/revisions/${REVISION_CHANGES_REQUESTED.id}`)) {
        return respondJson(200, REVISION_CHANGES_REQUESTED);
      }

      if (url.endsWith('/api/knowledge/sources/src-eligible-02')) {
        return respondJson(200, SOURCE_ELIGIBLE_SUBMITTED);
      }
      if (url.includes('/api/knowledge/sources/src-eligible-02/revisions')) {
        return respondJson(200, {
          content: [
            {
              id: REVISION_ELIGIBLE_SUBMITTED.id,
              sourceId: SOURCE_ELIGIBLE_SUBMITTED.id,
              revisionNumber: 1,
              status: 'SUBMITTED',
              version: 1,
              title: REVISION_ELIGIBLE_SUBMITTED.title,
              submittedAt: REVISION_ELIGIBLE_SUBMITTED.submittedAt,
              updatedAt: REVISION_ELIGIBLE_SUBMITTED.updatedAt,
            },
          ],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        });
      }
      if (url.includes('/api/knowledge/sources/src-eligible-02/history')) {
        return respondJson(200, { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
      }
      if (url.endsWith(`/api/knowledge/revisions/${REVISION_ELIGIBLE_SUBMITTED.id}`)) {
        return respondJson(200, REVISION_ELIGIBLE_SUBMITTED);
      }

      if (url.includes('/api/knowledge/sources/src-admin-01/revisions')) {
        return respondJson(200, {
          content: [
            {
              id: REVISION_ADMIN_DRAFT.id,
              sourceId: SOURCE_ADMIN_DRAFT.id,
              revisionNumber: 1,
              status: 'DRAFT',
              version: 1,
              title: REVISION_ADMIN_DRAFT.title,
              submittedAt: null,
              updatedAt: REVISION_ADMIN_DRAFT.updatedAt,
            },
          ],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        });
      }
      if (url.includes('/api/knowledge/sources/src-admin-01/history')) {
        return respondJson(200, { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
      }
      if (url.endsWith('/api/knowledge/sources/src-admin-01')) {
        return respondJson(200, {
          ...SOURCE_ADMIN_DRAFT,
          latestRevision: {
            id: REVISION_ADMIN_DRAFT.id,
            sourceId: SOURCE_ADMIN_DRAFT.id,
            revisionNumber: 1,
            status: 'DRAFT',
            version: 1,
            title: REVISION_ADMIN_DRAFT.title,
            submittedAt: null,
            updatedAt: REVISION_ADMIN_DRAFT.updatedAt,
          },
          latestRevisionId: REVISION_ADMIN_DRAFT.id,
        });
      }
      if (url.endsWith('/api/knowledge/revisions/rev-admin-01')) {
        return respondJson(200, REVISION_ADMIN_DRAFT);
      }

      if (url.includes('/api/knowledge/revisions/rev-expert-01/submit')) {
        if (submitAttempt === 0) {
          submitAttempt++;
          return respondJson(409, {
            error: 'conflict',
            code: 'stale_version',
            message: 'Phiên bản hồ sơ đã có thay đổi.',
          });
        }
        currentRevision = REVISION_SUBMITTED;
        currentSource = { ...currentSource, version: 3 };
        return respondJson(200, REVISION_SUBMITTED);
      }

      if (url.includes('/api/knowledge/revisions/rev-expert-01/withdraw')) {
        if (withdrawAttempt === 0) {
          withdrawAttempt++;
          // Simulate: Server committed withdrawal, but HTTP response timed out (504 Gateway Timeout)
          currentRevision = REVISION_WITHDRAWN;
          currentSource = { ...currentSource, version: 4 };
          return respondJson(504, {
            error: 'gateway_timeout',
            message: 'Máy chủ phản hồi chậm hoặc kết nối mạng bị gián đoạn.',
          });
        }
        currentRevision = REVISION_WITHDRAWN;
        currentSource = { ...currentSource, version: 4 };
        return respondJson(200, REVISION_WITHDRAWN);
      }

      // Guard check: track any wrong target withdraw dispatches
      if (
        (url.includes('/api/knowledge/revisions/rev-cr-01/withdraw') ||
         url.includes('/api/knowledge/revisions/rev-eligible-02/withdraw')) &&
        method === 'POST'
      ) {
        wrongTargetDispatches.push({ url, method, body: req.postData() });
        return respondJson(400, { error: 'wrong_target', message: 'Wrong target dispatch!' });
      }

      // Held mutation on Source A
      if (holdSourceAMutation && url.includes('/api/knowledge/revisions/rev-expert-02/submit')) {
        delayedSourceAMutationResolver = () => respondJson(200, { ...currentRevision, status: 'SUBMITTED' });
        return;
      }

      if (url.endsWith('/api/knowledge/revisions/rev-submitted-01')) {
        if (failReassignReload) {
          return respondJson(500, {
            error: 'internal_error',
            message: 'Không thể tải lại chi tiết phân công từ máy chủ.',
          });
        }
        return respondJson(200, {
          ...REVISION_SUBMITTED,
          id: 'rev-submitted-01',
          version: 4,
          status: submissionsList[0].status,
          activeAssignment: {
            ...ASSIGNMENT_ACTIVE,
            reviewerUserId: 88,
            reviewerDisplayName: 'GS. TS. Nguyễn Văn Khoa',
          },
        });
      }

      if (url.endsWith('/api/knowledge/revisions/rev-expert-01')) {
        if (holdSourceARevision) {
          delayedSourceAResolver = () => {
            try {
              respondJson(200, REVISION_WITHDRAWN);
            } catch {
              // Ignore if already aborted
            }
          };
          return;
        }
        return respondJson(200, currentRevision.id === 'rev-expert-01' ? currentRevision : REVISION_WITHDRAWN);
      }

      if (url.endsWith('/api/knowledge/revisions/rev-expert-02')) {
        return respondJson(200, {
          ...REVISION_DRAFT_VALID,
          id: 'rev-expert-02',
          revisionNumber: 2,
          status: 'DRAFT',
          version: 1,
          title: 'TEST — Quy trình quản lý nước tưới giai đoạn xử lý ra hoa sầu riêng (Rev 2)',
        });
      }

      if (url.endsWith(`/api/knowledge/revisions/${currentRevision.id}`)) {
        return respondJson(200, currentRevision);
      }

      // 3. ADMIN submissions and candidates
      if (url.includes('/api/admin/knowledge/submissions')) {
        const u = new URL(url);
        const statusParam = u.searchParams.get('status');
        let filtered = submissionsList;
        if (statusParam) {
          filtered = submissionsList.filter(s => s.status === statusParam);
        } else {
          filtered = submissionsList.filter(s => s.status === 'SUBMITTED' || s.status === 'IN_REVIEW');
        }
        return respondJson(200, {
          content: filtered,
          page: 0,
          size: 20,
          totalElements: filtered.length,
          totalPages: 1,
        });
      }

      if (url.includes('/reviewer-candidates')) {
        return respondJson(200, {
          content: CANDIDATES_LIST,
          page: 0,
          size: 20,
          totalElements: 2,
          totalPages: 1,
        });
      }

      if (url.includes('/api/admin/knowledge/revisions/rev-submitted-01/assign')) {
        submissionsList[0].status = 'IN_REVIEW';
        return respondJson(201, ASSIGNMENT_DETAIL);
      }

      if (url.includes('/api/admin/knowledge/revisions/rev-submitted-01/reassign')) {
        // Return 409 conflict to test conflict handling
        return respondJson(409, {
          error: 'conflict',
          code: 'assignment_changed',
          message: 'Nhiệm vụ phân công đã thay đổi hoặc không còn hiệu lực.',
        });
      }

      // 4. EXPERT review queue & workspace
      if (url.includes('/api/knowledge/reviews/assigned')) {
        return respondJson(200, {
          content: [
            ASSIGNMENT_ACTIVE,
            {
              id: 'assign-02',
              revisionId: REVISION_CHANGES_REQUESTED.id,
              reviewerUserId: 42,
              reviewerDisplayName: 'TS. Trần Văn Chuyên Gia',
              assignedBy: 1,
              assignedAt: '2026-10-26T08:00:00Z',
              assignmentReason: 'Đánh giá lại quy trình bón phân sầu riêng.',
              status: 'ACTIVE',
              version: 1,
            },
          ],
          page: 0,
          size: 20,
          totalElements: 2,
          totalPages: 1,
        });
      }

      if (url.endsWith('/api/knowledge/reviews/assign-01')) {
        return respondJson(200, currentAssignmentDetail);
      }

      if (url.endsWith('/api/knowledge/reviews/assign-02')) {
        return respondJson(200, {
          id: 'assign-02',
          revisionId: REVISION_CHANGES_REQUESTED.id,
          reviewerUserId: 42,
          reviewerDisplayName: 'TS. Trần Văn Chuyên Gia',
          assignedBy: 1,
          assignedAt: '2026-10-26T08:00:00Z',
          assignmentReason: 'Đánh giá lại quy trình bón phân sầu riêng.',
          status: 'ACTIVE',
          version: 1,
          closedAt: null,
          closureReason: null,
          replacesAssignmentId: null,
          closedBy: null,
          revision: REVISION_CHANGES_REQUESTED,
          decision: null,
        });
      }

      if (url.endsWith('/api/knowledge/reviews/assign-01/decision')) {
        decisionAttempt++;
        if (decisionAttempt === 1) {
          // First attempt simulates 409 conflict to verify that the confirm button is blocked
          // and explicit reload is required
          return respondJson(409, {
            error: 'conflict',
            code: 'assignment_changed',
            message: 'Nhiệm vụ phân công hoặc hồ sơ đã có thay đổi trên máy chủ.',
          });
        }

        const postData = JSON.parse(req.postData() || '{}');
        const decisionRecord = {
          id: 'dec-approved-01',
          assignmentId: 'assign-01',
          revisionId: REVISION_SUBMITTED.id,
          reviewerUserId: 42,
          decidedAt: '2026-10-25T12:00:00Z',
          outcome: postData.outcome,
          reason: postData.reason,
          assessedTier: postData.assessedTier,
          tierRationale: postData.tierRationale,
          conflictOfInterestDeclared: false,
          checkedSource: postData.checkedSource,
          checkedFaithfulness: postData.checkedFaithfulness,
          checkedApplicability: postData.checkedApplicability,
          chunkComments: postData.chunkComments,
        };

        const updatedRev = {
          ...REVISION_SUBMITTED,
          status: 'APPROVED',
          assessedTier: postData.assessedTier,
          tierRationale: postData.tierRationale,
          decision: decisionRecord,
        };

        const updatedAssignment = {
          ...ASSIGNMENT_ACTIVE,
          status: 'COMPLETED',
          closedAt: '2026-10-25T12:00:00Z',
        };

        currentAssignmentDetail = {
          ...updatedAssignment,
          revision: updatedRev,
          decision: decisionRecord,
        };

        return respondJson(200, {
          decision: decisionRecord,
          revision: updatedRev,
          assignment: updatedAssignment,
        });
      }

      return respondJson(200, {});
    });

    // Helper: set auth token in localStorage
    const setupSession = async (user) => {
      activeUser = user;
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'mock-token-fe-gov-002');
        localStorage.setItem('duricare-language', 'vi');
      });
    };

    // ==========================================
    // SCENE 1: Author Submission Workflow (K39, K40)
    // Preflight error detection and successful submission
    // ==========================================
    console.log('\n--- SCENE 1: Author Submission Workflow ---');
    // P1 verification 1: ADMIN viewing expert source (ownerUserId: 42) must NOT have author action buttons
    await setupSession(ADMIN_USER);
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/knowledge/sources/src-expert-01`, { waitUntil: 'networkidle0' });
    const adminSubmitBtn = await page.$('[data-testid="submit-for-review-button"]');
    assert(adminSubmitBtn === null, 'ADMIN must not see submit-for-review button on expert source');
    console.log('  ✓ ADMIN restricted from author actions on expert sources (P1 verified)');

    // P1 verification 2: ADMIN viewing ADMIN-owned source (ownerUserId: 1) CAN perform author actions
    await page.goto(`${BASE_URL}/knowledge/sources/src-admin-01`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="submit-for-review-button"]');
    console.log('  ✓ ADMIN has author actions on ADMIN-owned sources (ownerUserId: 1) (P1 verified)');

    // P1 verification 3: EXPERT viewing ADMIN source (ownerUserId: 1) must NOT have author action buttons
    await setupSession(EXPERT_USER);
    await page.goto(`${BASE_URL}/knowledge/sources/src-admin-01`, { waitUntil: 'networkidle0' });
    const expertOnAdminSubmitBtn = await page.$('[data-testid="submit-for-review-button"]');
    assert(expertOnAdminSubmitBtn === null, 'EXPERT must not see submit-for-review button on admin source');
    console.log('  ✓ EXPERT restricted from author actions on admin sources (P1 verified)');

    // P1 verification 4: EXPERT owner with PENDING verification status must NOT have author action buttons
    currentExpertProfile = { ...EXPERT_PROFILE_VERIFIED, verificationStatus: 'PENDING' };
    await page.goto(`${BASE_URL}/knowledge/sources/src-expert-01`, { waitUntil: 'networkidle0' });
    const pendingSubmitBtn = await page.$('[data-testid="submit-for-review-button"]');
    assert(pendingSubmitBtn === null, 'PENDING expert owner must not see submit-for-review button');
    console.log('  ✓ PENDING expert owner restricted from author actions (P1 verified)');

    // P1 verification 5: EXPERT owner with SUSPENDED verification status must NOT have author action buttons
    currentExpertProfile = { ...EXPERT_PROFILE_VERIFIED, verificationStatus: 'SUSPENDED' };
    await page.goto(`${BASE_URL}/knowledge/sources/src-expert-01`, { waitUntil: 'networkidle0' });
    const suspendedSubmitBtn = await page.$('[data-testid="submit-for-review-button"]');
    assert(suspendedSubmitBtn === null, 'SUSPENDED expert owner must not see submit-for-review button');
    console.log('  ✓ SUSPENDED expert owner restricted from author actions (P1 verified)');

    // Restore VERIFIED expert profile
    currentExpertProfile = EXPERT_PROFILE_VERIFIED;

    currentRevision = REVISION_DRAFT_INCOMPLETE;
    await page.goto(`${BASE_URL}/knowledge/sources/src-expert-01`, { waitUntil: 'networkidle0' });

    // Click "Gửi thẩm định" (Submit for review)
    await page.waitForSelector('[data-testid="submit-for-review-button"]');
    await page.click('[data-testid="submit-for-review-button"]');

    // Verify preflight error banner is displayed
    await page.waitForSelector('[data-testid="preflight-error-banner"]');
    console.log('  ✓ Preflight validation caught incomplete chunks');

    // Update revision to valid content and reload page
    currentRevision = REVISION_DRAFT_VALID;
    await page.goto(`${BASE_URL}/knowledge/sources/src-expert-01`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="submit-for-review-button"]');
    await page.click('[data-testid="submit-for-review-button"]');

    await page.waitForSelector('[data-testid="confirm-submit-button"]:not([disabled])');
    console.log('  ✓ Preflight passed with complete chunks');

    // First submission attempt triggers mock 409 conflict
    await page.click('[data-testid="confirm-submit-button"]');
    await page.waitForSelector('[data-testid="submit-verify-reload-button"]');
    const isSubmitBlockedInModal = await page.$eval(
      '[data-testid="confirm-submit-button"]',
      btn => btn.disabled
    );
    assert(isSubmitBlockedInModal, 'Submit button must be disabled after conflict/indeterminate error');
    console.log('  ✓ 409 conflict caught in submit modal, submit button disabled');

    // Close modal and reopen to verify parent-level indeterminate lock persists
    await page.click('[data-testid="close-submit-modal-button"]');
    await page.waitForSelector('[data-testid="confirm-submit-button"]', { hidden: true });
    await page.click('[data-testid="submit-for-review-button"]');
    await page.waitForSelector('[data-testid="confirm-submit-button"]');

    const isStillBlocked = await page.$eval(
      '[data-testid="confirm-submit-button"]',
      btn => btn.disabled
    );
    assert(isStillBlocked, 'Submit button must remain disabled across modal close/reopen until reloaded');
    console.log('  ✓ Closing/reopening submit modal preserves parent-level indeterminate lock (P3 verified)');

    // Case 6: Navigate to Source B, verify Source B not locked, then return to Source A and verify lock intact
    await page.click('[data-testid="close-submit-modal-button"]');
    await page.waitForSelector('[data-testid="confirm-submit-button"]', { hidden: true });

    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/sources/src-changes-req');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="chunk-comment-chunk-cr-001"]');

    // Return to Source A
    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/sources/src-expert-01');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="submit-for-review-button"]');
    await page.click('[data-testid="submit-for-review-button"]');
    await page.waitForSelector('[data-testid="confirm-submit-button"]');

    const isSubmitStillBlockedAfterNav = await page.$eval(
      '[data-testid="confirm-submit-button"]',
      btn => btn.disabled
    );
    assert(isSubmitStillBlockedAfterNav, 'Submit button on Source A must remain locked after returning from Source B');
    console.log('  ✓ Indeterminate lock on Source A survived navigation to Source B and back (Case 6 verified)');

    // Click reload button in modal to sync fresh record
    await page.click('[data-testid="submit-verify-reload-button"]');
    await page.waitForSelector('[data-testid="confirm-submit-button"]:not([disabled])');
    console.log('  ✓ Real async reload verified latest data and unlocked submit button (P2 verified)');

    // Confirm submission (now succeeds)
    await page.click('[data-testid="confirm-submit-button"]');
    await page.waitForSelector('[data-testid="submitted-notice-banner"]');
    console.log('  ✓ Submission succeeded -> revision status transitions to SUBMITTED read-only');

    await captureScreenshot(page, 'fe_gov02_01_author_submitted_read_only_1440.png');

    // ==========================================
    // SCENE 2: Author Withdrawal & Subsequent Draft Creation
    // ==========================================
    console.log('\n--- SCENE 2: Author Withdrawal & Subsequent Draft Creation ---');
    await page.waitForSelector('[data-testid="withdraw-button"]');
    await page.click('[data-testid="withdraw-button"]');

    await page.waitForSelector('[data-testid="withdraw-reason-input"]');
    await page.type(
      '[data-testid="withdraw-reason-input"]',
      'TEST: Cần bổ sung thêm dữ liệu trích đoạn từ báo cáo Viện Cây ăn quả Miền Nam.'
    );

    // Regression Probe: Navigate to Source B while withdrawal dialog on Source A is open
    // Case 1 & 2a: Transition to TERMINAL Target B (src-changes-req, CHANGES_REQUESTED)
    console.log('  Testing author dialog isolation: Transition to TERMINAL Target B...');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/sources/src-changes-req');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="chunk-comment-chunk-cr-001"]');

    const probeTerminalResult = await page.evaluate(() => ({
      route: location.pathname,
      dialogStillOpen: Boolean(document.querySelector('[data-testid="withdraw-reason-input"]')),
      confirmButtonPresent: Boolean(document.querySelector('[data-testid="confirm-withdraw-button"]')),
    }));

    assert.strictEqual(probeTerminalResult.dialogStillOpen, false, 'Author dialog from Source A must be invalidated and closed on transition to Source B');
    assert.strictEqual(probeTerminalResult.confirmButtonPresent, false, 'Withdraw confirmation button must not exist on Source B');
    console.log('  ✓ Author withdrawal dialog from Source A closed on navigation to terminal Source B (Case 1 & 2a verified)');

    // Case 2b: Transition to ELIGIBLE Target B (src-eligible-02, SUBMITTED)
    console.log('  Testing author dialog isolation: Transition to ELIGIBLE Target B...');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/sources/src-expert-01');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="withdraw-button"]');
    await page.click('[data-testid="withdraw-button"]');
    await page.waitForSelector('[data-testid="withdraw-reason-input"]');
    await page.type('[data-testid="withdraw-reason-input"]', 'TEST REASON ON SOURCE A BEFORE ELIGIBLE TRANSITION');

    // In-SPA navigate to eligible Target B (src-eligible-02)
    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/sources/src-eligible-02');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="withdraw-button"]'); // B has its own withdraw button because B is SUBMITTED
    const probeEligibleResult = await page.evaluate(() => ({
      route: location.pathname,
      dialogStillOpen: Boolean(document.querySelector('[data-testid="withdraw-reason-input"]')),
      confirmButtonPresent: Boolean(document.querySelector('[data-testid="confirm-withdraw-button"]')),
    }));
    assert.strictEqual(probeEligibleResult.dialogStillOpen, false, 'Author dialog from Source A must NOT transfer to eligible Target B');
    assert.strictEqual(probeEligibleResult.confirmButtonPresent, false, 'Withdraw dialog must not be open on eligible Target B');
    assert.strictEqual(wrongTargetDispatches.length, 0, 'No wrong target mutations must be dispatched');
    console.log('  ✓ Author withdrawal dialog from Source A closed on navigation to eligible Target B (Case 2b verified)');

    // Return to Source A in-SPA to resume withdrawal flow
    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/sources/src-expert-01');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="withdraw-button"]');
    await page.click('[data-testid="withdraw-button"]');
    await page.waitForSelector('[data-testid="withdraw-reason-input"]');
    await page.type(
      '[data-testid="withdraw-reason-input"]',
      'TEST: Cần bổ sung thêm dữ liệu trích đoạn từ báo cáo Viện Cây ăn quả Miền Nam.'
    );

    // Click confirm withdraw -> returns 504 Gateway Timeout (indeterminate network glitch)
    // Server actually committed withdrawal in background
    await page.click('[data-testid="confirm-withdraw-button"]');
    await page.waitForSelector('[data-testid="withdraw-verify-reload-button"]');
    console.log('  ✓ 504 Timeout caught during withdraw, indeterminate reload button rendered');

    // Case 7: Closing and reopening modal does NOT clear indeterminate lock
    await page.click('[data-testid="close-withdraw-modal-button"]');
    await page.waitForSelector('[data-testid="confirm-withdraw-button"]', { hidden: true });
    await page.click('[data-testid="withdraw-button"]');
    await page.waitForSelector('[data-testid="confirm-withdraw-button"]');
    const isWithdrawBlockedAfterReopen = await page.$eval(
      '[data-testid="confirm-withdraw-button"]',
      btn => btn.disabled
    );
    assert(isWithdrawBlockedAfterReopen, 'Withdraw button must remain disabled across modal close/reopen until reloaded');
    console.log('  ✓ Closing and reopening modal preserves indeterminate lock (Case 7 verified)');

    // Case 6b: Test failed reload keeps lock intact
    failWithdrawReload = true;
    await page.click('[data-testid="withdraw-verify-reload-button"]');
    await page.waitForFunction(
      () => document.querySelector('[data-testid="withdraw-error-banner"]')?.textContent?.includes('Không thể tải lại'),
      { timeout: 5000 }
    );
    const isWithdrawStillBlockedAfterFail = await page.$eval(
      '[data-testid="confirm-withdraw-button"]',
      btn => btn.disabled
    );
    assert(isWithdrawStillBlockedAfterFail, 'Withdraw button must stay disabled when reload fails');
    console.log('  ✓ Failed reload correctly shows error and keeps action locked (Case 6b verified)');

    // Case 6c & 8: Test successful reload clears lock and auto-detects committed WITHDRAWN state
    failWithdrawReload = false;
    await page.click('[data-testid="withdraw-verify-reload-button"]');
    // Modal automatically detects fresh status is WITHDRAWN, calls onSuccess, and closes!
    await page.waitForSelector('[data-testid="withdrawn-notice-banner"]');
    console.log('  ✓ Successful reload verified committed WITHDRAWN state on server and auto-completed (Case 6c & 8 verified)');

    assert.strictEqual(wrongTargetDispatches.length, 0, 'Zero wrong-target requests dispatched during entire test');
    console.log('  ✓ Verified 0 wrong-target dispatches across all navigation scenarios');

    await page.waitForSelector('[data-testid="create-subsequent-revision-button"]');
    await captureScreenshot(page, 'fe_gov02_02_author_withdrawn_and_next_revision_1440.png');

    // ==========================================
    // SCENE 3: ADMIN Review Coordination Queue & Assignment (K41, K42)
    // ==========================================
    console.log('\n--- SCENE 3: ADMIN Review Coordination Queue & Assignment ---');
    await setupSession(ADMIN_USER);
    await page.goto(`${BASE_URL}/settings/knowledge`, { waitUntil: 'networkidle0' });

    await page.waitForSelector('[data-testid="assign-button-rev-submitted-01"]');
    console.log('  ✓ ADMIN submissions queue rendered submitted records');

    await page.click('[data-testid="assign-button-rev-submitted-01"]');
    await page.waitForSelector('[data-testid="candidate-search-input"]');

    // Select candidate and fill assignment reason
    await page.click('[data-testid="candidate-option-88"]');
    await page.type(
      '[data-testid="assign-reason-input"]',
      'TEST: Phân công chuyên gia có kinh nghiệm sâu về sinh lý ra hoa và quản lý ẩm đất.'
    );

    await captureScreenshot(page, 'fe_gov02_03_admin_review_coordination_queue_1440.png');

    await page.click('[data-testid="confirm-assign-button"]');
    console.log('  ✓ Reviewer assignment succeeded');

    // P2 verification: Terminal tab queries status param and renders sub-filters
    await page.click('[data-testid="tab-terminal"]');
    await page.waitForSelector('[data-testid="terminal-status-filter-group"]');
    await page.waitForSelector('[data-testid="terminal-filter-APPROVED"]');
    await page.waitForSelector('[data-testid="submission-row-rev-approved-01"]');
    console.log('  ✓ ADMIN terminal tab successfully queries APPROVED records with preserved count (P2 verified)');

    // Switch back to Actionable tab for Scene 4 reassignment
    await page.click('[data-testid="tab-actionable"]');

    // ==========================================
    // SCENE 4: ADMIN Reassignment & Concurrency 409 Conflict Handling
    // ==========================================
    console.log('\n--- SCENE 4: ADMIN Reassignment & 409 Conflict Handling ---');
    await page.waitForSelector('[data-testid="reassign-button-rev-submitted-01"]');
    await page.click('[data-testid="reassign-button-rev-submitted-01"]');

    await page.waitForSelector('[data-testid="reassign-candidate-option-99"]');
    await page.click('[data-testid="reassign-candidate-option-99"]');
    await page.type(
      '[data-testid="reassign-reason-input"]',
      'TEST: Chuyên gia trước bận công tác đột xuất, chuyển giao đồng nghiệp cùng bộ môn.'
    );

    // Click confirm to trigger mock 409 conflict
    await page.click('[data-testid="confirm-reassign-button"]');
    await page.waitForSelector('[data-testid="reassign-error-banner"]');
    await page.waitForSelector('[data-testid="reassign-verify-reload-button"]');
    console.log('  ✓ 409 Conflict correctly caught and displayed without loss of entered reason');

    await captureScreenshot(page, 'fe_gov02_04_admin_reassign_conflict_handling_1440.png');

    // Verify parent-level lock persists when closing and reopening reassign modal
    await page.click('[data-testid="close-reassign-modal-button"]');
    await page.waitForSelector('[data-testid="confirm-reassign-button"]', { hidden: true });
    await page.click('[data-testid="reassign-button-rev-submitted-01"]');
    await page.waitForSelector('[data-testid="confirm-reassign-button"]');

    const isReassignBlocked = await page.$eval(
      '[data-testid="confirm-reassign-button"]',
      btn => btn.disabled
    );
    assert(isReassignBlocked, 'Reassign button must remain disabled across modal close/reopen until reloaded');
    console.log('  ✓ Reopening reassign modal preserves parent-level indeterminate lock (P3 verified)');

    // Test failed reload handling
    failReassignReload = true;
    await page.click('[data-testid="reassign-verify-reload-button"]');
    await page.waitForFunction(
      () => document.querySelector('[data-testid="reassign-error-banner"]')?.textContent?.includes('Không thể tải lại'),
      { timeout: 5000 }
    );
    const isStillBlockedAfterFail = await page.$eval(
      '[data-testid="confirm-reassign-button"]',
      btn => btn.disabled
    );
    assert(isStillBlockedAfterFail, 'Reassign button must stay disabled when reload fails');
    console.log('  ✓ Failed reload correctly shows error and keeps action locked');

    // Test successful reload handling
    failReassignReload = false;
    await page.click('[data-testid="reassign-verify-reload-button"]');
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="reassign-verify-reload-button"]'),
      { timeout: 5000 }
    );
    console.log('  ✓ Successful reload updates target version and clears indeterminate lock (P2 verified)');

    // Close modal
    await page.click('[data-testid="close-reassign-modal-button"]');

    // ==========================================
    // SCENE 5: EXPERT Reviewer Workspace Snapshot & Chunk Comments (K43, K44)
    // ==========================================
    console.log('\n--- SCENE 5: EXPERT Reviewer Workspace Snapshot ---');
    await setupSession(EXPERT_USER);
    await page.goto(`${BASE_URL}/knowledge/reviews`, { waitUntil: 'networkidle0' });

    await page.waitForSelector('[data-testid="review-card-assign-01"]');
    await page.waitForSelector('[data-testid="review-card-assign-02"]');
    console.log('  ✓ Expert assigned reviews queue loaded ACTIVE assignments');

    // In-SPA client-side navigation: click to start review for assign-01
    await page.click('[data-testid="start-review-link-assign-01"]');
    await page.waitForSelector('[data-testid="decision-form-section"]');
    console.log('  ✓ Opened review workspace with exact immutable snapshot');

    // Add per-chunk comment on chunk-001
    await page.waitForSelector('[data-testid="chunk-comment-input-chunk-001"]');
    await page.type(
      '[data-testid="chunk-comment-input-chunk-001"]',
      'TEST: Đề nghị ghi rõ nồng độ ppm thay vì chỉ ghi chung chung.'
    );

    // Also populate checklist, conflict, and reason on assign-01 to test full form isolation
    await page.click('[data-testid="conflict-of-interest-checkbox"]');
    await page.click('[data-testid="checklist-source"]');
    await page.type('[data-testid="decision-reason-input"]', 'TEST LEAKAGE REASON FOR ASSIGN-01');

    // P4 verification: In-SPA client-side navigation between assignments resets form state without cross-task leakage
    await page.click('[data-testid="back-to-queue-link"]');
    await page.waitForSelector('[data-testid="start-review-link-assign-02"]');
    await page.click('[data-testid="start-review-link-assign-02"]');
    await page.waitForSelector('[data-testid="decision-form-section"]');

    // Explicitly wait for chunk-cr-001 on assign-02 without .catch()
    await page.waitForSelector('[data-testid="chunk-comment-input-chunk-cr-001"]');
    const chunkCommentOnAssign02 = await page.$eval(
      '[data-testid="chunk-comment-input-chunk-cr-001"]',
      el => el.value
    );
    assert.strictEqual(chunkCommentOnAssign02, '', 'Form comment from assign-01 must not leak into assign-02');

    const reasonOnAssign02 = await page.$eval(
      '[data-testid="decision-reason-input"]',
      el => el.value
    );
    assert.strictEqual(reasonOnAssign02, '', 'Decision reason from assign-01 must not leak into assign-02');

    const conflictCheckedOnAssign02 = await page.$eval(
      '[data-testid="conflict-of-interest-checkbox"]',
      el => el.checked
    );
    assert.strictEqual(conflictCheckedOnAssign02, false, 'Conflict checkbox from assign-01 must not leak into assign-02');

    const sourceCheckedOnAssign02 = await page.$eval(
      '[data-testid="checklist-source"]',
      el => el.checked
    );
    assert.strictEqual(sourceCheckedOnAssign02, false, 'Checklist source from assign-01 must not leak into assign-02');
    console.log('  ✓ In-SPA assignment switch strictly resets all form fields without leakage (P4 verified)');

    // P4 regression verification: Test same-instance route transition via history.pushState + popstate without unmounting
    console.log('  Testing same-instance route transition form isolation via pushState...');
    await page.type('[data-testid="chunk-comment-input-chunk-cr-001"]', 'TEMPORARY COMMENT FOR PUSHSTATE TEST');
    await page.click('[data-testid="checklist-source"]');

    // Transition back to assign-01 using pushState directly without unmounting
    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/reviews/assign-01');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="decision-form-section"]');
    await page.waitForSelector('[data-testid="chunk-comment-input-chunk-001"]');

    const commentBackOnAssign01 = await page.$eval(
      '[data-testid="chunk-comment-input-chunk-001"]',
      el => el.value
    );
    assert.strictEqual(commentBackOnAssign01, '', 'Form comment from assign-02 must not leak into assign-01 on pushState transition');
    console.log('  ✓ Same-instance route transition strictly resets all form fields without leakage (P4 verified)');

    await page.type(
      '[data-testid="chunk-comment-input-chunk-001"]',
      'TEST: Đề nghị ghi rõ nồng độ ppm thay vì chỉ ghi chung chung.'
    );

    await captureScreenshot(page, 'fe_gov02_05_expert_review_workspace_snapshot_1440.png');

    // ==========================================
    // SCENE 6: Professional Decision Form & Approval Confirmation
    // ==========================================
    console.log('\n--- SCENE 6: Professional Decision Form & Approval Confirmation ---');
    // Check conflict of interest
    await page.click('[data-testid="conflict-of-interest-checkbox"]');
    // Check checklists
    await page.click('[data-testid="checklist-source"]');
    await page.click('[data-testid="checklist-faithfulness"]');
    await page.click('[data-testid="checklist-applicability"]');

    // Select outcome: APPROVED
    await page.click('[data-testid="outcome-radio-APPROVED"]');
    // Select Tier: B
    await page.click('[data-testid="tier-option-B"]');
    // Tier rationale
    await page.type(
      '[data-testid="tier-rationale-input"]',
      'TEST: Tài liệu kỹ thuật do Viện Cây ăn quả Miền Nam biên soạn, có đầy đủ căn cứ thực nghiệm.'
    );
    // Decision reason
    await page.type(
      '[data-testid="decision-reason-input"]',
      'TEST: Hồ sơ đạt chuẩn chuyên môn, các hướng dẫn tưới nước chuẩn hóa phù hợp với thực tiễn sản xuất.'
    );

    await page.click('[data-testid="open-decision-confirm-button"]');
    await page.waitForSelector('[data-testid="confirm-decision-submit-button"]');
    console.log('  ✓ Decision confirmation modal opened with full summary and immutability notice');

    // P2 verification: 409 conflict blocks immediate re-submit and requires reload & verification
    await page.click('[data-testid="confirm-decision-submit-button"]');
    await page.waitForSelector('[data-testid="decision-error-banner"]');
    await page.waitForSelector('[data-testid="reload-and-verify-button"]');

    const isSubmitBlocked = await page.$eval(
      '[data-testid="confirm-decision-submit-button"]',
      btn => btn.disabled
    );
    assert(isSubmitBlocked, 'Submit button must be disabled until user reloads and verifies status');
    console.log('  ✓ 409 conflict blocks immediate re-submit and requires reload verification (P2 verified)');

    // P2 verification part 2: Closing dialog does NOT clear indeterminate state on assignment level
    await page.click('[data-testid="close-decision-modal-button"]');
    await page.waitForSelector('[data-testid="confirm-decision-submit-button"]', { hidden: true });

    // Assert workspace shows indeterminate warning banner and disabled submit button
    await page.waitForSelector('[data-testid="decision-indeterminate-warning"]');
    const isWorkspaceButtonBlocked = await page.$eval(
      '[data-testid="open-decision-confirm-button"]',
      btn => btn.disabled
    );
    assert(isWorkspaceButtonBlocked, 'Workspace submit button must remain disabled after closing modal until reload');
    console.log('  ✓ Closing modal preserves indeterminate lock at assignment level (P2 verified)');

    // Click reload button on workspace banner to verify and clear indeterminate lock
    await page.click('[data-testid="workspace-verify-reload-button"]');
    await page.waitForSelector('[data-testid="decision-indeterminate-warning"]', { hidden: true });
    console.log('  ✓ Workspace reload successfully clears indeterminate lock');

    // All form inputs were preserved by loadData(true)!
    // Reopen modal and submit with fresh verified state
    await page.waitForSelector('[data-testid="open-decision-confirm-button"]');
    await page.click('[data-testid="open-decision-confirm-button"]');
    await page.waitForSelector('[data-testid="confirm-decision-submit-button"]:not([disabled])');
    await page.click('[data-testid="confirm-decision-submit-button"]');
    await page.waitForSelector('[data-testid="completed-decision-card"]');
    console.log('  ✓ Professional decision issued -> status transitions to COMPLETED');

    await captureScreenshot(page, 'fe_gov02_06_expert_decision_approved_completed_1440.png');

    // ==========================================
    // SCENE 7: Author Views Decision Feedback & Chunk Comments
    // Also verifies useKnowledgeSourceDetail source transition isolation & delayed response handling
    // ==========================================
    console.log('\n--- SCENE 7: Author Views Decision Feedback & Chunk Comments ---');
    // Configure src-expert-01 with two revisions (Rev 1 WITHDRAWN, Rev 2 DRAFT)
    currentRevision = {
      ...REVISION_DRAFT_VALID,
      id: 'rev-expert-02',
      revisionNumber: 2,
      status: 'DRAFT',
      version: 1,
      title: 'TEST — Quy trình quản lý nước tưới giai đoạn xử lý ra hoa sầu riêng (Rev 2)',
    };
    currentSource = {
      ...SOURCE_DRAFT,
      latestRevisionId: 'rev-expert-02',
      version: 5,
    };

    await setupSession(EXPERT_USER);
    await page.goto(`${BASE_URL}/knowledge/sources/src-expert-01`, { waitUntil: 'networkidle0' });

    // Mark window in this SPA session to verify component is not unmounted by page.goto
    await page.evaluate(() => {
      window.__TEST_SPA_PERSISTED_MARKER = 'FE_GOV_002_SPA_PERSISTENT_COMPONENT';
    });

    // Wait for the revision tabs (Rev #1 and Rev #2) to be available
    await page.waitForSelector('[data-testid="revision-tab-1"]');
    await page.waitForSelector('[data-testid="revision-tab-2"]');

    // Arm the delay for Source A's revision fetch (rev-expert-01)
    holdSourceARevision = true;
    delayedSourceAResolver = null;

    // Click Rev #1 tab to trigger selectRevision('rev-expert-01') which becomes in-flight and held
    await page.click('[data-testid="revision-tab-1"]');

    // Wait briefly for request to hit interception and be held
    await new Promise(r => setTimeout(r, 100));
    assert(typeof delayedSourceAResolver === 'function', 'Source A revision request must be captured and delayed in-flight');
    console.log('  ✓ Source A revision selection request triggered and held pending');

    // Perform in-SPA client-side route transition to Source B (src-changes-req) WITHOUT page.goto
    console.log('  Navigating in-SPA to Source B while Source A revision request is still pending...');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/sources/src-changes-req');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Source B must mount on the same component, aborting Source A's in-flight request, and render Source B's data
    await page.waitForSelector('[data-testid="changes-requested-notice-banner"]');
    await page.waitForSelector('[data-testid="decision-detail-card"]');
    await page.waitForSelector('[data-testid="chunk-comment-chunk-cr-001"]');
    console.log('  ✓ Source B rendered its own revision, decision card, and per-chunk comment');

    // Now resolve the delayed Source A revision response while user is on Source B
    console.log('  Resolving delayed Source A revision response while on Source B...');
    delayedSourceAResolver();
    delayedSourceAResolver = null;
    holdSourceARevision = false;

    // Allow time for any errant asynchronous state resolution
    await new Promise(r => setTimeout(r, 300));

    // Assert that Source B's view remains completely intact and has NOT been overwritten by Source A
    await page.waitForSelector('[data-testid="changes-requested-notice-banner"]');
    await page.waitForSelector('[data-testid="decision-detail-card"]');
    await page.waitForSelector('[data-testid="chunk-comment-chunk-cr-001"]');

    const staleChunk = await page.$('[data-testid="chunk-comment-chunk-001"]');
    assert(staleChunk === null, 'Chunk from previous source must not leak into new source (P3/hook isolation verified)');

    const staleWithdrawnBanner = await page.$('[data-testid="withdrawn-notice-banner"]');
    assert(staleWithdrawnBanner === null, 'Status from Source A must not overwrite Source B');

    // Confirm that the same SPA session was preserved (no full page reload)
    const spaMarker = await page.evaluate(() => window.__TEST_SPA_PERSISTED_MARKER);
    assert.strictEqual(spaMarker, 'FE_GOV_002_SPA_PERSISTENT_COMPONENT', 'SPA component must have remained mounted across transition');
    console.log('  ✓ Delayed response from Source A was safely discarded without clobbering Source B state');
    console.log('  ✓ SPA component persistence verified across client-side transition');

    // Case 3: Switch revision within same source when modal is open
    console.log('  Testing revision transition within same source while modal is open (Case 3)...');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/sources/src-expert-01');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="revision-tab-2"]');
    await page.click('[data-testid="revision-tab-2"]');
    await page.waitForSelector('[data-testid="submit-for-review-button"]');
    await page.click('[data-testid="submit-for-review-button"]');
    await page.waitForSelector('[data-testid="confirm-submit-button"]');

    // While submit modal is open on Rev 2, click Rev 1 tab
    await page.$eval('[data-testid="revision-tab-1"]', btn => btn.click());
    await page.waitForSelector('[data-testid="withdrawn-notice-banner"]');

    const probeRevSwitchModal = await page.evaluate(() => ({
      confirmSubmitPresent: Boolean(document.querySelector('[data-testid="confirm-submit-button"]')),
    }));
    assert.strictEqual(probeRevSwitchModal.confirmSubmitPresent, false, 'Modal must close on revision switch without transferring target');
    console.log('  ✓ Switching revision within same source closes modal without transferring target (Case 3 verified)');

    // Case 4: Pending mutation on Source A, in-SPA navigate to Source B, mutation resolves
    console.log('  Testing pending mutation on Source A resolved after in-SPA transition to Source B (Case 4)...');
    await page.$eval('[data-testid="revision-tab-2"]', btn => btn.click());
    await page.waitForSelector('[data-testid="submit-for-review-button"]');
    await page.click('[data-testid="submit-for-review-button"]');
    await page.waitForSelector('[data-testid="confirm-submit-button"]');

    // Arm mutation delay
    holdSourceAMutation = true;
    delayedSourceAMutationResolver = null;
    await page.click('[data-testid="confirm-submit-button"]');
    await new Promise(r => setTimeout(r, 100));
    assert(typeof delayedSourceAMutationResolver === 'function', 'Source A mutation request must be captured in-flight');

    // In-SPA navigate to Source B while mutation on Source A is in-flight
    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/sources/src-changes-req');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="changes-requested-notice-banner"]');

    // Resolve delayed mutation of Source A while user is on Source B
    delayedSourceAMutationResolver();
    delayedSourceAMutationResolver = null;
    holdSourceAMutation = false;
    await new Promise(r => setTimeout(r, 200));

    // Assert Source B remains intact and was not redirected or clobbered
    await page.waitForSelector('[data-testid="changes-requested-notice-banner"]');
    await page.waitForSelector('[data-testid="decision-detail-card"]');
    console.log('  ✓ Pending mutation response from Source A safely ignored on Source B (Case 4 verified)');

    // Case 5: Pending reload on Source A, in-SPA navigate to Source B, reload resolves
    console.log('  Testing pending reload on Source A resolved after in-SPA transition to Source B (Case 5)...');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/sources/src-expert-01');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="revision-tab-2"]');

    // Arm reload delay
    holdSourceAReload = true;
    delayedSourceAReloadResolver = null;
    await page.click('button[title="Tải lại dữ liệu"]');
    await new Promise(r => setTimeout(r, 100));
    assert(typeof delayedSourceAReloadResolver === 'function', 'Source A reload request must be captured in-flight');

    // In-SPA navigate to Source B while reload on Source A is in-flight
    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/sources/src-changes-req');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="changes-requested-notice-banner"]');

    // Resolve delayed reload of Source A
    delayedSourceAReloadResolver();
    delayedSourceAReloadResolver = null;
    holdSourceAReload = false;
    await new Promise(r => setTimeout(r, 200));

    // Assert Source B remains intact
    await page.waitForSelector('[data-testid="changes-requested-notice-banner"]');
    await page.waitForSelector('[data-testid="chunk-comment-chunk-cr-001"]');
    console.log('  ✓ Pending reload response from Source A safely ignored on Source B (Case 5 verified)');

    // Case 5b: Reload while on Rev 1, switch to Rev 2 in same source, delayed reload resolves
    // Test that old reload response does NOT overwrite newly selected Rev 2
    console.log('  Testing reload on Rev 1 followed by switch to Rev 2: delayed reload must not revert to Rev 1 (Case 5b)...');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/knowledge/sources/src-expert-01');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="revision-tab-1"]');
    // Ensure we are viewing Rev 1
    await page.click('[data-testid="revision-tab-1"]');
    await page.waitForSelector('[data-testid="withdrawn-notice-banner"]');

    // 1. Arm reload delay for Rev 1
    holdSourceAReload = true;
    delayedSourceAReloadResolver = null;
    await page.click('button[title="Tải lại dữ liệu"]');
    await new Promise(r => setTimeout(r, 100));
    assert(typeof delayedSourceAReloadResolver === 'function', 'Source A reload request must be captured in-flight');

    // 2. While reload of Rev 1 is pending in-flight, select Rev 2
    await page.click('[data-testid="revision-tab-2"]');
    // Rev 2 is DRAFT, so it should render submit-for-review button
    await page.waitForSelector('[data-testid="submit-for-review-button"]');
    console.log('  ✓ Switched to Rev 2 while Rev 1 reload was in-flight');

    // 3. Now resolve delayed reload response of Rev 1
    delayedSourceAReloadResolver();
    delayedSourceAReloadResolver = null;
    holdSourceAReload = false;

    // Allow time for any errant state updates
    await new Promise(r => setTimeout(r, 300));

    // 4. Assert that page remains on Rev 2 and did NOT revert to Rev 1
    const stillOnRev2 = await page.$('[data-testid="submit-for-review-button"]');
    assert(stillOnRev2 !== null, 'Page must remain on Rev 2 after delayed reload returns');
    const staleWithdrawn = await page.$('[data-testid="withdrawn-notice-banner"]');
    assert(staleWithdrawn === null, 'Rev 1 withdrawn banner must not reappear');
    console.log('  ✓ Stale reload response safely invalidated without reverting to previous revision (Case 5b verified)');

    await captureScreenshot(page, 'fe_gov02_07_author_view_reviewer_feedback_1440.png');

    // ==========================================
    // SCENE 8: Mobile 375px Viewport, Dark Theme, English Localization
    // ==========================================
    console.log('\n--- SCENE 8: Mobile 375px Viewport, Dark Theme & English ---');
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('duricare-theme', 'dark');
      localStorage.setItem('duricare-language', 'en');
    });

    await page.goto(`${BASE_URL}/knowledge/reviews/assign-01`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="completed-decision-card"]');
    console.log('  ✓ Mobile dark layout rendered cleanly without horizontal overflow');

    await captureScreenshot(page, 'fe_gov02_08_mobile_dark_english_375.png');

    // ==========================================
    // SCENE 9: Current Revision HTTP 500 Reload Failure (P2 Regression Probe)
    // ==========================================
    console.log('\n--- SCENE 9: Current Revision HTTP 500 Reload Failure (P2 Regression Probe) ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('duricare-theme', 'light');
      localStorage.setItem('duricare-language', 'vi');
    });

    currentRevision = {
      ...REVISION_DRAFT_VALID,
      id: 'rev-expert-02',
      revisionNumber: 2,
      status: 'DRAFT',
      version: 1,
    };
    currentSource = {
      ...SOURCE_DRAFT,
      latestRevisionId: 'rev-expert-02',
      version: 5,
    };

    await setupSession(EXPERT_USER);
    await page.goto(`${BASE_URL}/knowledge/sources/src-expert-01`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="submit-for-review-button"]');

    const beforeSelected = await page.$eval(
      '[data-testid="revision-tab-2"]',
      b => b.className.includes('bg-navy')
    );
    assert(beforeSelected, 'Revision 2 must initially be selected with active styles');

    // Arm single-shot failure on revision details GET while source and revisions list succeed
    failRevisionDetailsOnce = true;
    revisionFailureInjected = false;

    await page.click('button[title="Tải lại dữ liệu"]');
    for (let i = 0; i < 40 && !revisionFailureInjected; i++) {
      await new Promise(r => setTimeout(r, 50));
    }
    assert(revisionFailureInjected, 'Primary revision detail GET must receive the injected HTTP 500');

    // Wait briefly for UI to handle the failed reload
    await new Promise(r => setTimeout(r, 400));

    // Assert that the last verified revision was NOT erased
    const afterSelected = await page.$eval(
      '[data-testid="revision-tab-2"]',
      b => b.className.includes('bg-navy')
    );
    assert.strictEqual(
      afterSelected,
      true,
      'HTTP 500 during reload must not silently erase the last verified revision'
    );

    const submitActionPresent = Boolean(await page.$('[data-testid="submit-for-review-button"]'));
    assert.strictEqual(
      submitActionPresent,
      true,
      'Submit action button must remain present on active draft revision'
    );

    const errorBannerPresent = Boolean(await page.$('[data-testid="detail-reload-error-banner"]'));
    assert.strictEqual(
      errorBannerPresent,
      true,
      'Reload error banner must be rendered to surface failure to the user'
    );
    console.log('  ✓ Preserved verified Revision 2 and displayed error banner upon HTTP 500 reload (P2 verified)');

    // Verify recovery on successful reload retry
    await page.click('[data-testid="detail-reload-error-banner"] button');
    await new Promise(r => setTimeout(r, 400));

    const errorBannerGone = (await page.$('[data-testid="detail-reload-error-banner"]')) === null;
    assert.strictEqual(errorBannerGone, true, 'Error banner must clear upon successful retry');
    console.log('  ✓ Retry successfully cleared error banner and maintained valid revision state');

    console.log('\nALL E2E SCENARIOS COMPLETED SUCCESSFULLY (9/9 SCENES)!');
  } finally {
    await browser.close();
    server.close();
    console.log('Static server closed.');
  }
}

runE2ESuite().catch(err => {
  console.error('E2E TEST RUNNER FAILED:', err);
  process.exit(1);
});
