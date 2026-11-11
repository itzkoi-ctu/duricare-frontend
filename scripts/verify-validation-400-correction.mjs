import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORK = path.resolve(__dirname, '..');
const require = createRequire(path.join(WORK, 'package.json'));
const puppeteer = (await import(pathToFileURL(require.resolve('puppeteer')).href)).default;

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const SOURCE = '00000000-0000-4000-8000-000000000003';

const caps = {
  enabled: true,
  formats: [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  ocr: false,
  maxFiles: 1,
  limits: {
    fileBytes: 5242880,
    requestBytes: 6291456,
    confirmBytes: 2097152,
    extractedUtf16Units: 120000,
    pages: 100,
    chunks: 20,
    chunkUtf16Units: 8000,
    previewTtlSeconds: 1800,
  },
};

const sha = t => crypto.createHash('sha256').update(t).digest('hex');

function preview(id, name, text = 'TEST synthetic content.') {
  return {
    id,
    version: 0,
    state: 'READY',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1800000).toISOString(),
    purgeAfter: new Date(Date.now() + 30 * 86400000 + 1800000).toISOString(),
    file: {
      displayName: name,
      mediaType: 'text/plain',
      bytes: Buffer.byteLength(text),
      sha256: sha(text),
    },
    extraction: {
      parser: 'JDK-UTF8',
      parserVersion: '17 / DURI-IMPORT-TEXT-1',
      normalization: 'DURI-IMPORT-TEXT-1',
      text,
      textSha256: sha(text),
      segments: [
        {
          id: 0,
          start: 0,
          end: text.length,
          locator: {
            kind: 'LINES',
            display: 'lines1-1',
            lineStart: 1,
            lineEnd: 1,
            pageStart: null,
            pageEnd: null,
            paragraph: null,
            table: null,
            row: null,
            cell: null,
            heading: null,
          },
        },
      ],
      warnings: ['EXTRACTION_NOT_EXPERT_REVIEW'],
      counters: {
        utf16Units: text.length,
        utf8Bytes: Buffer.byteLength(text),
        segments: 1,
        pages: null,
        paragraphs: 0,
        tables: 0,
        cells: 0,
        zipEntries: 0,
        inflatedBytes: 0,
      },
      truncated: false,
    },
    metadataSuggestion: {
      title: null,
      sourceType: null,
      proposedTier: 'UNKNOWN',
    },
    proposals: [
      {
        proposalId: 0,
        title: 'TEST chunk',
        topic: null,
        stage: null,
        content: text,
        originalExcerpt: text,
        locator: 'lines1-1',
        selectedSpans: [{ segmentId: 0, start: 0, end: text.length }],
      },
    ],
    chunkingStatus: 'PROPOSED',
    receipt: null,
  };
}

const pa = preview(A, 'TEST-A.txt');
const pb = preview(B, 'TEST-B.txt');
const summary = p => ({
  id: p.id,
  version: p.version,
  state: p.state,
  createdAt: p.createdAt,
  expiresAt: p.expiresAt,
  purgeAfter: p.purgeAfter,
  file: p.file,
});

const dist = path.join(WORK, 'dist');
if (!fs.existsSync(dist)) {
  console.error('dist directory does not exist! Run npm run build first.');
  process.exit(1);
}

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.resolve(dist, '.' + rel);
  if (!file.startsWith(dist)) return res.end();
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(dist, 'index.html');
  res.writeHead(200, {
    'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const results = [];

async function record(id, pass, details) {
  results.push({ id, status: pass ? 'PASS' : 'FAIL', ...details });
  console.log(id, pass ? 'PASS' : 'FAIL', JSON.stringify(details));
}

async function click(page, label, exact = false) {
  await page.waitForFunction(
    (s, e) =>
      Array.from(document.querySelectorAll('button')).some(
        b => b.offsetParent !== null && !b.disabled && (e ? b.innerText.trim() === s : b.innerText.includes(s))
      ),
    { timeout: 8000 },
    label,
    exact
  );
  const h = await page.evaluateHandle(
    (s, e) =>
      Array.from(document.querySelectorAll('button')).find(
        b => b.offsetParent !== null && !b.disabled && (e ? b.innerText.trim() === s : b.innerText.includes(s))
      ),
    label,
    exact
  );
  await h.asElement().click();
  await h.dispose();
}

async function create(opts = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100 });
  const state = { requests: [], confirms: [], errors: [] };

  page.on('pageerror', e => state.errors.push(e.message));
  page.on('dialog', d => d.accept());

  await page.evaluateOnNewDocument(() => localStorage.setItem('duricare-language', 'vi'));
  await page.setRequestInterception(true);

  page.on('request', async req => {
    try {
      const u = new URL(req.url());
      if (u.origin !== base) return req.abort();
      if (!u.pathname.startsWith('/api/')) return req.continue();

      const method = req.method();
      const p = u.pathname;
      state.requests.push({ method, path: p });

      const json = (body, status = 200) =>
        req.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });

      if (p === '/api/auth/csrf') return json({ token: 'TEST_ONLY_CSRF' });
      if (p === '/api/auth/refresh') return json({ accessToken: 'TEST_ONLY_TOKEN' });
      if (p === '/api/auth/me')
        return json({
          id: 101,
          email: 'reviewer@test.invalid',
          fullName: 'TEST Reviewer',
          role: 'ADMIN',
          farmId: null,
          enabled: true,
        });
      if (p === '/api/expert/profile')
        return json({
          id: 1,
          userId: 101,
          fullName: 'TEST Reviewer',
          verificationStatus: 'VERIFIED',
          affiliation: 'TEST',
          specialties: 'TEST',
        });
      if (p === '/api/knowledge/imports/capabilities') return json(caps);
      if (p === '/api/knowledge/imports' && method === 'POST') return json(pa, 201);
      if (p === '/api/knowledge/imports' && method === 'GET')
        return json({ content: [summary(pa), summary(pb)], page: 0, size: 10, totalElements: 2, totalPages: 1 });
      if (p === `/api/knowledge/imports/${A}` && method === 'GET') return json(pa);
      if (p === `/api/knowledge/imports/${B}` && method === 'GET') return json(pb);
      if (p.endsWith('/confirm') && method === 'POST') {
        state.confirms.push({ path: p, body: JSON.parse(req.postData()) });
        if (opts.validation400) {
          return json(
            {
              error: 'bad_request',
              code: 'validation',
              message: 'TEST_FIELD_INVALID',
              fieldErrors: [{ field: 'metadata.year', code: 'range', message: 'TEST year outside range' }],
            },
            400
          );
        }
        return json(
          {
            error: 'internal_error',
            code: 'TEST_UNCERTAIN_COMMIT',
            message: 'TEST_UNCERTAIN_COMMIT',
            fieldErrors: [],
          },
          500
        );
      }
      if (p === '/api/farms') return json([]);
      return json({ content: [], totalPages: 0, totalElements: 0 });
    } catch (e) {
      state.errors.push('handler ' + e.message);
      try {
        await req.abort();
      } catch {}
    }
  });

  await page.goto(base + '/knowledge/import?farmId=1', { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('#file-import-input', { timeout: 10000 });
  return { page, state };
}

const tmpUploadFile = path.join(WORK, 'scripts', 'test-upload-probe.txt');
fs.writeFileSync(tmpUploadFile, 'TEST synthetic upload only');

async function upload(page) {
  const input = await page.$('#file-import-input');
  await input.uploadFile(tmpUploadFile);
  await click(page, 'Bắt đầu trích xuất');
  await page.waitForSelector('input[type="checkbox"]', { timeout: 8000 });
}

async function openConfirm(page) {
  await page.click('input[type="checkbox"]');
  await click(page, 'Tiếp tục đến bước');
  await page.waitForFunction(() => document.body.innerText.includes('Mã yêu cầu (requestId)'));
}

async function chooseClassifications(page) {
  for (const value of ['OFFICIAL_DOCUMENT', 'GENERAL']) {
    const h = await page.evaluateHandle(
      v => Array.from(document.querySelectorAll('select')).find(s => Array.from(s.options).some(o => o.value === v)),
      value
    );
    await h.asElement().select(value);
    await h.dispose();
  }
}

async function year(page, value) {
  await page.$eval(
    'input[type="number"]',
    (el, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    value
  );
}

async function resumeNamed(page, name) {
  await click(page, 'Phiên chờ xác nhận');
  await page.waitForFunction(() => document.body.innerText.includes('TEST-B.txt'));
  await page.waitForFunction(
    s => Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Tiếp tục') && b.parentElement?.parentElement?.innerText.includes(s)),
    {},
    name
  );
  await page.evaluate(s => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      b => b.innerText.includes('Tiếp tục') && b.parentElement?.parentElement?.innerText.includes(s)
    );
    if (btn) btn.click();
  }, name);
  await page.waitForSelector('textarea');
}

async function submit(page, state, n = 1) {
  await click(page, 'Đồng ý và Tạo DRAFT');
  await page.waitForFunction(() => document.body.innerText.includes('TEST_UNCERTAIN_COMMIT'));
  if (state.confirms.length !== n) throw new Error('Expected confirm capture ' + n);
}

try {
  // Test Case 1: VALIDATION_400_CORRECTION
  console.log('\n--- Running Case 1: VALIDATION_400_CORRECTION ---');
  const { page: page1, state: state1 } = await create({ validation400: true });
  try {
    await upload(page1);
    await chooseClassifications(page1);
    await year(page1, 9999);
    await openConfirm(page1);

    await click(page1, 'Đồng ý và Tạo DRAFT');
    await page1.waitForFunction(() => document.body.innerText.includes('TEST_FIELD_INVALID'));

    const first = state1.confirms[0];
    if (first?.body.metadata.year !== 9999) throw new Error('Fixture did not set rejected year 9999');

    await click(page1, 'Quay lại chỉnh sửa');
    await year(page1, 2020);
    await click(page1, 'Tiếp tục đến bước');

    await click(page1, 'Đồng ý và Tạo DRAFT');
    await page1.waitForFunction(() => document.body.innerText.includes('TEST_FIELD_INVALID'));

    const second = state1.confirms[1];
    const pass = second?.body.metadata.year === 2020 && second.body.requestId !== first.body.requestId;

    await record('VALIDATION_400_CORRECTION', pass, {
      firstStatus: 400,
      firstYear: first.body.metadata.year,
      editedYear: 2020,
      secondYear: second?.body.metadata.year,
      firstRequestId: first.body.requestId,
      secondRequestId: second?.body.requestId,
      expected: 'Definitive validation rejection permits corrected new request; uncertain commits still replay frozen bytes',
    });
  } finally {
    await page1.close();
  }

  // Test Case 2: UNCERTAIN_SESSION_ROUND_TRIP
  console.log('\n--- Running Case 2: UNCERTAIN_SESSION_ROUND_TRIP ---');
  const { page: page2, state: state2 } = await create();
  try {
    await upload(page2);
    await chooseClassifications(page2);
    await openConfirm(page2);
    await submit(page2, state2);

    const first = state2.confirms[0];
    await click(page2, 'Quay lại chỉnh sửa');

    await resumeNamed(page2, 'TEST-B.txt');
    await resumeNamed(page2, 'TEST-A.txt');

    await chooseClassifications(page2);
    await openConfirm(page2);
    await submit(page2, state2, 2);

    const second = state2.confirms[1];
    const pass = first.path === second.path && JSON.stringify(first.body) === JSON.stringify(second.body);

    await record('UNCERTAIN_SESSION_ROUND_TRIP', pass, {
      firstPath: first.path,
      secondPath: second.path,
      sameRequestId: first.body.requestId === second.body.requestId,
      sameBody: JSON.stringify(first.body) === JSON.stringify(second.body),
    });
  } finally {
    await page2.close();
  }
} finally {
  try {
    fs.unlinkSync(tmpUploadFile);
  } catch {}
  await browser.close();
  await new Promise(r => server.close(r));
}

const failed = results.filter(r => r.status !== 'PASS');
if (failed.length > 0) {
  console.error('\nFAILURES DETECTED:');
  console.error(failed);
  process.exit(1);
} else {
  console.log('\nALL 2 PROBE SCENARIOS PASSED SUCCESSFULLY!');
  process.exit(0);
}
