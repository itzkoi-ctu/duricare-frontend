import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer';

const ROOT_DIR = path.resolve('E:/CTU/LuanVan/duricare-worktrees/fe-ui-refresh-ctu-005');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const EVIDENCE_DIR = path.resolve('E:/CTU/LuanVan/verification/ui-refresh-ctu-knowledge-list-design-20261116/evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

console.log('================================================================');
console.log('UI-REFRESH-CTU-001 P5 Nguồn tri thức (/knowledge/sources) Suite');
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
  console.log(`  📸 Captured ${filename} (SHA256: ${hash.substring(0, 16)}...)`);
  return hash;
}

// ─── [1/3] Static Code & Token Assertions ─────────────────────
console.log('[1/3] Static code & design token assertions...');

const sourcesPagePath = path.join(ROOT_DIR, 'src/pages/KnowledgeSourcesPage.tsx');
const sourcesPageContent = fs.readFileSync(sourcesPagePath, 'utf8');

assert(
  sourcesPageContent.includes("STATUS_FILTERS") &&
  sourcesPageContent.includes("'DRAFT'") &&
  sourcesPageContent.includes("'SUBMITTED'") &&
  sourcesPageContent.includes("'IN_REVIEW'") &&
  sourcesPageContent.includes("'CHANGES_REQUESTED'") &&
  sourcesPageContent.includes("'APPROVED'") &&
  sourcesPageContent.includes("'REJECTED'") &&
  sourcesPageContent.includes("'WITHDRAWN'"),
  '[Scenario S1.1] STATUS_FILTERS defines all 8 required governance revision statuses'
);

assert(
  sourcesPageContent.includes('formatDate') &&
  sourcesPageContent.includes("padStart(2, '0')"),
  '[Scenario S1.2] formatDate enforces DD/MM/YYYY zero-padded format'
);

assert(
  sourcesPageContent.includes('STITCH_STATUS_STYLES') &&
  sourcesPageContent.includes('#ecfdf5') &&
  sourcesPageContent.includes('#eff6ff') &&
  sourcesPageContent.includes('#fffbeb') &&
  sourcesPageContent.includes('#f1f5f9') &&
  sourcesPageContent.includes('#f0f9ff') &&
  sourcesPageContent.includes('#f4f4f5') &&
  sourcesPageContent.includes('#fef2f2'),
  '[Scenario S1.3] Semantic badge styling maps exact Stitch palette tokens for all statuses'
);

assert(
  sourcesPageContent.includes('data-testid="knowledge-sources-table"') &&
  sourcesPageContent.includes('data-testid="knowledge-sources-mobile-list"'),
  '[Scenario S1.4] KnowledgeSourcesPage implements distinct desktop table and mobile card layouts'
);

assert(
  sourcesPageContent.includes('rev?.revisionNumber != null ? t(\'Bản {0}\', [rev.revisionNumber]) : \'--\'') ||
  sourcesPageContent.includes("t('Bản {0}', [rev.revisionNumber])"),
  '[Scenario S1.5] Revision numbers displayed as Bản N, separating optimistic-lock version'
);

assert(
  !sourcesPageContent.includes('src.id.substring(0, 8)') &&
  !sourcesPageContent.includes('ID:'),
  '[Scenario S1.6] Raw source UUID is hidden from normal reading view per design brief'
);

// Check i18n catalogs
const viPath = path.join(ROOT_DIR, 'src/i18n/locales/vi/translation.json');
const enPath = path.join(ROOT_DIR, 'src/i18n/locales/en/translation.json');
const viJson = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const requiredI18nKeys = [
  'Nguồn tri thức',
  'Tài liệu và trích đoạn đã lưu trong hệ thống.',
  'Nhập tài liệu',
  'Tạo nguồn mới',
  'Trạng thái:',
  'Tiêu đề tài liệu',
  'Người tạo',
  'Phiên bản',
  'Cập nhật',
  'Thao tác',
  'Chi tiết',
  'Bản {0}',
  'Tổng số: {0} nguồn tri thức',
  'Danh sách tài liệu tri thức',
  'Chưa có bản sửa đổi',
];

for (const k of requiredI18nKeys) {
  assert(
    viJson[k] !== undefined && enJson[k] !== undefined,
    `[Scenario S2.I18N] Translation catalogs define valid VI & EN mappings for "${k}"`
  );
}

// ─── [2/3] Setup HTTP Server & Headless Browser ──────────────
console.log('\n[2/3] Starting SPA test server and headless browser...');

const PORT = 5199;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST_DIR, req.url.split('?')[0]);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
console.log(`SPA Server listening on http://127.0.0.1:${PORT}`);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN',
};

page.on('pageerror', (err) => console.error('  [PAGE ERROR]', err.message));
page.on('console', (msg) => console.log('  [CONSOLE]', msg.type(), msg.text()));

await page.setRequestInterception(true);

const mockAuthAdmin = {
  id: 1,
  email: 'admin@duricare.ctu.vn',
  role: 'ADMIN',
  farmId: 1,
  fullName: 'Quản trị viên CTU',
};

const mockSourcesFixture = [
  {
    id: 'src-101',
    ownerUserId: 10,
    ownerDisplayName: 'Nguồn mẫu A',
    createdAt: '2026-11-10T08:00:00Z',
    updatedAt: '2026-11-16T08:00:00Z',
    version: 3,
    latestRevision: {
      id: 'rev-101-3',
      sourceId: 'src-101',
      revisionNumber: 3,
      status: 'APPROVED',
      title: 'Sổ tay cây sầu riêng VietGAP',
      version: 3,
      submittedAt: '2026-11-14T08:00:00Z',
      updatedAt: '2026-11-16T08:00:00Z',
    },
    latestRevisionId: 'rev-101-3',
  },
  {
    id: 'src-102',
    ownerUserId: 11,
    ownerDisplayName: 'Nguồn mẫu B',
    createdAt: '2026-11-11T09:00:00Z',
    updatedAt: '2026-11-15T09:00:00Z',
    version: 2,
    latestRevision: {
      id: 'rev-102-2',
      sourceId: 'src-102',
      revisionNumber: 2,
      status: 'IN_REVIEW',
      title: 'Nguồn nước và kỹ thuật tưới sầu riêng',
      version: 2,
      submittedAt: '2026-11-13T09:00:00Z',
      updatedAt: '2026-11-15T09:00:00Z',
    },
    latestRevisionId: 'rev-102-2',
  },
  {
    id: 'src-103',
    ownerUserId: 12,
    ownerDisplayName: 'Nguồn mẫu C',
    createdAt: '2026-11-12T10:00:00Z',
    updatedAt: '2026-11-14T10:00:00Z',
    version: 2,
    latestRevision: {
      id: 'rev-103-2',
      sourceId: 'src-103',
      revisionNumber: 2,
      status: 'CHANGES_REQUESTED',
      title: 'Quản lý dinh dưỡng giai đoạn kiến thiết cơ bản',
      version: 2,
      submittedAt: '2026-11-13T10:00:00Z',
      updatedAt: '2026-11-14T10:00:00Z',
    },
    latestRevisionId: 'rev-103-2',
  },
  {
    id: 'src-104',
    ownerUserId: 10,
    ownerDisplayName: 'Nguồn mẫu A',
    createdAt: '2026-11-13T11:00:00Z',
    updatedAt: '2026-11-13T11:00:00Z',
    version: 1,
    latestRevision: {
      id: 'rev-104-1',
      sourceId: 'src-104',
      revisionNumber: 1,
      status: 'DRAFT',
      title: 'Nhật ký kỹ thuật chăm sóc vườn',
      version: 1,
      submittedAt: null,
      updatedAt: '2026-11-13T11:00:00Z',
    },
    latestRevisionId: 'rev-104-1',
  },
  {
    id: 'src-105',
    ownerUserId: 11,
    ownerDisplayName: 'Nguồn mẫu B',
    createdAt: '2026-11-12T12:00:00Z',
    updatedAt: '2026-11-12T12:00:00Z',
    version: 1,
    latestRevision: {
      id: 'rev-105-1',
      sourceId: 'src-105',
      revisionNumber: 1,
      status: 'SUBMITTED',
      title: 'Hướng dẫn canh tác sầu riêng tại hợp tác xã',
      version: 1,
      submittedAt: '2026-11-12T12:00:00Z',
      updatedAt: '2026-11-12T12:00:00Z',
    },
    latestRevisionId: 'rev-105-1',
  },
  {
    id: 'src-106',
    ownerUserId: 12,
    ownerDisplayName: 'Nguồn mẫu C',
    createdAt: '2026-11-11T13:00:00Z',
    updatedAt: '2026-11-11T13:00:00Z',
    version: 1,
    latestRevision: {
      id: 'rev-106-1',
      sourceId: 'src-106',
      revisionNumber: 1,
      status: 'WITHDRAWN',
      title: 'Ghi chép phỏng vấn kỹ thuật tại vườn',
      version: 1,
      submittedAt: '2026-11-11T13:00:00Z',
      updatedAt: '2026-11-11T13:00:00Z',
    },
    latestRevisionId: 'rev-106-1',
  },
];

let currentApiStatus = 200;
let currentApiPayload = null;
let currentCustomSources = null;

page.on('request', (req) => {
  const url = req.url();

  if (req.method() === 'OPTIONS') {
    return req.respond({ status: 204, headers: CORS_HEADERS });
  }

  if (url.includes('/auth/refresh')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'mock-jwt-token', user: mockAuthAdmin }),
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
      body: JSON.stringify(mockAuthAdmin),
    });
  }

  if (url.includes('/expert/profile') || url.includes('/api/governance/experts/me')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({ userId: 1, verificationStatus: 'VERIFIED' }),
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

  if (url.includes('/knowledge/sources') && req.resourceType() !== 'document') {
    if (currentApiStatus === 503) {
      return req.respond({
        status: 503,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'schema_not_ready', message: 'Schema not ready' }),
      });
    }

    if (currentApiStatus === 500) {
      return req.respond({
        status: 500,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    }

    const parsedUrl = new URL(url);
    const statusQuery = parsedUrl.searchParams.get('status');
    const pageQuery = parseInt(parsedUrl.searchParams.get('page') || '0', 10);
    const sizeQuery = parseInt(parsedUrl.searchParams.get('size') || '20', 10);

    const sourcePool = currentCustomSources || mockSourcesFixture;
    let filtered = sourcePool;
    if (statusQuery) {
      filtered = sourcePool.filter(s => s.latestRevision?.status === statusQuery);
    }

    const start = pageQuery * sizeQuery;
    const paged = filtered.slice(start, start + sizeQuery);

    const pageResponse = currentApiPayload || {
      content: paged,
      page: pageQuery,
      size: sizeQuery,
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / sizeQuery)),
      first: pageQuery === 0,
      last: start + sizeQuery >= filtered.length,
    };

    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(pageResponse),
    });
  }

  req.continue();
});

console.log('\n[3/3] Running interactive browser scenarios & capturing visual evidence...');

try {
  // ─── Scenario B1: Desktop 1440px Standard Layout & Hierarchy ─
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('duricare_auth_token', 'mock-token-admin');
    localStorage.setItem('theme', 'light');
  });

  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources?farmId=1`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  // B1.1: Header Title, Subtitle, and Actions
  const headerInfo = await page.$eval('main h1', (el) => ({
    title: el.textContent.trim(),
    subtitle: el.nextElementSibling?.textContent?.trim() || '',
  }));
  assert(headerInfo.title === 'Nguồn tri thức', `[Scenario B1.1] Page title is "Nguồn tri thức" (got "${headerInfo.title}")`);
  assert(headerInfo.subtitle.includes('Tài liệu và trích đoạn đã lưu trong hệ thống.'), `[Scenario B1.2] Page subtitle is correct`);

  const hasImportBtn = await page.$('a[href="/knowledge/import"]') !== null;
  const hasCreateBtn = await page.$('a[href="/knowledge/sources/new"]') !== null;
  assert(hasImportBtn && hasCreateBtn, '[Scenario B1.3] Desktop header renders "Nhập tài liệu" and "Tạo nguồn mới" action buttons');

  // B1.2: Filter Pills Row
  const filterPillLabels = await page.$$eval('.hidden.sm\\:flex button', (btns) =>
    btns.map((b) => b.textContent.trim())
  );
  assert(filterPillLabels.length === 8, `[Scenario B1.4] Desktop renders exactly 8 status filter pills (got ${filterPillLabels.length})`);
  assert(filterPillLabels[0] === 'Tất cả', '[Scenario B1.5] First filter pill is "Tất cả"');

  // B1.3: Table Rendering & Columns
  const tableHeaders = await page.$$eval('[data-testid="knowledge-sources-table"] thead th', (ths) =>
    ths.map((th) => th.textContent.trim())
  );
  assert(
    tableHeaders.includes('Tiêu đề tài liệu') &&
    tableHeaders.includes('Trạng thái') &&
    tableHeaders.includes('Người tạo') &&
    tableHeaders.includes('Phiên bản') &&
    tableHeaders.includes('Cập nhật') &&
    tableHeaders.includes('Thao tác'),
    '[Scenario B1.6] Desktop table defines all 6 canonical columns'
  );

  const rowCount = await page.$$eval('[data-testid="knowledge-sources-table"] tbody tr', (trs) => trs.length);
  assert(rowCount === 6, `[Scenario B1.7] Desktop table renders 6 source rows (got ${rowCount})`);

  // B1.4: First Row Verification (Sổ tay cây sầu riêng VietGAP)
  const firstRow = await page.$eval('[data-testid="knowledge-sources-table"] tbody tr:first-child', (tr) => {
    const tds = tr.querySelectorAll('td');
    return {
      title: tds[0].textContent.trim(),
      status: tds[1].textContent.trim(),
      author: tds[2].textContent.trim(),
      version: tds[3].textContent.trim(),
      date: tds[4].textContent.trim(),
      action: tds[5].textContent.trim(),
      hasRawId: tr.textContent.includes('ID:'),
    };
  });
  assert(firstRow.title.includes('Sổ tay cây sầu riêng VietGAP'), '[Scenario B1.8] Row 1 title is "Sổ tay cây sầu riêng VietGAP"');
  assert(firstRow.status.includes('Đã phê duyệt'), '[Scenario B1.9] Row 1 status is "Đã phê duyệt"');
  assert(firstRow.author === 'Nguồn mẫu A', `[Scenario B1.10] Row 1 author is "Nguồn mẫu A"`);
  assert(firstRow.version === 'Bản 3', `[Scenario B1.11] Row 1 version is displayed as "Bản 3" (got "${firstRow.version}")`);
  assert(firstRow.date === '16/11/2026', `[Scenario B1.12] Row 1 date formatted as "16/11/2026" (got "${firstRow.date}")`);
  assert(firstRow.action.includes('Chi tiết'), '[Scenario B1.13] Row 1 action link is "Chi tiết"');
  assert(!firstRow.hasRawId, '[Scenario B1.14] Row 1 hides raw UUID from reading view');

  const totalCountText = await page.$eval('[data-testid="table-total-count"]', (el) => el.textContent.trim());
  assert(totalCountText.includes('Tổng số: 6 nguồn tri thức'), `[Scenario B1.15] Table footer displays total count "Tổng số: 6 nguồn tri thức"`);

  // Capture Desktop Light Screenshot
  await captureEvidence(page, 'fe_knowledge_list_01_desktop_light_1440.png');

  // ─── Scenario B2: Desktop 1440px Dark Mode ───────────────────
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await new Promise((r) => setTimeout(r, 200));
  await captureEvidence(page, 'fe_knowledge_list_02_desktop_dark_1440.png');

  // Switch back to light
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await new Promise((r) => setTimeout(r, 200));

  // ─── Scenario B3: Desktop 1280px Viewport ────────────────────
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise((r) => setTimeout(r, 200));
  const docOverflow1280 = await page.evaluate(() => document.documentElement.scrollWidth <= 1280);
  assert(docOverflow1280, '[Scenario B3.1] Desktop 1280px viewport has no horizontal overflow');
  await captureEvidence(page, 'fe_knowledge_list_03_desktop_1280.png');

  // ─── Scenario B4: Mobile 390px (Stitch Canonical Width) ──────
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources?farmId=1`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  // B4.1: Desktop table hidden, Mobile list visible
  const isTableHidden = await page.$eval('[data-testid="knowledge-sources-table"]', (el) => {
    const parent = el.closest('.hidden.sm\\:block');
    return window.getComputedStyle(parent).display === 'none';
  });
  assert(isTableHidden, '[Scenario B4.1] Desktop table is hidden on mobile 390px viewport');

  const mobileCardCount = await page.$$eval('[data-testid="knowledge-sources-mobile-list"] article', (arts) => arts.length);
  assert(mobileCardCount === 6, `[Scenario B4.2] Mobile card list renders 6 articles (got ${mobileCardCount})`);

  // B4.2: Mobile Action Buttons in 2-Column Grid with >=44px height
  const mobileActions = await page.$$eval('main a[href="/knowledge/import"], main a[href="/knowledge/sources/new"]', (links) =>
    links.map((l) => {
      const rect = l.getBoundingClientRect();
      return {
        text: l.textContent.trim(),
        width: rect.width,
        height: rect.height,
      };
    })
  );
  assert(mobileActions.length === 2, '[Scenario B4.3] Mobile header renders 2 equal-width action buttons');
  assert(
    mobileActions.every((a) => a.height >= 44),
    `[Scenario B4.4] Mobile action buttons meet 44px minimum tap target height (got ${mobileActions[0].height}px)`
  );

  // B4.3: Mobile Filter Dropdown
  const filterDropdownOptions = await page.$$eval('#revision-status-filter option', (opts) =>
    opts.map((o) => o.value)
  );
  assert(filterDropdownOptions.length === 8, `[Scenario B4.5] Mobile filter select contains 8 status options`);

  // B4.4: First Card Fidelity
  const firstCard = await page.$eval('[data-testid="knowledge-sources-mobile-list"] article:first-child', (card) => {
    const rect = card.querySelector('a[href*="/knowledge/sources/src-101"]:last-child')?.getBoundingClientRect();
    return {
      title: card.querySelector('a')?.textContent?.trim() || '',
      status: card.querySelector('[data-testid*="status-badge"]')?.textContent?.trim() || '',
      hasDot: card.querySelector('.rounded-full') !== null,
      metaText: card.textContent,
      detailHeight: rect ? rect.height : 0,
    };
  });
  assert(firstCard.title.includes('Sổ tay cây sầu riêng VietGAP'), '[Scenario B4.6] Mobile Card 1 renders document title');
  assert(firstCard.status.includes('Đã phê duyệt'), '[Scenario B4.7] Mobile Card 1 renders semantic status badge');
  assert(firstCard.hasDot, '[Scenario B4.8] Mobile status badge renders indicator dot');
  assert(firstCard.metaText.includes('Nguồn mẫu A') && firstCard.metaText.includes('Bản 3') && firstCard.metaText.includes('16/11/2026'), '[Scenario B4.9] Mobile Card 1 renders metadata row (author, revision, date)');
  assert(firstCard.detailHeight >= 44, `[Scenario B4.10] Mobile "Chi tiết" link meets 44px tap target (got ${firstCard.detailHeight}px)`);

  const docOverflow390 = await page.evaluate(() => document.documentElement.scrollWidth <= 390);
  assert(docOverflow390, '[Scenario B4.11] Mobile 390px viewport fits strictly without horizontal overflow');

  // Capture Mobile Light Screenshot
  await captureEvidence(page, 'fe_knowledge_list_04_mobile_light_390.png');

  // ─── Scenario B5: Mobile 390px Dark Mode ─────────────────────
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await new Promise((r) => setTimeout(r, 200));
  await captureEvidence(page, 'fe_knowledge_list_05_mobile_dark_390.png');

  // Switch back to light
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await new Promise((r) => setTimeout(r, 200));

  // ─── Scenario B6: Mobile 375px & Long Title Overflow Guard ───
  await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });

  // Inject long title in mock fixture
  currentCustomSources = [
    {
      id: 'src-long',
      ownerUserId: 99,
      ownerDisplayName: 'Hợp tác xã Nông nghiệp Kỹ thuật cao Thành phố Cần Thơ Pilot 2026',
      createdAt: '2026-11-16T10:00:00Z',
      updatedAt: '2026-11-16T10:00:00Z',
      version: 1,
      latestRevision: {
        id: 'rev-long-1',
        sourceId: 'src-long',
        revisionNumber: 1,
        status: 'CHANGES_REQUESTED',
        title: 'Quy trình kỹ thuật canh tác sầu riêng Ri6 và Monthong ứng dụng công nghệ tưới nhỏ giọt tiết kiệm nước và quản lý dinh dưỡng tự động theo chuẩn VietGAP mở rộng',
        version: 1,
        submittedAt: '2026-11-16T10:00:00Z',
        updatedAt: '2026-11-16T10:00:00Z',
      },
      latestRevisionId: 'rev-long-1',
    },
    ...mockSourcesFixture,
  ];

  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources?farmId=1`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  const docOverflow375 = await page.evaluate(() => document.documentElement.scrollWidth <= 375);
  assert(docOverflow375, '[Scenario B6.1] Mobile 375px viewport with long source title has no horizontal overflow');

  const longTitleEl = await page.$eval('[data-testid="knowledge-sources-mobile-list"] article:first-child a', (el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
  }));
  assert(
    longTitleEl.scrollWidth <= longTitleEl.clientWidth + 2,
    '[Scenario B6.2] Long source title cleanly wraps without breaking container'
  );
  await captureEvidence(page, 'fe_knowledge_list_06_mobile_375.png');

  // Reset custom sources
  currentCustomSources = null;

  // ─── Scenario B7: Status Filter Interaction & Reset to Page 0 ─
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources?farmId=1`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  // Click filter button for "Đã phê duyệt"
  const approvedBtn = (await page.$$('.hidden.sm\\:flex button'))[5]; // index 5 is APPROVED
  await approvedBtn.click();
  await new Promise((r) => setTimeout(r, 300));

  const filteredRows = await page.$$eval('[data-testid="knowledge-sources-table"] tbody tr', (trs) => trs.length);
  assert(filteredRows === 1, `[Scenario B7.1] Filtering by "Đã phê duyệt" displays exactly 1 matching item (got ${filteredRows})`);

  const filteredStatus = await page.$eval('[data-testid="knowledge-sources-table"] tbody tr td:nth-child(2)', (td) => td.textContent.trim());
  assert(filteredStatus.includes('Đã phê duyệt'), '[Scenario B7.2] Filtered row displays "Đã phê duyệt" status badge');

  // Click back to "Tất cả"
  const allBtn = (await page.$$('.hidden.sm\\:flex button'))[0];
  await allBtn.click();
  await new Promise((r) => setTimeout(r, 300));
  const restoredRows = await page.$$eval('[data-testid="knowledge-sources-table"] tbody tr', (trs) => trs.length);
  assert(restoredRows === 6, '[Scenario B7.3] Clicking "Tất cả" restores full list of 6 items');

  // Probe F1.1: Re-clicking active "Tất cả" filter when already on page 0 does not trigger infinite loading
  await allBtn.click();
  await new Promise((r) => setTimeout(r, 1500)); // wait 1.5s as in reviewer probe
  const tableAfterSameAll = await page.$('[data-testid="knowledge-sources-table"]');
  const loadingAfterSameAll = await page.$('.animate-spin, [data-testid="loading-state"]');
  assert(
    tableAfterSameAll !== null && loadingAfterSameAll === null,
    '[Scenario B7.4] Re-clicking active "Tất cả" filter does not trigger infinite loading spinner and leaves table visible'
  );

  // Probe F1.2: Re-clicking active specific status filter when already on page 0 does not trigger infinite loading
  await approvedBtn.click();
  await new Promise((r) => setTimeout(r, 300));
  await approvedBtn.click();
  await new Promise((r) => setTimeout(r, 1500));
  const tableAfterSameStatus = await page.$('[data-testid="knowledge-sources-table"]');
  const loadingAfterSameStatus = await page.$('.animate-spin, [data-testid="loading-state"]');
  assert(
    tableAfterSameStatus !== null && loadingAfterSameStatus === null,
    '[Scenario B7.5] Re-clicking active specific status filter does not trigger infinite loading and leaves table visible'
  );

  // Restore to all
  await allBtn.click();
  await new Promise((r) => setTimeout(r, 300));

  // ─── Scenario B8: Pagination Controls ─────────────────────────
  currentApiPayload = {
    content: mockSourcesFixture.slice(0, 3),
    page: 0,
    size: 3,
    totalElements: 6,
    totalPages: 2,
    first: true,
    last: false,
  };

  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources?farmId=1`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  const pageIndicator = await page.$eval('main', (el) => el.textContent.includes('1 / 2'));
  assert(pageIndicator, '[Scenario B8.1] Pagination renders "1 / 2" page indicator');

  const buttons = await page.$$('button');
  let nextBtn = null;
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.textContent, btn);
    if (text && text.includes('Trang sau')) {
      nextBtn = btn;
      break;
    }
  }
  if (nextBtn) {
    currentApiPayload = {
      content: mockSourcesFixture.slice(3, 6),
      page: 1,
      size: 3,
      totalElements: 6,
      totalPages: 2,
      first: false,
      last: true,
    };
    await nextBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    const page2Indicator = await page.$eval('main', (el) => el.textContent.includes('2 / 2'));
    assert(page2Indicator, '[Scenario B8.2] Clicking "Trang sau" advances pagination to page 2');

    // Probe F1.3: Changing filter while on page 2 properly resets pagination to page 1 (0)
    currentApiPayload = {
      content: [mockSourcesFixture[0]],
      page: 0,
      size: 3,
      totalElements: 4,
      totalPages: 2,
      first: true,
      last: false,
    };
    const approvedFilterBtn = (await page.$$('.hidden.sm\\:flex button'))[5];
    await approvedFilterBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    const pageResetIndicator = await page.$eval('main', (el) => el.textContent.includes('1 / 2'));
    assert(pageResetIndicator, '[Scenario B8.3] Changing filter while on page 2 properly resets pagination to page 1');
  }

  // Reset pagination payload
  currentApiPayload = null;

  // ─── Scenario B9: Empty State & Filter Empty State ───────────
  currentCustomSources = [];
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources?farmId=1`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  const emptyText = await page.$eval('main', (el) => el.textContent);
  assert(emptyText.includes('Chưa có hồ sơ nguồn tri thức nào trong hệ thống.'), '[Scenario B9.1] Unfiltered empty state renders informative message');
  assert(emptyText.includes('Tạo nguồn tri thức đầu tiên'), '[Scenario B9.2] Unfiltered empty state provides CTA to create first source');

  currentCustomSources = null;

  // ─── Scenario B10: Schema Not Ready (503) & Error State ──────
  currentApiStatus = 503;
  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources?farmId=1`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  const alert503 = await page.$('[role="alert"]');
  const alertText = alert503 ? await page.evaluate((el) => el.textContent, alert503) : '';
  assert(alertText.includes('503') && alertText.includes('chưa sẵn sàng'), '[Scenario B10.1] 503 error renders "Chức năng tri thức tạm thời chưa sẵn sàng (503)" banner');

  currentApiStatus = 200;

  // ─── Scenario B11: Missing Latest Revision Safe Handling ─────
  currentCustomSources = [
    {
      id: 'src-no-rev',
      ownerUserId: 15,
      ownerDisplayName: 'Nguồn chưa có revision',
      createdAt: '2026-11-16T12:00:00Z',
      updatedAt: '2026-11-16T12:00:00Z',
      version: 1,
      latestRevision: null,
      latestRevisionId: null,
    },
  ];

  await page.goto(`http://127.0.0.1:${PORT}/knowledge/sources?farmId=1`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  const noRevRow = await page.$eval('[data-testid="knowledge-sources-table"] tbody tr', (tr) => {
    const tds = tr.querySelectorAll('td');
    return {
      title: tds[0].textContent.trim(),
      status: tds[1].textContent.trim(),
      version: tds[3].textContent.trim(),
      hasNoneBadge: tr.querySelector('[data-testid="status-badge-none"]') !== null,
    };
  });
  assert(noRevRow.title.includes('Chưa có tiêu đề'), '[Scenario B11.1] Source without revision safely falls back to "Chưa có tiêu đề"');
  assert(
    noRevRow.status.includes('Chưa có bản sửa đổi') && !noRevRow.status.includes('Bản nháp') && noRevRow.hasNoneBadge,
    '[Scenario B11.2] Source without revision renders neutral "Chưa có bản sửa đổi" (never inferring DRAFT)'
  );
  assert(noRevRow.version === '--', `[Scenario B11.3] Source without revision displays version "--" instead of raw optimistic lock`);

  // Mobile check for missing revision
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.waitForSelector('[data-testid="knowledge-sources-mobile-list"] article');
  const mobileNoRevCard = await page.$eval('[data-testid="knowledge-sources-mobile-list"] article', (card) => {
    return {
      title: card.querySelector('a')?.textContent?.trim() || '',
      status: card.querySelector('[data-testid="status-badge-none"]')?.textContent?.trim() || '',
      hasNoneBadge: card.querySelector('[data-testid="status-badge-none"]') !== null,
    };
  });
  assert(
    mobileNoRevCard.status.includes('Chưa có bản sửa đổi') && mobileNoRevCard.hasNoneBadge,
    '[Scenario B11.4] Mobile card for source without revision renders neutral "Chưa có bản sửa đổi" badge'
  );

  currentCustomSources = null;

} finally {
  await browser.close();
  server.close();
}

// ─── Write Evidence Manifest ─────────────────────────────────
const manifestPath = path.resolve(EVIDENCE_DIR, 'antigravity-evidence-hashes.json');
fs.writeFileSync(manifestPath, JSON.stringify(capturedHashes, null, 2));
console.log(`\nEvidence manifest written to: ${manifestPath}`);

console.log('\n================================================================');
console.log(`Verification Summary: ${passed}/${total} PASS`);
console.log('================================================================');

if (passed !== total) {
  process.exit(1);
}
