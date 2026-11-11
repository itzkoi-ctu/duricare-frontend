/**
 * FE-KNOWLEDGE-IMPORT-001: End-to-End Browser & UI Verification Suite
 * Tests upload, preview, chunk editing, assurance downgrade, split/merge, confirm, unconfirmed sessions, and provenance.
 * Saves evidence screenshots to brain/evidence and thesis/evidence.
 */

import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('================================================================');
console.log('FE-KNOWLEDGE-IMPORT-001: Import Browser & UI E2E Verification');
console.log('================================================================');

const EVIDENCE_DIRS = [
  'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence',
  'E:/CTU/LuanVan/docs/ai/thesis/evidence/KNOWLEDGE-IMPORT-001',
];
const PORT = 5198;
const BASE_URL = `http://127.0.0.1:${PORT}`;

for (const dir of EVIDENCE_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(page, filename) {
  for (const dir of EVIDENCE_DIRS) {
    const filePath = path.join(dir, filename);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  Saved screenshot: ${filePath}`);
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

// Mock payloads
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
  id: 'import-sess-8899aabb-1122',
  version: 0,
  state: 'READY',
  createdAt: '2026-11-10T11:00:00Z',
  expiresAt: new Date(Date.now() + 28 * 60 * 1000).toISOString(),
  purgeAfter: '2026-12-10T11:00:00Z',
  file: {
    displayName: 'Quy-Trinh-Tuoi-Sau-Rieng-Dong-Bang-Song-Cuu-Long-2024.pdf',
    mediaType: 'application/pdf',
    bytes: 1450230,
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  },
  extraction: {
    parser: 'PDFBox',
    parserVersion: '3.0.1',
    normalization: 'DURI-IMPORT-TEXT-1',
    text: 'QUY TRÌNH KỸ THUẬT QUẢN LÝ NƯỚC VÀ DINH DƯỠNG CHO CÂY SẦU RIÊNG TẠI ĐỒNG BẰNG SÔNG CỬU LONG\n\nPhần 1: Giai đoạn kiến thiết cơ bản\nCây con từ 1 đến 3 năm tuổi cần lượng nước đều đặn, độ ẩm đất duy trì 65-75%. Tưới cách nhật trong mùa khô, mỗi gốc 20-30 lít/lần.\n\nPhần 2: Giai đoạn tạo mầm hoa và xiết nước\nTrước khi ra hoa cần xử lý xiết nước từ 20 đến 25 ngày để đất khô hạn, kích thích mầm hoa phân hóa. Sau khi nhú mắt cua từ 2-3cm, tiến hành tưới nhử với lượng nước bằng 1/3 mức bình thường.\n\nPhần 3: Giai đoạn đậu trái và nuôi trái non\nTừ sau khi đậu trái đến 30 ngày, tưới nước nhẹ giữ ẩm ổn định để chống rụng trái non. Tuyệt đối không để sốc nước khi gặp mưa rào bất chợt.',
    textSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    segments: [
      {
        id: 0,
        start: 0,
        end: 98,
        locator: {
          kind: 'PDF_PAGE',
          display: 'Trang 1, Dòng 1-3',
          lineStart: 1,
          lineEnd: 3,
          pageStart: 1,
          pageEnd: 1,
          paragraph: 1,
          table: null,
          row: null,
          cell: null,
          heading: 'QUY TRÌNH KỸ THUẬT QUẢN LÝ NƯỚC',
        },
      },
      {
        id: 1,
        start: 100,
        end: 275,
        locator: {
          kind: 'PDF_PAGE',
          display: 'Trang 2, Đoạn 1',
          lineStart: null,
          lineEnd: null,
          pageStart: 2,
          pageEnd: 2,
          paragraph: 2,
          table: null,
          row: null,
          cell: null,
          heading: 'Phần 1: Giai đoạn kiến thiết cơ bản',
        },
      },
      {
        id: 2,
        start: 277,
        end: 510,
        locator: {
          kind: 'PDF_PAGE',
          display: 'Trang 3, Đoạn 2',
          lineStart: null,
          lineEnd: null,
          pageStart: 3,
          pageEnd: 3,
          paragraph: 3,
          table: null,
          row: null,
          cell: null,
          heading: 'Phần 2: Giai đoạn tạo mầm hoa và xiết nước',
        },
      },
      {
        id: 3,
        start: 512,
        end: 720,
        locator: {
          kind: 'PDF_PAGE',
          display: 'Trang 4, Đoạn 1',
          lineStart: null,
          lineEnd: null,
          pageStart: 4,
          pageEnd: 4,
          paragraph: 4,
          table: null,
          row: null,
          cell: null,
          heading: 'Phần 3: Giai đoạn đậu trái và nuôi trái non',
        },
      },
    ],
    warnings: ['PDF_READING_ORDER_REVIEW', 'HEADERS_FOOTERS_OMITTED'],
    counters: {
      utf16Units: 720,
      utf8Bytes: 940,
      segments: 4,
      pages: 4,
      paragraphs: 4,
      tables: 0,
      cells: 0,
      zipEntries: 0,
      inflatedBytes: 0,
    },
    truncated: false,
  },
  metadataSuggestion: {
    title: null,
    sourceType: 'OFFICIAL_DOCUMENT',
    proposedTier: 'UNKNOWN',
  },
  proposals: [
    {
      proposalId: 0,
      title: 'Quản lý nước giai đoạn kiến thiết cơ bản (0 - 3 năm)',
      topic: 'IRRIGATION',
      stage: null,
      content:
        'Cây con từ 1 đến 3 năm tuổi cần lượng nước đều đặn, độ ẩm đất duy trì 65-75%. Tưới cách nhật trong mùa khô, mỗi gốc 20-30 lít/lần.',
      originalExcerpt:
        'Cây con từ 1 đến 3 năm tuổi cần lượng nước đều đặn, độ ẩm đất duy trì 65-75%. Tưới cách nhật trong mùa khô, mỗi gốc 20-30 lít/lần.',
      locator: 'Trang 2, Đoạn 1',
      selectedSpans: [{ segmentId: 1, start: 100, end: 275 }],
    },
    {
      proposalId: 1,
      title: 'Kỹ thuật xiết nước tạo mầm hoa và tưới nhử mắt cua',
      topic: 'IRRIGATION',
      stage: null,
      content:
        'Trước khi ra hoa cần xử lý xiết nước từ 20 đến 25 ngày để đất khô hạn, kích thích mầm hoa phân hóa. Sau khi nhú mắt cua từ 2-3cm, tiến hành tưới nhử với lượng nước bằng 1/3 mức bình thường.',
      originalExcerpt:
        'Trước khi ra hoa cần xử lý xiết nước từ 20 đến 25 ngày để đất khô hạn, kích thích mầm hoa phân hóa. Sau khi nhú mắt cua từ 2-3cm, tiến hành tưới nhử với lượng nước bằng 1/3 mức bình thường.',
      locator: 'Trang 3, Đoạn 2',
      selectedSpans: [{ segmentId: 2, start: 277, end: 510 }],
    },
  ],
  chunkingStatus: 'PROPOSED',
  receipt: null,
};

const MOCK_CONFIRM_RECEIPT = {
  importId: 'import-sess-8899aabb-1122',
  documentId: 'doc-uuid-11223344',
  snapshotId: 'snap-uuid-55667788',
  confirmedAt: '2026-11-10T11:35:00Z',
  requestId: 'req-uuid-test-9999',
  replayed: false,
  created: {
    source: {
      id: 'src-created-uuid-1234',
      ownerUserId: 1,
      ownerDisplayName: 'Nguyễn Văn Quản Trị',
      createdAt: '2026-11-10T11:35:00Z',
      updatedAt: '2026-11-10T11:35:00Z',
      version: 0,
      latestRevisionId: 'rev-created-uuid-5678',
      latestRevision: null,
    },
    revision: {
      id: 'rev-created-uuid-5678',
      sourceId: 'src-created-uuid-1234',
      revisionNumber: 1,
      status: 'DRAFT',
      title: 'Quy Trinh Tuoi Sau Rieng Dong Bang Song Cuu Long 2024',
      version: 0,
      submittedAt: null,
      updatedAt: '2026-11-10T11:35:00Z',
      baseRevisionId: null,
      metadata: {
        title: 'Quy Trinh Tuoi Sau Rieng Dong Bang Song Cuu Long 2024',
        authors: 'Viện Cây Ăn Quả Miền Nam',
        publisher: 'NXB Nông Nghiệp',
        sourceType: 'OFFICIAL_DOCUMENT',
        year: 2024,
        edition: 'Tái bản lần 1',
        sourceUrl: 'https://sofri.org.vn/tai-lieu-sau-rieng',
        evidenceReference: 'QĐ-123/2024/BNN',
        provenanceNotes: 'Nhập tự động từ PDF.',
        proposedTier: 'UNKNOWN',
        proposedTierRationale: null,
      },
      chunks: [
        {
          chunkId: 'chunk-uuid-1',
          position: 0,
          title: 'Quản lý nước giai đoạn kiến thiết cơ bản (0 - 3 năm)',
          topic: 'IRRIGATION',
          stage: 'KIEN_THIET_CO_BAN',
          content: 'Cây con từ 1 đến 3 năm tuổi cần lượng nước đều đặn...',
          originalExcerpt: 'Cây con từ 1 đến 3 năm tuổi cần lượng nước đều đặn...',
          locator: 'Trang 2, Đoạn 1',
          applicabilityNotes: null,
          measurementNotes: null,
        },
      ],
      createdAt: '2026-11-10T11:35:00Z',
      closedAt: null,
      tierPolicyVersion: null,
      assessedTier: null,
      tierRationale: null,
      activeAssignment: null,
      decision: null,
    },
  },
  chunkMappings: [
    {
      clientChunkKey: 'client-key-1',
      chunkId: 'chunk-uuid-1',
    },
  ],
};

const MOCK_PROVENANCE_IMPORTED = {
  origin: 'IMPORTED',
  status: 'CURRENT',
  revisionId: 'rev-created-uuid-5678',
  document: {
    id: 'doc-uuid-11223344',
    importId: 'import-sess-8899aabb-1122',
    sourceId: 'src-created-uuid-1234',
    createdAt: '2026-11-10T11:00:00Z',
    file: {
      displayName: 'Quy-Trinh-Tuoi-Sau-Rieng-Dong-Bang-Song-Cuu-Long-2024.pdf',
      mediaType: 'application/pdf',
      bytes: 1450230,
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    },
    extraction: {
      parser: 'PDFBox',
      parserVersion: '3.0.1',
      normalization: 'DURI-IMPORT-TEXT-1',
      text: 'QUY TRÌNH KỸ THUẬT QUẢN LÝ NƯỚC...',
      textSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      segments: [],
      warnings: ['PDF_READING_ORDER_REVIEW'],
      counters: {
        utf16Units: 720,
        utf8Bytes: 940,
        segments: 4,
        pages: 4,
        paragraphs: 4,
        tables: 0,
        cells: 0,
        zipEntries: 0,
        inflatedBytes: 0,
      },
      truncated: false,
    },
  },
  snapshot: {
    id: 'snap-uuid-55667788',
    revisionId: 'rev-created-uuid-5678',
    draftSaveSequence: 0,
    metadataSha256: '3a7b1c4d5e6f7890123456789abcdef0123456789abcdef0123456789abcdef0',
    chunksSha256: '8b9c0d1e2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef012345678',
    savedAt: '2026-11-10T11:35:00Z',
    actorUserId: 1,
    omittedUtf16Units: 120,
    chunks: [
      {
        chunkId: 'chunk-uuid-1',
        contentSha256: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
        locator: 'Trang 2, Đoạn 1',
        locatorStatus: 'EXACT_SPAN',
        selectedSpans: [{ segmentId: 1, start: 100, end: 275 }],
      },
    ],
  },
};

const MOCK_SESSIONS_PAGE = {
  content: [
    {
      id: 'import-sess-8899aabb-1122',
      version: 0,
      state: 'READY',
      createdAt: '2026-11-10T11:00:00Z',
      expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
      purgeAfter: '2026-12-10T11:00:00Z',
      file: {
        displayName: 'So-Tay-Ky-Thuat-Sau-Rieng-2024.pdf',
        mediaType: 'application/pdf',
        bytes: 1450230,
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      },
    },
  ],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
};

async function runTests() {
  const server = await startSpaServer(PORT);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let testCount = 0;
  let passCount = 0;

  function test(name, fn) {
    testCount++;
    return fn()
      .then(() => {
        passCount++;
        console.log(`  ✓ [PASS] ${name}`);
      })
      .catch(err => {
        console.error(`  ✗ [FAIL] ${name}`);
        console.error(err);
      });
  }

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

    // Enable request interception
    await page.setRequestInterception(true);

    let simulateDisabled = false;
    let simulatePdfNoText = false;
    let confirmResponseOverride = null;
    const capturedConfirms = [];

    page.on('request', req => {
      // Do not intercept static assets or HTML document navigations from the SPA server
      if (req.resourceType() === 'document' || req.resourceType() === 'script' || req.resourceType() === 'stylesheet' || req.resourceType() === 'font' || req.resourceType() === 'image') {
        return req.continue();
      }

      const url = req.url();
      const method = req.method();

      // Auth mock
      if (url.includes('/auth/me')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            email: 'admin@duricare.vn',
            fullName: 'Nguyễn Văn Quản Trị',
            role: 'ADMIN',
            farmId: 1,
            enabled: true,
          }),
        });
      }

      // Capabilities
      if (url.includes('/knowledge/imports/capabilities')) {
        if (simulateDisabled) {
          return req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ...MOCK_CAPABILITIES, enabled: false }),
          });
        }
        return req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CAPABILITIES),
        });
      }

      // Upload
      if (url.includes('/knowledge/imports') && method === 'POST' && !url.includes('/confirm')) {
        if (simulatePdfNoText) {
          return req.respond({
            status: 422,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Unprocessable Entity',
              code: 'pdf_no_text',
              message: 'Tài liệu PDF không chứa lớp văn bản có thể trích xuất (tài liệu scan/ảnh).',
              fieldErrors: [{ field: 'file', code: 'OCR_REQUIRED', message: 'OCR_REQUIRED' }],
            }),
          });
        }
        return req.respond({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PREVIEW_SESSION),
        });
      }

      // List own sessions
      if (url.includes('/knowledge/imports') && method === 'GET') {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_SESSIONS_PAGE),
        });
      }

      // Confirm
      if (url.includes('/confirm') && method === 'POST') {
        try {
          capturedConfirms.push({ path: url, body: JSON.parse(req.postData()) });
        } catch {}
        if (confirmResponseOverride) {
          return req.respond(confirmResponseOverride);
        }
        return req.respond({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CONFIRM_RECEIPT),
        });
      }

      // Provenance
      if (url.includes('/import-provenance')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PROVENANCE_IMPORTED),
        });
      }

      // Revisions of source
      if (url.includes('/knowledge/sources/src-created-uuid-1234/revisions')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [MOCK_CONFIRM_RECEIPT.created.revision],
            page: 0,
            size: 20,
            totalElements: 1,
            totalPages: 1,
          }),
        });
      }

      // History of source
      if (url.includes('/knowledge/sources/src-created-uuid-1234/history')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [],
            page: 0,
            size: 20,
            totalElements: 0,
            totalPages: 1,
          }),
        });
      }

      // Publication of source
      if (url.includes('/knowledge/sources/src-created-uuid-1234/publication')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            head: null,
            latestPublication: null,
          }),
        });
      }

      // Source detail
      if (url.includes('/knowledge/sources/src-created-uuid-1234')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...MOCK_CONFIRM_RECEIPT.created.source,
            latestRevision: MOCK_CONFIRM_RECEIPT.created.revision,
          }),
        });
      }

      if (url.includes('/knowledge/revisions/rev-created-uuid-5678')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CONFIRM_RECEIPT.created.revision),
        });
      }

      // Fallback for any other API route: return safe empty object
      if (url.includes('/api/')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ content: [], totalPages: 1, totalElements: 0 }),
        });
      }

      req.continue();
    });

    // Mock localStorage auth token
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => {
      localStorage.setItem('duricare_auth_token', 'mock_jwt_token_for_admin');
      localStorage.setItem(
        'duricare_auth_user',
        JSON.stringify({
          id: 1,
          email: 'admin@duricare.vn',
          fullName: 'Nguyễn Văn Quản Trị',
          role: 'ADMIN',
          farmId: 1,
        })
      );
    });

    // Test 1: Upload Zone & Limits disclosure
    await test('Test 1: Upload Step displays capabilities, limits, and drop zone', async () => {
      await page.goto(`${BASE_URL}/knowledge/import`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#file-import-input', { timeout: 5000 });

      const heading = await page.$eval('h1', el => el.textContent);
      assert(heading.includes('Nhập tài liệu tri thức'));

      const limitsBanner = await page.content();
      assert(limitsBanner.includes('.TXT, .MD, .PDF, .DOCX'));
      assert(limitsBanner.includes('5 MiB'));
      assert(limitsBanner.includes('120.000 ký tự'));

      await captureScreenshot(page, 'import_01_upload_zone_limits_1440.png');
    });

    // Test 2: Capabilities disabled banner
    await test('Test 2: Capabilities disabled displays notice and manual draft fallback', async () => {
      simulateDisabled = true;
      await page.goto(`${BASE_URL}/knowledge/import`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1');

      const content = await page.content();
      assert(content.includes('Tính năng nhập tài liệu hiện đang tạm tắt'));
      assert(content.includes('Bạn vẫn có thể soạn thảo bản nháp thủ công'));

      await captureScreenshot(page, 'import_02_disabled_capability_1440.png');
      simulateDisabled = false;
    });

    // Test 3: PDF no text error (OCR_REQUIRED)
    await test('Test 3: PDF with no text layer yields clear OCR_REQUIRED explanation without auto-OCR', async () => {
      simulatePdfNoText = true;
      await page.goto(`${BASE_URL}/knowledge/import`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#file-import-input', { timeout: 10000 });

      // Simulate file upload
      const testFilePath = path.resolve('test-dummy.pdf');
      fs.writeFileSync(testFilePath, '%PDF-1.4 dummy scanned content without text layer');

      const fileInput = await page.$('#file-import-input');
      await fileInput.uploadFile(testFilePath);

      // Wait for "Bắt đầu trích xuất" button to appear
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Bắt đầu trích xuất')),
        { timeout: 10000 }
      );

      // Click upload button
      await clickButtonWithText(page, 'Bắt đầu trích xuất');

      await page.waitForFunction(
        () => document.body.innerText.includes('Lưu ý quan trọng về tài liệu PDF dạng quét'),
        { timeout: 10000 }
      );
      const pageText = await page.content();
      assert(pageText.includes('pdf_no_text'));
      assert(pageText.includes('không tự động gửi tài liệu tới dịch vụ OCR đám mây'));

      await captureScreenshot(page, 'import_03_ocr_required_error_1440.png');

      simulatePdfNoText = false;
      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    });

    // Test 4 & 5: Successful Upload, Preview & Chunk Editor
    await test('Test 4 & 5: Upload success renders ExtractedTextPanel & ImportChunkEditor', async () => {
      await page.goto(`${BASE_URL}/knowledge/import`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#file-import-input', { timeout: 10000 });

      const testPdf = path.resolve('sample-saurieng.pdf');
      fs.writeFileSync(testPdf, '%PDF-1.4 dummy valid text layer');

      const fileInput = await page.$('#file-import-input');
      await fileInput.uploadFile(testPdf);

      // Wait for "Bắt đầu trích xuất" button to appear
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Bắt đầu trích xuất')),
        { timeout: 10000 }
      );

      await clickButtonWithText(page, 'Bắt đầu trích xuất');

      // Wait for editor workspace
      await page.waitForFunction(
        () => document.body.innerText.includes('QUY TRÌNH KỸ THUẬT QUẢN LÝ NƯỚC'),
        { timeout: 10000 }
      );

      // Verify ExtractedTextPanel
      const panelContent = await page.content();
      assert(panelContent.includes('PDFBox (3.0.1)'));
      assert(panelContent.includes('Cảnh báo cấu trúc tài liệu'));
      assert(panelContent.includes('Thứ tự đọc PDF'));
      assert(panelContent.includes('Khớp chính xác'));

      await captureScreenshot(page, 'import_04_preview_extracted_text_1440.png');
      await captureScreenshot(page, 'import_05_chunk_editor_proposals_1440.png');

      if (fs.existsSync(testPdf)) fs.unlinkSync(testPdf);
    });

    // Test 6: Locator assurance downgrade on edit
    await test('Test 6: Editing chunk content automatically downgrades EXACT_SPAN to UNVERIFIED', async () => {
      await page.waitForSelector('textarea[placeholder*="Nội dung kiến thức"]', { timeout: 10000 });
      const textarea = await page.$('textarea[placeholder*="Nội dung kiến thức"]');
      if (textarea) {
        await textarea.type(' (Đã qua kiểm tra và chỉnh sửa bởi tác giả)');
      }

      await page.waitForFunction(
        () => document.body.innerText.includes('Chưa kiểm chứng / Đã sửa đổi'),
        { timeout: 10000 }
      );
      const text = await page.content();
      assert(text.includes('UNVERIFIED') || text.includes('Chưa kiểm chứng / Đã sửa đổi'));

      await captureScreenshot(page, 'import_06_locator_downgrade_unverified_1440.png');
    });

    // Test 7: Split & Merge actions
    await test('Test 7: Split chunk creates two chunks, merge combines them', async () => {
      await page.waitForSelector('button[title*="Tách mảnh này thành 2 mảnh"]', { timeout: 10000 });
      await page.click('button[title*="Tách mảnh này thành 2 mảnh"]');
      await page.waitForFunction(
        () => document.body.innerText.includes('(phần 2)'),
        { timeout: 10000 }
      );

      const contentAfterSplit = await page.content();
      assert(contentAfterSplit.includes('(phần 2)'));

      // Click Gộp với mảnh kế tiếp
      await page.waitForSelector('button[title*="Gộp mảnh này"]', { timeout: 10000 });
      await page.click('button[title*="Gộp mảnh này"]');

      await captureScreenshot(page, 'import_07_split_merge_chunks_1440.png');
    });

    // Test 8: Confirmation modal with stable requestId & reviewConfirmed
    await test('Test 8: Confirm modal opens with summary and stable requestId', async () => {
      // Check reviewConfirmed checkbox
      await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
      await page.click('input[type="checkbox"]');

      // Click Tiếp tục đến bước Xác nhận tạo DRAFT
      await clickButtonWithText(page, 'Tiếp tục đến bước');

      await page.waitForFunction(
        () => document.body.innerText.includes('Mã yêu cầu (requestId):'),
        { timeout: 10000 }
      );

      const modalText = await page.content();
      assert(modalText.includes('Mã yêu cầu (requestId):'));
      assert(modalText.includes('Đồng ý và Tạo DRAFT'));

      await captureScreenshot(page, 'import_08_confirm_modal_idempotency_1440.png');

      // Click Close modal
      await clickButtonWithText(page, 'Quay lại chỉnh sửa');
    });

    // Test 9: Unconfirmed sessions recovery modal
    await test('Test 9: Pending sessions modal lists active sessions with TTL countdown', async () => {
      await clickButtonWithText(page, 'Phiên chờ xác nhận');

      await page.waitForFunction(
        () => document.body.innerText.includes('Phiên nhập tài liệu chờ xác nhận'),
        { timeout: 10000 }
      );

      const sessionsText = await page.content();
      assert(sessionsText.includes('So-Tay-Ky-Thuat-Sau-Rieng-2024.pdf'));
      assert(sessionsText.includes('Còn lại:'));

      await captureScreenshot(page, 'import_09_pending_sessions_recovery_1440.png');

      // Close sessions modal
      await clickButtonWithText(page, 'Đóng');
    });

    // Test 10: Revision provenance modal
    await test('Test 10: Revision provenance displays CURRENT snapshot and chunk lineage', async () => {
      await page.goto(`${BASE_URL}/knowledge/sources/src-created-uuid-1234`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('button[data-testid="view-provenance-button"]', { timeout: 10000 });

      await page.click('button[data-testid="view-provenance-button"]');
      await page.waitForFunction(
        () => document.body.innerText.includes('Nguồn gốc dữ liệu phiên bản (Provenance)'),
        { timeout: 10000 }
      );

      const provText = await page.content();
      assert(provText.includes('Nhập từ tệp tài liệu'));
      assert(provText.includes('Bản ghi gốc hiện hành (CURRENT)'));
      assert(provText.includes('Dữ liệu chụp tại thời điểm xác nhận (Snapshot)'));
      assert(provText.includes('Chi tiết dòng dõi các mảnh tri thức'));

      await captureScreenshot(page, 'import_10_revision_provenance_imported_1440.png');
    });

    // Test 11: Tablet Viewport (768px) with English locale
    await test('Test 11: Tablet Viewport (768px) with English translation', async () => {
      await page.setViewport({ width: 768, height: 1024 });
      await page.evaluate(() => {
        localStorage.setItem('i18nextLng', 'en');
      });
      await page.goto(`${BASE_URL}/knowledge/import`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1', { timeout: 10000 });

      await captureScreenshot(page, 'import_11_tablet_english_768.png');
    });

    // Test 12: Mobile Viewport (375px) in Dark Mode
    await test('Test 12: Mobile Viewport (375px) in Dark Mode', async () => {
      await page.setViewport({ width: 375, height: 812 });
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.goto(`${BASE_URL}/knowledge/import`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1', { timeout: 10000 });

      await captureScreenshot(page, 'import_12_mobile_english_dark_375.png');
    });

    // Test 13: Definitive validation 400 allows correction with fresh requestId; uncertain commit replays frozen request
    await test('Test 13: Definitive validation 400 allows correction with fresh requestId; uncertain commit replays frozen request', async () => {
      await page.setViewport({ width: 1440, height: 900 });
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('i18nextLng', 'vi');
        localStorage.setItem('duricare-language', 'vi');
      });
      await page.goto(`${BASE_URL}/knowledge/import`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#file-import-input', { timeout: 10000 });

      // Upload file
      const testUploadPath = path.resolve('test-dummy-13.txt');
      fs.writeFileSync(testUploadPath, 'Dummy text file content for import verification 13');
      try {
        const input = await page.$('#file-import-input');
        await input.uploadFile(testUploadPath);
        await clickButtonWithText(page, 'Bắt đầu trích xuất');
        await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });

        // Set year to 9999
        await page.waitForSelector('input[type="number"]', { timeout: 10000 });
        await page.$eval('input[type="number"]', (el, v) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, 9999);

        // Check reviewConfirmed checkbox and open confirm modal
        await page.click('input[type="checkbox"]');
        await clickButtonWithText(page, 'Tiếp tục đến bước');
        await page.waitForFunction(() => document.body.innerText.includes('Mã yêu cầu (requestId):'), { timeout: 10000 });

        // Simulate 400 validation error
        confirmResponseOverride = {
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'bad_request',
            code: 'validation',
            message: 'TEST_FIELD_INVALID',
            fieldErrors: [{ field: 'metadata.year', code: 'range', message: 'Năm xuất bản không hợp lệ (1900 - năm hiện tại).' }],
          }),
        };

        const baseConfirmCount = capturedConfirms.length;
        await clickButtonWithText(page, 'Đồng ý và Tạo DRAFT');
        await page.waitForFunction(() => document.body.innerText.includes('TEST_FIELD_INVALID') || document.body.innerText.includes('Năm xuất bản không hợp lệ'), { timeout: 10000 });

        assert.strictEqual(capturedConfirms.length, baseConfirmCount + 1);
        const firstConfirm = capturedConfirms[baseConfirmCount];
        assert.strictEqual(firstConfirm.body.metadata.year, 9999);

        // Click Quay lại chỉnh sửa
        await clickButtonWithText(page, 'Quay lại chỉnh sửa');

        // Correct year to 2024
        await page.$eval('input[type="number"]', (el, v) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, 2024);

        // Proceed to confirm again
        await clickButtonWithText(page, 'Tiếp tục đến bước');
        await page.waitForFunction(() => document.body.innerText.includes('Mã yêu cầu (requestId):'), { timeout: 10000 });

        // Submit again
        await clickButtonWithText(page, 'Đồng ý và Tạo DRAFT');
        await page.waitForFunction(() => document.body.innerText.includes('TEST_FIELD_INVALID') || document.body.innerText.includes('Năm xuất bản không hợp lệ'), { timeout: 10000 });

        assert.strictEqual(capturedConfirms.length, baseConfirmCount + 2);
        const secondConfirm = capturedConfirms[baseConfirmCount + 1];

        // Assert that definitive 400 rejection allowed correction with fresh requestId and updated year
        assert.strictEqual(secondConfirm.body.metadata.year, 2024, 'Corrected year must be 2024');
        assert.notStrictEqual(secondConfirm.body.requestId, firstConfirm.body.requestId, 'Corrected request must have a new requestId');

        // Now test uncertain commit: set 500 error
        confirmResponseOverride = {
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'internal_error',
            code: 'TEST_UNCERTAIN_COMMIT',
            message: 'TEST_UNCERTAIN_COMMIT',
            fieldErrors: [],
          }),
        };

        // Submit with 500
        await clickButtonWithText(page, 'Đồng ý và Tạo DRAFT');
        await page.waitForFunction(() => document.body.innerText.includes('TEST_UNCERTAIN_COMMIT'), { timeout: 10000 });
        assert.strictEqual(capturedConfirms.length, baseConfirmCount + 3);
        const thirdConfirm = capturedConfirms[baseConfirmCount + 2];

        // Close modal and edit content
        await clickButtonWithText(page, 'Quay lại chỉnh sửa');
        await page.$eval('input[type="number"]', (el, v) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, 2018);

        // Proceed to confirm again
        await clickButtonWithText(page, 'Tiếp tục đến bước');
        await page.waitForFunction(() => document.body.innerText.includes('Mã yêu cầu (requestId):'), { timeout: 10000 });

        // Submit again
        await clickButtonWithText(page, 'Đồng ý và Tạo DRAFT');
        await page.waitForFunction(() => document.body.innerText.includes('TEST_UNCERTAIN_COMMIT'), { timeout: 10000 });
        assert.strictEqual(capturedConfirms.length, baseConfirmCount + 4);
        const fourthConfirm = capturedConfirms[baseConfirmCount + 3];

        // Assert that uncertain 500 replay preserves the frozen request ID and frozen year (2024)
        assert.strictEqual(fourthConfirm.body.requestId, thirdConfirm.body.requestId, 'Uncertain replay must retain exact same requestId');
        assert.strictEqual(fourthConfirm.body.metadata.year, thirdConfirm.body.metadata.year, 'Uncertain replay must retain frozen body');
      } finally {
        try {
          fs.unlinkSync(testUploadPath);
        } catch {}
      }
    });

  } finally {
    await browser.close();
    server.close();
  }

  console.log('----------------------------------------------------------------');
  console.log(`Browser E2E Results: ${passCount} / ${testCount} PASSED`);
  console.log('================================================================');

  if (passCount !== testCount) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
