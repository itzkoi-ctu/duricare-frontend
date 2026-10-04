import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import ts from 'typescript';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const out = new URL('../verification/i18n/', import.meta.url);
await fs.mkdir(out, { recursive: true });
const fixtureSource = await fs.readFile(new URL('../src/fixtures/overviewFixture.ts', import.meta.url), 'utf8');
const fixtureJs = ts.transpileModule(fixtureSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { mockOverviewData: overview } = await import(`data:text/javascript;base64,${Buffer.from(fixtureJs).toString('base64')}`);
const server = await createServer({ server: { port: 5184, watch: { ignored: ['**/verification/**'] } } });
await server.listen();
const base = `http://localhost:${server.httpServer.address().port}`;
let browser;
const report = { checks: [], pageErrors: [] };
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1050 });
  let signedIn = false;
  let failResolve = false;
  const user = { email: 'language-test@example.invalid', role: 'OWNER', farmId: 1 };
  const now = new Date().toISOString();
  const alerts = [{ id: 1, source: 'HARD', zoneCode: 'ZONE-01', type: 'HIGH', severity: 'WARNING', message: 'Nội dung cảnh báo gốc', createdAt: now, resolved: false }];
  page.on('pageerror', error => report.pageErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) return request.continue();
    const headers = { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type,authorization,x-xsrf-token', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS' };
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
    let body, status = 200;
    const endpoint = url.pathname.slice(4);
    if (endpoint === '/auth/csrf') body = { token: 'test-csrf' };
    else if (endpoint === '/auth/refresh') { body = { accessToken: 'test-token' }; if (!signedIn) status = 401; }
    else if (endpoint === '/auth/me') body = user;
    else if (endpoint === '/auth/login') { signedIn = true; body = { accessToken: 'test-token', user }; }
    else if (endpoint === '/overview') body = overview;
    else if (endpoint === '/alerts') body = alerts;
    else if (endpoint.startsWith('/alerts/')) { body = {}; if (failResolve) status = 500; }
    else if (endpoint === '/zones') body = [{ id: 1, farmId: 1, code: 'ZONE-01', name: 'Khu A', growthStage: 'RA_HOA', area: 100, soilType: 'Đất phù sa', representativeTreeId: null }];
    else if (endpoint.endsWith('/readings')) body = [{ id: 1, value: 30, recordAt: now, sensorId: 1 }, { id: 2, value: 31, recordAt: new Date(Date.now() - 3600000).toISOString(), sensorId: 1 }];
    else if (endpoint.endsWith('/latest')) body = { id: 1, value: 30, recordAt: now, sensorId: 1 };
    else if (endpoint === '/care-logs') body = [{ id: 1, zoneCode: 'ZONE-01', actionType: 'WATERING', note: 'Ghi chú gốc', performedAt: now, performBy: 'Nguyễn Văn A' }];
    else if (endpoint === '/agent/ask') body = { answer: 'Phản hồi gốc từ AI', modelUsed: 'test' };
    else { body = {}; status = 404; }
    await request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const hasText = text => page.waitForFunction(text => document.body.innerText.includes(text), {}, text);
  const chooseLanguage = async lang => {
    await page.evaluate(lang => {
      const select = [...document.querySelectorAll('select')].find(el => el.querySelector('option[value="vi"]') && el.getBoundingClientRect().height > 0);
      select.value = lang;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, lang);
    await page.waitForFunction(lang => document.documentElement.lang === lang, {}, lang);
  };
  const checkNoOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && (!document.querySelector('main') || document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth)), true);
  await page.goto(`${base}/login`);
  await hasText('Đăng nhập');
  await chooseLanguage('en');
  await hasText('Care for trees at the right time.');
  await page.click('button[type="submit"]');
  await hasText('Please enter your email.');
  await chooseLanguage('vi');
  await hasText('Vui lòng nhập email.');
  await chooseLanguage('en');
  await page.type('#email', user.email);
  await page.type('#password', 'test-password');
  await page.click('button[type="submit"]');
  await hasText('Farm overview');
  await hasText('Flowering');
  await hasText('Sensor error');
  await hasText('Partly cloudy');
  await hasText(overview.farmName);
  await hasText(overview.latestInsight.message);
  report.checks.push('Login, validation, shared sensor/weather/growth labels, original content preserved');
  await page.reload();
  await hasText('Farm overview');
  assert.equal(await page.evaluate(() => localStorage.getItem('duricare-language')), 'en');
  report.checks.push('Preference persists after reload; session remains active');
  for (const width of [1440, 375]) {
    await page.setViewport({ width, height: 1050 });
    for (const language of ['en', 'vi']) {
      await chooseLanguage(language);
      await hasText(language === 'en' ? 'Farm overview' : 'Tổng quan nông trại');
      await checkNoOverflow();
      const file = new URL(`dashboard-${width}-${language}.png`, out).pathname.replace(/^\/(\w:)/, '$1');
      await page.screenshot({ path: file });
    }
  }
  report.checks.push('Desktop/mobile switching, synchronized controls, no horizontal overflow');
  await page.setViewport({ width: 1440, height: 1050 });
  await page.goto(`${base}/alerts`);
  await hasText('Nội dung cảnh báo gốc');
  await page.select('#zone-filter', 'ZONE-01');
  await page.select('#source-filter', 'HARD');
  await chooseLanguage('en');
  await hasText('Rule-based alert');
  assert.equal(await page.$eval('#zone-filter', el => el.value), 'ZONE-01');
  assert.equal(await page.$eval('#source-filter', el => el.value), 'HARD');
  failResolve = true;
  await page.click('[data-alert-id] button');
  await hasText('Could not resolve alert #1.');
  await chooseLanguage('vi');
  await hasText('Không thể xử lý cảnh báo #1.');
  report.checks.push('Alert filters and original messages preserved; resolution errors switch immediately');
  await page.goto(`${base}/zones/ZONE-01`);
  await hasText('Biểu đồ cảm biến');
  await chooseLanguage('en');
  await hasText('Sensor charts');
  await hasText('Flowering');
  await page.evaluate(() => [...document.querySelectorAll('main button')].find(el => el.textContent.includes('Care logs')).click());
  await hasText('Watering');
  await hasText('Ghi chú gốc');
  report.checks.push('Zone charts and care action labels translate; care notes preserved');
  await page.goto(`${base}/agent`);
  await hasText('What is the current soil moisture');
  await page.type('main input', 'Keep this draft');
  await chooseLanguage('vi');
  assert.equal(await page.$eval('main input', el => el.value), 'Keep this draft');
  await hasText('Xin chào!');
  await page.click('main button[type="submit"]');
  await hasText('Phản hồi gốc từ AI');
  await chooseLanguage('en');
  await hasText('Hello!');
  await hasText('Keep this draft');
  await hasText('Phản hồi gốc từ AI');
  report.checks.push('AI welcome/suggestions translate; draft and conversation survive switching');
  await page.goto(`${base}/missing-page`);
  await hasText('Page not found');
  assert.deepEqual(report.pageErrors, []);
  report.checks.push('Not-found route translated; no browser runtime errors');
  await fs.writeFile(new URL('report.json', out), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
