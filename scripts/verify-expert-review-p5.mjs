import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import crypto from 'crypto';

const EVIDENCE_DIR = process.env.EVIDENCE_DIR
  ? path.resolve(process.env.EVIDENCE_DIR)
  : path.resolve('E:/CTU/LuanVan/verification/ui-refresh-ctu-expert-review-design-20261117/evidence');
const PORT = 5210;
const BASE_URL = `http://127.0.0.1:${PORT}`;

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const evidenceHashes = {};

async function captureScreenshot(page, filename) {
  const filePath = path.join(EVIDENCE_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  const buf = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  evidenceHashes[filename] = hash;
  console.log(`  📸 Captured ${filename} (SHA256: ${hash.slice(0, 16)}...)`);
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

// Mock User Sessions
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
  rejectionReason: null,
};

// Fixture Data matching real backend DTO contracts
const MOCK_ASSIGNMENT_1 = {
  id: '4382c511-8a9d-472a-9931-e407db3d91cf',
  version: 1,
  reviewerUserId: 42,
  reviewerDisplayName: 'TS. Trần Văn Chuyên Gia',
  assignedBy: 1,
  assignmentReason: 'Thẩm định kỹ thuật quy trình quản lý nguồn nước tưới và nồng độ mặn thời kỳ phân hóa mầm hoa cho sầu riêng ĐBSCL.',
  status: 'ACTIVE',
  assignedAt: '2026-11-16T10:20:00Z',
  revisionId: '4382c511-rev-001',
};

const MOCK_ASSIGNMENT_2 = {
  id: '8b91f04a-4e2b-4221-a182-3df8c0499e12',
  version: 2,
  reviewerUserId: 42,
  reviewerDisplayName: 'TS. Trần Văn Chuyên Gia',
  assignedBy: 1,
  assignmentReason: 'Thẩm định tài liệu hướng dẫn quản lý bệnh thối rễ và xì mủ Phytophthora trên cây sầu riêng.',
  status: 'ACTIVE',
  assignedAt: '2026-11-16T14:45:00Z',
  revisionId: '8b91f04a-rev-002',
};

const MOCK_ASSIGNMENT_COMPLETED = {
  id: 'c921f00a-1122-3344-5566-778899aabbcc',
  version: 3,
  reviewerUserId: 42,
  reviewerDisplayName: 'TS. Trần Văn Chuyên Gia',
  assignedBy: 1,
  assignmentReason: 'Đánh giá quy trình phục hồi cây sầu riêng sau ngập úng.',
  status: 'COMPLETED',
  assignedAt: '2026-11-15T09:00:00Z',
  revisionId: 'c921f00a-rev-003',
};

const MOCK_ASSIGNMENT_DETAIL = {
  id: '4382c511-8a9d-472a-9931-e407db3d91cf',
  version: 1,
  reviewerUserId: 42,
  reviewerDisplayName: 'TS. Trần Văn Chuyên Gia',
  assignedBy: 1,
  assignmentReason: 'Thẩm định kỹ thuật quy trình quản lý nguồn nước tưới và nồng độ mặn thời kỳ phân hóa mầm hoa cho sầu riêng ĐBSCL.',
  status: 'ACTIVE',
  assignedAt: '2026-11-16T10:20:00Z',
  revision: {
    id: '4382c511-rev-001',
    version: 3,
    revisionNumber: 1,
    status: 'IN_REVIEW',
    submittedAt: '2026-11-16T09:30:00Z',
    metadata: {
      title: 'TEST — Sổ tay VietGAP: Nguồn nước và tưới nước cho sầu riêng',
      authors: 'PGS. TS. Trần Văn Hậu & Nhóm NNC',
      publisher: 'NXB Nông Nghiệp Việt Nam',
      sourceType: 'RESEARCH_INSTITUTE_GUIDE',
      year: 2023,
      edition: 'Tái bản có bổ sung',
      sourceUrl: 'https://ctu.edu.vn/agri-library/vg-04',
      evidenceReference: 'Lưu trữ thư viện CTU, mã số AGRI-2023-VG04',
      provenanceNotes: 'Quy trình canh tác chuẩn hóa theo Tiêu chuẩn Nông nghiệp Tốt (VietGAP) áp dụng cho sầu riêng ĐBSCL',
      proposedTier: 'B',
      proposedTierRationale: 'Tài liệu hướng dẫn kỹ thuật do trường và viện nghiên cứu chuyên ngành ban hành',
    },
    chunks: [
      {
        chunkId: 'chunk-001',
        title: 'Đoạn 1 — Nước tưới trước khi hoa nở',
        topic: 'IRRIGATION',
        stage: 'RA_HOA',
        locator: 'Mục 1.6.2 · Trang 25',
        position: 0,
        content: 'Một tuần trước khi hoa nở, giảm khoảng 2/3 lượng nước mỗi lần tưới và giữ nguyên chu kỳ tưới.',
        originalExcerpt: 'Một tuần trước khi hoa nở, giảm khoảng 2/3 lượng nước mỗi lần tưới và giữ nguyên chu kỳ tưới.',
        applicabilityNotes: 'Điều kiện áp dụng cần được chuyên gia đối chiếu với tài liệu nguồn.',
        measurementNotes: 'Đo ẩm độ đất duy trì 60-70%.',
      },
      {
        chunkId: 'chunk-002',
        title: 'Đoạn 2 — Theo dõi độ ẩm đất và kiểm tra độ mặn',
        topic: 'IRRIGATION',
        stage: 'RA_HOA',
        locator: 'Mục 1.6.3 · Trang 26',
        position: 1,
        content: 'Kiểm tra độ mặn nguồn nước tưới định kỳ, nồng độ mặn không vượt quá 0.5‰ trong suốt giai đoạn ra hoa.',
        originalExcerpt: 'Kiểm tra độ mặn nguồn nước tưới định kỳ, nồng độ mặn không vượt quá 0.5‰ trong suốt giai đoạn ra hoa.',
        applicabilityNotes: 'Đặc biệt quan trọng tại vùng ảnh hưởng xâm nhập mặn ĐBSCL.',
        measurementNotes: 'Đo bằng khúc xạ kế hoặc bút đo EC.',
      },
      {
        chunkId: 'chunk-003',
        title: 'Đoạn 3 — Phục hồi ẩm độ sau khi hoa thụ phấn',
        topic: 'IRRIGATION',
        stage: 'DAU_TRAI',
        locator: 'Mục 1.7.1 · Trang 28',
        position: 2,
        content: 'Sau khi hoa thụ phấn và bắt đầu đậu trái non, tăng dần lượng nước tưới trở lại mức bình thường.',
        originalExcerpt: 'Sau khi hoa thụ phấn và bắt đầu đậu trái non, tăng dần lượng nước tưới trở lại mức bình thường.',
        applicabilityNotes: 'Tránh tưới đột ngột gây sốc nước rụng trái non.',
        measurementNotes: null,
      },
    ],
  },
  decision: null,
};

async function runVerification() {
  console.log('================================================================');
  console.log('UI-REFRESH-CTU-001 P5 Expert Review Targeted Remediation Suite');
  console.log('================================================================\n');

  // [1/3] Static code & design token assertions
  console.log('[1/3] Static code & design token assertions...');
  const shellNavCode = fs.readFileSync('src/components/layout/ShellNavigation.tsx', 'utf8');
  const expertShellCode = fs.readFileSync('src/components/layout/ExpertShell.tsx', 'utf8');
  const queuePageCode = fs.readFileSync('src/pages/ExpertAssignedReviewsPage.tsx', 'utf8');
  const workspacePageCode = fs.readFileSync('src/pages/ExpertReviewWorkspacePage.tsx', 'utf8');
  const modalCode = fs.readFileSync('src/components/knowledge/ExpertDecisionConfirmModal.tsx', 'utf8');
  const outcomeBadgeCode = fs.readFileSync('src/components/knowledge/DecisionOutcomeBadge.tsx', 'utf8');
  const tierBadgeCode = fs.readFileSync('src/components/knowledge/KnowledgeTierBadge.tsx', 'utf8');

  // Sidebar Zero-Shift & Accent Assertions (F5)
  assert(shellNavCode.includes('border-l-4'), 'Sidebar must use 4px left accent border');
  assert(shellNavCode.includes('border-transparent'), 'Inactive sidebar items must reserve 4px transparent border for 0px label shift');
  assert(shellNavCode.includes('border-l-[#1f5ca9]'), 'Active sidebar items must use #1f5ca9 left border in light theme');
  assert(shellNavCode.includes('dark:border-l-[#60a5fa]'), 'Active sidebar items must use #60a5fa left border in dark theme');
  assert(shellNavCode.includes('bg-[#eff4ff]'), 'Active sidebar item must have #eff4ff background in light theme');
  assert(shellNavCode.includes('dark:bg-[#172c49]'), 'Active sidebar item must have #172c49 background in dark theme');
  assert(shellNavCode.includes('DESKTOP_COLLAPSED_ACTIVE'), 'Collapsed rail must define active state styling');
  assert(shellNavCode.includes('border-l-[#1f5ca9]'), 'Collapsed rail active item must preserve 4px border accent');
  console.log('  ✓ [PASS] [F5] 4px left accent, 0px shift reservation, exact hex tokens & rail accent verified');

  // Shell Layout Dimensions
  assert(expertShellCode.includes('w-56'), 'ExpertShell desktop sidebar must be w-56 (224px)');
  assert(expertShellCode.includes('lg:ml-56'), 'ExpertShell main canvas margin must match 224px sidebar');
  assert(expertShellCode.includes('max-w-[1216px]'), 'ExpertShell canvas max-width must be 1216px');
  console.log('  ✓ [PASS] [Shell] 224px sidebar and 1216px canvas container verified');

  // Queue Page Layout
  assert(queuePageCode.includes('refresh-assigned-reviews-button'), 'Queue refresh button must have testid');
  assert(queuePageCode.includes('h-11 px-4 rounded-lg border border-border'), 'Queue refresh button must be h-11 44px tap target');
  assert(queuePageCode.includes('tab-active-reviews'), 'Queue must have active reviews tab');
  assert(queuePageCode.includes('tab-completed-reviews'), 'Queue must have completed reviews tab');
  assert(queuePageCode.includes('details className="group text-[12px]"'), 'Technical IDs disclosure must be default closed details');
  console.log('  ✓ [PASS] [Queue] 2 tabs, 44px refresh, default closed technical details disclosure');

  // Workspace Page Layout, DTO Semantics (F1), Separate Readback (F2), and Ratio (F4)
  assert(workspacePageCode.includes('Chuyên gia phụ trách'), '[F1] Assignment strip must render neutral Chuyên gia phụ trách label');
  assert(workspacePageCode.includes('handleVerificationReadback'), '[F2] Workspace must implement separate handleVerificationReadback');
  assert(!workspacePageCode.includes('tier-option-A'), '[F4] Workspace must not render extra mini tier buttons (dropdown only)');
  assert(
    workspacePageCode.includes('lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]') ||
    workspacePageCode.includes('lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]'),
    '[F4] Workspace must use exact 65:35 desktop grid ratio'
  );
  assert(workspacePageCode.includes('text-[16px] sm:text-sm'), '[F4] Workspace inputs must use 16px on mobile viewports to prevent iOS zoom');
  console.log('  ✓ [PASS] [Workspace] F1 neutral DTO label, F2 separate readback, F4 65:35 ratio and 16px mobile text');

  // Modal Container & Modality (F3, F4)
  assert(modalCode.includes('createPortal'), '[F3] Modal must mount via createPortal to document.body');
  assert(modalCode.includes('rounded-xl'), '[F4] Modal must use 12px rounded-xl radius');
  assert(modalCode.includes('text-[14px] leading-[22px]'), '[F4] Modal must use 14/22 typography');
  assert(modalCode.includes('Gửi quyết định'), '[F4] Modal primary action must be "Gửi quyết định" without unapproved legal text');
  assert(!modalCode.includes('Lưu ý trách nhiệm chuyên môn'), '[F4] Unapproved legal-permanence warning must be removed');
  assert(outcomeBadgeCode.includes("rounded-[6px]"), '[F4] Outcome badge must support rounded-[6px] shape');
  assert(outcomeBadgeCode.includes("shape === 'r6'"), '[R3] Outcome badge must support explicit scoped shape="r6" variant');
  assert(modalCode.includes('shape="r6"'), '[R3] Modal must explicitly use scoped shape="r6" badge variant');
  assert(tierBadgeCode.includes("rounded-[6px]"), '[F4] Tier badge must use rounded-[6px]');
  console.log('  ✓ [PASS] [Modal] F3 createPortal, F4 12px radius, 14/22 text, "Gửi quyết định" CTA and equal 24/r6 badges (R3)');

  // [2/3] Launch Puppeteer
  console.log('\n[2/3] Launching Puppeteer suite for live interaction verification...');
  const server = await startWorktreeSpaServer(PORT);
  console.log(`SPA Server listening on ${BASE_URL}`);

  const browser = await puppeteer.launch({
    headless: true,
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

  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-XSRF-TOKEN',
  };

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('duricare_auth_token', 'mock-token-expert-001');
    localStorage.setItem('auth_token', 'mock-token-expert-001');
    localStorage.setItem('duricare-language', 'vi');
    localStorage.setItem('theme', 'light');
  });

  let submissionCount = 0;
  let simulateReadbackError = false;
  let readbackCount = 0;
  let activeUser = EXPERT_USER;
  let serverAssignmentState = { ...MOCK_ASSIGNMENT_DETAIL };
  let holdDecisionPost = false;
  let heldDecisionPost = null;
  let holdReadbackGet = false;
  let heldReadbackGet = null;

  await page.setRequestInterception(true);
  page.on('request', req => {
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
          accessToken: 'mock-token-expert-001',
          user: activeUser,
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
        body: JSON.stringify(activeUser),
      });
    }

    if (url.includes('/experts/me')) {
      return req.respond({
        status: 200,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify(EXPERT_PROFILE_VERIFIED),
      });
    }

    if (url.includes('/overview')) {
      return req.respond({
        status: 200,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({ farms: [], alerts: [], statistics: {} }),
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

    // Knowledge reviews endpoints
    if (url.includes('/knowledge/reviews/assigned')) {
      const isCompleted = url.includes('status=COMPLETED');
      return req.respond({
        status: 200,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({
          content: isCompleted ? [MOCK_ASSIGNMENT_COMPLETED] : [MOCK_ASSIGNMENT_1, MOCK_ASSIGNMENT_2],
          page: 0,
          size: 15,
          totalElements: isCompleted ? 1 : 2,
          totalPages: 1,
        }),
      });
    }

    if (url.includes('/knowledge/reviews/4382c511-8a9d-472a-9931-e407db3d91cf/decision') && method === 'POST') {
      submissionCount++;
      if (holdDecisionPost) {
        heldDecisionPost = req;
        return;
      }
      const payload = JSON.parse(req.postData() || '{}');
      if (submissionCount === 1) {
        return req.respond({
          status: 409,
          headers: CORS_HEADERS,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'stale_version',
            message: 'Phiên bản hồ sơ đã thay đổi trên máy chủ (409 Conflict).',
          }),
        });
      }

      // Successful decision
      serverAssignmentState = {
        ...serverAssignmentState,
        status: 'COMPLETED',
        version: payload.assignmentVersion + 1,
        decision: {
          decisionId: 'dec-001',
          outcome: payload.outcome,
          assessedTier: payload.assessedTier,
          tierRationale: payload.tierRationale,
          reason: payload.reason,
          decidedAt: new Date().toISOString(),
          chunkComments: payload.chunkComments,
        },
      };

      return req.respond({
        status: 200,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({
          decision: serverAssignmentState.decision,
          revision: serverAssignmentState.revision,
        }),
      });
    }

    if (url.includes('/knowledge/reviews/8b91f04a-4e2b-4221-a182-3df8c0499e12') && method === 'GET') {
      const b = JSON.parse(JSON.stringify(MOCK_ASSIGNMENT_DETAIL));
      b.id = '8b91f04a-4e2b-4221-a182-3df8c0499e12';
      b.revisionId = 'independent-revision-b';
      b.revision.id = 'independent-revision-b';
      b.revision.metadata.title = 'INDEPENDENT SOURCE B';
      return req.respond({
        status: 200,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify(b),
      });
    }

    if (url.includes('/knowledge/reviews/4382c511-8a9d-472a-9931-e407db3d91cf') && method === 'GET') {
      if (holdReadbackGet) {
        heldReadbackGet = req;
        return;
      }
      readbackCount++;
      if (simulateReadbackError) {
        return req.respond({
          status: 500,
          headers: CORS_HEADERS,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Lỗi nạp dữ liệu từ máy chủ (GET 500 simulated).' }),
        });
      }

      if (submissionCount >= 1 && !serverAssignmentState.decision) {
        serverAssignmentState.version = 2;
        serverAssignmentState.revision.version = 4;
      }
      return req.respond({
        status: 200,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify(serverAssignmentState),
      });
    }

    // Fail-closed for all unknown requests: abort
    return req.abort('failed');
  });

  // ==========================================
  // [Step A] Sidebar Zero-Shift & Collapsed Rail (F5)
  // ==========================================
  console.log('\n[Step A] Sidebar Zero-Shift, Active Accent & Collapsed Rail (F5)...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/knowledge/reviews`, { waitUntil: 'networkidle0' });

  // Locate active "Nhiệm vụ thẩm định" sidebar link
  await page.waitForSelector('aside nav a[aria-current="page"]');
  const activeSidebarItem = await page.$('aside nav a[aria-current="page"]');
  const activeItemStyles = await page.evaluate(el => {
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const textSpan = el.querySelector('span:last-child');
    const textRect = textSpan ? textSpan.getBoundingClientRect() : null;
    return {
      bgColor: cs.backgroundColor,
      color: cs.color,
      borderLeftWidth: cs.borderLeftWidth,
      borderLeftColor: cs.borderLeftColor,
      height: rect.height,
      textX: textRect ? textRect.left : rect.left,
    };
  }, activeSidebarItem);

  assert(activeItemStyles.height >= 44, `Active sidebar item height must be >= 44px (got ${activeItemStyles.height}px)`);
  assert.strictEqual(activeItemStyles.borderLeftWidth, '4px', 'Active item left border must be 4px');
  assert(activeItemStyles.color.includes('31, 92, 169') || activeItemStyles.color.includes('#1f5ca9'), 'Active text color must be #1f5ca9');
  console.log(`  ✓ [PASS] Active sidebar item: height ${activeItemStyles.height}px, 4px left border, color #1f5ca9`);

  // Inactive sidebar item check
  const inactiveSidebarItem = await page.$('aside nav a:not([aria-current="page"])');
  const inactiveItemStyles = await page.evaluate(el => {
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const textSpan = el.querySelector('span:last-child');
    const textRect = textSpan ? textSpan.getBoundingClientRect() : null;
    return {
      bgColor: cs.backgroundColor,
      color: cs.color,
      borderLeftWidth: cs.borderLeftWidth,
      borderLeftColor: cs.borderLeftColor,
      textX: textRect ? textRect.left : rect.left,
    };
  }, inactiveSidebarItem);

  assert.strictEqual(inactiveItemStyles.borderLeftWidth, '4px', 'Inactive item left border must also be 4px (reserved transparent)');
  const deltaX = Math.abs(activeItemStyles.textX - inactiveItemStyles.textX);
  assert(deltaX < 1.0, `Zero label shift assertion: deltaX must be < 1px (got ${deltaX}px)`);
  console.log(`  ✓ [PASS] Zero label shift verified: deltaX = ${deltaX.toFixed(2)}px across active and inactive states`);

  // Verify collapsed rail active indicator (F5) under Admin role
  console.log('  Testing F5 Collapsed Rail under ADMIN...');
  activeUser = { ...EXPERT_USER, role: 'ADMIN' };
  await page.goto(`${BASE_URL}/settings/knowledge`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('button[aria-label="Thu gọn thanh điều hướng"]');
  await page.click('button[aria-label="Thu gọn thanh điều hướng"]');
  await page.waitForSelector('button[aria-label="Mở rộng thanh điều hướng"]');

  const railActiveStyles = await page.$eval('aside a[aria-current="page"]', el => {
    const cs = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      borderLeftWidth: cs.borderLeftWidth,
      borderLeftColor: cs.borderLeftColor,
      width: r.width,
      height: r.height,
    };
  });
  assert.strictEqual(railActiveStyles.borderLeftWidth, '4px', '[F5] Collapsed rail active item must retain 4px border accent');
  assert(railActiveStyles.borderLeftColor.includes('31, 92, 169'), '[F5] Collapsed rail active item border color must be #1f5ca9');
  assert.strictEqual(railActiveStyles.width, 44, '[F5] Collapsed rail active item width must be 44px');
  console.log('  ✓ [PASS] [F5] Collapsed rail active item retains 4px border accent #1f5ca9 and 44x44 size');

  await captureScreenshot(page, 'fe_expert_review_10_sidebar_fidelity.png');

  // Switch back to EXPERT user
  activeUser = EXPERT_USER;
  await page.goto(`${BASE_URL}/knowledge/reviews`, { waitUntil: 'networkidle0' });

  // ==========================================
  // [Step B] Queue Desktop (1440x900)
  // ==========================================
  console.log('\n[Step B] Queue Desktop (1440x900)...');
  await page.waitForSelector('[data-testid="tab-active-reviews"]');
  await page.waitForSelector('[data-testid="tab-completed-reviews"]');
  await page.waitForSelector('[data-testid="review-card-4382c511-8a9d-472a-9931-e407db3d91cf"]');

  const queueRefreshBtn = await page.$('[data-testid="refresh-assigned-reviews-button"]');
  const refreshBtnHeight = await page.evaluate(el => el ? el.getBoundingClientRect().height : 0, queueRefreshBtn);
  assert(refreshBtnHeight >= 44, `Queue refresh button height must be >= 44px (got ${refreshBtnHeight}px)`);

  // Hit-test CTA on first card at 25%, 50%, 90%
  const ctaBtn = await page.$('[data-testid="start-review-link-4382c511-8a9d-472a-9931-e407db3d91cf"]');
  const ctaBox = await ctaBtn.boundingBox();
  assert(ctaBox, 'CTA button bounding box must be found');
  assert(ctaBox.height >= 44, `CTA button height must be >= 44px (got ${ctaBox.height}px)`);

  for (const fraction of [0.25, 0.5, 0.9]) {
    const hitPoint = { x: ctaBox.x + ctaBox.width / 2, y: ctaBox.y + ctaBox.height * fraction };
    const hitTarget = await page.evaluate(pt => {
      const el = document.elementFromPoint(pt.x, pt.y);
      return el ? (el.closest('a') ? el.closest('a').getAttribute('data-testid') : null) : null;
    }, hitPoint);
    assert.strictEqual(
      hitTarget,
      'start-review-link-4382c511-8a9d-472a-9931-e407db3d91cf',
      `Hit test at ${fraction * 100}% height must hit CTA button`
    );
  }
  console.log('  ✓ [PASS] CTA button height >= 44px and hit-tested at 25%, 50%, 90%');

  // Test technical details disclosure
  const detailsEl = await page.$('[data-testid="review-card-4382c511-8a9d-472a-9931-e407db3d91cf"] details');
  const isDetailsOpen = await page.evaluate(el => el.open, detailsEl);
  assert.strictEqual(isDetailsOpen, false, 'Technical details disclosure must be CLOSED by default');
  console.log('  ✓ [PASS] Technical details disclosure is default CLOSED');

  await captureScreenshot(page, 'fe_expert_review_01_queue_desktop_1440.png');

  // ==========================================
  // [Step C] Queue Mobile (390x844)
  // ==========================================
  console.log('\n[Step C] Queue Mobile (390x844)...');
  await page.setViewport({ width: 390, height: 844 });
  await page.waitForSelector('[data-testid="start-review-link-4382c511-8a9d-472a-9931-e407db3d91cf"]');

  const mobileCtaBox = await page.$eval(
    '[data-testid="start-review-link-4382c511-8a9d-472a-9931-e407db3d91cf"]',
    el => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    }
  );
  assert(mobileCtaBox.height >= 44, `Mobile CTA height must be >= 44px (got ${mobileCtaBox.height}px)`);
  assert(mobileCtaBox.width > 280, `Mobile CTA should stretch across card width (got ${mobileCtaBox.width}px)`);
  console.log(`  ✓ [PASS] Mobile CTA stretches across card width (${mobileCtaBox.width}px) and height >= 44px`);

  await captureScreenshot(page, 'fe_expert_review_02_queue_mobile_390.png');

  // ==========================================
  // [Step D] Queue Empty & Completed States
  // ==========================================
  console.log('\n[Step D] Queue Completed Tab & Empty States...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.click('[data-testid="tab-completed-reviews"]');
  await page.waitForSelector('[data-testid="review-card-c921f00a-1122-3344-5566-778899aabbcc"]');
  console.log('  ✓ [PASS] Completed tab loaded 1 completed assignment card');

  // Switch back to active tab
  await page.click('[data-testid="tab-active-reviews"]');
  await page.waitForSelector('[data-testid="review-card-4382c511-8a9d-472a-9931-e407db3d91cf"]');

  // ==========================================
  // [Step E] Workspace Desktop (F1, F4 ratio)
  // ==========================================
  console.log('\n[Step E] Workspace Desktop (1440x1100)...');
  await page.setViewport({ width: 1440, height: 1100 });
  await page.click('[data-testid="start-review-link-4382c511-8a9d-472a-9931-e407db3d91cf"]');

  await page.waitForSelector('[data-testid="decision-form-section"]');
  await page.waitForSelector('[data-testid="back-to-queue-link"]');

  // [F1] Verify Assignment Strip DTO Meaning:
  const assignmentStripText = await page.$eval('.bg-surface.border.border-border.rounded-xl.p-4', el => el.textContent);
  assert(assignmentStripText.includes('Chuyên gia phụ trách: TS. Trần Văn Chuyên Gia'), '[F1] Strip must state Chuyên gia phụ trách: TS. Trần Văn Chuyên Gia');
  assert(assignmentStripText.includes('Quản trị viên #1'), '[F1] Strip must state assigner Quản trị viên #1');
  assert(!assignmentStripText.includes('bởi TS. Trần Văn Chuyên Gia'), '[F1] Strip must NOT attribute assignment to the reviewer');
  console.log('  ✓ [PASS] [F1] Assignment strip correctly attributes assigner vs reviewer without self-assignment');

  // [F4] Verify Desktop Column Ratio 65:35
  const layoutRatio = await page.evaluate(() => {
    const reading = document.querySelector('.reading-column');
    const aside = document.querySelector('.workspace-layout aside');
    const layout = document.querySelector('.workspace-layout');
    if (!reading || !aside) return null;
    const rW = reading.getBoundingClientRect().width;
    const aW = aside.getBoundingClientRect().width;
    const total = rW + aW;
    return {
      rW,
      aW,
      ratio: rW / total,
      computedGrid: window.getComputedStyle(layout).gridTemplateColumns,
      classes: layout.className,
    };
  });
  assert(layoutRatio.ratio >= 0.63 && layoutRatio.ratio <= 0.67, `[F4] Column ratio must be ~65:35 (got ${(layoutRatio.ratio * 100).toFixed(1)}%)`);
  console.log(`  ✓ [PASS] [F4] Desktop column ratio verified at ${(layoutRatio.ratio * 100).toFixed(1)}% / ${((1 - layoutRatio.ratio) * 100).toFixed(1)}%`);

  // Verify Sidebar remains active on child workspace route
  const isNavActiveOnWorkspace = await page.$eval(
    'aside nav a[aria-current="page"]',
    el => el.textContent.includes('Nhiệm vụ thẩm định')
  );
  assert(isNavActiveOnWorkspace, 'Sidebar item "Nhiệm vụ thẩm định" must remain active on /knowledge/reviews/:id route');
  console.log('  ✓ [PASS] Sidebar active state preserved on nested workspace route');

  // Verify Metadata disclosures are default CLOSED
  const workspaceDisclosures = await page.$$eval('details', els => els.map(e => e.open));
  assert(workspaceDisclosures.length >= 2, 'Workspace must have at least 2 details disclosures');
  assert(workspaceDisclosures.every(o => o === false), 'All workspace details disclosures must be CLOSED by default');
  console.log('  ✓ [PASS] Workspace technical and metadata disclosures are default CLOSED');

  // Verify Chunk Accordion: Chunk 1 OPEN, Chunk 2 & 3 CLOSED
  await page.waitForSelector('[data-testid="chunk-comment-input-chunk-001"]');
  const chunk2InputExists = await page.$('[data-testid="chunk-comment-input-chunk-002"]');
  assert.strictEqual(chunk2InputExists, null, 'Chunk 2 comment input must not be visible when Chunk 2 is closed');
  console.log('  ✓ [PASS] Chunk 1 is default OPEN; Chunk 2 is default CLOSED');

  // Click Chunk 2 to expand it
  await page.evaluate(() => {
    const chunk2Article = Array.from(document.querySelectorAll('article')).find(a =>
      a.textContent.includes('Đoạn 2')
    );
    if (chunk2Article) chunk2Article.click();
  });
  await page.waitForSelector('[data-testid="chunk-comment-input-chunk-002"]');
  console.log('  ✓ [PASS] Clicking Chunk 2 expands its panel and reveals comment textarea');

  // [F4] Assert NO extra mini tier buttons in form
  const miniTierBtn = await page.$('[data-testid="tier-option-B"]');
  assert.strictEqual(miniTierBtn, null, '[F4] Extra mini tier buttons must be removed from workspace form');
  console.log('  ✓ [PASS] [F4] Extra mini tier buttons removed; approved select dropdown maintained');

  // Verify Form initial state
  const conflictChecked = await page.$eval('[data-testid="conflict-of-interest-checkbox"]', el => el.checked);
  assert.strictEqual(conflictChecked, false, 'Conflict of interest must be UNCHECKED initially');

  const sourceChecked = await page.$eval('[data-testid="checklist-source"]', el => el.checked);
  const faithChecked = await page.$eval('[data-testid="checklist-faithfulness"]', el => el.checked);
  const appChecked = await page.$eval('[data-testid="checklist-applicability"]', el => el.checked);
  assert.strictEqual(sourceChecked, false, 'Source checklist must be UNCHECKED initially');
  assert.strictEqual(faithChecked, false, 'Faithfulness checklist must be UNCHECKED initially');
  assert.strictEqual(appChecked, false, 'Applicability checklist must be UNCHECKED initially');

  const submitBtnDisabled = await page.$eval('[data-testid="open-decision-confirm-button"]', el => el.disabled);
  assert.strictEqual(submitBtnDisabled, true, 'Workspace CTA must be disabled before form is completed');
  console.log('  ✓ [PASS] Form checkboxes initially unchecked and CTA disabled');

  await captureScreenshot(page, 'fe_expert_review_05_workspace_desktop_1440.png');

  // ==========================================
  // [Step F] Workspace Mobile (390x844) & Input 16px (F4)
  // ==========================================
  console.log('\n[Step F] Workspace Mobile (390x844) & 16px Inputs (F4)...');
  await page.setViewport({ width: 390, height: 844 });
  await page.waitForSelector('[data-testid="decision-form-section"]');

  // Check 16px mobile input font size
  const mobileInputFonts = await page.evaluate(() => {
    const reasonEl = document.querySelector('[data-testid="decision-reason-input"]');
    const tierEl = document.querySelector('[data-testid="tier-rationale-input"]');
    const chunkEl = document.querySelector('[data-testid="chunk-comment-input-chunk-001"]');
    return {
      reason: reasonEl ? window.getComputedStyle(reasonEl).fontSize : null,
      tier: tierEl ? window.getComputedStyle(tierEl).fontSize : null,
      chunk: chunkEl ? window.getComputedStyle(chunkEl).fontSize : null,
    };
  });
  assert.strictEqual(mobileInputFonts.reason, '16px', '[F4] Mobile reason input font must be 16px to prevent iOS zoom');
  assert.strictEqual(mobileInputFonts.tier, '16px', '[F4] Mobile tier rationale input font must be 16px to prevent iOS zoom');
  console.log('  ✓ [PASS] [F4] Mobile input font size is 16px (prevents iOS auto-zoom)');

  // Check reading column comes before decision form column
  const columnOrder = await page.evaluate(() => {
    const reading = document.querySelector('.reading-column');
    const form = document.querySelector('.workspace-layout aside') || document.querySelector('[data-testid="decision-form-section"]');
    if (!reading || !form) return null;
    const rRect = reading.getBoundingClientRect();
    const fRect = form.getBoundingClientRect();
    return { readingTop: rRect.top, formTop: fRect.top };
  });
  assert(columnOrder.readingTop < columnOrder.formTop, 'Mobile reading column must precede decision form column');
  console.log('  ✓ [PASS] Mobile reading column precedes decision form stacked vertically');

  await captureScreenshot(page, 'fe_expert_review_06_workspace_mobile_390.png');

  // ==========================================
  // [Step G] Complete Form & Confirmation Modal (F3, F4)
  // ==========================================
  console.log('\n[Step G] Completing Form & Confirmation Modal Modality (F3, F4)...');
  await page.setViewport({ width: 1440, height: 900 });

  // Fill chunk comment on chunk 1
  await page.type('[data-testid="chunk-comment-input-chunk-001"]', 'Lưu ý đo lưu lượng nước tưới chính xác.');

  // Check conflict of interest & checklists
  await page.click('[data-testid="conflict-of-interest-checkbox"]');
  await page.click('[data-testid="checklist-source"]');
  await page.click('[data-testid="checklist-faithfulness"]');
  await page.click('[data-testid="checklist-applicability"]');

  // Select Tier B in dropdown
  await page.select('[data-testid="knowledge-tier-select"]', 'B');

  // Fill tier rationale and decision reason
  await page.type(
    '[data-testid="tier-rationale-input"]',
    'Tài liệu nghiên cứu và hướng dẫn kỹ thuật chính thống từ trường Đại học Cần Thơ.'
  );
  await page.type(
    '[data-testid="decision-reason-input"]',
    'Hồ sơ chuẩn hóa đạt yêu cầu chuyên môn cao, dữ liệu tưới nước và nồng độ mặn chính xác.'
  );

  // Assert CTA is now enabled
  const isCtaEnabled = await page.$eval('[data-testid="open-decision-confirm-button"]', el => !el.disabled);
  assert(isCtaEnabled, 'Workspace CTA must be enabled when form requirements are met');
  console.log('  ✓ [PASS] Workspace CTA button enabled after filling valid form data');

  // Open Confirmation Modal
  await page.click('[data-testid="open-decision-confirm-button"]');
  await page.waitForSelector('[data-testid="confirm-decision-submit-button"]');
  await page.waitForSelector('[data-testid="close-decision-modal-button"]');

  // [F3] Verify Modal Modality & Lifecycle
  const modalityMetrics = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const panel = dialog ? dialog.firstElementChild : null;
    const activeEl = document.activeElement;
    return {
      parentIsBody: dialog ? dialog.parentElement === document.body : false,
      focusInside: dialog ? dialog.contains(activeEl) : false,
      activeTag: activeEl ? activeEl.tagName : null,
      panelRadius: panel ? window.getComputedStyle(panel).borderRadius : null,
    };
  });
  assert(modalityMetrics.parentIsBody, '[F3] Modal must be mounted via portal to document.body');
  assert(modalityMetrics.focusInside, '[F3] Initial focus must be inside dialog');
  assert.strictEqual(modalityMetrics.panelRadius, '12px', '[F4] Modal panel radius must be 12px (rounded-xl)');
  console.log('  ✓ [PASS] [F3, F4] Modal mounted to body, initial focus trapped inside, radius = 12px');

  // [F3] Verify Focus Containment (Tab cycling trapped)
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const isFocusInside = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog ? dialog.contains(document.activeElement) : false;
    });
    assert(isFocusInside, `[F3] Focus cycle #${i + 1} must remain inside modal dialog`);
  }
  console.log('  ✓ [PASS] [F3] Tab keyboard cycling strictly trapped inside dialog');

  // [F3] Test Escape key safely closes dialog and returns focus
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  const returnFocusTag = await page.evaluate(() => document.activeElement ? document.activeElement.getAttribute('data-testid') : null);
  assert.strictEqual(returnFocusTag, 'open-decision-confirm-button', '[F3] Dismissing modal must return focus to trigger CTA');
  console.log('  ✓ [PASS] [F3] Escape safely dismissed modal and returned focus to trigger button');

  // Reopen modal for backdrop dismissal test
  await page.click('[data-testid="open-decision-confirm-button"]');
  await page.waitForSelector('[role="dialog"]');
  // Click backdrop outside panel
  await page.mouse.click(10, 10);
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  console.log('  ✓ [PASS] [F3] Backdrop click safely dismissed modal');

  // Reopen modal for visual verification
  await page.click('[data-testid="open-decision-confirm-button"]');
  await page.waitForSelector('[role="dialog"]');

  // [F4] Verify Equal 24/r6 Badges and Modal Typography
  const modalVisuals = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const panel = dialog ? dialog.firstElementChild : null;
    const body = panel ? panel.querySelector('.overflow-y-auto') : null;
    const outcomeBadge = dialog ? dialog.querySelector('[data-testid="decision-outcome-badge"]') : null;
    const tierBadge = dialog ? dialog.querySelector('.inline-flex.items-center.gap-1\\.5 > span') : null;
    const confirmBtn = dialog ? dialog.querySelector('[data-testid="confirm-decision-submit-button"]') : null;

    const bCs = body ? window.getComputedStyle(body) : null;
    const oR = outcomeBadge ? outcomeBadge.getBoundingClientRect() : null;
    const tR = tierBadge ? tierBadge.getBoundingClientRect() : null;
    const oCs = outcomeBadge ? window.getComputedStyle(outcomeBadge) : null;
    const tCs = tierBadge ? window.getComputedStyle(tierBadge) : null;

    return {
      bodyFontSize: bCs ? bCs.fontSize : null,
      bodyLineHeight: bCs ? bCs.lineHeight : null,
      outcomeHeight: oR ? oR.height : null,
      tierHeight: tR ? tR.height : null,
      outcomeRadius: oCs ? oCs.borderRadius : null,
      tierRadius: tCs ? tCs.borderRadius : null,
      confirmBtnText: confirmBtn ? confirmBtn.textContent.trim() : null,
    };
  });

  assert.strictEqual(modalVisuals.bodyFontSize, '14px', '[F4] Modal body font size must be 14px');
  assert.strictEqual(modalVisuals.bodyLineHeight, '22px', '[F4] Modal body line height must be 22px');
  assert.strictEqual(modalVisuals.outcomeHeight, 24, '[F4] Outcome badge height must be 24px');
  assert.strictEqual(modalVisuals.tierHeight, 24, '[F4] Tier badge height must be 24px');
  assert.strictEqual(modalVisuals.outcomeRadius, '6px', '[F4] Outcome badge radius must be 6px');
  assert.strictEqual(modalVisuals.tierRadius, '6px', '[F4] Tier badge radius must be 6px');
  assert(modalVisuals.confirmBtnText.includes('Gửi quyết định'), '[F4] Confirm CTA must read "Gửi quyết định" without unapproved legal text');
  console.log('  ✓ [PASS] [F4] 14/22 typography, equal 24/r6 badges, and "Gửi quyết định" CTA verified');

  await captureScreenshot(page, 'fe_expert_review_07_confirm_modal_desktop.png');

  // [F4] Check modal on mobile (390x844) - Assert NO horizontal overflow
  await page.setViewport({ width: 390, height: 844 });
  await page.waitForSelector('[data-testid="confirm-decision-submit-button"]');

  const mobileOverflowMetrics = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const panel = dialog ? dialog.firstElementChild : null;
    const body = panel ? panel.querySelector('.overflow-y-auto') : null;
    return {
      scrollWidth: body ? body.scrollWidth : 0,
      clientWidth: body ? body.clientWidth : 0,
      panelWidth: panel ? panel.getBoundingClientRect().width : 0,
    };
  });
  assert(
    mobileOverflowMetrics.scrollWidth <= mobileOverflowMetrics.clientWidth,
    `[F4] Mobile modal body must not overflow horizontally (scrollWidth ${mobileOverflowMetrics.scrollWidth} <= clientWidth ${mobileOverflowMetrics.clientWidth})`
  );
  console.log(`  ✓ [PASS] [F4] Mobile modal scrollWidth (${mobileOverflowMetrics.scrollWidth}px) <= clientWidth (${mobileOverflowMetrics.clientWidth}px); zero horizontal overflow`);

  // Assert primary button stacked above secondary button on mobile
  const buttonStacking = await page.evaluate(() => {
    const confirmBtn = document.querySelector('[data-testid="confirm-decision-submit-button"]');
    const cancelBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b =>
      b.textContent.includes('Xem lại')
    );
    if (!confirmBtn || !cancelBtn) return null;
    return {
      confirmTop: confirmBtn.getBoundingClientRect().top,
      cancelTop: cancelBtn.getBoundingClientRect().top,
    };
  });
  assert(
    buttonStacking.confirmTop < buttonStacking.cancelTop,
    'On mobile modal footer, confirm button must be stacked above cancel button'
  );
  console.log('  ✓ [PASS] On mobile, confirm button is stacked above secondary button');

  await captureScreenshot(page, 'fe_expert_review_08_confirm_modal_mobile.png');

  // ==========================================
  // [Step H] R2 In-Flight Decision POST Focus Containment & 409 Conflict
  // ==========================================
  console.log('\n[Step H] In-Flight Decision POST Focus Containment (R2) & 409 Conflict...');
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Hold first decision POST
  holdDecisionPost = true;
  heldDecisionPost = null;
  await page.click('[data-testid="confirm-decision-submit-button"]');
  for (let i = 0; i < 100 && !heldDecisionPost; i++) await new Promise(r => setTimeout(r, 20));
  assert(heldDecisionPost, '[R2] Expected a real pending decision POST');
  await new Promise(r => setTimeout(r, 100));

  // Assert focus trapped inside dialog during in-flight submission
  const pendingFocus = await page.evaluate(() => ({
    inside: !!document.querySelector('[role="dialog"]')?.contains(document.activeElement),
    activeId: document.activeElement?.getAttribute('data-testid'),
    activeTag: document.activeElement?.tagName,
    dialogPresent: !!document.querySelector('[role="dialog"]'),
    submitDisabled: document.querySelector('[data-testid="confirm-decision-submit-button"]')?.disabled,
  }));
  console.log('  [DEBUG R2 pendingFocus]', JSON.stringify(pendingFocus));
  assert(pendingFocus.dialogPresent, '[R2] Dialog must remain open during in-flight decision submission');
  assert(pendingFocus.submitDisabled, '[R2] Submit button must be disabled while submission is in-flight');
  assert(pendingFocus.inside, '[R2] Focus must remain trapped inside dialog during in-flight decision submission');

  // Assert Tab key while in-flight stays trapped inside dialog
  await page.keyboard.press('Tab');
  const pendingFocusAfterTab = await page.evaluate(() => ({
    inside: !!document.querySelector('[role="dialog"]')?.contains(document.activeElement),
    activeId: document.activeElement?.getAttribute('data-testid'),
  }));
  assert(pendingFocusAfterTab.inside, '[R2] Tab key while pending must remain trapped inside dialog');

  // Assert Escape and backdrop click are blocked while in-flight
  await page.keyboard.press('Escape');
  assert(await page.$eval('[role="dialog"]', el => !!el), '[R2] Escape key must be blocked during in-flight submission');
  await page.mouse.click(10, 10);
  assert(await page.$eval('[role="dialog"]', el => !!el), '[R2] Backdrop click must be blocked during in-flight submission');

  // 2. Respond to decision POST with 409 Conflict
  holdDecisionPost = false;
  await heldDecisionPost.respond({
    status: 409,
    headers: CORS_HEADERS,
    contentType: 'application/json',
    body: JSON.stringify({
      code: 'stale_version',
      message: 'Phiên bản hồ sơ đã thay đổi trên máy chủ (409 Conflict).',
    }),
  });
  heldDecisionPost = null;

  await page.waitForSelector('[data-testid="decision-error-banner"]');
  await page.waitForSelector('[data-testid="reload-and-verify-button"]');

  const isSubmitLocked = await page.$eval('[data-testid="confirm-decision-submit-button"]', btn => btn.disabled);
  assert(isSubmitLocked, 'Submit button must be disabled upon 409 conflict');
  console.log('  ✓ [PASS] [R2] In-flight decision POST trapped focus inside dialog, blocked Escape/backdrop, and 409 locked submit button');

  // ==========================================
  // [Step I] R2 In-Flight Readback GET & F2 Readback GET 500 Failure
  // ==========================================
  console.log('\n[Step I] In-Flight Readback Focus (R2) & Verification Readback GET 500 (F2)...');

  // Hold readback GET
  holdReadbackGet = true;
  heldReadbackGet = null;
  await page.click('[data-testid="reload-and-verify-button"]');
  for (let i = 0; i < 100 && !heldReadbackGet; i++) await new Promise(r => setTimeout(r, 20));
  assert(heldReadbackGet, '[R2] Expected a real pending readback GET for assignment A');
  await new Promise(r => setTimeout(r, 50));

  // Assert focus trapped inside dialog during in-flight readback
  const pendingReadbackFocus = await page.evaluate(() => ({
    inside: !!document.querySelector('[role="dialog"]')?.contains(document.activeElement),
    reloadDisabled: document.querySelector('[data-testid="reload-and-verify-button"]')?.disabled,
  }));
  assert(pendingReadbackFocus.reloadDisabled, '[R2] Reload button must be disabled while readback is in-flight');
  assert(pendingReadbackFocus.inside, '[R2] Focus must remain trapped inside dialog during in-flight readback');

  // Assert Tab while in-flight readback stays inside dialog
  await page.keyboard.press('Tab');
  const pendingReadbackFocusAfterTab = await page.evaluate(() => ({
    inside: !!document.querySelector('[role="dialog"]')?.contains(document.activeElement),
  }));
  assert(pendingReadbackFocusAfterTab.inside, '[R2] Tab key while readback is pending must remain inside dialog');

  // Assert Escape and backdrop click are blocked while readback is in-flight
  await page.keyboard.press('Escape');
  assert(await page.$eval('[role="dialog"]', el => !!el), '[R2] Escape must be blocked while readback is pending');
  await page.mouse.click(10, 10);
  assert(await page.$eval('[role="dialog"]', el => !!el), '[R2] Backdrop click must be blocked while readback is pending');

  // Release readback GET with 500 failure
  holdReadbackGet = false;
  await heldReadbackGet.respond({
    status: 500,
    headers: CORS_HEADERS,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Lỗi nạp dữ liệu từ máy chủ (GET 500 simulated).' }),
  });
  heldReadbackGet = null;
  await new Promise(r => setTimeout(r, 300));

  // [F2] Assert modal is STILL MOUNTED and visible
  const isModalStillVisible = await page.$eval('[role="dialog"]', el => !!el);
  assert(isModalStillVisible, '[F2] Verification readback GET 500 must NOT unmount modal dialog');

  // [F2] Assert page did NOT become ErrorState
  const isPageInErrorState = await page.evaluate(() => document.body.innerText.includes('Không thể tải chi tiết nhiệm vụ'));
  assert.strictEqual(isPageInErrorState, false, '[F2] Readback failure must NOT replace page with full-page ErrorState');

  // [F2] Assert form reason input is still present with preserved content
  const preservedReason = await page.$eval('[data-testid="decision-reason-input"]', el => el.value);
  assert(preservedReason.length > 10, '[F2] Form reason must be completely preserved across readback failure');

  // [F2] Assert modal error banner displays retry error
  const modalErrorText = await page.$eval('[data-testid="decision-error-banner"]', el => el.textContent);
  assert(modalErrorText.includes('Không thể tải lại dữ liệu'), '[F2] Modal must display readback retry error');

  // [F2] Assert confirm submit button remains locked
  const isSubmitStillLocked = await page.$eval('[data-testid="confirm-decision-submit-button"]', btn => btn.disabled);
  assert(isSubmitStillLocked, '[F2] Submit button must remain disabled while readback failed');
  assert(readbackCount >= 1, '[F2] Readback request count must be >= 1');
  console.log('  ✓ [PASS] [F2, R2] Readback GET 500 kept modal mounted, preserved all form state, showed retry error, locked submission, kept focus inside');

  // ==========================================
  // [Step J] R1 Same-Component A->B SPA Navigation with Held Stale Readback
  // ==========================================
  console.log('\n[Step J] Same-Component A->B SPA Navigation with Held A Readback (R1)...');

  // Trigger held readback on A
  holdReadbackGet = true;
  heldReadbackGet = null;
  await page.click('[data-testid="reload-and-verify-button"]');
  for (let i = 0; i < 100 && !heldReadbackGet; i++) await new Promise(r => setTimeout(r, 20));
  assert(heldReadbackGet, '[R1] Expected held readback GET for assignment A');
  const heldA = heldReadbackGet;

  // Navigate to B via client-side popstate
  await page.evaluate(() => {
    history.pushState({}, '', '/knowledge/reviews/8b91f04a-4e2b-4221-a182-3df8c0499e12');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForFunction(() => document.querySelector('h1')?.innerText === 'INDEPENDENT SOURCE B');

  // Type draft note on B
  await page.type('[data-testid="decision-reason-input"]', 'B draft must survive stale A readback');

  const beforeLateA = await page.evaluate(() => ({
    route: location.pathname,
    title: document.querySelector('h1')?.innerText,
    reason: document.querySelector('[data-testid="decision-reason-input"]')?.value,
  }));
  assert.strictEqual(beforeLateA.route, '/knowledge/reviews/8b91f04a-4e2b-4221-a182-3df8c0499e12');
  assert.strictEqual(beforeLateA.title, 'INDEPENDENT SOURCE B');
  assert.strictEqual(beforeLateA.reason, 'B draft must survive stale A readback');

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'before-late-a.png'), fullPage: false });

  // Release A's held readback with 200 OK (stale success)
  holdReadbackGet = false;
  heldReadbackGet = null;
  await heldA.respond({
    status: 200,
    headers: CORS_HEADERS,
    contentType: 'application/json',
    body: JSON.stringify(serverAssignmentState),
  });
  await new Promise(r => setTimeout(r, 250));

  const afterLateA = await page.evaluate(() => ({
    route: location.pathname,
    title: document.querySelector('h1')?.innerText,
    reason: document.querySelector('[data-testid="decision-reason-input"]')?.value,
  }));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'after-late-a.png'), fullPage: false });

  assert.strictEqual(afterLateA.title, beforeLateA.title, '[R1] Stale A readback must NOT overwrite B title');
  assert.strictEqual(afterLateA.reason, beforeLateA.reason, '[R1] Stale A readback must NOT wipe B draft reason');

  const observations = {
    pendingFocus,
    pendingFocusAfterTab,
    beforeLateA,
    afterLateA,
    postCount: submissionCount,
    staleResponseIgnored: afterLateA.title === beforeLateA.title && afterLateA.reason === beforeLateA.reason,
  };
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'independent-observations.json'), JSON.stringify(observations, null, 2));
  console.log('  ✓ [PASS] [R1] Stale response from A discarded on B: title and draft reason completely preserved');
  console.log(`    Observations: staleResponseIgnored=${observations.staleResponseIgnored}`);

  // Test unmount while in flight
  console.log('  Testing [R1]: Workspace unmount safety...');
  await page.evaluate(() => {
    history.pushState({}, '', '/knowledge/reviews');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForSelector('[data-testid="tab-active-reviews"]');
  console.log('  ✓ [PASS] [R1] Workspace cleanly unmounted to queue route without errors');

  // ==========================================
  // [Step K] Same-Task Readback 200 Synchronization & Final Decision Submit
  // ==========================================
  console.log('\n[Step K] Same-Task Synchronization & Final Decision Submit...');
  holdReadbackGet = false;
  holdDecisionPost = false;

  // Navigate back to A via queue start-review link
  await page.waitForSelector('[data-testid="start-review-link-4382c511-8a9d-472a-9931-e407db3d91cf"]');
  await page.click('[data-testid="start-review-link-4382c511-8a9d-472a-9931-e407db3d91cf"]');
  await page.waitForSelector('[data-testid="decision-form-section"]');

  // Fill form on A
  await page.click('[data-testid="conflict-of-interest-checkbox"]');
  await page.click('[data-testid="checklist-source"]');
  await page.click('[data-testid="checklist-faithfulness"]');
  await page.click('[data-testid="checklist-applicability"]');
  await page.select('[data-testid="knowledge-tier-select"]', 'B');
  await page.type('[data-testid="tier-rationale-input"]', 'Tài liệu nghiên cứu và hướng dẫn kỹ thuật chính thống từ Trường Đại học Cần Thơ.');
  await page.type('[data-testid="decision-reason-input"]', 'Hồ sơ chuẩn hóa đạt yêu cầu chuyên môn cao, dữ liệu tưới nước và nồng độ mặn chính xác.');

  // Open confirm modal
  await page.click('[data-testid="open-decision-confirm-button"]');
  await page.waitForSelector('[role="dialog"]');

  // Submit decision (submissionCount is now >= 2 so it succeeds with 200 OK)
  await page.click('[data-testid="confirm-decision-submit-button"]');

  // Workspace transitions to completed decision view
  await page.waitForSelector('[data-testid="completed-decision-card"]');
  console.log('  ✓ [PASS] Decision submitted successfully, workspace transitioned to COMPLETED state');

  await captureScreenshot(page, 'fe_expert_review_09_completed_desktop.png');

  // Close browser and server
  await browser.close();
  server.close();

  // Save evidence manifest to task-owned directory only
  const manifestPath = path.join(EVIDENCE_DIR, 'expert-review-evidence-hashes.json');
  fs.writeFileSync(manifestPath, JSON.stringify(evidenceHashes, null, 2), 'utf8');
  console.log(`\nSaved evidence manifest to ${manifestPath} (${Object.keys(evidenceHashes).length} items)`);

  console.log('\n================================================================');
  console.log('ALL EXPERT REVIEW TARGETED REMEDIATION ASSERTIONS PASSED!');
  console.log('================================================================');
}

runVerification().catch(err => {
  console.error('\nVerification failed with error:');
  console.error(err);
  process.exit(1);
});
