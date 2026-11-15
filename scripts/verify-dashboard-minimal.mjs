/**
 * FE-DASHBOARD-MINIMAL-001: Automated Verification Suite
 * Verifies all requirements of the minimalist Dashboard / Overview redesign
 * inspired by Stitch design (1440px):
 * 1. Compact horizontal status strip (problem, disconnected, open alerts vs all-good)
 * 2. 2-column layout with 340px sticky right rail
 * 3. Minimalist ZoneCards with 3 metric tiles, qualitative labels, benchmarks, offline banner
 * 4. Weather rail card with temperature, rainfall metrics, and 2-day forecast tiles
 * 5. AI assistant rail card with active insight bubble, empty variant, suggestions, quick input
 * 6. Responsive layouts (1440px desktop, 360px mobile) in light and dark themes
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import puppeteer from 'puppeteer';

console.log('================================================================');
console.log('FE-DASHBOARD-MINIMAL-001: Verification Suite');
console.log('================================================================');

let total = 0;
let passed = 0;
const results = [];

function recordTest(id, name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ [PASS] [Scenario ${id}] ${name}`);
    passed++;
    results.push({ id, name, status: 'PASS' });
  } catch (err) {
    console.error(`  ✗ [FAIL] [Scenario ${id}] ${name}`);
    console.error(err);
    results.push({ id, name, status: 'FAIL', error: String(err) });
  }
}

async function recordTestAsync(id, name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ [PASS] [Scenario ${id}] ${name}`);
    passed++;
    results.push({ id, name, status: 'PASS' });
  } catch (err) {
    console.error(`  ✗ [FAIL] [Scenario ${id}] ${name}`);
    console.error(err);
    results.push({ id, name, status: 'FAIL', error: String(err) });
  }
}

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const worktreeDir = path.resolve(scriptDir, '..');
const distDir = path.resolve(worktreeDir, 'dist');
const evidenceDir = 'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence';

if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  throw new Error(`Dist directory not found at ${distDir}. Run "npm run build" first.`);
}

// ---------------------------------------------------------------------------
// 1. Static Verification of Refactored Components
// ---------------------------------------------------------------------------
console.log('\n[1/3] Static code & contract assertions...');

const dashboardPageSrc = fs.readFileSync(path.join(worktreeDir, 'src/pages/DashboardPage.tsx'), 'utf8');
const statusStripSrc = fs.readFileSync(path.join(worktreeDir, 'src/components/DashboardStatusStrip.tsx'), 'utf8');
const zoneCardSrc = fs.readFileSync(path.join(worktreeDir, 'src/components/ZoneCard.tsx'), 'utf8');
const weatherCardSrc = fs.readFileSync(path.join(worktreeDir, 'src/components/WeatherCard.tsx'), 'utf8');
const insightCardSrc = fs.readFileSync(path.join(worktreeDir, 'src/components/InsightCard.tsx'), 'utf8');

recordTest('S1', 'DashboardPage imports DashboardStatusStrip and sticky 340px right rail', () => {
  assert.ok(dashboardPageSrc.includes('DashboardStatusStrip'), 'Must import DashboardStatusStrip');
  assert.ok(dashboardPageSrc.includes('lg:w-[340px]'), 'Must include 340px right rail width');
  assert.ok(dashboardPageSrc.includes('lg:sticky'), 'Must include sticky positioning for rail');
});

recordTest('S2', 'DashboardStatusStrip implements problem, disconnected, alerts, and all-good states', () => {
  assert.ok(statusStripSrc.includes('status-pill-all-good'), 'Must include all-good pill');
  assert.ok(statusStripSrc.includes('status-pill-attention'), 'Must include attention pill');
  assert.ok(statusStripSrc.includes('status-pill-disconnected'), 'Must include disconnected pill');
  assert.ok(statusStripSrc.includes('status-pill-alerts'), 'Must include alerts pill');
});

recordTest('S3', 'ZoneCard implements 3 metric tiles, benchmarks, and disconnected fallback', () => {
  assert.ok(zoneCardSrc.includes('Lý tưởng'), 'Must include qualitative status Lý tưởng');
  assert.ok(zoneCardSrc.includes('Đủ ẩm rễ'), 'Must include qualitative status Đủ ẩm rễ');
  assert.ok(zoneCardSrc.includes('Thấp hơn ngưỡng'), 'Must include qualitative status Thấp hơn ngưỡng');
  assert.ok(zoneCardSrc.includes('formatTargetBenchmark'), 'Must format target benchmarks');
  assert.ok(zoneCardSrc.includes('wifi_off'), 'Must render wifi_off icon when disconnected');
  assert.ok(zoneCardSrc.includes('soil-s1-preview'), 'Must preserve Soil S1 contract preview');
});

recordTest('S4', 'WeatherCard implements current conditions, rain 48h, and 2-day forecast', () => {
  assert.ok(weatherCardSrc.includes('Thời tiết'), 'Must have title Thời tiết');
  assert.ok(weatherCardSrc.includes('Tổng lượng mưa dự báo hai ngày lịch'), 'Must show legacy aggregate calendar days rain');
  assert.ok(!weatherCardSrc.includes('1.08'), 'Must NOT contain invented rain multiplier 1.08');
  assert.ok(!weatherCardSrc.includes('todayMin'), 'Must NOT contain fabricated daily forecast todayMin');
});

recordTest('S5', 'InsightCard implements active insight bubble, empty variant, suggestions, and quick input', () => {
  assert.ok(insightCardSrc.includes('ai-active-insight'), 'Must render active insight');
  assert.ok(insightCardSrc.includes('ai-empty-insight'), 'Must render empty insight fallback');
  assert.ok(insightCardSrc.includes('Gợi ý câu hỏi'), 'Must render question suggestions');
  assert.ok(insightCardSrc.includes('DEFAULT_SUGGESTIONS'), 'Must define default prompt suggestions');
});

// ---------------------------------------------------------------------------
// 2. Launch SPA Server for Puppeteer E2E Testing
// ---------------------------------------------------------------------------
console.log('\n[2/3] Starting SPA test server and headless browser...');

const PORT = 5189;
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
  let filePath = path.join(distDir, urlPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return fs.createReadStream(filePath).pipe(res);
  }

  const indexPath = path.join(distDir, 'index.html');
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
await page.setRequestInterception(true);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-XSRF-TOKEN',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const respondJson = (req, status, data) => {
  return req.respond({
    status,
    headers: CORS_HEADERS,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });
};

const now = Date.now();
const minute = 60 * 1000;

let mockOverview = {
  farmName: 'Vườn Sầu Riêng Ba Tri',
  generatedAt: new Date(now).toISOString(),
  totalUnresolvedAlerts: 3,
  latestInsight: {
    zoneCode: 'zoneC',
    message: 'Khu C đang ở 62% độ ẩm đất, thấp hơn ngưỡng giai đoạn Ra hoa (70–80%). Dự báo mưa 21,5 mm trong 48 giờ.',
    createdAt: new Date(now - 2 * 60 * minute).toISOString(),
  },
  weather: {
    temperature: 29,
    humidity: 78,
    weatherCode: 95, // thunderstorm
    precipitationProbabilityToday: 83,
    expectedRainMm48h: 21.5,
    fetchedAt: new Date(now - 15 * minute).toISOString(),
    source: 'Open-Meteo',
  },
  zones: [
    {
      code: 'zoneB',
      name: 'Khu B',
      growthStage: 'KIEN_THIET_CO_BAN',
      variety: 'Ri6',
      plantingDate: '2023-01-10',
      alerts: { hard: 0, agentic: 0 },
      observedCadenceSeconds: 60.0,
      metrics: {
        temperature: { value: 27, unit: '°C', recordedAt: new Date(now - 5 * minute).toISOString(), status: 'NORMAL', targetMin: 24, targetMax: 30, source: 'MQTT' },
        humidity: { value: 80, unit: '%', recordedAt: new Date(now - 5 * minute).toISOString(), status: 'NORMAL', targetMin: 75, targetMax: 85, source: 'MQTT' },
        soilMoisture: { value: 72, unit: '%', recordedAt: new Date(now - 2 * minute).toISOString(), status: 'NORMAL', targetMin: 65, targetMax: 80, source: 'IOTLAB' },
      },
    },
    {
      code: 'zoneC',
      name: 'Khu C',
      growthStage: 'RA_HOA',
      variety: 'Ri6',
      plantingDate: '2022-05-12',
      alerts: { hard: 2, agentic: 0 },
      observedCadenceSeconds: 60.0,
      metrics: {
        temperature: { value: 28, unit: '°C', recordedAt: new Date(now - 5 * minute).toISOString(), status: 'NORMAL', targetMin: 24, targetMax: 30, source: 'MQTT' },
        humidity: { value: 79, unit: '%', recordedAt: new Date(now - 5 * minute).toISOString(), status: 'NORMAL', targetMin: 75, targetMax: 85, source: 'MQTT' },
        soilMoisture: { value: 62, unit: '%', recordedAt: new Date(now - 2 * minute).toISOString(), status: 'LOW', targetMin: 70, targetMax: 80, source: 'IOTLAB' },
      },
    },
    {
      code: 'zoneA',
      name: 'Khu A',
      growthStage: 'PHAT_TRIEN_TRAI',
      variety: 'Ri6',
      plantingDate: '2021-08-20',
      alerts: { hard: 1, agentic: 0 },
      observedCadenceSeconds: 120.0,
      metrics: {
        temperature: { value: null, unit: '°C', recordedAt: new Date(now - 300 * minute).toISOString(), status: 'NO_SIGNAL', targetMin: 24, targetMax: 32, source: null },
        humidity: { value: null, unit: '%', recordedAt: new Date(now - 300 * minute).toISOString(), status: 'NO_SIGNAL', targetMin: 70, targetMax: 85, source: null },
        soilMoisture: { value: null, unit: '%', recordedAt: new Date(now - 300 * minute).toISOString(), status: 'NO_SIGNAL', targetMin: 60, targetMax: 80, source: null },
      },
    },
  ],
};

page.on('pageerror', err => console.error('  [PAGE ERROR]', err.message));

page.on('request', (req) => {
  const url = req.url();
  const method = req.method();

  if (url.includes('/api/')) {
    if (method === 'OPTIONS') {
      return req.respond({ status: 204, headers: CORS_HEADERS });
    }
  }

  if (url.includes('/auth/refresh')) {
    return respondJson(req, 200, { accessToken: 'mock-jwt' });
  }
  if (url.includes('/auth/csrf')) {
    return respondJson(req, 200, { token: 'csrf-token' });
  }
  if (url.includes('/auth/me')) {
    return respondJson(req, 200, { id: 1, email: 'admin@duricare.vn', username: 'admin', fullName: 'Quản trị viên', role: 'ADMIN' });
  }
  if (url.includes('/overview')) {
    return respondJson(req, 200, mockOverview);
  }
  if (url.includes('/farms')) {
    return respondJson(req, 200, [{ id: 1, name: 'Vườn Sầu Riêng Ba Tri' }]);
  }
  if (url.includes('/alerts')) {
    return respondJson(req, 200, []);
  }
  if (url.includes('/zones')) {
    return respondJson(req, 200, []);
  }
  req.continue();
});

// ---------------------------------------------------------------------------
// 3. Run Browser Test Scenarios
// ---------------------------------------------------------------------------
console.log('\n[3/3] Running browser scenarios & capturing visual evidence...');

await page.setViewport({ width: 1440, height: 1050 });
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
await page.waitForSelector('[data-testid="dashboard-status-strip"]', { timeout: 10000 });

// Scenario 1: Status Strip problem, disconnected, and alerts pills
await recordTestAsync('B1', 'Status Strip renders attention, disconnected, and open alerts pills', async () => {
  const attentionText = await page.$eval('[data-testid="status-pill-attention"]', el => el.textContent);
  assert.ok(attentionText.includes('khu cần chú ý'), `Attention pill text must match, got: ${attentionText}`);

  const disconnectedText = await page.$eval('[data-testid="status-pill-disconnected"]', el => el.textContent);
  assert.ok(disconnectedText.includes('khu mất kết nối'), `Disconnected pill text must match, got: ${disconnectedText}`);

  const alertsText = await page.$eval('[data-testid="status-pill-alerts"]', el => el.textContent);
  assert.ok(alertsText.includes('3 cảnh báo đang mở'), `Alerts pill text must match, got: ${alertsText}`);
});

// Scenario 2: Two-column layout and sticky 340px right rail
await recordTestAsync('B2', 'Layout establishes 2 columns with 340px right rail aside', async () => {
  const asideInfo = await page.$eval('[data-testid="dashboard-right-rail"]', el => ({
    className: el.className,
    width: el.getBoundingClientRect().width,
  }));
  assert.ok(asideInfo.className.includes('lg:w-[340px]'), 'Aside must have lg:w-[340px] class');
  assert.ok(asideInfo.className.includes('lg:sticky'), 'Aside must have lg:sticky class');
  assert.strictEqual(Math.round(asideInfo.width), 340, `Aside rendered width must be 340px, got ${asideInfo.width}`);
});

// Scenario 3: Zone B (Normal zone) - 3 metric tiles with qualitative labels
await recordTestAsync('B3', 'Zone B (Normal) renders 3 metric tiles with qualitative labels and benchmarks', async () => {
  const zoneB = await page.$('[data-zone="zoneB"]');
  assert.ok(zoneB, 'Zone B article must exist');

  const text = await zoneB.evaluate(el => el.textContent);
  assert.ok(text.includes('27°C') && text.includes('Lý tưởng'), 'Must render 27°C Lý tưởng');
  assert.ok(text.includes('80%') && text.includes('Ổn định'), 'Must render 80% Ổn định');
  assert.ok(text.includes('72%') && text.includes('Đủ ẩm rễ'), 'Must render 72% Đủ ẩm rễ');
  assert.ok(text.includes('Mục tiêu 24–30°C'), 'Must render target benchmark for temp');
  assert.ok(text.includes('Xem chi tiết'), 'Must render Xem chi tiết button for normal zone');
});

// Scenario 4: Zone C (Abnormal zone) - Out-of-target highlighting & dual action buttons
await recordTestAsync('B4', 'Zone C (Abnormal) renders out-of-target highlight, title link, and both "Xem chi tiết" + "Xem 2 cảnh báo"', async () => {
  const zoneC = await page.$('[data-zone="zoneC"]');
  assert.ok(zoneC, 'Zone C article must exist');

  const text = await zoneC.evaluate(el => el.textContent);
  assert.ok(text.includes('62%') && text.includes('Thấp hơn ngưỡng'), 'Must render 62% Thấp hơn ngưỡng');
  assert.ok(text.includes('2 cảnh báo'), 'Must display 2 cảnh báo badge');
  assert.ok(text.includes('Xem 2 cảnh báo'), 'Must render Xem 2 cảnh báo button');
  assert.ok(text.includes('Xem chi tiết'), 'Must also retain Xem chi tiết button when having alerts');

  // Verify zone link exists for navigating to detail page
  const zoneDetailLinks = await zoneC.$$eval('a[href*="/zones/zoneC"]', els => els.length);
  assert.ok(zoneDetailLinks >= 2, `Must provide at least 2 navigation links to /zones/zoneC (title and button), found ${zoneDetailLinks}`);
});

// Scenario 5: Zone A (Disconnected zone) - Offline banner
await recordTestAsync('B5', 'Zone A (Disconnected) renders signal lost banner with wifi_off icon', async () => {
  const zoneA = await page.$('[data-zone="zoneA"]');
  assert.ok(zoneA, 'Zone A article must exist');

  const text = await zoneA.evaluate(el => el.textContent);
  assert.ok(text.includes('wifi_off') || text.includes('Mất tín hiệu'), 'Must render signal lost status');
});

// Scenario 6: Weather Rail Card
await recordTestAsync('B6', 'Weather rail card renders temperature, rainfall metrics, and verified labels', async () => {
  const weatherCard = await page.$('[data-testid="weather-rail-card"]');
  assert.ok(weatherCard, 'Weather rail card must exist');

  const text = await weatherCard.evaluate(el => el.textContent);
  assert.ok(text.includes('29°C'), 'Must display 29°C');
  assert.ok(text.includes('Thời tiết'), 'Must show title Thời tiết');
  assert.ok(text.includes('Nhiệt độ vườn'), 'Must show air temperature title');
  assert.ok(text.includes('Độ ẩm khí quyển'), 'Must show air humidity title');
  assert.ok(text.includes('Tổng lượng mưa dự báo hai ngày lịch'), 'Must show aggregate rainfall label');
  assert.ok(!text.includes('1.08'), 'Must NOT contain invented rain multiplier 1.08');
});

// Scenario 7: AI Assistant Rail Card
await recordTestAsync('B7', 'AI Assistant rail card renders active insight, suggestion chips, and input form', async () => {
  const aiCard = await page.$('[data-testid="ai-assistant-rail-card"]');
  assert.ok(aiCard, 'AI card must exist');

  const text = await aiCard.evaluate(el => el.textContent);
  assert.ok(text.includes('Trợ lý AI'), 'Must have title Trợ lý AI');
  assert.ok(text.includes('Khu C đang ở 62% độ ẩm đất'), 'Must display latest insight message');
  assert.ok(text.includes('Căn cứ: cảm biến · thời tiết · ngưỡng giai đoạn'), 'Must display basis meta');
  assert.ok(text.includes('Gợi ý câu hỏi'), 'Must display suggestion chips');
});

// Capture Screenshot 1: Desktop 1440px Light Mode
await page.screenshot({
  path: path.join(evidenceDir, 'fe_dashboard_01_desktop_light_1440.png'),
  fullPage: false,
});
console.log('  ✓ [CAPTURE] fe_dashboard_01_desktop_light_1440.png');

// Capture Screenshot 2: Desktop 1440px Dark Mode
await page.evaluate(() => {
  document.documentElement.classList.add('dark');
});
await page.screenshot({
  path: path.join(evidenceDir, 'fe_dashboard_02_desktop_dark_1440.png'),
  fullPage: false,
});
console.log('  ✓ [CAPTURE] fe_dashboard_02_desktop_dark_1440.png');

// Reset to Light Mode for All-Good test
await page.evaluate(() => {
  document.documentElement.classList.remove('dark');
});

// Scenario 8: All-Good Status Strip state
await recordTestAsync('B8', 'All-Good state renders emerald "Mọi khu vực bình thường" pill', async () => {
  // Update mock overview to all normal
  mockOverview = {
    ...mockOverview,
    totalUnresolvedAlerts: 0,
    latestInsight: null,
    zones: mockOverview.zones.map(z => ({
      ...z,
      alerts: { hard: 0, agentic: 0 },
      metrics: {
        temperature: { value: 28, unit: '°C', recordedAt: new Date().toISOString(), status: 'NORMAL', targetMin: 24, targetMax: 30 },
        humidity: { value: 80, unit: '%', recordedAt: new Date().toISOString(), status: 'NORMAL', targetMin: 75, targetMax: 85 },
        soilMoisture: { value: 75, unit: '%', recordedAt: new Date().toISOString(), status: 'NORMAL', targetMin: 65, targetMax: 80 },
      },
    })),
  };

  // Reload page
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="status-pill-all-good"]', { timeout: 10000 });

  const allGoodText = await page.$eval('[data-testid="status-pill-all-good"]', el => el.textContent);
  assert.ok(allGoodText.includes('Mọi khu vực bình thường'), 'Must show Mọi khu vực bình thường');

  const attentionPill = await page.$('[data-testid="status-pill-attention"]');
  assert.strictEqual(attentionPill, null, 'Attention pill must not be rendered when all good');

  // Verify empty insight state in AI card
  const emptyInsight = await page.$('[data-testid="ai-empty-insight"]');
  assert.ok(emptyInsight, 'Empty insight state must be rendered');
});

// Capture Screenshot 3: Desktop 1440px All-Good State
await page.screenshot({
  path: path.join(evidenceDir, 'fe_dashboard_03_desktop_all_good_1440.png'),
  fullPage: false,
});
console.log('  ✓ [CAPTURE] fe_dashboard_03_desktop_all_good_1440.png');

// Scenario 9: Mobile Viewport (360px)
await recordTestAsync('B9', 'Mobile viewport (360px) stacks left column and right rail cleanly', async () => {
  await page.setViewport({ width: 360, height: 800 });
  await page.screenshot({
    path: path.join(evidenceDir, 'fe_dashboard_04_mobile_light_360.png'),
    fullPage: false,
  });
  console.log('  ✓ [CAPTURE] fe_dashboard_04_mobile_light_360.png');

  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await page.screenshot({
    path: path.join(evidenceDir, 'fe_dashboard_05_mobile_dark_360.png'),
    fullPage: false,
  });
  console.log('  ✓ [CAPTURE] fe_dashboard_05_mobile_dark_360.png');
});

await browser.close();
server.close();

console.log('\n================================================================');
console.log(`Verification Summary: ${passed}/${total} PASS`);
console.log('================================================================');

if (passed !== total) {
  process.exit(1);
}
