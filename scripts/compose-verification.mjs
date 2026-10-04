import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';

const output = new URL('../verification/dashboard-fixes/', import.meta.url);
const png = async name => `data:image/png;base64,${(await fs.readFile(new URL(name, output))).toString('base64')}`;
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 750, height: 900 });
  const statuses = ['NORMAL', 'LOW', 'HIGH', 'SENSOR_ERROR', 'NO_SIGNAL'];
  const rows = await Promise.all(statuses.map(async status => `<h2>${status}</h2><div class="row"><img src="${await png(`375px-light-status-${status}.png`)}"><img src="${await png(`375px-dark-status-${status}.png`)}"></div>`));
  await page.setContent(`<style>body{margin:16px;background:#e2e8f0;font:14px system-ui}h1{font-size:20px}h2{font-size:14px;margin:16px 0 6px}.row{display:flex;gap:16px}.row img{width:343px;height:auto;align-self:start}</style><h1>375px status audit — light / dark</h1><p>Isolated test responses; labels rendered by the existing ZoneCard.</p>${rows.join('')}`);
  await page.screenshot({ path: new URL('all-status-labels.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  const reference = `data:image/png;base64,${(await fs.readFile(new URL('../stitch_reference/screen_screenshot.png', import.meta.url))).toString('base64')}`;
  await page.setViewport({ width: 950, height: 1000 });
  await page.setContent(`<style>body{margin:20px;background:#e2e8f0;font:14px system-ui}main{display:flex;gap:24px}h1{font-size:20px}.reference{width:430px}.current{width:430px}.current img{width:343px}img{height:auto}</style><h1>Saved Stitch reference / current sensor-health card</h1><p>The saved reference uses a different KPI layout. Current card follows the requested four-pill breakdown.</p><main><div><h2>Saved approved reference</h2><img class="reference" src="${reference}"></div><div class="current"><h2>Current implementation — live data</h2><img src="${await png('375px-light-health-card.png')}"><h2>Dark mode</h2><img src="${await png('375px-dark-health-card.png')}"></div></main>`);
  await page.screenshot({ path: new URL('stitch-comparison.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
} finally {
  await browser.close();
}
