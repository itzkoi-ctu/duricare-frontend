import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('FE-OWNER-001: Admin Farm Owner Account Management Verification');
console.log('================================================================');

const EVIDENCE_DIRS = [
  'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence',
  'E:/CTU/LuanVan/docs/ai/thesis/evidence/OWNER-001-20261119',
];
const PORT = 5190;
const BASE_URL = `http://127.0.0.1:${PORT}`;

for (const dir of EVIDENCE_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(page, filename) {
  const primaryPath = path.join(EVIDENCE_DIRS[0], filename);
  const buffer = await page.screenshot({ path: primaryPath, fullPage: true });
  console.log(`  Saved screenshot: ${primaryPath}`);
  for (let i = 1; i < EVIDENCE_DIRS.length; i++) {
    const mirrorPath = path.join(EVIDENCE_DIRS[i], filename);
    fs.writeFileSync(mirrorPath, buffer);
    console.log(`  Saved screenshot: ${mirrorPath}`);
  }
}

function startWorktreeSpaServer(port) {
  const distDir = path.resolve(ROOT, 'dist');
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

// Mock Data
const ADMIN_USER = { id: 1, email: 'admin@duricare.vn', role: 'ADMIN', farmId: null };

const FARMS = [
  { id: 1, name: 'Vườn sầu riêng TEST', location: 'Cần Thơ', area: 5.2, zoneIds: [1, 2] },
  { id: 2, name: 'Vườn thực nghiệm Thới An', location: 'Ô Môn, Cần Thơ', area: 12.0, zoneIds: [3] },
  { id: 3, name: 'Vườn khảo nghiệm Phong Điền', location: 'Phong Điền, Cần Thơ', area: 8.5, zoneIds: [4] },
];

let mockOwners = [
  {
    id: 89,
    email: 'nguyenvana@farm-ctu.invalid',
    role: 'OWNER',
    farmId: 1,
    farmName: 'Vườn sầu riêng TEST',
    enabled: true,
    version: 1,
    createdAt: '2026-11-16T08:30:00Z',
  },
  {
    id: 90,
    email: 'lethib@thoian-durian.invalid',
    role: 'OWNER',
    farmId: 2,
    farmName: 'Vườn thực nghiệm Thới An',
    enabled: true,
    version: 1,
    createdAt: '2026-11-14T14:15:00Z',
  },
  {
    id: 91,
    email: 'tranquocc@phongdien-orchard.invalid',
    role: 'OWNER',
    farmId: 3,
    farmName: 'Vườn khảo nghiệm Phong Điền',
    enabled: false,
    version: 2,
    createdAt: '2026-11-10T09:00:00Z',
  },
  {
    id: 92,
    email: 'phamvand@farm-ctu.invalid',
    role: 'OWNER',
    farmId: 1,
    farmName: 'Vườn sầu riêng TEST',
    enabled: true,
    version: 1,
    createdAt: '2026-11-05T16:45:00Z',
  },
];

let mockEvents = {
  89: [
    {
      eventId: 101,
      ownerUserId: 89,
      actorUserId: 21,
      action: 'UNLOCK',
      fromEnabled: false,
      toEnabled: true,
      fromVersion: 1,
      version: 2,
      reason: 'Đã hoàn tất việc cập nhật thiết bị ghi nhận nhật ký hiện trường của chủ vườn tại lô thực nghiệm Thới An theo biên bản xác nhận phòng nông nghiệp.',
      occurredAt: '2026-11-14T15:40:00Z',
    },
    {
      eventId: 100,
      ownerUserId: 89,
      actorUserId: 21,
      action: 'LOCK',
      fromEnabled: true,
      toEnabled: false,
      fromVersion: 0,
      version: 1,
      reason: 'Chủ vườn thông báo thay đổi nhân sự phụ trách ghi nhật ký bón phân và đo độ mặn tại trạm; tạm khóa để tránh phát sinh dữ liệu nhật ký mâu thuẫn trong kỳ kiểm tra VietGAP.',
      occurredAt: '2026-11-10T09:15:00Z',
    },
    {
      eventId: 99,
      ownerUserId: 89,
      actorUserId: 1,
      action: 'CREATE',
      fromEnabled: null,
      toEnabled: true,
      fromVersion: null,
      version: 0,
      reason: 'Khởi tạo tài khoản chủ vườn phụ trách Vườn sầu riêng TEST.',
      occurredAt: '2026-11-01T08:30:00Z',
    },
  ],
};

let server;
let browser;

async function run() {
  server = await startWorktreeSpaServer(PORT);
  console.log(`SPA Server running at ${BASE_URL}`);

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Route API mock
  await page.setRequestInterception(true);
  let triggerConflictOnce = false;
  let eventFailOnce = false;
  let eventGetCount = 0;
  let holdOwner89 = false;
  let releaseOwner89 = null;
  let holdMutation89 = false;
  let releaseMutation89 = null;

  page.on('request', async req => {
    const url = req.url();
    const method = req.method();
    if (url.includes('auth') || url.includes('api')) {
      console.log(`[REQ] ${method} ${url}`);
    }

    // 1. Auth check
    if (url.includes('/auth/refresh')) {
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'mock-access-token' }),
      });
    }

    if (url.includes('/auth/csrf')) {
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-csrf' }),
      });
    }

    if (url.includes('/auth/me')) {
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ADMIN_USER),
      });
    }

    // 2. Farms
    if (url.includes('/farms') && method === 'GET') {
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FARMS),
      });
    }

    // 3. Overview (for Shell)
    if (url.includes('/overview') && method === 'GET') {
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          farmName: 'Vườn sầu riêng TEST',
          totalUnresolvedAlerts: 4,
          weather: { temperature: 31, weatherCode: 1 },
        }),
      });
    }

    // 4. Owners List
    if (url.includes('/admin/owners') && method === 'GET' && !url.match(/\/admin\/owners\/\d+/)) {
      const u = new URL(url);
      const farmId = u.searchParams.get('farmId');
      const enabled = u.searchParams.get('enabled');

      let filtered = [...mockOwners];
      if (farmId) {
        filtered = filtered.filter(o => o.farmId === Number(farmId));
      }
      if (enabled !== null && enabled !== undefined) {
        filtered = filtered.filter(o => o.enabled === (enabled === 'true'));
      }

      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: filtered,
          page: 0,
          size: 20,
          totalElements: filtered.length,
          totalPages: 1,
        }),
      });
    }

    // 5. Create Owner
    if (url.includes('/admin/owners') && method === 'POST' && !url.includes('/status')) {
      const postData = JSON.parse(req.postData() || '{}');
      if (postData.email === 'duplicate@farm-ctu.invalid') {
        return req.respond({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Email đã tồn tại trong hệ thống' }),
        });
      }

      const farm = FARMS.find(f => f.id === postData.farmId) || FARMS[0];
      const newOwner = {
        id: 93,
        email: postData.email,
        role: 'OWNER',
        farmId: farm.id,
        farmName: farm.name,
        enabled: true,
        version: 1,
        createdAt: new Date().toISOString(),
      };
      mockOwners.unshift(newOwner);
      return req.respond({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newOwner),
      });
    }

    // 6. Owner Detail
    const detailMatch = url.match(/\/admin\/owners\/(\d+)$/);
    if (detailMatch && method === 'GET') {
      const id = Number(detailMatch[1]);
      if (id === 89 && holdOwner89) {
        holdOwner89 = false;
        await new Promise(resolve => {
          releaseOwner89 = resolve;
        });
      }
      const found = mockOwners.find(o => o.id === id);
      if (!found) {
        return req.respond({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found' }) });
      }
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(found),
      });
    }

    // 7. Owner Status Update (Lock / Unlock)
    const statusMatch = url.match(/\/admin\/owners\/(\d+)\/status$/);
    if (statusMatch && method === 'POST') {
      const id = Number(statusMatch[1]);
      if (id === 89 && holdMutation89) {
        holdMutation89 = false;
        await new Promise(resolve => {
          releaseMutation89 = resolve;
        });
      }
      const found = mockOwners.find(o => o.id === id);
      const postData = JSON.parse(req.postData() || '{}');

      if (triggerConflictOnce) {
        triggerConflictOnce = false;
        return req.respond({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Optimistic lock conflict: version mismatch' }),
        });
      }

      if (found) {
        found.enabled = postData.enabled;
        found.version += 1;

        if (!mockEvents[id]) mockEvents[id] = [];
        mockEvents[id].unshift({
          eventId: Date.now(),
          ownerUserId: id,
          actorUserId: 1,
          action: postData.enabled ? 'UNLOCK' : 'LOCK',
          fromEnabled: !postData.enabled,
          toEnabled: postData.enabled,
          fromVersion: found.version - 1,
          version: found.version,
          reason: postData.reason,
          occurredAt: new Date().toISOString(),
        });

        return req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(found),
        });
      }
    }

    // 8. Owner Events
    const eventsMatch = url.match(/\/admin\/owners\/(\d+)\/events/);
    if (eventsMatch && method === 'GET') {
      eventGetCount++;
      if (eventFailOnce) {
        eventFailOnce = false;
        return req.respond({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' }),
        });
      }
      const id = Number(eventsMatch[1]);
      const evs = mockEvents[id] || [];
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: evs,
          page: 0,
          size: 20,
          totalElements: evs.length,
          totalPages: 1,
        }),
      });
    }

    req.continue();
  });

  // Setup auth in localStorage
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'mock-admin-token');
    localStorage.setItem('duricare-language', 'vi');
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });

  // ============================================================
  // TEST SCENARIO 1: Desktop List View (1440px)
  // ============================================================
  console.log('\n--- Scenario 1: Desktop List View (1440px) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/settings/owners`, { waitUntil: 'networkidle0' });
  console.log('  Current URL after goto:', page.url());
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  console.log('  Body snippet:', bodyHtml.slice(0, 300));

  // Check Active Sidebar Navigation Item
  const activeNavItem = await page.$('a[href^="/settings/owners"]');
  assert.ok(activeNavItem, 'Mục Chủ vườn phải hiển thị trong thanh điều hướng');
  const activeStyles = await page.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      borderLeftWidth: cs.borderLeftWidth,
      height: cs.height,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
    };
  }, activeNavItem);
  console.log('  Active sidebar styles:', activeStyles);
  assert.strictEqual(activeStyles.borderLeftWidth, '4px', 'Border left phải là 4px');
  assert.ok(activeStyles.height === '44px' || parseInt(activeStyles.height, 10) >= 44, 'Chiều cao sidebar item tối thiểu 44px');

  // Verify Table & Badges
  const rows = await page.$$('tbody tr');
  assert.strictEqual(rows.length, 4, 'Bảng phải hiển thị 4 dòng dữ liệu mẫu');

  const badgeBox = await page.evaluate(() => {
    const badge = document.querySelector('tbody tr span.inline-flex');
    if (!badge) return null;
    const cs = window.getComputedStyle(badge);
    return {
      height: cs.height,
      borderRadius: cs.borderRadius,
      fontSize: cs.fontSize,
      display: cs.display,
    };
  });
  console.log('  Computed Badge Style:', badgeBox);
  assert.ok(badgeBox, 'Badge trạng thái phải hiển thị');
  assert.strictEqual(badgeBox.height, '26px', 'Badge trạng thái phải cao đúng 26px');
  assert.strictEqual(badgeBox.borderRadius, '6px', 'Badge trạng thái phải bo tròn 6px');

  // Check Detail Link Target
  const detailLinkHeight = await page.evaluate(() => {
    const link = document.querySelector('tbody tr .owner-order-link');
    return link ? link.offsetHeight : 0;
  });
  assert.ok(detailLinkHeight >= 44, `Link Xem chi tiết phải có touch target >= 44px (đo được: ${detailLinkHeight}px)`);

  await captureScreenshot(page, 'owner_01_desktop_list_1440.png');
  console.log('  ✓ [PASS] Desktop List View 1440px matches reference');

  // ============================================================
  // TEST SCENARIO 2: Mobile List View (390px & 375px)
  // ============================================================
  console.log('\n--- Scenario 2: Mobile List View (390px & 375px) ---');
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle0' });

  let isOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.strictEqual(isOverflow, false, 'Mobile 390px không được có thanh cuộn ngang');
  await captureScreenshot(page, 'owner_02_mobile_list_390.png');
  console.log('  ✓ [PASS] Mobile 390px List View verified (zero horizontal overflow)');

  await page.setViewport({ width: 375, height: 667 });
  await page.reload({ waitUntil: 'networkidle0' });
  isOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.strictEqual(isOverflow, false, 'Mobile 375px không được có thanh cuộn ngang');
  await captureScreenshot(page, 'owner_03_mobile_list_375.png');
  console.log('  ✓ [PASS] Mobile 375px List View verified (zero horizontal overflow)');

  // ============================================================
  // TEST SCENARIO 3: Create Owner Modal (Desktop 1440px)
  // ============================================================
  console.log('\n--- Scenario 3: Create Owner Modal (Desktop 1440px) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.reload({ waitUntil: 'networkidle0' });

  // Open modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Tạo tài khoản'));
    btn?.click();
  });

  await page.waitForSelector('div[role="dialog"]');
  const dialogWidth = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    return dialog ? dialog.clientWidth : 0;
  });
  console.log('  Create Modal clientWidth:', dialogWidth);
  assert.ok(dialogWidth <= 520, 'Desktop modal max-width phải là 520px');

  // Test Duplicate Email Error (409)
  await page.type('#owner-create-email', 'duplicate@farm-ctu.invalid');
  await page.type('#owner-create-password', 'ValidPassw0rd123');
  await page.select('#owner-create-farm', '1');

  await page.evaluate(() => {
    const submitBtn = document.querySelector('div[role="dialog"] button[type="submit"]');
    submitBtn?.click();
  });

  await page.waitForFunction(() => document.body.innerText.includes('Email này đã được gán cho một tài khoản khác'));
  console.log('  ✓ [PASS] Inline 409 conflict handled correctly');

  // Test Password Memory Wipe on Close
  await page.click('button[aria-label="Đóng"]');
  await page.waitForFunction(() => !document.querySelector('div[role="dialog"]'));

  // Re-open and verify fields are cleared
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Tạo tài khoản'));
    btn?.click();
  });
  await page.waitForSelector('div[role="dialog"]');
  const passwordVal = await page.$eval('#owner-create-password', el => el.value);
  assert.strictEqual(passwordVal, '', 'Mật khẩu phải được xóa sạch khỏi state khi đóng hộp thoại');

  // Fill valid new owner
  await page.type('#owner-create-email', 'newowner@farm-ctu.invalid');
  await page.type('#owner-create-password', 'SuperSecretPass123!');
  await page.select('#owner-create-farm', '2');

  // Verify Mobile 390px Viewport for Create Owner Dialog
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 200));
  const createMobileBoxes = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    const submitBtn = dialog?.querySelector('button[type="submit"]');
    const cancelBtn = Array.from(dialog?.querySelectorAll('button') || []).find(b => b.textContent.trim() === 'Hủy');
    const dRect = dialog?.getBoundingClientRect();
    const sRect = submitBtn?.getBoundingClientRect();
    const cRect = cancelBtn?.getBoundingClientRect();
    return {
      dialogHeight: dRect?.height || 0,
      dialogWidth: dRect?.width || 0,
      submitTop: sRect?.top || 0,
      cancelTop: cRect?.top || 0,
    };
  });
  console.log('CREATE_MOBILE_BOXES', JSON.stringify(createMobileBoxes));
  assert.ok(createMobileBoxes.dialogHeight >= 800, 'Tạo tài khoản trên mobile phải là Full-height Dialog');
  assert.ok(createMobileBoxes.submitTop < createMobileBoxes.cancelTop, 'Trên mobile, nút Tạo tài khoản phải xếp TRÊN nút Hủy');

  // Restore Desktop Viewport
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise(r => setTimeout(r, 200));

  await captureScreenshot(page, 'owner_04_create_modal_desktop.png');

  // Submit creation
  await page.evaluate(() => {
    const submitBtn = document.querySelector('div[role="dialog"] button[type="submit"]');
    submitBtn?.click();
  });

  // Verify navigation to detail page (client-side route navigation)
  await page.waitForFunction(() => window.location.pathname.includes('/settings/owners/93'), { timeout: 10000 });
  const currentUrl = page.url();
  console.log('  Navigated after create to:', currentUrl);
  assert.ok(currentUrl.includes('/settings/owners/93'), 'Sau khi tạo thành công phải điều hướng tới trang chi tiết /settings/owners/93');
  console.log('  ✓ [PASS] Owner creation & redirection verified');

  // ============================================================
  // TEST SCENARIO 4: Detail View Desktop (1440px)
  // ============================================================
  console.log('\n--- Scenario 4: Detail View Desktop (1440px) ---');
  await page.goto(`${BASE_URL}/settings/owners/89`, { waitUntil: 'networkidle0' });

  // Verify 2-column layout (5 cols + 7 cols)
  const leftColExists = await page.$('.lg\\:col-span-5');
  const rightColExists = await page.$('.lg\\:col-span-7');
  assert.ok(leftColExists && rightColExists, 'Desktop detail view phải chia tỷ lệ 5:7');

  // Verify account info
  const emailText = await page.$eval('.owner-email', el => el.textContent.trim());
  assert.strictEqual(emailText, 'nguyenvana@farm-ctu.invalid');

  // Verify audit events timeline
  const eventItems = await page.$$('.relative.pl-6 > div.relative');
  assert.ok(eventItems.length >= 3, `Lịch sử phải có ít nhất 3 sự kiện (đo được: ${eventItems.length})`);

  // Verify actorUserId displayed without guessing name
  const pageText = await page.evaluate(() => document.body.innerText);
  assert.ok(pageText.includes('Người thực hiện: #21'), 'Phải hiển thị rõ ID actor (#21) không đoán tên');

  const auditText = await page.$eval('.relative.pl-6', el => el.innerText);
  console.log('REVIEW_ACTUAL_DTO', JSON.stringify({ invalidTimestamp: auditText.includes('NaN'), text: auditText }));
  assert.ok(!auditText.includes('NaN'), 'Lịch sử kiểm toán không được hiển thị NaN timestamp');
  assert.ok(auditText.includes('Đang hoạt động'), 'Lịch sử kiểm toán phải giải mã đúng trạng thái chuyển đổi');

  await captureScreenshot(page, 'owner_05_detail_desktop_1440.png');
  console.log('  ✓ [PASS] Detail view desktop 1440px verified');

  // ============================================================
  // SPA RACE PROBE: Slow response from 89 must not overwrite 90 or open wrong modal
  // ============================================================
  console.log('\n--- Probe: SPA Race Condition & Modal Identity Guard ---');
  holdOwner89 = true;

  // Trigger a fresh fetch on 89 while user is still on /settings/owners/89
  await page.evaluate(() => {
    const refreshBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Làm mới'));
    refreshBtn?.click();
  });
  await new Promise(r => setTimeout(r, 100));

  // SPA navigation to /settings/owners/90
  await page.evaluate(() => {
    window.history.pushState({}, '', '/settings/owners/90');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // Wait for 90 to render
  await page.waitForFunction(() => {
    const el = document.querySelector('.owner-email');
    return el && el.textContent.includes('lethib@thoian-durian.invalid');
  }, { timeout: 5000 });

  // Release held response for 89
  if (releaseOwner89) {
    releaseOwner89();
  }
  await new Promise(r => setTimeout(r, 500));

  // Assert current route and email on page remain on 90
  const currentPath = await page.evaluate(() => window.location.pathname);
  const currentEmail = await page.$eval('.owner-email', el => el.textContent.trim());
  console.log('REVIEW_OWNER_SPA_RACE', JSON.stringify({ path: currentPath, email: currentEmail }));
  assert.strictEqual(currentPath, '/settings/owners/90', 'Đường dẫn phải là /settings/owners/90');
  assert.strictEqual(currentEmail, 'lethib@thoian-durian.invalid', 'Email hiển thị phải là của OWNER #90, không bị đè bởi #89');

  // Verify opening modal on 90 targets 90, NOT 89
  await page.evaluate(() => {
    const lockBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Khóa tài khoản này'));
    lockBtn?.click();
  });
  await page.waitForSelector('div[role="dialog"]');

  const modalText = await page.evaluate(() => document.querySelector('div[role="dialog"]')?.innerText || '');
  const wrongTarget = modalText.includes('nguyenvana@farm-ctu.invalid');
  console.log('REVIEW_OWNER_WRONG_MODAL_TARGET', JSON.stringify({ wrongTarget, url: page.url() }));
  assert.ok(!wrongTarget, 'Modal khóa không được mở nhầm mục tiêu OWNER #89');
  assert.ok(modalText.includes('lethib@thoian-durian.invalid'), 'Modal khóa phải hiển thị đúng tài khoản #90');
  console.log('  ✓ [PASS] SPA race probe verified: cancellation and route identity fence protect state');

  // Close modal on 90
  await page.click('button[aria-label="Đóng"]');
  await page.waitForFunction(() => !document.querySelector('div[role="dialog"]'));

  // ============================================================
  // PROBE: Late Mutation Callback & Modal Session Guard
  // ============================================================
  console.log('\n--- Probe: Late Mutation Callback & Modal Session Guard ---');
  // Navigate to 89 first
  await page.goto(`${BASE_URL}/settings/owners/89`, { waitUntil: 'networkidle0' });

  // 1. On /settings/owners/89, open lock modal for 89
  await page.evaluate(() => {
    const lockBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Khóa tài khoản này'));
    lockBtn?.click();
  });
  await page.waitForSelector('div[role="dialog"]');

  // Type reason for 89
  await page.type('textarea', 'Locking owner 89 for testing delayed mutation');

  // Arm hold on mutation for 89
  holdMutation89 = true;

  // Submit modal on 89 (initiates POST /admin/owners/89/status which is held)
  await page.evaluate(() => {
    const submitBtn = document.querySelector('div[role="dialog"] button[type="submit"]');
    submitBtn?.click();
  });
  await new Promise(r => setTimeout(r, 100));

  // 2. Navigate SPA to /settings/owners/90
  await page.evaluate(() => {
    window.history.pushState({}, '', '/settings/owners/90');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // Wait for 90 to render
  await page.waitForFunction(() => {
    const el = document.querySelector('.owner-email');
    return el && el.textContent.includes('lethib@thoian-durian.invalid');
  }, { timeout: 5000 });

  // Open lock modal on 90
  await page.evaluate(() => {
    const lockBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Khóa tài khoản này'));
    lockBtn?.click();
  });
  await page.waitForSelector('div[role="dialog"]');

  // Type draft reason in modal 90
  const draftReason = 'Preserve owner B reason';
  await page.type('textarea', draftReason);

  // 3. Release held mutation response for 89!
  if (releaseMutation89) {
    releaseMutation89();
  }
  await new Promise(r => setTimeout(r, 500));

  // Check state on 90
  const afterCurrentPath = await page.evaluate(() => window.location.pathname);
  const afterCurrentEmail = await page.$eval('.owner-email', el => el.textContent.trim());
  const hasModalAfter = await page.evaluate(() => Boolean(document.querySelector('div[role="dialog"]')));
  const afterReason = await page.evaluate(() => document.querySelector('textarea')?.value || null);

  console.log('REVIEW_LATE_OWNER_MUTATION', JSON.stringify({
    before: draftReason,
    path: afterCurrentPath,
    email: afterCurrentEmail,
    modalOpen: hasModalAfter,
    reason: afterReason,
  }));

  assert.ok(hasModalAfter, 'Modal B trên OWNER #90 không được bị đóng bởi phản hồi muộn của #89');
  assert.strictEqual(afterReason, draftReason, 'Lý do đang nhập trên modal B phải được bảo toàn nguyên vẹn');
  console.log('  ✓ [PASS] Late mutation probe verified: stale mutation callback safely ignored');

  // Close modal on 90
  await page.click('button[aria-label="Đóng"]');
  await page.waitForFunction(() => !document.querySelector('div[role="dialog"]'));

  // Restore owner 89 state in mockOwners (in case 89 was toggled) and navigate back to 89
  const owner89 = mockOwners.find(o => o.id === 89);
  if (owner89) {
    owner89.enabled = true;
    owner89.version = 1;
  }
  await page.goto(`${BASE_URL}/settings/owners/89`, { waitUntil: 'networkidle0' });

  // ============================================================
  // TEST SCENARIO 5: Lock Account Modal & 409 Optimistic Lock Recovery
  // ============================================================
  console.log('\n--- Scenario 5: Lock Modal & 409 Conflict Recovery ---');
  // Click "Khóa tài khoản này"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Khóa tài khoản này'));
    btn?.click();
  });

  await page.waitForSelector('div[role="dialog"]');
  const lockTitle = await page.$eval('#status-dialog-title', el => el.textContent.trim());
  assert.strictEqual(lockTitle, 'Khóa tài khoản chủ vườn');

  // Verify Lock Modal Mobile 390px Viewport (Bottom Sheet with handle and stacked buttons)
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 200));
  const lockMobileBoxes = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    const submitBtn = dialog?.querySelector('button[type="submit"]');
    const cancelBtn = Array.from(dialog?.querySelectorAll('button') || []).find(b => b.textContent.trim() === 'Hủy');
    const handle = dialog?.querySelector('.rounded-full.bg-\\[\\#cbd5e1\\]');
    const sRect = submitBtn?.getBoundingClientRect();
    const cRect = cancelBtn?.getBoundingClientRect();
    return {
      hasSheetHandle: Boolean(handle),
      submitTop: sRect?.top || 0,
      cancelTop: cRect?.top || 0,
    };
  });
  console.log('LOCK_MOBILE_BOXES', JSON.stringify(lockMobileBoxes));
  assert.ok(lockMobileBoxes.hasSheetHandle, 'Modal khóa trên mobile phải có sheet handle (Bottom Sheet)');
  assert.ok(lockMobileBoxes.submitTop < lockMobileBoxes.cancelTop, 'Trên mobile, nút Khóa tài khoản phải xếp TRÊN nút Hủy');

  // Restore Desktop Viewport for 409 conflict and submission flow
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise(r => setTimeout(r, 200));

  // Trigger 409 Conflict on next status submit
  triggerConflictOnce = true;
  await page.type('#status-change-reason', 'Tạm ngưng quyền để kiểm tra nhật ký tưới nước');

  await page.evaluate(() => {
    const submitBtn = document.querySelector('div[role="dialog"] button[type="submit"]');
    submitBtn?.click();
  });

  // Verify 409 conflict banner and preserved reason
  await page.waitForFunction(() => document.body.innerText.includes('Xung đột phiên bản dữ liệu'));
  const preservedReason = await page.$eval('#status-change-reason', el => el.value);
  assert.strictEqual(preservedReason, 'Tạm ngưng quyền để kiểm tra nhật ký tưới nước', 'Lý do phải được giữ nguyên vẹn trong textarea khi gặp lỗi 409');

  // Verify submit button is locked/disabled after 409 conflict
  const submitDisabled = await page.$eval('div[role="dialog"] button[type="submit"]', el => el.disabled);
  console.log('REVIEW_409', JSON.stringify({ submitDisabled, expectedDisabled: true }));
  assert.strictEqual(submitDisabled, true, 'Nút xác nhận phải bị khóa sau lỗi 409 cho đến khi tải lại');

  await captureScreenshot(page, 'owner_06_conflict_409_lock_modal.png');
  console.log('  ✓ [PASS] 409 Conflict recovery & reason preservation verified');

  // Click "Tải lại dữ liệu mới nhất (Giữ nguyên lý do)"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Tải lại dữ liệu mới nhất'));
    btn?.click();
  });

  await page.waitForFunction(() => !document.body.innerText.includes('Xung đột phiên bản dữ liệu'));
  await new Promise(r => setTimeout(r, 300));

  // Now submit again without conflict
  await page.evaluate(() => {
    const submitBtn = document.querySelector('div[role="dialog"] button[type="submit"]');
    submitBtn?.click();
  });

  await page.waitForFunction(() => !document.querySelector('div[role="dialog"]'));

  // Status should now be "Đã khóa"
  await page.waitForFunction(() => document.body.innerText.includes('Đã khóa'));
  await captureScreenshot(page, 'owner_07_locked_state_desktop.png');
  console.log('  ✓ [PASS] Account locked successfully');

  // ============================================================
  // TEST SCENARIO 6: Unlock Modal
  // ============================================================
  console.log('\n--- Scenario 6: Unlock Modal ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Mở tài khoản'));
    btn?.click();
  });

  await page.waitForSelector('div[role="dialog"]');
  const unlockTitle = await page.$eval('#status-dialog-title', el => el.textContent.trim());
  assert.strictEqual(unlockTitle, 'Mở khóa tài khoản chủ vườn');

  await page.type('#status-change-reason', 'Đã kiểm tra xong, mở lại quyền bình thường.');
  await captureScreenshot(page, 'owner_08_unlock_modal.png');

  await page.evaluate(() => {
    const submitBtn = document.querySelector('div[role="dialog"] button[type="submit"]');
    submitBtn?.click();
  });

  await page.waitForFunction(() => !document.querySelector('div[role="dialog"]'));
  await page.waitForFunction(() => document.body.innerText.includes('Đang hoạt động'));
  console.log('  ✓ [PASS] Account unlocked successfully');

  // ============================================================
  // TEST: Event History Error & Retry Request
  // ============================================================
  console.log('\n--- Scenario: Event History Error & Retry Request ---');
  eventFailOnce = true;
  await page.goto(`${BASE_URL}/settings/owners/89`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.body.innerText.includes('Không thể tải lịch sử thao tác.'));
  const requestsBefore = eventGetCount;
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Thử lại');
    if (!button) throw new Error('missing retry button');
    button.click();
  });
  await new Promise(r => setTimeout(r, 500));
  const newRequests = eventGetCount - requestsBefore;
  console.log('REVIEW_EVENT_RETRY', JSON.stringify({ requestsBefore, requestsAfter: eventGetCount, newRequests }));
  assert.ok(newRequests > 0, 'Nút "Thử lại" lịch sử phải gửi request mới lên server');
  await page.waitForFunction(() => !document.body.innerText.includes('Không thể tải lịch sử thao tác.'));
  console.log('  ✓ [PASS] Event history retry request verified cleanly');

  // ============================================================
  // TEST SCENARIO 7: Filtered Empty State
  // ============================================================
  console.log('\n--- Scenario 7: Filtered Empty State ---');
  await page.goto(`${BASE_URL}/settings/owners`, { waitUntil: 'networkidle0' });

  // Select farm 2 and locked
  await page.select('#filter-farm', '2');
  await page.select('#filter-status', 'locked');

  await page.waitForFunction(() => document.body.innerText.includes('Không tìm thấy tài khoản phù hợp'));
  await captureScreenshot(page, 'owner_09_filtered_empty_state.png');
  console.log('  ✓ [PASS] Filtered empty state verified');

  // Reset filters
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Xóa bộ lọc'));
    btn?.click();
  });
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length >= 4);
  console.log('  ✓ [PASS] Clear filters resets to full list');

  // ============================================================
  // TEST SCENARIO 8: Dark Theme Verification
  // ============================================================
  console.log('\n--- Scenario 8: Dark Theme Verification ---');
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });

  await captureScreenshot(page, 'owner_10_dark_desktop_list.png');

  await page.goto(`${BASE_URL}/settings/owners/89`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await captureScreenshot(page, 'owner_11_dark_detail.png');
  console.log('  ✓ [PASS] Dark theme screenshots captured');

  console.log('\n================================================================');
  console.log('ALL 8 FE-OWNER-001 TEST SCENARIOS PASSED WITH ZERO FAILURES!');
  console.log('================================================================');
}

run()
  .catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (server) server.close();
  });
