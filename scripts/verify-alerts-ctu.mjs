#!/usr/bin/env node
/**
 * Automated Verification Suite for UI-REFRESH-CTU-001 (Cảnh báo vận hành - Alerts UI):
 * 
 * 1. Static code & layout assertions:
 *    - AlertCard implements vertical card with dynamic left accent border, source/severity badges, mono code, full message, h-11 resolve button
 *    - AlertCard supports unbroken long alert.type without overflowing (break-all, min-w-0, max-w-full)
 *    - AlertsSkeleton implements single-column vertical stack (space-y-3.5) with accent border
 *    - AlertsPage implements #f8f9ff container, header with badge/refresh, filter toolbar (#zone-filter, #source-filter) in grid-cols-2 mobile layout,
 *      metadata row with count breakdown pills, footer microcopy, deep linking with zone > zoneCode precedence, empty states, error handling
 *    - Bilingual translations (VI and EN) for all alert UI keys
 *    - Reduced-motion tokens and spinner resilience
 * 
 * 2. Headless Chromium interactive browser scenarios:
 *    - Direct navigation with mock data on isolated SPA server
 *    - Newest-first ordering verification
 *    - Visual components inspection (borders, badges, typography, dates)
 *    - Deep link handling (?zone=, ?zoneCode=, and precedence ?zone=&zoneCode=)
 *    - Client-side filtering by Zone and Source with live count breakdown updates
 *    - Refresh button functionality
 *    - Optimistic resolve with rollback on HTTP 500 error
 *    - Successful resolve with success banner and list update
 *    - Empty states (filter-empty with reset button vs queue-empty)
 *    - Responsive checks: 1440px Desktop & 375px Mobile (no horizontal overflow, full-width mobile CTA)
 *    - [F1] Unbroken 180-char alert.type inside card: verified card.scrollWidth <= card.clientWidth and main.scrollWidth <= main.clientWidth
 *    - [F2] Mobile toolbar 2-column alignment (matching top offsets for zone and source filters) & top header compact refresh button (40x40)
 *    - [Spinner] Session loading in no-preference (spinning arc active) vs reduce (clean static hourglass icon visible, spinning arc hidden)
 * 
 * 3. Evidence capture:
 *    - fe_alerts_01_desktop_light_1440.png
 *    - fe_alerts_02_desktop_dark_1440.png
 *    - fe_alerts_03_mobile_light_375.png
 *    - fe_alerts_04_mobile_dark_375.png
 *    - fe_alerts_05_empty_light_1440.png
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

const ARTIFACT_EVIDENCE_DIR = path.resolve('C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence');
const TASK_EVIDENCE_DIR = path.resolve('E:/CTU/LuanVan/verification/ui-refresh-ctu-alerts-design-20261116/evidence');

for (const dir of [ARTIFACT_EVIDENCE_DIR, TASK_EVIDENCE_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log('UI-REFRESH-CTU-001 Alerts UI Verification Suite (v2)');
console.log('================================================================\n');

// ─── [1/3] Static Code & Contract Checks ─────────────────────
console.log('[1/3] Static code & layout assertions...');

const alertCardPath = path.join(ROOT_DIR, 'src/components/AlertCard.tsx');
const alertsSkeletonPath = path.join(ROOT_DIR, 'src/components/AlertsSkeleton.tsx');
const alertsPagePath = path.join(ROOT_DIR, 'src/pages/AlertsPage.tsx');
const alertStylesPath = path.join(ROOT_DIR, 'src/utils/alertStyles.ts');
const formatTimePath = path.join(ROOT_DIR, 'src/utils/formatTime.ts');
const tokensPath = path.join(ROOT_DIR, 'src/styles/tokens.css');
const sessionLoadingPath = path.join(ROOT_DIR, 'src/components/auth/SessionLoading.tsx');

const alertCardContent = fs.readFileSync(alertCardPath, 'utf8');
const alertsSkeletonContent = fs.readFileSync(alertsSkeletonPath, 'utf8');
const alertsPageContent = fs.readFileSync(alertsPagePath, 'utf8');
const alertStylesContent = fs.readFileSync(alertStylesPath, 'utf8');
const formatTimeContent = fs.readFileSync(formatTimePath, 'utf8');
const tokensContent = fs.readFileSync(tokensPath, 'utf8');
const sessionLoadingContent = fs.readFileSync(sessionLoadingPath, 'utf8');

// S1: AlertCard layout & styles
assert(
  alertCardContent.includes('alertCardBorderClass') &&
  alertStylesContent.includes('border-l-4') &&
  alertStylesContent.includes('border-l-red-500') &&
  alertStylesContent.includes('border-l-amber-500') &&
  alertStylesContent.includes('border-l-blue-400'),
  '[Scenario S1.1] AlertCard implements vertical card with dynamic left accent border (red/amber/blue)'
);

assert(
  alertCardContent.includes('data-alert-id') &&
  alertCardContent.includes('data-source') &&
  alertCardContent.includes('data-severity'),
  '[Scenario S1.2] AlertCard provides test attributes (data-alert-id, data-source, data-severity)'
);

assert(
  alertCardContent.includes('alertSourceClasses') &&
  alertCardContent.includes('alertSeverityClasses') &&
  alertCardContent.includes('formatAlertDateTime') &&
  formatTimeContent.includes('Asia/Ho_Chi_Minh'),
  '[Scenario S1.3] AlertCard utilizes centralized source/severity style helpers and Asia/Ho_Chi_Minh datetime formatter'
);

assert(
  alertCardContent.includes('h-11') &&
  alertCardContent.includes('w-full sm:w-auto') &&
  alertCardContent.includes('check_circle') &&
  alertCardContent.includes('Đánh dấu đã xử lý'),
  '[Scenario S1.4] AlertCard resolve CTA is h-11, responsive full-width on mobile, check_circle icon, accessible'
);

assert(
  alertCardContent.includes('break-all') &&
  alertCardContent.includes('min-w-0') &&
  alertCardContent.includes('max-w-full'),
  '[Scenario S1.5 - F1] AlertCard wraps long technical types with break-all and overflow-safe containers'
);

// S2: AlertsSkeleton layout
assert(
  alertsSkeletonContent.includes('space-y-3.5') &&
  alertsSkeletonContent.includes('border-l-4'),
  '[Scenario S2.1] AlertsSkeleton refactored to single-column vertical stack (space-y-3.5) with accent border'
);

// S3: AlertsPage layout, header, toolbar, metadata, deep-linking, footer
assert(
  alertsPageContent.includes("bg-[#f8f9ff]") &&
  alertsPageContent.includes("dark:bg-bg"),
  '[Scenario S3.1] AlertsPage wrapped in #f8f9ff light background and dark:bg-bg dark background'
);

assert(
  alertsPageContent.includes('chưa xử lý') &&
  alertsPageContent.includes('Làm mới') &&
  alertsPageContent.includes('hidden sm:inline'),
  '[Scenario S3.2 - F2] AlertsPage header features compact icon refresh on mobile and text on desktop'
);

assert(
  alertsPageContent.includes('grid-cols-2') &&
  alertsPageContent.includes('id="zone-filter"') &&
  alertsPageContent.includes('id="source-filter"'),
  '[Scenario S3.3 - F2] AlertsPage toolbar implements grid-cols-2 on mobile for side-by-side filters'
);

assert(
  alertsPageContent.includes('rawZone ?? rawZoneCode') &&
  alertsPageContent.includes("next.delete('zoneCode')"),
  '[Scenario S3.4] AlertsPage handles deep links with precedence zone > zoneCode and normalizes to zone'
);

assert(
  alertsPageContent.includes('Đánh dấu đã xử lý chỉ cập nhật trạng thái cảnh báo trong hệ thống.'),
  '[Scenario S3.5] AlertsPage displays required human-approved footer microcopy'
);

assert(
  alertsPageContent.includes('data-resolve-error') &&
  alertsPageContent.includes('Xóa bộ lọc'),
  '[Scenario S3.6] AlertsPage supports resolve error rollback with banner and empty-filter reset'
);

// S4: Translations
const viJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'src/i18n/locales/vi/translation.json'), 'utf8'));
const enJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'src/i18n/locales/en/translation.json'), 'utf8'));

assert(
  viJson['Tất cả khu vực'] === 'Tất cả khu vực' &&
  enJson['Tất cả khu vực'] === 'All zones' &&
  viJson['Tất cả'] === 'Tất cả' &&
  enJson['Tất cả'] === 'All' &&
  viJson['Cảnh báo cứng (HARD)'] === 'Cảnh báo cứng (HARD)' &&
  enJson['Cảnh báo cứng (HARD)'] === 'Rule-based (HARD)' &&
  viJson['Cảnh báo AI (AGENTIC)'] === 'Cảnh báo AI (AGENTIC)' &&
  enJson['Cảnh báo AI (AGENTIC)'] === 'AI alert (AGENTIC)' &&
  viJson['Hiển thị {0}/{1} cảnh báo · Mới nhất trước'] === 'Hiển thị {{0}}/{{1}} cảnh báo · Mới nhất trước' &&
  enJson['Hiển thị {0}/{1} cảnh báo · Mới nhất trước'] === 'Showing {{0}}/{{1}} alerts · Newest first',
  '[Scenario S4.1 - I18N] Filter and sorting translation keys are properly defined in VI and EN catalogs'
);

assert(
  viJson['Đánh dấu đã xử lý'] === 'Đánh dấu đã xử lý' &&
  enJson['Đánh dấu đã xử lý'] === 'Mark as resolved' &&
  viJson['Xóa bộ lọc'] === 'Xóa bộ lọc' &&
  enJson['Xóa bộ lọc'] === 'Clear filters' &&
  viJson['Nghiêm trọng'] === 'Nghiêm trọng' &&
  enJson['Nghiêm trọng'] === 'Critical' &&
  viJson['{0} cảnh báo cứng'] === '{{0}} cảnh báo cứng' &&
  enJson['{0} cảnh báo cứng'] === '{{0}} rule-based alerts' &&
  viJson['{0} cảnh báo AI'] === '{{0}} cảnh báo AI' &&
  enJson['{0} cảnh báo AI'] === '{{0}} AI alerts' &&
  viJson['Đánh dấu đã xử lý chỉ cập nhật trạng thái cảnh báo trong hệ thống.'] === 'Đánh dấu đã xử lý chỉ cập nhật trạng thái cảnh báo trong hệ thống.' &&
  enJson['Đánh dấu đã xử lý chỉ cập nhật trạng thái cảnh báo trong hệ thống.'] === 'Marking as resolved only updates the alert status in the system.',
  '[Scenario S4.2 - I18N] Action, state, microcopy, and severity translation keys are properly defined in VI and EN catalogs'
);

// S5: Reduced motion support
assert(
  tokensContent.includes('prefers-reduced-motion: reduce') &&
  sessionLoadingContent.includes('motion-reduce:hidden') &&
  sessionLoadingContent.includes('motion-reduce:inline-flex'),
  '[Scenario S5 - Motion] Reduced-motion static fallback symbol (hourglass_top) supported in loading indicators'
);

// ─── [2/3] Setup HTTP Server & Browser ────────────────────────
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
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST_DIR, urlPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return fs.createReadStream(filePath).pipe(res);
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(indexPath).pipe(res);
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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN',
};

page.on('pageerror', (err) => console.error('  [PAGE ERROR]', err.message));
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error' && !text.includes('500') && !text.includes('Simulated')) {
    console.log('  [BROWSER ERROR]', text);
  }
});

await page.setRequestInterception(true);

const mockAuthUser = {
  id: 1,
  email: 'admin@duricare.ctu.vn',
  role: 'ADMIN',
  farmId: 1,
  fullName: 'Nguyễn Văn An (CTU Admin)',
};

const mockFarm = {
  id: 1,
  name: 'Vườn thực nghiệm ĐH Cần Thơ',
  location: 'Khu II, ĐH Cần Thơ, Đường 3/2, Ninh Kiều, Cần Thơ',
};

const mockZones = [
  { id: 1, farmId: 1, code: 'KHU-A', name: 'Khu A', growthStage: 'RA_HOA' },
  { id: 2, farmId: 1, code: 'KHU-B', name: 'Khu B', growthStage: 'PHAT_TRIEN_TRAI' },
];

const now = Date.now();
const minute = 60 * 1000;
const hour = 3600 * 1000;

// Extra long unbroken type string for F1 testing
const longUnbrokenType = 'CUSTOM_' + 'X'.repeat(180);

let currentAlerts = [
  {
    id: 105,
    zoneCode: 'KHU-A',
    zoneName: 'Khu A',
    source: 'AGENTIC',
    severity: 'CRITICAL',
    type: 'PEST_RISK_HIGH',
    message: 'Phát hiện nguy cơ rầy phấn trắng bùng phát do độ ẩm cao liên tục 48 giờ qua.',
    createdAt: new Date(now - 10 * minute).toISOString(),
    resolved: false,
  },
  {
    id: 104,
    zoneCode: 'KHU-A',
    zoneName: 'Khu A',
    source: 'HARD',
    severity: 'CRITICAL',
    type: 'SOIL_MOISTURE_CRITICAL',
    message: 'Độ ẩm đất giảm xuống dưới ngưỡng tối thiểu 55% liên tục trong 4 giờ.',
    createdAt: new Date(now - 30 * minute).toISOString(),
    resolved: false,
  },
  {
    id: 103,
    zoneCode: 'KHU-B',
    zoneName: 'Khu B',
    source: 'HARD',
    severity: 'WARNING',
    type: 'AIR_TEMP_HIGH',
    message: 'Nhiệt độ không khí vượt ngưỡng cảnh báo 35.5°C vào giữa trưa.',
    createdAt: new Date(now - 2 * hour).toISOString(),
    resolved: false,
  },
  {
    id: 102,
    zoneCode: 'KHU-B',
    zoneName: 'Khu B',
    source: 'AGENTIC',
    severity: 'INFO',
    type: 'IRRIGATION_RECOMMENDATION',
    message: 'Khuyến nghị tưới bổ sung 25 lít nước cho mỗi gốc sầu riêng giai đoạn phát triển trái.',
    createdAt: new Date(now - 5 * hour).toISOString(),
    resolved: false,
  },
  {
    id: 101,
    zoneCode: 'KHU-A',
    zoneName: 'Khu A',
    source: 'HARD',
    severity: 'INFO',
    type: 'SYSTEM_STATUS_INFO',
    message: 'Cảm biến đất trạm đo 1 đã khôi phục kết nối và truyền dữ liệu bình thường.',
    createdAt: new Date(now - 24 * hour).toISOString(),
    resolved: false,
  },
];

let simulateResolveFailure = false;
let holdAuthRefresh = false;
let alertsGetCount = 0;

page.on('request', (req) => {
  const url = req.url();
  const method = req.method();

  // Static assets and page documents must pass through to SPA server
  if (req.isNavigationRequest() || ['document', 'script', 'stylesheet', 'image', 'font'].includes(req.resourceType())) {
    return req.continue();
  }

  if (method === 'OPTIONS') {
    return req.respond({ status: 204, headers: CORS_HEADERS });
  }

  if (url.includes('/auth/csrf')) {
    return req.respond({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify({ token: 'mock-csrf' }),
    });
  }

  if (url.includes('/auth/refresh')) {
    if (holdAuthRefresh) {
      // Hold pending so SessionLoading stays on screen for motion assertions
      return;
    }
    return req.respond({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify({ accessToken: 'mock-jwt-token', user: mockAuthUser }),
    });
  }

  if (url.includes('/auth/me')) {
    return req.respond({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify(mockAuthUser),
    });
  }

  if (url.match(/\/farms\/\d+/)) {
    return req.respond({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify(mockFarm),
    });
  }

  if (url.includes('/farms')) {
    return req.respond({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify([mockFarm]),
    });
  }

  if (url.includes('/zones')) {
    return req.respond({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify(mockZones),
    });
  }

  if (url.includes('/overview')) {
    return req.respond({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify({
        farmId: 1,
        zones: mockZones.map(z => ({
          ...z,
          metrics: {
            soilMoisture: { value: 68.5, status: 'NORMAL' },
            airTemperature: { value: 29.2, status: 'NORMAL' },
            airHumidity: { value: 75.0, status: 'NORMAL' },
          },
        })),
        alerts: currentAlerts,
        updatedAt: new Date().toISOString(),
      }),
    });
  }

  // Resolve Alert PATCH endpoint
  const resolveMatch = url.match(/\/alerts\/(\d+)\/resolve/);
  if (resolveMatch && method === 'PATCH') {
    const alertId = parseInt(resolveMatch[1], 10);
    if (simulateResolveFailure) {
      return req.respond({
        status: 500,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Lỗi máy chủ mô phỏng khi đánh dấu xử lý' }),
      });
    }

    currentAlerts = currentAlerts.filter(a => a.id !== alertId);
    return req.respond({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify({ id: alertId, resolved: true, resolvedAt: new Date().toISOString() }),
    });
  }

  // Alerts GET endpoint
  if (url.includes('/alerts') && method === 'GET') {
    alertsGetCount++;
    return req.respond({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify(currentAlerts),
    });
  }

  req.continue();
});

// Configure localStorage theme & auth state
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('theme', 'light');
});

// ─── [Interactive Test Steps] ─────────────────────────────────

// Step 1: Initial Page Load (1440px Desktop)
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://127.0.0.1:${PORT}/alerts?farmId=1&nofixture=true`, { waitUntil: 'networkidle0' });

await page.waitForSelector('[data-alert-id]');
const renderedCards = await page.$$('[data-alert-id]');
assert(renderedCards.length === 5, `[Scenario S6.1] Loaded 5 alerts on initial page render (rendered: ${renderedCards.length})`);

// Step 2: Newest-first ordering verification
const renderedIds = await page.evaluate(() => {
  return [...document.querySelectorAll('[data-alert-id]')].map(el => parseInt(el.getAttribute('data-alert-id'), 10));
});
assert(
  JSON.stringify(renderedIds) === JSON.stringify([105, 104, 103, 102, 101]),
  `[Scenario S6.2] Alerts are rendered newest-first: [${renderedIds.join(', ')}]`
);

// Step 3: Visual inspection on Card 104
const card104Details = await page.evaluate(() => {
  const card = document.querySelector('[data-alert-id="104"]');
  if (!card) return null;
  return {
    sourceAttr: card.getAttribute('data-source'),
    severityAttr: card.getAttribute('data-severity'),
    text: card.textContent,
    hasCheckIcon: !!card.querySelector('.material-symbols-outlined'),
    hasResolveButton: !!card.querySelector('button'),
    hasCodeTag: !!card.querySelector('.font-mono'),
  };
});

assert(
  card104Details &&
  card104Details.sourceAttr === 'HARD' &&
  card104Details.severityAttr === 'CRITICAL' &&
  card104Details.text.includes('Khu A') &&
  card104Details.text.includes('KHU-A') &&
  card104Details.text.includes('Cảnh báo cứng') &&
  card104Details.text.includes('Nghiêm trọng') &&
  card104Details.text.includes('#104') &&
  card104Details.text.includes('SOIL_MOISTURE_CRITICAL') &&
  card104Details.text.includes('Đánh dấu đã xử lý'),
  '[Scenario S6.3] AlertCard #104 contains all Stitch elements: Zone name/badge, Source badge, Severity badge, ID, Type code, Action button'
);

// Header and Metadata row checks
const pageHeaderDetails = await page.evaluate(() => {
  const header = document.querySelector('h1');
  const countBadge = document.querySelector('[data-total-alerts]');
  const footerText = document.querySelector('div.text-xs.italic')?.textContent || '';
  return {
    title: header?.textContent || '',
    countBadgeText: countBadge?.textContent || '',
    footerText,
  };
});

assert(
  pageHeaderDetails.title.includes('Cảnh báo') &&
  pageHeaderDetails.countBadgeText.includes('5 chưa xử lý'),
  '[Scenario S6.4] Page header displays title "Cảnh báo" and count badge "5 chưa xử lý"'
);

assert(
  pageHeaderDetails.footerText.includes('Đánh dấu đã xử lý chỉ cập nhật trạng thái cảnh báo trong hệ thống.'),
  '[Scenario S6.5] Footer microcopy displays required notice'
);

// Check horizontal overflow on desktop
const noOverflowDesktop = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
assert(noOverflowDesktop, '[Scenario S6.6] Desktop layout has no horizontal overflow');

// Screenshot 1: Desktop Light (1440px)
const desktopLightPath = path.join(ARTIFACT_EVIDENCE_DIR, 'fe_alerts_01_desktop_light_1440.png');
await page.screenshot({ path: desktopLightPath, fullPage: true });
fs.copyFileSync(desktopLightPath, path.join(TASK_EVIDENCE_DIR, 'fe_alerts_01_desktop_light_1440.png'));
console.log('  📸 Captured fe_alerts_01_desktop_light_1440.png');

// Screenshot 2: Desktop Dark (1440px)
await page.evaluate(() => document.documentElement.classList.add('dark'));
await new Promise(r => setTimeout(r, 200));
const desktopDarkPath = path.join(ARTIFACT_EVIDENCE_DIR, 'fe_alerts_02_desktop_dark_1440.png');
await page.screenshot({ path: desktopDarkPath, fullPage: true });
fs.copyFileSync(desktopDarkPath, path.join(TASK_EVIDENCE_DIR, 'fe_alerts_02_desktop_dark_1440.png'));
console.log('  📸 Captured fe_alerts_02_desktop_dark_1440.png');
await page.evaluate(() => document.documentElement.classList.remove('dark'));

// Step 4: Deep link handling (?zone= & ?zoneCode= precedence)
await page.goto(`http://127.0.0.1:${PORT}/alerts?zone=KHU-A&zoneCode=KHU-B&nofixture=true&farmId=1`, { waitUntil: 'networkidle0' });
await page.waitForSelector('[data-alert-id]');
const zoneFilteredIds = await page.evaluate(() => {
  return [...document.querySelectorAll('[data-alert-id]')].map(el => parseInt(el.getAttribute('data-alert-id'), 10));
});
assert(
  JSON.stringify(zoneFilteredIds) === JSON.stringify([105, 104, 101]),
  `[Scenario S7.1] Precedence zone > zoneCode filters to KHU-A alerts: [${zoneFilteredIds.join(', ')}]`
);

const currentUrl = await page.evaluate(() => window.location.search);
assert(
  currentUrl.includes('zone=KHU-A'),
  `[Scenario S7.2] URL retains canonical zone=KHU-A parameter: ${currentUrl}`
);

// Test zoneCode alias on mount
await page.goto(`http://127.0.0.1:${PORT}/alerts?zoneCode=KHU-B&nofixture=true&farmId=1`, { waitUntil: 'networkidle0' });
await page.waitForSelector('[data-alert-id]');
const zoneCodeFilteredIds = await page.evaluate(() => {
  return [...document.querySelectorAll('[data-alert-id]')].map(el => parseInt(el.getAttribute('data-alert-id'), 10));
});
assert(
  JSON.stringify(zoneCodeFilteredIds) === JSON.stringify([103, 102]),
  `[Scenario S7.3] zoneCode alias successfully mounts and filters to KHU-B: [${zoneCodeFilteredIds.join(', ')}]`
);

// Reset back to main list
await page.goto(`http://127.0.0.1:${PORT}/alerts?farmId=1&nofixture=true`, { waitUntil: 'networkidle0' });
await page.waitForSelector('[data-alert-id]');

// Step 5: Client-side source filtering
await page.select('#source-filter', 'HARD');
await new Promise(r => setTimeout(r, 100));
const hardSourceIds = await page.evaluate(() => {
  return [...document.querySelectorAll('[data-alert-id]')].map(el => parseInt(el.getAttribute('data-alert-id'), 10));
});
assert(
  JSON.stringify(hardSourceIds) === JSON.stringify([104, 103, 101]),
  `[Scenario S8.1] Source filter "HARD" displays only hard alerts: [${hardSourceIds.join(', ')}]`
);

await page.select('#source-filter', 'AGENTIC');
await new Promise(r => setTimeout(r, 100));
const agenticSourceIds = await page.evaluate(() => {
  return [...document.querySelectorAll('[data-alert-id]')].map(el => parseInt(el.getAttribute('data-alert-id'), 10));
});
assert(
  JSON.stringify(agenticSourceIds) === JSON.stringify([105, 102]),
  `[Scenario S8.2] Source filter "AGENTIC" displays only AI alerts: [${agenticSourceIds.join(', ')}]`
);

// Reset filter
await page.select('#source-filter', 'ALL');
await new Promise(r => setTimeout(r, 100));

// Step 6: Refresh button
const countBeforeRefresh = alertsGetCount;
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')];
  const refreshBtn = buttons.find(b => b.getAttribute('aria-label') === 'Làm mới' || b.textContent.includes('Làm mới'));
  if (refreshBtn) refreshBtn.click();
});
await new Promise(r => setTimeout(r, 300));
assert(alertsGetCount > countBeforeRefresh, `[Scenario S9.1] Refresh button triggered alert GET request (count: ${alertsGetCount})`);

// Step 7: Optimistic Resolve & Rollback on Error
simulateResolveFailure = true;

// Click resolve on Alert 105
await page.evaluate(() => {
  const btn = document.querySelector('[data-alert-id="105"] button');
  if (btn) btn.click();
});

// Wait for failure response and rollback
await page.waitForSelector('[data-resolve-error]');
const isAlert105Restored = await page.evaluate(() => !!document.querySelector('[data-alert-id="105"]'));
assert(isAlert105Restored, '[Scenario S10.1] Alert 105 successfully restored to list on HTTP 500 error (optimistic rollback)');

// Dismiss error
await page.click('button[aria-label="Đóng thông báo lỗi"]');
await new Promise(r => setTimeout(r, 100));
const isErrorDismissed = await page.evaluate(() => !document.querySelector('[data-resolve-error]'));
assert(isErrorDismissed, '[Scenario S10.2] Resolve error banner is dismissible');

// Step 8: Successful Resolve
simulateResolveFailure = false;
await page.evaluate(() => {
  const btn = document.querySelector('[data-alert-id="104"] button');
  if (btn) btn.click();
});

await page.waitForFunction(() => !document.querySelector('[data-alert-id="104"]'));
const isSuccessBannerShown = await page.evaluate(() => {
  return document.body.textContent.includes('104');
});
assert(isSuccessBannerShown, '[Scenario S10.3] Successful resolve updates live banner with resolved alert #104');

const remainingCount = (await page.$$('[data-alert-id]')).length;
assert(remainingCount === 4, `[Scenario S10.4] Alert 104 permanently removed from queue (remaining: ${remainingCount})`);

// Step 9: Filter-empty state and Clear Filters button
await page.select('#zone-filter', 'KHU-B');
await page.select('#source-filter', 'AGENTIC');

// Resolve 102 to empty KHU-B AGENTIC
await page.evaluate(() => {
  const btn = document.querySelector('[data-alert-id="102"] button');
  if (btn) btn.click();
});
await new Promise(r => setTimeout(r, 200));

const isFilterEmpty = await page.evaluate(() => {
  const main = document.querySelector('main');
  return main && main.textContent.includes('Không có cảnh báo khớp bộ lọc') && !!main.querySelector('button');
});
assert(isFilterEmpty, '[Scenario S11.1] Filter-empty state displays filter message and "Xóa bộ lọc" button');

// Click "Xóa bộ lọc"
await page.evaluate(() => {
  const resetBtn = [...document.querySelectorAll('main button')].find(b => b.textContent.includes('Xóa bộ lọc'));
  if (resetBtn) resetBtn.click();
});
await new Promise(r => setTimeout(r, 200));

const countAfterReset = (await page.$$('[data-alert-id]')).length;
assert(countAfterReset >= 3, `[Scenario S11.2] Clicking "Xóa bộ lọc" resets filters and renders remaining alerts (count: ${countAfterReset})`);

// Step 10: Queue Empty State
currentAlerts = []; // Empty queue
await page.evaluate(() => {
  const refreshBtn = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Làm mới' || b.textContent.includes('Làm mới'));
  if (refreshBtn) refreshBtn.click();
});
await new Promise(r => setTimeout(r, 300));

const isQueueEmpty = await page.evaluate(() => {
  const main = document.querySelector('main');
  return main && main.textContent.includes('Chưa có cảnh báo nào');
});
assert(isQueueEmpty, '[Scenario S12.1] Queue-empty state displays "Chưa có cảnh báo nào" message');

// Capture Empty State
const emptyLightPath = path.join(ARTIFACT_EVIDENCE_DIR, 'fe_alerts_05_empty_light_1440.png');
await page.screenshot({ path: emptyLightPath, fullPage: true });
fs.copyFileSync(emptyLightPath, path.join(TASK_EVIDENCE_DIR, 'fe_alerts_05_empty_light_1440.png'));
console.log('  📸 Captured fe_alerts_05_empty_light_1440.png');

// Step 11: Mobile Viewport (375px) with Alerts Restored (including unbroken long type for F1)
currentAlerts = [
  {
    id: 106,
    zoneCode: 'KHU-A',
    zoneName: 'Khu A',
    source: 'HARD',
    severity: 'WARNING',
    type: longUnbrokenType,
    message: 'Kiểm tra khả năng co giãn và bọc dòng chữ khi mã kỹ thuật dài không chứa khoảng trắng.',
    createdAt: new Date(now - 5 * minute).toISOString(),
    resolved: false,
  },
  {
    id: 105,
    zoneCode: 'KHU-A',
    zoneName: 'Khu A',
    source: 'AGENTIC',
    severity: 'CRITICAL',
    type: 'PEST_RISK_HIGH',
    message: 'Phát hiện nguy cơ rầy phấn trắng bùng phát do độ ẩm cao liên tục 48 giờ qua.',
    createdAt: new Date(now - 10 * minute).toISOString(),
    resolved: false,
  },
  {
    id: 104,
    zoneCode: 'KHU-A',
    zoneName: 'Khu A',
    source: 'HARD',
    severity: 'CRITICAL',
    type: 'SOIL_MOISTURE_CRITICAL',
    message: 'Độ ẩm đất giảm xuống dưới ngưỡng tối thiểu 55% liên tục trong 4 giờ.',
    createdAt: new Date(now - 30 * minute).toISOString(),
    resolved: false,
  },
  {
    id: 103,
    zoneCode: 'KHU-B',
    zoneName: 'Khu B',
    source: 'HARD',
    severity: 'WARNING',
    type: 'AIR_TEMP_HIGH',
    message: 'Nhiệt độ không khí vượt ngưỡng cảnh báo 35.5°C vào giữa trưa.',
    createdAt: new Date(now - 2 * hour).toISOString(),
    resolved: false,
  },
];

await page.setViewport({ width: 375, height: 812 });
await page.goto(`http://127.0.0.1:${PORT}/alerts?farmId=1&nofixture=true`, { waitUntil: 'networkidle0' });
await page.waitForSelector('[data-alert-id="106"]');

// F1 Checks: Card and main scrollWidth <= clientWidth even with 180-char unbroken type
const f1OverflowCheck = await page.evaluate(() => {
  const card = document.querySelector('[data-alert-id="106"]');
  const main = document.querySelector('main');
  const doc = document.documentElement;
  const tag = card?.querySelector('.font-mono.break-all');
  return {
    cardScrollWidth: card?.scrollWidth ?? 0,
    cardClientWidth: card?.clientWidth ?? 0,
    mainScrollWidth: main?.scrollWidth ?? 0,
    mainClientWidth: main?.clientWidth ?? 0,
    docScrollWidth: doc.scrollWidth,
    tagText: tag?.textContent?.trim() ?? '',
  };
});

assert(
  f1OverflowCheck.cardScrollWidth <= f1OverflowCheck.cardClientWidth + 1,
  `[Scenario S13.1 - F1] Card with 180-char unbroken type has no horizontal overflow (scroll: ${f1OverflowCheck.cardScrollWidth}px <= client: ${f1OverflowCheck.cardClientWidth}px)`
);

assert(
  f1OverflowCheck.mainScrollWidth <= f1OverflowCheck.mainClientWidth + 1,
  `[Scenario S13.2 - F1] Main canvas with long type has no horizontal overflow (scroll: ${f1OverflowCheck.mainScrollWidth}px <= client: ${f1OverflowCheck.mainClientWidth}px)`
);

assert(
  f1OverflowCheck.docScrollWidth <= 375,
  `[Scenario S13.3 - F1] Document width strictly fits 375px viewport (scrollWidth: ${f1OverflowCheck.docScrollWidth}px)`
);

assert(
  f1OverflowCheck.tagText.length >= 180,
  `[Scenario S13.4 - F1] Full technical type code preserved verbatim without loss or clipping (length: ${f1OverflowCheck.tagText.length})`
);

// F2 Checks: Toolbar mobile grid-cols-2 side-by-side alignment & compact refresh button placement
const f2MobileLayout = await page.evaluate(() => {
  const zoneSelect = document.querySelector('#zone-filter');
  const sourceSelect = document.querySelector('#source-filter');
  const refreshBtn = document.querySelector('button[aria-label="Làm mới"]');
  const h1 = document.querySelector('h1');

  const zoneRect = zoneSelect?.getBoundingClientRect();
  const sourceRect = sourceSelect?.getBoundingClientRect();
  const refreshRect = refreshBtn?.getBoundingClientRect();
  const h1Rect = h1?.getBoundingClientRect();

  return {
    hasZone: !!zoneRect,
    hasSource: !!sourceRect,
    topDiff: Math.abs((zoneRect?.top ?? 0) - (sourceRect?.top ?? 0)),
    zoneLeft: zoneRect?.left ?? 0,
    sourceLeft: sourceRect?.left ?? 0,
    refreshTop: refreshRect?.top ?? 0,
    h1Top: h1Rect?.top ?? 0,
    refreshWidth: refreshRect?.width ?? 0,
    refreshHeight: refreshRect?.height ?? 0,
  };
});

assert(
  f2MobileLayout.hasZone && f2MobileLayout.hasSource && f2MobileLayout.topDiff <= 4,
  `[Scenario S14.1 - F2] Mobile toolbar renders Zone and Source selects side-by-side in grid-cols-2 (topDiff: ${f2MobileLayout.topDiff}px)`
);

assert(
  f2MobileLayout.zoneLeft < f2MobileLayout.sourceLeft,
  `[Scenario S14.2 - F2] Zone select is in column 1 (left: ${f2MobileLayout.zoneLeft}px) and Source in column 2 (left: ${f2MobileLayout.sourceLeft}px)`
);

assert(
  Math.abs(f2MobileLayout.refreshTop - f2MobileLayout.h1Top) <= 15,
  `[Scenario S14.3 - F2] Refresh button is in top heading row adjacent to title (refreshTop: ${f2MobileLayout.refreshTop}px, h1Top: ${f2MobileLayout.h1Top}px)`
);

assert(
  Math.abs(f2MobileLayout.refreshWidth - 40) <= 2 && Math.abs(f2MobileLayout.refreshHeight - 40) <= 2,
  `[Scenario S14.4 - F2] Mobile refresh button is 40x40px touch target matching Stitch reference (w: ${f2MobileLayout.refreshWidth}px, h: ${f2MobileLayout.refreshHeight}px)`
);

const isMobileCtaFullWidth = await page.evaluate(() => {
  const btn = document.querySelector('[data-alert-id="105"] button');
  if (!btn) return false;
  const rect = btn.getBoundingClientRect();
  const parent = btn.parentElement.getBoundingClientRect();
  return rect.width >= parent.width * 0.85;
});
assert(isMobileCtaFullWidth, '[Scenario S14.5] Action CTA button expands to full width on mobile');

// Screenshot 3: Mobile Light (375px)
const mobileLightPath = path.join(ARTIFACT_EVIDENCE_DIR, 'fe_alerts_03_mobile_light_375.png');
await page.screenshot({ path: mobileLightPath, fullPage: true });
fs.copyFileSync(mobileLightPath, path.join(TASK_EVIDENCE_DIR, 'fe_alerts_03_mobile_light_375.png'));
console.log('  📸 Captured fe_alerts_03_mobile_light_375.png');

// Screenshot 4: Mobile Dark (375px)
await page.evaluate(() => document.documentElement.classList.add('dark'));
await new Promise(r => setTimeout(r, 200));
const mobileDarkPath = path.join(ARTIFACT_EVIDENCE_DIR, 'fe_alerts_04_mobile_dark_375.png');
await page.screenshot({ path: mobileDarkPath, fullPage: true });
fs.copyFileSync(mobileDarkPath, path.join(TASK_EVIDENCE_DIR, 'fe_alerts_04_mobile_dark_375.png'));
console.log('  📸 Captured fe_alerts_04_mobile_dark_375.png');
await page.evaluate(() => document.documentElement.classList.remove('dark'));

// Step 12: Spinner Reduced-Motion & Motion-Safe Probe
// Check SessionLoading behavior in no-preference vs reduce modes
holdAuthRefresh = true;
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await page.goto(`http://127.0.0.1:${PORT}/login`);
await page.waitForSelector('[role="status"]');

const noPreferenceSpinner = await page.evaluate(() => {
  const spinEl = document.querySelector('.animate-spin');
  const staticIcon = document.querySelector('.motion-reduce\\:inline-flex');
  if (!spinEl) return null;
  const computedSpin = window.getComputedStyle(spinEl);
  const computedIcon = staticIcon ? window.getComputedStyle(staticIcon) : null;
  return {
    spinDisplay: computedSpin.display,
    iconDisplay: computedIcon ? computedIcon.display : 'none',
    animationName: computedSpin.animationName,
    animationDuration: computedSpin.animationDuration,
  };
});

assert(
  noPreferenceSpinner && noPreferenceSpinner.spinDisplay !== 'none' && noPreferenceSpinner.animationName.includes('spin') && noPreferenceSpinner.iconDisplay === 'none',
  `[Scenario S15.1 - Spinner] In prefers-reduced-motion: no-preference, spinner animation is active (name: "${noPreferenceSpinner?.animationName}", dur: ${noPreferenceSpinner?.animationDuration}) and static icon is hidden`
);

await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await new Promise(r => setTimeout(r, 100));

const reduceSpinner = await page.evaluate(() => {
  const spinEl = document.querySelector('.animate-spin.motion-reduce\\:hidden');
  const staticIcon = document.querySelector('.motion-reduce\\:inline-flex');
  return {
    spinDisplay: spinEl ? window.getComputedStyle(spinEl).display : 'none',
    staticDisplay: staticIcon ? window.getComputedStyle(staticIcon).display : 'none',
    staticText: staticIcon?.textContent?.trim() || '',
  };
});

assert(
  reduceSpinner.spinDisplay === 'none' && reduceSpinner.staticDisplay !== 'none' && reduceSpinner.staticText === 'hourglass_top',
  `[Scenario S15.2 - Spinner] In prefers-reduced-motion: reduce, spinning arc is hidden and static icon "${reduceSpinner.staticText}" is displayed`
);

// ─── [3/3] Teardown & Results ─────────────────────────────────
await browser.close();
server.close();

console.log('\n================================================================');
console.log(`Verification Complete: ${passed}/${total} assertions passed.`);
if (passed === total) {
  console.log('🎉 ALL ASSERTIONS PASSED! Alerts UI & Spinner remediation complete.');
} else {
  console.error(`⚠️ ${total - passed} assertions failed.`);
  process.exitCode = 1;
}
console.log('================================================================');
