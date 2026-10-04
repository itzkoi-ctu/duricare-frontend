import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';

// Read-only recapture: before uses the recorded live response; after uses live GET.
// Original button-click screenshots and PATCH response remain in the same folder.
const output = new URL('../verification/alerts-phase-f/', import.meta.url);
const file = name => new URL(name, output).pathname.replace(/^\/(\w:)/, '$1');
const before = await fs.readFile(new URL('alerts-before.json', output), 'utf8');
const server = await createServer({ server: { port: 5173, watch: { ignored: ['**/verification/**'] } } });
await server.listen();
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 1800 });
  await page.evaluateOnNewDocument(() => localStorage.setItem('theme', 'light'));
  await page.setRequestInterception(true);
  const handler = request => {
    if (new URL(request.url()).pathname === '/api/alerts' && request.method() === 'GET') {
      void request.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: before });
    } else void request.continue();
  };
  page.on('request', handler);
  await page.goto(`http://localhost:${server.httpServer.address().port}/alerts?zone=zoneA&nofixture=true`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-alert-id="16"]');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file('resolve-before-fonts-ready.png'), fullPage: true });
  page.off('request', handler);
  await page.setRequestInterception(false);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-alert-id]');
  await page.waitForFunction(() => !document.querySelector('[data-alert-id="16"]'));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file('resolve-after-fonts-ready.png'), fullPage: true });
} finally {
  await browser.close();
  await server.close();
}
