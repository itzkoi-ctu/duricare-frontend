import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const output = new URL('../verification/dashboard-fixes/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const save = (name, value) => fs.writeFile(new URL(name, output), JSON.stringify(value, null, 2));
const server = await createServer({ server: { port: 5173, watch: { ignored: ['**/verification/**'] } } });
await server.listen();
const url = `http://localhost:${server.httpServer.address().port}/?nofixture=true`;
let browser;
const report = { captures: [], themeChecks: [], consoleErrors: [], states: {} };
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  page.on('pageerror', error => report.consoleErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  // A persisted light choice must override even a dark OS preference.
  await page.evaluateOnNewDocument(() => {
    if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'light');
  });
  const overviewResponse = () => page.waitForResponse(r => new URL(r.url()).pathname === '/api/overview' && r.request().method() === 'GET' && r.status() === 200);
  const screenshotElement = async (target, selector, name) => {
    const clip = await target.evaluate(selector => {
      const element = document.querySelector(selector);
      element.scrollIntoView({ block: 'center' });
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }, selector);
    await target.screenshot({ path: new URL(name, output).pathname.replace(/^\/(\w:)/, '$1'), clip });
  };
  const initial = overviewResponse();
  await page.goto(url);
  await initial;
  await page.waitForSelector('[data-zone]');

  async function themeState() {
    return page.evaluate(() => ({
      dark: document.documentElement.classList.contains('dark'),
      stored: localStorage.getItem('theme'),
      controls: [...document.querySelectorAll('button[data-theme]')].map(button => ({
        theme: button.dataset.theme,
        path: button.querySelector('path').getAttribute('d'),
      })),
    }));
  }
  async function setTheme(theme) {
    if ((await themeState()).stored !== theme) {
      const buttons = await page.$$('button[data-theme]');
      for (const button of buttons) {
        if (await button.isVisible()) { await button.click(); break; }
      }
    }
    await page.waitForFunction(expected => [...document.querySelectorAll('button[data-theme]')].every(b => b.dataset.theme === expected), {}, theme);
    const state = await themeState();
    assert.equal(state.dark, theme === 'dark');
    assert.equal(state.stored, theme);
    for (const control of state.controls) assert.equal(control.path.startsWith('M20.354'), theme === 'dark');
    report.themeChecks.push(state);
  }

  for (const width of [375, 1440]) {
    await page.setViewport({ width, height: width === 375 ? 900 : 1100, deviceScaleFactor: 1 });
    for (const theme of ['light', 'dark']) {
      await setTheme(theme);
      await page.evaluate(() => { document.querySelector('main').scrollTop = 0; window.scrollTo(0, 0); });
      const responsePromise = overviewResponse();
      await page.click('button[aria-label="Làm mới dữ liệu"]');
      const response = await responsePromise;
      assert.equal(response.fromCache(), false);
      const data = await response.json();
      await page.waitForFunction(() => !document.querySelector('button[aria-label="Làm mới dữ liệu"]').disabled);
      const name = `${width}px-${theme}`;
      await save(`${name}-overview.json`, data);
      const counts = { normal: 0, error: 0, warning: 0, noSignal: 0 };
      for (const zone of data.zones) {
        const cardText = await page.evaluate(code => document.querySelector(`[data-zone="${code}"]`)?.textContent, zone.code);
        assert.ok(cardText, zone.code);
        assert.ok(cardText.includes(zone.name));
        for (const [key, metric] of Object.entries(zone.metrics)) {
          const expected = metric.status === 'NO_SIGNAL' || metric.value == null ? '--' : `${Number.isInteger(metric.value) ? metric.value : metric.value.toFixed(1)}${metric.unit}`;
          const text = await page.evaluate((code, key) => document.querySelector(`[data-zone="${code}"] [data-metric="${key}"]`).textContent, zone.code, key);
          assert.ok(text.includes(expected), `${zone.code} ${key}: ${expected}`);
          counts[metric.status === 'NORMAL' ? 'normal' : metric.status === 'SENSOR_ERROR' ? 'error' : metric.status === 'NO_SIGNAL' ? 'noSignal' : 'warning']++;
        }
      }
      const health = await page.$eval('section[aria-label="Tình trạng cảm biến"]', el => el.textContent);
      for (const text of [`${counts.normal} bình thường`, `${counts.error} lỗi`, `${counts.warning} cần chú ý`, `${counts.noSignal} mất tín hiệu`]) assert.ok(health.includes(text));
      assert.ok(!health.includes('%') && !health.includes('đạt chuẩn'));
      await page.evaluate(() => document.fonts.ready);
      await new Promise(resolve => setTimeout(resolve, 300));
      await page.screenshot({ path: new URL(`${name}.png`, output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: width === 1440 });
      if (width === 375) {
        await page.$eval('[data-zone]', el => el.scrollIntoView({ block: 'start' }));
        await page.screenshot({ path: new URL(`${name}-zones.png`, output).pathname.replace(/^\/(\w:)/, '$1') });
        await screenshotElement(page, '[data-zone="ZONE-02"]', `${name}-zone-card.png`);
        await page.$eval('section[aria-label="Tình trạng cảm biến"]', el => el.scrollIntoView({ block: 'center' }));
        await page.screenshot({ path: new URL(`${name}-health.png`, output).pathname.replace(/^\/(\w:)/, '$1') });
        await screenshotElement(page, 'section[aria-label="Tình trạng cảm biến"]', `${name}-health-card.png`);
        const geometry = await page.evaluate(() => {
          const header = [...document.querySelectorAll('header')].find(el => el.getBoundingClientRect().height > 0).getBoundingClientRect();
          const main = document.querySelector('main').getBoundingClientRect();
          return { headerBottom: header.bottom, scrollViewportTop: main.top, scrollTop: document.querySelector('main').scrollTop };
        });
        assert.ok(geometry.scrollViewportTop >= geometry.headerBottom);
        report.captures.push({ name, generatedAt: data.generatedAt, counts, geometry, zoneMetricsMatch: true });
      } else report.captures.push({ name, generatedAt: data.generatedAt, counts, zoneMetricsMatch: true });
    }
  }
  // Resize with dark active, then switch using the other responsive control.
  await page.setViewport({ width: 375, height: 900 });
  await setTheme('light');
  await page.reload({ waitUntil: 'networkidle0' });
  await setTheme('light');
  await save('verification.json', report);

  // Render every actual dictionary label through ZoneCard using isolated test responses.
  const audit = await browser.newPage();
  await audit.setViewport({ width: 375, height: 900 });
  await audit.setCacheEnabled(false);
  const latest = JSON.parse(await fs.readFile(new URL('375px-dark-overview.json', output), 'utf8'));
  let status = 'NORMAL';
  await audit.setRequestInterception(true);
  audit.on('request', request => {
    if (new URL(request.url()).pathname === '/api/overview' && request.method() === 'GET') {
      const data = structuredClone(latest);
      data.zones = [data.zones.find(zone => zone.code === 'ZONE-02')];
      for (const metric of Object.values(data.zones[0].metrics)) metric.status = status;
      return request.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) });
    }
    return request.continue();
  });
  report.statusLabels = [];
  for (const theme of ['light', 'dark']) {
    for (status of ['NORMAL', 'LOW', 'HIGH', 'SENSOR_ERROR', 'NO_SIGNAL']) {
      await audit.goto(url, { waitUntil: 'networkidle0' });
      await audit.evaluate(theme => { localStorage.setItem('theme', theme); document.documentElement.classList.toggle('dark', theme === 'dark'); }, theme);
      await audit.waitForSelector('[data-status]');
      await audit.$eval('[data-zone]', el => el.scrollIntoView({ block: 'center' }));
      await audit.evaluate(() => document.fonts.ready);
      const labels = await audit.evaluate(() => [...document.querySelectorAll('[data-status]')].map(badge => {
        const rect = badge.getBoundingClientRect();
        const parent = badge.parentElement.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(badge);
        const text = range.getBoundingClientRect();
        return { label: badge.textContent, width: rect.width, textWidth: text.width, fits: text.left >= rect.left && text.right <= rect.right && rect.left >= parent.left && rect.right <= parent.right, withinViewport: rect.left >= 0 && rect.right <= innerWidth, ellipsis: getComputedStyle(badge).textOverflow };
      }));
      for (const label of labels) assert.ok(label.fits && label.withinViewport && label.ellipsis !== 'ellipsis', JSON.stringify(label));
      const links = await audit.$$eval('[data-zone] a[href*="/alerts"]', els => els.length);
      assert.equal(links, 1);
      const badge = await audit.$eval('[data-zone] span[aria-label$="cảnh báo"]', el => ({ text: el.textContent.trim(), interactive: !!el.closest('a, button') }));
      assert.match(badge.text, /^\d+$/);
      assert.equal(badge.interactive, false);
      report.statusLabels.push({ theme, status, labels });
      await screenshotElement(audit, '[data-zone]', `375px-${theme}-status-${status}.png`);
    }
  }
  await audit.close();

  // Isolated response interception checks only UI states, never the live captures above.
  for (const state of ['loading', 'error', 'empty']) {
    const test = await browser.newPage();
    await test.setViewport({ width: 375, height: 900 });
    await test.setRequestInterception(true);
    test.on('request', request => {
      if (new URL(request.url()).pathname === '/api/overview' && request.method() === 'GET') {
        if (state === 'loading') return;
        if (state === 'error') return request.abort();
        return request.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ farmName: 'Empty-state test', generatedAt: new Date().toISOString(), totalUnresolvedAlerts: 0, zones: [], latestInsight: null }) });
      }
      return request.continue();
    });
    await test.goto(url, { waitUntil: 'domcontentloaded' });
    await test.waitForFunction(expected => expected === 'loading' ? !!document.querySelector('main .animate-pulse') : document.querySelector('main')?.textContent.includes(expected === 'error' ? 'Không thể tải dữ liệu' : 'Chưa có vùng canh tác'), {}, state);
    report.states[state] = 'passed';
    await test.close();
  }
  await save('verification.json', report);
  assert.equal(report.consoleErrors.length, 0, report.consoleErrors.join('\n'));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
