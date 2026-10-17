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
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1 });

  // Set English language preference in localStorage before navigating
  await page.goto(baseUrl + '/login', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.setItem('duricare-language', 'en');
  });
  await page.reload({ waitUntil: 'networkidle2' });

  console.log('1. Logging in as ADMIN...');
  await page.waitForSelector('#email');
  await page.type('#email', adminEmail);
  await page.type('#password', adminPassword);
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log('Logged in successfully. Navigating to /settings/experts/new...');

  await page.goto(baseUrl + '/settings/experts/new', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#expert-email');

  // Verify page is in English
  const headingText = await page.$eval('h1', el => el.textContent?.trim());
  console.log('Heading text:', headingText);

  console.log('2. Triggering validation errors in English...');
  // Type invalid email format similar to user's test: 'ẽ;lámc'
  await page.type('#expert-email', 'ẽ;lámc');
  // Type short password: '123'
  await page.type('#expert-password', '123');

  // Submit the form to trigger all validations
  await page.click('button[type="submit"]');

  // Wait for error messages to appear
  await page.waitForSelector('#expert-email-error');
  await page.waitForSelector('#expert-password-error');
  await page.waitForSelector('#expert-fullname-error');
  await page.waitForSelector('#expert-specialties-error');

  const emailError = await page.$eval('#expert-email-error', el => el.textContent?.trim());
  const passwordError = await page.$eval('#expert-password-error', el => el.textContent?.trim());
  const fullnameError = await page.$eval('#expert-fullname-error', el => el.textContent?.trim());
  const specialtiesError = await page.$eval('#expert-specialties-error', el => el.textContent?.trim());

  console.log('Email Error:', emailError);
  console.log('Password Error:', passwordError);
  console.log('Full Name Error:', fullnameError);
  console.log('Specialties Error:', specialtiesError);

  assert.strictEqual(emailError, 'Invalid email format.', 'Email error should be in English');
  assert.strictEqual(passwordError, 'Password must be at least 12 characters.', 'Password error should be in English');
  assert.strictEqual(fullnameError, 'Please enter full name.', 'Full name error should be in English');
  assert.strictEqual(specialtiesError, 'Please enter expert specialties.', 'Specialties error should be in English');

  // Capture screenshot of the English validation state
  const screenshotPath = path.join(outDir, '08-expert-create-en-validation-fixed.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);

  console.log('3. Testing empty email validation error...');
  // Select all and delete to clear completely
  await page.click('#expert-email');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 200));

  const emptyEmailError = await page.$eval('#expert-email-error', el => el.textContent?.trim());
  console.log('Empty Email Error:', emptyEmailError);
  assert.strictEqual(emptyEmailError, 'Please enter your email.', 'Empty email error should be in English');

  console.log('ALL ENGLISH VALIDATION CHECKS PASSED!');
} finally {
  await browser.close();
  if (server) await server.close();
}
