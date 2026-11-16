import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer';

const ROOT_DIR = path.resolve('E:/CTU/LuanVan/duricare-worktrees/fe-ui-refresh-ctu-007');
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
      id: 101,
      sourceId: 'src-ctu-01',
      revisionId: 'rev-ctu-01-1',
      actorUserId: 10,
      actorDisplayName: 'Quản trị viên CTU',
      action: 'APPROVE',
      fromStatus: 'IN_REVIEW',
      toStatus: 'APPROVED',
      notes: 'Thẩm định hoàn tất đạt yêu cầu',
      createdAt: '2026-11-16T09:30:00Z',
    },
    {
      id: 100,
      sourceId: 'src-ctu-01',
      revisionId: 'rev-ctu-01-1',
      actorUserId: 10,
      actorDisplayName: 'Quản trị viên CTU',
      action: 'SUBMIT',
      fromStatus: 'DRAFT',
      toStatus: 'SUBMITTED',
      notes: 'Gửi thẩm định chuyên môn',
      createdAt: '2026-11-14T08:00:00Z',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 2,
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

page.on('request', (req) => {
  const url = req.url();
  const method = req.method();

  if (req.resourceType() === 'document' || req.resourceType() === 'script' || req.resourceType() === 'stylesheet') {
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
      body: JSON.stringify({
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

  if (url.includes('/api/')) {
    console.log('  [UNHANDLED API REQUEST]', method, url);
  }

  req.continue();
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

  // Scenario 9: Audit History Tab Interaction
  console.log('\n--- Scenario 9: Audit History Tab Interaction ---');
  await page.waitForSelector('[data-testid="tab-history"]');
  await page.click('[data-testid="tab-history"]');
  await page.waitForSelector('table', { timeout: 5000 });
  const tableRows = await page.$$('table tbody tr');
  assert(tableRows.length >= 2, `History table rendered ${tableRows.length} audit events`);

  // Switch back to Chunks tab
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
