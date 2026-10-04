import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Smoke check against the running backend; no credentials, mocks, or application data writes.
let server;
const existing = await fetch('http://localhost:5173').catch(() => null);
if (!existing?.ok || !(await existing.text()).includes('<title>DuriCare</title>')) {
  const { createServer } = await import('vite');
  server = await createServer({ server: { port: 5173, strictPort: true, watch: { ignored: ['**/verification/**'] } } });
  await server.listen();
}
let browser;
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const responses = [];
  const failures = [];
  const pageErrors = [];
  page.on('response', response => {
    if (new URL(response.url()).pathname.startsWith('/api/auth/')) responses.push({ url: response.url(), status: response.status() });
  });
  page.on('requestfailed', request => {
    if (new URL(request.url()).pathname.startsWith('/api/')) failures.push({ url: request.url(), error: request.failure()?.errorText });
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('http://localhost:5173/login');
  await page.waitForSelector('#email', { timeout: 25000 });
  assert.ok(responses.some(response => response.url === 'http://localhost:8386/api/auth/csrf' && response.status === 200));
  assert.ok(responses.some(response => response.url === 'http://localhost:8386/api/auth/refresh' && response.status === 401));
  assert.deepEqual(failures, []);
  assert.deepEqual(pageErrors, []);
  const select = await page.$('select');
  assert.ok(select);
  await page.select('select', 'en');
  await page.waitForFunction(() => document.documentElement.lang === 'en' && document.querySelector('#login-heading')?.textContent === 'Sign in');
  const report = { backend: 'http://localhost:8386/api', responses, failures, pageErrors, loginRendered: true, languageSwitchWorks: true };
  await fs.writeFile(new URL('report.json', import.meta.url), JSON.stringify(report, null, 2));
  await page.screenshot({ path: new URL('login-connected.png', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await server?.close();
}
