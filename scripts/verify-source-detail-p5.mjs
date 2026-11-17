import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const EVIDENCE_DIR = path.resolve('E:/CTU/LuanVan/verification/ui-refresh-ctu-source-detail-design-20261116/evidence');
const ARTIFACT_EVIDENCE_DIR = path.resolve('C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_EVIDENCE_DIR)) {
  fs.mkdirSync(ARTIFACT_EVIDENCE_DIR, { recursive: true });
}

console.log('================================================================');
console.log('UI-REFRESH-CTU-001 P5 Chi tiết nguồn tri thức (/knowledge/sources/:id) Suite');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

const capturedHashes = {};

async function captureEvidence(page, filename) {
  const filePath = path.join(EVIDENCE_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: false });
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  capturedHashes[filename] = hash;

  // Mirror to artifact directory
  const artifactPath = path.join(ARTIFACT_EVIDENCE_DIR, filename);
  fs.writeFileSync(artifactPath, buffer);

  console.log(`  📸 Captured ${filename} (SHA256: ${hash.substring(0, 16)}...)`);
  return hash;
}

// ─── [1/3] Static Code & Token Assertions ─────────────────────
console.log('[1/3] Static code & design token assertions...');

const detailPagePath = path.join(ROOT_DIR, 'src/pages/KnowledgeSourceDetailPage.tsx');
const detailPageContent = fs.readFileSync(detailPagePath, 'utf8');

assert(
  detailPageContent.includes("STITCH_STATUS_STYLES") &&
  detailPageContent.includes("'APPROVED'") &&
  detailPageContent.includes("'IN_REVIEW'") &&
  detailPageContent.includes("'CHANGES_REQUESTED'") &&
  detailPageContent.includes("'DRAFT'") &&
  detailPageContent.includes("'SUBMITTED'") &&
  detailPageContent.includes("'WITHDRAWN'") &&
  detailPageContent.includes("'REJECTED'"),
  '[Scenario S1.1] STITCH_STATUS_STYLES maps all 7 active governance revision statuses'
);

assert(
  detailPageContent.includes('formatDate') &&
  detailPageContent.includes("padStart(2, '0')"),
  '[Scenario S1.2] formatDate enforces DD/MM/YYYY formatting'
);

assert(
  detailPageContent.includes('data-testid="decision-detail-card"') &&
  detailPageContent.includes('data-testid="view-provenance-button"'),
  '[Scenario S1.3] Detail page preserves governance decision and provenance test hooks'
);

assert(
  detailPageContent.includes("t('Bản {0}', [safeRevision.revisionNumber])") ||
  detailPageContent.includes("t('Bản {0}'"),
  '[Scenario S1.4] Revision numbers displayed as Bản N, separating optimistic-lock version'
);

assert(
  !detailPageContent.includes('TS. Lê Văn Hòa') &&
  !detailPageContent.includes('TS. Le Van Hoa'),
  '[Scenario S1.5] Reviewer field does not embed hardcoded Stitch mock placeholder name'
);

assert(
  detailPageContent.includes("t('Chưa xác định giai đoạn')"),
  '[Scenario S1.6] Null growth stage displays neutral label, avoiding blanket "Mọi giai đoạn" claim'
);

assert(
  detailPageContent.includes('user?.role === \'ADMIN\'') &&
  detailPageContent.includes('PublicationHeadCard'),
  '[Scenario S1.7] RAG Publication head card is restricted to ADMIN role'
);

// Check i18n catalogs
const viPath = path.join(ROOT_DIR, 'src/i18n/locales/vi/translation.json');
const enPath = path.join(ROOT_DIR, 'src/i18n/locales/en/translation.json');
const viJson = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const requiredI18nKeys = [
  'Thông tin tài liệu',
  'Thuộc tính',
  'Tham chiếu vị trí',
  'Ghi chú xuất xứ',
  'Đường dẫn nguồn',
  'Chi tiết kỹ thuật (UUID)',
  'Trích đoạn gốc và ghi chú',
  'Trích đoạn gốc:',
  'Ghi chú áp dụng:',
  'Ghi chú đo lường:',
  'Nhận xét của thẩm định viên:',
  'Tiêu chí đánh giá',
  'Đối chiếu tài liệu nguồn:',
  'Trung thực trích đoạn:',
  'Phạm vi áp dụng:',
  'Đạt chuẩn',
  'Đã xác thực',
  'Chưa đạt',
  'Thời gian thẩm định:',
  'Kết quả thẩm định',
  'Xuất bản vào RAG',
  'Trạng thái hiện tại:',
  'Xuất bản bản này',
  'RAG · Chưa xuất bản',
  'RAG · Đang hoạt động',
  'Chưa xác định giai đoạn',
  'Bản {0} · Mới nhất',
  'Tầng {0} đã xác nhận',
  'Mở tất cả',
  'Thu gọn tất cả',
  'Đoạn {0}',
  'Nguồn gốc',
  'Thẩm định đã hoàn tất',
  'Không có ghi chú',
  'Xem đầy đủ',
  'Thu gọn',
  'Lý do / Ghi chú',
  'Đang tải lịch sử kiểm toán...',
  'Chưa có bản ghi kiểm toán nào.',
  'Thao tác tài liệu',
];

for (const k of requiredI18nKeys) {
  assert(
    viJson[k] !== undefined && enJson[k] !== undefined,
    `[Scenario S2.I18N] Translation catalogs define valid VI & EN mappings for "${k}"`
  );
}

// ─── [2/3] Local Test Server & SPA Routing ───────────────────
console.log('\n[2/3] Starting SPA test server and headless browser...');

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`500 Server Error: ${err.message}`);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    }
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(reqUrl.pathname);

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const potentialPath = path.join(DIST_DIR, pathname);
  if (fs.existsSync(potentialPath) && fs.statSync(potentialPath).isFile()) {
    return serveStaticFile(res, potentialPath);
  }

  // SPA fallback
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    return serveStaticFile(res, indexPath);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

const PORT = 5198;
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
console.log(`SPA Server listening on http://127.0.0.1:${PORT}`);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
page.on('console', (msg) => console.log('  [BROWSER CONSOLE]', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('  [BROWSER PAGEERROR]', err.message));
page.on('requestfailed', (req) => console.log('  [REQ FAILED]', req.method(), req.url(), req.failure()?.errorText));
await page.setRequestInterception(true);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-XSRF-TOKEN',
};

let currentAuthUser = {
  id: 1,
  email: 'admin@duricare.ctu.vn',
  role: 'ADMIN',
  farmId: 1,
  fullName: 'Quản trị viên CTU',
};

// Fixtures conforming strictly to current DTO contract
const mockRevision1 = {
  id: 'rev-ctu-01-1',
  sourceId: 'src-ctu-01',
  revisionNumber: 1,
  status: 'APPROVED',
  version: 1,
  createdAt: '2026-11-10T08:00:00Z',
  updatedAt: '2026-11-16T09:30:00Z',
  metadata: {
    title: 'Nguồn nước và tưới nước cho sầu riêng',
    sourceType: 'OFFICIAL_DOCUMENT',
    proposedTier: 'A',
    authors: 'Chi cục Trồng trọt và BVTV',
    publisher: 'Sở NN&PTNT',
    year: 2024,
    edition: 'Tái bản lần 1',
    evidenceReference: 'Mục 1.6, trang 24–25',
    proposedTierRationale: 'Tài liệu kỹ thuật tiêu chuẩn từ nguồn kiểm chứng',
    provenanceNotes: 'Ghi nhận từ tài liệu tập huấn khuyến nông',
    sourceUrl: 'https://khuyennong.gov.vn/sau-rieng/tuoi-nuoc',
  },
  chunks: [
    {
      chunkId: 'chk-01',
      position: 0,
      title: 'Nguồn nước tưới',
      topic: 'IRRIGATION',
      stage: null,
      locator: 'Mục 1.6.1 · Trang 24',
      content: 'Cần ghi chép rõ ràng nguồn nước tưới (nước giếng khoan, nước sông ngòi hoặc hồ chứa nhân tạo) trước khi cấp vào hệ thống tưới tự động. Kiểm tra độ mặn và độ phèn định kỳ vào đầu mùa khô để đảm bảo nước đạt tiêu chuẩn phù hợp với cây sầu riêng.',
      originalExcerpt: 'Đối chiếu quy trình thực địa: Trạm cấp nước phải ghi sổ nhật ký đo độ dẫn điện EC và độ pH của nguồn nước 2 lần/tháng.',
      applicabilityNotes: 'Áp dụng chung cho các khu vực đang dùng hệ thống tưới nhỏ giọt và béc quay dưới tán.',
      measurementNotes: 'Đo bằng bút đo EC cầm tay hoặc cảm biến trạm bơm.',
    },
    {
      chunkId: 'chk-02',
      position: 1,
      title: 'Quản lý lượng nước tưới',
      topic: 'IRRIGATION',
      stage: 'KIEN_THIET_CO_BAN',
      locator: 'Mục 1.6.2 · Trang 24–25',
      content: 'Trong giai đoạn kiến thiết cơ bản, duy trì độ ẩm đất từ 65% đến 75%. Tưới cách nhật với chu kỳ ngắn để rễ cây phát triển ăn sâu vào tầng đất xốp.',
      originalExcerpt: 'Lượng nước tưới mỗi gốc định mức 20-30 lít/lần trong mùa khô.',
      applicabilityNotes: 'Đất phù sa ven sông Tiền và sông Hậu.',
      measurementNotes: 'Cảm biến đo độ ẩm đất tầng 20cm và 40cm.',
    },
    {
      chunkId: 'chk-03',
      position: 2,
      title: 'Theo dõi sau tưới',
      topic: 'IRRIGATION',
      stage: 'RA_HOA',
      locator: 'Mục 1.6.3 · Trang 25',
      content: 'Sau khi tưới cần kiểm tra sự đồng đều của béc phun và khả năng thấm hút của đất, tránh đọng vũng quanh cổ rễ gây nấm bệnh.',
      originalExcerpt: 'Kiểm tra hiện trường 15-30 phút sau khi ngắt bơm.',
      applicabilityNotes: 'Mọi loại đất líp và đắp mô.',
      measurementNotes: 'Quan sát thoát nước rãnh líp.',
    },
  ],
  decision: {
    decidedAt: '2026-11-16T09:30:00Z',
    reviewerUserId: 101,
    outcome: 'APPROVED',
    assessedTier: 'A',
    reason: 'Đã đối chiếu nội dung và phạm vi áp dụng. Nội dung phù hợp hướng dẫn kỹ thuật chuẩn, trích đoạn đầy đủ ngữ cảnh.',
    tierRationale: 'Tài liệu kỹ thuật tiêu chuẩn từ nguồn kiểm chứng cấp tỉnh.',
    checkedSource: true,
    checkedFaithfulness: true,
    checkedApplicability: true,
    chunkComments: [
      { chunkId: 'chk-01', comment: 'Nội dung đối chiếu chuẩn xác với tài liệu khuyến nông tỉnh.' },
    ],
  },
};

const mockSourceFixture = {
  id: 'src-ctu-01',
  ownerUserId: 10,
  ownerDisplayName: 'Quản trị viên CTU',
  createdAt: '2026-11-10T08:00:00Z',
  updatedAt: '2026-11-16T09:30:00Z',
  version: 2,
  latestRevisionId: 'rev-ctu-01-1',
  latestRevision: mockRevision1,
};

const mockAuditHistory = {
  content: [
    {
      id: 'audit-001',
      sourceId: 'src-ctu-01',
      revisionId: 'rev-ctu-01-1',
      assignmentId: null,
      actorUserId: 101,
      actorDisplayName: 'TS. Nguyễn Văn Chuyên Gia',
      occurredAt: '2026-11-16T14:30:00Z',
      action: 'DECIDED',
      previousStatus: 'IN_REVIEW',
      newStatus: 'APPROVED',
      reason: 'Tài liệu kỹ thuật canh tác sầu riêng Ri6 giai đoạn ra hoa theo quy trình VietGAP của Viện Cây ăn quả Miền Nam.\nChi tiết quy trình canh tác và khuyến cáo phân bón xem tại https://duricare.example.edu.vn/guidelines/2026/durian-ri6-flowering-stage-vietgap-manual.html.\nĐã kiểm tra đối chiếu đầy đủ các chỉ tiêu kỹ thuật trước khi phê duyệt.',
      previousVersion: 1,
      newVersion: 2,
      metadata: { outcome: 'APPROVED', tier: 'A' },
    },
    {
      id: 'audit-002',
      sourceId: 'src-ctu-01',
      revisionId: 'rev-ctu-01-1',
      assignmentId: null,
      actorUserId: 10,
      actorDisplayName: 'Quản trị viên CTU',
      occurredAt: '2026-11-15T09:15:00Z',
      action: 'SUBMITTED',
      previousStatus: 'DRAFT',
      newStatus: 'SUBMITTED',
      reason: 'Gửi hồ sơ thẩm định chuyên môn đợt 1',
      previousVersion: 0,
      newVersion: 1,
      metadata: null,
    },
    {
      id: 'audit-003',
      sourceId: 'src-ctu-01',
      revisionId: 'rev-ctu-01-1',
      assignmentId: null,
      actorUserId: 10,
      actorDisplayName: 'Quản trị viên CTU',
      occurredAt: '2026-11-14T08:00:00Z',
      action: 'SOURCE_CREATED',
      previousStatus: null,
      newStatus: 'DRAFT',
      reason: null,
      previousVersion: null,
      newVersion: 0,
      metadata: null,
    },
  ],
  page: 0,
  size: 20,
  totalElements: 3,
  totalPages: 1,
};

// Dynamic publication state for scenario tests
let currentHeadFixture = {
  sourceId: 'src-ctu-01',
  version: 1,
  generation: 1,
  activePublicationId: null,
  pendingPublicationId: null,
  updatedAt: null,
};

const currentPubDetailsMap = new Map();
let mockPublicationHeadError = null;
let mockPublicationDetailError = null;
let mockExpertProfile = null;
const unhandledRequests = [];

page.on('request', (req) => {
  const url = req.url();
  const method = req.method();

  if (url.startsWith('data:')) {
    return req.continue();
  }

  const isLocalServer = url.startsWith(`http://127.0.0.1:${PORT}`) || url.startsWith(`http://localhost:${PORT}`);
  const isGoogleFont = url.startsWith('https://fonts.googleapis.com') || url.startsWith('https://fonts.gstatic.com');

  if (isGoogleFont) {
    return req.continue();
  }

  if (isLocalServer && (
    req.resourceType() === 'document' ||
    req.resourceType() === 'script' ||
    req.resourceType() === 'stylesheet' ||
    req.resourceType() === 'image' ||
    req.resourceType() === 'font' ||
    url.includes('/locales/')
  )) {
    return req.continue();
  }

  if (method === 'OPTIONS') {
    return req.respond({ status: 204, headers: CORS_HEADERS });
  }

  if (url.includes('/auth/refresh')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'mock-jwt-token', user: currentAuthUser }),
    });
  }

  if (url.includes('/auth/csrf')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'mock-csrf' }),
    });
  }

  if (url.includes('/auth/me')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(currentAuthUser),
    });
  }

  if (url.includes('/expert/profile') || url.includes('/governance/experts/me')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockExpertProfile || {
        userId: currentAuthUser.id,
        verificationStatus: 'VERIFIED',
        fullName: currentAuthUser.fullName,
      }),
    });
  }

  if (url.includes('/farms')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Vườn sầu riêng TEST' }]),
    });
  }

  if (url.includes('/overview')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        farmName: 'Vườn sầu riêng TEST',
        generatedAt: new Date().toISOString(),
        totalUnresolvedAlerts: 0,
        zones: [],
      }),
    });
  }

  if (url.includes('/alerts')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  }

  if (url.includes('/zones')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  }

  if (url.includes('/trees')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Cây sầu riêng Ri6 #01', zoneId: 1 }]),
    });
  }

  // Publication head endpoint (specific URL matching before source endpoint)
  if (url.includes('/admin/knowledge/sources/src-ctu-01/publication-head') || url.includes('/publication-head')) {
    if (mockPublicationHeadError) {
      return req.respond({
        status: mockPublicationHeadError.status,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'service_unavailable',
          code: 'publication_schema_not_ready',
          message: mockPublicationHeadError.message,
        }),
      });
    }
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(currentHeadFixture),
    });
  }

  // Publication details endpoint
  if (url.includes('/admin/knowledge/publications/')) {
    if (mockPublicationDetailError) {
      return req.respond({
        status: mockPublicationDetailError.status,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'service_unavailable',
          code: mockPublicationDetailError.code || 'publication_detail_unavailable',
          message: mockPublicationDetailError.message,
        }),
      });
    }
    const pubId = url.split('/publications/')[1]?.split('?')[0]?.replace('/', '');
    const detail = currentPubDetailsMap.get(pubId) || {
      publication: {
        id: pubId || 'pub-01',
        sourceId: 'src-ctu-01',
        revisionId: 'rev-ctu-01-1',
        revisionNumber: 1,
        generation: 1,
        status: 'ACTIVE',
        sourceTitle: 'Nguồn nước và tưới nước cho sầu riêng',
        assessedTier: 'A',
        chunkCount: 3,
        manifestHash: 'hash-abc',
        createdAt: '2026-11-16T09:30:00Z',
        activatedAt: '2026-11-16T09:35:00Z',
        revokedAt: null,
        latestJobId: null,
      },
    };
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(detail),
    });
  }

  if (url.includes('/api/knowledge/sources/src-ctu-01/history') || url.includes('/knowledge/sources/src-ctu-01/history')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockAuditHistory),
    });
  }

  if (url.includes('/knowledge/sources/src-ctu-01/revisions')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [mockRevision1],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
    });
  }

  if (url.includes('/knowledge/revisions/')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockRevision1),
    });
  }

  if (url.includes('/import-provenance')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        origin: 'IMPORTED',
        status: 'CURRENT',
        revisionId: 'rev-ctu-01-1',
        document: {
          id: 'doc-uuid-11223344',
          importId: 'import-sess-8899aabb-1122',
          sourceId: 'src-ctu-01',
          createdAt: '2026-11-10T11:00:00Z',
          file: {
            displayName: 'Tai-Lieu-Tuoi-Sau-Rieng-CTU-2024.pdf',
            mediaType: 'application/pdf',
            bytes: 1450230,
            sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          },
          extraction: {
            parser: 'PDFBox',
            parserVersion: '3.0.1',
            normalization: 'DURI-IMPORT-TEXT-1',
            text: 'QUY TRÌNH KỸ THUẬT QUẢN LÝ NƯỚC...',
            textSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          },
        },
        lineage: [],
      }),
    });
  }

  if (url.includes('/api/knowledge/sources/src-ctu-01/provenance') || url.includes('/knowledge/sources/src-ctu-01/provenance')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        revisionId: 'rev-ctu-01-1',
        sourceType: 'OFFICIAL_DOCUMENT',
        provenanceNotes: 'Tài liệu hướng dẫn kỹ thuật khuyến nông tỉnh Tiền Giang.',
        contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        events: [],
      }),
    });
  }

  // Knowledge source detail endpoint
  if (url.includes('/knowledge/sources/src-ctu-01')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockSourceFixture),
    });
  }

  console.log(`  [FAIL-CLOSED ABORT] ${method} ${url}`);
  unhandledRequests.push({ method, url });
  return req.abort('failed');
});

// ─── [3/3] Browser E2E Scenarios & Evidence Capture ───────────
console.log('\n[3/3] Executing Browser E2E Scenarios...');

try {
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('duricare_auth_token', 'mock-token-admin');
    localStorage.setItem('theme', 'light');
  });

  // Scenario 1: Desktop 1440x900 Light Theme (ADMIN Empty Head)
  console.log('\n--- Scenario 1: Desktop 1440x900 (ADMIN Light Theme - Empty Head) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });

  // Verify page title and header
  await page.waitForSelector('h1');
  const titleText = await page.$eval('h1', (el) => el.textContent.trim());
  assert(
    titleText.includes('Nguồn nước và tưới nước cho sầu riêng'),
    `Title displays correct document title: "${titleText}"`
  );

  // Verify status badge
  await page.waitForSelector('[data-testid="status-badge-APPROVED"]');
  const statusBadgeText = await page.$eval('[data-testid="status-badge-APPROVED"]', (el) => el.textContent.trim());
  assert(statusBadgeText.includes('Đã phê duyệt'), `Status badge renders "Đã phê duyệt": "${statusBadgeText}"`);

  // Verify review banner (focuses on review completion without false RAG claim)
  await page.waitForSelector('[data-testid="approved-notice-banner"]');
  const approvedNotice = await page.$eval('[data-testid="approved-notice-banner"]', (el) => el.textContent.trim());
  assert(approvedNotice.includes('Thẩm định đã hoàn tất'), `Approved notice banner visible: "${approvedNotice}"`);
  assert(!approvedNotice.includes('RAG chưa xuất bản'), `Approved notice banner does not falsely bind RAG status: "${approvedNotice}"`);

  // Verify RAG status badge in PublicationHeadCard
  await page.waitForSelector('[data-testid="rag-status-badge"]');
  const ragBadgeText = await page.$eval('[data-testid="rag-status-badge"]', (el) => el.textContent.trim());
  assert(ragBadgeText.includes('RAG · Chưa xuất bản'), `PublicationHeadCard displays truthful empty head badge: "${ragBadgeText}"`);

  // Verify metadata disclosure
  await page.waitForSelector('[data-testid="document-metadata-card"] summary');
  const metaSummaryText = await page.$eval('[data-testid="document-metadata-card"] summary', (el) => el.textContent.trim());
  assert(metaSummaryText.includes('Thông tin tài liệu'), `Metadata disclosure summary present: "${metaSummaryText}"`);

  // Verify Chunks section
  await page.waitForSelector('article');
  const firstChunkTitle = await page.$eval('article h4', (el) => el.textContent.trim());
  assert(firstChunkTitle.includes('Nguồn nước tưới'), `First chunk is expanded and titled "Nguồn nước tưới"`);

  // Verify neutral growth stage on Chunk 1
  const chunk1Meta = await page.$eval('article', (el) => el.textContent);
  assert(
    chunk1Meta.includes('Chưa xác định giai đoạn'),
    `Chunk 1 displays neutral stage fallback "Chưa xác định giai đoạn"`
  );

  // Verify per-chunk reviewer comment
  await page.waitForSelector('[data-testid="chunk-comment-chk-01"]');
  const chunkComment = await page.$eval('[data-testid="chunk-comment-chk-01"]', (el) => el.textContent.trim());
  assert(
    chunkComment.includes('Nội dung đối chiếu chuẩn xác'),
    `Chunk 1 contains reviewer comment: "${chunkComment}"`
  );

  // Verify PublicationHeadCard for ADMIN
  await page.waitForSelector('[data-testid="publication-head-card"]');
  const pubCardText = await page.$eval('[data-testid="publication-head-card"]', (el) => el.textContent);
  assert(pubCardText.includes('Xuất bản vào RAG'), `PublicationHeadCard rendered for ADMIN`);

  // Verify DecisionDetailCard
  await page.waitForSelector('[data-testid="decision-detail-card"]');
  const decisionCardText = await page.$eval('[data-testid="decision-detail-card"]', (el) => el.textContent);
  assert(decisionCardText.includes('Kết quả thẩm định'), `Decision detail card rendered`);
  assert(decisionCardText.includes('101'), `Decision card renders genuine numeric reviewer ID 101`);
  assert(decisionCardText.includes('Tầng A'), `Decision card renders valid Tier A badge`);

  await captureEvidence(page, 'fe_source_detail_01_desktop_light_1440.png');

  // Scenario 2: Desktop 1440x900 Dark Theme
  console.log('\n--- Scenario 2: Desktop 1440x900 (Dark Theme) ---');
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await new Promise((r) => setTimeout(r, 200));
  await captureEvidence(page, 'fe_source_detail_02_desktop_dark_1440.png');
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
  });

  // Scenario 3: Desktop 1280x800
  console.log('\n--- Scenario 3: Desktop 1280x800 ---');
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise((r) => setTimeout(r, 200));

  // Check no horizontal scrollbar on body
  const desktopOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  assert(!desktopOverflow, 'Desktop 1280 has no horizontal overflow');
  await captureEvidence(page, 'fe_source_detail_03_desktop_1280.png');

  // Scenario 4: Mobile 390x844 Light Theme (iPhone 15 Layout & Geometry Check)
  console.log('\n--- Scenario 4: Mobile 390x844 (iPhone 15 Light Theme & Geometry) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });
  await page.waitForSelector('h1', { timeout: 10000 });

  // Geometry Assertions: Publication action must appear BEFORE chunks
  const publishBtn = await page.waitForSelector('[data-testid="open-publish-modal-button"]');
  const publishBox = await publishBtn.boundingBox();
  const firstChunk = await page.waitForSelector('article');
  const chunkBox = await firstChunk.boundingBox();

  console.log(`    publishBtn.y = ${publishBox.y.toFixed(1)}px, firstChunk.y = ${chunkBox.y.toFixed(1)}px`);
  assert(
    publishBox.y < chunkBox.y,
    `Publish action appears BEFORE content chunks on mobile (publishY: ${publishBox.y.toFixed(1)}px < chunkY: ${chunkBox.y.toFixed(1)}px)`
  );

  // Height check: Touch target >= 44px
  assert(
    publishBox.height >= 44,
    `Publish button meets 44px minimum tap target height (got ${publishBox.height}px)`
  );

  // Typography check: Chunk body 14px font, 22px line-height
  const chunkBodyStyle = await page.$eval('article div.text-sm', (el) => {
    const s = window.getComputedStyle(el);
    return { fontSize: s.fontSize, lineHeight: s.lineHeight };
  });
  assert(
    chunkBodyStyle.fontSize === '14px',
    `Chunk body font size is 14px (got ${chunkBodyStyle.fontSize})`
  );
  assert(
    chunkBodyStyle.lineHeight === '22px',
    `Chunk body line height is 22px (got ${chunkBodyStyle.lineHeight})`
  );

  await captureEvidence(page, 'fe_source_detail_04_mobile_light_390.png');

  // Scenario 5: Mobile 390x844 Dark Theme
  console.log('\n--- Scenario 5: Mobile 390x844 (Dark Theme) ---');
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await new Promise((r) => setTimeout(r, 200));
  await captureEvidence(page, 'fe_source_detail_05_mobile_dark_390.png');
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
  });

  // Scenario 6: Mobile 375x667 SE Viewport
  console.log('\n--- Scenario 6: Mobile 375x667 (SE Narrow Viewport) ---');
  await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
  await new Promise((r) => setTimeout(r, 200));

  const mobileOverflow375 = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  assert(!mobileOverflow375, 'Mobile 375 has no horizontal scrollbar overflow');
  await captureEvidence(page, 'fe_source_detail_06_mobile_375.png');

  // Scenario 7: Provenance Modal Interaction
  console.log('\n--- Scenario 7: Provenance Modal Interaction ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });
  await page.waitForSelector('[data-testid="view-provenance-button"]');
  await page.click('[data-testid="view-provenance-button"]');

  await page.waitForFunction(
    () => document.body.innerText.includes('Nguồn gốc') || document.body.innerText.includes('Dòng dõi'),
    { timeout: 5000 }
  );
  console.log('  ✓ Provenance modal opened successfully');

  // Close modal via close button
  await page.waitForSelector('[data-testid="close-provenance-modal-button"]', { timeout: 3000 });
  await page.click('[data-testid="close-provenance-modal-button"]');
  await new Promise((r) => setTimeout(r, 400));
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="close-provenance-modal-button"]'),
    { timeout: 3000 }
  );
  console.log('  ✓ Provenance modal closed cleanly');

  // Scenario 8: Accordion Toggle Interaction
  console.log('\n--- Scenario 8: Chunks Accordion Toggle Interaction ---');
  await page.waitForSelector('[data-testid="chunk-collapsed-1"]');
  await page.click('[data-testid="chunk-collapsed-1"]');
  await new Promise((r) => setTimeout(r, 400));

  await page.waitForSelector('[data-testid="chunk-article-1"]');
  const expandedArticles = await page.$$('article');
  assert(expandedArticles.length >= 2, 'Clicking collapsed chunk expanded it into an article');

  // Scenario 9: Audit History Tab Verification (F3 Fix)
  console.log('\n--- Scenario 9.1: Audit History Tab - Desktop 1440x900 Verification ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.waitForSelector('[data-testid="tab-history"]');
  await page.click('[data-testid="tab-history"]');
  await page.waitForSelector('[data-testid="history-table-container"]', { timeout: 5000 });

  const tableRows = await page.$$('table tbody tr');
  assert(tableRows.length >= 3, `History table rendered ${tableRows.length} audit events`);

  // Measure Reason column width on Desktop 1440
  const reasonColWidth1440 = await page.$eval(
    '[data-testid="history-reason-col-audit-001"]',
    (el) => el.getBoundingClientRect().width
  );
  assert(
    reasonColWidth1440 >= 240,
    `Desktop 1440 reason column width is >= 240px (actual: ${reasonColWidth1440.toFixed(1)}px)`
  );

  // Measure text container inside reason column
  const reasonTextWidth1440 = await page.$eval(
    '[data-testid="table-reason-text-audit-001"]',
    (el) => el.getBoundingClientRect().width
  );
  assert(
    reasonTextWidth1440 >= 220,
    `Desktop 1440 reason text width is >= 220px (actual: ${reasonTextWidth1440.toFixed(1)}px)`
  );

  // Verify optimistic-lock version display (v2, v1, v0)
  const versionRow1 = await page.$eval(
    '[data-testid="history-row-audit-001"] td:nth-child(5)',
    (el) => el.textContent.trim()
  );
  assert(versionRow1 === 'v2', `Optimistic-lock version displayed as v2 for audit-001: "${versionRow1}"`);

  // Verify neutral label for null reason
  const emptyReasonLabel = await page.$eval(
    '[data-testid="table-empty-reason-audit-003"]',
    (el) => el.textContent.trim()
  );
  assert(
    emptyReasonLabel === 'Không có ghi chú',
    `Null reason rendered neutral label "Không có ghi chú": "${emptyReasonLabel}"`
  );

  // Verify keyboard expand/collapse on Desktop
  const isExpandedBeforeKb = await page.$eval(
    '[data-testid="table-toggle-reason-audit-001"]',
    (el) => el.getAttribute('aria-expanded')
  );
  assert(isExpandedBeforeKb === 'false', 'Audit reason toggle starts with aria-expanded="false"');
  const heightBeforeKb = await page.$eval(
    '[data-testid="table-reason-text-audit-001"]',
    (el) => el.getBoundingClientRect().height
  );

  // Focus and press Enter key
  await page.focus('[data-testid="table-toggle-reason-audit-001"]');
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 250));

  const isExpandedAfterKb = await page.$eval(
    '[data-testid="table-toggle-reason-audit-001"]',
    (el) => el.getAttribute('aria-expanded')
  );
  assert(isExpandedAfterKb === 'true', 'Audit reason toggle has aria-expanded="true" after Enter key press');
  const btnTextAfterKb = await page.$eval(
    '[data-testid="table-toggle-reason-audit-001"]',
    (el) => el.textContent.trim()
  );
  assert(btnTextAfterKb.includes('Thu gọn'), `Button label changed to "Thu gọn": "${btnTextAfterKb}"`);

  const heightAfterKb = await page.$eval(
    '[data-testid="table-reason-text-audit-001"]',
    (el) => el.getBoundingClientRect().height
  );
  assert(
    heightAfterKb > heightBeforeKb,
    `Expanded reason height (${heightAfterKb.toFixed(1)}px) > collapsed height (${heightBeforeKb.toFixed(1)}px)`
  );

  // Press Enter again to collapse
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 250));
  const isExpandedCollapsedKb = await page.$eval(
    '[data-testid="table-toggle-reason-audit-001"]',
    (el) => el.getAttribute('aria-expanded')
  );
  assert(isExpandedCollapsedKb === 'false', 'Audit reason toggle collapses back to aria-expanded="false"');

  // Verify no page-level horizontal overflow at 1440
  const pageOverflow1440 = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  assert(!pageOverflow1440, 'History tab at 1440x900 has no page-level horizontal overflow');
  await captureEvidence(page, 'fe_source_detail_07_history_desktop_1440.png');

  // Scenario 9.2: Desktop 1280x800 Verification
  console.log('\n--- Scenario 9.2: Audit History Tab - Desktop 1280x800 Verification ---');
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise((r) => setTimeout(r, 200));

  const reasonColWidth1280 = await page.$eval(
    '[data-testid="history-reason-col-audit-001"]',
    (el) => el.getBoundingClientRect().width
  );
  assert(
    reasonColWidth1280 >= 240,
    `Desktop 1280 reason column width is >= 240px (actual: ${reasonColWidth1280.toFixed(1)}px)`
  );

  const pageOverflow1280 = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  assert(!pageOverflow1280, 'History tab at 1280x800 has no page-level horizontal overflow');
  await captureEvidence(page, 'fe_source_detail_08_history_desktop_1280.png');

  // Scenario 9.3: Tablet 768x1024 Verification
  console.log('\n--- Scenario 9.3: Audit History Tab - Tablet 768x1024 Verification ---');
  await page.setViewport({ width: 768, height: 1024 });
  await new Promise((r) => setTimeout(r, 200));

  const pageOverflow768 = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  assert(!pageOverflow768, 'History tab at 768x1024 has no page-level horizontal overflow');
  await captureEvidence(page, 'fe_source_detail_09_history_tablet_768.png');

  // Scenario 9.4: Mobile 390x844 Verification (Cards Layout)
  console.log('\n--- Scenario 9.4: Audit History Tab - Mobile 390x844 Cards Verification ---');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise((r) => setTimeout(r, 200));

  // Verify cards container is visible and table container is hidden
  const cardsContainerVisible = await page.$eval(
    '[data-testid="history-cards-container"]',
    (el) => window.getComputedStyle(el).display !== 'none'
  );
  assert(cardsContainerVisible, 'Mobile 390 renders history cards container');

  const tableContainerHidden = await page.$eval(
    '[data-testid="history-table-container"]',
    (el) => window.getComputedStyle(el).display === 'none'
  );
  assert(tableContainerHidden, 'Mobile 390 hides history table container');

  // Measure full-width reason section in card
  const mobileReasonWidth390 = await page.$eval(
    '[data-testid="card-reason-text-audit-001"]',
    (el) => el.getBoundingClientRect().width
  );
  assert(
    mobileReasonWidth390 >= 280,
    `Mobile 390 card reason width is >= 280px (actual: ${mobileReasonWidth390.toFixed(1)}px)`
  );

  // Test tap/click expand/collapse on Mobile Card
  await page.click('[data-testid="card-toggle-reason-audit-001"]');
  await new Promise((r) => setTimeout(r, 200));
  const mobileExpanded = await page.$eval(
    '[data-testid="card-toggle-reason-audit-001"]',
    (el) => el.getAttribute('aria-expanded')
  );
  assert(mobileExpanded === 'true', 'Mobile card reason expanded on click');
  await page.click('[data-testid="card-toggle-reason-audit-001"]');
  await new Promise((r) => setTimeout(r, 200));

  const pageOverflow390 = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  assert(!pageOverflow390, 'History tab at 390x844 has no page-level horizontal overflow');
  await captureEvidence(page, 'fe_source_detail_10_history_mobile_390.png');

  // Scenario 9.5: Mobile 375x667 Verification
  console.log('\n--- Scenario 9.5: Audit History Tab - Mobile 375x667 Verification ---');
  await page.setViewport({ width: 375, height: 667 });
  await new Promise((r) => setTimeout(r, 200));

  const mobileReasonWidth375 = await page.$eval(
    '[data-testid="card-reason-text-audit-001"]',
    (el) => el.getBoundingClientRect().width
  );
  assert(
    mobileReasonWidth375 >= 260,
    `Mobile 375 card reason width is >= 260px (actual: ${mobileReasonWidth375.toFixed(1)}px)`
  );

  const pageOverflow375 = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  assert(!pageOverflow375, 'History tab at 375x667 has no page-level horizontal overflow');
  await captureEvidence(page, 'fe_source_detail_11_history_mobile_375.png');

  // Reset viewport and tab before continuing
  await page.setViewport({ width: 1440, height: 900 });
  await page.click('[data-testid="tab-chunks"]');
  await new Promise((r) => setTimeout(r, 200));

  // Scenario 10: Non-ADMIN Role Restrictions
  console.log('\n--- Scenario 10: Non-ADMIN Role Restrictions ---');
  currentAuthUser = {
    id: 10,
    email: 'expert@duricare.ctu.vn',
    role: 'EXPERT',
    farmId: 1,
    fullName: 'Chuyên gia Nông nghiệp',
  };
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });
  await page.waitForSelector('h1', { timeout: 10000 });

  const pubCardForExpert = await page.$('[data-testid="publication-head-card"]');
  assert(
    pubCardForExpert === null,
    'EXPERT role must NOT see publication head card (strict RBAC compliance, no false RAG claims)'
  );

  // Restore ADMIN user
  currentAuthUser = {
    id: 1,
    email: 'admin@duricare.ctu.vn',
    role: 'ADMIN',
    farmId: 1,
    fullName: 'Quản trị viên CTU',
  };

  // Scenario 11: RAG ACTIVE Publication (Same Revision)
  console.log('\n--- Scenario 11: Truthful RAG ACTIVE State (Same Revision) ---');
  currentHeadFixture = {
    sourceId: 'src-ctu-01',
    version: 2,
    generation: 2,
    activePublicationId: 'pub-active-01',
    pendingPublicationId: null,
    updatedAt: '2026-11-16T09:35:00Z',
  };
  currentPubDetailsMap.set('pub-active-01', {
    publication: {
      id: 'pub-active-01',
      sourceId: 'src-ctu-01',
      revisionId: 'rev-ctu-01-1',
      revisionNumber: 1,
      generation: 2,
      status: 'ACTIVE',
      sourceTitle: 'Nguồn nước và tưới nước cho sầu riêng',
      assessedTier: 'A',
      chunkCount: 3,
      manifestHash: 'hash-active-abc',
      createdAt: '2026-11-16T09:30:00Z',
      activatedAt: '2026-11-16T09:35:00Z',
      revokedAt: null,
      latestJobId: null,
    },
  });

  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });
  await page.waitForSelector('[data-testid="rag-status-badge"]');
  const activeRagBadge = await page.$eval('[data-testid="rag-status-badge"]', (el) => el.textContent.trim());
  assert(
    activeRagBadge.includes('RAG · Đang hoạt động'),
    `RAG badge reflects ACTIVE state truthfully: "${activeRagBadge}"`
  );
  const activeApprovedBanner = await page.$eval('[data-testid="approved-notice-banner"]', (el) => el.textContent.trim());
  assert(
    !activeApprovedBanner.includes('chưa xuất bản'),
    `Approved notice banner does not falsely contradict ACTIVE publication: "${activeApprovedBanner}"`
  );
  const inspectBtn = await page.$('[data-testid="inspect-active-pub-button"]');
  assert(inspectBtn !== null, 'Inspect active publication button is available');

  // Scenario 12: RAG PENDING Publication
  console.log('\n--- Scenario 12: Truthful RAG PENDING State ---');
  currentHeadFixture = {
    sourceId: 'src-ctu-01',
    version: 3,
    generation: 3,
    activePublicationId: null,
    pendingPublicationId: 'pub-pending-01',
    updatedAt: '2026-11-16T09:40:00Z',
  };
  currentPubDetailsMap.set('pub-pending-01', {
    publication: {
      id: 'pub-pending-01',
      sourceId: 'src-ctu-01',
      revisionId: 'rev-ctu-01-1',
      revisionNumber: 1,
      generation: 3,
      status: 'PENDING',
      sourceTitle: 'Nguồn nước và tưới nước cho sầu riêng',
      assessedTier: 'A',
      chunkCount: 3,
      manifestHash: 'hash-pending-abc',
      createdAt: '2026-11-16T09:40:00Z',
      activatedAt: null,
      revokedAt: null,
      latestJobId: 'job-01',
    },
  });

  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });
  await page.waitForSelector('[data-testid="rag-status-badge"]');
  const pendingRagBadge = await page.$eval('[data-testid="rag-status-badge"]', (el) => el.textContent.trim());
  assert(
    pendingRagBadge.includes('RAG · Đang xử lý'),
    `RAG badge reflects PENDING state truthfully: "${pendingRagBadge}"`
  );
  const inspectPendingBtn = await page.$('[data-testid="inspect-pending-pub-button"]');
  assert(inspectPendingBtn !== null, 'Inspect pending publication button is available');

  // Scenario 13: RAG ACTIVE for a DIFFERENT Revision
  console.log('\n--- Scenario 13: RAG ACTIVE on a Different Revision ---');
  currentHeadFixture = {
    sourceId: 'src-ctu-01',
    version: 4,
    generation: 4,
    activePublicationId: 'pub-active-rev2',
    pendingPublicationId: null,
    updatedAt: '2026-11-16T09:45:00Z',
  };
  currentPubDetailsMap.set('pub-active-rev2', {
    publication: {
      id: 'pub-active-rev2',
      sourceId: 'src-ctu-01',
      revisionId: 'rev-ctu-01-2',
      revisionNumber: 2,
      generation: 4,
      status: 'ACTIVE',
      sourceTitle: 'Nguồn nước và tưới nước cho sầu riêng',
      assessedTier: 'A',
      chunkCount: 3,
      manifestHash: 'hash-rev2-abc',
      createdAt: '2026-11-16T09:45:00Z',
      activatedAt: '2026-11-16T09:46:00Z',
      revokedAt: null,
      latestJobId: null,
    },
  });

  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });
  await page.waitForSelector('[data-testid="rag-status-badge"]');
  const diffRevRagBadge = await page.$eval('[data-testid="rag-status-badge"]', (el) => el.textContent.trim());
  assert(
    diffRevRagBadge.includes('RAG · Bản 2 đang hoạt động'),
    `RAG badge states that Revision 2 is active while viewing Revision 1: "${diffRevRagBadge}"`
  );

  // Scenario 14: 503 Service Unavailable on Publication Head
  console.log('\n--- Scenario 14: 503 Service Unavailable on Publication Head ---');
  mockPublicationHeadError = {
    status: 503,
    message: 'Chức năng xuất bản hiện chưa sẵn sàng.',
  };

  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });
  await page.waitForSelector('[data-testid="rag-status-badge"]');
  const errorRagBadge = await page.$eval('[data-testid="rag-status-badge"]', (el) => el.textContent.trim());
  assert(
    errorRagBadge.includes('Chưa sẵn sàng'),
    `503 response displays "Chưa sẵn sàng" badge without falsely claiming unpublished: "${errorRagBadge}"`
  );
  const errApprovedBanner = await page.$eval('[data-testid="approved-notice-banner"]', (el) => el.textContent.trim());
  assert(
    !errApprovedBanner.includes('chưa xuất bản'),
    `Approved notice banner does not conclude unpublished when head fails with 503: "${errApprovedBanner}"`
  );

  // Reset error
  mockPublicationHeadError = null;

  // Scenario 15: Action Group Placement & Role Alignment (F4 Verification)
  console.log('\n--- Scenario 15: Action Group Placement & Role Alignment (F4 Verification) ---');
  currentAuthUser = {
    id: 10,
    email: 'admin@duricare.ctu.vn',
    role: 'ADMIN',
    farmId: 1,
    fullName: 'Quản trị viên CTU',
  };
  currentHeadFixture = {
    sourceId: 'src-ctu-01',
    version: 1,
    activePublication: null,
    pendingPublication: null,
    lastOperationReceipt: null,
    updatedAt: '2026-11-16T09:30:00Z',
  };

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });

  // 15.1: Desktop Header & Right Rail placement
  const desktopHeaderProvBtn = await page.$('[data-testid="view-provenance-button"]');
  assert(desktopHeaderProvBtn !== null, '[F4] Desktop header contains Provenance button');

  // Verify header does NOT contain Create Subsequent Revision button
  const headerCreateBtn = await page.evaluate(() => {
    const header = document.querySelector('.flex.items-center.gap-2.shrink-0');
    return header ? header.querySelector('[data-testid="create-subsequent-revision-button"]') : null;
  });
  assert(headerCreateBtn === null, '[F4] Desktop header does NOT contain Create Subsequent Revision button');

  // Verify Right Rail has both Publish button and Create Subsequent Revision button
  await page.waitForSelector('[data-testid="open-publish-modal-button"]');
  await page.waitForSelector('[data-testid="create-subsequent-revision-button"]');

  const pubRect = await page.$eval('[data-testid="open-publish-modal-button"]', (el) => {
    const r = el.getBoundingClientRect();
    return { y: r.y, height: r.height, width: r.width };
  });
  const createRect = await page.$eval('[data-testid="create-subsequent-revision-button"]', (el) => {
    const r = el.getBoundingClientRect();
    return { y: r.y, height: r.height, width: r.width };
  });

  assert(
    createRect.y > pubRect.y + pubRect.height - 2,
    `[F4] Create revision button is positioned below publish button (pub bottom: ${(pubRect.y + pubRect.height).toFixed(1)}, create top: ${createRect.y.toFixed(1)})`
  );
  assert(
    createRect.y - (pubRect.y + pubRect.height) <= 12,
    `[F4] Gap between publish and create revision is ~8px (actual: ${(createRect.y - (pubRect.y + pubRect.height)).toFixed(1)}px)`
  );
  assert(
    createRect.height === 44,
    `[F4] Create subsequent revision button meets 44px tap target height (got ${createRect.height}px)`
  );
  assert(
    createRect.width >= 240,
    `[F4] Create subsequent revision button spans full width of card (got ${createRect.width.toFixed(1)}px)`
  );

  // Test opening new revision modal from relocated button
  await page.click('[data-testid="create-subsequent-revision-button"]');
  await page.waitForSelector('[data-testid="new-revision-modal"]');
  const modalText = await page.$eval('[data-testid="new-revision-modal"]', (el) => el.textContent);
  assert(modalText.includes('Tạo phiên bản tiếp theo'), '[F4] Clicking Create Revision button opens revision modal');
  await page.click('[data-testid="close-new-rev-modal-button"]');
  await new Promise((r) => setTimeout(r, 200));

  // 15.2: Mobile 390 Action Group Placement
  await page.setViewport({ width: 390, height: 844 });
  await new Promise((r) => setTimeout(r, 200));

  const mobileHeaderProvDisplay = await page.$eval(
    '[data-testid="view-provenance-button"]',
    (el) => window.getComputedStyle(el).display
  );
  assert(mobileHeaderProvDisplay === 'none', '[F4] Header provenance button is hidden on mobile');

  await page.waitForSelector('[data-testid="mobile-create-subsequent-revision-button"]');
  await page.waitForSelector('[data-testid="mobile-view-provenance-button"]');

  const mobileCreateH = await page.$eval(
    '[data-testid="mobile-create-subsequent-revision-button"]',
    (el) => el.getBoundingClientRect().height
  );
  const mobileProvH = await page.$eval(
    '[data-testid="mobile-view-provenance-button"]',
    (el) => el.getBoundingClientRect().height
  );
  assert(mobileCreateH === 44, `[F4] Mobile create revision button is 44px (got ${mobileCreateH}px)`);
  assert(mobileProvH === 44, `[F4] Mobile provenance button is 44px (got ${mobileProvH}px)`);

  // 15.3: ADMIN non-owner role check
  console.log('\n--- Scenario 15.3: ADMIN Non-Owner Role Check ---');
  currentAuthUser = {
    id: 99,
    email: 'admin_non_owner@duricare.ctu.vn',
    role: 'ADMIN',
    farmId: 1,
    fullName: 'Admin Non Owner',
  };
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });
  await page.waitForSelector('[data-testid="open-publish-modal-button"]');
  const nonOwnerCreateBtn = await page.$('[data-testid="create-subsequent-revision-button"]');
  assert(
    nonOwnerCreateBtn === null,
    '[F4] ADMIN non-owner cannot author new revision (button strictly hidden)'
  );

  // 15.4: Verified EXPERT-owner role check
  console.log('\n--- Scenario 15.4: Verified EXPERT-Owner Role Check ---');
  currentAuthUser = {
    id: 10,
    email: 'expert_owner@duricare.ctu.vn',
    role: 'EXPERT',
    farmId: 1,
    fullName: 'Chuyên gia Chủ sở hữu',
  };
  mockExpertProfile = {
    id: 10,
    userId: 10,
    email: 'expert_owner@duricare.ctu.vn',
    enabled: true,
    role: 'EXPERT',
    fullName: 'Chuyên gia Chủ sở hữu',
    affiliation: 'Trường Đại học Cần Thơ',
    specialties: 'Bệnh học cây trồng',
    verificationStatus: 'VERIFIED',
    verifiedAt: '2026-10-01T08:00:00Z',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    version: 1,
  };
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });
  const expertPubCard = await page.$('[data-testid="publication-head-card"]');
  assert(expertPubCard === null, '[F4] Verified EXPERT does not receive publication card or call publication API');

  await page.waitForSelector('[data-testid="expert-document-actions-card"]');
  await page.waitForSelector('[data-testid="create-subsequent-revision-button"]');
  const expertCreateBtnText = await page.$eval(
    '[data-testid="create-subsequent-revision-button"]',
    (el) => el.textContent.trim()
  );
  assert(
    expertCreateBtnText.includes('Tạo phiên bản mới'),
    `[F4] Verified EXPERT owner has access to Create Revision button: "${expertCreateBtnText}"`
  );

  // 15.5: Restricted EXPERT role check
  console.log('\n--- Scenario 15.5: Restricted EXPERT Role Check ---');
  currentAuthUser = {
    id: 88,
    email: 'expert_non_owner@duricare.ctu.vn',
    role: 'EXPERT',
    farmId: 1,
    fullName: 'Chuyên gia Không sở hữu',
  };
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });
  const restrExpertPubCard = await page.$('[data-testid="publication-head-card"]');
  const restrExpertDocCardVisible = await page.$eval(
    '[data-testid="expert-document-actions-card"]',
    (el) => window.getComputedStyle(el).display !== 'none'
  ).catch(() => false);
  const restrCreateBtn = await page.$('[data-testid="create-subsequent-revision-button"]');
  assert(restrExpertPubCard === null, '[F4] Restricted EXPERT has no publication card');
  assert(!restrExpertDocCardVisible, '[F4] Restricted EXPERT has no visible document actions card on desktop');
  assert(restrCreateBtn === null, '[F4] Restricted EXPERT has no create revision button');

  // Helper for F5 badge geometry extraction
  async function getBadgeGeometry(sel) {
    return await page.$eval(sel, (el) => {
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const icon = el.querySelector('.material-symbols-outlined, .badge-icon');
      let iconBox = null;
      if (icon) {
        const ir = icon.getBoundingClientRect();
        const ics = window.getComputedStyle(icon);
        iconBox = {
          width: ir.width,
          height: ir.height,
          fontSize: ics.fontSize,
          lineHeight: ics.lineHeight,
        };
      }
      const dot = el.querySelector('.rounded-full:not(svg)');
      let dotBox = null;
      if (dot) {
        const dr = dot.getBoundingClientRect();
        dotBox = { width: dr.width, height: dr.height };
      }
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        borderRadius: cs.borderRadius,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
        iconBox,
        dotBox,
        text: el.textContent.trim(),
      };
    });
  }

  // ================================================================
  // Scenario 16: Badge Shape, Height & Alignment Suite (F5 Verification)
  // ================================================================
  console.log('\n--- Scenario 16.1: Badge Standardization on Desktop 1440x900 (Light / VI) ---');
  // Switch back to ADMIN user
  currentAuthUser = {
    id: 10,
    email: 'admin_ctu@duricare.ctu.vn',
    role: 'ADMIN',
    farmId: 1,
    fullName: 'Quản trị viên CTU',
  };
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('duricare-language', 'vi');
  });
  await page.reload({ waitUntil: 'networkidle0' });

  // 16.1.1: Header Badges
  const hStatus = await getBadgeGeometry('[data-testid="status-badge-APPROVED"]');
  const hTier = await getBadgeGeometry('[data-testid="header-assessed-tier-badge"]');

  console.log(`  Header Status: ${hStatus.height}px, radius: ${hStatus.borderRadius}, font: ${hStatus.fontSize}, text: "${hStatus.text}"`);
  console.log(`  Header Tier:   ${hTier.height}px, radius: ${hTier.borderRadius}, font: ${hTier.fontSize}, text: "${hTier.text}"`);

  assert(
    Math.abs(hStatus.height - hTier.height) <= 1,
    `[F5] Header Tier badge height (${hTier.height}px) matches Status badge height (${hStatus.height}px)`
  );
  assert(
    hStatus.borderRadius === hTier.borderRadius,
    `[F5] Header badges have identical border radius (${hStatus.borderRadius})`
  );
  assert(
    hStatus.fontSize === hTier.fontSize,
    `[F5] Header badges have identical font size (${hStatus.fontSize})`
  );
  assert(
    hTier.iconBox !== null && hTier.iconBox.height <= 16 && hTier.iconBox.width <= 16,
    `[F5] Header Tier badge icon is bounded (got ${hTier.iconBox?.width}x${hTier.iconBox?.height}px)`
  );

  // 16.1.2: Decision Card Badges
  const cOutcome = await getBadgeGeometry('[data-testid="decision-outcome-badge"]');
  const cTier = await getBadgeGeometry('[data-testid="card-assessed-tier-badge"]');

  console.log(`  Card Outcome:  ${cOutcome.height}px, radius: ${cOutcome.borderRadius}, font: ${cOutcome.fontSize}, text: "${cOutcome.text}"`);
  console.log(`  Card Tier:     ${cTier.height}px, radius: ${cTier.borderRadius}, font: ${cTier.fontSize}, text: "${cTier.text}"`);

  assert(
    Math.abs(cOutcome.height - cTier.height) <= 1,
    `[F5] Card Outcome badge height (${cOutcome.height}px) matches Card Tier badge height (${cTier.height}px)`
  );
  assert(
    cOutcome.borderRadius === cTier.borderRadius,
    `[F5] Card Outcome and Tier badges have identical border radius (${cOutcome.borderRadius})`
  );
  assert(
    cOutcome.borderRadius === '8px' || cOutcome.borderRadius === '0.5rem',
    `[F5] Card Outcome badge uses rounded-lg rectangle (got ${cOutcome.borderRadius}, NOT pill rounded-full)`
  );
  assert(
    cTier.borderRadius === '8px' || cTier.borderRadius === '0.5rem',
    `[F5] Card Tier badge uses rounded-lg rectangle (got ${cTier.borderRadius})`
  );
  assert(
    Math.abs(cOutcome.y - cTier.y) <= 2,
    `[F5] Card Outcome and Tier badges stay on the same horizontal row (Outcome Y: ${cOutcome.y}, Tier Y: ${cTier.y})`
  );

  // 16.2: Desktop 1280x800 Viewport
  console.log('\n--- Scenario 16.2: Badge Standardization on Desktop 1280x800 ---');
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  const d1280cOutcome = await getBadgeGeometry('[data-testid="decision-outcome-badge"]');
  const d1280cTier = await getBadgeGeometry('[data-testid="card-assessed-tier-badge"]');
  assert(
    Math.abs(d1280cOutcome.height - d1280cTier.height) <= 1,
    `[F5] Desktop 1280: Card Outcome (${d1280cOutcome.height}px) matches Tier (${d1280cTier.height}px)`
  );
  assert(
    d1280cOutcome.borderRadius === d1280cTier.borderRadius,
    `[F5] Desktop 1280: Card badges have identical radius (${d1280cOutcome.borderRadius})`
  );
  assert(
    Math.abs(d1280cOutcome.y - d1280cTier.y) <= 2,
    `[F5] Desktop 1280: Badges remain on one row without breaking each other (Y diff: ${Math.abs(d1280cOutcome.y - d1280cTier.y)}px)`
  );

  // 16.3: Mobile 390x844 (iPhone 15)
  console.log('\n--- Scenario 16.3: Badge Standardization on Mobile 390x844 (Light / Dark) ---');
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle0' });
  const m390hStatus = await getBadgeGeometry('[data-testid="status-badge-APPROVED"]');
  const m390hTier = await getBadgeGeometry('[data-testid="header-assessed-tier-badge"]');
  assert(
    Math.abs(m390hStatus.height - m390hTier.height) <= 1,
    `[F5] Mobile 390: Header Tier (${m390hTier.height}px) matches Status (${m390hStatus.height}px)`
  );
  const m390cOutcome = await getBadgeGeometry('[data-testid="decision-outcome-badge"]');
  const m390cTier = await getBadgeGeometry('[data-testid="card-assessed-tier-badge"]');
  assert(
    Math.abs(m390cOutcome.height - m390cTier.height) <= 1,
    `[F5] Mobile 390: Card Outcome (${m390cOutcome.height}px) matches Tier (${m390cTier.height}px)`
  );
  assert(
    m390cOutcome.borderRadius === m390cTier.borderRadius,
    `[F5] Mobile 390: Card badges share identical radius (${m390cOutcome.borderRadius})`
  );
  assert(
    Math.abs(m390cOutcome.y - m390cTier.y) <= 2,
    `[F5] Mobile 390: Card Outcome & Tier remain together on the same row (Y diff: ${Math.abs(m390cOutcome.y - m390cTier.y)}px)`
  );

  // Dark mode on mobile 390
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  const m390DarkOutcome = await getBadgeGeometry('[data-testid="decision-outcome-badge"]');
  const m390DarkTier = await getBadgeGeometry('[data-testid="card-assessed-tier-badge"]');
  assert(
    Math.abs(m390DarkOutcome.height - m390DarkTier.height) <= 1,
    `[F5] Mobile 390 Dark: Outcome (${m390DarkOutcome.height}px) matches Tier (${m390DarkTier.height}px)`
  );
  await page.evaluate(() => document.documentElement.classList.remove('dark'));

  // 16.4: Mobile 375x667 (iPhone SE Narrow)
  console.log('\n--- Scenario 16.4: Badge Standardization on Mobile 375x667 ---');
  await page.setViewport({ width: 375, height: 667 });
  await page.reload({ waitUntil: 'networkidle0' });
  const m375cOutcome = await getBadgeGeometry('[data-testid="decision-outcome-badge"]');
  const m375cTier = await getBadgeGeometry('[data-testid="card-assessed-tier-badge"]');
  assert(
    Math.abs(m375cOutcome.height - m375cTier.height) <= 1,
    `[F5] Mobile 375: Card Outcome (${m375cOutcome.height}px) matches Tier (${m375cTier.height}px)`
  );
  assert(
    Math.abs(m375cOutcome.y - m375cTier.y) <= 2,
    `[F5] Mobile 375: Card Outcome & Tier remain together without breaking apart (Y diff: ${Math.abs(m375cOutcome.y - m375cTier.y)}px)`
  );

  // 16.5: English Locale Verification
  console.log('\n--- Scenario 16.5: Badge Standardization in EN Locale ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluate(() => {
    localStorage.setItem('duricare-language', 'en');
  });
  await page.reload({ waitUntil: 'networkidle0' });

  const enHtmlLang = await page.$eval('html', (el) => el.getAttribute('lang'));
  assert(enHtmlLang === 'en', `[F5/R6] Document language attribute is "en" (got "${enHtmlLang}")`);

  const enCardTitle = await page.$eval(
    '[data-testid="decision-card-title"] h3',
    (el) => el.textContent.trim()
  );
  assert(
    enCardTitle === 'Review Results',
    `[F5/R6] Decision Card title is translated to English ("${enCardTitle}")`
  );

  const enHStatus = await getBadgeGeometry('[data-testid="status-badge-APPROVED"]');
  const enHTier = await getBadgeGeometry('[data-testid="header-assessed-tier-badge"]');
  const enCOutcome = await getBadgeGeometry('[data-testid="decision-outcome-badge"]');
  const enCTier = await getBadgeGeometry('[data-testid="card-assessed-tier-badge"]');

  assert(
    enCOutcome.text === 'Approved',
    `[F5/R6] Decision Outcome Badge is translated to English ("${enCOutcome.text}")`
  );
  assert(
    Math.abs(enHStatus.height - enHTier.height) <= 1,
    `[F5] EN Header: Tier height (${enHTier.height}px) matches Status height (${enHStatus.height}px)`
  );
  assert(
    Math.abs(enCOutcome.height - enCTier.height) <= 1,
    `[F5] EN Card: Outcome height (${enCOutcome.height}px) matches Tier height (${enCTier.height}px)`
  );
  assert(
    enCOutcome.borderRadius === enCTier.borderRadius,
    `[F5] EN Card: Outcome & Tier share identical radius (${enCOutcome.borderRadius})`
  );

  // Restore VI locale for visual evidence capture
  await page.evaluate(() => {
    localStorage.setItem('duricare-language', 'vi');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  const viHtmlLang = await page.$eval('html', (el) => el.getAttribute('lang'));
  assert(viHtmlLang === 'vi', `[F5/R6] Restored document language attribute is "vi" (got "${viHtmlLang}")`);

  // Re-capture screenshots with standardized badges
  await page.setViewport({ width: 1440, height: 900 });
  await captureEvidence(page, 'fe_source_detail_01_desktop_light_1440.png');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await captureEvidence(page, 'fe_source_detail_02_desktop_dark_1440.png');
  await page.evaluate(() => document.documentElement.classList.remove('dark'));

  await page.setViewport({ width: 1280, height: 800 });
  await captureEvidence(page, 'fe_source_detail_03_desktop_1280.png');

  await page.setViewport({ width: 390, height: 844 });
  await captureEvidence(page, 'fe_source_detail_04_mobile_light_390.png');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await captureEvidence(page, 'fe_source_detail_05_mobile_dark_390.png');
  await page.evaluate(() => document.documentElement.classList.remove('dark'));

  await page.setViewport({ width: 375, height: 667 });
  await captureEvidence(page, 'fe_source_detail_06_mobile_375.png');

  // ================================================================
  // Scenario 17: Review Remediation Verification (R1, R2, R3, R4, R5, R6)
  // ================================================================
  console.log('\n================================================================');
  console.log('Scenario 17: Review Remediation Verification (R1, R2, R3, R4, R5, R6)');
  console.log('================================================================\n');

  // --- Scenario 17.1 (R1): Verified EXPERT Non-Owner Mobile Provenance Button ---
  console.log('--- Scenario 17.1: R1 Verified EXPERT Non-Owner Mobile Provenance Access ---');
  currentAuthUser = {
    id: 88,
    email: 'expert_non_owner@duricare.ctu.vn',
    role: 'EXPERT',
    farmId: 1,
    fullName: 'Chuyên gia Nông nghiệp',
  };
  mockExpertProfile = {
    userId: 88,
    verificationStatus: 'VERIFIED',
    fullName: 'Chuyên gia Nông nghiệp',
  };
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, {
    waitUntil: 'networkidle0',
  });

  const m17MobileProvBtn = await page.$('[data-testid="mobile-view-provenance-button"]');
  assert(m17MobileProvBtn !== null, '[R1] Mobile 390 has visible Provenance button for verified EXPERT non-owner');
  const m17MobileProvBtnHeight = await page.$eval(
    '[data-testid="mobile-view-provenance-button"]',
    (el) => el.getBoundingClientRect().height
  );
  assert(m17MobileProvBtnHeight >= 44, `[R1] Mobile provenance button satisfies 44px tap target (got ${m17MobileProvBtnHeight}px)`);

  // Open modal via mobile provenance button
  await page.click('[data-testid="mobile-view-provenance-button"]');
  await page.waitForSelector('[data-testid="close-provenance-modal-button"]', { timeout: 4000 });
  assert(true, '[R1] Mobile provenance button opens provenance modal successfully');
  await page.click('[data-testid="close-provenance-modal-button"]');
  await new Promise((r) => setTimeout(r, 400));
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="close-provenance-modal-button"]'),
    { timeout: 4000 }
  );

  // On desktop 1440, verify provenance button is in header and actions card is hidden
  await page.setViewport({ width: 1440, height: 900 });
  await page.reload({ waitUntil: 'networkidle0' });
  const d17HeaderProvBtn = await page.$('[data-testid="view-provenance-button"]');
  assert(d17HeaderProvBtn !== null, '[R1] Desktop 1440 has Provenance button in header for non-owner');
  const d17ActionsCardDisplay = await page.$eval(
    '[data-testid="expert-document-actions-card"]',
    (el) => window.getComputedStyle(el).display
  ).catch(() => 'none');
  assert(d17ActionsCardDisplay === 'none', '[R1] Desktop 1440 hides actions card when non-owner cannot author new revision');

  // --- Scenario 17.2 (R1): Owner Non-Terminal Revision (SUBMITTED) Mobile Provenance ---
  console.log('\n--- Scenario 17.2: R1 Owner Non-Terminal Revision Mobile Provenance Access ---');
  currentAuthUser = {
    id: 10,
    email: 'expert_owner@duricare.ctu.vn',
    role: 'EXPERT',
    farmId: 1,
    fullName: 'Chuyên gia Tác giả',
  };
  mockExpertProfile = {
    userId: 10,
    verificationStatus: 'VERIFIED',
    fullName: 'Chuyên gia Tác giả',
  };
  // Temporarily set revision status to SUBMITTED
  const originalRevisionStatus = mockRevision1.status;
  mockRevision1.status = 'SUBMITTED';

  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle0' });

  const m17OwnerSubmittedProvBtn = await page.$('[data-testid="mobile-view-provenance-button"]');
  const m17OwnerSubmittedCreateBtn = await page.$('[data-testid="create-subsequent-revision-button"]');
  assert(m17OwnerSubmittedProvBtn !== null, '[R1] Owner with SUBMITTED revision has visible mobile Provenance button');
  assert(m17OwnerSubmittedCreateBtn === null, '[R1] Owner with SUBMITTED revision cannot create subsequent revision');

  // Restore revision status
  mockRevision1.status = originalRevisionStatus;

  // --- Scenario 17.3 (R2): Detail 503 Truthful Error State ---
  console.log('\n--- Scenario 17.3: R2 Truthful Error State when Publication Detail 503s ---');
  currentAuthUser = {
    id: 1,
    email: 'admin@duricare.ctu.vn',
    role: 'ADMIN',
    farmId: 1,
    fullName: 'Quản trị viên CTU',
  };
  currentHeadFixture = {
    sourceId: 'src-ctu-01',
    version: 1,
    generation: 1,
    activePublicationId: 'pub-active-01',
    pendingPublicationId: null,
    updatedAt: '2026-11-16T09:35:00Z',
  };
  mockPublicationDetailError = {
    status: 503,
    message: 'Publication detail service temporarily unavailable',
  };

  await page.setViewport({ width: 1440, height: 900 });
  await page.reload({ waitUntil: 'networkidle0' });

  const r2RagBadgeText = await page.$eval(
    '[data-testid="rag-status-badge"]',
    (el) => el.textContent.trim()
  );
  console.log(`  R2 RAG Badge on detail 503: "${r2RagBadgeText}"`);
  assert(
    !r2RagBadgeText.includes('Chưa xuất bản'),
    `[R2] UI does NOT falsely state "Chưa xuất bản" when active publication exists but detail fails: "${r2RagBadgeText}"`
  );
  assert(
    r2RagBadgeText.includes('Chưa sẵn sàng'),
    `[R2] UI displays truthful "Chưa sẵn sàng" badge on detail fetch error: "${r2RagBadgeText}"`
  );
  const r2PublishModalBtn = await page.$('[data-testid="open-publish-modal-button"]');
  assert(
    r2PublishModalBtn === null,
    '[R2] Admin cannot open publish modal when active publication detail is in error state'
  );
  const r2RetryBtn = await page.$('[data-testid="retry-publication-detail-button"]');
  assert(r2RetryBtn !== null, '[R2] Retry publication detail button is available to recover');

  // --- Scenario 17.4 (R2): Recovery from Detail Error ---
  console.log('\n--- Scenario 17.4: R2 Publication Detail Recovery on Retry ---');
  mockPublicationDetailError = null;
  await page.click('[data-testid="retry-publication-detail-button"]');
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="rag-status-badge"]');
    return b && b.textContent.includes('Đang hoạt động');
  });
  const r2RecoveredText = await page.$eval(
    '[data-testid="rag-status-badge"]',
    (el) => el.textContent.trim()
  );
  assert(
    r2RecoveredText.includes('RAG · Đang hoạt động'),
    `[R2] After retry, RAG badge recovers to active: "${r2RecoveredText}"`
  );

  // --- Scenario 17.5 (R3): Decision Card Initial Collapsed on Mobile (< 1024px) ---
  console.log('\n--- Scenario 17.5: R3 Decision Card Initial Collapsed on Mobile (< 1024px) ---');
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle0' });
  const m17CardOpenInitial = await page.$eval(
    '[data-testid="decision-detail-card"]',
    (el) => el.hasAttribute('open')
  );
  assert(!m17CardOpenInitial, '[R3] Decision detail card is initially COLLAPSED on mobile (< 1024px)');

  // Toggle open
  await page.click('[data-testid="decision-detail-summary"]');
  const m17CardOpenAfterClick = await page.$eval(
    '[data-testid="decision-detail-card"]',
    (el) => el.hasAttribute('open')
  );
  assert(m17CardOpenAfterClick, '[R3] Decision detail card opens on mobile tap');

  // Toggle closed again
  await page.click('[data-testid="decision-detail-summary"]');
  const m17CardOpenAfterSecondClick = await page.$eval(
    '[data-testid="decision-detail-card"]',
    (el) => el.hasAttribute('open')
  );
  assert(!m17CardOpenAfterSecondClick, '[R3] Decision detail card collapses on second tap');

  // --- Scenario 17.6 (R3): Decision Card Initial Open on Desktop (>= 1024px) ---
  console.log('\n--- Scenario 17.6: R3 Decision Card Initial Open on Desktop (>= 1024px) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.reload({ waitUntil: 'networkidle0' });
  const d17CardOpenInitial = await page.$eval(
    '[data-testid="decision-detail-card"]',
    (el) => el.hasAttribute('open')
  );
  assert(d17CardOpenInitial, '[R3] Decision detail card is initially OPEN on desktop (>= 1024px)');

  // --- Scenario 17.7 (R5/R6): Decision Card Summary 2D Non-Collision across Viewports & Locales ---
  console.log('\n--- Scenario 17.7: R5/R6 Decision Card Summary 2D Non-Collision across Viewports & Locales ---');
  for (const locale of ['vi', 'en']) {
    await page.evaluate((loc) => {
      localStorage.setItem('duricare-language', loc);
    }, locale);

    for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 1024, height: 768 }]) {
      await page.setViewport(vp);
      await page.reload({ waitUntil: 'networkidle0' });

      const geom = await page.$eval('[data-testid="decision-detail-summary"]', (summaryEl) => {
        const titleEl = summaryEl.querySelector('[data-testid="decision-card-title"]');
        const h3El = summaryEl.querySelector('h3');
        const badgesContainer = summaryEl.querySelector('[data-testid="decision-card-badges"]');
        const outcomeEl = summaryEl.querySelector('[data-testid="decision-outcome-badge"]');
        const tierEl = summaryEl.querySelector('[data-testid="card-assessed-tier-badge"]');

        if (!titleEl || !h3El || !badgesContainer || !outcomeEl) return null;

        const titleRect = titleEl.getBoundingClientRect();
        const h3Rect = h3El.getBoundingClientRect();
        const badgesRect = badgesContainer.getBoundingClientRect();
        const outcomeRect = outcomeEl.getBoundingClientRect();
        const tierRect = tierEl ? tierEl.getBoundingClientRect() : null;

        // 2D collision check:
        // Two boxes collide in 2D if and only if they intersect along BOTH X and Y axes
        const xOverlap = Math.max(0, Math.min(titleRect.right, badgesRect.right) - Math.max(titleRect.left, badgesRect.left));
        const yOverlap = Math.max(0, Math.min(titleRect.bottom, badgesRect.bottom) - Math.max(titleRect.top, badgesRect.top));
        const is2dColliding = (xOverlap > 0 && yOverlap > 0);

        // Also check h3 vs outcome badge specifically
        const h3xOverlap = Math.max(0, Math.min(h3Rect.right, outcomeRect.right) - Math.max(h3Rect.left, outcomeRect.left));
        const h3yOverlap = Math.max(0, Math.min(h3Rect.bottom, outcomeRect.bottom) - Math.max(h3Rect.top, outcomeRect.top));
        const isH3CollidingWithOutcome = (h3xOverlap > 0 && h3yOverlap > 0);

        // Check if title text is clipped/truncated
        const isTitleClipped = h3El.scrollWidth > h3El.clientWidth + 1;

        // Check badge pair stay strictly together as a pair on their row
        const badgePairDiffY = tierRect ? Math.abs(outcomeRect.top - tierRect.top) : 0;

        // Is wrapped
        const isWrapped = badgesRect.top >= titleRect.bottom - 4;

        return {
          titleRect: { left: titleRect.left, right: titleRect.right, top: titleRect.top, bottom: titleRect.bottom, width: titleRect.width },
          badgesRect: { left: badgesRect.left, right: badgesRect.right, top: badgesRect.top, bottom: badgesRect.bottom, width: badgesRect.width },
          xOverlap,
          yOverlap,
          is2dColliding,
          isH3CollidingWithOutcome,
          isTitleClipped,
          badgePairDiffY,
          isWrapped,
          titleText: h3El.textContent.trim(),
          outcomeText: outcomeEl.textContent.trim(),
        };
      });

      assert(geom !== null, `[R5] Decision card summary elements present at ${vp.width}px (${locale})`);
      assert(
        !geom.is2dColliding && !geom.isH3CollidingWithOutcome,
        `[R5] No 2D intersection between title and badges at ${vp.width}px (${locale}): title "${geom.titleText}" vs outcome "${geom.outcomeText}" (xOverlap: ${geom.xOverlap.toFixed(1)}px, yOverlap: ${geom.yOverlap.toFixed(1)}px)`
      );
      assert(
        !geom.isTitleClipped,
        `[R5] Title text "${geom.titleText}" is NOT clipped at ${vp.width}px (${locale})`
      );
      assert(
        geom.badgePairDiffY <= 2,
        `[R5] Outcome and Tier badges remain strictly together as a pair at ${vp.width}px (${locale}) (Y diff: ${geom.badgePairDiffY.toFixed(1)}px <= 2px)`
      );
      console.log(`  [R5] ${vp.width}px (${locale.toUpperCase()}): 2D collision=NONE, clipped=NO, wrapped=${geom.isWrapped ? 'YES' : 'NO'}, badgePairYDiff=${geom.badgePairDiffY.toFixed(1)}px`);
    }
  }

  // Restore VI locale and default desktop viewport
  await page.evaluate(() => {
    localStorage.setItem('duricare-language', 'vi');
  });
  await page.setViewport({ width: 1440, height: 900 });
  await page.reload({ waitUntil: 'networkidle0' });
  const restoredLang = await page.$eval('html', (el) => el.getAttribute('lang'));
  assert(restoredLang === 'vi', `[R5/R6] Restored document language is "vi" (got "${restoredLang}")`);

  // --- Scenario 17.8 (R4): Network Fail-Closed Verification ---
  console.log('\n--- Scenario 17.8: R4 Fail-Closed Network Protection ---');
  console.log(`  Total unhandled requests intercepted & aborted: ${unhandledRequests.length}`);
  if (unhandledRequests.length > 0) {
    unhandledRequests.forEach((r) => console.error(`    LEAKED: ${r.method} ${r.url}`));
  }
  assert(
    unhandledRequests.length === 0,
    `[R4] Zero unhandled / leaked requests reached network (actual: ${unhandledRequests.length})`
  );

  console.log('\n================================================================');
  console.log(`All ${passed}/${total} assertions PASSED!`);
  console.log('================================================================\n');

  // Write evidence hashes JSON
  const evidenceHashesPath = path.join(
    'E:/CTU/LuanVan/verification/ui-refresh-ctu-source-detail-design-20261116',
    'evidence-hashes.json'
  );
  fs.writeFileSync(evidenceHashesPath, JSON.stringify(capturedHashes, null, 2));
  console.log(`Saved evidence hashes to ${evidenceHashesPath}`);

  const artifactEvidenceHashesPath = path.join(
    ARTIFACT_EVIDENCE_DIR,
    'antigravity-evidence-hashes.json'
  );
  fs.writeFileSync(artifactEvidenceHashesPath, JSON.stringify(capturedHashes, null, 2));
  console.log(`Saved artifact evidence hashes to ${artifactEvidenceHashesPath}`);

} finally {
  await browser.close();
  server.close();
}
