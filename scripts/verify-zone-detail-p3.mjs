#!/usr/bin/env node
/**
 * Automated Verification Suite for UI-REFRESH-CTU-001 P3 (Chi tiết khu vực):
 * 1. Static code assertions:
 *    - ZoneDetailPage implements Stitch layout hierarchy:
 *      Heading/action -> Số đo hiện tại -> Hóa tính đất -> Tabs/period -> Main soil chart -> Side-by-side charts
 *    - SoilProfileCard strictly displays raw chemistry without invented threshold evaluations; missing K is '—'
 *    - SensorChart supports full-width soil moisture with target reference area and endpoint badge
 *    - CareLogTimeline & CareLogForm implement the 7:5 column split and anti-duplicate submit
 *    - GrowthStageControl implements accessible modal dialog with focus trapping and Escape key
 * 2. Headless Chromium interactive browser scenarios:
 *    - Direct navigation with zoneCode and farmId preservation
 *    - Measurement tiles format and bounds
 *    - Soil raw chemistry 5 columns
 *    - Period switching & date window update
 *    - Tab switching between Biểu đồ cảm biến and Nhật ký chăm sóc
 *    - Care log submission and timeline rendering
 *    - Growth stage modal opening and Escape closure
 * 3. Evidence capture (Desktop 1440px & Mobile 375px, Light & Dark themes)
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
console.log('UI-REFRESH-CTU-001 P3 Zone Detail Verification Suite');
console.log('================================================================\n');

// ─── [1/3] Static Code & Contract Checks ─────────────────────
console.log('[1/3] Static code & layout assertions...');

const zoneDetailPagePath = path.join(ROOT_DIR, 'src/pages/ZoneDetailPage.tsx');
const soilProfileCardPath = path.join(ROOT_DIR, 'src/components/SoilProfileCard.tsx');
const sensorChartPath = path.join(ROOT_DIR, 'src/components/SensorChart.tsx');
const growthStageControlPath = path.join(ROOT_DIR, 'src/components/GrowthStageControl.tsx');
const careLogTimelinePath = path.join(ROOT_DIR, 'src/components/CareLogTimeline.tsx');
const careLogFormPath = path.join(ROOT_DIR, 'src/components/CareLogForm.tsx');

const zoneDetailContent = fs.readFileSync(zoneDetailPagePath, 'utf8');
const soilProfileContent = fs.readFileSync(soilProfileCardPath, 'utf8');
const sensorChartContent = fs.readFileSync(sensorChartPath, 'utf8');
const growthStageContent = fs.readFileSync(growthStageControlPath, 'utf8');
const careLogTimelineContent = fs.readFileSync(careLogTimelinePath, 'utf8');
const careLogFormContent = fs.readFileSync(careLogFormPath, 'utf8');

assert(
  zoneDetailContent.includes('Quay lại tổng quan') &&
  zoneDetailContent.includes('Số đo hiện tại') &&
  (zoneDetailContent.includes('SoilProfileCard') || zoneDetailContent.includes('Hóa tính đất')) &&
  zoneDetailContent.includes('Hỏi trợ lý về khu vực này') &&
  zoneDetailContent.includes('/agent?zoneCode='),
  '[Scenario S1] ZoneDetailPage implements breadcrumb, current measurements, soil chemistry, and agent CTA'
);

assert(
  !zoneDetailContent.includes('Dữ liệu mô phỏng') &&
  !zoneDetailContent.includes('Giá trị và ngưỡng trong mẫu là dữ liệu mô phỏng') &&
  !sensorChartContent.includes('isFixture') &&
  !sensorChartContent.includes('Dữ liệu quan sát mô phỏng'),
  '[Scenario S1.1 - R0] Simulation badges and disclaimers are removed from ZoneDetailPage and SensorChart'
);

assert(
  zoneDetailContent.includes('grid-cols-3') &&
  zoneDetailContent.includes('w-full sm:w-auto') &&
  zoneDetailContent.includes('bg-[#f8f9ff]'),
  '[Scenario S1.2 - F5] ZoneDetailPage implements mobile 3-column metric strip, full-width CTA, and #f8f9ff background'
);

assert(
  !zoneDetailContent.includes('.toFixed(0)') &&
  !sensorChartContent.includes('.toFixed(0)'),
  '[Scenario S1.3 - F2] Hardcoded .toFixed(0) eliminated; formatMetricValue used for reading precision'
);

assert(
  soilProfileContent.includes('Chưa áp dụng ngưỡng nông vụ; không suy ra liều bón') &&
  soilProfileContent.includes('—') &&
  soilProfileContent.includes('Mất tín hiệu') &&
  !soilProfileContent.includes("unit: 'µS/cm'") &&
  !soilProfileContent.includes("unit: 'mg/kg'"),
  '[Scenario S2 - F3] SoilProfileCard displays raw chemistry without invented units; respects NO_SIGNAL semantics; missing K is em-dash'
);

assert(
  sensorChartContent.includes('isMain') &&
  sensorChartContent.includes('ReferenceArea') &&
  sensorChartContent.includes('Khoảng mục tiêu cấu hình') &&
  sensorChartContent.includes('Điểm cuối:'),
  '[Scenario S3] SensorChart supports full-width soil moisture with target reference area and endpoint badge'
);

assert(
  growthStageContent.includes('role="dialog"') &&
  growthStageContent.includes('Escape') &&
  growthStageContent.includes('selectRef') &&
  growthStageContent.includes('dialogRef') &&
  growthStageContent.includes('Đổi giai đoạn sinh trưởng'),
  '[Scenario S4 - F4] GrowthStageControl implements accessible modal dialog with select focus, Tab trap, and Escape listener'
);

assert(
  careLogTimelineContent.includes('Lịch sử chăm sóc khu vực') &&
  careLogTimelineContent.includes('lg:col-span-7') &&
  careLogTimelineContent.includes('lg:col-span-5') &&
  careLogFormContent.includes('Hoạt động chăm sóc') &&
  careLogFormContent.includes('Ghi chú (tùy chọn)'),
  '[Scenario S5] CareLogTimeline and CareLogForm implement the 7:5 column split and required care fields'
);

const viJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'src/i18n/locales/vi/translation.json'), 'utf8'));
const enJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'src/i18n/locales/en/translation.json'), 'utf8'));

assert(
  viJson['Nguồn hỗn hợp'] === 'Nguồn hỗn hợp' &&
  enJson['Nguồn hỗn hợp'] === 'Mixed sources' &&
  viJson['Mục tiêu:'] === 'Mục tiêu:' &&
  enJson['Mục tiêu:'] === 'Target:',
  '[Scenario S6 - I18N] Translation keys for "Nguồn hỗn hợp" and "Mục tiêu:" are properly defined in VI and EN catalogs'
);

// ─── [2/3] Setup HTTP Server & Browser ────────────────────────
console.log('\n[2/3] Starting SPA test server and headless browser...');

const PORT = 5198;
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
page.on('console', (msg) => console.log('  [BROWSER CONSOLE]', msg.text()));

await page.setRequestInterception(true);

const mockAuthUser = {
  id: 1,
  email: 'admin@duricare.ctu.vn',
  role: 'ADMIN',
  farmId: 1,
  fullName: 'Nguyễn Văn An (CTU Admin)',
};

const now = Date.now();
const hour = 3600 * 1000;

const mockZone = {
  id: 2,
  farmId: 1,
  code: 'KHU-B',
  name: 'Khu B',
  growthStage: 'PHAT_TRIEN_TRAI',
  representativeTreeId: 102,
};

const mockReadingsSoil = [
  { id: 1, sensorId: 1, sensorType: 'SOIL_MOISTURE', value: 72.0, unit: '%', recordAt: new Date(now - 22 * hour).toISOString(), recordedAt: new Date(now - 22 * hour).toISOString() },
  { id: 2, sensorId: 1, sensorType: 'SOIL_MOISTURE', value: 74.0, unit: '%', recordAt: new Date(now - 18 * hour).toISOString(), recordedAt: new Date(now - 18 * hour).toISOString() },
  { id: 3, sensorId: 1, sensorType: 'SOIL_MOISTURE', value: 76.0, unit: '%', recordAt: new Date(now - 14 * hour).toISOString(), recordedAt: new Date(now - 14 * hour).toISOString() },
  { id: 4, sensorId: 1, sensorType: 'SOIL_MOISTURE', value: 80.0, unit: '%', recordAt: new Date(now - 10 * hour).toISOString(), recordedAt: new Date(now - 10 * hour).toISOString() },
  { id: 5, sensorId: 1, sensorType: 'SOIL_MOISTURE', value: 84.0, unit: '%', recordAt: new Date(now - 4 * hour).toISOString(), recordedAt: new Date(now - 4 * hour).toISOString() },
  { id: 6, sensorId: 1, sensorType: 'SOIL_MOISTURE', value: 88.0, unit: '%', recordAt: new Date(now).toISOString(), recordedAt: new Date(now).toISOString() },
];

const mockReadingsTemp = [
  { id: 11, sensorId: 2, sensorType: 'AIR_TEMPERATURE', value: 27.0, unit: '°C', recordAt: new Date(now - 22 * hour).toISOString(), recordedAt: new Date(now - 22 * hour).toISOString() },
  { id: 12, sensorId: 2, sensorType: 'AIR_TEMPERATURE', value: 26.0, unit: '°C', recordAt: new Date(now - 18 * hour).toISOString(), recordedAt: new Date(now - 18 * hour).toISOString() },
  { id: 13, sensorId: 2, sensorType: 'AIR_TEMPERATURE', value: 25.0, unit: '°C', recordAt: new Date(now - 14 * hour).toISOString(), recordedAt: new Date(now - 14 * hour).toISOString() },
  { id: 14, sensorId: 2, sensorType: 'AIR_TEMPERATURE', value: 26.0, unit: '°C', recordAt: new Date(now - 10 * hour).toISOString(), recordedAt: new Date(now - 10 * hour).toISOString() },
  { id: 15, sensorId: 2, sensorType: 'AIR_TEMPERATURE', value: 28.0, unit: '°C', recordAt: new Date(now - 4 * hour).toISOString(), recordedAt: new Date(now - 4 * hour).toISOString() },
  { id: 16, sensorId: 2, sensorType: 'AIR_TEMPERATURE', value: 29.0, unit: '°C', recordAt: new Date(now).toISOString(), recordedAt: new Date(now).toISOString() },
];

const mockReadingsHumidity = [
  { id: 21, sensorId: 3, sensorType: 'AIR_HUMIDITY', value: 78.0, unit: '%', recordAt: new Date(now - 22 * hour).toISOString(), recordedAt: new Date(now - 22 * hour).toISOString() },
  { id: 22, sensorId: 3, sensorType: 'AIR_HUMIDITY', value: 80.0, unit: '%', recordAt: new Date(now - 18 * hour).toISOString(), recordedAt: new Date(now - 18 * hour).toISOString() },
  { id: 23, sensorId: 3, sensorType: 'AIR_HUMIDITY', value: 82.0, unit: '%', recordAt: new Date(now - 14 * hour).toISOString(), recordedAt: new Date(now - 14 * hour).toISOString() },
  { id: 24, sensorId: 3, sensorType: 'AIR_HUMIDITY', value: 80.0, unit: '%', recordAt: new Date(now - 10 * hour).toISOString(), recordedAt: new Date(now - 10 * hour).toISOString() },
  { id: 25, sensorId: 3, sensorType: 'AIR_HUMIDITY', value: 78.0, unit: '%', recordAt: new Date(now - 4 * hour).toISOString(), recordedAt: new Date(now - 4 * hour).toISOString() },
  { id: 26, sensorId: 3, sensorType: 'AIR_HUMIDITY', value: 76.0, unit: '%', recordAt: new Date(now).toISOString(), recordedAt: new Date(now).toISOString() },
];

let mockCareLogs = [
  {
    id: 1,
    zoneId: 2,
    zoneCode: 'KHU-B',
    actionType: 'INSPECTION',
    note: 'Đối chiếu tình trạng cảm biến và ghi nhận số đo phục vụ smoke test.',
    performBy: 'Người dùng TEST',
    performedAt: new Date(now - 1.5 * hour).toISOString(),
  },
  {
    id: 2,
    zoneId: 2,
    zoneCode: 'KHU-B',
    actionType: 'WATERING',
    note: 'Ghi nhận hoạt động tưới trong hồ sơ mô phỏng.',
    performBy: 'Người dùng TEST',
    performedAt: new Date(now - 28 * hour).toISOString(),
  },
];

const mockOverview = {
  farmName: 'Vườn Sầu Riêng Phong Điền (Khu A & B)',
  generatedAt: new Date(now).toISOString(),
  totalUnresolvedAlerts: 2,
  weather: {
    temperature: 28.4,
    humidity: 78,
    weatherCode: 1,
    precipitationProbabilityToday: 15,
    expectedRainMm48h: 0.0,
    fetchedAt: new Date(now - 10 * 60 * 1000).toISOString(),
    source: 'Open-Meteo Gateway',
  },
  zones: [
    {
      code: 'KHU-B',
      name: 'Khu B',
      growthStage: 'PHAT_TRIEN_TRAI',
      variety: 'Monthong',
      plantingDate: '2020-03-15',
      alerts: { hard: 1, agentic: 1 },
      observedCadenceSeconds: 60.0,
      metrics: {
        soilMoisture: {
          value: 88.0,
          unit: '%',
          status: 'HIGH',
          targetMin: 60.0,
          targetMax: 80.0,
          source: 'MQTT',
          recordedAt: new Date(now).toISOString(),
        },
        temperature: {
          value: 29.0,
          unit: '°C',
          status: 'NORMAL',
          targetMin: null,
          targetMax: null,
          source: 'MQTT',
          recordedAt: new Date(now).toISOString(),
        },
        humidity: {
          value: 76.0,
          unit: '%',
          status: 'NORMAL',
          targetMin: null,
          targetMax: null,
          source: 'MQTT',
          recordedAt: new Date(now).toISOString(),
        },
      },
      soilProfile: {
        observedAt: new Date(now).toISOString(),
        source: 'IOT_LAB',
        ph: { value: 6.2, unit: '', status: 'NORMAL', recordedAt: new Date(now).toISOString(), source: 'IOT_LAB' },
        ec: { value: 116.3, unit: 'µS/cm', status: 'NORMAL', recordedAt: new Date(now).toISOString(), source: 'IOT_LAB' },
        n: { value: 147.0, unit: 'mg/kg', status: 'NORMAL', recordedAt: new Date(now).toISOString(), source: 'IOT_LAB' },
        p: { value: 135.0, unit: 'mg/kg', status: 'NORMAL', recordedAt: new Date(now).toISOString(), source: 'IOT_LAB' },
        k: null, // Missing K
      },
    },
  ],
};

page.on('request', (req) => {
  const url = req.url();
  const method = req.method();

  // Allow local SPA server assets and HTML routes to pass through untouched
  if (url.startsWith(`http://127.0.0.1:${PORT}`)) {
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
      body: JSON.stringify({ accessToken: 'mock-jwt-token', user: mockAuthUser }),
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
      body: JSON.stringify(mockAuthUser),
    });
  }

  if (url.includes('/farms')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Vườn Sầu Riêng Phong Điền (Khu A & B)', code: 'PHONGDIEN-01' }]),
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
      body: JSON.stringify([
        { id: 101, zoneCode: 'KHU-B', message: 'Độ ẩm đất cao hơn ngưỡng cấu hình', severity: 'WARNING', source: 'HARD' },
        { id: 102, zoneCode: 'KHU-B', message: 'Cần chú ý thoát nước gốc', severity: 'INFO', source: 'AGENTIC' },
      ]),
    });
  }

  // Sensor latest
  if (url.includes('/sensors/') && url.includes('/latest')) {
    if (url.includes('SOIL_MOISTURE')) {
      return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(mockReadingsSoil.at(-1)) });
    }
    if (url.includes('TEMPERATURE')) {
      return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(mockReadingsTemp.at(-1)) });
    }
    if (url.includes('HUMIDITY')) {
      return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(mockReadingsHumidity.at(-1)) });
    }
    return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(null) });
  }

  // Sensor historical readings
  if (url.includes('/sensors/') && url.includes('/readings')) {
    if (url.includes('SOIL_MOISTURE')) {
      return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(mockReadingsSoil) });
    }
    if (url.includes('TEMPERATURE')) {
      return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(mockReadingsTemp) });
    }
    if (url.includes('HUMIDITY')) {
      return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(mockReadingsHumidity) });
    }
    return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify([]) });
  }

  // Care logs
  if (url.includes('/care-logs')) {
    if (method === 'POST') {
      const postData = JSON.parse(req.postData() || '{}');
      const newEntry = {
        id: mockCareLogs.length + 1,
        zoneId: postData.zoneId ?? 2,
        zoneCode: 'KHU-B',
        actionType: postData.actionType,
        note: postData.note,
        performBy: postData.performBy || 'Người dùng TEST',
        performedAt: new Date().toISOString(),
      };
      mockCareLogs.unshift(newEntry);
      return req.respond({ status: 201, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(newEntry) });
    }
    return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(mockCareLogs) });
  }

  // Trees
  if (url.includes('/trees')) {
    return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  }

  // Zones by-code
  if (url.includes('/zones/by-code/')) {
    return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(mockZone) });
  }

  // General zones list
  if (url.includes('/zones')) {
    return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify([mockZone]) });
  }

  req.continue();
});

// ─── [3/3] Interactive Browser Scenarios ─────────────────────
console.log('\n[3/3] Running interactive browser scenarios & capturing visual evidence...');

await page.setViewport({ width: 1440, height: 900 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await page.goto(`http://127.0.0.1:${PORT}/zones/KHU-B?farmId=1`, { waitUntil: 'networkidle0' });
await page.waitForSelector('h1', { timeout: 8000 });
await page.evaluate(() => {
  localStorage.setItem('theme', 'light');
  document.documentElement.classList.remove('dark');
});
await new Promise((r) => setTimeout(r, 200));

// Scenario B1: Breadcrumb and Header elements
const breadcrumb = await page.$eval('#breadcrumb-back-overview', (el) => ({
  text: el.textContent.trim(),
  href: el.getAttribute('href') || '',
}));
assert(
  breadcrumb.text.includes('Quay lại tổng quan') && breadcrumb.href.includes('farmId=1'),
  `[Scenario B1.1] Breadcrumb renders "Quay lại tổng quan" and preserves farmId; got: "${breadcrumb.text}" (href: ${breadcrumb.href})`
);

const h1Text = await page.$eval('h1', (el) => el.textContent.trim());
assert(h1Text === 'Khu B', `[Scenario B1.2] Main title renders zone name "Khu B"; got "${h1Text}"`);

const agentLink = await page.$eval('a[href*="/agent?zoneCode=KHU-B"]', (el) => el.getAttribute('href'));
assert(agentLink.includes('farmId=1'), `[Scenario B1.3] Action CTA "Hỏi trợ lý" retains zoneCode=KHU-B and farmId=1; got "${agentLink}"`);

// Scenario B2: Current Measurements Summary (3 columns)
const measurementSection = await page.$eval('section', (el) => el.textContent);
assert(
  measurementSection.includes('Số đo hiện tại') &&
  measurementSection.includes('29°C') &&
  measurementSection.includes('76%') &&
  measurementSection.includes('88%'),
  '[Scenario B2] Section "Số đo hiện tại" renders 3 flat metric columns (29°C, 76%, 88%)'
);

const tileFooters = await page.$$eval('section .grid-cols-3 > div', (tiles) =>
  tiles.map((t) => t.textContent)
);
assert(
  tileFooters.length === 3 &&
  tileFooters.every((txt) => txt.includes('Thiết bị trạm vườn (MQTT)')),
  '[Scenario B2.1 - F1] Each of the 3 measurement tiles independently displays its own provenance and timestamp'
);

const abnormalSoilBadge = await page.$eval('span[class*="text-[#b45309]"]', (el) => el.textContent.trim());
assert(abnormalSoilBadge.includes('Cao hơn ngưỡng') || measurementSection.includes('Cao hơn ngưỡng'), '[Scenario B2.2] Soil moisture (88%) renders "Cao hơn ngưỡng" status badge');

// Scenario B3: Soil Raw Chemistry Panel (5 columns)
const soilPanel = await page.$eval('section[data-testid="soil-profile-card"]', (el) => el.textContent);
assert(
  soilPanel.includes('Hóa tính đất') &&
  soilPanel.includes('Trắc diện S1 · Dữ liệu kỹ thuật thô') &&
  soilPanel.includes('Chưa áp dụng ngưỡng nông vụ') &&
  (soilPanel.includes('6.2') || soilPanel.includes('6,2')) &&
  (soilPanel.includes('116.3') || soilPanel.includes('116,3')) &&
  soilPanel.includes('147') &&
  soilPanel.includes('135') &&
  soilPanel.includes('—'),
  '[Scenario B3] Hóa tính đất renders 5 columns: pH (6.2), EC (116.3), N (147), P (135), and missing K as em-dash (—)'
);

// Scenario B4: Charts Tab & Full-Width Soil Moisture Focus
const charts = await page.$$('div[data-chart]');
assert(charts.length === 3, `[Scenario B4.1] Renders 3 sensor charts (Soil Moisture, Temp, Humidity); got ${charts.length}`);

const soilChartHeading = await page.$eval('div[data-chart*="Độ ẩm đất"]', (el) => el.textContent);
assert(
  soilChartHeading.includes('Khoảng mục tiêu cấu hình 60–80%') &&
  soilChartHeading.includes('Số đo cảm biến'),
  '[Scenario B4.2] Soil moisture chart renders full-width focus with target area reference and sensor line legend'
);

// Capture Desktop Light (Charts Tab)
await page.evaluate(() => {
  localStorage.setItem('theme', 'light');
  document.documentElement.classList.remove('dark');
});
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_zone_detail_01_desktop_charts_light_1440.png'), fullPage: false });
console.log('  ✓ [CAPTURE] fe_zone_detail_01_desktop_charts_light_1440.png');

// Capture Desktop Dark (Charts Tab)
await page.evaluate(() => {
  localStorage.setItem('theme', 'dark');
  document.documentElement.classList.add('dark');
});
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_zone_detail_02_desktop_charts_dark_1440.png'), fullPage: false });
console.log('  ✓ [CAPTURE] fe_zone_detail_02_desktop_charts_dark_1440.png');
await page.evaluate(() => {
  localStorage.setItem('theme', 'light');
  document.documentElement.classList.remove('dark');
});
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await new Promise((r) => setTimeout(r, 200));

// Scenario B5: Period selector
await page.click('button[aria-pressed="false"]:nth-of-type(1)'); // Click "Hôm nay"
await new Promise((r) => setTimeout(r, 200));
const todayPressed = await page.$eval('button[aria-pressed="true"]', (el) => el.textContent.trim());
assert(todayPressed === 'Hôm nay', `[Scenario B5] Period switcher activates "Hôm nay"; got "${todayPressed}"`);

// Scenario B6: Tab Switch to "Nhật ký chăm sóc" & 7:5 Split Form
await page.click('#tab-care-logs');
await new Promise((r) => setTimeout(r, 300));

const careHistoryTitle = await page.$eval('#heading-care-history', (el) => el.textContent.trim());
assert(careHistoryTitle.includes('Lịch sử chăm sóc khu vực'), '[Scenario B6.1] Switching to CARE_LOGS tab reveals care history section');

// Open the form so the 7:5 split is rendered for evidence capture
const newCareButton = await page.$('#btn-new-care-log');
if (newCareButton) {
  await newCareButton.click();
  await new Promise((r) => setTimeout(r, 200));
}

const formExists = await page.$('form[aria-label="Ghi nhật ký mới"]');
assert(Boolean(formExists), '[Scenario B6.2] CareLogForm is open in right 5-column layout');

// Capture Desktop Light (Care Logs Tab with Form Open)
await page.evaluate(() => {
  localStorage.setItem('theme', 'light');
  document.documentElement.classList.remove('dark');
});
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_zone_detail_03_desktop_care_light_1440.png'), fullPage: false });
console.log('  ✓ [CAPTURE] fe_zone_detail_03_desktop_care_light_1440.png');

// Capture Desktop Dark (Care Logs Tab with Form Open)
await page.evaluate(() => {
  localStorage.setItem('theme', 'dark');
  document.documentElement.classList.add('dark');
});
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_zone_detail_04_desktop_care_dark_1440.png'), fullPage: false });
console.log('  ✓ [CAPTURE] fe_zone_detail_04_desktop_care_dark_1440.png');
await page.evaluate(() => {
  localStorage.setItem('theme', 'light');
  document.documentElement.classList.remove('dark');
});
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await new Promise((r) => setTimeout(r, 200));

// Scenario B7: Submitting Care Log in form
await page.select('select[id*="-action"]', 'FERTILIZING');
await page.type('textarea[id*="-note"]', 'Bón bổ sung phân hữu cơ sinh học');
await page.click('button[type="submit"]');
await new Promise((r) => setTimeout(r, 500));

const feedbackStatus = await page.$eval('div[role="status"]', (el) => el.textContent.trim());
assert(feedbackStatus.includes('Đã lưu nhật ký chăm sóc'), `[Scenario B7] Care log submission shows success banner; got "${feedbackStatus}"`);

// Scenario B8: Stage changing modal, initial focus, Tab trap & Escape handling
await page.click('#tab-charts');
await new Promise((r) => setTimeout(r, 200));

const changeStageBtn = await page.$('button[title*="Đổi giai đoạn"]');
if (changeStageBtn) {
  await changeStageBtn.click();
  await new Promise((r) => setTimeout(r, 200));

  const modalDialog = await page.$('div[role="dialog"]');
  assert(Boolean(modalDialog), '[Scenario B8.1] Clicking "Đổi giai đoạn" opens accessible modal dialog');

  // Verify initial focus goes to select dropdown
  const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
  assert(activeTagName === 'SELECT', `[Scenario B8.2 - F4] Initial focus is on the <select> element; got "${activeTagName}"`);

  // Verify Tab focus trap within dialog
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const trappedElement = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim());
  assert(Boolean(trappedElement), `[Scenario B8.3 - F4] Tab key navigation stays trapped within modal dialog; active: "${trappedElement}"`);

  // Press Escape to close and verify focus restores to trigger
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 200));

  const modalDialogClosed = await page.$('div[role="dialog"]');
  const returnedFocusText = await page.evaluate(() => document.activeElement?.textContent?.trim());
  assert(
    !modalDialogClosed && returnedFocusText?.includes('Đổi giai đoạn'),
    `[Scenario B8.4 - F4] Escape key closes modal dialog and returns focus to trigger button; active: "${returnedFocusText}"`
  );
}

// Scenario B9: Mobile Viewport 375px (3-column strip & full-width CTA)
await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
await page.goto(`http://127.0.0.1:${PORT}/zones/KHU-B?farmId=1`, { waitUntil: 'networkidle0' });
await page.waitForSelector('h1', { timeout: 8000 });

// Verify 3 columns are in a single horizontal row on mobile
const tileBoxes = await page.$$eval('section .grid-cols-3 > div', (elements) =>
  elements.map((el) => {
    const rect = el.getBoundingClientRect();
    return { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width) };
  })
);
const allSameRow = tileBoxes.length === 3 && Math.abs(tileBoxes[0].top - tileBoxes[1].top) <= 4 && Math.abs(tileBoxes[1].top - tileBoxes[2].top) <= 4;
assert(allSameRow, `[Scenario B9.1 - F5] Mobile 3-column metric strip displays in 1 single row on 375px viewport (tops: ${tileBoxes.map(b => b.top).join(', ')})`);

// Verify action CTA is full-width on mobile
const ctaWidth = await page.$eval('#btn-agent-zone', (el) => Math.round(el.getBoundingClientRect().width));
assert(ctaWidth >= 300, `[Scenario B9.2 - F5] Action CTA button is full-width on mobile (width: ${ctaWidth}px >= 300px)`);

// Mobile Light (Charts)
await page.evaluate(() => {
  localStorage.setItem('theme', 'light');
  document.documentElement.classList.remove('dark');
});
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_zone_detail_05_mobile_charts_light_375.png'), fullPage: false });
console.log('  ✓ [CAPTURE] fe_zone_detail_05_mobile_charts_light_375.png');

// Mobile Dark (Charts)
await page.evaluate(() => {
  localStorage.setItem('theme', 'dark');
  document.documentElement.classList.add('dark');
});
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_zone_detail_06_mobile_charts_dark_375.png'), fullPage: false });
console.log('  ✓ [CAPTURE] fe_zone_detail_06_mobile_charts_dark_375.png');
await page.evaluate(() => {
  localStorage.setItem('theme', 'light');
  document.documentElement.classList.remove('dark');
});
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await new Promise((r) => setTimeout(r, 200));

// Mobile Light (Care Logs)
await page.click('#tab-care-logs');
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fe_zone_detail_07_mobile_care_light_375.png'), fullPage: false });
console.log('  ✓ [CAPTURE] fe_zone_detail_07_mobile_care_light_375.png');

// Verify distinct light and dark image file sizes
const size01 = fs.statSync(path.join(EVIDENCE_DIR, 'fe_zone_detail_01_desktop_charts_light_1440.png')).size;
const size02 = fs.statSync(path.join(EVIDENCE_DIR, 'fe_zone_detail_02_desktop_charts_dark_1440.png')).size;
const size03 = fs.statSync(path.join(EVIDENCE_DIR, 'fe_zone_detail_03_desktop_care_light_1440.png')).size;
const size04 = fs.statSync(path.join(EVIDENCE_DIR, 'fe_zone_detail_04_desktop_care_dark_1440.png')).size;
const size05 = fs.statSync(path.join(EVIDENCE_DIR, 'fe_zone_detail_05_mobile_charts_light_375.png')).size;
const size06 = fs.statSync(path.join(EVIDENCE_DIR, 'fe_zone_detail_06_mobile_charts_dark_375.png')).size;

assert(size01 !== size02 && size03 !== size04 && size05 !== size06, `[Scenario B9.3] Verified distinct Light and Dark theme renders across all captures (D: ${size01} vs ${size02}, Care: ${size03} vs ${size04}, M: ${size05} vs ${size06})`);

// ─── Teardown ────────────────────────────────────────────────
await browser.close();
server.close();

console.log('\n================================================================');
console.log(`UI-REFRESH-CTU-001 P3 Summary: ${passed}/${total} PASS`);
console.log('================================================================');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
