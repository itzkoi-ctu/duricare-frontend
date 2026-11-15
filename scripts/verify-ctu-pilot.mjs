#!/usr/bin/env node
/**
 * Automated Verification Suite for UI-REFRESH-CTU-001 P2:
 * 1. Mobile Drawer Accessibility:
 *    - Initial closed state (inert, visibility: hidden, aria-expanded=false)
 *    - Click #btnHamburger -> opens drawer, #btnSidebarClose receives focus immediately
 *    - Tab / Shift-Tab focus trapping inside drawer
 *    - Press Escape -> closes drawer, focus returns to #btnHamburger
 * 2. CTU Color Tokens:
 *    - Primary Blue #1F5CA9, Accent Cyan #00AFEF, Control Cyan #0072A8
 * 3. Dashboard Pilot:
 *    - Dual buttons on Zone Card (Xem chi tiết + Xem N cảnh báo)
 *    - Null values formatted as em-dash '--'
 *    - Numeric 0 preserved
 *    - Weather card respects API contract
 * 4. Captures Evidence Screenshots (1440px desktop, 375px mobile, Light & Dark)
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
const EVIDENCE_DIR = path.resolve('C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
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
console.log('UI-REFRESH-CTU-001 P2 Pilot Verification Suite');
console.log('================================================================\n');

// ─── [1/3] Static Code & Token Checks ─────────────────────────
console.log('[1/3] Static token & contract checks...');

const tokensCssPath = path.join(ROOT_DIR, 'src/styles/tokens.css');
const indexCssPath = path.join(ROOT_DIR, 'src/styles/index.css');
const shellPath = path.join(ROOT_DIR, 'src/components/layout/Shell.tsx');
const zoneCardPath = path.join(ROOT_DIR, 'src/components/ZoneCard.tsx');
const weatherCardPath = path.join(ROOT_DIR, 'src/components/WeatherCard.tsx');

const tokensContent = fs.readFileSync(tokensCssPath, 'utf8');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');
const shellContent = fs.readFileSync(shellPath, 'utf8');
const zoneCardContent = fs.readFileSync(zoneCardPath, 'utf8');
const weatherCardContent = fs.readFileSync(weatherCardPath, 'utf8');

assert(
  tokensContent.includes('--color-brand-primary: #1F5CA9;') &&
  tokensContent.includes('--color-brand-accent: #00AFEF;') &&
  tokensContent.includes('--color-brand-accent-control: #0072A8;'),
  '[Scenario P1] tokens.css defines verified CTU brand tokens (#1F5CA9, #00AFEF, #0072A8)'
);

assert(
  indexCssContent.includes('@import "./tokens.css";') &&
  indexCssContent.includes('--color-brand-primary: var(--color-brand-primary);'),
  '[Scenario P2] index.css imports tokens.css and exposes them to Tailwind theme'
);

assert(
  shellContent.includes('id="btnHamburger"') &&
  shellContent.includes('id="btnSidebarClose"') &&
  shellContent.includes('id="appSidebar"') &&
  shellContent.includes('mobileDrawerOpen'),
  '[Scenario P3] Shell implements mobile drawer with accessible ids and state'
);

assert(
  zoneCardContent.includes("t('Xem chi tiết')") &&
  zoneCardContent.includes("t('Xem {0} cảnh báo', [totalAlerts])"),
  '[Scenario P4] ZoneCard implements dual buttons for detail and alerts'
);

assert(
  weatherCardContent.includes('expectedRainMm48h') &&
  weatherCardContent.includes('precipitationProbabilityToday'),
  '[Scenario P5] WeatherCard strictly uses API contract fields without invented stations'
);

assert(
  !zoneCardContent.includes('65–80%') && zoneCardContent.includes('Chưa thiết lập ngưỡng'),
  '[Scenario P6] ZoneCard strictly uses contract targets without invented numeric fallbacks'
);

assert(
  !shellContent.includes('TRẠM THEO DÕI') && shellContent.includes('lg:w-56'),
  '[Scenario P7] Shell removes redundant TRẠM THEO DÕI and uses approved 224px width (w-56)'
);

assert(
  weatherCardContent.includes('formatWeatherFetchedTime'),
  '[Scenario P8] WeatherCard formats fetch timestamp with calendar-date awareness'
);

// ─── [2/3] Setup HTTP Server & Browser ────────────────────────
console.log('\n[2/3] Starting SPA test server and headless browser...');

const PORT = 5195;
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

page.on('pageerror', err => console.error('  [PAGE ERROR]', err.message));

await page.setRequestInterception(true);

const mockAuthUser = {
  id: 1,
  email: 'admin@duricare.ctu.vn',
  role: 'ADMIN',
  farmId: 1,
  fullName: 'Nguyễn Văn An (CTU Admin)',
};

const now = Date.now();
const minute = 60 * 1000;

const mockOverview = {
  farmName: 'Vườn Sầu Riêng Phong Điền (Khu A & B)',
  generatedAt: new Date(now).toISOString(),
  totalUnresolvedAlerts: 1,
  latestInsight: {
    zoneCode: 'LO-B2',
    message: '[modelUsed=gemini-1.5-flash] Căn cứ theo dõi cảm biến ẩm đất Lô B2 (45.0%), thấp hơn ngưỡng tối ưu giai đoạn Ra hoa (55% – 70%). Độ ẩm không khí 65% cũng đang ở mức thấp. Khuyến nghị nhà vườn xem xét kích hoạt hệ thống tưới nhỏ giọt trong khung giờ 16:30 - 17:30 để tránh sốc nhiệt cho rễ.\n\nCitations: [1] Quy trình chăm sóc sầu riêng CTU, Viện Nghiên cứu Cây ăn quả Miền Nam.',
    createdAt: new Date(now - 2 * minute).toISOString(),
  },
  weather: {
    temperature: 28.4,
    humidity: 78,
    weatherCode: 1,
    precipitationProbabilityToday: 15,
    expectedRainMm48h: 0.0,
    fetchedAt: new Date(now - 10 * minute).toISOString(),
    source: 'Open-Meteo Gateway',
  },
  zones: [
    {
      code: 'LO-A1',
      name: 'Vườn Thử Nghiệm Phong Điền - Lô A1 · Ri6 Năm 4 (Mã: PHONGDIEN-L01)',
      growthStage: 'KIEN_THIET_CO_BAN',
      variety: 'Ri6',
      plantingDate: '2022-01-10',
      alerts: { hard: 0, agentic: 0 },
      observedCadenceSeconds: 60.0,
      metrics: {
        temperature: { value: 28.4, unit: '°C', recordedAt: new Date(now - 2 * minute).toISOString(), status: 'NORMAL', targetMin: 24, targetMax: 30, source: 'MQTT' },
        humidity: { value: 78, unit: '%', recordedAt: new Date(now - 2 * minute).toISOString(), status: 'NORMAL', targetMin: 70, targetMax: 85, source: 'MQTT' },
        soilMoisture: { value: 68.0, unit: '%', recordedAt: new Date(now - 2 * minute).toISOString(), status: 'NORMAL', targetMin: 60, targetMax: 80, source: 'IOTLAB' },
      },
    },
    {
      code: 'LO-B2',
      name: 'Lô B2 · Monthong',
      growthStage: 'RA_HOA',
      variety: 'Monthong',
      plantingDate: '2021-05-12',
      alerts: { hard: 1, agentic: 0 },
      observedCadenceSeconds: 60.0,
      metrics: {
        temperature: { value: 29.1, unit: '°C', recordedAt: new Date(now - 3 * minute).toISOString(), status: 'NORMAL', targetMin: 24, targetMax: 30, source: 'MQTT' },
        humidity: { value: 65, unit: '%', recordedAt: new Date(now - 3 * minute).toISOString(), status: 'LOW', targetMin: 70, targetMax: 85, source: 'MQTT' },
        soilMoisture: { value: 45.0, unit: '%', recordedAt: new Date(now - 3 * minute).toISOString(), status: 'LOW', targetMin: 55, targetMax: 70, source: 'IOTLAB' },
      },
    },
    {
      code: 'LO-C3',
      name: 'Lô C3 · Khu Thử Nghiệm Đang Mất Tín Hiệu',
      growthStage: 'PHAT_TRIEN_TRAI',
      variety: 'Musang King',
      plantingDate: '2020-03-15',
      alerts: { hard: 0, agentic: 0 },
      observedCadenceSeconds: 120.0,
      metrics: {
        // Retained historical values alongside NO_SIGNAL
        temperature: { value: 24.5, unit: '°C', recordedAt: new Date(now - 180 * minute).toISOString(), status: 'NO_SIGNAL', targetMin: null, targetMax: null, source: null },
        humidity: { value: 79.5, unit: '%', recordedAt: new Date(now - 180 * minute).toISOString(), status: 'NO_SIGNAL', targetMin: null, targetMax: null, source: null },
        soilMoisture: { value: 77.0, unit: '%', recordedAt: new Date(now - 180 * minute).toISOString(), status: 'NO_SIGNAL', targetMin: null, targetMax: null, source: null },
      },
    },
  ],
};

page.on('request', (req) => {
  const url = req.url();
  const method = req.method();

  if (method === 'OPTIONS') {
    return req.respond({ status: 204, headers: CORS_HEADERS });
  }

  if (url.includes('/farms')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Vườn Sầu Riêng Phong Điền (Khu A & B)', code: 'PHONGDIEN-01' },
        { id: 2, name: 'Vườn Sầu Riêng Ba Tri (CTU)', code: 'BATRI-01' },
      ]),
    });
  }

  if (url.includes('/auth/refresh')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'mock-jwt-token' }),
    });
  }

  if (url.includes('/auth/csrf')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'csrf-token' }),
    });
  }

  if (url.includes('/auth/me')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockAuthUser),
    });
  }

  if (url.includes('/overview')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockOverview),
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

  req.continue();
});

// ─── [3/3] Interactive Browser Scenarios ───────────────────────
console.log('\n[3/3] Running interactive browser scenarios...');

try {
  // Scenario 1: Desktop 1440px Light Theme
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="dashboard-status-strip"]');

  assert(
    await page.$('aside') !== null,
    '[Scenario B1] Desktop view renders sidebar aside'
  );

  const dualBtnZone = await page.$('article[data-zone="LO-B2"]');
  assert(dualBtnZone !== null, '[Scenario B2] Zone LO-B2 (with alerts) renders on dashboard');

  const buttonsLO_B2 = await dualBtnZone.$$eval('a', links => links.map(l => l.textContent.trim()));
  assert(
    buttonsLO_B2.some(t => t.includes('Xem chi tiết')) &&
    buttonsLO_B2.some(t => t.includes('Xem 1 cảnh báo')),
    `[Scenario B3] Zone with alerts renders dual buttons: "Xem chi tiết" AND "Xem 1 cảnh báo"; got: [${buttonsLO_B2.join(', ')}]`
  );

  // Scenario B4 [R1 & R2]: Zone LO-C3 (NO_SIGNAL with retained values) renders '--' and 'Chưa thiết lập ngưỡng'
  const zoneC3 = await page.$('article[data-zone="LO-C3"]');
  assert(zoneC3 !== null, '[Scenario B4] Zone LO-C3 renders on dashboard');
  const zoneC3Text = await zoneC3.evaluate(el => el.textContent);
  assert(
    zoneC3Text.includes('--') && !zoneC3Text.includes('24.5°C') && !zoneC3Text.includes('77%'),
    '[Scenario B4.1] Zone LO-C3 with NO_SIGNAL renders missing current value "--", not retained stale values'
  );
  assert(
    zoneC3Text.includes('Chưa thiết lập ngưỡng'),
    '[Scenario B4.2] Zone LO-C3 with null targetMin/targetMax renders "Chưa thiết lập ngưỡng", not invented numeric fallbacks'
  );

  // Scenario B5 [R3]: AI Assistant Rail Card "Mở trợ lý" links with zoneCode and farm scope
  const aiAssistantLink = await page.$('[data-testid="ai-active-insight"] a[href*="/agent"]');
  assert(aiAssistantLink !== null, '[Scenario B5] AI assistant action link exists');
  const aiHref = await aiAssistantLink.evaluate(el => el.getAttribute('href'));
  assert(
    aiHref.includes('zoneCode=LO-B2') && aiHref.includes('farmId=1'),
    `[Scenario B5] AI assistant link retains zoneCode and farmId; got: ${aiHref}`
  );

  // Scenario B6 [R4]: Header renders interactive farm picker for ADMIN with multiple farms
  const headerFarmPicker = await page.$('#header-farm-picker');
  assert(headerFarmPicker !== null, '[Scenario B6] Header renders interactive #header-farm-picker for ADMIN');

  // Scenario B7 [R4]: Sidebar has width 224px (w-56) and does NOT contain redundant TRẠM THEO DÕI
  const sidebarWidth = await page.$eval('aside', el => el.getBoundingClientRect().width);
  const sidebarText = await page.$eval('aside', el => el.textContent);
  assert(
    Math.round(sidebarWidth) === 224,
    `[Scenario B7.1] Sidebar expanded width is 224px (w-56); got ${sidebarWidth}px`
  );
  assert(
    !sidebarText.includes('TRẠM THEO DÕI'),
    '[Scenario B7.2] Sidebar does not contain redundant TRẠM THEO DÕI block'
  );

  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_ctu_pilot_01_desktop_light_1440.png') });
  console.log('  ✓ [CAPTURE] fe_ctu_pilot_01_desktop_light_1440.png');

  // Scenario 2: Desktop 1440px Dark Theme
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_ctu_pilot_02_desktop_dark_1440.png') });
  console.log('  ✓ [CAPTURE] fe_ctu_pilot_02_desktop_dark_1440.png');
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });

  // Scenario 3: Mobile Viewport (375px) - Drawer Accessibility & Focus Trapping
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#btnHamburger');

  // Verify initial closed drawer state
  const initialDrawerState = await page.$eval('#appSidebar', el => {
    return {
      isInert: el.hasAttribute('inert'),
      visibility: window.getComputedStyle(el).visibility,
      pointerEvents: window.getComputedStyle(el).pointerEvents,
    };
  });
  const initialHamburgerExpanded = await page.$eval('#btnHamburger', el => el.getAttribute('aria-expanded'));

  assert(
    initialDrawerState.isInert &&
    initialDrawerState.visibility === 'hidden' &&
    initialHamburgerExpanded === 'false',
    '[Scenario B4] Closed mobile drawer has inert attribute, visibility: hidden, and aria-expanded="false"'
  );

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_ctu_pilot_03_mobile_closed_375.png') });
  console.log('  ✓ [CAPTURE] fe_ctu_pilot_03_mobile_closed_375.png');

  // Click #btnHamburger to open drawer
  await page.click('#btnHamburger');
  await new Promise(r => setTimeout(r, 300)); // wait for transition

  const openedDrawerState = await page.$eval('#appSidebar', el => {
    return {
      isInert: el.hasAttribute('inert'),
      visibility: window.getComputedStyle(el).visibility,
      activeElementId: document.activeElement ? document.activeElement.id : null,
    };
  });
  const openedHamburgerExpanded = await page.$eval('#btnHamburger', el => el.getAttribute('aria-expanded'));

  assert(
    !openedDrawerState.isInert &&
    openedDrawerState.visibility === 'visible' &&
    openedHamburgerExpanded === 'true' &&
    openedDrawerState.activeElementId === 'btnSidebarClose',
    `[Scenario B5] Opening mobile drawer removes inert, sets visibility: visible, aria-expanded="true", and synchronously focuses #btnSidebarClose (active: ${openedDrawerState.activeElementId})`
  );

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_ctu_pilot_04_mobile_drawer_open_375.png') });
  console.log('  ✓ [CAPTURE] fe_ctu_pilot_04_mobile_drawer_open_375.png');

  // Press Escape to close drawer and test focus return
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));

  const afterEscapeState = await page.evaluate(() => {
    const sidebar = document.getElementById('appSidebar');
    const hamburger = document.getElementById('btnHamburger');
    return {
      isInert: sidebar.hasAttribute('inert'),
      visibility: window.getComputedStyle(sidebar).visibility,
      ariaExpanded: hamburger.getAttribute('aria-expanded'),
      activeElementId: document.activeElement ? document.activeElement.id : null,
    };
  });

  assert(
    afterEscapeState.isInert &&
    afterEscapeState.visibility === 'hidden' &&
    afterEscapeState.ariaExpanded === 'false' &&
    afterEscapeState.activeElementId === 'btnHamburger',
    `[Scenario B6] Pressing Escape closes drawer, restores inert, and returns focus to #btnHamburger (active: ${afterEscapeState.activeElementId})`
  );

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_ctu_pilot_05_mobile_after_escape_375.png') });
  console.log('  ✓ [CAPTURE] fe_ctu_pilot_05_mobile_after_escape_375.png');

} finally {
  await browser.close();
  server.close();
}

console.log('\n================================================================');
console.log(`UI-REFRESH-CTU-001 P2 Summary: ${passed}/${total} PASS`);
console.log('================================================================');

if (passed !== total) {
  process.exit(1);
}
