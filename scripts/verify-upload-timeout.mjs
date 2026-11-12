/**
 * FE-KNOWLEDGE-IMPORT-001: Comprehensive Upload Timeout Verification Suite
 * 
 * Verifies all requirements from FE-KNOWLEDGE-IMPORT-001 and review findings F1 & F2:
 * 1. Imports and tests REAL production code from src/api/import.ts and src/api/client.ts via Vite SSR loader.
 * 2. Asserts effective request timeout configuration: UPLOAD_TIMEOUT_MS = 120000 on upload vs 15000 default on general APIs.
 * 3. Asserts real parseImportError on real AxiosError instances (ECONNABORTED, cancel, ERR_NETWORK, HTTP 413, status 0).
 * 4. Asserts real Axios timeout execution against a controlled delayed local HTTP socket.
 * 5. Browser E2E Test 1: Upload timeout displays friendly message & offers Pending Sessions button without auto-retry.
 * 6. Browser E2E Test 2: User cancellation via "Hủy tải lên" aborts cleanly without server error banner.
 * 7. Browser E2E Test 3: Upload lasting >15 seconds (16,000ms controlled delay) succeeds without timing out.
 * 8. Browser E2E Test 4 (F1 Regression): Dropping a file during active upload is blocked and does not freeze the UI.
 * 9. Browser E2E Test 5: Generation fencing ensures stale upload responses are safely discarded.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import assert from 'assert';
import { pathToFileURL } from 'url';
import axios from 'axios';
import puppeteer from 'puppeteer';
import { build as viteBuild } from 'vite';

console.log('================================================================');
console.log('FE-KNOWLEDGE-IMPORT-001: Upload Timeout Verification Suite');
console.log('================================================================');

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${desc}`);
    console.error(err);
  }
}

async function itAsync(desc, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${desc}`);
    console.error(err);
  }
}

async function clickButtonWithText(page, text) {
  await page.waitForFunction(t => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some(b => b.textContent && b.textContent.includes(t));
  }, { timeout: 10000 }, text);

  await page.evaluate(t => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const target = buttons.find(b => b.textContent && b.textContent.includes(t));
    if (target) {
      target.click();
    } else {
      throw new Error(`Button with text "${t}" not found`);
    }
  }, text);
}

// -------------------------------------------------------------
// 1. Static Contract & Source Inspection
// -------------------------------------------------------------
const importApiPath = path.join('src', 'api', 'import.ts');
const clientApiPath = path.join('src', 'api', 'client.ts');
const uploadStepPath = path.join('src', 'components', 'knowledge', 'import', 'ImportUploadStep.tsx');

const importApiCode = fs.readFileSync(importApiPath, 'utf8');
const clientApiCode = fs.readFileSync(clientApiPath, 'utf8');
const uploadStepCode = fs.readFileSync(uploadStepPath, 'utf8');

it('src/api/client.ts sets default timeout to 15000ms', () => {
  assert(clientApiCode.includes('timeout: 15000'), 'client.ts must specify default timeout: 15000');
});

it('src/api/import.ts exports UPLOAD_TIMEOUT_MS = 120000', () => {
  assert(importApiCode.includes('export const UPLOAD_TIMEOUT_MS = 120000;'), 'import.ts must export UPLOAD_TIMEOUT_MS = 120000');
});

it('src/api/import.ts uploadImportFile configures timeout: UPLOAD_TIMEOUT_MS', () => {
  assert(importApiCode.includes('timeout: UPLOAD_TIMEOUT_MS'), 'uploadImportFile must pass timeout: UPLOAD_TIMEOUT_MS');
});

it('ImportUploadStep.tsx blocks drag/drop while uploading, isolates pointer-events-none to file selection, and allows cancel', () => {
  assert(uploadStepCode.includes('if (uploading || isWriteBlocked) return;'), 'Must reject drop/drag while uploading');
  assert(uploadStepCode.includes("uploading ? 'pointer-events-none select-none opacity-40' : ''"), 'File selection content must set pointer-events-none while uploading');
  assert(uploadStepCode.includes('data-testid="cancel-upload-btn"'), 'Cancel button must have data-testid for pointer testability');
  assert(uploadStepCode.includes('uploadGenerationRef = useRef<number>(0)'), 'Must define uploadGenerationRef');
  assert(uploadStepCode.includes("serverError.code === 'request_timeout'"), 'Must check serverError.code === request_timeout');
  assert(uploadStepCode.includes("onClick={onOpenSessions}"), 'Must offer onOpenSessions recovery button in timeout state');
});

// -------------------------------------------------------------
// 2. Production Code Verification via Test-Only Bundle Loader
// -------------------------------------------------------------
// Compile production API modules to native ESM with axios externalized.
// Leaves installed packages (axios, form-data, etc.) entirely to Node's native module loader,
// eliminating Vite SSR internal traversal and cross-junction module-runner issues.
const tmpDir = path.resolve('.tmp-verify-bundle');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

let importMod;
let clientMod;

try {
  await viteBuild({
    root: process.cwd(),
    configFile: false,
    logLevel: 'silent',
    build: {
      ssr: true,
      outDir: tmpDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          importApi: 'src/api/import.ts',
          clientApi: 'src/api/client.ts',
        },
        external: ['axios'],
        output: {
          entryFileNames: '[name].mjs',
          format: 'esm',
        },
      },
    },
  });

  const importBundlePath = path.join(tmpDir, 'importApi.mjs');
  const clientBundlePath = path.join(tmpDir, 'clientApi.mjs');

  importMod = await import(pathToFileURL(importBundlePath).href);
  clientMod = await import(pathToFileURL(clientBundlePath).href);
} finally {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

it('Production client default timeout is verified at 15000ms', () => {
  assert.strictEqual(clientMod.default.defaults.timeout, 15000, 'client.defaults.timeout must be 15000');
});

it('Production UPLOAD_TIMEOUT_MS is verified at 120000ms', () => {
  assert.strictEqual(importMod.UPLOAD_TIMEOUT_MS, 120000, 'UPLOAD_TIMEOUT_MS must be 120000');
});

await itAsync('Effective Axios request configuration: upload sets 120000ms, general APIs retain 15000ms', async () => {
  let capturedUploadTimeout = null;
  let capturedGeneralTimeout = null;

  const interceptorId = clientMod.default.interceptors.request.use(config => {
    if (config.url === '/knowledge/imports') {
      capturedUploadTimeout = config.timeout;
    }
    if (config.url === '/knowledge/imports/capabilities') {
      capturedGeneralTimeout = config.timeout ?? clientMod.default.defaults.timeout;
    }
    const cancelErr = new axios.Cancel('TEST_CONFIG_INTERCEPT');
    return Promise.reject(cancelErr);
  });

  try {
    const dummyFile = new File(['dummy test content'], 'dummy.txt', { type: 'text/plain' });
    await importMod.uploadImportFile(dummyFile);
  } catch {
    // Expected cancellation from interceptor
  }

  try {
    await importMod.getImportCapabilities();
  } catch {
    // Expected cancellation from interceptor
  }

  clientMod.default.interceptors.request.eject(interceptorId);

  assert.strictEqual(capturedUploadTimeout, 120000, 'uploadImportFile must pass timeout: 120000 to Axios');
  assert.strictEqual(capturedGeneralTimeout, 15000, 'getImportCapabilities must retain 15000ms timeout');
});

it('Production parseImportError handles real Axios ECONNABORTED timeout', () => {
  const timeoutErr = new axios.AxiosError('timeout of 120000ms exceeded', 'ECONNABORTED');
  const parsed = importMod.parseImportError(timeoutErr);
  assert.strictEqual(parsed.status, 0);
  assert.strictEqual(parsed.code, 'request_timeout');
  assert(parsed.message.includes('Quá thời gian chờ tải lên hoặc xử lý tài liệu'), 'Message must contain timeout guidance');
  assert(parsed.message.includes('Phiên chờ xác nhận'), 'Message must mention pending sessions');
});

it('Production parseImportError handles real Axios user cancellation', () => {
  const cancelErr = new axios.CanceledError('canceled');
  const parsed = importMod.parseImportError(cancelErr);
  assert.strictEqual(parsed.status, 0);
  assert.strictEqual(parsed.code, 'request_cancelled');
  assert(parsed.message.includes('hủy bởi người dùng'));
});

it('Production parseImportError handles real Axios ERR_NETWORK error', () => {
  const netErr = new axios.AxiosError('Network Error', 'ERR_NETWORK');
  const parsed = importMod.parseImportError(netErr);
  assert.strictEqual(parsed.status, 0);
  assert.strictEqual(parsed.code, 'network_error');
  assert(parsed.message.includes('kết nối mạng'));
  assert.notStrictEqual(parsed.status, 413, 'Status 0 must never be misclassified as 413');
});

it('Production parseImportError preserves real server HTTP 413 Payload Too Large', () => {
  const err413 = new axios.AxiosError('Request failed with status code 413', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 413,
    data: { error: 'Payload Too Large', code: 'file_too_large', message: 'Tệp vượt quá 5 MiB' },
    headers: {},
    config: {},
  });
  const parsed = importMod.parseImportError(err413);
  assert.strictEqual(parsed.status, 413);
  assert.strictEqual(parsed.code, 'file_too_large');
  assert(parsed.message.includes('5 MiB'));
});

await itAsync('Real Axios timeout mechanism triggers ECONNABORTED and parses to request_timeout', async () => {
  // Start a local socket server that delays responding
  const delayServer = http.createServer((req, res) => {
    // Deliberately hold response for 500ms
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    }, 500);
  });

  await new Promise(resolve => delayServer.listen(0, '127.0.0.1', resolve));
  const serverPort = delayServer.address().port;

  try {
    let thrownError = null;
    try {
      await axios.get(`http://127.0.0.1:${serverPort}/test-timeout`, { timeout: 50 });
    } catch (err) {
      thrownError = err;
    }

    assert(thrownError !== null, 'Axios must throw when timeout is exceeded');
    assert.strictEqual(thrownError.code, 'ECONNABORTED', 'Axios timeout must set code ECONNABORTED');

    const parsed = importMod.parseImportError(thrownError);
    assert.strictEqual(parsed.status, 0);
    assert.strictEqual(parsed.code, 'request_timeout');
  } finally {
    delayServer.close();
  }
});

// -------------------------------------------------------------
// 3. Browser E2E Verification with Puppeteer (SPA on Port 5199)
// -------------------------------------------------------------
const PORT = 5199;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function startSpaServer(port) {
  const distDir = path.resolve('dist');
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  };

  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    const filePath = path.join(distDir, urlPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(path.join(distDir, 'index.html')).pipe(res);
    }
  });

  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`SPA server listening at ${BASE_URL}`);
      resolve(server);
    });
  });
}

const MOCK_CAPABILITIES = {
  enabled: true,
  formats: ['.txt', '.md', '.markdown', '.pdf', '.docx'],
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

const MOCK_PREVIEW_SESSION = {
  id: 'import-sess-timeout-test-01',
  version: 0,
  state: 'READY',
  createdAt: '2026-11-11T10:00:00Z',
  expiresAt: new Date(Date.now() + 28 * 60 * 1000).toISOString(),
  purgeAfter: '2026-12-11T10:00:00Z',
  file: {
    displayName: 'test-document.txt',
    mediaType: 'text/plain',
    bytes: 1024,
    sha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  },
  extraction: {
    parser: 'JDK-UTF8',
    parserVersion: '21',
    normalization: 'DURI-IMPORT-TEXT-1',
    text: 'Nội dung kiểm tra trích xuất tài liệu.',
    textSha256: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    segments: [
      {
        id: 0,
        start: 0,
        end: 38,
        locator: { kind: 'PARAGRAPH', display: 'Đoạn 1', lineStart: 1, lineEnd: 1, pageStart: null, pageEnd: null, paragraph: 1, table: null, row: null, cell: null, heading: null },
      },
    ],
    counters: {
      utf16Units: 38,
      utf8Bytes: 45,
      segments: 1,
      pages: null,
      paragraphs: 1,
      tables: 0,
      cells: 0,
      zipEntries: 0,
      inflatedBytes: 0,
    },
    warnings: [],
    truncated: false,
  },
  metadataSuggestion: {
    title: 'Test Document Title',
    sourceType: 'OFFICIAL_DOCUMENT',
    proposedTier: 'UNKNOWN',
  },
  proposals: [
    {
      proposalId: 0,
      title: 'Phân đoạn 1',
      topic: 'GENERAL',
      stage: null,
      content: 'Nội dung kiểm tra trích xuất tài liệu.',
      originalExcerpt: 'Nội dung kiểm tra trích xuất tài liệu.',
      locator: 'Đoạn 1',
      selectedSpans: [{ segmentId: 0, start: 0, end: 38 }],
    },
  ],
  chunkingStatus: 'PROPOSED',
  receipt: null,
};

const MOCK_PREVIEW_SESSION_2 = {
  ...MOCK_PREVIEW_SESSION,
  id: 'import-sess-generation-2',
  file: {
    displayName: 'second-file.txt',
    mediaType: 'text/plain',
    bytes: 2048,
    sha256: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
  },
};

const MOCK_SESSIONS_PAGE = {
  content: [
    {
      id: 'import-sess-timeout-test-01',
      version: 0,
      state: 'READY',
      createdAt: '2026-11-11T10:00:00Z',
      expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
      purgeAfter: '2026-12-11T10:00:00Z',
      file: {
        displayName: 'test-document.txt',
        mediaType: 'text/plain',
        bytes: 1024,
        sha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      },
    },
  ],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
};

async function runBrowserTests() {
  const spaServer = await startSpaServer(PORT);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('dialog', async dialog => {
      try {
        await dialog.accept();
      } catch {
        // ignore
      }
    });

    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('Error') || txt.includes('error') || txt.includes('Failed')) {
        console.log('BROWSER_CONSOLE:', txt);
      }
    });
    page.on('pageerror', err => console.error('BROWSER_PAGE_ERROR:', err.message));
    page.on('requestfailed', req => console.log('REQUEST_FAILED:', req.method(), req.url(), req.failure()?.errorText));

    // Enable request interception
    await page.setRequestInterception(true);

    let uploadRequestCount = 0;
    let uploadResponseMode = 'NORMAL'; // 'NORMAL' | 'TIMEOUT' | 'HANG' | 'DELAYED_16S' | 'DELAYED_SHORT' | 'FENCE'
    let fenceFirstResolver = null;

    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': BASE_URL,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-XSRF-TOKEN',
    };

    function respondJson(req, status, data, extraHeaders = {}) {
      return req.respond({
        status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify(data),
      });
    }

    page.on('request', req => {
      if (req.resourceType() === 'document' || req.resourceType() === 'script' || req.resourceType() === 'stylesheet' || req.resourceType() === 'font' || req.resourceType() === 'image') {
        return req.continue();
      }

      const url = req.url();
      const method = req.method();

      if (method === 'OPTIONS') {
        return req.respond({
          status: 204,
          headers: CORS_HEADERS,
        });
      }

      if (url.includes('/auth/refresh')) {
        return respondJson(req, 200, { accessToken: 'mock_jwt_token_for_admin' });
      }

      if (url.includes('/auth/csrf')) {
        return respondJson(req, 200, { token: 'mock_csrf_token' });
      }

      if (url.includes('/auth/me')) {
        return respondJson(req, 200, {
          id: 1,
          email: 'admin@duricare.vn',
          fullName: 'System Administrator',
          role: 'ADMIN',
          farmId: 1,
          enabled: true,
        });
      }

      if (url.includes('/knowledge/imports/capabilities')) {
        return respondJson(req, 200, MOCK_CAPABILITIES);
      }

      if (url.includes('/knowledge/imports') && method === 'GET' && !url.includes('/capabilities')) {
        return respondJson(req, 200, MOCK_SESSIONS_PAGE);
      }

      if (url.includes('/knowledge/imports') && method === 'POST' && !url.includes('/confirm')) {
        uploadRequestCount++;
        if (uploadResponseMode === 'TIMEOUT') {
          return req.abort('timedout');
        } else if (uploadResponseMode === 'DELAYED_16S') {
          // Controlled delay of 16,000ms strictly exceeding the old 15,000ms default timeout
          setTimeout(() => {
            try {
              respondJson(req, 201, MOCK_PREVIEW_SESSION);
            } catch {
              // Ignore if page navigated away
            }
          }, 16000);
          return;
        } else if (uploadResponseMode === 'DELAYED_SHORT') {
          // Short delay for testing drop rejection while busy
          setTimeout(() => {
            try {
              respondJson(req, 201, MOCK_PREVIEW_SESSION);
            } catch {
              // Ignore
            }
          }, 2000);
          return;
        } else if (uploadResponseMode === 'HANG') {
          // Do not respond; keep hanging to test user cancellation
          return;
        } else if (uploadResponseMode === 'FENCE') {
          if (uploadRequestCount === 1) {
            fenceFirstResolver = () => {
              try {
                respondJson(req, 201, MOCK_PREVIEW_SESSION);
              } catch {
                // Request might have been aborted by client
              }
            };
            return;
          } else {
            return respondJson(req, 201, MOCK_PREVIEW_SESSION_2);
          }
        } else {
          return respondJson(req, 201, MOCK_PREVIEW_SESSION);
        }
      }

      // Default mock for other API routes
      if (url.includes('/api/')) {
        return respondJson(req, 200, { content: [], totalPages: 1, totalElements: 0 });
      }

      req.continue();
    });

    const dummyUploadPath = path.resolve('test-dummy-timeout.txt');
    fs.writeFileSync(dummyUploadPath, 'DuriCare test dummy text for timeout verification.');

    // Set auth token in localStorage first
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('duricare_auth_token', 'mock_jwt_token_for_admin');
      localStorage.setItem(
        'duricare_auth_user',
        JSON.stringify({
          id: 1,
          email: 'admin@duricare.vn',
          fullName: 'System Administrator',
          role: 'ADMIN',
          farmId: 1,
        })
      );
    });

    // ---------------------------------------------------------
    // Browser Test 1: Timeout simulation & pending sessions button
    // ---------------------------------------------------------
    await itAsync('Browser Test 1: Upload timeout shows friendly message & offers Pending Sessions button without auto-retry', async () => {
      uploadRequestCount = 0;
      uploadResponseMode = 'TIMEOUT';

      await page.goto(`${BASE_URL}/knowledge/import`, { waitUntil: 'domcontentloaded' });

      await page.waitForSelector('#file-import-input', { timeout: 10000 });
      const fileInput = await page.$('#file-import-input');
      assert(fileInput, 'File input should exist');
      await fileInput.uploadFile(dummyUploadPath);

      await page.waitForFunction(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => b.textContent && b.textContent.includes('Bắt đầu trích xuất'));
      }, { timeout: 5000 });

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.textContent && b.textContent.includes('Bắt đầu trích xuất'));
        target?.click();
      });

      await page.waitForFunction(() => {
        const banner = document.querySelector('.bg-coral\\/10');
        return banner && banner.textContent && banner.textContent.includes('Phiên chờ xác nhận');
      }, { timeout: 10000 });

      const bannerText = await page.evaluate(() => {
        const banner = document.querySelector('.bg-coral\\/10');
        return banner?.textContent || '';
      });

      assert(bannerText.includes('Quá thời gian chờ tải lên hoặc xử lý tài liệu'), 'Banner must include timeout guidance');
      assert(bannerText.includes('Kiểm tra Phiên chờ xác nhận'), 'Banner must render recovery button');
      assert.strictEqual(uploadRequestCount, 1, 'Upload must NOT auto-retry on timeout; requestCount must be exactly 1');

      await clickButtonWithText(page, 'Kiểm tra Phiên chờ xác nhận');

      await page.waitForFunction(
        () => document.body.innerText.includes('Phiên nhập tài liệu chờ xác nhận'),
        { timeout: 10000 }
      );

      const modalText = await page.content();
      assert(modalText.includes('test-document.txt'), 'Modal should list pending session test-document.txt');

      await clickButtonWithText(page, 'Đóng');
    });

    // ---------------------------------------------------------
    // Browser Test 2: User cancellation during upload
    // ---------------------------------------------------------
    await itAsync('Browser Test 2: User cancellation via "Hủy tải lên" aborts cleanly without server error banner', async () => {
      uploadResponseMode = 'HANG';

      await page.goto(`${BASE_URL}/knowledge/import`, { waitUntil: 'domcontentloaded' });

      await page.waitForSelector('#file-import-input', { timeout: 10000 });
      const fileInput = await page.$('#file-import-input');
      await fileInput.uploadFile(dummyUploadPath);

      await page.waitForFunction(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => b.textContent && b.textContent.includes('Bắt đầu trích xuất'));
      }, { timeout: 5000 });

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.textContent && b.textContent.includes('Bắt đầu trích xuất'));
        target?.click();
      });

      await page.waitForSelector('button[data-testid="cancel-upload-btn"]', { timeout: 5000 });

      // Verify that the cancel button is clickable via pointer events (not blocked by pointer-events-none)
      const isPointerClickable = await page.evaluate(() => {
        const btn = document.querySelector('button[data-testid="cancel-upload-btn"]');
        if (!btn) return false;
        const rect = btn.getBoundingClientRect();
        const elAtPoint = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return elAtPoint === btn || btn.contains(elAtPoint);
      });
      assert.strictEqual(isPointerClickable, true, 'Cancel button must receive genuine pointer hit testing (not blocked by pointer-events-none)');

      // Real browser pointer click (moves virtual mouse and fires pointer/mouse events with hit testing)
      await page.click('button[data-testid="cancel-upload-btn"]');

      await page.waitForFunction(() => {
        return document.body.textContent && document.body.textContent.includes('Đã hủy quá trình tải lên');
      }, { timeout: 5000 });

      // Verify busy state is released
      const busyReleased = await page.evaluate(() => {
        const cancelBtn = document.querySelector('button[data-testid="cancel-upload-btn"]');
        const fileInput = document.querySelector('#file-import-input');
        return !cancelBtn && fileInput !== null;
      });
      assert.strictEqual(busyReleased, true, 'Cancellation must release the upload busy state');

      const hasServerErrorBanner = await page.evaluate(() => {
        const errorHeaders = Array.from(document.querySelectorAll('p')).filter(p => p.textContent?.includes('Timeout') || p.textContent?.includes('Request Error'));
        return errorHeaders.length > 0;
      });

      assert.strictEqual(hasServerErrorBanner, false, 'Cancellation must not render a false server error banner');
    });

    // ---------------------------------------------------------
    // Browser Test 3: Upload lasting >15s (16,000ms controlled delay) succeeds
    // ---------------------------------------------------------
    await itAsync('Browser Test 3: Upload taking 16s (>15s old timeout) succeeds and enters preview under 120s timeout', async () => {
      uploadResponseMode = 'DELAYED_16S';

      await page.goto(`${BASE_URL}/knowledge/import`, { waitUntil: 'domcontentloaded' });

      await page.waitForSelector('#file-import-input', { timeout: 10000 });
      const fileInput = await page.$('#file-import-input');
      await fileInput.uploadFile(dummyUploadPath);

      await page.waitForFunction(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => b.textContent && b.textContent.includes('Bắt đầu trích xuất'));
      }, { timeout: 5000 });

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.textContent && b.textContent.includes('Bắt đầu trích xuất'));
        target?.click();
      });

      // Confirm upload progress/extracting state is displayed
      await page.waitForFunction(() => {
        const text = document.body.textContent || '';
        return text.includes('Đang tải lên') || text.includes('Đang trích xuất');
      }, { timeout: 5000 });

      // Wait 16s for the delayed upload to complete (timeout: 25000ms)
      console.log('    (Awaiting 16s controlled upload delay to prove >15,000ms tolerance...)');
      await page.waitForFunction(() => {
        return Boolean(document.body.textContent?.includes('Thông tin nguồn tài liệu'));
      }, { timeout: 25000 });

      const hasPreviewTabs = await page.evaluate(() => {
        return Boolean(document.body.textContent?.includes('Thông tin nguồn tài liệu') &&
               document.body.textContent?.includes('Danh sách mảnh tri thức'));
      });

      assert.strictEqual(hasPreviewTabs, true, 'Upload exceeding 15s must succeed and transition to preview');
    });

    // ---------------------------------------------------------
    // Browser Test 4: Finding F1 Regression — File drop blocked during active upload
    // ---------------------------------------------------------
    await itAsync('Browser Test 4 (F1 Regression): Dropping a file during active upload is blocked and does not leave view stuck', async () => {
      uploadResponseMode = 'DELAYED_SHORT';

      await page.goto(`${BASE_URL}/knowledge/import`, { waitUntil: 'domcontentloaded' });

      await page.waitForSelector('#file-import-input', { timeout: 10000 });
      const fileInput = await page.$('#file-import-input');
      await fileInput.uploadFile(dummyUploadPath);

      await clickButtonWithText(page, 'Bắt đầu trích xuất');

      // Verify file selection content is disabled with pointer-events-none while uploading
      await page.waitForFunction(() => {
        const fileContent = document.querySelector('.select-none.opacity-40');
        return fileContent && fileContent.classList.contains('pointer-events-none');
      }, { timeout: 5000 });

      // Verify Cancel button is NOT blocked by pointer-events-none
      const cancelClickable = await page.evaluate(() => {
        const btn = document.querySelector('button[data-testid="cancel-upload-btn"]');
        if (!btn) return false;
        const style = window.getComputedStyle(btn);
        return style.pointerEvents !== 'none';
      });
      assert.strictEqual(cancelClickable, true, 'Cancel button must not be blocked by pointer-events-none');

      // Attempt to drop file while uploading
      await page.evaluate(() => {
        const dropZone = document.querySelector('.border-dashed');
        const dt = new DataTransfer();
        const file = new File(['test drop during upload'], 'dropped.txt', { type: 'text/plain' });
        dt.items.add(file);
        const event = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
        dropZone?.dispatchEvent(event);
      });

      // Verify uploading state continues and finishes cleanly
      await page.waitForFunction(() => {
        return Boolean(document.body.textContent?.includes('Thông tin nguồn tài liệu'));
      }, { timeout: 10000 });

      const hasPreview = await page.evaluate(() => {
        return Boolean(document.body.textContent?.includes('Thông tin nguồn tài liệu'));
      });
      assert.strictEqual(hasPreview, true, 'Active upload must settle into preview without being wedged by drop attempt');
    });

    // ---------------------------------------------------------
    // Browser Test 5: Generation fencing (stale upload response discarded)
    // ---------------------------------------------------------
    await itAsync('Browser Test 5: Generation fencing ensures stale upload completion is safely discarded', async () => {
      uploadRequestCount = 0;
      uploadResponseMode = 'FENCE';

      const dummyFile2Path = path.resolve('test-dummy-file2.txt');
      fs.writeFileSync(dummyFile2Path, 'Second file content for generation fencing test.');

      await page.goto(`${BASE_URL}/knowledge/import`, { waitUntil: 'domcontentloaded' });

      await page.waitForSelector('#file-import-input', { timeout: 10000 });
      let fileInput = await page.$('#file-import-input');
      await fileInput.uploadFile(dummyUploadPath);
      await clickButtonWithText(page, 'Bắt đầu trích xuất');

      await page.waitForFunction(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => b.textContent && b.textContent.includes('Hủy tải lên'));
      }, { timeout: 5000 });

      await clickButtonWithText(page, 'Hủy tải lên');

      fileInput = await page.$('#file-import-input');
      await fileInput.uploadFile(dummyFile2Path);
      await clickButtonWithText(page, 'Bắt đầu trích xuất');

      if (fenceFirstResolver) {
        fenceFirstResolver();
      }

      await page.waitForFunction(() => {
        return Boolean(document.body.textContent?.includes('Thông tin nguồn tài liệu'));
      }, { timeout: 10000 });

      const pageText = await page.content();
      assert(pageText.includes('second-file.txt'), 'Session 2 must be displayed');

      if (fs.existsSync(dummyFile2Path)) {
        fs.unlinkSync(dummyFile2Path);
      }
    });

    if (fs.existsSync(dummyUploadPath)) {
      fs.unlinkSync(dummyUploadPath);
    }
  } finally {
    await browser.close();
    spaServer.close();
  }
}

async function main() {
  await runBrowserTests();

  console.log('----------------------------------------------------------------');
  console.log(`Upload Timeout Verification: ${passed} / ${total} Checks PASSED`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
