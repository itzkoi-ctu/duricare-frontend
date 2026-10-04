import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const output = new URL('../verification/alerts-phase-f/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const save = (name, value) => fs.writeFile(new URL(name, output), JSON.stringify(value, null, 2));
const file = name => new URL(name, output).pathname.replace(/^\/(\w:)/, '$1');
const server = await createServer({ server: { port: 5173, watch: { ignored: ['**/verification/**'] } } });
await server.listen();
const base = `http://localhost:${server.httpServer.address().port}`;
const isAlerts = request => new URL(request.url()).pathname === '/api/alerts' && request.method() === 'GET';
const responseForAlerts = page => page.waitForResponse(response => isAlerts(response.request()) && response.status() === 200);
const report = { screenshots: [], consoleErrors: [], checks: {} };
let browser;
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('theme', 'light');
    const original = window.setInterval;
    window.verificationTimers = [];
    window.setInterval = (callback, delay, ...args) => {
      if (delay === 60000) window.verificationTimers.push(() => callback(...args));
      return original(callback, delay, ...args);
    };
  });
  let fetchCount = 0;
  page.on('request', request => { if (isAlerts(request)) fetchCount++; });
  page.on('pageerror', error => report.consoleErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  const first = responseForAlerts(page);
  await page.goto(`${base}/alerts?nofixture=true`);
  let data = await (await first).json();
  await page.waitForSelector('[data-alert-id]');
  assert.ok(data.some(alert => alert.source === 'HARD') && data.some(alert => alert.source === 'AGENTIC'));
  await save('alerts-before.json', data);
  const renderedIds = await page.evaluate(() => [...document.querySelectorAll('[data-alert-id]')].map(el => Number(el.dataset.alertId)));
  assert.deepEqual(renderedIds, [...data].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id).map(alert => alert.id));
  report.checks.newestFirst = true;

  for (const width of [375, 1440]) {
    await page.setViewport({ width, height: width === 375 ? 2200 : 1100 });
    for (const theme of ['light', 'dark']) {
      const current = await page.evaluate(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      if (current !== theme) {
        await page.evaluate(() => [...document.querySelectorAll('button[data-theme]')].find(button => button.getBoundingClientRect().height > 0).click());
      }
      await page.waitForFunction(theme => [...document.querySelectorAll('button[data-theme]')].every(button => button.dataset.theme === theme), {}, theme);
      const next = responseForAlerts(page);
      await page.evaluate(() => [...document.querySelectorAll('main button')].find(button => button.textContent === 'Làm mới').click());
      const response = await next;
      assert.equal(response.fromCache(), false);
      data = await response.json();
      await page.waitForFunction(() => !![...document.querySelectorAll('main button')].find(button => button.textContent === 'Làm mới'));
      await page.evaluate(() => document.fonts.ready);
      await new Promise(resolve => setTimeout(resolve, 250));
      const name = `${width}px-${theme}`;
      await page.screenshot({ path: file(`${name}.png`), fullPage: true });
      await save(`${name}-alerts.json`, data);
      report.screenshots.push({ name, sources: [...new Set(data.map(alert => alert.source))], fromCache: response.fromCache() });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth), true);
    }
  }

  // Both filters operate on the loaded list without another alerts request.
  const beforeFilter = fetchCount;
  await page.select('#zone-filter', 'zoneA');
  await page.select('#source-filter', 'HARD');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-alert-id]')].every(el => el.dataset.source === 'HARD') && document.querySelectorAll('[data-alert-id]').length > 0);
  const filteredIds = await page.evaluate(() => [...document.querySelectorAll('[data-alert-id]')].map(el => Number(el.dataset.alertId)));
  assert.deepEqual(filteredIds, data.filter(alert => alert.zoneCode === 'zoneA' && alert.source === 'HARD').map(alert => alert.id));
  assert.equal(fetchCount, beforeFilter);
  assert.equal(new URL(page.url()).searchParams.get('zone'), 'zoneA');
  report.checks.clientSideFilters = true;
  await page.select('#zone-filter', '');
  await page.select('#source-filter', 'ALL');
  const timerResponse = responseForAlerts(page);
  const timers = await page.evaluate(() => { window.verificationTimers.forEach(callback => callback()); return window.verificationTimers.length; });
  await timerResponse;
  assert.ok(timers >= 2); // Overview and alerts both register their 60-second refresh.
  report.checks.sixtySecondRefresh = '60s timer registered; invoked callback and observed live GET';

  // Failed PATCH is isolated and delayed to prove removal before the response.
  const failureId = data.find(alert => alert.source === 'HARD').id;
  let releaseFailure;
  await page.setRequestInterception(true);
  const failureHandler = request => {
    if (request.method() === 'PATCH' && new URL(request.url()).pathname === `/api/alerts/${failureId}/resolve`) {
      releaseFailure = () => request.respond({ status: 500, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ message: 'Simulated failure for rollback verification' }) });
    } else if (request.isInterceptResolutionHandled() === false) void request.continue();
  };
  page.on('request', failureHandler);
  await page.click(`[data-alert-id="${failureId}"] button`);
  await page.waitForFunction(id => !document.querySelector(`[data-alert-id="${id}"]`), {}, failureId);
  const failureDeadline = Date.now() + 15000;
  while (!releaseFailure && Date.now() < failureDeadline) await new Promise(resolve => setTimeout(resolve, 50));
  assert.ok(releaseFailure, 'Browser PATCH did not reach interception; check CORS preflight');
  await releaseFailure();
  await page.waitForSelector(`[data-alert-id="${failureId}"]`);
  await page.waitForSelector('[data-resolve-error]');
  report.checks.optimisticRemovalAndFailureRollback = true;
  page.off('request', failureHandler);
  await page.setRequestInterception(false);
  await page.click('button[aria-label="Đóng thông báo lỗi"]');
  // The expected 500 console message belongs to the isolated failure check.
  report.expectedFailureConsole = report.consoleErrors.filter(message => message.includes('500'));
  report.consoleErrors = report.consoleErrors.filter(message => !message.includes('500'));

  const freshResponse = responseForAlerts(page);
  await page.goto(`${base}/alerts?zone=zoneA&nofixture=true`);
  data = await (await freshResponse).json();
  await page.waitForSelector('[data-alert-id]');
  const zoneIds = await page.evaluate(() => [...document.querySelectorAll('[data-alert-id]')].map(el => Number(el.dataset.alertId)));
  assert.deepEqual(zoneIds, data.filter(alert => alert.zoneCode === 'zoneA').map(alert => alert.id));
  report.checks.zoneQueryOnMount = true;
  const target = data.filter(alert => alert.zoneCode === 'zoneA' && alert.source === 'HARD' && alert.severity === 'INFO').sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0];
  assert.ok(target, 'A real INFO alert is required for the authorized resolve check');
  await page.setViewport({ width: 375, height: 1800 });
  await page.waitForNetworkIdle();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file('resolve-before.png'), fullPage: true });
  const patch = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === `/api/alerts/${target.id}/resolve`);
  await page.click(`[data-alert-id="${target.id}"] button`);
  await page.waitForFunction(id => !document.querySelector(`[data-alert-id="${id}"]`), {}, target.id);
  const result = await patch;
  assert.equal(result.status(), 200);
  const resolved = await result.json();
  assert.equal(resolved.resolved, true);
  await page.waitForFunction(id => document.querySelector('main').textContent.includes(`Đã xử lý cảnh báo #${id}`), {}, target.id);
  await page.waitForNetworkIdle();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file('resolve-after.png'), fullPage: true });
  const afterResponse = responseForAlerts(page);
  await page.evaluate(() => [...document.querySelectorAll('main button')].find(button => button.textContent === 'Làm mới').click());
  const after = await (await afterResponse).json();
  assert.ok(!after.some(alert => alert.id === target.id));
  await save('resolve-response.json', resolved);
  await save('alerts-after.json', after);
  report.checks.liveResolve = { id: target.id, zoneCode: target.zoneCode, status: result.status(), resolved: true, before: data.length, after: after.length };

  // Distinct empty and failure/loading states without touching backend data.
  for (const state of ['loading', 'error', 'empty', 'filtered-empty']) {
    const test = await browser.newPage();
    await test.setViewport({ width: 375, height: 900 });
    await test.setRequestInterception(true);
    test.on('request', request => {
      if (isAlerts(request)) {
        if (state === 'loading') return;
        return request.respond({ status: state === 'error' ? 500 : 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(state === 'empty' ? [] : after) });
      }
      void request.continue();
    });
    await test.goto(`${base}/alerts?nofixture=true${state === 'filtered-empty' ? '&zone=UNKNOWN' : ''}`, { waitUntil: 'domcontentloaded' });
    const text = { loading: 'Đang tải cảnh báo', error: 'Không thể tải dữ liệu', empty: 'Chưa có cảnh báo nào', 'filtered-empty': 'Không có cảnh báo khớp bộ lọc' }[state];
    await test.waitForFunction(text => document.querySelector('main')?.textContent.includes(text), {}, text);
    if (state === 'error') assert.ok(await test.evaluate(() => [...document.querySelectorAll('main button')].some(button => button.textContent === 'Thử lại')));
    report.checks[state] = true;
    await test.close();
  }
  assert.equal(report.consoleErrors.length, 0, report.consoleErrors.join('\n'));
  await save('verification.json', report);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
