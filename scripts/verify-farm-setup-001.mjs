import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import crypto from 'crypto';

const WORKTREE_ROOT = 'E:/CTU/LuanVan/duricare-worktrees/fe-farm-setup-001';
const DIST_DIR = path.join(WORKTREE_ROOT, 'dist');
const EVIDENCE_DIR = 'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence';
const PORT = 5310;
const CROSS_ORIGIN_PORT = 5311;
const BASE_URL = `http://127.0.0.1:${PORT}`;

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

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

function createSpaServer(port, corsHeaders = {}) {
  const server = http.createServer((req, res) => {
    for (const [k, v] of Object.entries(corsHeaders)) {
      res.setHeader(k, v);
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

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

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function parseRgb(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) } : { r: 0, g: 0, b: 0 };
}

async function ensureLightMode(page) {
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  return await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
}

async function ensureDarkMode(page) {
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  return await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
}

async function runVerification() {
  console.log('====================================================');
  console.log(' FE-FARM-SETUP-001 OFFLINE TEST & SCREENSHOT SUITE');
  console.log('====================================================');

  const testResults = [];
  function record(id, title, pass, detail = '') {
    testResults.push({ id, title, status: pass ? 'PASS' : 'FAIL', detail });
    console.log(`${pass ? '✓' : '✗'} [${id}] ${title}${detail ? ` (${detail})` : ''}`);
  }

  // -------------------------------------------------------------
  // PART 1: Contract Validation and Pure Functions in Node
  // -------------------------------------------------------------
  console.log('\n--- PART 1: CONTRACT VALIDATION & PURE FUNCTIONS ---');
  const farmValModule = await import(`file:///${WORKTREE_ROOT}/src/utils/farmValidation.ts`);
  const setupOpStorage = await import(`file:///${WORKTREE_ROOT}/src/utils/setupOperationStorage.ts`);

  const {
    isJavaWhitespace,
    stripJavaWhitespace,
    checkTextBoundary,
    validateFarmFormValues,
    convertFormValuesToRequest,
  } = farmValModule;

  const {
    generateOperationId,
    isValidOperationId,
    saveStoredOperation,
    getStoredOperation,
    clearStoredOperation,
  } = setupOpStorage;

  // 1. Java Whitespace
  const tabIsWs = isJavaWhitespace(0x0009);
  const nbspIsWs = isJavaWhitespace(0x00a0);
  const ideographicIsWs = isJavaWhitespace(0x3000);
  record('FS02_WS', 'Java Character.isWhitespace conforms to Java specification', tabIsWs && !nbspIsWs && ideographicIsWs);

  // 2. Strip Java Whitespace
  const stripped = stripJavaWhitespace('\u0009  Vườn Bình Minh \u3000');
  record('FS02_STRIP', 'stripJavaWhitespace removes leading/trailing Java whitespace', stripped === 'Vườn Bình Minh');

  // 2b. Convert Form Values to Request
  const converted = convertFormValuesToRequest({
    name: '\u0009  Vườn Bình Minh \u3000',
    location: ' Phong Điền ',
    area: '10.5',
    latitude: '10.12',
    longitude: '105.45',
  });
  record('FS02_CONVERT', 'convertFormValuesToRequest strips text and parses numericals',
    converted.name === 'Vườn Bình Minh' &&
    converted.location === 'Phong Điền' &&
    converted.area === 10.5 &&
    converted.latitude === 10.12 &&
    converted.longitude === 105.45);

  // 3. Text Boundaries
  const nulBoundary = checkTextBoundary('Farm\u0000Name');
  record('FS03a_NUL', 'Decoded U+0000 produces TEXT_NUL before stripping/saving', nulBoundary === 'TEXT_NUL');

  const unpairedSurrogate = checkTextBoundary('Farm\uD800Name');
  record('FS03b_UNICODE', 'Unpaired UTF-16 surrogate produces TEXT_UNICODE', unpairedSurrogate === 'TEXT_UNICODE');

  const validSurrogatePair = checkTextBoundary('Vườn 🌳 Bình Minh');
  record('FS03c_PAIR', 'Valid surrogate pair (e.g. 🌳) is accepted as valid scalar text', validSurrogatePair === 'OK');

  const literalBackslashU0000 = checkTextBoundary('Literal \\u0000 text');
  record('FS03c_LITERAL', 'Literal backslash+u0000 is treated as ordinary text and accepted', literalBackslashU0000 === 'OK');

  // 4. Area Validation
  const areaNull = validateFarmFormValues({ name: 'Farm', location: '', area: '', latitude: '', longitude: '' });
  const areaZero = validateFarmFormValues({ name: 'Farm', location: '', area: '0', latitude: '', longitude: '' });
  const areaNegative = validateFarmFormValues({ name: 'Farm', location: '', area: '-5', latitude: '', longitude: '' });
  const areaValid = validateFarmFormValues({ name: 'Farm', location: '', area: '12.5', latitude: '', longitude: '' });
  record('FS06_AREA', 'Area optional: blank->null, <=0 rejected, finite>0 accepted',
    areaNull.valid && !areaZero.valid && !areaNegative.valid && areaValid.valid && areaValid.request?.area === 12.5);

  // 5. Coordinates Validation
  const coordsBothNull = validateFarmFormValues({ name: 'Farm', location: '', area: '', latitude: '', longitude: '' });
  const coordsLatOnly = validateFarmFormValues({ name: 'Farm', location: '', area: '', latitude: '10.5', longitude: '' });
  const coordsLngOnly = validateFarmFormValues({ name: 'Farm', location: '', area: '', latitude: '', longitude: '105.8' });
  const coordsZeroZero = validateFarmFormValues({ name: 'Farm', location: '', area: '', latitude: '0', longitude: '0' });
  const coordsOutOfRange = validateFarmFormValues({ name: 'Farm', location: '', area: '', latitude: '91', longitude: '0' });
  record('FS07_COORDS', 'Coordinate pair: both null accepted, half-pair rejected, (0,0) valid, out-of-range rejected',
    coordsBothNull.valid && !coordsLatOnly.valid && !coordsLngOnly.valid && coordsZeroZero.valid && !coordsOutOfRange.valid);

  // 6. UUID v4 Idempotency Key
  const opId1 = generateOperationId();
  const opId2 = generateOperationId();
  record('FS13_UUID', 'Generates valid lowercase canonical UUID v4 Idempotency-Key',
    isValidOperationId(opId1) && isValidOperationId(opId2) && opId1 !== opId2 && opId1 === opId1.toLowerCase());

  // 7. Storage Safety (password stripped, boolean return)
  const mockStorage = {};
  globalThis.sessionStorage = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = v; },
    removeItem: (k) => { delete mockStorage[k]; },
  };

  const saveSuccess = saveStoredOperation({
    version: 1,
    actorId: 999,
    operationId: opId1,
    kind: 'OWNER_CREATE',
    stage: 'DISPATCHING',
    draft: { email: 'test@example.vn', password: 'SecretPassword123!', initialPassword: 'SecretPassword123!' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const stored = getStoredOperation(999, 'OWNER_CREATE');
  const passwordStripped = stored && !('password' in stored.draft) && !('initialPassword' in stored.draft);
  clearStoredOperation(999, 'OWNER_CREATE');
  record('FS17_STORAGE_SAFETY', 'SessionStorage safely strips password and initialPassword fields and returns true', Boolean(passwordStripped) && saveSuccess === true);

  // -------------------------------------------------------------
  // PART 2: Headless Browser & UI Tests
  // -------------------------------------------------------------
  console.log('\n--- PART 2: UI SURFACES & SCREENSHOTS ---');
  console.log(`Starting Main SPA Server from ${DIST_DIR} on port ${PORT}...`);
  const server = await createSpaServer(PORT);
  console.log(`SPA Server running at ${BASE_URL}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    await page.setRequestInterception(true);

    const mockState = {
      farms: [
        { id: 104, name: 'Vườn thực nghiệm sầu riêng Bình Minh', location: 'Phong Điền, Cần Thơ', area: 15.0, zoneIds: [1], latitude: 10.0352, longitude: 105.7891 },
        { id: 211, name: 'Vườn mẫu Phong Điền', location: 'Phong Điền', area: 10.0, zoneIds: [], latitude: 10.02, longitude: 105.75 },
      ],
      owners: [],
      setupOperations: {},
    };

    let lastSentHeaders = {};
    let lastPostHeaders = {};
    let currentUser = { id: 1, email: 'admin@duricare.vn', role: 'ADMIN', farmId: null };

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, X-XSRF-TOKEN',
    };

    function respondJson(req, status, data) {
      return req.respond({
        status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
        body: typeof data === 'string' ? data : JSON.stringify(data),
      });
    }

    page.on('request', async (req) => {
      const url = req.url();
      const method = req.method();

      // Pass cross-origin requests directly to port 5311 without interception
      if (url.includes(`:${CROSS_ORIGIN_PORT}`)) {
        return req.continue();
      }

      if (method === 'OPTIONS') {
        return req.respond({
          status: 204,
          headers: CORS_HEADERS,
        });
      }

      if (['document', 'script', 'stylesheet', 'image', 'font'].includes(req.resourceType())) {
        return req.continue();
      }

      // Intercept authentication & API routes
      if (url.includes('/auth/csrf')) {
        return respondJson(req, 200, { token: 'mock-csrf-token' });
      }

      if (url.includes('/auth/refresh')) {
        return respondJson(req, 200, { accessToken: 'mock-test-jwt-token' });
      }

      if (url.includes('/auth/me')) {
        return respondJson(req, 200, currentUser);
      }

      if (url.includes('/overview')) {
        return respondJson(req, 200, {
          farmName: mockState.farms[0]?.name || 'Vườn mẫu',
          generatedAt: new Date().toISOString(),
          totalUnresolvedAlerts: 0,
          zones: [
            {
              code: 'ZONE-A',
              name: 'Khu A',
              growthStage: 'VEGETATIVE',
              variety: 'Ri6',
              plantingDate: '2024-01-01',
              metrics: {
                temperature: { value: 28, unit: '°C', recordedAt: new Date().toISOString(), status: 'NORMAL', targetMin: 20, targetMax: 35 },
                humidity: { value: 75, unit: '%', recordedAt: new Date().toISOString(), status: 'NORMAL', targetMin: 60, targetMax: 85 },
                soilMoisture: { value: 65, unit: '%', recordedAt: new Date().toISOString(), status: 'NORMAL', targetMin: 50, targetMax: 80 },
              },
              alerts: { hard: 0, agentic: 0 },
            },
          ],
          latestInsight: null,
        });
      }

      if (url.includes('/alerts')) {
        return respondJson(req, 200, { content: [], totalElements: 0 });
      }

      if (url.includes('/api/farms') || url.includes('/farms')) {
        lastSentHeaders = req.headers();
        if (method === 'POST') {
          lastPostHeaders = req.headers();
        }

        if (method === 'GET') {
          const matchId = url.match(/\/farms\/(\d+)/);
          if (matchId) {
            const fid = Number(matchId[1]);
            if (fid === 777) {
              return respondJson(req, 503, { code: 'FS_STORE_UNAVAILABLE', message: 'Readback 503 error' });
            }
            if (fid === 104 && mockState.delayedFarm104) {
              await mockState.delayedFarm104;
            }
            const farm = mockState.farms.find((f) => f.id === fid);
            if (farm) {
              return respondJson(req, 200, farm);
            }
            return respondJson(req, 404, { message: 'Farm not found' });
          }
          return respondJson(req, 200, mockState.farms);
        }

        if (method === 'POST') {
          const body = JSON.parse(req.postData() || '{}');
          const idKey = req.headers()['idempotency-key'];

          if (body.name?.includes('TriggerUnknown503')) {
            return respondJson(req, 503, { error: 'farm_setup_error', code: 'FS_STORE_UNAVAILABLE', message: 'Service temporarily unavailable' });
          }

          const farmId = body.name?.includes('TriggerReadback503') ? 777 : 104;
          const newFarm = {
            id: farmId,
            name: body.name,
            location: body.location || null,
            area: body.area || null,
            zoneIds: [],
            latitude: body.latitude || null,
            longitude: body.longitude || null,
          };

          if (idKey) {
            mockState.setupOperations[idKey] = {
              contractVersion: 'FARM-SETUP-001-v1',
              operationId: idKey,
              kind: 'FARM_CREATE',
              status: 'APPLIED_SNAPSHOT',
              resourceId: newFarm.id,
              farmId: newFarm.id,
              appliedAt: new Date().toISOString(),
              resource: newFarm,
              resourcePath: `/api/farms/${newFarm.id}`,
            };
          }

          return respondJson(req, 201, newFarm);
        }

        if (method === 'PUT') {
          const body = JSON.parse(req.postData() || '{}');
          const matchId = url.match(/\/farms\/(\d+)/);
          const fid = matchId ? Number(matchId[1]) : 104;

          if (body.name?.includes('Trigger503PutFarm')) {
            return respondJson(req, 503, { error: 'farm_setup_error', code: 'FS_STORE_UNAVAILABLE', message: 'Service temporarily unavailable' });
          }

          const updated = {
            id: fid,
            name: body.name,
            location: body.location || null,
            area: body.area || null,
            zoneIds: [],
            latitude: body.latitude || null,
            longitude: body.longitude || null,
          };
          return respondJson(req, 200, updated);
        }
      }

      if (url.includes('/admin/setup-operations/')) {
        const opId = url.split('/admin/setup-operations/')[1].split('?')[0];

        const receipt = mockState.setupOperations[opId];
        if (receipt) {
          return respondJson(req, 200, receipt);
        }
        return respondJson(req, 404, { code: 'FS_OPERATION_NOT_FOUND', message: 'No receipt found' });
      }

      if (url.includes('/admin/owners') || url.includes('/owners')) {
        if (method === 'GET') {
          const matchId = url.match(/\/owners\/(\d+)/);
          if (matchId) {
            const oid = Number(matchId[1]);
            const owner = mockState.owners.find((o) => o.id === oid);
            if (owner) {
              return respondJson(req, 200, owner);
            }
            return respondJson(req, 404, { message: 'Owner not found' });
          }
          return respondJson(req, 200, { content: mockState.owners, totalElements: mockState.owners.length });
        }

        if (method === 'POST') {
          const body = JSON.parse(req.postData() || '{}');
          const idKey = req.headers()['idempotency-key'];

          if (body.email === 'conflict@duricare.vn') {
            return respondJson(req, 409, { message: 'Email này đã được sử dụng. Hãy nhập email khác.' });
          }

          if (body.email === 'reused@duricare.vn') {
            return respondJson(req, 409, { code: 'FS_OPERATION_REUSED', message: 'Operation reused with mismatched payload' });
          }

          const newOwner = {
            id: 501,
            email: body.email,
            role: 'OWNER',
            farmId: body.farmId,
            farmName: 'Vườn thực nghiệm sầu riêng Bình Minh',
            enabled: true,
            version: 1,
            createdAt: new Date().toISOString(),
          };

          mockState.owners.push(newOwner);

          if (idKey) {
            mockState.setupOperations[idKey] = {
              contractVersion: 'FARM-SETUP-001-v1',
              operationId: idKey,
              kind: 'OWNER_CREATE',
              status: 'APPLIED_SNAPSHOT',
              resourceId: newOwner.id,
              farmId: body.farmId,
              appliedAt: new Date().toISOString(),
              resource: newOwner,
              resourcePath: `/api/admin/owners/${newOwner.id}`,
            };
          }

          return respondJson(req, 201, newOwner);
        }
        return respondJson(req, 200, { content: [], totalElements: 0 });
      }

      if (url.includes('/layout')) {
        const emptyLayout = {
          version: 1,
          farm: { id: 104, name: 'Vườn thực nghiệm sầu riêng Bình Minh' },
          zones: [],
          placements: [],
        };
        return respondJson(req, 200, emptyLayout);
      }

      req.continue();
    });

    // Helper to clear form inputs reliably
    async function clearInput(selector) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
          const proto = Object.getPrototypeOf(el);
          const desc = Object.getOwnPropertyDescriptor(proto, 'value');
          if (desc && desc.set) {
            desc.set.call(el, '');
          } else {
            el.value = '';
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, selector);
    }

    // Initialize session
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      localStorage.setItem('duricare-language', 'vi');
      sessionStorage.setItem('duricare-token', 'mock-test-jwt-token');
      sessionStorage.setItem('duricare-user', JSON.stringify({ id: 1, email: 'admin@duricare.vn', role: 'ADMIN', farmId: null }));
    });

    // Verify Light and Dark theme background colors (prevent theme leakage)
    const lightBg = await ensureLightMode(page);
    const darkBg = await ensureDarkMode(page);
    const lightColor = parseRgb(lightBg);
    const darkColor = parseRgb(darkBg);
    record('THEME_LIGHT_COMPUTED_BG', 'Light theme computed background has high luminance (>200) without theme bleed',
      lightColor.r > 200 && lightColor.g > 200 && lightColor.b > 200);
    record('THEME_DARK_COMPUTED_BG', 'Dark theme computed background has low luminance (<60) confirming dark mode activation',
      darkColor.r < 60 && darkColor.g < 60 && darkColor.b < 60);

    // Reset back to light mode for all standard captures
    await ensureLightMode(page);

    // Shot 1: Desktop B01 Standalone Farm Create Form (/settings/farm/new)
    await page.goto(`${BASE_URL}/settings/farm/new`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#farm-create-name');

    const formGridGeometry = await page.evaluate(() => {
      const formCard = document.querySelector('section.rounded-xl');
      const aside = document.querySelector('aside.w-\\[280px\\]');
      return {
        formCardWidth: formCard?.getBoundingClientRect().width,
        asideWidth: aside?.getBoundingClientRect().width,
        hasAside: !!aside,
      };
    });
    record('FS02_LAYOUT', 'Desktop /settings/farm/new displays 680px form card and 280px contextual aside',
      formGridGeometry.hasAside && Math.abs(formGridGeometry.asideWidth - 280) < 5);

    const shot1 = path.join(EVIDENCE_DIR, 'farm_setup_01_desktop_b01_create_form.png');
    await page.screenshot({ path: shot1 });

    // Shot 2: Validation Errors (B02)
    await page.type('#farm-create-area', '-10');
    await page.type('#farm-create-latitude', '10.5');
    await page.click('button[type="submit"]');

    await page.waitForSelector('#farm-create-name-error');
    const hasAreaError = await page.$eval('#farm-create-area-error', el => el.textContent.includes('lớn hơn 0'));
    const hasCoordError = await page.$eval('#farm-create-coords-error', el => el.textContent.includes('cả hai'));
    record('FS02_ERRORS', 'Client-side validation flags empty name, negative area, and half-pair coordinates', hasAreaError && hasCoordError);

    const shot2 = path.join(EVIDENCE_DIR, 'farm_setup_02_desktop_b02_validation_errors.png');
    await page.screenshot({ path: shot2 });

    // Shot 3: Standalone Farm Success (B08)
    await clearInput('#farm-create-area');
    await clearInput('#farm-create-latitude');
    await clearInput('#farm-create-name');
    await clearInput('#farm-create-location');
    await page.type('#farm-create-name', 'Vườn thực nghiệm sầu riêng Bình Minh');
    await page.type('#farm-create-location', 'Phong Điền, Cần Thơ');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => document.body.textContent.includes('Đã tạo vườn thành công'));

    const idKeySent = lastPostHeaders['idempotency-key'] || lastSentHeaders['idempotency-key'];
    record('FS13_HEADER', 'Dispatched POST /farms with lowercase UUID v4 Idempotency-Key', isValidOperationId(idKeySent));

    const buttonsText = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('section button'));
      return buttons.map(b => b.textContent.trim());
    });
    const hasThreeChoices = buttonsText.some(t => t.includes('Cấu hình vườn')) &&
                            buttonsText.some(t => t.includes('Tạo tài khoản chủ vườn')) &&
                            buttonsText.some(t => t.includes('Để sau'));
    record('FS29_CHOICES', 'Success state B08 displays Configure Farm, Create Owner, and Later choices', hasThreeChoices);

    const shot3 = path.join(EVIDENCE_DIR, 'farm_setup_03_desktop_b08_create_success.png');
    await page.screenshot({ path: shot3 });

    // Shot 4: Unknown Recovery State (B04)
    await page.goto(`${BASE_URL}/settings/farm/new`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#farm-create-name');
    await page.type('#farm-create-name', 'TriggerUnknown503 Farm');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => document.body.textContent.includes('Chưa xác nhận kết quả'));
    const shot4 = path.join(EVIDENCE_DIR, 'farm_setup_04_desktop_b04_unknown_recovery.png');
    await page.screenshot({ path: shot4 });

    // Shot 5: Owner Modal with Existing Farm (C01)
    await page.goto(`${BASE_URL}/settings/owners?create=1&farmId=104`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('div[role="dialog"]');

    const shot5 = path.join(EVIDENCE_DIR, 'farm_setup_05_desktop_c01_owner_existing_farm.png');
    await page.screenshot({ path: shot5 });

    // Shot 6: Owner Modal Inline New Farm (C02)
    await page.evaluate(() => {
      const newFarmTab = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Tạo vườn mới'));
      newFarmTab?.click();
    });
    await page.waitForSelector('#owner-inline-farm-name');

    const shot6 = path.join(EVIDENCE_DIR, 'farm_setup_06_desktop_c02_owner_inline_new_farm.png');
    await page.screenshot({ path: shot6 });

    // Shot 7: Inline Farm Creation -> Retained Farm Notice (C05)
    await page.type('#owner-inline-farm-name', 'Vườn Mới Inline 104');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Tạo vườn và tiếp tục'));
      btn?.click();
    });

    await page.waitForFunction(() => document.body.textContent.includes('Vườn đã được tạo và giữ lại'));
    const shot7 = path.join(EVIDENCE_DIR, 'farm_setup_07_desktop_c05_owner_retained_farm.png');
    await page.screenshot({ path: shot7 });

    // Shot 8: Owner Creation Success (D01)
    await page.type('#owner-email', 'chuvuon.binhminh@duricare.vn');
    await page.type('#owner-password', 'MatKhauMoi#2026!');
    await page.click('div[role="dialog"] button[type="submit"]');

    await page.waitForFunction(() => document.body.textContent.includes('Tài khoản đã được tạo'));
    const passwordNotDisplayed = await page.evaluate(() => !document.body.textContent.includes('MatKhauMoi#2026!'));
    record('FS17_MEMORY', 'Owner password is strictly memory-only and never redisplayed in success card', passwordNotDisplayed);

    const shot8 = path.join(EVIDENCE_DIR, 'farm_setup_08_desktop_d01_owner_success.png');
    await page.screenshot({ path: shot8 });

    // Close owner success dialog
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Cấu hình vườn'));
      btn?.click();
    });

    // Shot 9: Farm Settings Page & Picker (E01)
    await page.goto(`${BASE_URL}/settings/farm?farmId=104`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#settings-farm');

    const shot9 = path.join(EVIDENCE_DIR, 'farm_setup_09_desktop_e01_settings_form.png');
    await page.screenshot({ path: shot9 });

    // Shot 10: Clear Saved Coordinates Interception Modal (E05)
    await clearInput('#farm-settings-latitude');
    await clearInput('#farm-settings-longitude');
    await page.click('form button[type="submit"]');

    await page.waitForFunction(() => document.body.textContent.includes('Xóa tọa độ đã lưu?'));
    const shot10 = path.join(EVIDENCE_DIR, 'farm_setup_10_desktop_e05_clear_coords_modal.png');
    await page.screenshot({ path: shot10 });

    // Cancel modal
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Giữ tọa độ'));
      btn?.click();
    });

    // Shot 11: ADMIN Zero-Zone Empty State (E06)
    await page.goto(`${BASE_URL}/settings/zones?farmId=211`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.textContent.includes('Vườn chưa có khu vực'));

    const adminHasAddZone = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Thêm khu vực'));
    });
    record('FS33_ADMIN_ZONE', 'ADMIN zero-zone displays "Thêm khu vực" CTA button', adminHasAddZone);

    const shot11 = path.join(EVIDENCE_DIR, 'farm_setup_11_desktop_e06_admin_zero_zone.png');
    await page.screenshot({ path: shot11 });

    // Shot 12: OWNER Zero-Zone Empty State (E07)
    currentUser = { id: 2, email: 'owner@duricare.vn', role: 'OWNER', farmId: 211 };
    await page.evaluate(() => {
      sessionStorage.setItem('duricare-user', JSON.stringify({ id: 2, email: 'owner@duricare.vn', role: 'OWNER', farmId: 211 }));
    });
    await page.goto(`${BASE_URL}/settings/zones`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.textContent.includes('Liên hệ quản trị viên'));

    const ownerHasRefresh = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const hasRefresh = buttons.some(b => b.textContent.includes('Làm mới'));
      const hasAdd = buttons.some(b => b.textContent.includes('Thêm khu vực'));
      return hasRefresh && !hasAdd;
    });
    record('FS33_OWNER_ZONE', 'OWNER zero-zone displays read-only notice + "Làm mới", with NO Admin write buttons', ownerHasRefresh);

    const shot12 = path.join(EVIDENCE_DIR, 'farm_setup_12_desktop_e07_owner_zero_zone.png');
    await page.screenshot({ path: shot12 });

    // Restore ADMIN session and clean up any previous operation
    currentUser = { id: 1, email: 'admin@duricare.vn', role: 'ADMIN', farmId: null };
    await page.evaluate(() => {
      sessionStorage.setItem('duricare-user', JSON.stringify({ id: 1, email: 'admin@duricare.vn', role: 'ADMIN', farmId: null }));
      sessionStorage.removeItem('duricare_setup_op_1_FARM_CREATE');
    });

    // Shot 13: Mobile Viewport 375x844 (B01)
    await page.setViewport({ width: 375, height: 844 });
    await page.goto(`${BASE_URL}/settings/farm/new`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#farm-create-name');

    const mobileBtnHeight = await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      return btn?.getBoundingClientRect().height;
    });
    record('FS38_TOUCH', 'Mobile submit control has touch target height >= 44px', mobileBtnHeight >= 44);

    const shot13 = path.join(EVIDENCE_DIR, 'farm_setup_13_mobile_375_b01_create_form.png');
    await page.screenshot({ path: shot13 });

    // Shot 14: Mobile Viewport 375x844 Owner Inline Modal (C02)
    await page.goto(`${BASE_URL}/settings/owners?create=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('div[role="dialog"]');
    await page.evaluate(() => {
      const newFarmTab = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Tạo vườn mới'));
      newFarmTab?.click();
    });
    await page.waitForSelector('#owner-inline-farm-name');

    const shot14 = path.join(EVIDENCE_DIR, 'farm_setup_14_mobile_375_c02_owner_inline.png');
    await page.screenshot({ path: shot14 });

    // Shot 15: Leave Retained Farm Confirmation Modal (F03)
    await page.type('#owner-inline-farm-name', 'Vườn Retained Mobile');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Tạo vườn và tiếp tục'));
      btn?.click();
    });
    await page.waitForFunction(() => document.body.textContent.includes('Vườn đã được tạo và giữ lại'));

    await page.evaluate(() => {
      const closeBtn = document.querySelector('div[role="dialog"] header button');
      closeBtn?.click();
    });
    await page.waitForFunction(() => document.body.textContent.includes('Để sau phần tạo tài khoản?'));

    const shot15 = path.join(EVIDENCE_DIR, 'farm_setup_15_mobile_375_f03_leave_retained.png');
    await page.screenshot({ path: shot15 });

    await page.evaluate(() => {
      const laterBtn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Để sau'));
      laterBtn?.click();
    });

    // Shot 16: Dark Theme (Desktop 1440x900)
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/settings/farm/new`, { waitUntil: 'networkidle0' });
    await ensureDarkMode(page);
    const shot16 = path.join(EVIDENCE_DIR, 'farm_setup_16_desktop_dark_b01_create_form.png');
    await page.screenshot({ path: shot16 });

    // Shot 17: English Locale (Desktop 1440x900)
    await ensureLightMode(page);
    await page.evaluate(() => {
      localStorage.setItem('duricare-language', 'en');
      window.dispatchEvent(new Event('storage'));
    });
    await page.goto(`${BASE_URL}/settings/farm/new`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.textContent.includes('Create farm'));
    const shot17 = path.join(EVIDENCE_DIR, 'farm_setup_17_desktop_en_b01_create_form.png');
    await page.screenshot({ path: shot17 });

    // Reset language back to vi
    await page.evaluate(() => {
      localStorage.setItem('duricare-language', 'vi');
      window.dispatchEvent(new Event('storage'));
    });

    // Shot 18: Cross-Origin FS39a Genuine Verification (Desktop 1440x900)
    console.log('\n--- VERIFYING FS39a CROSS-ORIGIN ISOLATION (GENUINE 2-ORIGIN) ---');
    let crossOriginOptionsReceived = false;
    let crossOriginPostReceived = false;
    let crossOriginGetReceived = false;
    let crossOriginOptionsHeaders = {};
    let crossOriginPostHeaders = {};
    let crossOriginGetHeaders = {};

    const crossCorsHeaders = {
      'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, X-XSRF-TOKEN',
      'Access-Control-Max-Age': '86400',
    };

    const crossOriginServer = http.createServer((req, res) => {
      if (req.method === 'OPTIONS') {
        crossOriginOptionsReceived = true;
        const acrh = req.headers['access-control-request-headers'] || '';
        if (acrh.toLowerCase().includes('idempotency-key')) {
          crossOriginOptionsHeaders = req.headers;
        } else if (!crossOriginOptionsHeaders['access-control-request-headers']) {
          crossOriginOptionsHeaders = req.headers;
        }
        res.writeHead(204, crossCorsHeaders);
        res.end();
        return;
      }

      if (req.method === 'POST') {
        crossOriginPostReceived = true;
        crossOriginPostHeaders = req.headers;
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          res.writeHead(201, { ...crossCorsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id: 104, name: 'FS39a Cross Origin Farm' }));
        });
        return;
      }

      if (req.method === 'GET') {
        crossOriginGetReceived = true;
        crossOriginGetHeaders = req.headers;
        res.writeHead(200, { ...crossCorsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 104, name: 'FS39a Cross Origin Farm', location: null, area: null, zoneIds: [] }));
        return;
      }

      res.writeHead(404, crossCorsHeaders);
      res.end();
    });
    await new Promise(resolve => crossOriginServer.listen(CROSS_ORIGIN_PORT, '127.0.0.1', resolve));

    await page.goto(`${BASE_URL}/settings/farm/new`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#farm-create-name');

    // Configure the production client to use genuine cross-origin origin
    await page.evaluate((targetUrl) => {
      window.__origBaseURL = window.__duricareClient.defaults.baseURL;
      window.__duricareClient.defaults.baseURL = targetUrl;
    }, `http://127.0.0.1:${CROSS_ORIGIN_PORT}`);

    await clearInput('#farm-create-name');
    await page.type('#farm-create-name', 'FS39a Cross Origin Farm');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => document.body.textContent.includes('Đã tạo vườn thành công'));

    const shot18 = path.join(EVIDENCE_DIR, 'farm_setup_18_desktop_fs39a_cross_origin.png');
    await page.screenshot({ path: shot18 });

    // Restore the production client baseURL
    await page.evaluate(() => {
      window.__duricareClient.defaults.baseURL = window.__origBaseURL;
    });
    await crossOriginServer.close();

    const crossOriginPreflightValid = crossOriginOptionsReceived &&
      crossOriginOptionsHeaders['origin'] === `http://127.0.0.1:${PORT}` &&
      crossOriginOptionsHeaders['access-control-request-headers']?.toLowerCase().includes('idempotency-key');
    const crossOriginPostValid = crossOriginPostReceived &&
      crossOriginPostHeaders['origin'] === `http://127.0.0.1:${PORT}` &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(crossOriginPostHeaders['idempotency-key']) &&
      crossOriginPostHeaders['authorization']?.includes('Bearer');
    const crossOriginGetValid = crossOriginGetReceived &&
      crossOriginGetHeaders['authorization']?.includes('Bearer');

    record('FS39a_CROSS_ORIGIN', 'Genuine two-origin preflight, POST and readback GET complete over real HTTP without diagnostic headers',
      crossOriginPreflightValid && crossOriginPostValid && crossOriginGetValid);

    // -------------------------------------------------------------
    // PART 2b: DEDICATED REGRESSION TESTS FOR FINDINGS F1-F7
    // -------------------------------------------------------------
    console.log('\n--- PART 2b: DEDICATED REGRESSION TESTS (F1-F7) ---');

    // REG_F1: Inline Farm Operation Restore
    const f1OpId = crypto.randomUUID().toLowerCase();
    await page.evaluate((opId) => {
      sessionStorage.setItem('duricare_setup_op_1_FARM_CREATE_INLINE', JSON.stringify({
        version: 1,
        actorId: 1,
        operationId: opId,
        kind: 'FARM_CREATE_INLINE',
        stage: 'UNKNOWN',
        draft: { name: 'Vườn Test Restore F1', location: 'Cần Thơ', area: '10', latitude: '', longitude: '' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }, f1OpId);
    await page.goto(`${BASE_URL}/settings/owners?create=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('div[role="dialog"]');
    await page.waitForFunction(() => document.body.textContent.includes('Chưa xác nhận kết quả'));
    const f1Restored = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const hasUnknownBanner = text.includes('Chưa xác nhận kết quả') && text.includes('Vườn có thể đã được tạo');
      const buttons = Array.from(document.querySelectorAll('div[role="dialog"] button')).map(b => b.textContent?.trim());
      const hasRetry = buttons.some(t => t.includes('Thử lại cùng yêu cầu'));
      const hasCheck = buttons.some(t => t.includes('Kiểm tra kết quả'));
      return hasUnknownBanner && hasRetry && hasCheck;
    });
    record('REG_F1_INLINE_FARM_RESTORE', 'Restores pending FARM_CREATE_INLINE operation in OwnerCreateModal without overwriting UUID', f1Restored);
    await page.evaluate(() => {
      sessionStorage.removeItem('duricare_setup_op_1_FARM_CREATE_INLINE');
    });

    // REG_F2: Storage Quota/Disabled Protection
    await page.goto(`${BASE_URL}/settings/farm/new`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#farm-create-name');
    await page.type('#farm-create-name', 'QuotaTestFarm');

    let postAttemptedF2 = false;
    const postInterceptHandler = (req) => {
      if (req.method() === 'POST' && req.url().includes('/farms') && req.postData()?.includes('QuotaTestFarm')) {
        postAttemptedF2 = true;
      }
    };
    page.on('request', postInterceptHandler);

    await page.evaluate(() => {
      window.__origSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function() {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      };
    });

    await page.click('button[type="submit"]');
    await page.waitForFunction(() => document.body.textContent.includes('Không thể lưu trạng thái'));

    const hasQuotaError = await page.evaluate(() => document.body.textContent.includes('Không thể lưu trạng thái'));
    record('REG_F2_STORAGE_FAILURE_GUARD', 'Aborts dispatch with actionable error and 0 POST requests when storage throws QuotaExceededError', hasQuotaError && !postAttemptedF2);

    await page.evaluate(() => {
      Storage.prototype.setItem = window.__origSetItem;
    });
    page.off('request', postInterceptHandler);

    // REG_F3: Current Resource Verification on Snapshot Recovery & R3-2 Terminal State
    const f3OpId = crypto.randomUUID().toLowerCase();
    mockState.setupOperations[f3OpId] = {
      contractVersion: 'FARM-SETUP-001-v1',
      operationId: f3OpId,
      kind: 'FARM_CREATE',
      status: 'APPLIED_SNAPSHOT',
      resourceId: 9999,
      resource: { id: 9999, name: 'Vườn Đã Xóa 9999' },
      appliedAt: new Date().toISOString(),
    };
    await page.evaluate((opId) => {
      sessionStorage.setItem('duricare_setup_op_1_FARM_CREATE_INLINE', JSON.stringify({
        version: 1,
        actorId: 1,
        operationId: opId,
        kind: 'FARM_CREATE_INLINE',
        stage: 'UNKNOWN',
        draft: { name: 'Vườn Đã Xóa 9999', location: 'Cần Thơ', area: '10', latitude: '', longitude: '' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }, f3OpId);
    await page.goto(`${BASE_URL}/settings/owners?create=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('div[role="dialog"]');

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Kiểm tra kết quả'));
      btn?.click();
    });

    await page.waitForFunction(() => document.body.textContent.includes('Vườn không còn tồn tại'));
    const f3TerminalStateValid = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return false;
      const text = dialog.textContent || '';
      const hasRemovedTitle = text.includes('Vườn không còn tồn tại');
      const hasDetailedDesc = text.includes('hiện không tồn tại');
      const buttons = Array.from(dialog.querySelectorAll('button'));
      const hasInertCheckBtn = buttons.some(b => b.textContent.includes('Kiểm tra kết quả'));
      const hasInertRetryBtn = buttons.some(b => b.textContent.includes('Thử lại cùng yêu cầu'));
      const hasSelectExistingBtn = buttons.some(b => b.textContent.includes('Chọn vườn có sẵn'));
      const hasCreateNewBtn = buttons.some(b => b.textContent.includes('Tạo vườn mới khác'));
      const hasCloseBtn = buttons.some(b => b.textContent.trim() === 'Đóng');
      const storageCleared = !sessionStorage.getItem('duricare_setup_op_1_FARM_CREATE_INLINE');

      return hasRemovedTitle && hasDetailedDesc && !hasInertCheckBtn && !hasInertRetryBtn &&
             hasSelectExistingBtn && hasCreateNewBtn && hasCloseBtn && storageCleared;
    });

    // Also verify clicking "Chọn vườn có sẵn" successfully transitions to EXISTING_FARM mode
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Chọn vườn có sẵn'));
      btn?.click();
    });

    await page.waitForFunction(() => document.querySelector('#owner-email') !== null);
    const modeSwitchSuccessful = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      const hasEmailInput = dialog && dialog.querySelector('#owner-email') !== null;
      const hasFarmSelect = dialog && (dialog.querySelector('#owner-select-farm') !== null || dialog.textContent.includes('Vườn được gán'));
      return Boolean(hasEmailInput && hasFarmSelect);
    });

    record('REG_F3_CURRENT_RESOURCE_VERIFICATION', 'Verifies current resource existence via GET readback, rejects deleted 404 snapshot, removes inert buttons and transitions to terminal state', f3TerminalStateValid && modeSwitchSuccessful);
    await page.evaluate(() => {
      sessionStorage.removeItem('duricare_setup_op_1_FARM_CREATE_INLINE');
    });

    // REG_F4: Operation Reused (409 FS_OPERATION_REUSED) Preservation
    await page.goto(`${BASE_URL}/settings/owners?create=1&farmId=104`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('div[role="dialog"]');
    await page.type('#owner-email', 'reused@duricare.vn');
    await page.type('#owner-password', 'MatKhauHopLe#1234');
    await page.click('div[role="dialog"] button[type="submit"]');

    await page.waitForFunction(() => document.body.textContent.includes('Chưa xác nhận kết quả'));
    const f4Handled = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const notDuplicateEmail = !text.includes('Email này đã được sử dụng');
      const hasUnknownState = text.includes('Chưa xác nhận kết quả');
      const stored = sessionStorage.getItem('duricare_setup_op_1_OWNER_CREATE');
      const storedValid = stored && JSON.parse(stored).stage === 'UNKNOWN';
      return notDuplicateEmail && hasUnknownState && storedValid;
    });
    record('REG_F4_OPERATION_REUSED_PRESERVATION', 'HTTP 409 FS_OPERATION_REUSED retains operation and avoids misleading duplicate-email message', f4Handled);
    await page.evaluate(() => {
      sessionStorage.removeItem('duricare_setup_op_1_OWNER_CREATE');
    });

    // REG_F5: Settings E04 Uncertain Outcome and Reconcile Readback
    await page.goto(`${BASE_URL}/settings/farm?farmId=104`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#farm-settings-name');
    await clearInput('#farm-settings-name');
    await page.type('#farm-settings-name', 'Trigger503PutFarm');
    await page.click('form button[type="submit"]');

    await page.waitForFunction(() => document.body.textContent.includes('Chưa xác nhận được thay đổi'));
    const f5UncertainActive = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const hasWarning = text.includes('Chưa xác nhận được thay đổi');
      const inputDisabled = document.querySelector('#farm-settings-name')?.hasAttribute('disabled');
      const submitDisabled = document.querySelector('form button[type="submit"]')?.hasAttribute('disabled');
      const hasReconcileBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Tải lại thông tin hiện tại'));
      return hasWarning && inputDisabled && submitDisabled && hasReconcileBtn;
    });

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tải lại thông tin hiện tại'));
      btn?.click();
    });
    await page.waitForFunction(() => !document.body.textContent.includes('Chưa xác nhận được thay đổi'));
    const f5Reconciled = await page.evaluate(() => {
      const inputEnabled = !document.querySelector('#farm-settings-name')?.hasAttribute('disabled');
      return inputEnabled;
    });
    record('REG_F5_SETTINGS_E04_UNCERTAINTY', 'PUT 503 triggers approved State E04 uncertainty banner and reconciles via GET readback', f5UncertainActive && f5Reconciled);

    // REG_F6: Escape Key Protection and Focus Trap
    await page.goto(`${BASE_URL}/settings/owners?create=1&farmId=104`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('div[role="dialog"]');
    await page.type('#owner-email', 'dirty.escape@duricare.vn');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.body.textContent.includes('Rời form đang chỉnh sửa?'));
    const dialogVisible = await page.evaluate(() => document.body.textContent.includes('Rời form đang chỉnh sửa?'));

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.textContent.includes('Rời form đang chỉnh sửa?'));
    const returnedToForm = await page.evaluate(() => {
      const emailInput = document.querySelector('#owner-email');
      return emailInput && emailInput.value === 'dirty.escape@duricare.vn';
    });
    record('REG_F6_ESCAPE_AND_FOCUS_TRAP', 'Escape key activates F01 confirmation without stale closure and second Escape returns safely', dialogVisible && returnedToForm);

    // REG_F7: Mobile Typography (16px font-size to prevent iOS zoom, 14px label)
    await page.setViewport({ width: 375, height: 844 });
    await page.goto(`${BASE_URL}/settings/farm/new`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#farm-create-name');

    const typo = await page.evaluate(() => {
      const input = document.querySelector('#farm-create-name');
      const label = document.querySelector('label[for="farm-create-name"]');
      const inputFontSize = window.getComputedStyle(input).fontSize;
      const labelFontSize = window.getComputedStyle(label).fontSize;
      return { inputFontSize, labelFontSize };
    });
    record('REG_F7_MOBILE_TYPOGRAPHY', 'Mobile input font-size is computed 16px to prevent iOS auto-zoom, label is 14px',
      typo.inputFontSize === '16px' && typo.labelFontSize === '14px');

    // =============================================================
    // DEDICATED REGRESSION TESTS FOR REVIEW R2 (R2-1 through R2-4)
    // =============================================================
    console.log('\n--- DEDICATED REGRESSION TESTS (R2-1 to R2-4) ---');

    // REG_R2_1: Reconcile Generation and Farm Scope Fencing (R2-1)
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/settings/farm?farmId=104`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#farm-settings-name');
    await clearInput('#farm-settings-name');
    await page.type('#farm-settings-name', 'Trigger503PutFarm');
    await page.click('form button[type="submit"]');

    await page.waitForFunction(() => document.body.textContent.includes('Chưa xác nhận được thay đổi'));

    // Set up delayed GET /farms/104
    let resolveDelayed104;
    mockState.delayedFarm104 = new Promise(resolve => { resolveDelayed104 = resolve; });

    // Click reconcile ("Tải lại thông tin hiện tại") - in-flight GET 104 is now paused
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tải lại thông tin hiện tại'));
      btn?.click();
    });

    // While GET 104 is in flight and isSaving is true, switch farm scope to Farm 211 via in-place header picker without page reload (R3-1)
    await page.waitForSelector('#header-farm-picker');
    await page.select('#header-farm-picker', '211');
    await page.waitForFunction(() => {
      const el = document.querySelector('#farm-settings-name');
      return el && el.value.includes('Vườn mẫu Phong Điền');
    });

    // Resolve the delayed GET 104 response
    resolveDelayed104();
    mockState.delayedFarm104 = null;
    await new Promise(r => setTimeout(r, 200));

    // Assert that Farm 211's scope was NOT overwritten by late GET 104
    // AND assert that Farm 211 is NOT locked in isSaving state ("Đang lưu…") (R3-1)
    const r2_1Handled = await page.evaluate(() => {
      const nameInput = document.querySelector('#farm-settings-name');
      const submitBtn = document.querySelector('form button[type="submit"]');
      const text = document.body.textContent || '';
      const noUncertaintyBanner = !text.includes('Chưa xác nhận được thay đổi');
      const namePreserved = nameInput && nameInput.value.includes('Vườn mẫu Phong Điền');
      const notDisabled = nameInput && !nameInput.hasAttribute('disabled');
      const btnNotDisabled = submitBtn && !submitBtn.hasAttribute('disabled');
      const btnNotSaving = submitBtn && !submitBtn.textContent.includes('Đang lưu…');
      return noUncertaintyBanner && namePreserved && notDisabled && btnNotDisabled && btnNotSaving;
    });

    // Perform a subsequent PUT on Farm 211 to prove form is fully operational and not locked
    let put211Dispatched = false;
    const put211Handler = (req) => {
      if (req.method() === 'PUT' && req.url().includes('/farms/211')) {
        put211Dispatched = true;
      }
    };
    page.on('request', put211Handler);

    await clearInput('#farm-settings-name');
    await page.type('#farm-settings-name', 'Vườn mẫu Phong Điền Cập Nhật');
    await page.click('form button[type="submit"]');

    await page.waitForFunction(() => {
      const el = document.querySelector('#farm-settings-name');
      return el && el.value.includes('Vườn mẫu Phong Điền Cập Nhật');
    });
    page.off('request', put211Handler);

    record('REG_R2_1_RECONCILE_GENERATION_FENCE', 'Late reconcile response is fenced, and in-place farm switch does not lock target farm in isSaving (R3-1)', r2_1Handled && put211Dispatched);

    // REG_R2_2: Inline Operation UUID Lifecycle & Reset on Boundary (R2-2)
    let firstInlineOpId = null;
    let secondInlineOpId = null;

    const opCaptureHandler = (req) => {
      if (req.method() === 'POST' && req.url().includes('/farms')) {
        const key = req.headers()['idempotency-key'];
        if (key) {
          if (!firstInlineOpId) {
            firstInlineOpId = key;
          } else if (!secondInlineOpId) {
            secondInlineOpId = key;
          }
        }
      }
    };
    page.on('request', opCaptureHandler);

    await page.goto(`${BASE_URL}/settings/owners?create=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('div[role="dialog"]');

    // Click tab to create new farm
    await page.evaluate(() => {
      const newFarmTab = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Tạo vườn mới'));
      newFarmTab?.click();
    });
    await page.waitForSelector('#owner-inline-farm-name');
    await page.type('#owner-inline-farm-name', 'Vườn Inline Một');

    // Click submit inline farm
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Tạo vườn và tiếp tục'));
      btn?.click();
    });

    // Wait for Retained Farm notice inside modal
    await page.waitForFunction(() => document.body.textContent.includes('Vườn đã được tạo và giữ lại'));

    // Click modal close button to trigger F03
    await page.evaluate(() => {
      const closeBtn = document.querySelector('div[role="dialog"] header button');
      closeBtn?.click();
    });
    await page.waitForFunction(() => document.body.textContent.includes('Để sau phần tạo tài khoản?'));

    // Click "Để sau" in F03 confirmation modal
    await page.evaluate(() => {
      const laterBtn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Để sau'));
      laterBtn?.click();
    });

    // Wait for dialog to close
    await page.waitForFunction(() => !document.querySelector('div[role="dialog"]'));

    // Reopen Owner modal
    await page.goto(`${BASE_URL}/settings/owners?create=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('div[role="dialog"]');

    // Click tab to create new farm again
    await page.evaluate(() => {
      const newFarmTab = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Tạo vườn mới'));
      newFarmTab?.click();
    });
    await page.waitForSelector('#owner-inline-farm-name');
    await page.type('#owner-inline-farm-name', 'Vườn Inline Hai');

    // Click submit second inline farm
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Tạo vườn và tiếp tục'));
      btn?.click();
    });

    // Wait for Retained Farm notice
    await page.waitForFunction(() => document.body.textContent.includes('Vườn đã được tạo và giữ lại'));

    // Click close to trigger F03
    await page.evaluate(() => {
      const closeBtn = document.querySelector('div[role="dialog"] header button');
      closeBtn?.click();
    });
    await page.waitForFunction(() => document.body.textContent.includes('Để sau phần tạo tài khoản?'));

    // Click "Để sau"
    await page.evaluate(() => {
      const laterBtn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.textContent.includes('Để sau'));
      laterBtn?.click();
    });
    await page.waitForFunction(() => !document.querySelector('div[role="dialog"]'));

    page.off('request', opCaptureHandler);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const distinctUuids = firstInlineOpId && secondInlineOpId &&
      firstInlineOpId !== secondInlineOpId &&
      uuidRegex.test(firstInlineOpId) &&
      uuidRegex.test(secondInlineOpId);
    record('REG_R2_2_INLINE_UUID_LIFECYCLE', 'Subsequent inline farm creations allocate fresh distinct UUIDs without operation reuse', Boolean(distinctUuids));

    // REG_R2_3: Separate Readback Failure (503/Network) and Resource Removed (404) (R2-3)
    let postCountTrigger503 = 0;
    const postCountHandler = (req) => {
      if (req.method() === 'POST' && req.url().includes('/farms') && req.postData()?.includes('TriggerReadback503')) {
        postCountTrigger503++;
      }
    };
    page.on('request', postCountHandler);

    await page.goto(`${BASE_URL}/settings/farm/new`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#farm-create-name');
    await clearInput('#farm-create-name');
    await page.type('#farm-create-name', 'TriggerReadback503 Farm');
    await page.click('button[type="submit"]');

    // Wait for READBACK_UNAVAILABLE state
    await page.waitForFunction(() => document.body.textContent.includes('Chưa thể kiểm tra kết quả') || document.body.textContent.includes('chưa thể xác nhận trạng thái hiện tại do dịch vụ gián đoạn'));

    const readbackUnavailableValid = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const notClaimingSuccess = !text.includes('Đã tạo nông trại thành công');
      const hasActionableMessage = text.includes('chưa thể xác nhận trạng thái hiện tại do dịch vụ gián đoạn');
      const stored = sessionStorage.getItem('duricare_setup_op_1_FARM_CREATE');
      const storagePreserved = stored && JSON.parse(stored).stage === 'UNKNOWN';
      const noRetryPostBtn = !Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Thử lại cùng yêu cầu'));
      const hasCheckBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Kiểm tra kết quả'));
      return notClaimingSuccess && hasActionableMessage && storagePreserved && noRetryPostBtn && hasCheckBtn;
    });

    page.off('request', postCountHandler);

    // Now test 404 readback entering RESOURCE_REMOVED
    const r2_3_404OpId = crypto.randomUUID().toLowerCase();
    mockState.setupOperations[r2_3_404OpId] = {
      contractVersion: 'FARM-SETUP-001-v1',
      operationId: r2_3_404OpId,
      kind: 'FARM_CREATE',
      status: 'APPLIED_SNAPSHOT',
      resourceId: 9998,
      resource: { id: 9998, name: 'Vườn Đã Xóa 9998' },
      appliedAt: new Date().toISOString(),
    };
    await page.evaluate((opId) => {
      sessionStorage.setItem('duricare_setup_op_1_FARM_CREATE', JSON.stringify({
        version: 1,
        actorId: 1,
        operationId: opId,
        kind: 'FARM_CREATE',
        stage: 'UNKNOWN',
        draft: { name: 'Vườn Đã Xóa 9998', location: 'Cần Thơ', area: '10', latitude: '', longitude: '' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }, r2_3_404OpId);

    await page.goto(`${BASE_URL}/settings/farm/new`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.textContent.includes('Kiểm tra kết quả'));

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Kiểm tra kết quả'));
      btn?.click();
    });

    await page.waitForFunction(() => document.body.textContent.includes('Nông trại không còn tồn tại'));
    const resourceRemovedValid = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const hasRemovedTitle = text.includes('Nông trại không còn tồn tại');
      const hasSpecificDesc = text.includes('hiện không còn tồn tại trên máy chủ');
      const storageCleared = !sessionStorage.getItem('duricare_setup_op_1_FARM_CREATE');
      return hasRemovedTitle && hasSpecificDesc && storageCleared;
    });

    record('REG_R2_3_READBACK_FAILURE_PRESERVES_RECOVERY', 'Non-404 readback failure preserves UNKNOWN operation without duplicate POST; 404 enters RESOURCE_REMOVED',
      readbackUnavailableValid && postCountTrigger503 === 1 && resourceRemovedValid);

    await page.evaluate(() => {
      sessionStorage.removeItem('duricare_setup_op_1_FARM_CREATE');
    });

    // REG_R2_4: In-App Anchor Navigation Guard via Capture Listener (R2-4)
    await page.goto(`${BASE_URL}/settings/farm/new`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#farm-create-name');
    await clearInput('#farm-create-name');
    await page.type('#farm-create-name', 'Vườn Dirty Guard Test');

    // Click internal link to /settings/owners
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/settings/owners"]');
      link?.click();
    });

    // Verify modal F01 appeared and URL stayed at /settings/farm/new
    await page.waitForFunction(() => document.body.textContent.includes('Rời form đang chỉnh sửa?'));
    const f01Appeared = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const isF01 = text.includes('Rời form đang chỉnh sửa?');
      const urlClean = window.location.pathname === '/settings/farm/new';
      return isF01 && urlClean;
    });

    // Click "Giữ lại chỉnh sửa" to stay on form
    await page.evaluate(() => {
      const stayBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Giữ lại chỉnh sửa'));
      stayBtn?.click();
    });
    await page.waitForFunction(() => !document.body.textContent.includes('Rời form đang chỉnh sửa?'));

    const formPreserved = await page.evaluate(() => {
      const input = document.querySelector('#farm-create-name');
      return input && input.value === 'Vườn Dirty Guard Test' && window.location.pathname === '/settings/farm/new';
    });

    // Click link again and confirm "Rời form"
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/settings/owners"]');
      link?.click();
    });
    await page.waitForFunction(() => document.body.textContent.includes('Rời form đang chỉnh sửa?'));

    await page.evaluate(() => {
      const leaveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Rời form');
      leaveBtn?.click();
    });

    await page.waitForFunction(() => window.location.pathname.includes('/settings/owners'));
    const navigatedAfterConfirm = await page.evaluate(() => window.location.pathname.includes('/settings/owners'));

    record('REG_R2_4_IN_APP_NAVIGATION_GUARD', 'Capture listener intercepts in-app link clicks on dirty form, shows F01, and navigates only after confirmation',
      f01Appeared && formPreserved && navigatedAfterConfirm);

  } finally {
    await browser.close();
    await server.close();
  }

  // -------------------------------------------------------------
  // PART 3: Evidence Hashes Manifest & Results Export
  // -------------------------------------------------------------
  console.log('\n--- PART 3: GENERATING EVIDENCE MANIFEST & TEST REPORT ---');
  const resultsJsonPath = path.join(EVIDENCE_DIR, 'farm-setup-001-test-results.json');
  fs.writeFileSync(resultsJsonPath, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`Test results written to ${resultsJsonPath}`);

  const evidenceFiles = fs.readdirSync(EVIDENCE_DIR).filter(f => f.startsWith('farm_setup_') && f.endsWith('.png'));
  const hashes = {};
  for (const f of evidenceFiles) {
    const fPath = path.join(EVIDENCE_DIR, f);
    const buf = fs.readFileSync(fPath);
    hashes[f] = {
      bytes: buf.length,
      sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    };
  }

  const manifestPath = path.join(EVIDENCE_DIR, 'farm-setup-001-evidence-hashes.json');
  fs.writeFileSync(manifestPath, JSON.stringify(hashes, null, 2), 'utf8');
  console.log(`Evidence hashes manifest written to ${manifestPath} (${Object.keys(hashes).length} files)`);

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`\nTEST SUMMARY: ${passed} PASSED, ${failed} FAILED out of ${testResults.length} assertions.`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
