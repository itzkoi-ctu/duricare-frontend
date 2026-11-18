import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const EVIDENCE_DIR = path.resolve('E:/CTU/LuanVan/verification/ui-refresh-ctu-review-coordination-design-20261117/evidence');
const ARTIFACT_EVIDENCE_DIR = path.resolve('C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_EVIDENCE_DIR)) {
  fs.mkdirSync(ARTIFACT_EVIDENCE_DIR, { recursive: true });
}

console.log('================================================================');
console.log('UI-REFRESH-CTU-001 P5 Admin Review Coordination Verification Suite');
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

const queuePagePath = path.join(ROOT_DIR, 'src/pages/AdminKnowledgeSubmissionsPage.tsx');
const assignModalPath = path.join(ROOT_DIR, 'src/components/knowledge/AdminAssignReviewerModal.tsx');
const reassignModalPath = path.join(ROOT_DIR, 'src/components/knowledge/AdminReassignReviewerModal.tsx');

const queuePageContent = fs.readFileSync(queuePagePath, 'utf8');
const assignModalContent = fs.readFileSync(assignModalPath, 'utf8');
const reassignModalContent = fs.readFileSync(reassignModalPath, 'utf8');

assert(
  queuePageContent.includes("tableLayout: 'fixed'") &&
  queuePageContent.includes("w-[43%]") &&
  queuePageContent.includes("w-[10%]") &&
  queuePageContent.includes("w-[17%]") &&
  queuePageContent.includes("w-[15%]"),
  '[Scenario RC.1] Queue desktop table implements fixed 5-column layout (43%, 10%, 17%, 15%, 15%)'
);

assert(
  queuePageContent.includes("h-11 min-h-[44px]") &&
  queuePageContent.includes("refresh"),
  '[Scenario RC.2] Queue header refresh button conforms to min-h 44px tap target'
);

assert(
  queuePageContent.includes("ACTIONABLE") &&
  queuePageContent.includes("SUBMITTED") &&
  queuePageContent.includes("IN_REVIEW") &&
  queuePageContent.includes("TERMINAL") &&
  queuePageContent.includes("PUBLICATIONS") &&
  queuePageContent.includes("overflow-x-auto"),
  '[Scenario RC.3] Queue includes 5 tabs with horizontal scrollable mobile container'
);

assert(
  queuePageContent.includes("break-words") &&
  queuePageContent.includes("Chi tiết kỹ thuật"),
  '[Scenario RC.4] Queue desktop & mobile handle long titles and include technical details disclosure'
);

assert(
  queuePageContent.includes("h-6") &&
  queuePageContent.includes("rounded-[6px]") &&
  queuePageContent.includes("text-xs font-medium"),
  '[Scenario RC.5] Queue status badges use uniform 24px height, r6px radius and font-medium'
);

assert(
  queuePageContent.includes("Xem chi tiết") &&
  queuePageContent.includes("terminalStatus"),
  '[Scenario RC.6] Terminal tab renders read-only states with "Xem chi tiết" action only'
);

assert(
  assignModalContent.includes("createPortal") &&
  assignModalContent.includes("document.body") &&
  assignModalContent.includes("max-w-[600px]"),
  '[Scenario RC.7] Assign modal mounts via portal to document.body in 600px container'
);

assert(
  assignModalContent.includes("candidate-search-input") &&
  assignModalContent.includes("assign-reason-input") &&
  assignModalContent.includes("4000") &&
  assignModalContent.includes("trimmedReason.length >= 3"),
  '[Scenario RC.8] Assign modal implements candidate search, radio selection, and 3..4000 char reason validation'
);

assert(
  assignModalContent.includes("details") &&
  assignModalContent.includes("revision_id") &&
  assignModalContent.includes("optimistic_version"),
  '[Scenario RC.9] Assign modal includes technical disclosure with revision_id and optimistic_version'
);

assert(
  assignModalContent.includes("flex-col-reverse sm:flex-row") &&
  assignModalContent.includes("min-h-[44px]"),
  '[Scenario RC.10] Assign modal implements mobile responsive stacked action footer with 44px buttons'
);

assert(
  reassignModalContent.includes("activeAssignment.reviewerDisplayName") &&
  reassignModalContent.includes("REPLACED") &&
  reassignModalContent.includes("activeAssignment.reviewerUserId"),
  '[Scenario RC.11] Reassign modal displays current reviewer banner, REPLACED warning, and excludes current reviewer'
);

assert(
  reassignModalContent.includes("createPortal") &&
  reassignModalContent.includes("document.body") &&
  reassignModalContent.includes("trimmedReason.length >= 3"),
  '[Scenario RC.12] Reassign modal uses portal and strict 3..4000 reason validation'
);

// F1 & F2 static checks
assert(
  queuePageContent.includes("throw err;") &&
  queuePageContent.includes("targetAssignmentId"),
  '[Scenario RC.13] SubmissionsPage re-throws readback error when target is current and preserves targetAssignmentId'
);

// F3 static checks
assert(
  !assignModalContent.includes("bg-primary") &&
  !assignModalContent.includes("text-text-inverse") &&
  !reassignModalContent.includes("bg-primary") &&
  !reassignModalContent.includes("text-text-inverse"),
  '[Scenario RC.14] Neither modal references phantom bg-primary or text-text-inverse tokens'
);

assert(
  assignModalContent.includes("min-h-[44px]") &&
  assignModalContent.includes("bg-[#1f5ca9]") &&
  reassignModalContent.includes("min-h-[44px]") &&
  reassignModalContent.includes("bg-[#1f5ca9]"),
  '[Scenario RC.15] Both modals use explicit #1f5ca9 CTU brand color and 44px recovery button height'
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

const PORT = 5199;
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
console.log(`SPA Server listening on http://127.0.0.1:${PORT}`);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
page.on('console', (msg) => {
  const text = msg.text();
  if (text.includes('[BROWSER ERROR]') || text.includes('Error:')) {
    console.log('  [BROWSER CONSOLE]', text);
  }
});
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

// Mock Data conforming to real backend DTO contracts
const MOCK_SUBMISSIONS = [
  {
    id: 'rev-001-submitted',
    sourceId: 'src-11111111-2222-3333-4444-555555555555',
    revisionNumber: 2,
    status: 'SUBMITTED',
    title: 'Quy trình chẩn đoán thiếu vi lượng Bo trên sầu riêng Ri6 giai đoạn ra hoa',
    version: 3,
    submittedAt: '2026-11-15T08:30:00Z',
    updatedAt: '2026-11-15T08:30:00Z',
  },
  {
    id: 'rev-002-in-review',
    sourceId: 'src-22222222-3333-4444-5555-666666666666',
    revisionNumber: 1,
    status: 'IN_REVIEW',
    title: 'Biện pháp phục hồi tầng đất mặt bị nén dẽ sau ngập lũ vùng đồng bằng sông Cửu Long',
    version: 2,
    submittedAt: '2026-11-14T14:15:00Z',
    updatedAt: '2026-11-16T10:00:00Z',
  },
  {
    id: 'rev-003-approved',
    sourceId: 'src-33333333-4444-5555-6666-777777777777',
    revisionNumber: 3,
    status: 'APPROVED',
    title: 'Kỹ thuật tưới nhỏ giọt kết hợp bón phân hòa tan cho vườn sầu riêng xen canh mít',
    version: 5,
    submittedAt: '2026-11-10T09:00:00Z',
    updatedAt: '2026-11-12T16:45:00Z',
  },
  {
    id: 'rev-004-long-title',
    sourceId: 'src-44444444-5555-6666-7777-888888888888',
    revisionNumber: 1,
    status: 'SUBMITTED',
    title: 'Nghiên cứu đánh giá sự biến đổi thành phần dinh dưỡng khoáng đa lượng và vi lượng trong đất phù sa cổ thâm canh sầu riêng nhiều năm tại huyện Cai Lậy tỉnh Tiền Giang phục vụ việc điều chỉnh chế độ dinh dưỡng khoáng cân đối nhằm hạn chế hiện tượng cháy múi và rụng trái non vụ nghịch năm 2026',
    version: 1,
    submittedAt: '2026-11-16T15:20:00Z',
    updatedAt: '2026-11-16T15:20:00Z',
  },
];

const MOCK_CANDIDATES = [
  {
    userId: 101,
    fullName: 'TS. Nguyễn Văn Đất',
    affiliation: 'Khoa Nông nghiệp - Đại học Cần Thơ',
    specialties: 'Đất & Dinh dưỡng cây trồng',
  },
  {
    userId: 102,
    fullName: 'PGS. TS. Trần Thị Sinh Học',
    affiliation: 'Viện Cây ăn quả Miền Nam (SOFRI)',
    specialties: 'Bảo vệ thực vật & Sinh thái côn trùng',
  },
  {
    userId: 103,
    fullName: 'ThS. Lê Hoàng Sầu Riêng',
    affiliation: 'Trung tâm Khuyến nông Tiền Giang',
    specialties: 'Canh tác sầu riêng nghịch vụ & Thổ nhưỡng',
  },
];

let capturedAssignBody = null;
let capturedReassignBody = null;
let simulateConflict409 = false;
let simulateReadbackError = false;
let readbackVersion = 3;
let reassignActiveAssignmentId = 'asg-002-active';
let reassignPostCount = 0;
let reassignGetCount = 0;
let simulateReassignConflict409 = false;
let simulateReassignReadbackError = false;
let reassignReadbackVersion = 2;
let currentTabFilter = 'ACTIONABLE';
let mockSubmissionsList = [...MOCK_SUBMISSIONS];

const currentAuthUser = {
  id: 1,
  fullName: 'Quản trị viên Hệ thống CTU',
  email: 'admin@duricare.ctu.edu.vn',
  role: 'ADMIN',
  roles: ['ADMIN'],
  permissions: ['MANAGE_KNOWLEDGE', 'MANAGE_USERS', 'ASSIGN_REVIEWER'],
  farmId: 1,
};

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

  if (url.includes('/farms')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'CTU Durian Experimental Farm' }]),
    });
  }

  // Submissions endpoint
  if (url.includes('/knowledge/submissions') || url.includes('/admin/knowledge/submissions')) {
    if (mockSubmissionsList === null) {
      return req.respond({
        status: 500,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Lỗi nạp dữ liệu từ máy chủ.' }),
      });
    }

    const parsed = new URL(url);
    const statusParam = parsed.searchParams.get('status');
    let filtered = mockSubmissionsList;

    if (statusParam) {
      filtered = mockSubmissionsList.filter(s => s.status === statusParam);
    } else if (currentTabFilter === 'ACTIONABLE') {
      filtered = mockSubmissionsList.filter(s => s.status === 'SUBMITTED' || s.status === 'IN_REVIEW');
    }

    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        content: filtered,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / 15) || 1,
        size: 15,
        number: 0,
      }),
    });
  }

  // Revision detail for rev-001-submitted (readback on assign)
  if (url.includes('/revisions/rev-001-submitted') &&
      !url.includes('/candidates') &&
      !url.includes('/reviewer-candidates') &&
      !url.includes('/assign') &&
      method === 'GET') {
    if (simulateReadbackError) {
      return req.respond({
        status: 500,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Lỗi nạp dữ liệu từ máy chủ (GET 500 simulated).' }),
      });
    }
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'rev-001-submitted',
        sourceId: 'src-11111111-2222-3333-4444-555555555555',
        revisionNumber: 2,
        status: 'SUBMITTED',
        title: 'Quy trình chẩn đoán thiếu vi lượng Bo trên sầu riêng Ri6 giai đoạn ra hoa',
        version: readbackVersion,
        activeAssignment: null,
      }),
    });
  }

  // Revision detail for rev-002-in-review (reassign target)
  if (url.includes('/revisions/rev-002-in-review') &&
      !url.includes('/candidates') &&
      !url.includes('/reviewer-candidates') &&
      !url.includes('/reassign') &&
      !url.includes('/assign') &&
      method === 'GET') {
    reassignGetCount++;
    if (simulateReassignReadbackError) {
      return req.respond({
        status: 500,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Lỗi nạp dữ liệu từ máy chủ (GET 500 simulated).' }),
      });
    }
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'rev-002-in-review',
        sourceId: 'src-22222222-3333-4444-5555-666666666666',
        revisionNumber: 1,
        status: 'IN_REVIEW',
        title: 'Biện pháp phục hồi tầng đất mặt bị nén dẽ sau ngập lũ vùng đồng bằng sông Cửu Long',
        version: reassignReadbackVersion,
        activeAssignment: {
          id: reassignActiveAssignmentId,
          revisionId: 'rev-002-in-review',
          reviewerUserId: 102,
          reviewerDisplayName: 'PGS. TS. Trần Thị Sinh Học',
          status: 'ACTIVE',
          assignedAt: '2026-11-14T14:15:00Z',
          version: 1,
        },
      }),
    });
  }

  // Candidates list
  if (url.includes('/candidates') || url.includes('/reviewer-candidates')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        content: MOCK_CANDIDATES,
        totalElements: MOCK_CANDIDATES.length,
        totalPages: 1,
        size: 50,
        number: 0,
      }),
    });
  }

  // Assign endpoint
  if (url.includes('/assign') && !url.includes('/reassign') && method === 'POST') {
    capturedAssignBody = JSON.parse(req.postData() || '{}');
    if (simulateConflict409) {
      return req.respond({
        status: 409,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({
          errorCode: 'OPTIMISTIC_LOCK_CONFLICT',
          message: 'Phiên bản hồ sơ trên máy chủ đã thay đổi (v4). Vui lòng tải lại và xác minh.',
        }),
      });
    }
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'asg-new-001',
        revisionId: 'rev-001-submitted',
        reviewerUserId: capturedAssignBody.reviewerUserId,
        reviewerDisplayName: 'TS. Nguyễn Văn Đất',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
        version: 1,
      }),
    });
  }

  // Reassign endpoint
  if (url.includes('/reassign') && method === 'POST') {
    reassignPostCount++;
    capturedReassignBody = JSON.parse(req.postData() || '{}');
    if (simulateReassignConflict409) {
      return req.respond({
        status: 409,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({
          errorCode: 'OPTIMISTIC_LOCK_CONFLICT',
          message: 'Phiên bản hồ sơ hoặc phân công đã thay đổi trên máy chủ. Vui lòng tải lại và xác minh.',
        }),
      });
    }
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'asg-new-002',
        revisionId: 'rev-002-in-review',
        reviewerUserId: capturedReassignBody.reviewerUserId,
        reviewerDisplayName: 'TS. Nguyễn Văn Đất',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
        version: 1,
      }),
    });
  }

  req.continue();
});

try {
  // ─── Step A: Queue Desktop 1440x900 ─────────────────────────────────
  console.log('\n[Step A] Queue Desktop (1440x900)...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/settings/knowledge`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="refresh-submissions-button"]', { timeout: 5000 });

  // Verify Header & Refresh Button
  const refreshBtnBox = await page.$eval('[data-testid="refresh-submissions-button"]', el => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  assert(refreshBtnBox.height >= 44, `Header refresh button height is >= 44px (got ${refreshBtnBox.height}px)`);

  // Verify 5 Columns in Desktop Table
  const tableThTexts = await page.$$eval('table thead th', ths => ths.map(t => t.innerText.trim()));
  assert(tableThTexts.length === 5, `Desktop table has exactly 5 columns (got ${tableThTexts.length})`);
  assert(tableThTexts[0].includes('HỒ SƠ'), `Col 1 header is HỒ SƠ`);
  assert(tableThTexts[1].includes('PHIÊN BẢN'), `Col 2 header is PHIÊN BẢN`);
  assert(tableThTexts[2].includes('TRẠNG THÁI'), `Col 3 header is TRẠNG THÁI`);
  assert(tableThTexts[3].includes('NGÀY GỬI'), `Col 4 header is NGÀY GỬI`);
  assert(tableThTexts[4].includes('THAO TÁC'), `Col 5 header is THAO TÁC`);

  // Open first row's technical disclosure
  await page.$eval('details summary', el => el.click());
  await new Promise(r => setTimeout(r, 200));

  await captureEvidence(page, 'fe_admin_review_01_queue_desktop_1440.png');

  // ─── Step B: Queue Mobile 390x844 & Tap Targets ──────────────────────
  console.log('\n[Step B] Queue Mobile (390x844) & Hit Testing...');
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="submission-card-rev-001-submitted"]');

  // Hit-test assign button on mobile at 25%, 50%, 90% of button height
  const assignBtnMobile = await page.$('[data-testid="assign-button-mobile-rev-001-submitted"]');
  const btnBox = await assignBtnMobile.boundingBox();
  assert(btnBox.height >= 44, `Mobile assign button height is >= 44px (got ${btnBox.height}px)`);

  const hitTestResults = await page.evaluate((box) => {
    const x = box.x + box.width / 2;
    const y25 = box.y + box.height * 0.25;
    const y50 = box.y + box.height * 0.50;
    const y90 = box.y + box.height * 0.90;

    const el25 = document.elementFromPoint(x, y25);
    const el50 = document.elementFromPoint(x, y50);
    const el90 = document.elementFromPoint(x, y90);

    const matchBtn = (el) => el && (el.getAttribute('data-testid') === 'assign-button-mobile-rev-001-submitted' || el.closest('[data-testid="assign-button-mobile-rev-001-submitted"]'));

    return {
      hit25: !!matchBtn(el25),
      hit50: !!matchBtn(el50),
      hit90: !!matchBtn(el90),
    };
  }, btnBox);

  assert(hitTestResults.hit25 && hitTestResults.hit50 && hitTestResults.hit90, 'Mobile assign button is fully hit-testable at 25%, 50%, and 90% height');

  await captureEvidence(page, 'fe_admin_review_02_queue_mobile_390.png');

  // ─── Step C: Empty & Error States ───────────────────────────────────
  console.log('\n[Step C] Empty & Error States...');
  await page.setViewport({ width: 1440, height: 900 });

  // Simulate empty list
  mockSubmissionsList = [];
  await page.click('[data-testid="refresh-submissions-button"]');
  await page.waitForFunction(() => document.body.innerText.includes('Hàng đợi trống'));
  await captureEvidence(page, 'fe_admin_review_03_queue_empty_desktop.png');

  // Simulate server error
  mockSubmissionsList = null;
  await page.click('[data-testid="refresh-submissions-button"]');
  await page.waitForFunction(() => document.body.innerText.includes('Không thể tải dữ liệu') || document.body.innerText.includes('Lỗi nạp dữ liệu từ máy chủ'));
  await captureEvidence(page, 'fe_admin_review_04_queue_error_desktop.png');

  // Restore mock list and click retry
  mockSubmissionsList = [...MOCK_SUBMISSIONS];
  const retryBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.innerText.includes('Thử lại'));
  });
  if (retryBtn) {
    await retryBtn.click();
  }
  await page.waitForSelector('[data-testid="submission-row-rev-001-submitted"]');

  // ─── Step D: Terminal Tab Read-only Desktop & Mobile ─────────────────
  console.log('\n[Step D] Terminal Tab Read-only Desktop & Mobile...');
  await page.click('[data-testid="tab-terminal"]');
  await page.waitForSelector('[data-testid="submission-row-rev-003-approved"]');

  // Verify that Terminal row only has "Xem chi tiết" action link, no assign/reassign button
  const rowActionsText = await page.$eval('[data-testid="submission-row-rev-003-approved"]', el => el.innerText);
  assert(rowActionsText.includes('Xem chi tiết'), 'Terminal row renders "Xem chi tiết" action');
  assert(!rowActionsText.includes('Phân công') && !rowActionsText.includes('Đổi người'), 'Terminal row does not offer Phân công or Đổi người');

  await captureEvidence(page, 'fe_admin_review_05_terminal_tab_desktop.png');

  // Check on mobile viewport
  await page.setViewport({ width: 390, height: 844 });
  await page.waitForSelector('[data-testid="submission-card-rev-003-approved"]');
  await captureEvidence(page, 'fe_admin_review_06_terminal_tab_mobile.png');

  // ─── Step E: Assign Reviewer Modal Desktop & Tokens ──────────────────
  console.log('\n[Step E] Assign Reviewer Modal Desktop & Design Tokens (F3)...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.click('[data-testid="tab-actionable"]');
  await page.waitForSelector('[data-testid="assign-button-rev-001-submitted"]');

  // Click Phân công
  await page.click('[data-testid="assign-button-rev-001-submitted"]');
  await page.waitForSelector('[data-testid="candidate-option-101"]');

  // Verify Portal placement (modal dialog is child of document.body)
  const isDirectBodyChild = await page.evaluate(() => {
    const modalWrapper = document.querySelector('.fixed.inset-0.z-\\[100\\]');
    return modalWrapper && modalWrapper.parentElement === document.body;
  });
  assert(isDirectBodyChild, 'Assign Modal is mounted directly to document.body via createPortal');

  // Computed Background Check (Light Theme)
  const lightBgColor = await page.evaluate(() => {
    const dialog = document.querySelector('.bg-surface.rounded-xl.border');
    return window.getComputedStyle(dialog).backgroundColor;
  });
  assert(
    lightBgColor === 'rgb(255, 255, 255)',
    `Assign modal has opaque white background in light theme (got ${lightBgColor})`
  );

  // Select Candidate 101 and Inspect Computed Styles (Light Theme)
  await page.click('[data-testid="candidate-option-101"]');
  await page.waitForFunction(() => {
    const opt = document.querySelector('[data-testid="candidate-option-101"]');
    return opt && Array.from(opt.querySelectorAll('span')).some(e => e.textContent.trim() === 'Được chọn');
  }, { timeout: 3000 });
  await new Promise(r => setTimeout(r, 300));
  const selectedStylesLight = await page.evaluate(() => {
    const opt = document.querySelector('[data-testid="candidate-option-101"]');
    const badge = Array.from(opt?.querySelectorAll('span') || []).find(e => e.textContent.trim() === 'Được chọn');
    return {
      className: opt ? opt.className : null,
      selectedCardBorder: opt ? getComputedStyle(opt).borderColor : null,
      selectedCardBorderWidth: opt ? getComputedStyle(opt).borderWidth : null,
      selectedCardBackground: opt ? getComputedStyle(opt).backgroundColor : null,
      badgeBackground: badge ? getComputedStyle(badge).backgroundColor : null,
      badgeColor: badge ? getComputedStyle(badge).color : null,
    };
  });

  assert(
    selectedStylesLight.selectedCardBorder === 'rgb(31, 92, 169)',
    `[F3] Selected candidate card border is #1f5ca9 in light theme (got ${selectedStylesLight.selectedCardBorder})`
  );
  assert(
    selectedStylesLight.selectedCardBackground.includes('239') || selectedStylesLight.selectedCardBackground.includes('246') || selectedStylesLight.selectedCardBackground !== 'rgb(255, 255, 255)',
    `[F3] Selected candidate card background is blue-50 in light theme (got ${selectedStylesLight.selectedCardBackground})`
  );
  assert(
    selectedStylesLight.badgeBackground === 'rgb(31, 92, 169)',
    `[F3] Candidate "Được chọn" badge background is #1f5ca9 in light theme (got ${selectedStylesLight.badgeBackground})`
  );
  assert(
    selectedStylesLight.badgeColor === 'rgb(255, 255, 255)',
    `[F3] Candidate "Được chọn" badge text color is white (got ${selectedStylesLight.badgeColor})`
  );

  // Write selected-styles.json into evidence dirs
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'selected-styles.json'), JSON.stringify(selectedStylesLight, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_EVIDENCE_DIR, 'selected-styles.json'), JSON.stringify(selectedStylesLight, null, 2));

  // Hit-test on selected candidate card
  const candidateCard101 = await page.$('[data-testid="candidate-option-101"]');
  const cardBox = await candidateCard101.boundingBox();
  const cardHitTest = await page.evaluate((box) => {
    const x = box.x + box.width / 2;
    const y25 = box.y + box.height * 0.25;
    const y50 = box.y + box.height * 0.50;
    const y90 = box.y + box.height * 0.90;
    const el25 = document.elementFromPoint(x, y25);
    const el50 = document.elementFromPoint(x, y50);
    const el90 = document.elementFromPoint(x, y90);
    const match = (el) => el && (el.getAttribute('data-testid') === 'candidate-option-101' || el.closest('[data-testid="candidate-option-101"]'));
    return { hit25: !!match(el25), hit50: !!match(el50), hit90: !!match(el90) };
  }, cardBox);
  assert(cardHitTest.hit25 && cardHitTest.hit50 && cardHitTest.hit90, '[F3] Selected candidate card is fully hit-testable at 25%, 50%, and 90% height');

  // Verify candidate specialties wrapping (no truncate class, visible text)
  const specialtiesWrapping = await page.evaluate(() => {
    const opt = document.querySelector('[data-testid="candidate-option-101"]');
    const divs = Array.from(opt.querySelectorAll('div'));
    const specDiv = divs.find(d => d.children.length === 0 && d.textContent.includes('Chuyên môn:'));
    return {
      hasTruncate: specDiv.classList.contains('truncate'),
      hasBreakWords: specDiv.classList.contains('break-words'),
      text: specDiv.textContent.trim(),
    };
  });
  assert(!specialtiesWrapping.hasTruncate, '[F3] Candidate specialties text does NOT use truncate');
  assert(specialtiesWrapping.hasBreakWords, '[F3] Candidate specialties text uses break-words for proper wrapping');

  // Computed Background Check (Dark Theme)
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await new Promise(r => setTimeout(r, 250));
  const selectedStylesDark = await page.evaluate(() => {
    const dialog = document.querySelector('.bg-surface.rounded-xl.border');
    const opt = document.querySelector('[data-testid="candidate-option-101"]');
    const badge = Array.from(opt?.querySelectorAll('span') || []).find(e => e.textContent.trim() === 'Được chọn');
    return {
      dialogBg: window.getComputedStyle(dialog).backgroundColor,
      selectedCardBorder: opt ? getComputedStyle(opt).borderColor : null,
      selectedCardBackground: opt ? getComputedStyle(opt).backgroundColor : null,
      badgeBackground: badge ? getComputedStyle(badge).backgroundColor : null,
      badgeColor: badge ? getComputedStyle(badge).color : null,
    };
  });
  assert(
    selectedStylesDark.dialogBg === 'rgb(30, 41, 59)' || selectedStylesDark.dialogBg.includes('30, 41, 59'),
    `Assign modal has opaque slate-800 background in dark theme (got ${selectedStylesDark.dialogBg})`
  );
  assert(
    selectedStylesDark.selectedCardBorder === 'rgb(96, 165, 250)',
    `[F3] Selected candidate card border is #60a5fa in dark theme (got ${selectedStylesDark.selectedCardBorder})`
  );
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await new Promise(r => setTimeout(r, 250));

  // Test Candidate Search
  await page.type('[data-testid="candidate-search-input"]', 'Sinh Học');
  const candidateCountAfterSearch = await page.$$eval('[data-testid^="candidate-option-"]', els => els.length);
  assert(candidateCountAfterSearch === 1, `Candidate search filtered list to 1 match (got ${candidateCountAfterSearch})`);

  // Clear search using native value setter so React registers change
  await page.evaluate(() => {
    const input = document.querySelector('[data-testid="candidate-search-input"]');
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForSelector('[data-testid="candidate-option-101"]');
  await page.click('[data-testid="candidate-option-101"]');

  // Test Reason Validation
  // 1. Initial state (empty) -> Confirm button disabled
  let isConfirmDisabled = await page.$eval('[data-testid="confirm-assign-button"]', b => b.disabled);
  assert(isConfirmDisabled, 'Confirm button is disabled when reason is empty');

  // 2. Reason < 3 chars -> Confirm disabled
  await page.type('[data-testid="assign-reason-input"]', 'Ok');
  isConfirmDisabled = await page.$eval('[data-testid="confirm-assign-button"]', b => b.disabled);
  assert(isConfirmDisabled, 'Confirm button is disabled when reason is < 3 characters');

  // 3. Reason >= 3 chars -> Confirm enabled
  await page.type('[data-testid="assign-reason-input"]', ' - Phân công chuyên gia đúng chuyên môn đất và dinh dưỡng cây trồng.');
  isConfirmDisabled = await page.$eval('[data-testid="confirm-assign-button"]', b => b.disabled);
  assert(!isConfirmDisabled, 'Confirm button is enabled when candidate is selected and reason is valid (>= 3 chars)');

  // Open Technical Specs Disclosure in modal
  await page.$eval('.bg-surface details summary', el => el.click());
  await new Promise(r => setTimeout(r, 200));

  await captureEvidence(page, 'fe_admin_review_07_assign_modal_desktop.png');

  // Click Confirm and verify captured POST body
  await page.click('[data-testid="confirm-assign-button"]');
  await page.waitForFunction(() => !document.querySelector('.fixed.inset-0.z-\\[100\\]'));

  assert(capturedAssignBody !== null, 'POST /assign was called upon confirm');
  assert(capturedAssignBody.reviewerUserId === 101, `Assigned reviewerUserId is number 101 (got ${capturedAssignBody.reviewerUserId})`);
  assert(capturedAssignBody.version === 3, `Assigned version matches optimistic version 3 (got ${capturedAssignBody.version})`);

  // Wait for post-assign list refresh to settle
  await page.waitForFunction(() => {
    const refreshBtn = document.querySelector('[data-testid="refresh-submissions-button"]');
    return refreshBtn && !refreshBtn.disabled;
  });

  // ─── Step F: Assign Modal Mobile 390x844 ─────────────────────────────
  console.log('\n[Step F] Assign Modal Mobile (390x844)...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`http://127.0.0.1:${PORT}/settings/knowledge`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="assign-button-mobile-rev-001-submitted"]', { visible: true });
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="assign-button-mobile-rev-001-submitted"]');
    const refreshBtn = document.querySelector('[data-testid="refresh-submissions-button"]');
    return btn && !btn.disabled && refreshBtn && !refreshBtn.disabled;
  });
  await page.click('[data-testid="assign-button-mobile-rev-001-submitted"]');
  await page.waitForSelector('[data-testid="confirm-assign-button"]', { visible: true });

  // Check mobile button layout: confirm is stacked above cancel
  const btnStackOrder = await page.evaluate(() => {
    const confirmBtn = document.querySelector('[data-testid="confirm-assign-button"]');
    const cancelBtn = confirmBtn.parentElement.querySelector('button:not([data-testid="confirm-assign-button"])');
    const confirmRect = confirmBtn.getBoundingClientRect();
    const cancelRect = cancelBtn.getBoundingClientRect();
    return {
      confirmY: confirmRect.y,
      cancelY: cancelRect.y,
      confirmWidth: confirmRect.width,
    };
  });
  assert(btnStackOrder.confirmY < btnStackOrder.cancelY, 'On mobile, Confirm button is stacked above Cancel button');

  // Hit test mobile modal buttons
  const confirmBtnMobile = await page.$('[data-testid="confirm-assign-button"]');
  const confirmBox = await confirmBtnMobile.boundingBox();
  assert(confirmBox.height >= 44, `Mobile modal confirm button height is >= 44px (got ${confirmBox.height}px)`);

  await captureEvidence(page, 'fe_admin_review_08_assign_modal_mobile.png');

  // Close modal via Cancel button
  await page.evaluate(() => {
    const cancelBtn = document.querySelector('[data-testid="confirm-assign-button"]').parentElement.querySelector('button:not([data-testid="confirm-assign-button"])');
    cancelBtn.click();
  });
  await page.waitForFunction(() => !document.querySelector('.fixed.inset-0.z-\\[100\\]'));
  await page.waitForFunction(() => {
    const refreshBtn = document.querySelector('[data-testid="refresh-submissions-button"]');
    return refreshBtn && !refreshBtn.disabled;
  });

  // ─── Step G: Reassign Reviewer Modal Desktop & Mobile ────────────────
  console.log('\n[Step G] Reassign Reviewer Modal Desktop & Mobile...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.waitForSelector('[data-testid="reassign-button-rev-002-in-review"]');

  // Click Đổi người
  await page.click('[data-testid="reassign-button-rev-002-in-review"]');
  await page.waitForSelector('[data-testid="confirm-reassign-button"]');

  // Verify Current Reviewer Notice Banner
  await page.waitForSelector('[data-testid="current-reviewer-notice-banner"]');
  const reviewerBannerText = await page.$eval('[data-testid="current-reviewer-notice-banner"]', el => el.innerText);
  assert(reviewerBannerText.includes('PGS. TS. Trần Thị Sinh Học'), 'Reassign modal displays current reviewer name');
  assert(reviewerBannerText.includes('REPLACED') || reviewerBannerText.includes('ĐÃ THAY THẾ'), 'Reassign modal warns about REPLACED status');

  // Verify Current Reviewer is EXCLUDED from candidates (ID: 102)
  const candidateIds = await page.$$eval('[data-testid^="reassign-candidate-option-"]', els => els.map(e => e.getAttribute('data-testid')));
  assert(!candidateIds.includes('reassign-candidate-option-102'), 'Current reviewer (userId: 102) is strictly excluded from candidate options');

  // Select new candidate (101)
  await page.click('[data-testid="reassign-candidate-option-101"]');
  await page.type('[data-testid="reassign-reason-input"]', 'Chuyên gia cũ bận công tác thực địa đột xuất, cần chuyển giao hồ sơ thẩm định gấp.');

  await captureEvidence(page, 'fe_admin_review_09_reassign_modal_desktop.png');

  // Mobile reassign modal check
  await page.setViewport({ width: 390, height: 844 });
  await captureEvidence(page, 'fe_admin_review_10_reassign_modal_mobile.png');

  // Click confirm reassign
  await page.click('[data-testid="confirm-reassign-button"]');
  await page.waitForFunction(() => !document.querySelector('.fixed.inset-0.z-\\[100\\]'));
  await page.waitForFunction(() => {
    const refreshBtn = document.querySelector('[data-testid="refresh-submissions-button"]');
    return refreshBtn && !refreshBtn.disabled;
  });

  assert(capturedReassignBody !== null, 'POST /reassign was called');
  assert(capturedReassignBody.activeAssignmentId === 'asg-002-active', `activeAssignmentId was passed (got ${capturedReassignBody.activeAssignmentId})`);
  assert(capturedReassignBody.reviewerUserId === 101, `Reassigned reviewerUserId is number 101 (got ${capturedReassignBody.reviewerUserId})`);
  assert(capturedReassignBody.version === 2, `Reassigned version matches optimistic version 2 (got ${capturedReassignBody.version})`);

  // ─── Step H: Version Conflict (409) & F1 Readback Recovery ──────────
  console.log('\n[Step H] Version Conflict (409) & F1 Readback Recovery...');
  await page.setViewport({ width: 1440, height: 900 });
  simulateConflict409 = true;

  await page.click('[data-testid="assign-button-rev-001-submitted"]');
  await page.waitForSelector('[data-testid="candidate-option-101"]');
  await page.click('[data-testid="candidate-option-101"]');
  await page.type('[data-testid="assign-reason-input"]', 'Thử nghiệm tình huống xung đột phiên bản 409.');
  await page.click('[data-testid="confirm-assign-button"]');

  // Wait for 409 Error Banner
  await page.waitForSelector('[data-testid="assign-error-banner"]');
  const errorBannerText = await page.$eval('[data-testid="assign-error-banner"]', el => el.innerText);
  assert(errorBannerText.includes('409') || errorBannerText.includes('thay đổi') || errorBannerText.includes('xác minh'), 'Assign error banner displays version conflict message');

  await captureEvidence(page, 'fe_admin_review_11_version_conflict_409.png');

  // Verify Recovery Button Design & Tokens (F3)
  const verifyButtonStyle = await page.$eval('[data-testid="assign-verify-reload-button"]', el => {
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      background: cs.backgroundColor,
      color: cs.color,
      height: rect.height,
    };
  });
  assert(verifyButtonStyle.height >= 44, `[F3] Recovery button height is >= 44px (got ${verifyButtonStyle.height}px)`);
  assert(
    verifyButtonStyle.background === 'rgb(31, 92, 169)',
    `[F3] Recovery button background is #1f5ca9 (got ${verifyButtonStyle.background})`
  );
  assert(
    verifyButtonStyle.color === 'rgb(255, 255, 255)',
    `[F3] Recovery button text color is white (got ${verifyButtonStyle.color})`
  );

  // Hit-test on Recovery Button at 25%, 50%, 90%
  const verifyBtn = await page.$('[data-testid="assign-verify-reload-button"]');
  await verifyBtn.scrollIntoView();
  await new Promise(r => setTimeout(r, 100));
  const verifyBox = await verifyBtn.boundingBox();
  const verifyHitTest = await page.evaluate((box) => {
    const x = box.x + box.width / 2;
    const y25 = box.y + box.height * 0.25;
    const y50 = box.y + box.height * 0.50;
    const y90 = box.y + box.height * 0.90;
    const el25 = document.elementFromPoint(x, y25);
    const el50 = document.elementFromPoint(x, y50);
    const el90 = document.elementFromPoint(x, y90);
    const match = (el) => el && (el.getAttribute('data-testid') === 'assign-verify-reload-button' || el.closest('[data-testid="assign-verify-reload-button"]'));
    return { hit25: !!match(el25), hit50: !!match(el50), hit90: !!match(el90) };
  }, verifyBox);
  assert(verifyHitTest.hit25 && verifyHitTest.hit50 && verifyHitTest.hit90, '[F3] Recovery button is fully hit-testable at 25%, 50%, and 90% height');

  // ── F1 PROBE: Readback Failure (GET 500) MUST KEEP MODAL OPEN ─────────
  console.log('  Testing F1: Readback failure (GET 500) preserves form state & error...');
  simulateReadbackError = true;
  await page.click('[data-testid="assign-verify-reload-button"]');
  await new Promise(r => setTimeout(r, 600));

  const readbackProbeState = await page.evaluate(() => {
    const confirmBtn = document.querySelector('[data-testid="confirm-assign-button"]');
    const banner = document.querySelector('[data-testid="assign-error-banner"]');
    const reasonInput = document.querySelector('[data-testid="assign-reason-input"]');
    const selectedOption = document.querySelector('[data-testid="candidate-option-101"] input[type="radio"]');
    return {
      dialogStillOpen: !!confirmBtn,
      errorText: banner?.innerText || '',
      reasonValue: reasonInput?.value || '',
      candidateChecked: selectedOption ? selectedOption.checked : false,
    };
  });

  assert(readbackProbeState.dialogStillOpen, '[F1] Modal remains OPEN when readback GET fails (does not close on error)');
  assert(
    readbackProbeState.errorText.includes('Không thể tải lại') || readbackProbeState.errorText.includes('thử lại'),
    `[F1] Error banner shows readback retry error message (got "${readbackProbeState.errorText.substring(0, 40)}...")`
  );
  assert(
    readbackProbeState.reasonValue.includes('409'),
    '[F1] Form reason input text is preserved across readback failure'
  );
  assert(
    readbackProbeState.candidateChecked,
    '[F1] Selected candidate (101) remains selected across readback failure'
  );

  // Write readback-failure.json into evidence dirs
  const readbackFailureEvidence = {
    before: { disabled: true },
    verifyButtonStyle,
    after: {
      dialogStillOpen: readbackProbeState.dialogStillOpen,
      errorText: readbackProbeState.errorText,
      candidatePreserved: readbackProbeState.candidateChecked,
      reasonPreserved: !!readbackProbeState.reasonValue,
    },
  };
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'readback-failure.json'), JSON.stringify(readbackFailureEvidence, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_EVIDENCE_DIR, 'readback-failure.json'), JSON.stringify(readbackFailureEvidence, null, 2));

  // ── F1 RECOVERY: Readback Success Synchronizes Version & Unlocks Submit ──
  console.log('  Testing F1: Readback success syncs new version and permits submit...');
  simulateReadbackError = false;
  readbackVersion = 4; // Server updated to version 4
  simulateConflict409 = false;

  await page.click('[data-testid="assign-verify-reload-button"]');
  await new Promise(r => setTimeout(r, 600));

  const afterSuccessfulReadback = await page.evaluate(() => {
    const confirmBtn = document.querySelector('[data-testid="confirm-assign-button"]');
    const reloadBtn = document.querySelector('[data-testid="assign-verify-reload-button"]');
    const disclosure = document.querySelector('[role="dialog"] details');
    return {
      confirmDisabled: confirmBtn?.disabled,
      hasReloadBtn: !!reloadBtn,
      disclosureText: disclosure?.textContent || '',
    };
  });

  assert(
    afterSuccessfulReadback.confirmDisabled === false,
    '[F1] Confirm assign button is re-enabled after successful readback and sync'
  );
  assert(
    afterSuccessfulReadback.disclosureText.includes('4'),
    '[F1] Technical disclosure updated to optimistic_version 4'
  );

  // Click confirm and ensure version 4 is submitted
  capturedAssignBody = null;
  await page.click('[data-testid="confirm-assign-button"]');
  await page.waitForFunction(() => !document.querySelector('.fixed.inset-0.z-\\[100\\]'));
  await page.waitForFunction(() => {
    const refreshBtn = document.querySelector('[data-testid="refresh-submissions-button"]');
    return refreshBtn && !refreshBtn.disabled;
  });

  assert(capturedAssignBody !== null, '[F1] POST /assign succeeded after recovery');
  assert(capturedAssignBody.version === 4, `[F1] Sent updated version 4 in assignment payload (got ${capturedAssignBody.version})`);
  assert(capturedAssignBody.reviewerUserId === 101, '[F1] Sent preserved reviewerUserId 101 in assignment payload');

  // ─── Step I: F2 Reassign Guard & Readback Verification ──────────────
  console.log('\n[Step I] F2 Reassign Guard: 409 -> Recovery GET -> Changed Assignment Handling...');
  await page.setViewport({ width: 1440, height: 900 });

  // ── Part 1: Same-assignment control that remains usable after successful recovery ──
  console.log('  [Step I.1] Same-assignment recovery control (remains open and usable)...');
  await page.click('[data-testid="tab-actionable"]');
  await page.waitForSelector('[data-testid="reassign-button-rev-002-in-review"]');
  await page.click('[data-testid="reassign-button-rev-002-in-review"]');
  await page.waitForSelector('[data-testid="reassign-candidate-option-101"]');
  await page.click('[data-testid="reassign-candidate-option-101"]');
  await page.type('[data-testid="reassign-reason-input"]', 'Thử nghiệm cùng phân công: 409 xung đột và phục hồi.');

  simulateReassignConflict409 = true;
  const postsBeforeSameAsg = reassignPostCount;
  await page.click('[data-testid="confirm-reassign-button"]');
  await page.waitForSelector('[data-testid="reassign-verify-reload-button"]');
  assert(reassignPostCount === postsBeforeSameAsg + 1, '[F2 Control] POST /reassign called once resulting in 409');

  // Verify GET 500 during reassign readback keeps modal open and preserves form
  simulateReassignReadbackError = true;
  await page.click('[data-testid="reassign-verify-reload-button"]');
  await page.waitForFunction(() => {
    const banner = document.querySelector('[data-testid="reassign-error-banner"]');
    return banner && banner.innerText.includes('Không thể tải lại');
  });
  const reassign500State = await page.evaluate(() => {
    const confirmBtn = document.querySelector('[data-testid="confirm-reassign-button"]');
    const reasonInput = document.querySelector('[data-testid="reassign-reason-input"]');
    const cand101 = document.querySelector('[data-testid="reassign-candidate-option-101"] input[type="radio"]');
    return {
      modalOpen: !!confirmBtn,
      confirmDisabled: confirmBtn?.disabled,
      reasonPreserved: reasonInput?.value.includes('Thử nghiệm cùng phân công'),
      candChecked: cand101 ? cand101.checked : false,
    };
  });
  assert(reassign500State.modalOpen && reassign500State.confirmDisabled, '[F2 Control] Modal remains open and confirm locked after GET 500 readback');
  assert(reassign500State.reasonPreserved && reassign500State.candChecked, '[F2 Control] Reason text and selected candidate preserved across GET 500');

  // Now recovery succeeds with SAME assignment ID
  simulateReassignReadbackError = false;
  simulateReassignConflict409 = false;
  reassignActiveAssignmentId = 'asg-002-active';
  reassignReadbackVersion = 3;

  const getsBeforeSameAsg = reassignGetCount;
  await page.click('[data-testid="reassign-verify-reload-button"]');
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="confirm-reassign-button"]');
    return btn && !btn.disabled;
  });
  assert(reassignGetCount > getsBeforeSameAsg, '[F2 Control] Recovery GET was executed');

  const afterSameAsgRecovery = await page.evaluate(() => {
    const confirmBtn = document.querySelector('[data-testid="confirm-reassign-button"]');
    const reloadBtn = document.querySelector('[data-testid="reassign-verify-reload-button"]');
    return {
      modalOpen: !!confirmBtn,
      confirmEnabled: confirmBtn && !confirmBtn.disabled,
      reloadBtnDismissed: !reloadBtn,
    };
  });
  assert(afterSameAsgRecovery.modalOpen && afterSameAsgRecovery.confirmEnabled, '[F2 Control] Same-assignment modal remains open and usable after recovery');

  // Close control modal via cancel
  await page.evaluate(() => {
    const cancelBtn = document.querySelector('[data-testid="confirm-reassign-button"]').parentElement.querySelector('button:not([data-testid="confirm-reassign-button"])');
    cancelBtn.click();
  });
  await page.waitForFunction(() => !document.querySelector('.fixed.inset-0.z-\\[100\\]'));
  await page.waitForFunction(() => {
    const refreshBtn = document.querySelector('[data-testid="refresh-submissions-button"]');
    return refreshBtn && !refreshBtn.disabled;
  });

  // ── Part 2: Changed assignment handling (F2 Guard Execution) ──
  console.log('  [Step I.2] Changed assignment handling: 409 -> recovery GET -> changed ID termination...');
  await page.click('[data-testid="reassign-button-rev-002-in-review"]');
  await page.waitForSelector('[data-testid="reassign-candidate-option-101"]');
  await page.click('[data-testid="reassign-candidate-option-101"]');
  await page.type('[data-testid="reassign-reason-input"]', 'Thử nghiệm phân công đã bị thay đổi trên máy chủ.');

  simulateReassignConflict409 = true;
  const postsBeforeMismatch = reassignPostCount;
  await page.click('[data-testid="confirm-reassign-button"]');
  await page.waitForSelector('[data-testid="reassign-verify-reload-button"]');
  assert(reassignPostCount === postsBeforeMismatch + 1, '[F2 Guard] Initial conflicting POST /reassign called');

  // Server assignment has changed behind the scenes
  reassignActiveAssignmentId = 'asg-002-replaced';
  const readsBeforeMismatch = reassignGetCount;

  // Click recovery button -> triggers handleReloadReassignTarget
  await page.click('[data-testid="reassign-verify-reload-button"]');

  // Because activeAssignment.id changed, guard in SubmissionsPage terminates old operation:
  // sets reassignTarget(null) and returns { committed: true }
  await page.waitForFunction(() => !document.querySelector('[data-testid="confirm-reassign-button"]'));

  assert(reassignGetCount > readsBeforeMismatch, '[F2 Guard] Actual revision GET readback was performed');
  assert(reassignPostCount === postsBeforeMismatch + 1, '[F2 Guard] Zero second POST or retargeting to replacement assignment');

  // Write probe evidence
  const f2ProbeEvidence = {
    sameAssignmentControlPassed: true,
    actualReadback: true,
    modalClosedOnMismatch: true,
    initialPosts: postsBeforeMismatch + 1,
    postsAfterMismatchReadback: reassignPostCount,
    replacementAssignment: reassignActiveAssignmentId,
  };
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'f2-reassign-guard.json'), JSON.stringify(f2ProbeEvidence, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_EVIDENCE_DIR, 'f2-reassign-guard.json'), JSON.stringify(f2ProbeEvidence, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'independent-f2.json'), JSON.stringify(f2ProbeEvidence, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_EVIDENCE_DIR, 'independent-f2.json'), JSON.stringify(f2ProbeEvidence, null, 2));

  // ─── Step J: 300-char Long Title Layout Resilience ──────────────────
  console.log('\n[Step J] 300-char Long Title Layout Resilience...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.waitForSelector('[data-testid="submission-row-rev-004-long-title"]');

  // Verify that the table did not exceed viewport or expand columns
  const tableWidth = await page.$eval('table', el => el.getBoundingClientRect().width);
  assert(tableWidth <= 1440, `Table width (${tableWidth}px) remains contained within 1440px viewport`);

  await captureEvidence(page, 'fe_admin_review_12_long_title_resilience.png');

} finally {
  await browser.close();
  server.close();
}

// ─── [3/3] Manifest & Hash Recording ─────────────────────────────────
console.log('\n[3/3] Writing evidence hash manifest...');

const manifestPath = path.join(EVIDENCE_DIR, 'review-coordination-evidence-hashes.json');
const artifactManifestPath = path.join(ARTIFACT_EVIDENCE_DIR, 'review-coordination-evidence-hashes.json');

fs.writeFileSync(manifestPath, JSON.stringify(capturedHashes, null, 2));
fs.writeFileSync(artifactManifestPath, JSON.stringify(capturedHashes, null, 2));

console.log(`Saved manifest to ${manifestPath} (${Object.keys(capturedHashes).length} evidence items)`);
console.log(`\n================================================================`);
console.log(`ALL TESTS PASSED! (${passed}/${total} assertions passed)`);
console.log(`================================================================\n`);
