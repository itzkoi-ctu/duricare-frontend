import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '..', 'verification');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function run() {
  console.log('Starting Vite server...');
  const server = await createServer({
    configFile: path.resolve(__dirname, '..', 'vite.config.ts'),
    server: { port: 5188 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 5188;
  const url = `http://localhost:${port}/?fixture=true`;
  console.log(`Vite server listening at ${url}`);

  let browser;
  try {
    console.log('Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // 1. Mobile 375px Light (device viewport view)
    console.log('Capturing 375px Mobile Light...');
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main');
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(outputDir, '375px-mobile-light.png'),
      fullPage: false,
    });
    await page.screenshot({
      path: path.join(outputDir, '375px-mobile-light-full.png'),
      fullPage: true,
    });

    // 2. Mobile 375px Dark (device viewport view)
    console.log('Capturing 375px Mobile Dark...');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(outputDir, '375px-mobile-dark.png'),
      fullPage: false,
    });
    await page.screenshot({
      path: path.join(outputDir, '375px-mobile-dark-full.png'),
      fullPage: true,
    });

    // 3. Desktop 1440px Light
    console.log('Capturing 1440px Desktop Light...');
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(outputDir, '1440px-desktop-light.png'),
      fullPage: true,
    });

    // 4. Desktop 1440px Dark
    console.log('Capturing 1440px Desktop Dark...');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(outputDir, '1440px-desktop-dark.png'),
      fullPage: true,
    });

    console.log('All screenshots captured successfully in verification/');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
    throw err;
  } finally {
    if (browser) await browser.close();
    await server.close();
    console.log('Server and browser closed.');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
