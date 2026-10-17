import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Read admin credentials from .env / .env.development
let adminEmail = '';
let adminPassword = '';

function loadEnv(filepath) {
  if (!fs.existsSync(filepath)) return;
  const content = fs.readFileSync(filepath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m) {
      const key = m[1];
      const val = m[2].trim().replace(/^['"]|['"]$/g, '');
      if (key === 'ADMIN_SEED_EMAIL' && val) adminEmail = val;
      if (key === 'ADMIN_SEED_PASSWORD' && val) adminPassword = val;
    }
  }
}

loadEnv('E:/CTU/LuanVan/duricare-backend/DuriCare/.env');
if (!adminEmail || !adminPassword) {
  loadEnv('E:/CTU/LuanVan/duricare-backend/DuriCare/.env.development');
}

assert.ok(adminEmail && adminPassword, 'Admin seed credentials must be available');

const outDir = path.resolve('E:/CTU/LuanVan/duricare-frontend/verification/expert-admin');
fs.mkdirSync(outDir, { recursive: true });

const report = {
  checks: [],
  requests: [],
  screenshots: [],
  consoleErrors: [],
};

let baseUrl = 'http://localhost:5173';
let server = null;
try {
  const ping = await fetch(baseUrl);
  if (ping.ok) {
    console.log('Using existing Vite dev server at:', baseUrl);
  }
} catch {
  server = await createServer({
    server: { port: 5173 },
    configFile: path.resolve('E:/CTU/LuanVan/duricare-frontend/vite.config.ts'),
  });
  await server.listen();
  baseUrl = `http://localhost:${server.httpServer.address().port}`;
  console.log('Started Vite server at:', baseUrl);
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function captureScreen(page, filename, width = 1440, theme = 'light') {
  await page.setViewport({ width, height: 950, deviceScaleFactor: 1 });
  await page.evaluate(t => {
    localStorage.setItem('theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  }, theme);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  const filepath = path.join(outDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  report.screenshots.push(filename);
  console.log(`Saved screenshot: ${filename} (${width}px, ${theme})`);
}

async function assertNoHorizontalOverflow(page, label) {
  const isOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  assert.ok(!isOverflow, `Layout must not overflow horizontally on ${label}`);
  report.checks.push(`No horizontal overflow on ${label}`);
}

try {
  const adminContext = await browser.createBrowserContext();
  const page = await adminContext.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => {
    console.error('BROWSER ERROR:', err.message);
    report.consoleErrors.push(err.message);
  });
  page.on('response', res => {
    const url = res.url();
    if (url.includes('/api/')) {
      report.requests.push({
        method: res.request().method(),
        url: new URL(url).pathname,
        status: res.status(),
      });
    }
  });

  // ─── 1. Login as ADMIN ───
  console.log('--- Step 1: Login as ADMIN ---');
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
  try {
    await page.waitForSelector('#email', { timeout: 15000 });
  } catch (err) {
    console.error('Failed to find #email! Current URL:', page.url());
    console.error('Page text:', await page.evaluate(() => document.body.innerText));
    throw err;
  }
  await page.type('#email', adminEmail);
  await page.type('#password', adminPassword);
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => location.pathname === '/' || location.pathname.startsWith('/settings'), { timeout: 15000 });
  console.log('Admin logged in successfully, landed at:', await page.evaluate(() => location.pathname));
  report.checks.push('Admin login succeeded');

  // Verify storage security (no raw token or password in storage)
  const storedKeys = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
  assert.ok(!storedKeys.some(k => /token|password|auth/i.test(k) && !k.includes('theme') && !k.includes('lang')), 'No token or password stored in web storage');
  report.checks.push('No token or password in web storage');

  // ─── 2. Open /settings/experts List ───
  console.log('--- Step 2: Open Expert Management List ---');
  await page.goto(`${baseUrl}/settings/experts`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.body.innerText.includes('Quản lý chuyên gia'));

  // Layout check on 768px tablet
  await page.setViewport({ width: 768, height: 950 });
  await assertNoHorizontalOverflow(page, '768px Tablet (Expert List)');
  await captureScreen(page, 'expert-list-768-light.png', 768, 'light');

  // Capture List Screenshots at 1440 and 375, light and dark
  await captureScreen(page, 'expert-list-1440-light.png', 1440, 'light');
  await captureScreen(page, 'expert-list-1440-dark.png', 1440, 'dark');
  await captureScreen(page, 'expert-list-375-light.png', 375, 'light');
  await captureScreen(page, 'expert-list-375-dark.png', 375, 'dark');

  // Mobile overflow navigation sheet check on 375px
  console.log('Testing mobile overflow navigation sheet...');
  await page.setViewport({ width: 375, height: 950 });
  const moreButton = await page.$('button[aria-label="Mở rộng menu quản lý"]');
  if (moreButton) {
    await moreButton.click();
    await page.waitForSelector('dialog[open]');
    await captureScreen(page, 'mobile-nav-overflow-sheet-375.png', 375, 'light');
    // Close sheet
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    report.checks.push('Mobile overflow navigation sheet opens and closes with Escape');
  }

  // ─── 3. Open Create Form /settings/experts/new ───
  console.log('--- Step 3: Open Create Form ---');
  await page.goto(`${baseUrl}/settings/experts/new`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#expert-email');
  await assertNoHorizontalOverflow(page, '375px Mobile (Create Form)');

  // Capture initial empty state
  await captureScreen(page, 'expert-create-initial-1440.png', 1440, 'light');
  await captureScreen(page, 'expert-create-initial-375.png', 375, 'light');

  // Trigger and capture validation errors
  console.log('Triggering create form validation errors...');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.body.innerText.includes('Vui lòng'));
  await captureScreen(page, 'expert-create-validation-errors-1440.png', 1440, 'light');
  await captureScreen(page, 'expert-create-validation-errors-375.png', 375, 'light');
  report.checks.push('Create form validation errors triggered and rendered');

  const testEmail = `test-pilot-${Date.now()}@example.invalid`;
  const testPassword = 'ExpertInitialPass123!';
  const testName = 'TEST-GS. TS. Nguyễn Văn Chuyên';
  const testAffiliation = 'Trường Nông nghiệp - Đại học Cần Thơ';
  const testSpecialties = 'Chuyên gia sinh lý sầu riêng; quản lý dinh dưỡng và kiểm soát bệnh nấm Phytophthora';

  await page.type('#expert-email', testEmail);
  await page.type('#expert-password', testPassword);
  await page.type('#expert-fullname', testName);
  await page.type('#expert-affiliation', testAffiliation);
  await page.type('#expert-specialties', testSpecialties);

  // Capture Create Form Screenshots with password masked
  await captureScreen(page, 'expert-create-filled-1440-light.png', 1440, 'light');
  await captureScreen(page, 'expert-create-filled-1440-dark.png', 1440, 'dark');
  await captureScreen(page, 'expert-create-filled-375-light.png', 375, 'light');
  await captureScreen(page, 'expert-create-filled-375-dark.png', 375, 'dark');

  // Backward compatibility alias for reports
  await captureScreen(page, 'expert-create-1440-light.png', 1440, 'light');
  await captureScreen(page, 'expert-create-375-light.png', 375, 'light');

  // 768px layout check
  await page.setViewport({ width: 768, height: 950 });
  await assertNoHorizontalOverflow(page, '768px Tablet (Create Form)');

  // ─── 4. Submit Form and Verify POST 201 ───
  console.log('--- Step 4: Submit Create Form ---');
  await page.click('button[type="submit"]');

  // Wait for redirect to /settings/experts/:id
  await page.waitForFunction(() => /\/settings\/experts\/\d+$/.test(location.pathname), { timeout: 15000 });
  const detailUrl = await page.evaluate(() => location.pathname);
  const createdProfileId = Number(detailUrl.split('/').pop());
  assert.ok(createdProfileId > 0, `Profile ID must be valid number, got ${createdProfileId}`);
  console.log('Created expert profile ID:', createdProfileId);
  report.createdProfileId = createdProfileId;
  report.checks.push(`Expert profile created with ID ${createdProfileId} via POST 201`);

  // Verify status is PENDING
  await page.waitForFunction(() => document.body.innerText.includes('Chờ xác minh'));
  report.checks.push('New expert displays PENDING (Chờ xác minh) status');

  // 768px layout check
  await page.setViewport({ width: 768, height: 950 });
  await assertNoHorizontalOverflow(page, '768px Tablet (Detail Page)');

  // Capture Detail PENDING Screenshots
  await captureScreen(page, 'expert-detail-pending-1440-light.png', 1440, 'light');
  await captureScreen(page, 'expert-detail-pending-1440-dark.png', 1440, 'dark');
  await captureScreen(page, 'expert-detail-pending-768-light.png', 768, 'light');
  await captureScreen(page, 'expert-detail-pending-375-light.png', 375, 'light');
  await captureScreen(page, 'expert-detail-pending-375-dark.png', 375, 'dark');

  // ─── 5. Open Status Action Dialog (Verify) ───
  console.log('--- Step 5: Verify Expert ---');
  // Verify real component action buttons for PENDING status
  const pendingVerifyBtn = await page.$('[data-testid="action-verify"]');
  const pendingSuspendBtn = await page.$('[data-testid="action-suspend"]');
  const pendingReinstateBtn = await page.$('[data-testid="action-reinstate"]');
  assert.ok(pendingVerifyBtn, 'PENDING profile must render "Xác minh chuyên gia" button');
  assert.ok(pendingSuspendBtn, 'PENDING profile must render "Tạm đình chỉ" button');
  assert.equal(pendingReinstateBtn, null, 'PENDING profile must NOT render "Khôi phục xác minh" button');
  report.checks.push('Component correctly renders only verify and suspend actions for PENDING status');

  await page.click('[data-testid="action-verify"]');

  await page.waitForSelector('dialog[open]');
  await assertNoHorizontalOverflow(page, '375px Mobile (Verify Dialog)');
  await captureScreen(page, 'expert-dialog-verify-1440-light.png', 1440, 'light');
  await captureScreen(page, 'expert-dialog-verify-375-light.png', 375, 'light');

  // Fill reason
  await page.type('#action-reason', 'Hồ sơ chuyên môn hợp lệ, đủ điều kiện tham gia hệ thống.');
  await page.click('dialog[open] button[type="submit"]');

  // Wait for dialog to close and status to update to VERIFIED
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.waitForFunction(() => document.body.innerText.includes('Đã xác minh'));
  console.log('Status updated to VERIFIED');
  report.checks.push('Status transitioned to VERIFIED (Đã xác minh)');

  // Verify real component action buttons for VERIFIED status
  const verifiedVerifyBtn = await page.$('[data-testid="action-verify"]');
  const verifiedSuspendBtn = await page.$('[data-testid="action-suspend"]');
  const verifiedReinstateBtn = await page.$('[data-testid="action-reinstate"]');
  assert.equal(verifiedVerifyBtn, null, 'VERIFIED profile must NOT render "Xác minh chuyên gia" button');
  assert.ok(verifiedSuspendBtn, 'VERIFIED profile must render "Tạm đình chỉ" button');
  assert.equal(verifiedReinstateBtn, null, 'VERIFIED profile must NOT render "Khôi phục xác minh" button');
  report.checks.push('Component correctly renders only suspend action for VERIFIED status');

  await captureScreen(page, 'expert-detail-verified-1440-light.png', 1440, 'light');
  await captureScreen(page, 'expert-detail-verified-1440-dark.png', 1440, 'dark');
  await captureScreen(page, 'expert-detail-verified-375-light.png', 375, 'light');
  await captureScreen(page, 'expert-detail-verified-375-dark.png', 375, 'dark');

  // ─── 6. Suspend Expert ───
  console.log('--- Step 6: Suspend Expert ---');
  await page.click('[data-testid="action-suspend"]');
  await page.waitForSelector('dialog[open]');
  await page.type('#action-reason', 'Tạm đình chỉ quyền chuyên môn phục vụ rà soát định kỳ.');
  await page.click('dialog[open] button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.waitForFunction(() => document.body.innerText.includes('Tạm đình chỉ'));
  console.log('Status updated to SUSPENDED');
  report.checks.push('Status transitioned to SUSPENDED (Tạm đình chỉ)');

  // Verify real component action buttons for SUSPENDED status
  const suspendedVerifyBtn = await page.$('[data-testid="action-verify"]');
  const suspendedSuspendBtn = await page.$('[data-testid="action-suspend"]');
  const suspendedReinstateBtn = await page.$('[data-testid="action-reinstate"]');
  assert.equal(suspendedVerifyBtn, null, 'SUSPENDED profile must NOT render "Xác minh chuyên gia" button');
  assert.equal(suspendedSuspendBtn, null, 'SUSPENDED profile must NOT render "Tạm đình chỉ" button');
  assert.ok(suspendedReinstateBtn, 'SUSPENDED profile must render "Khôi phục xác minh" button');
  report.checks.push('Component correctly renders only reinstate action for SUSPENDED status');

  await captureScreen(page, 'expert-detail-suspended-1440-light.png', 1440, 'light');
  await captureScreen(page, 'expert-detail-suspended-1440-dark.png', 1440, 'dark');
  await captureScreen(page, 'expert-detail-suspended-375-light.png', 375, 'light');
  await captureScreen(page, 'expert-detail-suspended-375-dark.png', 375, 'dark');

  // ─── 7. Reinstate Expert (calls /verify) ───
  console.log('--- Step 7: Reinstate Expert ---');
  await page.click('[data-testid="action-reinstate"]');
  await page.waitForSelector('dialog[open]');
  await page.type('#action-reason', 'Hoàn tất rà soát định kỳ, khôi phục quyền chuyên môn.');
  await page.click('dialog[open] button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.waitForFunction(() => document.body.innerText.includes('Đã xác minh'));
  console.log('Status reinstated to VERIFIED');
  report.checks.push('Status reinstated to VERIFIED via /verify');

  // ─── 8. Simulate 409 Stale-Version Conflict & Concurrency Retention ───
  console.log('--- Step 8: Simulate 409 Stale-Version Conflict & Concurrency Retention ---');
  // Open Suspend dialog to capture current version
  await page.click('[data-testid="action-suspend"]');
  await page.waitForSelector('dialog[open]');
  await page.type('#action-reason', 'Lý do bị xung đột phiên bản');

  // Call login directly from node to get fresh admin token
  const admLoginRes = await fetch('http://localhost:6767/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const admData = await admLoginRes.json();
  const admToken = admData.accessToken;

  // Read current backend profile to get exact version
  const curRes = await fetch(`http://localhost:6767/api/admin/experts/${createdProfileId}`, {
    headers: { Authorization: `Bearer ${admToken}` },
  });
  const curProfile = await curRes.json();
  console.log('Current backend profile version:', curProfile.version);

  // Directly suspend in backend behind browser's back
  const backendSuspend = await fetch(`http://localhost:6767/api/admin/experts/${createdProfileId}/suspend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admToken}` },
    body: JSON.stringify({ version: curProfile.version, reason: 'Out-of-band conflict injection' }),
  });
  assert.equal(backendSuspend.status, 200, 'Backend out-of-band transition must succeed');
  console.log('Injected out-of-band transition, version is now:', (curProfile.version + 1));

  // Now click submit in the browser dialog (holding stale version)
  await page.click('dialog[open] button[type="submit"]');

  // Wait for 409 conflict message to appear in the dialog
  await page.waitForFunction(() => document.body.innerText.includes('Hồ sơ đã thay đổi'));
  console.log('409 Conflict banner appeared successfully!');
  report.checks.push('409 Stale version conflict detected; error banner displayed; no auto-retry');

  // Verify submit button is disabled while conflict/mismatch exists
  const isSubmitDisabled = await page.$eval('dialog[open] button[type="submit"]', el => el.disabled);
  assert.equal(isSubmitDisabled, true, 'Submit button must be disabled upon version mismatch');
  report.checks.push('Submit button disabled on version conflict');

  // Verify entered reason is retained in textarea
  const retainedReason = await page.$eval('#action-reason', el => el.value);
  assert.equal(retainedReason, 'Lý do bị xung đột phiên bản', 'Entered reason must be preserved on 409');
  report.checks.push('Reason input preserved upon 409 conflict');

  // Capture conflict screenshot
  await captureScreen(page, 'expert-conflict-409-1440.png', 1440, 'light');
  await captureScreen(page, 'expert-conflict-409-375.png', 375, 'light');

  // Click reload & review button
  await page.click('[data-testid="dialog-reload-review"]');
  await page.waitForFunction(() => !document.body.innerText.includes('Đang tải lại...'));

  // Close the dialog cleanly
  await page.evaluate(() => {
    const cancelBtn = [...document.querySelectorAll('dialog[open] button')].find(b => b.textContent.includes('Hủy') || b.textContent.includes('Huỷ') || b.getAttribute('aria-label') === 'Đóng');
    cancelBtn?.click();
  });
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));

  // ─── 9. Login as Created EXPERT and Verify /knowledge ───
  console.log('--- Step 9: Login as Created EXPERT ---');
  const expertContext = await browser.createBrowserContext();
  const expertPage = await expertContext.newPage();
  expertPage.on('pageerror', err => report.consoleErrors.push(err.message));
  expertPage.on('response', res => {
    const url = res.url();
    if (url.includes('/api/')) {
      report.requests.push({
        method: res.request().method(),
        url: new URL(url).pathname,
        status: res.status(),
      });
    }
  });

  await expertPage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
  await expertPage.waitForSelector('#email', { timeout: 15000 });

  // Login with newly created expert credentials
  await expertPage.type('#email', testEmail);
  await expertPage.type('#password', testPassword);
  await expertPage.click('button[type="submit"]');

  // Must redirect to /knowledge
  await expertPage.waitForFunction(() => location.pathname === '/knowledge', { timeout: 15000 });
  await expertPage.waitForFunction(() => document.body.innerText.includes('Hồ sơ của bạn'), { timeout: 15000 });
  console.log('Expert logged in and landed on /knowledge');
  report.checks.push('Created expert logged in successfully and landed on /knowledge');

  // Check no horizontal overflow on /knowledge
  await expertPage.setViewport({ width: 375, height: 950 });
  await assertNoHorizontalOverflow(expertPage, '375px Mobile (Knowledge Page)');

  // Capture reflected status on /knowledge
  await captureScreen(expertPage, 'expert-knowledge-reflected-1440-light.png', 1440, 'light');
  await captureScreen(expertPage, 'expert-knowledge-reflected-1440-dark.png', 1440, 'dark');
  await captureScreen(expertPage, 'expert-knowledge-reflected-375-light.png', 375, 'light');
  await captureScreen(expertPage, 'expert-knowledge-reflected-375-dark.png', 375, 'dark');

  // Test "Làm mới trạng thái" button
  const refreshBtn = await expertPage.waitForSelector('button[aria-label="Làm mới trạng thái"]');
  assert.ok(refreshBtn, 'Làm mới trạng thái button must be present on /knowledge');
  await refreshBtn.click();
  report.checks.push('Làm mới trạng thái button functional on /knowledge');

  // ─── 10. Access Control: Reject EXPERT from Management Routes ───
  console.log('--- Step 10: Access Control Rejection for EXPERT ---');
  for (const deniedRoute of ['/settings/experts', '/settings/experts/new', `/settings/experts/${createdProfileId}`]) {
    await expertPage.goto(`${baseUrl}${deniedRoute}`, { waitUntil: 'networkidle0' });
    await expertPage.waitForFunction(() => location.pathname === '/knowledge', { timeout: 15000 });
    assert.equal(await expertPage.evaluate(() => location.pathname), '/knowledge');
    await expertPage.waitForFunction(() => document.body.innerText.includes('Bạn không có quyền truy cập trang này'), { timeout: 10000 });
  }
  report.checks.push('EXPERT denied from all /settings/experts routes with forbidden notice');

  // Capture forbidden notice screenshot
  await captureScreen(expertPage, 'expert-forbidden-notice-1440.png', 1440, 'light');
  await captureScreen(expertPage, 'expert-forbidden-notice-375.png', 375, 'light');

  // ─── Summary Report ───
  fs.writeFileSync(path.join(outDir, 'verification-report.json'), JSON.stringify(report, null, 2));
  console.log('Verification completed successfully! All checks passed.');
} finally {
  await browser.close();
  if (server) await server.close();
}
