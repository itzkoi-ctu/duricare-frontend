import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = 'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence';
const PORT = 5183;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Ensure evidence directory exists
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// Local SPA static server for worktree dist
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
    let filePath = path.join(distDir, urlPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    // SPA fallback
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

// Mock Entities
const ADMIN_USER = { email: 'admin@duricare.vn', role: 'ADMIN', farmId: null };
const EXPERT_USER = { email: 'expert@duricare.vn', role: 'EXPERT', farmId: null };

const VERIFIED_EXPERT_PROFILE = {
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

const PENDING_EXPERT_PROFILE = {
  ...VERIFIED_EXPERT_PROFILE,
  verificationStatus: 'PENDING',
};

// Mock Sources
const SOURCE_ADMIN_DRAFT = {
  id: 'src-admin-01',
  ownerUserId: 1,
  ownerDisplayName: 'Quản trị viên',
  createdAt: '2026-10-20T08:00:00Z',
  updatedAt: '2026-10-20T08:00:00Z',
  version: 1,
  latestRevisionId: 'rev-admin-01',
  latestRevision: {
    id: 'rev-admin-01',
    sourceId: 'src-admin-01',
    revisionNumber: 1,
    status: 'DRAFT',
    version: 1,
    title: 'Quy trình phòng ngừa bệnh thối rễ Phytophthora trên sầu riêng',
    updatedAt: '2026-10-20T08:00:00Z',
    submittedAt: null,
  },
};

const REVISION_ADMIN_DRAFT = {
  id: 'rev-admin-01',
  sourceId: 'src-admin-01',
  revisionNumber: 1,
  status: 'DRAFT',
  title: 'Quy trình phòng ngừa bệnh thối rễ Phytophthora trên sầu riêng',
  version: 1,
  submittedAt: null,
  updatedAt: '2026-10-20T08:00:00Z',
  baseRevisionId: null,
  metadata: {
    title: 'Quy trình phòng ngừa bệnh thối rễ Phytophthora trên sầu riêng',
    authors: 'Cục Trồng trọt',
    publisher: 'Bộ Nông nghiệp & PTNT',
    sourceType: 'OFFICIAL_DOCUMENT',
    year: 2024,
    edition: 'Lần 1',
    sourceUrl: 'https://cuctrongtrot.gov.vn/tai-lieu/phytophthora.pdf',
    evidenceReference: 'QĐ 352/QĐ-TT-CCN',
    provenanceNotes: 'Văn bản hướng dẫn kỹ thuật chính thức',
    proposedTier: 'A',
    proposedTierRationale: 'Tài liệu hướng dẫn quy chuẩn cấp Bộ',
  },
  chunks: [
    {
      chunkId: 'chk-admin-01',
      position: 0,
      title: 'Triệu chứng bệnh thối rễ và xì mủ thân',
      topic: 'GENERAL',
      stage: 'PHAT_TRIEN_TRAI',
      content: 'Nấm Phytophthora palmivora tấn công vùng cổ rễ và vỏ thân, làm chảy mủ nâu đỏ, lá vàng úa và rụng dần.',
      originalExcerpt: 'Vết bệnh ban đầu là những đốm sũng nước trên vỏ thân, sau đó thâm đen và ứa mủ vàng trong suốt.',
      locator: 'Trang 12, Mục 2.1',
      applicabilityNotes: 'Mọi vùng trồng sầu riêng ĐBSCL và Đông Nam Bộ',
      measurementNotes: 'Quan sát định kỳ 7 ngày/lần vào mùa mưa',
    },
  ],
  createdAt: '2026-10-20T08:00:00Z',
  closedAt: null,
  tierPolicyVersion: 'v1.0',
  assessedTier: null,
  tierRationale: null,
};

const SOURCE_EXPERT_DRAFT = {
  id: 'src-expert-02',
  ownerUserId: 42,
  ownerDisplayName: 'TS. Trần Văn Chuyên Gia',
  createdAt: '2026-10-21T09:00:00Z',
  updatedAt: '2026-10-21T09:00:00Z',
  version: 1,
  latestRevisionId: 'rev-expert-02',
  latestRevision: {
    id: 'rev-expert-02',
    sourceId: 'src-expert-02',
    revisionNumber: 1,
    status: 'DRAFT',
    version: 1,
    title: 'Khảo sát hiệu quả bón phân hữu cơ sinh học trên đất phù sa cổ',
    updatedAt: '2026-10-21T09:00:00Z',
    submittedAt: null,
  },
};

const REVISION_EXPERT_DRAFT = {
  id: 'rev-expert-02',
  sourceId: 'src-expert-02',
  revisionNumber: 1,
  status: 'DRAFT',
  title: 'Khảo sát hiệu quả bón phân hữu cơ sinh học trên đất phù sa cổ',
  version: 1,
  submittedAt: null,
  updatedAt: '2026-10-21T09:00:00Z',
  baseRevisionId: null,
  metadata: {
    title: 'Khảo sát hiệu quả bón phân hữu cơ sinh học trên đất phù sa cổ',
    authors: 'Khoa Nông nghiệp ĐH Cần Thơ',
    publisher: 'Tạp chí Khoa học ĐH Cần Thơ',
    sourceType: 'RESEARCH_PUBLICATION',
    year: 2025,
    edition: null,
    sourceUrl: 'https://sj.ctu.edu.vn/article/view/1234',
    evidenceReference: 'CTU-AGRI-2025-04',
    provenanceNotes: 'Đề tài NCKH cấp cơ sở',
    proposedTier: 'B',
    proposedTierRationale: 'Công trình nghiên cứu có phản biện khoa học',
  },
  chunks: [
    {
      chunkId: 'chk-exp-01',
      position: 0,
      title: 'Tăng cường hệ vi sinh vật đối kháng vùng rễ',
      topic: 'FERTILIZATION',
      stage: 'KIEN_THIET_CO_BAN',
      content: 'Bón bổ sung Trichoderma kết hợp phân chuồng ủ hoai 20-30kg/cây/năm giúp cải thiện mật độ vi sinh vật có ích.',
      originalExcerpt: 'Mật độ nấm đối kháng Trichoderma đạt 10^6 CFU/g đất sau 30 ngày xử lý.',
      locator: 'Trang 45, Bảng 3',
      applicabilityNotes: 'Đất phù sa có độ pH từ 5.5 - 6.5',
      measurementNotes: 'Đo mật độ CFU định kỳ 6 tháng',
    },
  ],
  createdAt: '2026-10-21T09:00:00Z',
  closedAt: null,
  tierPolicyVersion: 'v1.0',
  assessedTier: null,
  tierRationale: null,
};

const SOURCE_SUBMITTED = {
  id: 'src-sub-03',
  ownerUserId: 42,
  ownerDisplayName: 'TS. Trần Văn Chuyên Gia',
  createdAt: '2026-10-15T08:00:00Z',
  updatedAt: '2026-10-16T08:00:00Z',
  version: 2,
  latestRevisionId: 'rev-sub-03',
  latestRevision: {
    id: 'rev-sub-03',
    sourceId: 'src-sub-03',
    revisionNumber: 2,
    status: 'SUBMITTED',
    version: 2,
    title: 'Kỹ thuật xiết nước tạo mầm hoa sầu riêng Ri6',
    updatedAt: '2026-10-16T08:00:00Z',
    submittedAt: '2026-10-16T08:00:00Z',
  },
};

const REVISION_SUBMITTED = {
  ...REVISION_EXPERT_DRAFT,
  id: 'rev-sub-03',
  sourceId: 'src-sub-03',
  status: 'SUBMITTED',
  title: 'Kỹ thuật xiết nước tạo mầm hoa sầu riêng Ri6',
  version: 2,
  submittedAt: '2026-10-16T08:00:00Z',
};

async function setupPageInterception(page, user, profile) {
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    const method = req.method();

    // Only intercept API calls, let document navigation pass to local SPA server
    if (req.resourceType() === 'document' || req.resourceType() === 'script' || req.resourceType() === 'stylesheet' || req.resourceType() === 'image') {
      return req.continue();
    }

    // CORS preflight
    if (method === 'OPTIONS') {
      return req.respond({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-XSRF-TOKEN',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }

    const headers = {
      'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-XSRF-TOKEN',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json',
    };

    // CSRF & Refresh
    if (url.includes('/auth/csrf')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify({ token: 'mock-csrf-token' }),
      });
    }

    if (url.includes('/auth/refresh')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify({ accessToken: 'mock-jwt-token' }),
      });
    }

    if (url.includes('/auth/me')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify(user),
      });
    }

    if (url.includes('/expert/profile')) {
      if (user.role === 'EXPERT' && profile) {
        return req.respond({
          status: 200,
          headers,
          body: JSON.stringify(profile),
        });
      }
      return req.respond({
        status: 403,
        headers,
        body: JSON.stringify({ message: 'Forbidden' }),
      });
    }

    // Specific source history
    if (url.includes('/knowledge/sources/src-admin-01/history')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
      });
    }
    if (url.includes('/knowledge/sources/src-expert-02/history')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
      });
    }
    if (url.includes('/knowledge/sources/src-sub-03/history')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
      });
    }

    // Specific source details
    if (url.includes('/knowledge/sources/src-admin-01')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify(SOURCE_ADMIN_DRAFT),
      });
    }
    if (url.includes('/knowledge/sources/src-expert-02')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify(SOURCE_EXPERT_DRAFT),
      });
    }
    if (url.includes('/knowledge/sources/src-sub-03')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify(SOURCE_SUBMITTED),
      });
    }

    // Sources list
    if (url.includes('/knowledge/sources?') || url.endsWith('/knowledge/sources')) {
      if (method === 'GET') {
        return req.respond({
          status: 200,
          headers,
          body: JSON.stringify({
            content: [SOURCE_ADMIN_DRAFT, SOURCE_EXPERT_DRAFT, SOURCE_SUBMITTED],
            page: 0,
            size: 20,
            totalElements: 3,
            totalPages: 1,
          }),
        });
      }
    }

    // Revision detail & save
    if (url.includes('/knowledge/revisions/rev-admin-01')) {
      if (method === 'PUT') {
        return req.respond({
          status: 200,
          headers,
          body: JSON.stringify({ ...REVISION_ADMIN_DRAFT, version: 2 }),
        });
      }
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify(REVISION_ADMIN_DRAFT),
      });
    }

    if (url.includes('/knowledge/revisions/rev-expert-02')) {
      if (method === 'PUT') {
        // If current user is ADMIN attempting to save an EXPERT's draft, backend denies with 403 Forbidden!
        if (user.role === 'ADMIN') {
          return req.respond({
            status: 403,
            headers,
            body: JSON.stringify({
              status: 403,
              error: 'forbidden',
              message: 'Bạn không có quyền thực hiện thao tác này.',
            }),
          });
        }
        return req.respond({
          status: 200,
          headers,
          body: JSON.stringify({ ...REVISION_EXPERT_DRAFT, version: 2 }),
        });
      }
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify(REVISION_EXPERT_DRAFT),
      });
    }

    if (url.includes('/knowledge/revisions/rev-sub-03')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify(REVISION_SUBMITTED),
      });
    }

    if (url.includes('/farms')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify([{ id: 1, name: 'Vườn Sầu Riêng Phong Điền', location: 'Cần Thơ', area: 2.5 }]),
      });
    }

    if (url.includes('/zones')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify([{ id: 1, code: 'ZONE-01', name: 'Khu A', area: 1.2 }]),
      });
    }

    if (url.includes('/overview')) {
      return req.respond({
        status: 200,
        headers,
        body: JSON.stringify({ zones: [] }),
      });
    }

    // Default continue
    req.continue();
  });
}

async function run() {
  console.log(`Starting local SPA server on port ${PORT}...`);
  const server = await startWorktreeSpaServer(PORT);
  console.log(`Server started at ${BASE_URL}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // -------------------------------------------------------------
    // Test 1: ADMIN viewing ADMIN-owned draft detail & navigating to edit
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing ADMIN viewing and editing draft ---');
    const page1 = await browser.newPage();
    await page1.setViewport({ width: 1440, height: 900 });
    page1.on('console', msg => console.log('PAGE1 LOG:', msg.text()));
    page1.on('pageerror', err => console.error('PAGE1 ERROR:', err));
    await setupPageInterception(page1, ADMIN_USER, null);

    await page1.goto(`${BASE_URL}/knowledge/sources/src-admin-01`, { waitUntil: 'networkidle0' });

    // Assert edit button is rendered
    const editBtn = await page1.$('[data-testid="draft-edit-button"]');
    if (!editBtn) throw new Error('draft-edit-button was not rendered for ADMIN on DRAFT source!');
    console.log('  ✓ [DOM ASSERTION PASS] draft-edit-button is rendered for ADMIN');

    const editBtnTitle = await page1.$eval('[data-testid="draft-edit-button"]', el => el.getAttribute('title'));
    console.log(`  Button title attribute: "${editBtnTitle}"`);
    if (!editBtnTitle.includes('Máy chủ sẽ xác thực quyền sở hữu')) {
      throw new Error(`Expected disclaimer in button title, got: ${editBtnTitle}`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] Admin disclaimer present in draft edit button title');

    // Navigate to Edit page
    await page1.goto(`${BASE_URL}/knowledge/sources/src-admin-01/revisions/rev-admin-01/edit`, { waitUntil: 'networkidle0' });

    // Assert admin-edit-notice is visible
    const adminNotice = await page1.$('[data-testid="admin-edit-notice"]');
    if (!adminNotice) throw new Error('admin-edit-notice was not rendered on edit page for ADMIN!');
    console.log('  ✓ [DOM ASSERTION PASS] admin-edit-notice rendered on KnowledgeSourceEditPage');

    const screenshot1 = path.join(EVIDENCE_DIR, 'fe03_01_admin_owned_draft_edit_1440.png');
    await page1.screenshot({ path: screenshot1 });
    console.log(`  ✓ Captured: ${screenshot1}`);
    await page1.close();

    // -------------------------------------------------------------
    // Test 2: ADMIN attempting to save another user's draft (HTTP 403 Forbidden handling)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing ADMIN 403 Forbidden handling on foreign draft ---');
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 1440, height: 900 });
    await setupPageInterception(page2, ADMIN_USER, null);

    // Go directly to edit page of expert-created draft
    await page2.goto(`${BASE_URL}/knowledge/sources/src-expert-02/revisions/rev-expert-02/edit`, { waitUntil: 'networkidle0' });

    // Click submit button
    const submitBtn = await page2.$('button[type="submit"]');
    if (!submitBtn) throw new Error('Submit button not found on edit page');
    await submitBtn.click();

    // Wait for 403 error banner to appear
    await page2.waitForSelector('[data-testid="governance-error-banner"]', { timeout: 5000 });
    const errorText = await page2.$eval('[data-testid="governance-error-banner"]', el => el.textContent.trim());
    console.log(`  Error banner text: "${errorText}"`);
    if (!errorText.includes('403 Forbidden') && !errorText.includes('quyền')) {
      throw new Error(`Expected 403 / permission error in banner, got: ${errorText}`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] 403 Forbidden clearly presented in governance-error-banner');

    // Confirm that page did NOT redirect and form content remains intact
    const currentUrl = page2.url();
    if (!currentUrl.includes('/revisions/rev-expert-02/edit')) {
      throw new Error(`Page unexpectedly redirected after 403: ${currentUrl}`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] Page stayed on edit route; no false success or masked error');

    const screenshot2 = path.join(EVIDENCE_DIR, 'fe03_02_admin_foreign_draft_403_banner_1440.png');
    await page2.screenshot({ path: screenshot2 });
    console.log(`  ✓ Captured: ${screenshot2}`);
    await page2.close();

    // -------------------------------------------------------------
    // Test 3: Verified EXPERT owning draft (no admin disclaimer)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Verified EXPERT owning draft ---');
    const page3 = await browser.newPage();
    await page3.setViewport({ width: 1440, height: 900 });
    await setupPageInterception(page3, EXPERT_USER, VERIFIED_EXPERT_PROFILE);

    await page3.goto(`${BASE_URL}/knowledge/sources/src-expert-02`, { waitUntil: 'networkidle0' });

    const expertEditBtn = await page3.$('[data-testid="draft-edit-button"]');
    if (!expertEditBtn) throw new Error('Verified expert owner could not find draft-edit-button!');
    const expertTitle = await page3.$eval('[data-testid="draft-edit-button"]', el => el.getAttribute('title'));
    if (expertTitle.includes('Máy chủ sẽ xác thực')) {
      throw new Error('Expert owner should not have admin disclaimer title!');
    }
    console.log('  ✓ [DOM ASSERTION PASS] Verified EXPERT owner has draft-edit-button without admin disclaimer');

    const screenshot3 = path.join(EVIDENCE_DIR, 'fe03_03_expert_owner_draft_detail_1440.png');
    await page3.screenshot({ path: screenshot3 });
    console.log(`  ✓ Captured: ${screenshot3}`);
    await page3.close();

    // -------------------------------------------------------------
    // Test 4: Verified EXPERT viewing non-owned draft (no edit button)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Verified EXPERT viewing non-owned draft ---');
    const page4 = await browser.newPage();
    await page4.setViewport({ width: 1440, height: 900 });
    await setupPageInterception(page4, EXPERT_USER, VERIFIED_EXPERT_PROFILE);

    // src-admin-01 is owned by user 1, while expert is user 42
    await page4.goto(`${BASE_URL}/knowledge/sources/src-admin-01`, { waitUntil: 'networkidle0' });
    const nonOwnerBtn = await page4.$('[data-testid="draft-edit-button"]');
    if (nonOwnerBtn) throw new Error('Non-owner EXPERT unexpectedly saw draft-edit-button!');
    console.log('  ✓ [DOM ASSERTION PASS] Verified EXPERT not owning draft does NOT have draft-edit-button');

    const screenshot4 = path.join(EVIDENCE_DIR, 'fe03_04_expert_non_owner_no_edit_1440.png');
    await page4.screenshot({ path: screenshot4 });
    console.log(`  ✓ Captured: ${screenshot4}`);
    await page4.close();

    // -------------------------------------------------------------
    // Test 5: PENDING EXPERT owning draft (no edit button & blocked edit page)
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing PENDING EXPERT owning draft ---');
    const page5 = await browser.newPage();
    await page5.setViewport({ width: 1440, height: 900 });
    await setupPageInterception(page5, EXPERT_USER, PENDING_EXPERT_PROFILE);

    await page5.goto(`${BASE_URL}/knowledge/sources/src-expert-02`, { waitUntil: 'networkidle0' });
    const pendingBtn = await page5.$('[data-testid="draft-edit-button"]');
    if (pendingBtn) throw new Error('PENDING EXPERT unexpectedly saw draft-edit-button!');
    console.log('  ✓ [DOM ASSERTION PASS] PENDING EXPERT does NOT have draft-edit-button');

    // Direct access to edit page
    await page5.goto(`${BASE_URL}/knowledge/sources/src-expert-02/revisions/rev-expert-02/edit`, { waitUntil: 'networkidle0' });
    const restrictedBanner = await page5.$('[data-testid="restricted-expert-edit-banner"]');
    if (!restrictedBanner) throw new Error('restricted-expert-edit-banner was not rendered for PENDING expert!');
    const isSubmitDisabled = await page5.$eval('button[type="submit"]', el => el.disabled);
    if (!isSubmitDisabled) throw new Error('Submit button should be disabled for restricted expert!');
    console.log('  ✓ [DOM ASSERTION PASS] restricted-expert-edit-banner rendered and submit button disabled');

    const screenshot5 = path.join(EVIDENCE_DIR, 'fe03_05_restricted_expert_no_edit_1440.png');
    await page5.screenshot({ path: screenshot5 });
    console.log(`  ✓ Captured: ${screenshot5}`);
    await page5.close();

    // -------------------------------------------------------------
    // Test 6: Non-DRAFT revision lock
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Non-DRAFT revision lock (SUBMITTED) ---');
    const page6 = await browser.newPage();
    await page6.setViewport({ width: 1440, height: 900 });
    await setupPageInterception(page6, ADMIN_USER, null);

    await page6.goto(`${BASE_URL}/knowledge/sources/src-sub-03`, { waitUntil: 'networkidle0' });
    const submittedBtn = await page6.$('[data-testid="draft-edit-button"]');
    if (submittedBtn) throw new Error('SUBMITTED source unexpectedly showed draft-edit-button!');
    console.log('  ✓ [DOM ASSERTION PASS] Non-DRAFT source does NOT render draft-edit-button');

    // Direct URL access shows lock banner
    await page6.goto(`${BASE_URL}/knowledge/sources/src-sub-03/revisions/rev-sub-03/edit`, { waitUntil: 'networkidle0' });
    await page6.waitForSelector('[data-testid="revision-locked-banner"]', { timeout: 5000 });
    const lockHeader = await page6.$eval('[data-testid="revision-locked-banner"] h2', el => el.textContent.trim());
    if (!lockHeader.includes('Chỉ có thể chỉnh sửa hồ sơ ở trạng thái Bản nháp')) {
      throw new Error(`Expected lock banner heading, got: ${lockHeader}`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] Direct URL access to non-DRAFT revision displays immutable lock banner');

    const screenshot6 = path.join(EVIDENCE_DIR, 'fe03_06_non_draft_locked_1440.png');
    await page6.screenshot({ path: screenshot6 });
    console.log(`  ✓ Captured: ${screenshot6}`);
    await page6.close();

    // -------------------------------------------------------------
    // Test 7: English localization for Admin Edit Access
    // -------------------------------------------------------------
    console.log('\n--- 7. Testing English localization ---');
    const page7 = await browser.newPage();
    await page7.setViewport({ width: 1440, height: 900 });
    await setupPageInterception(page7, ADMIN_USER, null);

    // Set localStorage language to en before loading
    await page7.evaluateOnNewDocument(() => {
      localStorage.setItem('duricare-language', 'en');
    });

    await page7.goto(`${BASE_URL}/knowledge/sources/src-admin-01/revisions/rev-admin-01/edit`, { waitUntil: 'networkidle0' });
    const englishNotice = await page7.$eval('[data-testid="admin-edit-notice"]', el => el.textContent.trim());
    console.log(`  English Notice text: "${englishNotice}"`);
    if (!englishNotice.includes('Administrator Edit Access')) {
      throw new Error(`Expected English notice title, got: ${englishNotice}`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] English localization correctly rendered in DOM');

    const screenshot7 = path.join(EVIDENCE_DIR, 'fe03_07_admin_edit_english_1440.png');
    await page7.screenshot({ path: screenshot7 });
    console.log(`  ✓ Captured: ${screenshot7}`);
    await page7.close();

    console.log('\n================================================================');
    console.log('✓ All DOM assertions passed and all 7 evidence screenshots generated!');
    console.log('================================================================');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('\n✗ E2E Test Failed:', err);
  process.exit(1);
});
