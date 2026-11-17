import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const EVIDENCE_DIR = path.resolve('E:/CTU/LuanVan/verification/ui-refresh-ctu-source-forms-design-20261116/evidence');
const ARTIFACT_EVIDENCE_DIR = path.resolve('C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_EVIDENCE_DIR)) {
  fs.mkdirSync(ARTIFACT_EVIDENCE_DIR, { recursive: true });
}

console.log('================================================================');
console.log('UI-REFRESH-CTU-001 P5 Source Forms & Secondary Surfaces Suite');
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

// ─── [1/3] Static Code & Design Token Assertions ─────────────────────
console.log('[1/3] Static code & design token assertions...');

const editPagePath = path.join(ROOT_DIR, 'src/pages/KnowledgeSourceEditPage.tsx');
const metaFormPath = path.join(ROOT_DIR, 'src/components/knowledge/KnowledgeMetadataForm.tsx');
const chunkEditorPath = path.join(ROOT_DIR, 'src/components/knowledge/KnowledgeChunkEditor.tsx');
const newRevModalPath = path.join(ROOT_DIR, 'src/components/knowledge/KnowledgeNewRevisionModal.tsx');
const publishModalPath = path.join(ROOT_DIR, 'src/components/knowledge/publication/PublishRevisionModal.tsx');
const submitModalPath = path.join(ROOT_DIR, 'src/components/knowledge/KnowledgeSubmitModal.tsx');
const withdrawModalPath = path.join(ROOT_DIR, 'src/components/knowledge/KnowledgeWithdrawModal.tsx');
const revokeModalPath = path.join(ROOT_DIR, 'src/components/knowledge/publication/RevokePublicationModal.tsx');
const retryModalPath = path.join(ROOT_DIR, 'src/components/knowledge/publication/RetryPublicationModal.tsx');
const provenanceModalPath = path.join(ROOT_DIR, 'src/components/knowledge/import/RevisionProvenanceModal.tsx');
const pubDetailModalPath = path.join(ROOT_DIR, 'src/components/knowledge/publication/PublicationDetailModal.tsx');

const editPageContent = fs.readFileSync(editPagePath, 'utf8');
const metaFormContent = fs.readFileSync(metaFormPath, 'utf8');
const chunkEditorContent = fs.readFileSync(chunkEditorPath, 'utf8');
const newRevModalContent = fs.readFileSync(newRevModalPath, 'utf8');
const publishModalContent = fs.readFileSync(publishModalPath, 'utf8');
const submitModalContent = fs.readFileSync(submitModalPath, 'utf8');
const withdrawModalContent = fs.readFileSync(withdrawModalPath, 'utf8');
const revokeModalContent = fs.readFileSync(revokeModalPath, 'utf8');
const retryModalContent = fs.readFileSync(retryModalPath, 'utf8');
const provenanceModalContent = fs.readFileSync(provenanceModalPath, 'utf8');
const pubDetailModalContent = fs.readFileSync(pubDetailModalPath, 'utf8');

assert(
  editPageContent.includes("col-span-12 lg:col-span-8") &&
  editPageContent.includes("col-span-12 lg:col-span-4"),
  '[Scenario SF.1] Edit page implements 12-column responsive layout (8 cols main + 4 cols rail)'
);

assert(
  editPageContent.includes("animate-pulse") &&
  editPageContent.includes("t('Có thay đổi chưa lưu')"),
  '[Scenario SF.2] Edit page has pulsating unsaved changes indicator'
);

assert(
  metaFormContent.includes("t('Thông tin xuất bản & xuất xứ bổ sung')") &&
  metaFormContent.includes("<details"),
  '[Scenario SF.3] Metadata form includes collapsible supplementary provenance disclosure'
);

assert(
  chunkEditorContent.includes("id={`chunk-${idx + 1}`}") &&
  chunkEditorContent.includes("t('Đang biên tập')"),
  '[Scenario SF.4] Chunk editor implements individual chunk cards with anchor IDs and status badges'
);

assert(
  newRevModalContent.includes("w-[520px]") &&
  newRevModalContent.includes("rounded-xl"),
  '[Scenario SF.5] New revision modal conforms to Stitch 520px rounded-xl container'
);

assert(
  (publishModalContent.includes("w-[640px]") || publishModalContent.includes("max-w-[660px]")) &&
  publishModalContent.includes("data-testid=\"confirm-publish-button\""),
  '[Scenario SF.6] Publish modal conforms to Stitch container with testids'
);

assert(
  submitModalContent.includes("max-w-[660px]") &&
  submitModalContent.includes("data-testid=\"confirm-submit-button\""),
  '[Scenario SF.7] Submit modal conforms to Stitch 660px container with testids'
);

assert(
  withdrawModalContent.includes("bg-[#dc2626]") &&
  withdrawModalContent.includes("data-testid=\"confirm-withdraw-button\""),
  '[Scenario SF.8] Withdraw modal implements destructive #dc2626 button styling'
);

assert(
  revokeModalContent.includes("bg-[#dc2626]") &&
  revokeModalContent.includes("data-testid=\"revoke-submit-button\""),
  '[Scenario SF.9] Revoke modal implements destructive #dc2626 button styling'
);

assert(
  retryModalContent.includes("bg-[#1f5ca9]") &&
  retryModalContent.includes("data-testid=\"retry-submit-button\""),
  '[Scenario SF.10] Retry modal implements CTU blue #1f5ca9 button styling'
);

assert(
  provenanceModalContent.includes("picture_as_pdf") &&
  provenanceModalContent.includes("extraction.parser"),
  '[Scenario SF.11] Provenance modal displays PDF metadata and dynamic extraction parser'
);

assert(
  pubDetailModalContent.includes("RunSummary") &&
  pubDetailModalContent.includes("run.status"),
  '[Scenario SF.12] Publication detail modal includes RunSummary dynamic status rendering'
);

// ─── [2/3] Static HTTP Server & Browser Verification ─────────────────
console.log('\n[2/3] Launching Puppeteer suite for live interaction verification...');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, 'http://127.0.0.1');
  let pathname = parsedUrl.pathname;
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const potentialPath = path.join(DIST_DIR, pathname);
  if (fs.existsSync(potentialPath) && fs.statSync(potentialPath).isFile()) {
    return serveStaticFile(res, potentialPath);
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    return serveStaticFile(res, indexPath);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

const PORT = 5197;
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
console.log(`SPA Server listening on http://127.0.0.1:${PORT}`);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
page.on('console', (msg) => console.log('  [BROWSER CONSOLE]', msg.text()));
page.on('pageerror', (err) => console.error('  [BROWSER ERROR]', err.message));
page.on('dialog', async (dialog) => {
  console.log(`  [BROWSER DIALOG] ${dialog.type()}: ${dialog.message()}`);
  await dialog.accept();
});
await page.setRequestInterception(true);

await page.evaluateOnNewDocument(() => {
  localStorage.setItem('duricare_auth_token', 'mock-token-admin');
  localStorage.setItem('duricare-language', 'vi');
  localStorage.setItem('theme', 'light');
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-XSRF-TOKEN',
};

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
      content: 'Cần ghi chép rõ ràng nguồn nước tưới trước khi cấp vào hệ thống tưới tự động.',
      originalExcerpt: 'Trạm cấp nước phải ghi sổ nhật ký đo độ dẫn điện EC và độ pH 2 lần/tháng.',
      applicabilityNotes: 'Áp dụng cho hệ thống tưới nhỏ giọt và béc quay.',
      measurementNotes: 'Đo bằng bút đo EC cầm tay.',
    },
    {
      chunkId: 'chk-02',
      position: 1,
      title: 'Quản lý lượng nước tưới',
      topic: 'IRRIGATION',
      stage: 'KIEN_THIET_CO_BAN',
      locator: 'Mục 1.6.2 · Trang 24–25',
      content: 'Trong giai đoạn kiến thiết cơ bản, duy trì độ ẩm đất từ 65% đến 75%.',
      originalExcerpt: 'Lượng nước tưới mỗi gốc định mức 20-30 lít/lần trong mùa khô.',
      applicabilityNotes: 'Đất phù sa ven sông.',
      measurementNotes: 'Cảm biến đo độ ẩm đất tầng 20cm.',
    },
    {
      chunkId: 'chk-03',
      position: 2,
      title: 'Theo dõi sau tưới',
      topic: 'IRRIGATION',
      stage: null,
      locator: 'Mục 1.6.3 · Trang 25',
      content: 'Kiểm tra độ ẩm đất sau 2 giờ tưới để đánh giá khả năng thẩm thấu.',
      originalExcerpt: 'Quan sát vùng rễ tích cực để điều chỉnh thời gian cấp nước.',
      applicabilityNotes: 'Mọi loại đất vườn.',
      measurementNotes: 'Kiểm tra độ ngập úng mặt luống.',
    },
  ],
  decision: {
    outcome: 'APPROVED',
    assessedTier: 'A',
    decidedAt: '2026-11-16T16:30:00Z',
    reviewerUserId: 101,
    overallReview: 'Đã đối chiếu nội dung và phạm vi áp dụng. Phù hợp hướng dẫn kỹ thuật.',
  },
};

const mockSource = {
  id: 'src-ctu-01',
  code: 'DURI-KB-089',
  title: 'Nguồn nước và tưới nước cho sầu riêng',
  ownerUserId: 10,
  ownerDisplayName: 'Quản trị viên CTU',
  createdAt: '2026-11-10T08:00:00Z',
  updatedAt: '2026-11-16T09:30:00Z',
  version: 2,
  latestRevisionId: 'rev-ctu-01-1',
  latestRevision: mockRevision1,
  revisions: [
    {
      id: 'rev-ctu-01-1',
      revisionNumber: 1,
      status: 'APPROVED',
      version: 1,
      createdAt: '2026-11-10T08:00:00Z',
    },
    {
      id: 'rev-ctu-01-draft',
      revisionNumber: 2,
      status: 'DRAFT',
      version: 1,
      createdAt: '2026-11-16T10:00:00Z',
    },
  ],
};

const mockDraftRevision = {
  ...mockRevision1,
  id: 'rev-ctu-01-draft',
  revisionNumber: 2,
  status: 'DRAFT',
  version: 1,
  decision: null,
};

const mockHead = {
  sourceId: 'src-ctu-01',
  version: 1,
  generation: 1,
  activePublicationId: null,
  pendingPublicationId: null,
  updatedAt: '2026-11-16T10:00:00Z',
};

const mockActiveHead = {
  sourceId: 'src-ctu-01',
  version: 2,
  generation: 1,
  activePublicationId: 'pub-ctu-001',
  pendingPublicationId: null,
  updatedAt: '2026-11-16T10:15:00Z',
};

const mockPublicationDetail = {
  publication: {
    id: 'pub-ctu-001',
    sourceId: 'src-ctu-01',
    revisionId: 'rev-ctu-01-1',
    revisionNumber: 1,
    generation: 1,
    status: 'ACTIVE',
    sourceTitle: 'Nguồn nước và tưới nước cho sầu riêng',
    assessedTier: 'A',
    chunkCount: 3,
    manifestHash: 'd8e2f1a6c0b395e841276aef0192bc54a7d3',
    createdAt: '2026-11-16T10:15:00Z',
    activatedAt: '2026-11-16T10:16:00Z',
    revokedAt: null,
    latestJobId: 'job-001',
  },
  manifest: {
    sourceId: 'src-ctu-01',
    revisionId: 'rev-ctu-01-1',
    revisionNumber: 1,
    sourceTitle: 'Nguồn nước và tưới nước cho sầu riêng',
    sourceUrl: 'https://khuyennong.gov.vn/sau-rieng/tuoi-nuoc',
    year: 2024,
    edition: 'Tái bản lần 1',
    assessedTier: 'A',
    tierPolicyVersion: 'DURI-1B-v1',
    chunks: [
      {
        chunkId: 'chk-01',
        position: 0,
        chunkTitle: 'Nguồn nước tưới',
        topic: 'IRRIGATION',
        stage: null,
        locator: 'Mục 1.6.1 · Trang 24',
        content: 'Cần ghi chép rõ ràng nguồn nước tưới trước khi cấp vào hệ thống.',
      },
    ],
  },
  head: mockActiveHead,
  fingerprint: {
    projectionVersion: 1,
    embeddingModelId: 'text-embedding-3-large',
    embeddingModelRevision: 'v1',
    dimension: 3072,
    distance: 'COSINE',
    collection: 'duricare_kb_production',
  },
  jobs: {
    content: [
      {
        id: 'job-001',
        publicationId: 'pub-ctu-001',
        kind: 'INDEX',
        status: 'SUCCEEDED',
        phase: 'ACTIVATE',
        claimCount: 1,
        maxClaims: 5,
        nextAttemptAt: null,
        createdAt: '2026-11-16T10:15:00Z',
        updatedAt: '2026-11-16T10:16:00Z',
        errorCode: null,
      },
    ],
  },
};

const mockJobDetail = {
  job: mockPublicationDetail.jobs.content[0],
  runs: {
    content: [
      {
        id: 'run-001',
        jobId: 'job-001',
        fence: 1,
        status: 'VERIFIED',
        startedAt: '2026-11-16T10:15:00Z',
        finishedAt: '2026-11-16T10:16:00Z',
        expectedPoints: 3,
        verifiedPoints: 3,
        errorCode: null,
      },
      {
        id: 'run-002',
        jobId: 'job-001',
        fence: 2,
        status: 'FAILED',
        startedAt: '2026-11-16T10:20:00Z',
        finishedAt: '2026-11-16T10:21:00Z',
        expectedPoints: 3,
        verifiedPoints: 0,
        errorCode: 'VECTOR_UNAVAILABLE',
      },
    ],
  },
};

const mockProvenance = {
  origin: 'IMPORTED',
  status: 'CURRENT',
  revisionId: 'rev-ctu-01-1',
  document: {
    id: 'doc-uuid-11223344',
    importId: 'import-sess-8899aabb-1122',
    sourceId: 'src-ctu-01',
    createdAt: '2026-11-10T11:00:00Z',
    file: {
      displayName: 'tai-lieu-tuoi-sau-rieng-ctu-2024.pdf',
      mediaType: 'application/pdf',
      bytes: 5054136,
      sha256: '4f9d2a8b3e7c109d6f5a4e3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a',
    },
    extraction: {
      parser: 'PDFBox',
      parserVersion: '3.0.1',
      normalization: 'DURI-IMPORT-TEXT-1',
      text: 'QUY TRÌNH KỸ THUẬT QUẢN LÝ NƯỚC...',
      textSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
  },
  snapshot: {
    savedAt: '2026-11-16T08:30:00Z',
    omittedUtf16Units: 0,
    metadataSha256: 'meta-hash-12345',
    chunksSha256: 'chunks-hash-12345',
    chunks: [
      {
        chunkId: 'chk-01',
        locator: 'Mục 1.6.1 · Trang 24',
        locatorStatus: 'VERIFIED',
        selectedSpans: [{ start: 0, end: 100 }],
      },
      {
        chunkId: 'chk-02',
        locator: 'Mục 1.6.2 · Trang 24–25',
        locatorStatus: 'NORMALIZED',
        selectedSpans: [{ start: 100, end: 200 }],
      },
      {
        chunkId: 'chk-03',
        locator: 'Mục 1.6.3 · Trang 25',
        locatorStatus: 'VERIFIED',
        selectedSpans: [{ start: 200, end: 300 }],
      },
    ],
  },
  lineage: [],
};

let currentAuthUser = {
  id: 10,
  email: 'admin@duricare.ctu.vn',
  role: 'ADMIN',
  farmId: 1,
  fullName: 'Quản trị viên CTU',
};

let currentHeadFixture = mockHead;
let currentSourceFixture = mockSource;
let currentRevisionFixture = mockRevision1;

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

  // Auth endpoints
  if (url.includes('/auth/refresh')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token',
        user: currentAuthUser,
      }),
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
      body: JSON.stringify({ userId: currentAuthUser.id, verificationStatus: 'VERIFIED', fullName: currentAuthUser.fullName }),
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
      body: JSON.stringify({ farmName: 'Vườn sầu riêng TEST', generatedAt: new Date().toISOString(), totalUnresolvedAlerts: 0, zones: [] }),
    });
  }

  if (url.includes('/alerts')) {
    return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: '[]' });
  }

  if (url.includes('/zones')) {
    return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: '[]' });
  }

  if (url.includes('/trees')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Cây sầu riêng Ri6 #01', zoneId: 1 }]),
    });
  }

  // Publication head endpoint
  if (url.includes('/publication-head')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(currentHeadFixture),
    });
  }

  // Publication jobs
  if (url.includes('/admin/knowledge/publications/pub-ctu-001/jobs')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockPublicationDetail.jobs),
    });
  }

  // Publication details endpoint
  if (url.includes('/admin/knowledge/publications/')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockPublicationDetail),
    });
  }

  // Job detail
  if (url.includes('/publication-jobs/') || url.includes('/admin/knowledge/jobs/')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockJobDetail),
    });
  }

  // Provenance endpoints
  if (url.includes('/import-provenance')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockProvenance),
    });
  }

  if (url.includes('/provenance')) {
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

  // History & audit
  if (url.includes('/history') || url.includes('/audit-events')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({ content: [] }),
    });
  }

  // Revision endpoints
  if (url.includes('/knowledge/revisions/rev-ctu-01-draft')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockDraftRevision),
    });
  }

  if (url.includes('/knowledge/revisions/rev-ctu-01-1')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(currentRevisionFixture),
    });
  }

  if (url.includes('/knowledge/sources/src-ctu-01/revisions')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [currentRevisionFixture, mockDraftRevision],
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
      }),
    });
  }

  // Source endpoint
  if (url.includes('/knowledge/sources/src-ctu-01')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(currentSourceFixture),
    });
  }

  console.log(`  [MOCK PASSTHROUGH 200] ${method} ${url}`);
  return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: '{}' });
});


// ─── Scenario SF1: Publish Revision Modal (Desktop & Mobile) ─────────
console.log('\n--- Scenario SF1: Publish Revision Modal ---');
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, { waitUntil: 'networkidle0' });

await page.waitForSelector('[data-testid="open-publish-modal-button"]');
await page.click('[data-testid="open-publish-modal-button"]');
await page.waitForSelector('[data-testid="publish-revision-modal"]');

const pubModalTitle = await page.$eval('[data-testid="publish-revision-modal"] h2', (el) => el.textContent);
assert(pubModalTitle.includes('Xuất bản tri thức vào RAG'), 'Publish modal displays approved title');

const pubCloseBtnRect = await page.$eval('[data-testid="close-publish-modal-button"]', (el) => {
  const r = el.getBoundingClientRect();
  return { width: r.width, height: r.height };
});
assert(pubCloseBtnRect.height === 44, `Publish close button meets 44px tap target (got ${pubCloseBtnRect.height}px)`);

const pubConfirmBtnRect = await page.$eval('[data-testid="confirm-publish-button"]', (el) => {
  const r = el.getBoundingClientRect();
  return { width: r.width, height: r.height };
});
assert(pubConfirmBtnRect.height === 44, `Publish confirm button meets 44px height (got ${pubConfirmBtnRect.height}px)`);

// Verify consent disclosure text typography is 14px (text-sm)
const consentFontSize = await page.$eval('[data-testid="publish-disclosure-checkbox"] ~ span', (el) => {
  return window.getComputedStyle(el).fontSize;
});
assert(consentFontSize === '14px', `Consent text meets 14px body typography requirement (got ${consentFontSize})`);

await captureEvidence(page, 'fe_source_forms_01_publish_modal_desktop.png');

// Mobile view of publish modal (390x844)
await page.setViewport({ width: 390, height: 844 });
await new Promise((r) => setTimeout(r, 200));

// Hit-testing at 90% of confirm button height on mobile (390x844)
const hitTag390 = await page.evaluate(() => {
  const btn = document.querySelector('[data-testid="confirm-publish-button"]');
  if (!btn) return 'NOT_FOUND';
  const rect = btn.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height * 0.9;
  const el = document.elementFromPoint(x, y);
  return el ? el.tagName.toLowerCase() : 'NONE';
});
assert(
  hitTag390 === 'button' || hitTag390 === 'span',
  `Confirm publish button receives hit at 90% height on 390x844 viewport without navigation collision (got ${hitTag390})`
);

await captureEvidence(page, 'fe_source_forms_02_publish_modal_mobile.png');

// Mobile view of publish modal (375x667 short viewport)
await page.setViewport({ width: 375, height: 667 });
await new Promise((r) => setTimeout(r, 200));

const hitTag375 = await page.evaluate(() => {
  const btn = document.querySelector('[data-testid="confirm-publish-button"]');
  if (!btn) return 'NOT_FOUND';
  const rect = btn.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height * 0.9;
  const el = document.elementFromPoint(x, y);
  return el ? el.tagName.toLowerCase() : 'NONE';
});
assert(
  hitTag375 === 'button' || hitTag375 === 'span',
  `Confirm publish button receives hit at 90% height on 375x667 viewport without navigation collision (got ${hitTag375})`
);

await page.click('[data-testid="close-publish-modal-button"]');
await new Promise((r) => setTimeout(r, 200));

// ─── Scenario SF2: New Revision Modal (Desktop & Mobile) ─────────────
console.log('\n--- Scenario SF2: New Revision Modal ---');
await page.setViewport({ width: 1440, height: 900 });
await new Promise((r) => setTimeout(r, 300));
await page.waitForSelector('[data-testid="create-subsequent-revision-button"]', { visible: true });
await page.click('[data-testid="create-subsequent-revision-button"]');
await page.waitForSelector('[data-testid="new-revision-modal"]');

const newRevTitle = await page.$eval('[data-testid="new-revision-modal"] h2', (el) => el.textContent);
assert(newRevTitle.includes('Tạo phiên bản tiếp theo'), 'New revision modal displays approved title');

const newRevCloseRect = await page.$eval('[data-testid="close-new-rev-modal-button"]', (el) => {
  const r = el.getBoundingClientRect();
  return { width: r.width, height: r.height };
});
assert(newRevCloseRect.height === 44, `New revision close button meets 44px target (got ${newRevCloseRect.height}px)`);

const newRevConfirmRect = await page.$eval('[data-testid="confirm-new-revision-button"]', (el) => {
  const r = el.getBoundingClientRect();
  return { width: r.width, height: r.height };
});
assert(newRevConfirmRect.height === 44, `New revision confirm button meets 44px height (got ${newRevConfirmRect.height}px)`);

await captureEvidence(page, 'fe_source_forms_03_new_revision_modal_desktop.png');

await page.setViewport({ width: 390, height: 844 });
await new Promise((r) => setTimeout(r, 200));
await captureEvidence(page, 'fe_source_forms_04_new_revision_modal_mobile.png');

await page.click('[data-testid="close-new-rev-modal-button"]');
await new Promise((r) => setTimeout(r, 200));

// ─── Scenario SF3: Draft Editor (Desktop & Mobile) ───────────────────
console.log('\n--- Scenario SF3: Draft Editor Page ---');
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01/revisions/rev-ctu-01-draft/edit?farmId=1`, {
  waitUntil: 'networkidle0',
});

await page.waitForSelector('h1');
const editPageH1 = await page.$eval('h1', (el) => el.textContent);
assert(editPageH1.includes('Chỉnh sửa bản nháp'), 'Draft editor renders H1 Chỉnh sửa bản nháp');

// Verify title input exists with initial value
const titleInputVal = await page.$eval('#meta-title', (el) => el.value);
assert(titleInputVal.includes('Nguồn nước và tưới nước cho sầu riêng'), 'Title input loaded initial value');

// Verify initial not dirty
const initialDirtyIndicator = await page.$('text=Có thay đổi chưa lưu');
assert(initialDirtyIndicator === null, 'Initial form does not show dirty indicator');

// Type into title to trigger dirty state
await page.type('#meta-title', ' bổ sung');
await new Promise((r) => setTimeout(r, 100));

const dirtyText = await page.evaluate(() => document.body.innerText);
assert(dirtyText.includes('Có thay đổi chưa lưu'), 'Typing in form shows pulsating "Có thay đổi chưa lưu" indicator');

// Verify right rail cards
assert(dirtyText.includes('Tổng quan bản nháp'), 'Right rail renders Tổng quan bản nháp card');
assert(dirtyText.includes('Mục lục đoạn trích'), 'Right rail renders Mục lục đoạn trích card');

// Verify draft inheritance truthfulness (F2)
const inheritanceText = await page.$eval('[data-testid="draft-inheritance-status"]', (el) => el.textContent.trim());
assert(inheritanceText === 'Từ Bản 1', `Draft revision 2 displays neutral predecessor lineage "Từ Bản 1" without claiming false approval (got "${inheritanceText}")`);
const hasApprovedBadge = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="draft-inheritance-status"]');
  if (!el || !el.parentElement) return false;
  return el.parentElement.textContent.includes('Đã duyệt');
});
assert(!hasApprovedBadge, 'Draft editor does not falsely claim predecessor was approved');

// Verify chunk cards with anchor IDs
const chunk1Exists = await page.$('#chunk-1');
assert(chunk1Exists !== null, 'Chunk 1 has anchor ID #chunk-1');

// Verify chunk control buttons meet 44px tap target (F5)
const chunkBtnDimensions = await page.$eval('#chunk-1 button[title="Di chuyển lên"]', (el) => {
  const r = el.getBoundingClientRect();
  return { width: r.width, height: r.height };
});
assert(chunkBtnDimensions.height >= 44 && chunkBtnDimensions.width >= 44, `Chunk control button meets 44px tap target (got ${chunkBtnDimensions.width}x${chunkBtnDimensions.height}px)`);

// Verify accordion behavior: Chunk 1 is expanded, Chunk 2 is collapsed by default (F5)
const chunk2ExpandedField = await page.$('#chunk-title-1');
assert(chunk2ExpandedField === null, 'Chunk 2 is collapsed by default and title input is not rendered');

// Expand chunk 2
const chunk2EditBtn = await page.$('#chunk-2 button[title="Mở rộng để chỉnh sửa"]');
assert(chunk2EditBtn !== null, 'Chunk 2 renders edit/expand button');
await chunk2EditBtn.click();
await new Promise((r) => setTimeout(r, 100));

const chunk2ExpandedFieldAfter = await page.$('#chunk-title-1');
assert(chunk2ExpandedFieldAfter !== null, 'Clicking edit button on Chunk 2 expands it and reveals form fields');

// Verify badge retains whitespace-nowrap preventing multi-line wrapping (F5)
const badgeWhiteSpace = await page.$eval('#chunk-1 span.whitespace-nowrap', (el) => {
  return window.getComputedStyle(el).whiteSpace;
});
assert(badgeWhiteSpace === 'nowrap', 'Badge retains whitespace-nowrap preventing multi-line text wrapping on long title');

await captureEvidence(page, 'fe_source_forms_05_draft_editor_desktop_1440.png');

// Desktop 1280
await page.setViewport({ width: 1280, height: 800 });
await new Promise((r) => setTimeout(r, 200));
await captureEvidence(page, 'fe_source_forms_06_draft_editor_desktop_1280.png');

// Mobile 390
await page.setViewport({ width: 390, height: 844 });
await new Promise((r) => setTimeout(r, 200));
await captureEvidence(page, 'fe_source_forms_07_draft_editor_mobile_390.png');

// Mobile 375
await page.setViewport({ width: 375, height: 667 });
await new Promise((r) => setTimeout(r, 200));
await captureEvidence(page, 'fe_source_forms_08_draft_editor_mobile_375.png');

await page.evaluate(() => {
  window.onbeforeunload = null;
});

// ─── Scenario SF4: Provenance Modal (Specimen E) ─────────────────────
console.log('\n--- Scenario SF4: Provenance Modal (Specimen E) ---');
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, { waitUntil: 'networkidle0' });

await page.waitForSelector('[data-testid="view-provenance-button"]');
await page.click('[data-testid="view-provenance-button"]');
await page.waitForSelector('[data-testid="revision-provenance-modal"]');

const provModalText = await page.$eval('[data-testid="revision-provenance-modal"]', (el) => el.textContent);
assert(provModalText.includes('Nguồn gốc & Truy nguyên tệp gốc'), 'Provenance modal has approved title');
assert(provModalText.includes('PDFBox'), 'Provenance modal displays PDFBox extraction info');
assert(provModalText.includes('tai-lieu-tuoi-sau-rieng-ctu-2024.pdf'), 'Provenance modal displays file name');

const storageText = await page.$eval('[data-testid="provenance-storage-mechanism"]', (el) => el.textContent.trim());
assert(storageText === 'Bản chụp tham chiếu hiện hành', `Provenance modal displays truthful storage label (got "${storageText}")`);

await captureEvidence(page, 'fe_source_forms_09_provenance_modal_desktop.png');
await page.click('[data-testid="close-provenance-modal-button"]');
await new Promise((r) => setTimeout(r, 200));

// ─── Scenario SF5: Publication Detail Modal (Specimen F) ─────────────
console.log('\n--- Scenario SF5: Publication Detail Modal (Specimen F) ---');
// Switch to active publication head
currentHeadFixture = mockActiveHead;
await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, { waitUntil: 'networkidle0' });

await page.waitForSelector('[data-testid="inspect-active-pub-button"]');
await page.click('[data-testid="inspect-active-pub-button"]');
await page.waitForSelector('[data-testid="publication-detail-modal"]');
await page.waitForSelector('.animate-spin', { hidden: true });

const pubDetailText = await page.$eval('[data-testid="publication-detail-modal"]', (el) => el.textContent);
assert(pubDetailText.includes('Chi tiết xuất bản vào RAG'), 'Publication detail modal has approved title');
assert(pubDetailText.includes('Tác vụ xử lý (Jobs)'), 'Modal has tab Tác vụ xử lý (Jobs)');

// Click "Xem chi tiết tác vụ & thông số chạy" on Jobs tab (default tab)
await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button'));
  const runBtn = buttons.find((b) => b.textContent?.includes('Xem chi tiết tác vụ'));
  if (runBtn) runBtn.click();
});
await page.waitForSelector('.animate-spin', { hidden: true });
await new Promise((r) => setTimeout(r, 200));

const jobsTabText = await page.$eval('[data-testid="publication-detail-modal"]', (el) => el.textContent);
assert(jobsTabText.includes('RunSummary'), 'Diagnostics block displays RunSummary');

const failedRunBadge = await page.$eval('[data-testid="run-status-badge-run-002"]', (el) => el.textContent.trim());
assert(failedRunBadge === 'FAILED', `Failed run correctly displays FAILED badge instead of falsely VERIFIED (got "${failedRunBadge}")`);

const verifiedRunBadge = await page.$eval('[data-testid="run-status-badge-run-001"]', (el) => el.textContent.trim());
assert(verifiedRunBadge === 'VERIFIED', `Verified run correctly displays VERIFIED badge (got "${verifiedRunBadge}")`);

// Switch to Manifest tab and check Vector Fingerprint
await page.click('[data-testid="detail-tab-manifest"]');
await new Promise((r) => setTimeout(r, 200));

const manifestTabText = await page.$eval('[data-testid="publication-detail-modal"]', (el) => el.textContent);
assert(manifestTabText.includes('3072') && manifestTabText.includes('COSINE'), 'Manifest tab shows 3072 dimension and COSINE distance');

await captureEvidence(page, 'fe_source_forms_10_pub_detail_modal_desktop.png');
await page.click('[data-testid="close-publication-detail-modal-button"]');
await new Promise((r) => setTimeout(r, 200));

// ─── Scenario SF6: Revoke Publication Modal (Specimen C) ─────────────
console.log('\n--- Scenario SF6: Revoke Publication Modal (Specimen C) ---');
await page.waitForSelector('[data-testid="revoke-active-pub-button"]');
await page.click('[data-testid="revoke-active-pub-button"]');
await page.waitForSelector('[data-testid="revoke-publication-modal"]');

const revokeModalText = await page.$eval('[data-testid="revoke-publication-modal"]', (el) => el.textContent);
assert(revokeModalText.includes('Thu hồi tri thức khỏi hệ thống RAG'), 'Revoke modal has approved title');
assert(revokeModalText.includes('Lý do thu hồi tri thức'), 'Revoke modal has reason field');

await captureEvidence(page, 'fe_source_forms_11_revoke_modal_desktop.png');
await page.click('[data-testid="close-revoke-modal-button"]');
await new Promise((r) => setTimeout(r, 200));

// ─── Scenario SF7: Submit Modal (Specimen A) ─────────────────────────
console.log('\n--- Scenario SF7: Submit Modal (Specimen A) ---');
currentHeadFixture = mockHead;
currentRevisionFixture = {
  ...mockDraftRevision,
  status: 'DRAFT',
};
currentSourceFixture = {
  ...mockSource,
  latestRevision: currentRevisionFixture,
};

await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, { waitUntil: 'networkidle0' });
await page.waitForSelector('[data-testid="submit-for-review-button"]');
await page.click('[data-testid="submit-for-review-button"]');
await page.waitForSelector('[data-testid="submit-revision-modal"]');

const submitModalText = await page.$eval('[data-testid="submit-revision-modal"]', (el) => el.textContent);
assert(submitModalText.includes('Gửi yêu cầu thẩm định'), 'Submit modal has approved title');
assert(submitModalText.includes('fact_check') || submitModalText.includes('Kiểm tra trước khi gửi'), 'Submit modal has preflight checklist');

const preflightLocatorText = await page.$eval('[data-testid="preflight-locator-status"]', (el) => el.textContent.trim());
assert(preflightLocatorText.includes('Đã điền thông tin vị trí trích dẫn'), 'Preflight checklist truthfully asserts filled locators rather than claiming false document verification');

await captureEvidence(page, 'fe_source_forms_12_submit_modal_desktop.png');
await page.click('[data-testid="close-submit-modal-button"]');
await new Promise((r) => setTimeout(r, 200));

// ─── Scenario SF8: Withdraw Modal (Specimen B) ───────────────────────
console.log('\n--- Scenario SF8: Withdraw Modal (Specimen B) ---');
currentRevisionFixture = {
  ...mockDraftRevision,
  status: 'SUBMITTED',
};
currentSourceFixture = {
  ...mockSource,
  latestRevision: currentRevisionFixture,
};

await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources/src-ctu-01?farmId=1`, { waitUntil: 'networkidle0' });
await page.waitForSelector('[data-testid="withdraw-button"]');
await page.click('[data-testid="withdraw-button"]');
await page.waitForSelector('[data-testid="withdraw-revision-modal"]');

const withdrawModalText = await page.$eval('[data-testid="withdraw-revision-modal"]', (el) => el.textContent);
assert(withdrawModalText.includes('Rút hồ sơ thẩm định'), 'Withdraw modal has approved title');
assert(withdrawModalText.includes('Lý do rút hồ sơ'), 'Withdraw modal has reason field');

await captureEvidence(page, 'fe_source_forms_13_withdraw_modal_desktop.png');
await page.click('[data-testid="close-withdraw-modal-button"]');
await new Promise((r) => setTimeout(r, 200));

await browser.close();
server.close();

console.log('\n================================================================');
console.log(`All ${passed}/${total} assertions PASSED!`);
console.log('================================================================\n');

// Write evidence hashes to verification folder and brain
const hashesPath = path.join(EVIDENCE_DIR, 'source-forms-evidence-hashes.json');
fs.writeFileSync(hashesPath, JSON.stringify(capturedHashes, null, 2), 'utf8');

const artifactHashesPath = path.join(ARTIFACT_EVIDENCE_DIR, 'source-forms-evidence-hashes.json');
fs.writeFileSync(artifactHashesPath, JSON.stringify(capturedHashes, null, 2), 'utf8');
console.log(`Saved evidence hashes to ${hashesPath}`);
console.log(`Saved artifact evidence hashes to ${artifactHashesPath}`);
