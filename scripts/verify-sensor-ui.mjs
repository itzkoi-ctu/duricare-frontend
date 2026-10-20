import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { createSpaServer } from './spa-server.mjs';

const EVIDENCE_DIR = 'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence';
const PORT = 5182;
const BASE_URL = `http://127.0.0.1:${PORT}`;

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const now = Date.now();
const minute = 60 * 1000;

const MOCK_USER = {
  id: 1,
  email: 'admin@duricare.vn',
  fullName: 'Nguyễn Văn Quản Trị',
  role: 'ADMIN',
};

// Overview mock covering F1, F2, F3, F4
const MOCK_OVERVIEW = {
  farmName: 'Vườn Sầu Riêng Cái Mơn',
  generatedAt: new Date(now).toISOString(),
  totalUnresolvedAlerts: 0,
  latestInsight: null,
  weather: {
    temperature: 31.5,
    humidity: 78.0,
    weatherCode: 1,
    precipitationProbabilityToday: 10,
    expectedRainMm48h: 5.0,
    fetchedAt: new Date(now - 10 * minute).toISOString(),
    source: 'Trạm Khí tượng Cần Thơ',
  },
  zones: [
    {
      code: 'ZONE-01',
      name: 'Khu A',
      growthStage: 'RA_HOA',
      variety: 'Ri6',
      plantingDate: '2022-03-15',
      alerts: { hard: 0, agentic: 0 },
      observedCadenceSeconds: 60.0,
      soilMoistureTrend: [
        { t: new Date(now - 60 * minute).toISOString(), v: 72.0 },
        { t: new Date(now - 50 * minute).toISOString(), v: 73.5 },
        { t: new Date(now - 40 * minute).toISOString(), v: 75.0 },
        { t: new Date(now - 30 * minute).toISOString(), v: 76.2 },
        { t: new Date(now - 20 * minute).toISOString(), v: 75.0 },
        { t: new Date(now - 10 * minute).toISOString(), v: 74.0 },
        { t: new Date(now - 2 * minute).toISOString(), v: 74.5 },
      ],
      metrics: {
        temperature: {
          value: 29.5,
          unit: '°C',
          recordedAt: new Date(now - 5 * minute).toISOString(),
          status: 'NORMAL',
          targetMin: 24.0,
          targetMax: 32.0,
          source: null, // F3: Test null provenance row in detail mode
        },
        humidity: {
          value: 78.0,
          unit: '%',
          recordedAt: new Date(now - 5 * minute).toISOString(),
          status: 'NORMAL',
          targetMin: 70.0,
          targetMax: 85.0,
          source: 'MQTT',
        },
        soilMoisture: {
          value: 74.5,
          unit: '%',
          recordedAt: new Date(now - 2 * minute).toISOString(),
          status: 'NORMAL',
          targetMin: 70.0,
          targetMax: 80.0,
          source: 'IOTLAB',
        },
      },
      soilProfile: {
        // F1: Test unit: null (must NOT invent fallback unit 'pH')
        ph: {
          value: 6.2,
          unit: null,
          recordedAt: new Date(now - 5 * minute).toISOString(),
          status: 'NO_TARGET',
          source: 'IOTLAB',
        },
        // F1: Test non-null unit verbatim
        ec: {
          value: 1.15,
          unit: 'µS/cm',
          recordedAt: new Date(now - 5 * minute).toISOString(),
          status: 'NO_TARGET',
          source: 'IOTLAB',
        },
        n: {
          value: 45.0,
          unit: 'mg/kg',
          recordedAt: new Date(now - 10 * minute).toISOString(),
          status: 'NO_TARGET',
          source: 'IOTLAB',
        },
        p: {
          value: 28.5,
          unit: 'mg/kg',
          recordedAt: new Date(now - 10 * minute).toISOString(),
          status: 'NO_TARGET',
          source: 'IOTLAB',
        },
        k: {
          value: 120.0,
          unit: 'mg/kg',
          recordedAt: new Date(now - 10 * minute).toISOString(),
          status: 'NO_TARGET',
          source: 'IOTLAB',
        },
      },
    },
    {
      code: 'ZONE-02',
      name: 'Khu B',
      growthStage: 'PHAT_TRIEN_TRAI',
      variety: 'Monthong',
      plantingDate: '2021-08-20',
      alerts: { hard: 1, agentic: 0 },
      observedCadenceSeconds: 120.0,
      metrics: {
        temperature: { value: 31.0, unit: '°C', recordedAt: new Date(now - 5 * minute).toISOString(), status: 'NORMAL', targetMin: 24.0, targetMax: 32.0, source: 'MQTT' },
        humidity: { value: 80.0, unit: '%', recordedAt: new Date(now - 5 * minute).toISOString(), status: 'NORMAL', targetMin: 70.0, targetMax: 85.0, source: 'MQTT' },
        soilMoisture: { value: 76.0, unit: '%', recordedAt: new Date(now - 5 * minute).toISOString(), status: 'NORMAL', targetMin: 60.0, targetMax: 80.0, source: 'MQTT' },
      },
      // F2: Test status-aware preview in ZoneCard with SENSOR_ERROR and NO_SIGNAL
      soilProfile: {
        ph: {
          value: -99.0, // Stale error value
          unit: 'pH',
          recordedAt: new Date(now - 5 * minute).toISOString(),
          status: 'SENSOR_ERROR',
          source: 'IOTLAB',
        },
        ec: {
          value: 0.0, // Stale no signal value
          unit: 'µS/cm',
          recordedAt: null,
          status: 'NO_SIGNAL',
          source: null,
        },
        n: {
          value: 45.0,
          unit: 'mg/kg',
          recordedAt: new Date(now - 10 * minute).toISOString(),
          status: 'NO_TARGET',
          source: 'IOTLAB',
        },
      },
    },
    {
      code: 'ZONE-03',
      name: 'Khu C (Lô 1)',
      growthStage: 'KIEN_THIET_CO_BAN',
      variety: 'Ri6',
      plantingDate: '2023-01-10',
      alerts: { hard: 0, agentic: 0 },
      metrics: {
        temperature: { value: 30.0, unit: '°C', recordedAt: new Date(now - 15 * minute).toISOString(), status: 'NORMAL', targetMin: 24.0, targetMax: 32.0, source: 'MQTT' },
        humidity: { value: 75.0, unit: '%', recordedAt: new Date(now - 15 * minute).toISOString(), status: 'NORMAL', targetMin: 70.0, targetMax: 85.0, source: 'MQTT' },
        soilMoisture: { value: 72.0, unit: '%', recordedAt: new Date(now - 15 * minute).toISOString(), status: 'NORMAL', targetMin: 65.0, targetMax: 80.0, source: 'MQTT' },
      },
      soilProfile: null, // F4: Genuine empty S1 profile
    },
  ],
};

const MOCK_ZONES = [
  {
    id: 1,
    code: 'ZONE-01',
    name: 'Khu A',
    farmId: 1,
    variety: 'Ri6',
    growthStage: 'RA_HOA',
    plantingDate: '2022-03-15',
    treeCount: 50,
    representativeTreeId: 101,
  },
  {
    id: 2,
    code: 'ZONE-02',
    name: 'Khu B',
    farmId: 1,
    variety: 'Monthong',
    growthStage: 'PHAT_TRIEN_TRAI',
    plantingDate: '2021-08-20',
    treeCount: 60,
    representativeTreeId: 102,
  },
  {
    id: 3,
    code: 'ZONE-03',
    name: 'Khu C (Lô 1)',
    farmId: 1,
    variety: 'Ri6',
    growthStage: 'KIEN_THIET_CO_BAN',
    plantingDate: '2023-01-10',
    treeCount: 40,
    representativeTreeId: 103,
  },
];

async function main() {
  console.log('Starting SPA test server on port', PORT);
  const server = await createSpaServer(PORT);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

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

  let simulateOverviewError = false;
  let simulateOverviewDelay = false;

  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    const url = req.url();
    const method = req.method();

    if (url.includes('/api/')) {
      if (method === 'OPTIONS') {
        return req.respond({ status: 204, headers: CORS_HEADERS });
      }
    }

    if (url.includes('/api/auth/csrf')) {
      return respondJson(req, 200, { token: 'mock-csrf-token' });
    }

    if (url.includes('/api/auth/refresh')) {
      return respondJson(req, 200, { accessToken: 'mock-jwt-token' });
    }

    if (url.includes('/api/auth/me')) {
      return respondJson(req, 200, MOCK_USER);
    }

    if (url.includes('/api/farms')) {
      return respondJson(req, 200, [{ id: 1, name: 'Vườn Sầu Riêng Cái Mơn' }]);
    }

    if (url.includes('/api/overview')) {
      if (simulateOverviewError) {
        return req.respond({
          status: 500,
          headers: CORS_HEADERS,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      }
      if (simulateOverviewDelay) {
        await new Promise((r) => setTimeout(r, 2000));
      }
      return respondJson(req, 200, MOCK_OVERVIEW);
    }

    if (url.includes('/api/zones/by-code/ZONE-01')) {
      return respondJson(req, 200, MOCK_ZONES[0]);
    }

    if (url.includes('/api/zones/by-code/ZONE-02')) {
      return respondJson(req, 200, MOCK_ZONES[1]);
    }

    if (url.includes('/api/zones/by-code/ZONE-03')) {
      return respondJson(req, 200, MOCK_ZONES[2]);
    }

    if (url.includes('/api/zones') && !url.includes('/sensors')) {
      return respondJson(req, 200, MOCK_ZONES);
    }

    if (url.includes('/api/alerts')) {
      return respondJson(req, 200, []);
    }

    if (url.includes('/sensors') && url.includes('/readings')) {
      return respondJson(req, 200, [
        { id: 1, sensorId: 10, value: 72.0, recordAt: new Date(now - 60 * minute).toISOString(), source: 'MQTT' },
        { id: 2, sensorId: 10, value: 74.5, recordAt: new Date(now - 2 * minute).toISOString(), source: 'MQTT' },
      ]);
    }

    if (url.includes('/sensors') && url.includes('/latest')) {
      return respondJson(req, 200, {
        id: 2,
        sensorId: 10,
        value: 74.5,
        recordAt: new Date(now - 2 * minute).toISOString(),
        source: 'MQTT',
      });
    }

    req.continue();
  });

  try {
    console.log('--- 1. Testing Dashboard & F2 Status-Aware Preview ---');
    await page.goto(`${BASE_URL}/?nofixture=true`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-zone="ZONE-01"]', { timeout: 10000 });
    await page.waitForSelector('[data-zone="ZONE-02"]', { timeout: 10000 });

    // Assert F2 on ZONE-02: SENSOR_ERROR renders "Lỗi" (not -99.0) and NO_SIGNAL renders "--" (not 0.0)
    const phStatusBadge = await page.$eval('[data-zone="ZONE-02"] [data-testid="soil-preview-ph"]', (el) => el.textContent);
    console.log('  ZONE-02 S1 pH Preview Text:', phStatusBadge);
    if (!phStatusBadge.includes('Lỗi') || phStatusBadge.includes('-99')) {
      throw new Error(`F2 assertion failed: SENSOR_ERROR displayed invalid text: ${phStatusBadge}`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] F2: SENSOR_ERROR in ZoneCard renders "Lỗi", never stale raw number');

    const ecStatusBadge = await page.$eval('[data-zone="ZONE-02"] [data-testid="soil-preview-ec"]', (el) => el.textContent);
    console.log('  ZONE-02 S1 EC Preview Text:', ecStatusBadge);
    if (!ecStatusBadge.includes('--') || ecStatusBadge.includes('0.0')) {
      throw new Error(`F2 assertion failed: NO_SIGNAL displayed invalid text: ${ecStatusBadge}`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] F2: NO_SIGNAL in ZoneCard renders "--", never stale raw number');

    const nStatusBadge = await page.$eval('[data-zone="ZONE-02"] [data-testid="soil-preview-n"]', (el) => el.textContent);
    console.log('  ZONE-02 S1 N Preview Text:', nStatusBadge);
    if (!nStatusBadge.includes('45 mg/kg')) {
      throw new Error(`F2 assertion failed: Valid N metric displayed invalid text: ${nStatusBadge}`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] F2: Valid metric in ZoneCard renders value and verbatim unit');

    // Capture screenshot 1: Dashboard with Soil S1 preview and sparkline
    const dashPath = path.join(EVIDENCE_DIR, 'fe02_01_dashboard_with_soil_s1_preview_1440.png');
    await page.screenshot({ path: dashPath, fullPage: true });
    console.log('✓ Captured:', dashPath);

    console.log('\n--- 2. Testing Zone Detail for ZONE-01 (F1 & F3) ---');
    await page.goto(`${BASE_URL}/zones/ZONE-01?nofixture=true`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="soil-profile-card"]', { timeout: 10000 });

    // Assert F1 on ZONE-01 SoilProfileCard: pH has unit: null, must NOT invent fallback unit 'pH'
    const phValueText = await page.$eval('[data-chemistry="ph"] span.text-xl', (el) => el.textContent.trim());
    console.log('  ZONE-01 Soil S1 pH Value Text:', phValueText);
    if (phValueText !== '6.2') {
      throw new Error(`F1 assertion failed: unit: null must be rendered as "6.2" without invented unit, got "${phValueText}"`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] F1: Null unit preserves raw number ("6.2") without inventing fallback unit');

    // Assert F1 on EC: unit: 'µS/cm', must be rendered verbatim
    const ecValueText = await page.$eval('[data-chemistry="ec"] span.text-xl', (el) => el.textContent.trim());
    console.log('  ZONE-01 Soil S1 EC Value Text:', ecValueText);
    if (ecValueText !== '1.15 µS/cm') {
      throw new Error(`F1 assertion failed: Non-null unit must be rendered verbatim as "1.15 µS/cm", got "${ecValueText}"`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] F1: Non-null unit ("1.15 µS/cm") rendered verbatim');

    // Assert F3 on MetricChip: temperature metric has source: null -> provenance tag MUST be visible with "Chưa xác định nguồn"
    const tempProvText = await page.$eval('[data-metric="temperature"] [data-testid="metric-provenance"]', (el) => el.textContent.trim());
    console.log('  ZONE-01 Temperature Provenance Text:', tempProvText);
    if (!tempProvText.includes('Chưa xác định nguồn')) {
      throw new Error(`F3 assertion failed: source: null must render "Chưa xác định nguồn", got "${tempProvText}"`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] F3: Null provenance renders "Chưa xác định nguồn", never omitted, never MQTT');

    // Humidity has source: 'MQTT' -> must render "Thiết bị trạm vườn (MQTT)"
    const humProvText = await page.$eval('[data-metric="humidity"] [data-testid="metric-provenance"]', (el) => el.textContent.trim());
    console.log('  ZONE-01 Humidity Provenance Text:', humProvText);
    if (!humProvText.includes('Thiết bị trạm vườn (MQTT)')) {
      throw new Error(`F3 assertion failed: source: 'MQTT' must render MQTT label, got "${humProvText}"`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] F3: Non-null MQTT provenance rendered correctly');

    // Capture screenshot 2: Zone Detail with Soil S1 profile
    const zoneDetailPath = path.join(EVIDENCE_DIR, 'fe02_02_zone_detail_soil_s1_profile_1440.png');
    await page.screenshot({ path: zoneDetailPath, fullPage: true });
    console.log('✓ Captured:', zoneDetailPath);

    console.log('\n--- 3. Testing F4: Distinguish Error State from Genuine Empty State ---');
    // Test F4 Error state: simulate overview API failure
    simulateOverviewError = true;
    await page.goto(`${BASE_URL}/zones/ZONE-01?nofixture=true`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="soil-profile-error"]', { timeout: 10000 });
    const errorText = await page.$eval('[data-testid="soil-profile-error"] p', (el) => el.textContent);
    console.log('  Overview Error SoilProfileCard Text:', errorText);
    if (!errorText.includes('Không thể tải dữ liệu')) {
      throw new Error(`F4 assertion failed: Failed overview did not display error card`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] F4: Overview failure displays explicit error/unavailable state with retry');

    // Restore overview API
    simulateOverviewError = false;

    // Test F4 Genuine empty state on ZONE-03
    console.log('Navigating to ZONE-03 (Genuine empty soil profile)...');
    await page.goto(`${BASE_URL}/zones/ZONE-03?nofixture=true`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="soil-profile-empty"]', { timeout: 10000 });
    const emptyText = await page.$eval('[data-testid="soil-profile-empty"] p.text-xs.text-gray:last-child', (el) => el.textContent.trim());
    console.log('  ZONE-03 Empty State Text:', emptyText);
    if (!emptyText.includes('Chưa có dữ liệu trắc diện đất S1 cho khu vực này.')) {
      throw new Error(`F4 assertion failed: Expected genuine empty message, got: ${emptyText}`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] F4: Genuine empty state rendered only after successful overview response');

    // Capture screenshot 3: Empty State for Soil S1 Profile
    const emptyStatePath = path.join(EVIDENCE_DIR, 'fe02_03_zone_detail_soil_s1_empty_state_1440.png');
    await page.screenshot({ path: emptyStatePath, fullPage: true });
    console.log('✓ Captured:', emptyStatePath);

    console.log('\n--- 4. Testing Mobile Viewport (375x812) with Scrolled Exposure ---');
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await page.goto(`${BASE_URL}/zones/ZONE-01?nofixture=true`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="soil-profile-card"]', { timeout: 10000 });

    // Scroll SoilProfileCard into full view
    await page.$eval('[data-testid="soil-profile-card"]', (el) => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await new Promise((r) => setTimeout(r, 300)); // allow render settle

    const mobilePath = path.join(EVIDENCE_DIR, 'fe02_04_zone_detail_soil_s1_profile_mobile_375.png');
    await page.screenshot({ path: mobilePath });
    console.log('✓ Captured (scrolled to expose full Soil S1 card):', mobilePath);

    console.log('\n--- 5. Testing English Locale Localization ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluate(() => {
      localStorage.setItem('duricare-language', 'en');
    });
    await page.goto(`${BASE_URL}/zones/ZONE-01?nofixture=true`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="soil-profile-card"]', { timeout: 10000 });

    const enTitle = await page.$eval('[data-testid="soil-profile-card"] h3', (el) => el.textContent.trim());
    console.log('  English Card Title:', enTitle);
    if (enTitle !== 'Soil S1 Chemistry Profile') {
      throw new Error(`Localization failed: Expected "Soil S1 Chemistry Profile", got "${enTitle}"`);
    }
    console.log('  ✓ [DOM ASSERTION PASS] English localization renders correctly in DOM');

    const enPath = path.join(EVIDENCE_DIR, 'fe02_05_zone_detail_soil_s1_english_1440.png');
    await page.screenshot({ path: enPath, fullPage: true });
    console.log('✓ Captured:', enPath);

    console.log('\n================================================================');
    console.log('✓ All DOM assertions passed and all 5 visual evidence screenshots generated!');
    console.log('================================================================');
  } catch (err) {
    console.error('Error during browser verification:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
}

main();
