#!/usr/bin/env node
/**
 * Automated Verification Suite for:
 * 1. Collapsible Sidebar & Navigation Grouping (THEO DÕI / QUẢN TRỊ)
 * 2. 3-Column AI Assistant with Realtime IoT Live Context Rail
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
console.log('Sidebar & 3-Column AI Assistant Verification Suite');
console.log('================================================================\n');

// ─── [1/3] Static Code Assertions ─────────────────────────────
console.log('[1/3] Static code assertions...');

const shellPath = path.join(ROOT_DIR, 'src/components/layout/Shell.tsx');
const shellNavPath = path.join(ROOT_DIR, 'src/components/layout/ShellNavigation.tsx');
const navUtilsPath = path.join(ROOT_DIR, 'src/utils/navigation.ts');
const navTypesPath = path.join(ROOT_DIR, 'src/types/navigation.ts');
const agentPagePath = path.join(ROOT_DIR, 'src/pages/AgentPage.tsx');
const agentRailPath = path.join(ROOT_DIR, 'src/components/agent/AgentIoTContextRail.tsx');

const shellContent = fs.readFileSync(shellPath, 'utf8');
const shellNavContent = fs.readFileSync(shellNavPath, 'utf8');
const navUtilsContent = fs.readFileSync(navUtilsPath, 'utf8');
const navTypesContent = fs.readFileSync(navTypesPath, 'utf8');
const agentPageContent = fs.readFileSync(agentPagePath, 'utf8');
const agentRailContent = fs.readFileSync(agentRailPath, 'utf8');

assert(
  shellContent.includes('duricare_sidebar_collapsed') &&
  shellContent.includes("sidebarCollapsed ? 'lg:w-20' : 'lg:w-56'") &&
  shellContent.includes("sidebarCollapsed ? 'lg:left-20' : 'lg:left-56'") &&
  shellContent.includes("sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-56'"),
  '[Scenario S1] Shell implements persistent sidebar collapse with dynamic widths/margins (224px Stitch reference)'
);

assert(
  navTypesContent.includes("export type NavigationGroup = 'THEO_DOI' | 'QUAN_TRI';") &&
  navUtilsContent.includes("group: 'THEO_DOI'") &&
  navUtilsContent.includes("group: 'QUAN_TRI'"),
  '[Scenario S2] Navigation definitions categorise routes into THEO_DOI and QUAN_TRI'
);

assert(
  shellNavContent.includes('theoDoiItems') &&
  shellNavContent.includes('quanTriItems') &&
  shellNavContent.includes('t("Theo dõi")') &&
  shellNavContent.includes('t("Quản trị")'),
  '[Scenario S3] ShellNavigation renders distinct group sections and dividers'
);

assert(
  agentPageContent.includes('AgentIoTContextRail') &&
  agentPageContent.includes('AgentIoTContextSheet') &&
  agentPageContent.includes('lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_21rem]'),
  '[Scenario S4] AgentPage integrates 3-column layout with responsive context rail grid'
);

assert(
  agentRailContent.includes('Chỉ số cảm biến tức thời') &&
  agentRailContent.includes('Dự báo vi khí hậu 48h') &&
  agentRailContent.includes('Hồ sơ nông vụ khu vực') &&
  agentRailContent.includes('Xem biểu đồ phân tích cảm biến'),
  '[Scenario S5] AgentIoTContextRail implements all 3 Stitch Screen 1 cards and visualizer link'
);

// ─── [2/3] Setup HTTP Server & Browser ────────────────────────
console.log('\n[2/3] Starting SPA test server and headless browser...');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST_DIR, req.url.split('?')[0]);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(5190, '127.0.0.1', resolve));
console.log('SPA Server listening on http://127.0.0.1:5190');

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:5190',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN',
};

await page.setRequestInterception(true);

const mockAuthUser = {
  id: 1,
  email: 'admin@duricare.ctu.vn',
  role: 'ADMIN',
  farmId: 1,
  fullName: 'Quản trị viên CTU',
};

const now = Date.now();
const minute = 60 * 1000;

const mockOverview = {
  farmName: 'Vườn Sầu Riêng Ba Tri (CTU)',
  generatedAt: new Date(now).toISOString(),
  totalUnresolvedAlerts: 3,
  latestInsight: {
    zoneCode: 'zoneA',
    message: 'Khu A đang có độ ẩm tầng đất mặt thấp hơn tối ưu. Dự báo mưa chiều nay.',
    createdAt: new Date(now - 2 * minute).toISOString(),
  },
  weather: {
    temperature: 29,
    humidity: 78,
    weatherCode: 95,
    precipitationProbabilityToday: 75,
    expectedRainMm48h: 10.6,
    fetchedAt: new Date(now - 15 * minute).toISOString(),
    source: 'Open-Meteo Gateway',
  },
  zones: [
    {
      code: 'TEST-INTEGRATED',
      name: 'Khu A (TEST TÍCH HỢP)',
      growthStage: 'DAU_TRAI',
      variety: 'Ri6 • 4 năm tuổi',
      plantingDate: '2022-01-10',
      alerts: { hard: 1, agentic: 0 },
      observedCadenceSeconds: 60.0,
      metrics: {
        temperature: { value: 28.5, unit: '°C', recordedAt: new Date(now - 3 * minute).toISOString(), status: 'NORMAL', targetMin: 24, targetMax: 30, source: 'MQTT' },
        humidity: { value: 74, unit: '%', recordedAt: new Date(now - 3 * minute).toISOString(), status: 'NORMAL', targetMin: 70, targetMax: 85, source: 'MQTT' },
        soilMoisture: { value: 42.9, unit: '%', recordedAt: new Date(now - 3 * minute).toISOString(), status: 'LOW', targetMin: 55, targetMax: 70, source: 'IOTLAB' },
      },
      soilProfile: {
        ph: { value: 6.2, unit: 'pH', recordedAt: new Date(now - 3 * minute).toISOString(), status: 'NORMAL' },
        ec: { value: 1.1, unit: 'mS/cm', recordedAt: new Date(now - 3 * minute).toISOString(), status: 'NORMAL' },
      },
    },
    {
      code: 'ZONE-B',
      name: 'Khu B',
      growthStage: 'PHAT_TRIEN_TRAI',
      variety: 'Monthong',
      plantingDate: '2021-05-12',
      alerts: { hard: 0, agentic: 0 },
      observedCadenceSeconds: 60.0,
      metrics: {
        temperature: { value: 27.5, unit: '°C', recordedAt: new Date(now - 5 * minute).toISOString(), status: 'NORMAL', targetMin: 24, targetMax: 30, source: 'MQTT' },
        humidity: { value: 80, unit: '%', recordedAt: new Date(now - 5 * minute).toISOString(), status: 'NORMAL', targetMin: 70, targetMax: 85, source: 'MQTT' },
        soilMoisture: { value: 68.0, unit: '%', recordedAt: new Date(now - 5 * minute).toISOString(), status: 'NORMAL', targetMin: 60, targetMax: 75, source: 'IOTLAB' },
      },
    },
  ],
};

const mockConversations = [
  {
    id: 'conv-1',
    zoneCode: 'TEST-INTEGRATED',
    title: 'Khu A - Tưới giai đoạn đậu trái',
    createdAt: new Date(now - 10 * minute).toISOString(),
    updatedAt: new Date(now - 2 * minute).toISOString(),
  },
];

const mockMessages = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'TEST TÍCH HỢP có cần tưới nước bây giờ không? Dự báo thời tiết 48h tới thế nào?',
    createdAt: new Date(now - 5 * minute).toISOString(),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Hiện tại, độ ẩm đất tại khu vực TEST TÍCH HỢP (Khu A) đang ghi nhận ở mức 42.9%, thấp hơn ngưỡng tối ưu giai đoạn Đậu trái (55% – 70%). Tuy nhiên dự báo có mưa 10.6mm vào chiều nay nên khuyến nghị tạm hoãn tưới.',
    createdAt: new Date(now - 4 * minute).toISOString(),
  },
];

page.on('pageerror', err => console.error('  [PAGE ERROR]', err.message));

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
        { id: 1, name: 'Vườn Sầu Riêng Ba Tri (CTU)', code: 'BATRI-01' }
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

  if (url.includes('/agent/conversations') && method === 'GET') {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockConversations),
    });
  }

  if (url.includes('/agent/messages') || url.includes('/conv-1')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockMessages),
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

// ─── [3/3] Browser Interaction Scenarios ───────────────────────
console.log('\n[3/3] Running browser scenarios & capturing visual evidence...');

try {
  // Scenario B1: Desktop Sidebar Expanded & Grouping
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:5190/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('aside');

  const sidebarWidthExpanded = await page.$eval('aside', el => el.getBoundingClientRect().width);
  assert(
    Math.round(sidebarWidthExpanded) === 224, // w-56 is 224px (Stitch approved reference)
    `[Scenario B1] Sidebar expanded width is 224px (w-56); actual: ${sidebarWidthExpanded}px`
  );

  const navGroups = await page.$$eval('aside nav p', elements => elements.map(el => el.textContent.trim()));
  assert(
    navGroups.includes('THEO DÕI') || navGroups.includes('Theo dõi'),
    `[Scenario B2] Navigation renders "THEO DÕI" section header for ADMIN`
  );
  assert(
    navGroups.includes('QUẢN TRỊ') || navGroups.includes('Quản trị'),
    `[Scenario B3] Navigation renders "QUẢN TRỊ" section header for ADMIN`
  );

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_sidebar_01_desktop_expanded_1440.png') });
  console.log('  ✓ [CAPTURE] fe_sidebar_01_desktop_expanded_1440.png');

  // Scenario B2: Collapse Sidebar via Toggle Button
  const collapseBtn = await page.$('aside button[title*="Thu gọn"]');
  assert(collapseBtn !== null, '[Scenario B4] Sidebar has "Thu gọn thanh điều hướng" toggle button');
  if (collapseBtn) {
    await collapseBtn.click();
    await new Promise(r => setTimeout(r, 400)); // wait for transition
  }

  const sidebarWidthCollapsed = await page.$eval('aside', el => el.getBoundingClientRect().width);
  assert(
    Math.round(sidebarWidthCollapsed) === 80, // w-20 is 80px
    `[Scenario B5] Sidebar collapsed width is 80px (w-20); actual: ${sidebarWidthCollapsed}px`
  );

  const localStorageVal = await page.evaluate(() => localStorage.getItem('duricare_sidebar_collapsed'));
  assert(
    localStorageVal === 'true',
    `[Scenario B6] Sidebar collapsed state persisted in localStorage ('duricare_sidebar_collapsed' = 'true')`
  );

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_sidebar_02_desktop_collapsed_1440.png') });
  console.log('  ✓ [CAPTURE] fe_sidebar_02_desktop_collapsed_1440.png');

  // Expand sidebar back
  const expandBtn = await page.$('aside button[title*="Mở rộng"]');
  assert(expandBtn !== null, '[Scenario B7] Sidebar has "Mở rộng thanh điều hướng" toggle button when collapsed');
  if (expandBtn) {
    await expandBtn.click();
    await new Promise(r => setTimeout(r, 400));
  }

  // Scenario B3: 3-Column AI Assistant Page on Desktop (1440px)
  await page.goto('http://127.0.0.1:5190/agent', { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="agent-iot-context-rail"]');

  const hasRail = await page.$('[data-testid="agent-iot-context-rail"]') !== null;
  assert(hasRail, '[Scenario B8] 3-Column layout renders Realtime IoT Context Rail on desktop');

  const railMetrics = await page.$eval('[data-testid="agent-iot-context-rail"]', el => {
    return {
      hasTemp: el.textContent.includes('Nhiệt độ khí') && el.textContent.includes('28.5°C'),
      hasHum: el.textContent.includes('Độ ẩm khí') && el.textContent.includes('74%'),
      hasSoil: el.textContent.includes('Độ ẩm tầng đất mặt') && el.textContent.includes('42.9%'),
      hasForecast: el.textContent.includes('Dự báo vi khí hậu 48h') && el.textContent.includes('10.6 mm'),
      hasProfile: el.textContent.includes('Hồ sơ nông vụ khu vực') && el.textContent.includes('Đậu trái'),
      hasVisualizerLink: el.querySelector('a[href*="/zones/"]') !== null,
    };
  });

  assert(railMetrics.hasTemp && railMetrics.hasHum && railMetrics.hasSoil, '[Scenario B9] Context rail renders realtime sensor metrics (temp, humidity, topsoil moisture)');
  assert(railMetrics.hasForecast, '[Scenario B10] Context rail renders 48h micro-climate forecast (rain mm & probability)');
  assert(railMetrics.hasProfile, '[Scenario B11] Context rail renders agronomic profile (variety, growth stage, target range)');
  assert(railMetrics.hasVisualizerLink, '[Scenario B12] Context rail has direct navigation link to sensor visualizer chart');

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_agent_01_desktop_3col_1440.png') });
  console.log('  ✓ [CAPTURE] fe_agent_01_desktop_3col_1440.png');

  // Scenario B4: Toggle Context Rail Visibility on Desktop
  const contextToggleBtn = await page.$('[data-testid="toggle-context-rail-btn"]');
  assert(contextToggleBtn !== null, '[Scenario B13] Chat action bar has "Ngữ cảnh trạm đo" toggle button');
  if (contextToggleBtn) {
    await contextToggleBtn.click();
    await new Promise(r => setTimeout(r, 400));
  }

  const railHidden = await page.$('[data-testid="desktop-agent-iot-context-aside"]') === null;
  assert(railHidden, '[Scenario B14] Clicking toggle button collapses Column 3 to 2-column layout on desktop');

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_agent_02_desktop_collapsed_context_1440.png') });
  console.log('  ✓ [CAPTURE] fe_agent_02_desktop_collapsed_context_1440.png');

  // Scenario B5: Mobile Viewport Context Sheet
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('http://127.0.0.1:5190/agent', { waitUntil: 'networkidle0' });

  const mobileToggleBtn = await page.$('[data-testid="toggle-context-rail-btn"]');
  if (mobileToggleBtn) {
    await mobileToggleBtn.click();
    await new Promise(r => setTimeout(r, 400));
  }

  const drawerVisible = await page.$('dialog[open][aria-label*="Ngữ cảnh trạm đo"]') !== null;
  assert(drawerVisible, '[Scenario B15] On mobile viewport, clicking context toggle opens slide-over sheet');

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_agent_03_mobile_context_sheet_375.png') });
  console.log('  ✓ [CAPTURE] fe_agent_03_mobile_context_sheet_375.png');

} finally {
  await browser.close();
  server.close();
}

console.log('\n================================================================');
console.log(`Verification Summary: ${passed}/${total} PASS`);
console.log('================================================================');

if (passed !== total) {
  process.exit(1);
}
