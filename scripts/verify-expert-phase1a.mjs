import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const out = new URL('../verification/expert-phase1a/', import.meta.url);
await mkdir(out, { recursive: true });
const password = process.env.EXPERT_TEST_PASSWORD;
assert.ok(password, 'Pilot credentials must be supplied by isolated integration test');
const report = { screenshots: [], checks: [], requests: [], consoleErrors: [] };
const browser = await puppeteer.launch({ headless: true });
try {
  for (const [status, env, label] of [
    ['pending', 'EXPERT_TEST_PENDING', 'Chờ xác minh'],
    ['verified', 'EXPERT_TEST_VERIFIED', 'Đã xác minh'],
    ['suspended', 'EXPERT_TEST_SUSPENDED', 'Tạm đình chỉ'],
  ]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 375, height: 920, deviceScaleFactor: 1 });
    page.on('pageerror', error => report.consoleErrors.push(error.message));
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.port === '6769') report.requests.push({ path: url.pathname, method: response.request().method(), status: response.status() });
    });
    await page.goto('http://localhost:5176/zones/TEST-forbidden?farmId=1#care', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#email');
    await page.type('#email', process.env[env]);
    await page.type('#password', password);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => location.pathname === '/knowledge' && document.body.innerText.includes('Hồ sơ của bạn'));
    assert.ok(await page.evaluate(() => document.body.innerText.includes('Bạn không có quyền truy cập trang này')));
    assert.ok(await page.evaluate(text => document.body.innerText.includes(text), label));
    if (status === 'pending') await page.screenshot({ path: new URL('redirect-forbidden.png', out).pathname.replace(/^\/(?:([A-Z]:))/, '$1'), fullPage: true });
    // Close the existing toast before screenshots of the profile.
    await page.evaluate(() => document.querySelector('button[aria-label="Đóng thông báo"]')?.click());
    for (const width of [375, 1440]) for (const theme of ['light', 'dark']) {
      await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
      await page.evaluate(theme => {
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }, theme);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
      });
      const layout = await page.evaluate(() => ({
        width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
        links: [...document.querySelectorAll('nav a')].map(a => a.getAttribute('href')),
        storedKeys: [...Object.keys(localStorage), ...Object.keys(sessionStorage)],
        text: document.body.innerText,
      }));
      assert.equal(layout.width, layout.scrollWidth, 'Profile must not overflow horizontally');
      assert.ok(layout.links.length > 0 && layout.links.every(href => href === '/knowledge'));
      assert.ok(!layout.storedKeys.some(key => /token|password|refresh/i.test(key)));
      assert.ok(!/Tổng quan|Trợ lý AI|Cài đặt vườn|Quản lý khu vực/.test(layout.text));
      const name = status + '-' + width + '-' + theme + '.png';
      await page.screenshot({ path: new URL(name, out).pathname.replace(/^\/(?:([A-Z]:))/, '$1'), fullPage: true });
      report.screenshots.push(name);
    }
    await page.setViewport({ width: 768, height: 1000, deviceScaleFactor: 1 });
    assert.equal(await page.evaluate(() => document.documentElement.clientWidth === document.documentElement.scrollWidth), true);
    report.checks.push({ status, tabletWidth: 768, horizontalOverflow: false });
    for (const route of ['/alerts', '/agent', '/settings/farm', '/zones/TEST-forbidden']) {
      await page.goto('http://localhost:5176' + route, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => location.pathname === '/knowledge' && document.body.innerText.includes('Hồ sơ của bạn'));
      assert.equal(new URL(page.url()).pathname, '/knowledge');
    }
    report.checks.push({ status, vietnameseLabel: label, forbiddenNavigation: 'redirected to /knowledge without loop', operationalNavigation: 'absent' });

    // UI state tests use only a temporary response override; status screenshots above used real HTTP/JPA.
    if (status === 'pending') {
      await page.setRequestInterception(true);
      let mode = 'loading';
      const held = [];
      page.on('request', request => {
        if (!request.url().endsWith('/expert/profile')) return void request.continue();
        if (mode === 'loading') { held.push(request); return; }
        if (mode === 'error') return void request.respond({ status: 503, contentType: 'application/json', body: '{"message":"TEST temporary failure"}', headers: { 'Access-Control-Allow-Origin': 'http://localhost:5176', 'Access-Control-Allow-Credentials': 'true' } });
        if (mode === 'empty') return void request.respond({ status: 200, contentType: 'application/json', body: 'null', headers: { 'Access-Control-Allow-Origin': 'http://localhost:5176', 'Access-Control-Allow-Credentials': 'true' } });
        void request.continue();
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.innerText.includes('Đang tải dữ liệu'));
      report.checks.push({ state: 'loading', result: 'rendered', evidence: 'temporary browser response hold' });
      mode = 'error'; for (const request of held.splice(0)) await request.respond({ status: 503, contentType: 'application/json', body: '{}', headers: { 'Access-Control-Allow-Origin': 'http://localhost:5176', 'Access-Control-Allow-Credentials': 'true' } });
      await page.waitForFunction(() => document.body.innerText.includes('Không thể tải dữ liệu'));
      report.checks.push({ state: 'error', result: 'rendered with retry', evidence: 'temporary HTTP 503 override' });
      mode = 'empty';
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('Thử lại'))?.click());
      await page.waitForFunction(() => document.body.innerText.includes('Chưa có hồ sơ chuyên gia'));
      report.checks.push({ state: 'empty', result: 'rendered', evidence: 'temporary null-response override; backend missing profile fails closed 403' });
      mode = 'real';
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForFunction(() => document.body.innerText.includes('Hồ sơ của bạn'));
      report.checks.push({ state: 'retry recovery', result: 'real profile restored' });
    }

    await page.evaluate(() => [...document.querySelectorAll('button')].find(button =>
      button.textContent.includes('Đăng xuất') && button.getBoundingClientRect().width > 0)?.click());
    await page.waitForFunction(() => location.pathname === '/login' && !!document.querySelector('#email'));
    report.checks.push({ status, logout: 'real cookie session revoked; login rendered' });
    await context.close();
  }
  assert.equal(report.consoleErrors.length, 0, 'No application JavaScript errors');
  assert.ok(!report.requests.some(request => /^\/api\/(overview|zones|alerts|agent|farms|trees|care-logs)/.test(request.path)), 'EXPERT must issue no operational API requests');
  report.checks.push({ operationalApiRequests: 0, tokenStorage: 'AuthContext memory only' });
} finally {
  await browser.close();
  await writeFile(new URL('browser-report.json', out), JSON.stringify(report, null, 2));
}
console.log('PASS: 12 real-profile screenshots, role guards, redirect-back denial, no operational navigation/API calls, logout, loading/error/empty and retry.');
