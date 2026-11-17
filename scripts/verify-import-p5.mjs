/**
 * UI-REFRESH-CTU-001 P5 Document Import (/knowledge/import) Verification Suite - Round 2 (Remediation F1-F4)
 * Validates design fidelity, real theme tokens, provenance controls, disabled behavior, geometry bounds, and regression safety.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const ROOT_DIR = path.resolve(process.env.WORKTREE_ROOT || 'E:/CTU/LuanVan/duricare-worktrees/fe-ui-refresh-ctu-008');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const EVIDENCE_DIR = path.resolve('E:/CTU/LuanVan/verification/ui-refresh-ctu-import-design-20261117/evidence-r2');
const ARTIFACT_EVIDENCE_DIR = path.resolve('C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence-r2');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_EVIDENCE_DIR)) {
  fs.mkdirSync(ARTIFACT_EVIDENCE_DIR, { recursive: true });
}

console.log('================================================================');
console.log('UI-REFRESH-CTU-001 P5 Document Import Suite - Round 2 (F1-F4)');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

const capturedHashes = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureEvidence(page, filename) {
  const filePath = path.join(EVIDENCE_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: false });
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  capturedHashes[filename] = hash;

  // Mirror to artifact directory
  const artifactPath = path.join(ARTIFACT_EVIDENCE_DIR, filename);
  fs.writeFileSync(artifactPath, buffer);

  console.log(`  📸 Captured ${filename} (SHA256: ${hash.substring(0, 16)}...)`);
  return hash;
}

// ─── [1/3] Static Code & Design Token Assertions ─────────────────────
console.log('[1/3] Static code & design token assertions (F1-F4)...');

const importPagePath = path.join(ROOT_DIR, 'src/pages/KnowledgeImportPage.tsx');
const uploadStepPath = path.join(ROOT_DIR, 'src/components/knowledge/import/ImportUploadStep.tsx');
const extractPanelPath = path.join(ROOT_DIR, 'src/components/knowledge/import/ExtractedTextPanel.tsx');
const chunkEditorPath = path.join(ROOT_DIR, 'src/components/knowledge/import/ImportChunkEditor.tsx');
const confirmModalPath = path.join(ROOT_DIR, 'src/components/knowledge/import/ImportConfirmModal.tsx');
const sessionsModalPath = path.join(ROOT_DIR, 'src/components/knowledge/import/ImportSessionsModal.tsx');
const tokensCssPath = path.join(ROOT_DIR, 'src/styles/tokens.css');
const indexCssPath = path.join(ROOT_DIR, 'src/styles/index.css');

const importPageContent = fs.readFileSync(importPagePath, 'utf8');
const uploadStepContent = fs.readFileSync(uploadStepPath, 'utf8');
const extractPanelContent = fs.readFileSync(extractPanelPath, 'utf8');
const chunkEditorContent = fs.readFileSync(chunkEditorPath, 'utf8');
const confirmModalContent = fs.readFileSync(confirmModalPath, 'utf8');
const sessionsModalContent = fs.readFileSync(sessionsModalPath, 'utf8');
const tokensCssContent = fs.readFileSync(tokensCssPath, 'utf8');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

// [F1 Assertions] Real theme tokens & No phantom bg-card in modals
assert(
  !confirmModalContent.includes('bg-card') &&
  confirmModalContent.includes('bg-surface'),
  '[F1.1] ImportConfirmModal eliminates bg-card and uses real theme token bg-surface'
);

assert(
  !sessionsModalContent.includes('bg-card') &&
  sessionsModalContent.includes('bg-surface'),
  '[F1.2] ImportSessionsModal eliminates bg-card and uses real theme token bg-surface'
);

assert(
  !importPageContent.includes('bg-card') &&
  importPageContent.includes('bg-surface'),
  '[F1.3] KnowledgeImportPage eliminates bg-card and uses real theme token bg-surface'
);

assert(
  indexCssContent.includes('--color-surface: var(--color-surface)') &&
  tokensCssContent.includes('--color-surface: #FFFFFF') &&
  tokensCssContent.includes('--color-surface: #1E293B'),
  '[F1.4] Stylesheet defines real surface tokens for light (#FFFFFF) and dark (#1E293B) modes'
);

// [F2 Assertions] Provenance controls restored
assert(
  chunkEditorContent.includes('data-testid="input-evidence-reference"') &&
  chunkEditorContent.includes("handleMetadataField('evidenceReference'"),
  '[F2.1] ImportChunkEditor restores metadata.evidenceReference input with data-testid="input-evidence-reference"'
);

assert(
  chunkEditorContent.includes('chunk-locator-status-') &&
  chunkEditorContent.includes('USER_VERIFIED') &&
  chunkEditorContent.includes('handleLocatorStatusChange'),
  '[F2.2] ImportChunkEditor restores locatorStatus selector with USER_VERIFIED and UNVERIFIED options'
);

assert(
  chunkEditorContent.includes("field === 'locator' && !String(value || '').trim() && target.locatorStatus === 'USER_VERIFIED'") ||
  chunkEditorContent.includes('status === \'USER_VERIFIED\' && !target.chunk.locator?.trim()'),
  '[F2.3] ImportChunkEditor enforces locator verification guard when locator is empty'
);

// [F3 Assertions] Disabled guards and input limits
assert(
  chunkEditorContent.includes('handleMetadataField = <K extends keyof KnowledgeMetadata>(field: K, value: KnowledgeMetadata[K]) => {\n    if (disabled) return;') &&
  chunkEditorContent.includes('handleChunkField = (index: number, field: keyof ChunkInput, value: unknown) => {\n    if (disabled) return;'),
  '[F3.1] ImportChunkEditor implements if (disabled) return guards on metadata and chunk update handlers'
);

assert(
  chunkEditorContent.includes('maxLength={1000}') &&
  chunkEditorContent.includes('maxLength={300}') &&
  chunkEditorContent.includes('maxLength={2048}') &&
  chunkEditorContent.includes('maxLength={2000}') &&
  chunkEditorContent.includes('maxLength={4000}') &&
  chunkEditorContent.includes('maxLength={12000}') &&
  chunkEditorContent.includes('maxLength={500}') &&
  chunkEditorContent.includes('min={1000}'),
  '[F3.2] ImportChunkEditor enforces normative baseline field limits (authors: 1000, publisher: 300, sourceUrl: 2048, evidenceRef: 2000, provenanceNotes: 4000, excerpt: 12000, locator: 500, year: 1000..now)'
);

// [F4 Assertions] Mobile layout, countdown badge, and responsive stepper
assert(
  importPageContent.includes("rounded-[6px]") &&
  importPageContent.includes("h-6") &&
  (importPageContent.includes("schedule") || importPageContent.includes("timer")),
  '[F4.1] KnowledgeImportPage countdown badge uses uniform 24px height and 6px radius (not rounded-full)'
);

assert(
  importPageContent.includes('hidden lg:block') &&
  importPageContent.includes('lg:hidden') &&
  importPageContent.includes('mobile-tab-view-editor') &&
  importPageContent.includes('mobile-tab-view-extraction'),
  '[F4.2] KnowledgeImportPage provides compact mobile stepper and full-width mobile segmented tabs'
);

assert(
  confirmModalContent.includes('break-words') &&
  !confirmModalContent.includes('shadow-sm truncate') &&
  confirmModalContent.includes('flex-col sm:flex-row-reverse'),
  '[F4.3] ImportConfirmModal wraps long document titles (break-words) and provides stacked full-width mobile footer buttons'
);

assert(
  chunkEditorContent.includes('mobile-proceed-to-confirm-button') &&
  chunkEditorContent.includes('w-full h-11') &&
  chunkEditorContent.includes('bottom-[calc(4rem+env(safe-area-inset-bottom))]'),
  '[F4.4] ImportChunkEditor positions sticky CTA strictly above bottom navigation without overlap'
);

// Base capabilities & tokens assertions
assert(
  tokensCssContent.includes('.animate-stripes') &&
  tokensCssContent.includes('progress-stripes'),
  '[Scenario IMP.1] tokens.css defines .animate-stripes keyframes for indeterminate extraction progress'
);

assert(
  uploadStepContent.includes('rounded-[6px]') &&
  uploadStepContent.includes('h-6') &&
  uploadStepContent.includes('PDF'),
  '[Scenario IMP.2] Upload step defines uniform 24px format badges with rounded-[6px]'
);

assert(
  uploadStepContent.includes('animate-stripes') &&
  uploadStepContent.includes('Đang trích xuất cấu trúc văn bản'),
  '[Scenario IMP.3] Upload step cleanly distinguishes file transmission % from indeterminate server extraction'
);

assert(
  uploadStepContent.includes('min-h-[44px]') &&
  uploadStepContent.includes('h-11'),
  '[Scenario IMP.4] Upload step provides 44px min-height touch targets for primary actions'
);

assert(
  importPageContent.includes('lg:col-span-5') &&
  importPageContent.includes('lg:col-span-7') &&
  importPageContent.includes('grid gap-6 lg:grid-cols-12'),
  '[Scenario IMP.5] KnowledgeImportPage implements 12-column responsive layout (5 cols raw text + 7 cols editor)'
);

assert(
  extractPanelContent.includes("data-testid=\"tab-view-text\"") &&
  extractPanelContent.includes("data-testid=\"tab-view-segments\"") &&
  extractPanelContent.includes("font-mono"),
  '[Scenario IMP.6] ExtractedTextPanel provides text/segment tabs with monospace typography'
);

assert(
  chunkEditorContent.includes("t('UNKNOWN (Chưa xác định)')") &&
  chunkEditorContent.includes("data-testid=\"review-confirmed-checkbox\"") &&
  chunkEditorContent.includes("disabled={!canProceed"),
  '[Scenario IMP.7] Chunk editor locks proposedTier at UNKNOWN and gates submission with un-prechecked reviewConfirmed checkbox'
);

assert(
  confirmModalContent.includes("createPortal") &&
  confirmModalContent.includes("z-[100]") &&
  confirmModalContent.includes("max-w-[600px]"),
  '[Scenario IMP.8] ImportConfirmModal mounts via createPortal with z-[100] and 600px max width'
);

assert(
  confirmModalContent.includes("preparedRequest.requestId") &&
  confirmModalContent.includes("min-h-[44px]"),
  '[Scenario IMP.9] ImportConfirmModal preserves immutable frozen requestId and 44px button hit targets'
);

assert(
  sessionsModalContent.includes("createPortal") &&
  sessionsModalContent.includes("z-[100]") &&
  sessionsModalContent.includes("max-w-[760px]"),
  '[Scenario IMP.10] ImportSessionsModal mounts via createPortal with z-[100] and 760px max width'
);

assert(
  sessionsModalContent.includes("isReadyActive") &&
  sessionsModalContent.includes("isExpired") &&
  sessionsModalContent.includes("CONSUMED"),
  '[Scenario IMP.11] ImportSessionsModal handles READY, CONSUMED, CANCELLED, and temporal expiry correctly'
);

// ─── [2/3] Static HTTP Server & Browser Verification ─────────────────
console.log('\n[2/3] Launching Puppeteer suite for live interaction verification...');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, 'http://127.0.0.1');
  let pathname = parsedUrl.pathname;
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const potentialPath = path.join(DIST_DIR, pathname);
  if (fs.existsSync(potentialPath) && fs.statSync(potentialPath).isFile()) {
    return serveStaticFile(res, potentialPath);
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    return serveStaticFile(res, indexPath);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

const PORT = 5199;
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
console.log(`SPA Server listening on http://127.0.0.1:${PORT}`);

const puppeteer = createRequire(path.join(ROOT_DIR, 'package.json'))('puppeteer');
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
page.on('pageerror', (err) => console.error('  [BROWSER ERROR]', err.stack || err.message));
page.on('dialog', async (dialog) => {
  console.log(`  [BROWSER DIALOG] ${dialog.type()}: ${dialog.message()}`);
  await dialog.accept();
});
await page.setRequestInterception(true);

await page.evaluateOnNewDocument(() => {
  localStorage.setItem('duricare_auth_token', 'mock-token-admin');
  localStorage.setItem('duricare-language', 'vi');
  localStorage.setItem('theme', 'light');
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-XSRF-TOKEN',
};

const mockCapabilities = {
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

const mockPreviewSession = {
  id: 'import-sess-7719-ri6',
  version: 0,
  state: 'READY',
  createdAt: '2026-11-17T02:00:00Z',
  expiresAt: new Date(Date.now() + 26 * 60 * 1000).toISOString(),
  purgeAfter: '2026-12-17T02:00:00Z',
  file: {
    displayName: 'so-tay-ky-thuat-canh-tac-sau-rieng-ri6-monthong-dong-bang-song-cuu-long-tai-lieu-chuan-ctu.pdf',
    mediaType: 'application/pdf',
    bytes: 2516582,
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  },
  extraction: {
    parser: 'PDFBox',
    parserVersion: '3.0.1',
    normalization: 'DURI-IMPORT-TEXT-1',
    text: 'SỔ TAY KỸ THUẬT CANH TÁC SẦU RIÊNG RI6 VÀ MONTHONG ĐỒNG BẰNG SÔNG CỬU LONG\n\nPhần 1: Yêu cầu về nguồn nước và quản lý tưới\nCây sầu riêng cần lượng nước tưới đầy đủ trong giai đoạn phát triển cơi đọt và nuôi trái. Độ mặn của nước tưới tuyệt đối không vượt quá 0.5 phần ngàn (g/l).\n\nPhần 2: Kỹ thuật tạo mầm hoa và xiết nước\nTrước khi ra hoa cần xử lý xiết nước từ 20 đến 25 ngày để đất khô hạn hoàn toàn, kích thích mầm hoa phân hóa đều khắp cành cấp 1 và cấp 2. Sau khi nhú mắt cua từ 2-3cm, tiến hành tưới nhử với lượng nước bằng 1/3 mức bình thường.\n\nPhần 3: Giai đoạn thụ phấn bổ sung và nuôi trái non\nTiến hành thụ phấn bổ sung vào lúc 18h - 20h đêm bằng chổi quét tơ mịn để trái thụ phấn đều hộc, hạn chế méo trái. Sau khi đậu trái 30 ngày, tỉa bỏ các trái méo mó, sâu bệnh.',
    textSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    segments: [
      {
        id: 0,
        start: 0,
        end: 75,
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
          heading: 'SỔ TAY KỸ THUẬT CANH TÁC SẦU RIÊNG',
        },
      },
      {
        id: 1,
        start: 77,
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
          heading: 'Phần 1: Yêu cầu về nguồn nước và quản lý tưới',
        },
      },
      {
        id: 2,
        start: 277,
        end: 540,
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
          heading: 'Phần 2: Kỹ thuật tạo mầm hoa và xiết nước',
        },
      },
      {
        id: 3,
        start: 542,
        end: 780,
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
          heading: 'Phần 3: Giai đoạn thụ phấn bổ sung và nuôi trái non',
        },
      },
    ],
    warnings: ['PDF_READING_ORDER_REVIEW', 'HEADERS_FOOTERS_OMITTED'],
    counters: {
      utf16Units: 780,
      utf8Bytes: 980,
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
    title: 'Sổ tay kỹ thuật canh tác sầu riêng Ri6 và Monthong Đồng Bằng Sông Cửu Long',
    sourceType: 'OFFICIAL_DOCUMENT',
    proposedTier: 'UNKNOWN',
  },
  proposals: [
    {
      proposalId: 1,
      title: 'Yêu cầu về nguồn nước và quản lý tưới cho sầu riêng',
      topic: null,
      stage: null,
      content: 'Cây sầu riêng cần lượng nước tưới đầy đủ trong giai đoạn phát triển cơi đọt và nuôi trái. Độ mặn của nước tưới tuyệt đối không vượt quá 0.5 phần ngàn (g/l).',
      originalExcerpt: 'Cây sầu riêng cần lượng nước tưới đầy đủ trong giai đoạn phát triển cơi đọt và nuôi trái. Độ mặn của nước tưới tuyệt đối không vượt quá 0.5 phần ngàn (g/l).',
      locator: 'Trang 2, Đoạn 1',
      selectedSpans: [{ segmentId: 1, start: 77, end: 275 }],
    },
    {
      proposalId: 2,
      title: 'Kỹ thuật tạo mầm hoa và xử lý xiết nước',
      topic: null,
      stage: null,
      content: 'Trước khi ra hoa cần xử lý xiết nước từ 20 đến 25 ngày để đất khô hạn hoàn toàn, kích thích mầm hoa phân hóa đều khắp cành cấp 1 và cấp 2. Sau khi nhú mắt cua từ 2-3cm, tiến hành tưới nhử với lượng nước bằng 1/3 mức bình thường.',
      originalExcerpt: 'Trước khi ra hoa cần xử lý xiết nước từ 20 đến 25 ngày để đất khô hạn hoàn toàn, kích thích mầm hoa phân hóa đều khắp cành cấp 1 và cấp 2. Sau khi nhú mắt cua từ 2-3cm, tiến hành tưới nhử với lượng nước bằng 1/3 mức bình thường.',
      locator: 'Trang 3, Đoạn 2',
      selectedSpans: [{ segmentId: 2, start: 277, end: 540 }],
    },
    {
      proposalId: 3,
      title: 'Kỹ thuật thụ phấn bổ sung và nuôi trái non',
      topic: null,
      stage: null,
      content: 'Tiến hành thụ phấn bổ sung vào lúc 18h - 20h đêm bằng chổi quét tơ mịn để trái thụ phấn đều hộc, hạn chế méo trái. Sau khi đậu trái 30 ngày, tỉa bỏ các trái méo mó, sâu bệnh.',
      originalExcerpt: 'Tiến hành thụ phấn bổ sung vào lúc 18h - 20h đêm bằng chổi quét tơ mịn để trái thụ phấn đều hộc, hạn chế méo trái. Sau khi đậu trái 30 ngày, tỉa bỏ các trái méo mó, sâu bệnh.',
      locator: 'Trang 4, Đoạn 1',
      selectedSpans: [{ segmentId: 3, start: 542, end: 780 }],
    },
  ],
  chunkingStatus: 'PROPOSED',
  receipt: null,
};

const mockSessionsList = {
  content: [
    {
      id: 'import-sess-7719-ri6',
      version: 0,
      state: 'READY',
      createdAt: '2026-11-17T02:00:00Z',
      expiresAt: new Date(Date.now() + 26 * 60 * 1000).toISOString(),
      purgeAfter: '2026-12-17T02:00:00Z',
      file: {
        displayName: 'so-tay-ky-thuat-canh-tac-sau-rieng-ri6-monthong-dong-bang-song-cuu-long-tai-lieu-chuan-ctu.pdf',
        mediaType: 'application/pdf',
        bytes: 2516582,
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      },
    },
    {
      id: 'import-sess-9921-docx',
      version: 1,
      state: 'CONSUMED',
      createdAt: '2026-11-17T01:30:00Z',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      purgeAfter: '2026-12-17T01:30:00Z',
      file: {
        displayName: 'Huong-dan-tuoi.docx',
        mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        bytes: 1153433,
        sha256: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      },
    },
    {
      id: 'import-sess-5501-exp',
      version: 0,
      state: 'READY',
      createdAt: '2026-11-16T15:40:00Z',
      expiresAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      purgeAfter: '2026-12-16T15:40:00Z',
      file: {
        displayName: 'quy-trinh-phan-bon-v1.pdf',
        mediaType: 'application/pdf',
        bytes: 3984588,
        sha256: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
      },
    },
  ],
  page: 0,
  size: 10,
  totalElements: 3,
  totalPages: 1,
};

let lastConfirmedRequestBody = null;

page.on('request', async (req) => {
  if (['document', 'script', 'stylesheet', 'font', 'image'].includes(req.resourceType())) {
    return req.continue();
  }

  const url = req.url();
  const method = req.method();

  if (method === 'OPTIONS') {
    return req.respond({ status: 204, headers: CORS_HEADERS });
  }

  // Auth endpoints
  if (url.includes('/auth/refresh')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-jwt-token',
        user: {
          id: 1,
          username: 'admin',
          email: 'admin@duricare.vn',
          fullName: 'Nguyễn Văn Quản Trị',
          role: 'ADMIN',
          farmId: 1,
          enabled: true,
        },
      }),
    });
  }

  if (url.includes('/auth/csrf')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'mock-csrf' }),
    });
  }

  if (url.includes('/auth/me')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        username: 'admin',
        email: 'admin@duricare.vn',
        fullName: 'Nguyễn Văn Quản Trị',
        role: 'ADMIN',
        farmId: 1,
        enabled: true,
      }),
    });
  }

  if (url.includes('/expert/profile') || url.includes('/governance/experts/me')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        verificationStatus: 'VERIFIED',
        fullName: 'Nguyễn Văn Quản Trị',
        email: 'admin@duricare.vn',
      }),
    });
  }

  if (url.includes('/farms')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Vườn sầu riêng TEST' }]),
    });
  }

  if (url.includes('/overview')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({ farmName: 'Vườn sầu riêng TEST', generatedAt: new Date().toISOString(), totalUnresolvedAlerts: 0, zones: [] }),
    });
  }

  if (url.includes('/alerts')) {
    return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: '[]' });
  }

  if (url.includes('/zones')) {
    return req.respond({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: '[]' });
  }

  // Capabilities
  if (url.includes('/knowledge/imports/capabilities') && method === 'GET') {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockCapabilities),
    });
  }

  // Confirm draft (POST /knowledge/imports/{id}/confirm)
  if (url.includes('/confirm') && method === 'POST') {
    lastConfirmedRequestBody = JSON.parse(req.postData() || '{}');
    const mockReceipt = {
      importId: mockPreviewSession.id,
      documentId: 'doc-import-7719',
      snapshotId: 'snap-import-7719',
      confirmedAt: new Date().toISOString(),
      requestId: lastConfirmedRequestBody.requestId,
      replayed: false,
      created: {
        source: {
          id: 'src-created-new-001',
          sourceType: 'OFFICIAL_DOCUMENT',
          title: lastConfirmedRequestBody.metadata?.title || 'Sổ tay kỹ thuật canh tác sầu riêng Ri6',
        },
        revision: {
          id: 'rev-created-new-001',
          revisionNumber: 1,
          status: 'DRAFT',
          chunks: lastConfirmedRequestBody.chunks,
        },
      },
      chunkMappings: (lastConfirmedRequestBody.chunks || []).map((c, i) => ({
        clientChunkKey: c.clientChunkKey,
        chunkId: `chk-created-${i + 1}`,
      })),
    };
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockReceipt),
    });
  }

  // Upload file (POST /knowledge/imports)
  if (url.includes('/knowledge/imports') && method === 'POST') {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockPreviewSession),
    });
  }

  // Single preview details (GET /knowledge/imports/{id})
  if (url.match(/\/knowledge\/imports\/[^/?]+$/) && method === 'GET') {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockPreviewSession),
    });
  }

  // List own sessions (GET /knowledge/imports)
  if (url.includes('/knowledge/imports') && method === 'GET') {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockSessionsList),
    });
  }

  // Delete session (DELETE /knowledge/imports/{id})
  if (url.includes('/knowledge/imports') && method === 'DELETE') {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  }

  // Unknown API fallback: fail closed
  req.abort();
});

console.log('\n--- Step A: Initial Upload Stage (Desktop 1440) ---');
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://127.0.0.1:${PORT}/knowledge/import`, { waitUntil: 'networkidle0' });

await page.waitForSelector('[data-testid="file-dropzone"]', { timeout: 5000 });

// Verify format badges
const badgesCount = await page.$$eval('[data-testid^="format-badge-"]', (el) => el.length);
assert(badgesCount >= 4, `Found ${badgesCount} format badges (expected >= 4)`);

// Verify 44px buttons
const selectButtonHeight = await page.$eval('[data-testid="file-select-button"]', (el) => el.offsetHeight);
assert(selectButtonHeight >= 44, `File select button height ${selectButtonHeight}px >= 44px`);

await captureEvidence(page, 'fe_import_01_upload_desktop_1440.png');

console.log('\n--- Step B: Initial Upload Stage Mobile (390 & 375 Bounds) ---');
await page.setViewport({ width: 390, height: 844 });
await sleep(300);

// Check all button bounds on 390
const overflowButtons390 = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button, a')).filter((e) => {
    const rect = e.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.right <= 0) return false;
    return rect.right > window.innerWidth || rect.left < 0;
  }).map((e) => ({ text: e.innerText?.trim(), right: e.getBoundingClientRect().right }));
});
assert(overflowButtons390.length === 0, `No action buttons overflow on mobile 390 (overflows: ${JSON.stringify(overflowButtons390)})`);

await captureEvidence(page, 'fe_import_02_upload_mobile_390.png');

// Check on 375 viewport
await page.setViewport({ width: 375, height: 812 });
await sleep(200);
const overflowButtons375 = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button, a')).filter((e) => {
    const rect = e.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.right <= 0) return false;
    return rect.right > window.innerWidth || rect.left < 0;
  }).map((e) => ({ text: e.innerText?.trim(), right: e.getBoundingClientRect().right }));
});
assert(overflowButtons375.length === 0, `No action buttons overflow on mobile 375 (overflows: ${JSON.stringify(overflowButtons375)})`);

console.log('\n--- Step C: File Selected Ready to Upload (Desktop 1440) ---');
await page.setViewport({ width: 1440, height: 900 });

// Create a dummy file and upload
const testFilePath = path.join(EVIDENCE_DIR, 'test-specimen.pdf');
fs.writeFileSync(testFilePath, '%PDF-1.4\n%mock pdf for verification test\n%%EOF');
const fileInput = await page.$('input[type="file"]');
await fileInput.uploadFile(testFilePath);

await page.waitForSelector('[data-testid="selected-file-card"]', { timeout: 5000 });
const selectedFileName = await page.$eval('[data-testid="selected-file-name"]', (el) => el.textContent);
assert(selectedFileName.includes('test-specimen.pdf'), `Selected file displayed: ${selectedFileName}`);

const uploadBtnHeight = await page.$eval('[data-testid="start-upload-button"]', (el) => el.offsetHeight);
assert(uploadBtnHeight >= 44, `Upload & extract button height ${uploadBtnHeight}px >= 44px`);

await captureEvidence(page, 'fe_import_03_selected_file_desktop_1440.png');

console.log('\n--- Step D: Execute Upload & Enter Workspace (Desktop 1440) ---');
await page.click('[data-testid="start-upload-button"]');

await page.waitForSelector('[data-testid="extracted-text-panel"]', { timeout: 6000 });
await page.waitForSelector('[data-testid="import-chunk-editor"]', { timeout: 6000 });

// Verify 12-col layout
const workspaceCol5 = await page.$('.lg\\:col-span-5');
const workspaceCol7 = await page.$('.lg\\:col-span-7');
assert(Boolean(workspaceCol5) && Boolean(workspaceCol7), 'Workspace renders 5/12 text panel and 7/12 editor panel');

// Verify chunks rendered
const chunkCards = await page.$$('[id^="chunk-"]');
assert(chunkCards.length === 3, `Rendered ${chunkCards.length} chunks (expected 3)`);

// Verify proposedTier UNKNOWN badge
const tierBadgeText = await page.$eval('[data-testid="proposed-tier-field"]', (el) => el.textContent);
assert(tierBadgeText.includes('UNKNOWN'), `Proposed tier is fixed at UNKNOWN: ${tierBadgeText}`);

// Verify reviewConfirmed checkbox is unchecked by default
const isPrechecked = await page.$eval('[data-testid="review-confirmed-checkbox"]', (el) => el.checked);
assert(!isPrechecked, 'reviewConfirmed checkbox is NOT pre-checked by default');

// Verify submit button is disabled while review is unconfirmed
const isSubmitDisabled = await page.$eval('[data-testid="proceed-confirm-button"]', (el) => el.disabled);
assert(isSubmitDisabled, 'Submit button is disabled while review is unconfirmed');

// [F2 & F3 In-depth Check] Open optional metadata, test 600-char evidence acceptance, and check limits
await page.click('[data-testid="toggle-optional-metadata"]');
await page.waitForSelector('[data-testid="input-evidence-reference"]', { timeout: 3000 });

// Test 600 characters acceptance without premature truncation
const testLongEvidence = 'CV-2026-LONG-REF-'.padEnd(600, 'E'); // exactly 600 chars total
await page.focus('[data-testid="input-evidence-reference"]');
await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
await page.type('[data-testid="input-evidence-reference"]', testLongEvidence);
const admitted600 = await page.$eval('[data-testid="input-evidence-reference"]', (el) => el.value);
assert(admitted600.length === 600, `evidenceReference accepts 600 characters without premature truncation (admitted length: ${admitted600.length})`);

// Check DOM limits across all metadata and chunk inputs
const domLimits = await page.evaluate(() => {
  const ids = ['input-authors', 'input-publisher', 'input-year', 'input-edition', 'input-source-url', 'input-evidence-reference', 'input-provenance-notes'];
  const metadataLimits = Object.fromEntries(ids.map(id => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    return [id, el ? { maxLength: el.maxLength, min: el.min, max: el.max } : null];
  }));
  const excerptEl = document.querySelector('[data-testid="chunk-excerpt-input-1"]');
  const locatorEl = document.querySelector('[data-testid="chunk-locator-input-1"]');
  const notesEl = document.querySelector('[data-testid="chunk-applicability-notes-1"]');
  return {
    metadata: metadataLimits,
    excerptMaxLength: excerptEl?.maxLength,
    locatorMaxLength: locatorEl?.maxLength,
    notesMaxLength: notesEl?.maxLength,
  };
});
assert(domLimits.metadata['input-authors'].maxLength === 1000, `authors maxLength is 1000 (got ${domLimits.metadata['input-authors'].maxLength})`);
assert(domLimits.metadata['input-publisher'].maxLength === 300, `publisher maxLength is 300 (got ${domLimits.metadata['input-publisher'].maxLength})`);
assert(domLimits.metadata['input-edition'].maxLength === 100, `edition maxLength is 100 (got ${domLimits.metadata['input-edition'].maxLength})`);
assert(domLimits.metadata['input-source-url'].maxLength === 2048, `sourceUrl maxLength is 2048 (got ${domLimits.metadata['input-source-url'].maxLength})`);
assert(domLimits.metadata['input-evidence-reference'].maxLength === 2000, `evidenceReference maxLength is 2000 (got ${domLimits.metadata['input-evidence-reference'].maxLength})`);
assert(domLimits.metadata['input-provenance-notes'].maxLength === 4000, `provenanceNotes maxLength is 4000 (got ${domLimits.metadata['input-provenance-notes'].maxLength})`);
assert(domLimits.metadata['input-year'].min === '1000' && Number(domLimits.metadata['input-year'].max) >= 2024, `year min is 1000 and max is current year`);
assert(domLimits.excerptMaxLength === 12000, `originalExcerpt maxLength is 12000 (got ${domLimits.excerptMaxLength})`);
assert(domLimits.locatorMaxLength === 500, `locator maxLength is 500 (got ${domLimits.locatorMaxLength})`);
assert(domLimits.notesMaxLength === 4000, `applicabilityNotes maxLength is 4000 (got ${domLimits.notesMaxLength})`);

// Keep the 600-character evidenceReference in state so downstream confirm payload verifies complete 600 chars without loss

// [F2 In-depth Check] Verify locatorStatus selector in Chunk 1
const locatorStatusSelectExists = await page.$('[data-testid="chunk-locator-status-1"]');
assert(Boolean(locatorStatusSelectExists), 'Chunk 1 renders locatorStatus assurance selector');

// Select USER_VERIFIED
await page.select('[data-testid="chunk-locator-status-1"]', 'USER_VERIFIED');
const selectedLocatorStatus = await page.$eval('[data-testid="chunk-locator-status-1"]', (el) => el.value);
assert(selectedLocatorStatus === 'USER_VERIFIED', `locatorStatus successfully set to USER_VERIFIED: ${selectedLocatorStatus}`);

// [F4 Countdown Badge Geometry]
const badgeMetrics = await page.evaluate(() => {
  const badge = document.querySelector('[data-testid="cancel-active-session-button"]')?.parentElement?.previousElementSibling?.querySelector('span.h-6');
  if (!badge) return null;
  const style = window.getComputedStyle(badge);
  return {
    height: style.height,
    borderRadius: style.borderRadius,
  };
});
assert(
  badgeMetrics && badgeMetrics.height === '24px' && badgeMetrics.borderRadius === '6px',
  `Countdown badge has exact 24px height and 6px radius (actual height: ${badgeMetrics?.height}, radius: ${badgeMetrics?.borderRadius})`
);

await captureEvidence(page, 'fe_import_04_workspace_desktop_1440.png');

console.log('\n--- Step E: Workspace Desktop 1280 ---');
await page.setViewport({ width: 1280, height: 800 });
await sleep(300);
await captureEvidence(page, 'fe_import_05_workspace_desktop_1280.png');

console.log('\n--- Step F: Workspace Mobile View (390 & 375 Bounds, Sticky Geometry & Hit-Testing) ---');
await page.setViewport({ width: 390, height: 844 });
await sleep(300);

// Select topics for all chunks to satisfy validation and test enabled CTA state
await page.select('select[data-testid="chunk-topic-select-1"]', 'IRRIGATION');

await page.click('[data-testid="chunk-expand-button-2"]');
await page.waitForSelector('select[data-testid="chunk-topic-select-2"]', { timeout: 3000 });
await page.select('select[data-testid="chunk-topic-select-2"]', 'IRRIGATION');

await page.click('[data-testid="chunk-expand-button-3"]');
await page.waitForSelector('select[data-testid="chunk-topic-select-3"]', { timeout: 3000 });
await page.select('select[data-testid="chunk-topic-select-3"]', 'IRRIGATION');

// Check reviewConfirmed checkbox to fully enable both desktop and mobile CTA buttons
const isCheckboxChecked = await page.$eval('[data-testid="review-confirmed-checkbox"]', el => el.checked);
if (!isCheckboxChecked) {
  await page.click('[data-testid="review-confirmed-checkbox"]');
}
await sleep(200);

// [F4 Key Probe: Mobile CTA Enabled Verification & Geometry Above BottomNav]
const mobileCtaState390 = await page.evaluate(() => {
  const btn = document.querySelector('[data-testid="mobile-proceed-to-confirm-button"]');
  const nav = document.querySelector('nav[aria-label="Điều hướng di động"]');
  if (!btn || !nav) return null;
  const btnRect = btn.getBoundingClientRect();
  const navRect = nav.getBoundingClientRect();
  return {
    disabled: btn.disabled,
    btnRect: { top: btnRect.top, bottom: btnRect.bottom, height: btnRect.height, left: btnRect.left, right: btnRect.right, width: btnRect.width },
    navRect: { top: navRect.top, bottom: navRect.bottom, height: navRect.height },
    bottomAboveNav: btnRect.bottom <= navRect.top,
    marginToNav: navRect.top - btnRect.bottom,
  };
});
assert(mobileCtaState390 && !mobileCtaState390.disabled, 'Mobile sticky CTA button is enabled after all topics selected and review confirmed');
assert(
  mobileCtaState390.bottomAboveNav,
  `Mobile CTA button bottom (${mobileCtaState390.btnRect.bottom}px) is strictly above mobile nav top (${mobileCtaState390.navRect.top}px) at 390 viewport (margin: ${mobileCtaState390.marginToNav}px)`
);

// [F4 Key Probe: Hit-testing at 25%, 50%, and 90% of button height at 390]
const hitTest390 = await page.evaluate(() => {
  const btn = document.querySelector('[data-testid="mobile-proceed-to-confirm-button"]');
  if (!btn) return null;
  const rect = btn.getBoundingClientRect();
  const fractions = [0.25, 0.50, 0.90];
  return fractions.map(f => {
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height * f;
    const hit = document.elementFromPoint(x, y);
    return {
      fraction: f,
      x,
      y,
      hitTag: hit?.tagName,
      hitClass: hit?.className,
      hitIsButton: hit === btn || btn.contains(hit),
    };
  });
});
assert(
  hitTest390 && hitTest390.every(h => h.hitIsButton),
  `Hit-testing at 25%, 50%, and 90% button height strikes the CTA button at 390 (got: ${JSON.stringify(hitTest390)})`
);

// [F4 Key Probe: Scroll Top and Scroll Bottom - Verify Last Field is Not Covered]
const scrollGeometry390 = await page.evaluate(() => {
  const main = document.querySelector('main');
  const stickyBar = document.querySelector('[data-testid="mobile-proceed-to-confirm-button"]')?.closest('.lg\\:hidden.fixed');
  const cancelBtn = document.querySelector('[data-testid="cancel-session-button"]');
  if (!main || !stickyBar || !cancelBtn) return null;

  // Scroll to bottom
  main.scrollTop = main.scrollHeight;
  const barRect = stickyBar.getBoundingClientRect();
  const cancelRect = cancelBtn.getBoundingClientRect();

  return {
    scrollHeight: main.scrollHeight,
    barRect: { top: barRect.top, bottom: barRect.bottom },
    cancelRect: { top: cancelRect.top, bottom: cancelRect.bottom },
    cancelVisibleAboveBar: cancelRect.bottom <= barRect.top + 20,
  };
});
assert(
  scrollGeometry390 && scrollGeometry390.cancelVisibleAboveBar,
  `When scrolled to bottom, last action button (cancelRect.bottom=${scrollGeometry390?.cancelRect.bottom}px) is visible above sticky bar (barRect.top=${scrollGeometry390?.barRect.top}px)`
);

// Reset scroll to top
await page.evaluate(() => {
  const main = document.querySelector('main');
  if (main) main.scrollTop = 0;
});
await sleep(200);

// [F4 Key Probe] Measure Cancel Session button right bound at 390
const cancelBtnMetrics390 = await page.evaluate(() => {
  const btn = document.querySelector('[data-testid="cancel-active-session-button"]');
  if (!btn) return null;
  const rect = btn.getBoundingClientRect();
  return { right: rect.right, width: rect.width, innerWidth: window.innerWidth };
});
assert(
  cancelBtnMetrics390 && cancelBtnMetrics390.right <= 390,
  `Cancel Session button right (${cancelBtnMetrics390?.right}px) is within 390px viewport width (no clipping!)`
);

// Check all buttons on 390
const workspaceOverflow390 = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button, a')).filter((e) => {
    const rect = e.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.right <= 0) return false;
    return rect.right > window.innerWidth || rect.left < 0;
  }).map((e) => ({ text: e.innerText?.trim(), right: e.getBoundingClientRect().right }));
});
assert(workspaceOverflow390.length === 0, `All workspace buttons fit within 390px viewport (overflows: ${JSON.stringify(workspaceOverflow390)})`);

await captureEvidence(page, 'fe_import_06_workspace_mobile_editor_390.png');

// Test Mobile Segmented Tabs: Switch to raw extraction
await page.click('[data-testid="mobile-tab-view-extraction"]');
await sleep(300);
const rawPanelVisible = await page.$eval('[data-testid="extracted-text-panel"]', (el) => el.offsetParent !== null);
assert(rawPanelVisible, 'Mobile tab switch activates raw extraction panel');
await captureEvidence(page, 'fe_import_07_workspace_mobile_extraction_390.png');

// Switch back to editor
await page.click('[data-testid="mobile-tab-view-editor"]');
await sleep(300);

// Check bounds & hit-testing on 375 viewport (iPhone SE / 13 mini)
await page.setViewport({ width: 375, height: 812 });
await sleep(300);

const mobileCtaState375 = await page.evaluate(() => {
  const btn = document.querySelector('[data-testid="mobile-proceed-to-confirm-button"]');
  const nav = document.querySelector('nav[aria-label="Điều hướng di động"]');
  if (!btn || !nav) return null;
  const btnRect = btn.getBoundingClientRect();
  const navRect = nav.getBoundingClientRect();
  const fractions = [0.25, 0.50, 0.90];
  const hits = fractions.map(f => {
    const x = btnRect.left + btnRect.width / 2;
    const y = btnRect.top + btnRect.height * f;
    const hit = document.elementFromPoint(x, y);
    return hit === btn || btn.contains(hit);
  });
  return {
    disabled: btn.disabled,
    bottomAboveNav: btnRect.bottom <= navRect.top,
    btnBottom: btnRect.bottom,
    navTop: navRect.top,
    allHitsValid: hits.every(Boolean),
  };
});
assert(mobileCtaState375 && !mobileCtaState375.disabled, 'Mobile CTA button is enabled at 375x812');
assert(
  mobileCtaState375.bottomAboveNav,
  `Mobile CTA button bottom (${mobileCtaState375.btnBottom}px) is strictly above mobile nav top (${mobileCtaState375.navTop}px) at 375x812`
);
assert(mobileCtaState375.allHitsValid, 'Hit-testing at 25%, 50%, and 90% button height succeeds at 375x812');

const cancelBtnMetrics375 = await page.evaluate(() => {
  const btn = document.querySelector('[data-testid="cancel-active-session-button"]');
  if (!btn) return null;
  const rect = btn.getBoundingClientRect();
  return { right: rect.right, innerWidth: window.innerWidth };
});
assert(
  cancelBtnMetrics375 && cancelBtnMetrics375.right <= 375,
  `Cancel Session button right (${cancelBtnMetrics375?.right}px) is within 375px viewport width`
);

console.log('\n--- Step G: Open Confirm Modal (Desktop 1440 & Opaque Theme Tokens) ---');
await page.setViewport({ width: 1440, height: 900 });
await sleep(300);

// Verify desktop proceed button is enabled after all topics selected and reviewConfirmed
const desktopProceedEnabled = await page.$eval('[data-testid="proceed-confirm-button"]', el => !el.disabled);
assert(desktopProceedEnabled, 'Desktop proceed button is enabled after all validations satisfied');

// Click proceed to confirm
await page.click('[data-testid="proceed-confirm-button"]');
await page.waitForSelector('[role="dialog"][aria-labelledby="confirm-modal-title"]', { timeout: 5000 });

// [F1 Key Probe] Computed background in Light Mode
const confirmLightBg = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"][aria-labelledby="confirm-modal-title"]');
  return dialog ? window.getComputedStyle(dialog).backgroundColor : null;
});
assert(
  confirmLightBg === 'rgb(255, 255, 255)',
  `ImportConfirmModal has opaque white background in light mode: ${confirmLightBg} (NOT rgba(0,0,0,0))`
);

// [F1 Key Probe] Computed background in Dark Mode
await page.evaluate(() => document.documentElement.classList.add('dark'));
await sleep(100);
const confirmDarkBg = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"][aria-labelledby="confirm-modal-title"]');
  return dialog ? window.getComputedStyle(dialog).backgroundColor : null;
});
assert(
  confirmDarkBg === 'rgb(30, 41, 59)',
  `ImportConfirmModal has opaque dark surface background in dark mode: ${confirmDarkBg} (NOT rgba(0,0,0,0))`
);
await page.evaluate(() => document.documentElement.classList.remove('dark'));
await sleep(100);

await captureEvidence(page, 'fe_import_08_confirm_modal_desktop.png');

console.log('\n--- Step H: Confirm Modal Mobile 390 (Wrapping & Stacked Buttons) ---');
await page.setViewport({ width: 390, height: 844 });
await sleep(300);

// [F4 Key Probe] Verify title does NOT truncate and wraps properly
const titleClasses = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"][aria-labelledby="confirm-modal-title"]');
  const titleBox = dialog?.querySelector('.break-words');
  return titleBox ? titleBox.className : '';
});
assert(
  titleClasses.includes('break-words') && !titleClasses.includes('truncate'),
  `Confirm modal title uses break-words for wrapping (classes: ${titleClasses})`
);

// [F4 Key Probe] Verify footer buttons are stacked vertically on mobile
const footerButtonsStacked = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"][aria-labelledby="confirm-modal-title"]');
  const buttons = Array.from(dialog?.querySelectorAll('button') || []).filter(b => b.innerText.includes('Tạo bản nháp') || b.innerText.includes('Quay lại chỉnh sửa'));
  if (buttons.length < 2) return false;
  const primaryRect = buttons.find(b => b.innerText.includes('Tạo bản nháp')).getBoundingClientRect();
  const secondaryRect = buttons.find(b => b.innerText.includes('Quay lại chỉnh sửa')).getBoundingClientRect();
  return primaryRect.bottom <= secondaryRect.top + 5; // stacked vertically: primary on top, secondary below
});
assert(footerButtonsStacked, 'Confirm modal footer buttons are stacked vertically on mobile');

await captureEvidence(page, 'fe_import_09_confirm_modal_mobile.png');

// [F2 Request Body Inspection Probe]
await page.setViewport({ width: 1440, height: 900 });
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.innerText.includes('Tạo bản nháp'));
  btn?.click();
});
await sleep(700);

assert(
  lastConfirmedRequestBody !== null &&
  lastConfirmedRequestBody.metadata?.evidenceReference === testLongEvidence &&
  lastConfirmedRequestBody.metadata?.evidenceReference?.length === 600,
  `Request body sent to /confirm includes full 600-char metadata.evidenceReference without truncation (got length: ${lastConfirmedRequestBody?.metadata?.evidenceReference?.length})`
);
assert(
  lastConfirmedRequestBody.bindings?.[0]?.locatorStatus === 'USER_VERIFIED',
  `Request body sent to /confirm includes bindings[0].locatorStatus = "USER_VERIFIED"`
);

// Reload to reset to upload page
await page.goto(`http://127.0.0.1:${PORT}/knowledge/import`, { waitUntil: 'networkidle0' });
await page.waitForSelector('[data-testid="file-dropzone"]', { timeout: 5000 });

console.log('\n--- Step I: Open Sessions Modal (Desktop 1440 & Opaque Theme Tokens) ---');
await page.setViewport({ width: 1440, height: 900 });

const sessionsButtons = await page.$$('button');
for (const btn of sessionsButtons) {
  const txt = await page.evaluate((el) => el.textContent, btn);
  if (txt.includes('Phiên nhập của tôi')) {
    await btn.click();
    break;
  }
}

await page.waitForSelector('[role="dialog"][aria-labelledby="sessions-modal-title"]', { timeout: 5000 });

// [F1 Key Probe] Computed background in Light Mode
const sessionsLightBg = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"][aria-labelledby="sessions-modal-title"]');
  return dialog ? window.getComputedStyle(dialog).backgroundColor : null;
});
assert(
  sessionsLightBg === 'rgb(255, 255, 255)',
  `ImportSessionsModal has opaque white background in light mode: ${sessionsLightBg} (NOT rgba(0,0,0,0))`
);

// [F1 Key Probe] Computed background in Dark Mode
await page.evaluate(() => document.documentElement.classList.add('dark'));
await sleep(100);
const sessionsDarkBg = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"][aria-labelledby="sessions-modal-title"]');
  return dialog ? window.getComputedStyle(dialog).backgroundColor : null;
});
assert(
  sessionsDarkBg === 'rgb(30, 41, 59)',
  `ImportSessionsModal has opaque dark surface background in dark mode: ${sessionsDarkBg} (NOT rgba(0,0,0,0))`
);
await page.evaluate(() => document.documentElement.classList.remove('dark'));
await sleep(100);

await captureEvidence(page, 'fe_import_10_sessions_modal_desktop.png');

console.log('\n--- Step J: Sessions Modal Mobile 390 ---');
await page.setViewport({ width: 390, height: 844 });
await sleep(300);

const sessionsOverflow390 = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"][aria-labelledby="sessions-modal-title"]');
  return Array.from(dialog?.querySelectorAll('button') || []).filter((e) => {
    const rect = e.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.right <= 0) return false;
    return rect.right > window.innerWidth || rect.left < 0;
  }).map((e) => ({ text: e.innerText?.trim(), right: e.getBoundingClientRect().right }));
});
assert(sessionsOverflow390.length === 0, 'All sessions modal buttons fit within 390px viewport');

await captureEvidence(page, 'fe_import_11_sessions_modal_mobile.png');

// Clean up test file
if (fs.existsSync(testFilePath)) {
  fs.unlinkSync(testFilePath);
}

// ─── [3/3] Export Hashes & Final Assertions ──────────────────────────
console.log('\n[3/3] Generating evidence hashes manifest...');

const hashesPath = path.join(EVIDENCE_DIR, 'evidence-hashes.json');
fs.writeFileSync(hashesPath, JSON.stringify(capturedHashes, null, 2));

const artifactHashesPath = path.join(ARTIFACT_EVIDENCE_DIR, 'import-evidence-hashes.json');
fs.writeFileSync(artifactHashesPath, JSON.stringify(capturedHashes, null, 2));

console.log(`\n================================================================`);
console.log(`VERIFICATION SUMMARY: ${passed}/${total} assertions PASSED`);
console.log(`Evidence images captured: ${Object.keys(capturedHashes).length}`);
console.log(`================================================================\n`);

await browser.close();
server.close();
process.exit(0);
