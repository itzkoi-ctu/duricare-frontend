import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('FE-RAG-PUB-001: RAG Publication UI Browser & Contract Verification');
console.log('================================================================');

const EVIDENCE_DIRS = [
  'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence',
  'E:/CTU/LuanVan/docs/ai/thesis/evidence/RAG-PUB-001',
];
const PORT = 5186;
const BASE_URL = `http://127.0.0.1:${PORT}`;

for (const dir of EVIDENCE_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(page, filename) {
  const primaryPath = path.join(EVIDENCE_DIRS[0], filename);
  const buffer = await page.screenshot({ path: primaryPath, fullPage: true });
  console.log(`  Saved screenshot: ${primaryPath}`);
  for (let i = 1; i < EVIDENCE_DIRS.length; i++) {
    const mirrorPath = path.join(EVIDENCE_DIRS[i], filename);
    fs.writeFileSync(mirrorPath, buffer);
    console.log(`  Saved screenshot: ${mirrorPath}`);
  }
}

function startWorktreeSpaServer(port) {
  const distDir = path.resolve(ROOT, 'dist');
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
        'Access-Control-Allow-Origin': '*',
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    const indexPath = path.join(distDir, 'index.html');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(indexPath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

// User Mock Models
const ADMIN_USER = { id: 1, email: 'admin@duricare.vn', role: 'ADMIN', farmId: null };
const EXPERT_USER = { id: 42, email: 'expert@duricare.vn', role: 'EXPERT', farmId: null };

// Source & Revision Fixtures
const SOURCE_01 = {
  id: '00000000-0000-0000-0000-000000000001',
  ownerUserId: 1,
  ownerDisplayName: 'Quản trị viên',
  createdAt: '2026-10-28T08:00:00Z',
  updatedAt: '2026-10-28T08:00:00Z',
  version: 1,
  latestRevisionId: '00000000-0000-0000-0000-000000000011',
  latestRevision: {
    id: '00000000-0000-0000-0000-000000000011',
    sourceId: '00000000-0000-0000-0000-000000000001',
    revisionNumber: 1,
    status: 'APPROVED',
    version: 1,
    title: 'Quy trình tưới nước sầu riêng giai đoạn nuôi hoa (GlobalGAP)',
    submittedAt: '2026-10-28T09:00:00Z',
    updatedAt: '2026-10-28T10:00:00Z',
  },
};

const REVISION_01_APPROVED = {
  id: '00000000-0000-0000-0000-000000000011',
  sourceId: '00000000-0000-0000-0000-000000000001',
  revisionNumber: 1,
  status: 'APPROVED',
  version: 1,
  submittedAt: '2026-10-28T09:00:00Z',
  updatedAt: '2026-10-28T10:00:00Z',
  metadata: {
    title: 'Quy trình tưới nước sầu riêng giai đoạn nuôi hoa (GlobalGAP)',
    authors: 'Viện Cây Ăn Quả Miền Nam',
    publisher: 'NXB Nông Nghiệp',
    sourceType: 'RESEARCH_INSTITUTE_GUIDE',
    year: 2024,
    edition: 'Tái bản lần 2',
    sourceUrl: 'https://sofri.org.vn/tai-lieu-sau-rieng-2024',
    evidenceReference: 'SOFRI-RR-2024-08',
    provenanceNotes: null,
    proposedTier: 'A',
    proposedTierRationale: 'Tài liệu hướng dẫn kỹ thuật chính thống từ viện nghiên cứu quốc gia',
  },
  chunks: [
    {
      chunkId: '00000000-0000-0000-0000-000000000101',
      position: 0,
      title: 'Kỹ thuật siết nước kích thích phân hóa mầm hoa',
      topic: 'IRRIGATION',
      stage: 'XIET_NUOC',
      content: 'Cần xiết nước từ 20 đến 25 ngày để tạo mầm hoa sầu riêng. Khi mắt cua sáng thì bắt đầu nhấp nước nhẹ.',
      originalExcerpt: 'Xiết nước 20-25 ngày cho đến khi mắt cua xuất hiện rõ.',
      locator: 'Trang 15, Mục 3.2',
      applicabilityNotes: 'Vùng ĐBSCL đất phù sa ngọt',
      measurementNotes: null,
    },
    {
      chunkId: '00000000-0000-0000-0000-000000000102',
      position: 1,
      title: 'Tưới nước nuôi bông sầu riêng đúng liều lượng',
      topic: 'IRRIGATION',
      stage: 'RA_HOA',
      content: 'Giai đoạn hoa nở cần giảm lượng nước tưới còn một nửa so với bình thường để hạt phấn không bị trôi.',
      originalExcerpt: 'Giảm 50% lượng nước trong tuần hoa thụ phấn rộ.',
      locator: 'Trang 18, Mục 3.4',
      applicabilityNotes: null,
      measurementNotes: null,
    },
  ],
  decision: {
    id: '00000000-0000-0000-0000-000000000201',
    outcome: 'APPROVED',
    assessedTier: 'A',
    tierRationale: 'Tài liệu đạt chuẩn DURI-1B-v1 mức cao nhất',
    reason: 'Đầy đủ dẫn chứng khoa học, phương pháp kiểm chứng rõ ràng.',
    decidedAt: '2026-10-28T10:00:00Z',
    checkedSource: true,
    checkedFaithfulness: true,
    checkedApplicability: true,
    chunkComments: [],
  },
};

// Publication Head Virtual v0 (unindexed)
let HEAD_01 = {
  sourceId: '00000000-0000-0000-0000-000000000001',
  version: 0,
  generation: 0,
  activePublicationId: null,
  pendingPublicationId: null,
  updatedAt: null,
};

// Publication 02 (Active fixture)
const SOURCE_02 = {
  id: '00000000-0000-0000-0000-000000000002',
  ownerUserId: 1,
  ownerDisplayName: 'Quản trị viên',
  createdAt: '2026-10-20T08:00:00Z',
  updatedAt: '2026-10-20T08:00:00Z',
  version: 2,
  latestRevisionId: '00000000-0000-0000-0000-000000000022',
  latestRevision: {
    id: '00000000-0000-0000-0000-000000000022',
    sourceId: '00000000-0000-0000-0000-000000000002',
    revisionNumber: 2,
    status: 'APPROVED',
    version: 2,
    title: 'Sổ tay chẩn đoán thiếu hụt dinh dưỡng NPK cây sầu riêng',
    submittedAt: '2026-10-20T09:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
  },
};

const REVISION_02_APPROVED = {
  id: '00000000-0000-0000-0000-000000000022',
  sourceId: '00000000-0000-0000-0000-000000000002',
  revisionNumber: 2,
  status: 'APPROVED',
  version: 2,
  submittedAt: '2026-10-20T09:00:00Z',
  updatedAt: '2026-10-20T10:00:00Z',
  metadata: {
    title: 'Sổ tay chẩn đoán thiếu hụt dinh dưỡng NPK cây sầu riêng',
    authors: 'Viện Khoa Học Kỹ Thuật Nông Nghiệp',
    publisher: 'NXB Nông Nghiệp',
    sourceType: 'RESEARCH_INSTITUTE_GUIDE',
    year: 2024,
    edition: '1st',
    sourceUrl: 'https://duricare.vn/docs/npk-guide-2024',
    evidenceReference: 'NPK-GUIDE-2024',
    provenanceNotes: null,
    proposedTier: 'A',
    proposedTierRationale: 'Hướng dẫn chẩn đoán dinh dưỡng NPK',
  },
  chunks: [
    {
      chunkId: '00000000-0000-0000-0000-000000000501',
      position: 0,
      title: 'Nhận biết thiếu đạm (N) qua sắc lá',
      topic: 'FERTILIZATION',
      stage: 'KIEN_THIET_CO_BAN',
      content: 'Thiếu đạm làm lá già chuyển màu vàng đồng đều, gân lá vàng trước rồi lan toàn bộ phiến lá.',
      originalExcerpt: 'Thiếu đạm làm lá già chuyển màu vàng.',
      locator: 'Trang 22, Bảng 4.1',
      applicabilityNotes: null,
      measurementNotes: null,
    },
  ],
  decision: {
    id: '00000000-0000-0000-0000-000000000202',
    outcome: 'APPROVED',
    assessedTier: 'A',
    tierRationale: 'Tài liệu đạt chuẩn DURI-1B-v1',
    reason: 'Đầy đủ dẫn chứng khoa học.',
    decidedAt: '2026-10-20T10:00:00Z',
    checkedSource: true,
    checkedFaithfulness: true,
    checkedApplicability: true,
    chunkComments: [],
  },
};

const PUB_02_ACTIVE = {
  id: '00000000-0000-0000-0000-000000000302',
  sourceId: '00000000-0000-0000-0000-000000000002',
  revisionId: '00000000-0000-0000-0000-000000000022',
  revisionNumber: 2,
  generation: 1,
  status: 'ACTIVE',
  sourceTitle: 'Sổ tay chẩn đoán thiếu hụt dinh dưỡng NPK cây sầu riêng',
  assessedTier: 'A',
  chunkCount: 2,
  manifestHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  createdAt: '2026-10-21T08:00:00Z',
  activatedAt: '2026-10-21T08:05:00Z',
  revokedAt: null,
  latestJobId: '00000000-0000-0000-0000-000000000402',
};

const HEAD_02 = {
  sourceId: '00000000-0000-0000-0000-000000000002',
  version: 2,
  generation: 1,
  activePublicationId: '00000000-0000-0000-0000-000000000302',
  pendingPublicationId: null,
  updatedAt: '2026-10-21T08:05:00Z',
};

const PUB_02_DETAIL = {
  head: HEAD_02,
  publication: PUB_02_ACTIVE,
  manifest: {
    sourceId: '00000000-0000-0000-0000-000000000002',
    revisionId: '00000000-0000-0000-0000-000000000022',
    revisionNumber: 2,
    sourceTitle: 'Sổ tay chẩn đoán thiếu hụt dinh dưỡng NPK cây sầu riêng',
    sourceUrl: 'https://duricare.vn/docs/npk-guide-2024',
    year: 2024,
    edition: '1st',
    assessedTier: 'A',
    tierPolicyVersion: 'DURI-1B-v1',
    chunks: [
      {
        chunkId: '00000000-0000-0000-0000-000000000501',
        position: 0,
        chunkTitle: 'Nhận biết thiếu đạm (N) qua sắc lá',
        topic: 'FERTILIZATION',
        stage: 'KIEN_THIET_CO_BAN',
        content: 'Thiếu đạm làm lá già chuyển màu vàng đồng đều, gân lá vàng trước rồi lan toàn bộ phiến lá.',
        locator: 'Trang 22, Bảng 4.1',
      },
      {
        chunkId: '00000000-0000-0000-0000-000000000502',
        position: 1,
        chunkTitle: 'Nhận biết thiếu kali (K) giai đoạn nuôi trái',
        topic: 'FERTILIZATION',
        stage: 'PHAT_TRIEN_TRAI',
        content: 'Thiếu kali làm mép lá sầu riêng bị cháy xém từ chóp lá lan vào, trái phát triển chậm và cơm nhạt.',
        locator: 'Trang 28, Mục 5.3',
      },
    ],
  },
  fingerprint: {
    projectionVersion: 1,
    embeddingModelId: 'text-embedding-3-small',
    embeddingModelRevision: '2024-05',
    dimension: 1536,
    distance: 'COSINE',
    collection: 'duricare_knowledge_v1',
  },
  acceptedIndexRunId: '00000000-0000-0000-0000-000000000602',
  jobs: {
    content: [
      {
        id: '00000000-0000-0000-0000-000000000402',
        publicationId: '00000000-0000-0000-0000-000000000302',
        kind: 'INDEX',
        status: 'SUCCEEDED',
        phase: 'ACTIVATE',
        claimCount: 1,
        maxClaims: 5,
        nextAttemptAt: null,
        createdAt: '2026-10-21T08:00:00Z',
        updatedAt: '2026-10-21T08:05:00Z',
        errorCode: null,
      },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  },
};

const JOB_02_DETAIL = {
  head: HEAD_02,
  job: PUB_02_DETAIL.jobs.content[0],
  cleanupTarget: null,
  runs: {
    content: [
      {
        id: '00000000-0000-0000-0000-000000000602',
        jobId: '00000000-0000-0000-0000-000000000402',
        publicationId: '00000000-0000-0000-0000-000000000302',
        fence: 1,
        status: 'SUCCEEDED',
        startedAt: '2026-10-21T08:00:05Z',
        finishedAt: '2026-10-21T08:04:55Z',
        expectedPoints: 2,
        verifiedPoints: 2,
        receiptHash: 'f4b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
        errorCode: null,
      },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  },
};

const PUB_02_EVENTS = {
  content: [
    {
      id: '00000000-0000-0000-0000-000000000701',
      publicationId: '00000000-0000-0000-0000-000000000302',
      sourceId: '00000000-0000-0000-0000-000000000002',
      jobId: null,
      runId: null,
      actorUserId: 1,
      actorKind: 'ADMIN',
      action: 'REQUESTED',
      reason: 'Phê chuẩn xuất bản tài liệu dinh dưỡng NPK vào hệ thống RAG',
      occurredAt: '2026-10-21T08:00:00Z',
      previousStatus: null,
      newStatus: 'PENDING',
    },
    {
      id: '00000000-0000-0000-0000-000000000702',
      publicationId: '00000000-0000-0000-0000-000000000302',
      sourceId: '00000000-0000-0000-0000-000000000002',
      jobId: '00000000-0000-0000-0000-000000000402',
      runId: '00000000-0000-0000-0000-000000000602',
      actorUserId: null,
      actorKind: 'WORKER',
      action: 'ACTIVATED',
      reason: 'Đã hoàn tất embedding 2 chunks và kiểm chứng vector',
      occurredAt: '2026-10-21T08:05:00Z',
      previousStatus: 'PENDING',
      newStatus: 'ACTIVE',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 2,
  totalPages: 1,
};

// Publication 03 (Pending with failed job fixture)
const SOURCE_03 = {
  id: '00000000-0000-0000-0000-000000000003',
};

const PUB_03_FAILED = {
  id: '00000000-0000-0000-0000-000000000303',
  sourceId: '00000000-0000-0000-0000-000000000003',
  revisionId: '00000000-0000-0000-0000-000000000033',
  revisionNumber: 1,
  generation: 1,
  status: 'PENDING',
  sourceTitle: 'Sổ tay phòng trị bọ trĩ và rầy phấn sầu riêng',
  assessedTier: 'B',
  chunkCount: 1,
  manifestHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
  createdAt: '2026-10-29T10:00:00Z',
  activatedAt: null,
  revokedAt: null,
  latestJobId: '00000000-0000-0000-0000-000000000403',
};

const HEAD_03 = {
  sourceId: '00000000-0000-0000-0000-000000000003',
  version: 1,
  generation: 1,
  activePublicationId: null,
  pendingPublicationId: '00000000-0000-0000-0000-000000000303',
  updatedAt: '2026-10-29T10:00:00Z',
};

const PUB_03_DETAIL = {
  head: HEAD_03,
  publication: PUB_03_FAILED,
  manifest: {
    sourceId: '00000000-0000-0000-0000-000000000003',
    revisionId: '00000000-0000-0000-0000-000000000033',
    revisionNumber: 1,
    sourceTitle: 'Sổ tay phòng trị bọ trĩ và rầy phấn sầu riêng',
    sourceUrl: 'https://duricare.vn/docs/pest-control',
    year: 2024,
    edition: null,
    assessedTier: 'B',
    tierPolicyVersion: 'DURI-1B-v1',
    chunks: [
      {
        chunkId: '00000000-0000-0000-0000-000000000503',
        position: 0,
        chunkTitle: 'Nhận biết bọ trĩ hại hoa sầu riêng',
        topic: 'GENERAL',
        stage: 'RA_HOA',
        content: 'Bọ trĩ gây hại trên cánh hoa làm hoa rụng sớm.',
        locator: 'Trang 10',
      },
    ],
  },
  fingerprint: {
    projectionVersion: 1,
    embeddingModelId: 'text-embedding-3-small',
    embeddingModelRevision: '2024-05',
    dimension: 1536,
    distance: 'COSINE',
    collection: 'duricare_knowledge_v1',
  },
  acceptedIndexRunId: null,
  jobs: {
    content: [
      {
        id: '00000000-0000-0000-0000-000000000403',
        publicationId: '00000000-0000-0000-0000-000000000303',
        kind: 'INDEX',
        status: 'FAILED',
        phase: 'EMBED',
        claimCount: 5,
        maxClaims: 5,
        nextAttemptAt: null,
        createdAt: '2026-10-29T10:00:00Z',
        updatedAt: '2026-10-29T10:15:00Z',
        errorCode: 'EMBEDDING_TIMEOUT',
      },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  },
};

// Global Publications List
let ALL_PUBLICATIONS = [PUB_02_ACTIVE, PUB_03_FAILED];
let PUB_01_DETAIL = null;

async function runE2ESuite() {
  const spaServer = await startWorktreeSpaServer(PORT);
  console.log(`✓ SPA Server started on ${BASE_URL}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let currentUser = ADMIN_USER;
  let simulateConflictOnce = false;
  let simulateRevokeTimeoutOnce = false;
  let simulateRevokeCommittedBeforeTimeoutOnce = false;
  let simulateRetryConflictOnce = false;
  let simulateRetryTimeoutOnce = false;
  let simulateEvents503Once = false;
  let simulateDetail503Once = false;
  let simulateLateReceiptOnce = false;
  let revokePostCount = 0;
  let retryPostCount = 0;
  let releaseReceipt = null;
  const OPERATION_RECEIPTS = new Map();

  const page = await browser.newPage();
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[DEBUG')) console.log('PAGE_LOG:', text);
  });
  await page.setViewport({ width: 1440, height: 900 });

  async function assertRecoveryButtonLayout(page, modalSelector, label) {
    const viewports = [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
      { width: 375, height: 667 },
    ];
    for (const vp of viewports) {
      await page.setViewport(vp);
      await new Promise((r) => setTimeout(r, 150));
      const layout = await page.evaluate((sel) => {
        const banner = document.querySelector(`${sel} [data-testid="indeterminate-alert-banner"]`);
        if (!banner) return null;
        const bannerRect = banner.getBoundingClientRect();
        const buttons = Array.from(banner.querySelectorAll('button')).map((btn) => {
          const r = btn.getBoundingClientRect();
          return {
            text: btn.textContent.trim(),
            left: r.left,
            right: r.right,
            width: r.width,
            height: r.height,
            top: r.top,
            bottom: r.bottom,
          };
        });
        return {
          width: window.innerWidth,
          banner: {
            left: bannerRect.left,
            right: bannerRect.right,
            width: bannerRect.width,
            height: bannerRect.height,
          },
          buttons,
        };
      }, modalSelector);

      console.log(`REVIEW_RECOVERY_LAYOUT ${JSON.stringify(layout)}`);
      assert(layout, `${label}: Indeterminate alert banner must be present at width ${vp.width}`);
      assert(layout.buttons.length >= 2, `${label}: At least 2 recovery buttons must be present at width ${vp.width}`);
      for (const btn of layout.buttons) {
        assert(
          btn.right <= layout.banner.right + 2,
          `${label} (${vp.width}px): Button "${btn.text}" right (${btn.right}px) exceeds banner right (${layout.banner.right}px)`
        );
        assert(
          btn.right <= vp.width,
          `${label} (${vp.width}px): Button "${btn.text}" right (${btn.right}px) exceeds viewport width (${vp.width}px)`
        );
        assert(
          btn.left >= layout.banner.left - 2,
          `${label} (${vp.width}px): Button "${btn.text}" left (${btn.left}px) is outside banner left (${layout.banner.left}px)`
        );
      }
    }
    // Restore default 1440 viewport
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise((r) => setTimeout(r, 150));
  }

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    const method = req.method();
    const resourceType = req.resourceType();

    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;

    const isStaticAsset =
      resourceType === 'document' ||
      resourceType === 'script' ||
      resourceType === 'stylesheet' ||
      resourceType === 'font' ||
      resourceType === 'image' ||
      pathname.startsWith('/assets/') ||
      pathname.endsWith('.html') ||
      pathname.endsWith('.js') ||
      pathname.endsWith('.css') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.woff2');

    if (isStaticAsset) {
      return req.continue();
    }

    const respondJson = (status, data, headers = {}) => {
      req.respond({
        status,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': BASE_URL,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-XSRF-TOKEN',
          ...headers,
        },
        body: JSON.stringify(data),
      });
    };

    if (method === 'OPTIONS') {
      return req.respond({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': BASE_URL,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-XSRF-TOKEN',
        },
      });
    }

    // Strip leading /api if present for uniform matching
    const apiPath = pathname.replace(/^\/api/, '');

    if (simulateLateReceiptOnce && apiPath.includes('/publication-operations/')) {
      simulateLateReceiptOnce = false;
      releaseReceipt = () =>
        respondJson(404, {
          code: 'RECEIPT_NOT_FOUND',
          message: 'Operation receipt is not yet ready or pending.',
        });
      return;
    }

    // 1. Auth endpoints
    if (apiPath.endsWith('/auth/refresh')) {
      return respondJson(200, { accessToken: 'mock-access-token' });
    }

    if (apiPath.endsWith('/auth/me')) {
      return respondJson(200, currentUser);
    }

    if (apiPath.endsWith('/auth/csrf')) {
      return respondJson(200, { token: 'mock-csrf' });
    }

    if (apiPath.includes('/admin/expert-profiles/me') || apiPath.includes('/expert/profile')) {
      return respondJson(200, {
        id: currentUser.id,
        userId: currentUser.id,
        fullName: currentUser.role === 'ADMIN' ? 'Nguyễn Quản Trị' : 'TS. Trần Văn Chuyên Gia',
        verificationStatus: 'VERIFIED',
        enabled: true,
      });
    }

    // 2. Auxiliary system endpoints
    if (apiPath.includes('/farms')) {
      return respondJson(200, [
        { id: 1, name: 'Vườn sầu riêng mẫu', location: 'Cần Thơ', zoneCount: 1 },
      ]);
    }

    if (apiPath.includes('/alerts')) {
      return respondJson(200, []);
    }

    if (apiPath.includes('/zones')) {
      return respondJson(200, []);
    }

    if (apiPath.includes('/trees')) {
      return respondJson(200, []);
    }

    // 3. Knowledge sources detail
    if (apiPath.includes(`/knowledge/sources/${SOURCE_01.id}/revisions`)) {
      return respondJson(200, {
        content: [REVISION_01_APPROVED],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      });
    }

    if (apiPath.includes(`/knowledge/sources/${SOURCE_02.id}/revisions`)) {
      return respondJson(200, {
        content: [REVISION_02_APPROVED],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      });
    }

    if (apiPath.includes(`/knowledge/sources/${SOURCE_01.id}/history`)) {
      return respondJson(200, {
        content: [],
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
      });
    }

    if (apiPath.includes(`/knowledge/sources/${SOURCE_02.id}/history`)) {
      return respondJson(200, {
        content: [],
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
      });
    }

    if (apiPath.includes(`/knowledge/sources/${SOURCE_01.id}`) && !apiPath.includes('publication')) {
      return respondJson(200, SOURCE_01);
    }

    if (apiPath.includes(`/knowledge/sources/${SOURCE_02.id}`) && !apiPath.includes('publication')) {
      return respondJson(200, SOURCE_02);
    }

    if (apiPath.includes(`/knowledge/revisions/${REVISION_01_APPROVED.id}`)) {
      return respondJson(200, REVISION_01_APPROVED);
    }

    if (apiPath.includes(`/knowledge/revisions/${REVISION_02_APPROVED.id}`)) {
      return respondJson(200, REVISION_02_APPROVED);
    }

    // 4. Publication Heads
    if (apiPath.includes(`/admin/knowledge/sources/${SOURCE_01.id}/publication-head`)) {
      return respondJson(200, HEAD_01);
    }

    if (apiPath.includes(`/admin/knowledge/sources/${SOURCE_02.id}/publication-head`)) {
      return respondJson(200, HEAD_02);
    }

    if (apiPath.includes(`/admin/knowledge/sources/${SOURCE_03.id}/publication-head`)) {
      return respondJson(200, HEAD_03);
    }

    // 5. POST Publish for Source 01
    if (apiPath.includes(`/admin/knowledge/sources/${SOURCE_01.id}/publications`) && method === 'POST') {
      const body = JSON.parse(req.postData());
      if (simulateConflictOnce) {
        simulateConflictOnce = false;
        return respondJson(409, {
          error: 'conflict',
          code: 'stale_version',
          message: 'Phiên bản xuất bản đã thay đổi. Vui lòng làm mới dữ liệu và thử lại.',
          fieldErrors: [],
        });
      }

      // Successful publish -> 202 Accepted with PENDING publication
      const createdPub = {
        id: '00000000-0000-0000-0000-000000000301',
        sourceId: SOURCE_01.id,
        revisionId: REVISION_01_APPROVED.id,
        revisionNumber: 1,
        generation: 1,
        status: 'PENDING',
        sourceTitle: SOURCE_01.latestRevision.title,
        assessedTier: 'A',
        chunkCount: 2,
        manifestHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        createdAt: new Date().toISOString(),
        activatedAt: null,
        revokedAt: null,
        latestJobId: '00000000-0000-0000-0000-000000000401',
      };

      HEAD_01 = {
        sourceId: SOURCE_01.id,
        version: 1,
        generation: 1,
        activePublicationId: null,
        pendingPublicationId: createdPub.id,
        updatedAt: new Date().toISOString(),
      };

      ALL_PUBLICATIONS = [createdPub, ...ALL_PUBLICATIONS];

      PUB_01_DETAIL = {
        head: HEAD_01,
        publication: createdPub,
        manifest: {
          sourceId: SOURCE_01.id,
          revisionId: REVISION_01_APPROVED.id,
          revisionNumber: 1,
          sourceTitle: SOURCE_01.latestRevision.title,
          sourceUrl: 'https://sofri.org.vn/tai-lieu-sau-rieng-2024',
          year: 2024,
          edition: 'Tái bản lần 2',
          assessedTier: 'A',
          tierPolicyVersion: 'DURI-1B-v1',
          chunks: [],
        },
        fingerprint: {
          projectionVersion: 1,
          embeddingModelId: 'text-embedding-3-small',
          embeddingModelRevision: '2024-05',
          dimension: 1536,
          distance: 'COSINE',
          collection: 'duricare_knowledge_v1',
        },
        acceptedIndexRunId: null,
        jobs: {
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
        },
      };

      const receipt = {
        requestId: body.requestId,
        operation: 'PUBLISH',
        committedAt: new Date().toISOString(),
        replayed: false,
        head: HEAD_01,
        publication: createdPub,
        job: {
          id: '00000000-0000-0000-0000-000000000401',
          publicationId: createdPub.id,
          kind: 'INDEX',
          status: 'QUEUED',
          phase: 'VALIDATE',
          claimCount: 0,
          maxClaims: 5,
          nextAttemptAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          errorCode: null,
        },
      };

      return respondJson(202, receipt, {
        Location: `/admin/knowledge/publications/${createdPub.id}`,
      });
    }

    // 6. Publications List
    if (apiPath.includes('/admin/knowledge/publications') && method === 'GET' && !apiPath.includes('/jobs') && !apiPath.includes('/events') && !apiPath.includes(PUB_02_ACTIVE.id) && !apiPath.includes(PUB_03_FAILED.id) && !apiPath.includes('00000000-0000-0000-0000-000000000301')) {
      return respondJson(200, {
        content: ALL_PUBLICATIONS,
        page: 0,
        size: 15,
        totalElements: ALL_PUBLICATIONS.length,
        totalPages: 1,
      });
    }

    // 7. Publication Events for Pub 02 and Pub 03
    if (apiPath.includes(`/admin/knowledge/publications/${PUB_02_ACTIVE.id}/events`) || apiPath.includes(`/admin/knowledge/publications/${PUB_03_FAILED.id}/events`)) {
      if (simulateEvents503Once) {
        simulateEvents503Once = false;
        return respondJson(503, {
          error: 'service_unavailable',
          code: 'service_unavailable',
          message: 'Dịch vụ nhật ký sự kiện tạm thời không khả dụng (503). Vui lòng thử lại.',
          fieldErrors: [],
        });
      }
      return respondJson(200, PUB_02_EVENTS);
    }
    if (apiPath.includes('/admin/knowledge/publications/00000000-0000-0000-0000-000000000301/events')) {
      return respondJson(200, { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
    }

    // 8. POST Revoke for Pub 02
    if (apiPath.includes(`/admin/knowledge/publications/${PUB_02_ACTIVE.id}/revoke`) && method === 'POST') {
      revokePostCount++;
      if (simulateRevokeTimeoutOnce) {
        simulateRevokeTimeoutOnce = false;
        return req.abort('timedout');
      }
      if (simulateRevokeCommittedBeforeTimeoutOnce) {
        simulateRevokeCommittedBeforeTimeoutOnce = false;
        const body = JSON.parse(req.postData());
        const revokedPub = {
          ...PUB_02_ACTIVE,
          status: 'REVOKED',
          revokedAt: new Date().toISOString(),
        };
        const receipt = {
          requestId: body.requestId,
          operation: 'REVOKE',
          committedAt: new Date().toISOString(),
          replayed: false,
          head: {
            ...HEAD_02,
            version: HEAD_02.version + 1,
            activePublicationId: null,
          },
          publication: revokedPub,
          job: null,
        };
        OPERATION_RECEIPTS.set(body.requestId, receipt);
        HEAD_02.version += 1;
        return req.abort('timedout');
      }
      const body = JSON.parse(req.postData());
      const revokedPub = {
        ...PUB_02_ACTIVE,
        status: 'REVOKED',
        revokedAt: new Date().toISOString(),
      };
      const receipt = {
        requestId: body.requestId,
        operation: 'REVOKE',
        committedAt: new Date().toISOString(),
        replayed: false,
        head: {
          ...HEAD_02,
          version: HEAD_02.version + 1,
          activePublicationId: null,
        },
        publication: revokedPub,
        job: null,
      };
      OPERATION_RECEIPTS.set(body.requestId, receipt);
      HEAD_02.version += 1;
      return respondJson(200, receipt);
    }

    // 9. POST Retry for Pub 03
    if (apiPath.includes(`/admin/knowledge/publications/${PUB_03_FAILED.id}/retry`) && method === 'POST') {
      retryPostCount++;
      if (simulateRetryConflictOnce) {
        simulateRetryConflictOnce = false;
        return respondJson(409, {
          error: 'conflict',
          code: 'stale_version',
          message: 'Phiên bản xuất bản đã thay đổi trên máy chủ (v2 -> v3). Vui lòng tải lại head.',
          fieldErrors: [],
        });
      }
      if (simulateRetryTimeoutOnce) {
        simulateRetryTimeoutOnce = false;
        return req.abort('timedout');
      }
      const body = JSON.parse(req.postData());
      const receipt = {
        requestId: body.requestId,
        operation: 'RETRY_INDEX',
        committedAt: new Date().toISOString(),
        replayed: false,
        head: {
          ...HEAD_03,
          version: HEAD_03.version + 1,
        },
        publication: PUB_03_FAILED,
        job: {
          id: '00000000-0000-0000-0000-000000000404',
          publicationId: PUB_03_FAILED.id,
          kind: 'INDEX',
          status: 'QUEUED',
          phase: 'VALIDATE',
          claimCount: 0,
          maxClaims: 5,
          nextAttemptAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          errorCode: null,
        },
      };
      OPERATION_RECEIPTS.set(body.requestId, receipt);
      HEAD_03.version += 1;
      return respondJson(202, receipt);
    }

    // 9b. GET Operation Receipt by requestId
    if (apiPath.includes('/admin/knowledge/publication-operations/') && method === 'GET') {
      const parts = apiPath.split('/publication-operations/');
      const opRequestId = decodeURIComponent(parts[1] || '');
      const rec = OPERATION_RECEIPTS.get(opRequestId);
      if (rec) {
        return respondJson(200, {
          requestId: rec.requestId,
          operation: rec.operation,
          committedAt: rec.committedAt,
          responseStatus: rec.operation === 'REVOKE' ? 200 : 202,
          response: rec,
        });
      }
      return respondJson(404, {
        error: 'not_found',
        code: 'not_found',
        message: 'Không tìm thấy biên nhận thao tác',
        fieldErrors: [],
      });
    }

    // 10. Publication Detail for Pub 01
    if (apiPath.endsWith('/admin/knowledge/publications/00000000-0000-0000-0000-000000000301') && method === 'GET') {
      return respondJson(200, PUB_01_DETAIL || {
        head: HEAD_01,
        publication: {
          id: '00000000-0000-0000-0000-000000000301',
          sourceId: SOURCE_01.id,
          revisionId: REVISION_01_APPROVED.id,
          revisionNumber: 1,
          generation: 1,
          status: 'PENDING',
          sourceTitle: SOURCE_01.latestRevision.title,
          assessedTier: 'A',
          chunkCount: 2,
          manifestHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          createdAt: new Date().toISOString(),
          activatedAt: null,
          revokedAt: null,
          latestJobId: '00000000-0000-0000-0000-000000000401',
        },
        manifest: { sourceId: SOURCE_01.id, revisionId: REVISION_01_APPROVED.id, revisionNumber: 1, sourceTitle: SOURCE_01.latestRevision.title, sourceUrl: '', year: 2024, edition: null, assessedTier: 'A', tierPolicyVersion: 'DURI-1B-v1', chunks: [] },
        fingerprint: { projectionVersion: 1, embeddingModelId: 'text-embedding-3-small', embeddingModelRevision: '2024-05', dimension: 1536, distance: 'COSINE', collection: 'duricare_knowledge_v1' },
        acceptedIndexRunId: null,
        jobs: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
      });
    }

    // 11. Publication Detail for Pub 02
    if (apiPath.endsWith(`/admin/knowledge/publications/${PUB_02_ACTIVE.id}`) && method === 'GET') {
      if (simulateDetail503Once) {
        simulateDetail503Once = false;
        return respondJson(503, {
          error: 'service_unavailable',
          code: 'service_unavailable',
          message: 'Dịch vụ chi tiết xuất bản tạm thời không khả dụng (503). Vui lòng thử lại sau.',
          fieldErrors: [],
        });
      }
      return respondJson(200, {
        ...PUB_02_DETAIL,
        head: HEAD_02,
        publication: {
          ...PUB_02_ACTIVE,
          status: PUB_02_ACTIVE.status,
        },
      });
    }

    // 12. Publication Detail for Pub 03
    if (apiPath.endsWith(`/admin/knowledge/publications/${PUB_03_FAILED.id}`) && method === 'GET') {
      return respondJson(200, PUB_03_DETAIL);
    }

    // 13. Job Detail for Job 02
    if (apiPath.includes('/admin/knowledge/publication-jobs/00000000-0000-0000-0000-000000000402')) {
      return respondJson(200, JOB_02_DETAIL);
    }

    // 13. Governance submissions list
    if (apiPath.includes('/admin/knowledge/submissions')) {
      return respondJson(200, {
        content: [],
        page: 0,
        size: 15,
        totalElements: 0,
        totalPages: 0,
      });
    }

    // Fallback for any unmocked API route
    return respondJson(200, {});
  });

  try {
    // Helper to set auth tokens in localStorage
    const setSession = async (user) => {
      currentUser = user;
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'mock-token-fe-gov-002');
        localStorage.setItem('duricare-language', 'vi');
      });
    };

    // -------------------------------------------------------------
    // Test Case 1: Admin Navigation & Publications Tab
    // -------------------------------------------------------------
    console.log('\n--- Test Case 1: Admin Navigation & Publications Tab ---');
    await page.goto(`${BASE_URL}/login`);
    await setSession(ADMIN_USER);
    await page.goto(`${BASE_URL}/settings/knowledge`, { waitUntil: 'networkidle0' });
    console.log('Current URL after navigation:', page.url());
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    console.log('Page body prefix:', bodyHtml.slice(0, 300));
    await page.waitForSelector('[data-testid="tab-publications"]', { timeout: 5000 });

    // Click on Publications tab
    await page.click('[data-testid="tab-publications"]');
    await page.waitForSelector('[data-testid="admin-publications-tab-content"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="publications-table"]', { timeout: 5000 });

    const pubRowCount = await page.$$eval('[data-testid^="publication-row-"]', (els) => els.length);
    console.log(`  Publications table rendered with ${pubRowCount} rows.`);
    assert(pubRowCount >= 2, 'Expected at least 2 publication rows');

    await captureScreenshot(page, 'rag_pub_01_admin_publications_queue_1440.png');
    console.log('  ✓ [PASS] Case 1: Admin Publications Tab & Table verified');

    // -------------------------------------------------------------
    // Test Case 2: Role Access Control Matrix (EXPERT denied admin controls)
    // -------------------------------------------------------------
    console.log('\n--- Test Case 2: Role Access Control Matrix ---');
    await setSession(EXPERT_USER);
    await page.goto(`${BASE_URL}/knowledge/sources/${SOURCE_01.id}`);
    await page.waitForSelector('h1', { timeout: 5000 });

    // Expert should NOT see the publication-head-card
    const hasPubCardForExpert = await page.$('[data-testid="publication-head-card"]');
    assert.strictEqual(hasPubCardForExpert, null, 'EXPERT must NOT see publication head card');
    console.log('  Confirmed EXPERT does not see publication head card.');

    await captureScreenshot(page, 'rag_pub_02_expert_no_publication_controls_1440.png');
    console.log('  ✓ [PASS] Case 2: Role Access Control verified');

    // -------------------------------------------------------------
    // Test Case 3: Separate Review State vs Publication State
    // -------------------------------------------------------------
    console.log('\n--- Test Case 3: Separate Review State vs Publication State ---');
    await setSession(ADMIN_USER);
    await page.goto(`${BASE_URL}/knowledge/sources/${SOURCE_01.id}`);
    await page.waitForSelector('[data-testid="publication-head-card"]', { timeout: 5000 });

    // Verify Review status is APPROVED
    const reviewStatus = await page.$eval('[data-testid="approved-notice-banner"]', (el) => el.textContent);
    assert(reviewStatus.includes('đã được phê duyệt thẩm định chuyên môn'), 'Review status must indicate APPROVED');

    // Verify publication head is virtual v0 (unindexed)
    const pubCardText = await page.$eval('[data-testid="publication-head-card"]', (el) => el.textContent);
    assert(pubCardText.includes('Chưa có'), 'Active publication must be none (Chưa có)');
    assert(pubCardText.includes('Phiên bản đã duyệt, sẵn sàng xuất bản'), 'Notice must state approved & ready');

    // Publish button must be visible for ADMIN
    const publishBtn = await page.$('[data-testid="open-publish-modal-button"]');
    assert(publishBtn !== null, 'ADMIN must see publish button on latest APPROVED revision');

    await captureScreenshot(page, 'rag_pub_03_approved_not_published_state_1440.png');
    console.log('  ✓ [PASS] Case 3: Review state strictly separated from Publication state');

    // -------------------------------------------------------------
    // Test Case 4: Publish Modal Preflight, Reason & 202 Accepted Flow
    // -------------------------------------------------------------
    console.log('\n--- Test Case 4: Publish Modal Preflight & Submit Flow ---');
    await page.click('[data-testid="open-publish-modal-button"]');
    await page.waitForSelector('[data-testid="publish-submit-button"]', { timeout: 5000 });

    // Submit button should be disabled initially
    const isSubmitDisabledInitial = await page.$eval('[data-testid="publish-submit-button"]', (el) => el.disabled);
    assert.strictEqual(isSubmitDisabledInitial, true, 'Submit button must be disabled when reason/disclosure missing');

    // Type reason
    await page.type(
      '[data-testid="publish-reason-input"]',
      'Phê chuẩn xuất bản hướng dẫn GlobalGAP tưới nước sầu riêng vào trợ lý RAG.'
    );

    // Toggle disclosureConfirmed
    await page.click('[data-testid="publish-disclosure-checkbox"]');

    // Submit button should now be enabled
    const isSubmitEnabled = await page.$eval('[data-testid="publish-submit-button"]', (el) => !el.disabled);
    assert.strictEqual(isSubmitEnabled, true, 'Submit button must be enabled after valid reason and disclosure');

    // Click submit
    await page.click('[data-testid="publish-submit-button"]');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 5000 });

    // Card should now display PENDING status
    await page.waitForSelector('[data-testid="publication-status-badge-pending"]', { timeout: 5000 });
    const updatedCardText = await page.$eval('[data-testid="publication-head-card"]', (el) => el.textContent);
    assert(updatedCardText.includes('Bản chờ xử lý (Pending)'), 'Must show pending publication in card');

    await captureScreenshot(page, 'rag_pub_04_publish_submitted_pending_receipt_1440.png');
    console.log('  ✓ [PASS] Case 4: Publish modal submitted and 202 PENDING status reflected');

    // -------------------------------------------------------------
    // Test Case 5: 409 Conflict Handling & Verified Head Reload
    // -------------------------------------------------------------
    console.log('\n--- Test Case 5: 409 Conflict Handling & Verified Head Reload ---');
    // Re-open publish modal simulating 409 conflict
    simulateConflictOnce = true;
    HEAD_01.pendingPublicationId = null; // reset pending temporarily for test
    await page.reload();
    await page.waitForSelector('[data-testid="open-publish-modal-button"]', { timeout: 5000 });
    await page.click('[data-testid="open-publish-modal-button"]');
    await page.waitForSelector('[data-testid="publish-reason-input"]', { timeout: 5000 });

    const enteredReason = 'Lý do thử nghiệm xử lý xung đột phiên bản 409 stale_version.';
    await page.type('[data-testid="publish-reason-input"]', enteredReason);
    await page.click('[data-testid="publish-disclosure-checkbox"]');
    await page.click('[data-testid="publish-submit-button"]');

    // Wait for conflict error banner
    await page.waitForSelector('[data-testid="publish-error-banner"]', { timeout: 5000 });
    const bannerText = await page.$eval('[data-testid="publish-error-banner"]', (el) => el.textContent);
    assert(bannerText.includes('Phiên bản xuất bản đã thay đổi'), 'Must show stale_version conflict error message');

    // Assert F2 / Contract: Submit button must be disabled when 409 conflict occurs
    const isConflictSubmitDisabled = await page.$eval('[data-testid="publish-submit-button"]', (el) => el.disabled);
    assert.strictEqual(isConflictSubmitDisabled, true, 'Submit button must be disabled when 409 conflict occurs');

    // Verify entered reason is PRESERVED
    const preservedReason = await page.$eval('[data-testid="publish-reason-input"]', (el) => el.value);
    assert.strictEqual(preservedReason, enteredReason, 'Reason must be preserved on conflict');

    // Click "Tải lại head"
    await page.click('[data-testid="publish-reload-head-button"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="publish-error-banner"]'), { timeout: 5000 });

    // Submit again after head reload
    await page.click('[data-testid="publish-submit-button"]');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 5000 });

    await captureScreenshot(page, 'rag_pub_05_conflict_reload_recovery_1440.png');
    console.log('  ✓ [PASS] Case 5: 409 Conflict handled, text preserved, reload verified');

    // -------------------------------------------------------------
    // Test Case 6: Publication Detail Inspector & Stitch Layout / Events Separation
    // -------------------------------------------------------------
    console.log('\n--- Test Case 6: Publication Detail Inspector & Stitch Layout / Events Separation ---');
    await page.goto(`${BASE_URL}/settings/knowledge`);
    await page.waitForSelector('[data-testid="tab-publications"]', { timeout: 5000 });
    await page.click('[data-testid="tab-publications"]');
    await page.waitForSelector(`[data-testid="inspect-pub-${PUB_03_FAILED.id}"]`, { timeout: 5000 });

    // Open Inspect on PUB_03_FAILED (where both Revoke and Retry Index are eligible)
    await page.click(`[data-testid="inspect-pub-${PUB_03_FAILED.id}"]`);
    await page.waitForSelector('[data-testid="detail-tab-manifest"]', { timeout: 5000 });

    // Check Manifest content
    const manifestModalText = await page.$eval('[role="dialog"]', (el) => el.textContent);
    assert(manifestModalText.includes('text-embedding-3-small'), 'Must show embedding model');
    assert(manifestModalText.includes('duricare_knowledge_v1'), 'Must show collection name');

    // 6a. Events Error 503 vs Empty vs Retry (Finding 3)
    simulateEvents503Once = true;
    await page.click('[data-testid="detail-tab-events"]');
    await page.waitForSelector('[data-testid="events-error-banner"]', { timeout: 5000 });

    const eventsErrorText = await page.$eval('[data-testid="events-error-banner"]', (el) => el.textContent);
    assert(eventsErrorText.includes('503') || eventsErrorText.includes('không khả dụng') || eventsErrorText.includes('nhật ký sự kiện'), 'Must display events 503 error message');
    const isRetryBtnPresent = await page.$('[data-testid="retry-events-button"]');
    assert(isRetryBtnPresent, 'Must offer "Thử lại" button on events error');
    const emptyStateWhenError = await page.$('[data-testid="events-empty-state"]');
    assert.strictEqual(emptyStateWhenError, null, 'Must NOT show empty state when events failed with 503');

    // Click "Thử lại" to load events cleanly
    await page.click('[data-testid="retry-events-button"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="events-error-banner"]'), { timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent.includes('REQUESTED'), { timeout: 5000 });

    // Switch back to Jobs tab for Footer verification
    await page.click('[data-testid="detail-tab-jobs"]');
    await page.waitForSelector('[data-testid="detail-retry-index-button"]', { timeout: 5000 });

    // 6b. Desktop 1440px Footer Layout Verification (Finding 2)
    await page.setViewport({ width: 1440, height: 900 });
    await page.waitForSelector('[data-testid="close-publication-detail-footer-button"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="detail-revoke-button"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="detail-retry-index-button"]', { timeout: 5000 });

    const closeBtnVisibleDesktop = await page.$eval('[data-testid="close-publication-detail-footer-button"]', (el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && el.offsetWidth > 0;
    });
    assert.strictEqual(closeBtnVisibleDesktop, true, 'Desktop footer must display "Đóng" button');

    const desktopPositions = await page.evaluate(() => {
      const getBox = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left };
      };
      const closeEl = document.querySelector('[data-testid="close-publication-detail-footer-button"]');
      const revokeEl = document.querySelector('[data-testid="detail-revoke-button"]');
      const retryEl = document.querySelector('[data-testid="detail-retry-index-button"]');
      return {
        close: getBox(closeEl),
        revoke: getBox(revokeEl),
        retry: getBox(retryEl),
      };
    });
    console.log('DESKTOP_POSITIONS', JSON.stringify(desktopPositions));
    assert(desktopPositions.close && desktopPositions.revoke && desktopPositions.retry, 'All three footer buttons must be rendered on desktop');
    assert(desktopPositions.close.x < desktopPositions.revoke.x, 'Desktop: "Đóng" must be on left');
    assert(desktopPositions.revoke.x < desktopPositions.retry.x, 'Desktop: "Thu hồi" must be on left of "Thử lập chỉ mục lại"');

    await captureScreenshot(page, 'rag_pub_06_publication_detail_inspector_1440.png');
    console.log('  ✓ [PASS] Desktop 1440px detail footer layout verified');

    // 6c. Mobile 390px Footer Layout Verification (Finding 2)
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 200));

    const closeBtnHidden390 = await page.$eval('[data-testid="close-publication-detail-footer-button"]', (el) => {
      const style = window.getComputedStyle(el.parentElement || el);
      return style.display === 'none' || el.offsetWidth === 0;
    });
    assert.strictEqual(closeBtnHidden390, true, 'Mobile 390px: footer "Đóng" button must be hidden');

    const mobile390Positions = await page.evaluate(() => {
      const getBox = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left };
      };
      const revokeEl = document.querySelector('[data-testid="detail-revoke-button"]');
      const retryEl = document.querySelector('[data-testid="detail-retry-index-button"]');
      return {
        revoke: getBox(revokeEl),
        retry: getBox(retryEl),
      };
    });
    assert(mobile390Positions.revoke && mobile390Positions.retry, 'Both action buttons must be rendered on mobile 390px');
    assert(mobile390Positions.retry.y < mobile390Positions.revoke.y, 'Mobile 390px: Primary "Thử lập chỉ mục lại" must be stacked ABOVE secondary "Thu hồi"');
    assert(mobile390Positions.retry.width >= 330, 'Mobile 390px: Primary button must be full-width with 16px gutters');
    assert(mobile390Positions.revoke.width >= 330, 'Mobile 390px: Secondary button must be full-width with 16px gutters');
    assert(mobile390Positions.retry.height >= 44 && mobile390Positions.revoke.height >= 44, 'Mobile buttons must have 44px min touch target');

    await captureScreenshot(page, 'rag_pub_detail_mobile_390.png');
    console.log('  ✓ [PASS] Mobile 390px detail footer layout verified (Primary on top, Secondary on bottom, Đóng hidden)');

    // 6d. Mobile 375px Footer Layout Verification (Finding 2)
    await page.setViewport({ width: 375, height: 667 });
    await new Promise((r) => setTimeout(r, 200));

    const closeBtnHidden375 = await page.$eval('[data-testid="close-publication-detail-footer-button"]', (el) => {
      const style = window.getComputedStyle(el.parentElement || el);
      return style.display === 'none' || el.offsetWidth === 0;
    });
    assert.strictEqual(closeBtnHidden375, true, 'Mobile 375px: footer "Đóng" button must be hidden');

    const mobile375Positions = await page.evaluate(() => {
      const getBox = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left };
      };
      const revokeEl = document.querySelector('[data-testid="detail-revoke-button"]');
      const retryEl = document.querySelector('[data-testid="detail-retry-index-button"]');
      return {
        revoke: getBox(revokeEl),
        retry: getBox(retryEl),
      };
    });
    assert(mobile375Positions.revoke && mobile375Positions.retry, 'Both action buttons must be rendered on mobile 375px');
    assert(mobile375Positions.retry.y < mobile375Positions.revoke.y, 'Mobile 375px: Primary "Thử lập chỉ mục lại" must be stacked ABOVE secondary "Thu hồi"');
    assert(mobile375Positions.retry.width >= 300, 'Mobile 375px: Primary button must be full-width with 16px gutters');
    assert(mobile375Positions.revoke.width >= 300, 'Mobile 375px: Secondary button must be full-width with 16px gutters');
    assert(Math.abs(mobile375Positions.retry.width - mobile375Positions.revoke.width) < 2, 'Mobile 375px: Buttons must both be full-width equal width');
    assert(mobile375Positions.retry.height >= 44 && mobile375Positions.revoke.height >= 44, 'Mobile 375px: Buttons must have 44px min touch target');

    await captureScreenshot(page, 'rag_pub_detail_mobile_375.png');
    console.log('  ✓ [PASS] Mobile 375px detail footer layout verified');

    // Restore desktop viewport and close detail modal using header close button
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise((r) => setTimeout(r, 200));
    await page.waitForSelector('[data-testid="close-publication-detail-modal-button"]', { visible: true, timeout: 5000 });
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="close-publication-detail-modal-button"]');
      if (btn) btn.click();
    });
    await page.waitForFunction(() => !document.querySelector('[data-purpose="publication-details-dialog"]'), { timeout: 5000 });

    // -------------------------------------------------------------
    // Test Case 7: Revocation Flow & Timeout Uncertainty Recovery (Admin Queue)
    // -------------------------------------------------------------
    console.log('\n--- Test Case 7: Revocation Flow & Timeout Uncertainty Recovery (Admin Queue) ---');
    // Prepare PENDING publication fixture for reviewer-reproduced probe
    PUB_02_ACTIVE.status = 'PENDING';
    HEAD_02.version = 2;
    HEAD_02.activePublicationId = null;
    HEAD_02.pendingPublicationId = PUB_02_ACTIVE.id;

    await page.waitForSelector(`[data-testid="revoke-pub-${PUB_02_ACTIVE.id}"]`, { timeout: 5000 });
    await page.click(`[data-testid="revoke-pub-${PUB_02_ACTIVE.id}"]`);
    await page.waitForSelector('[data-testid="revoke-reason-input"]', { timeout: 5000 });

    const enteredRevokeReason = 'Thu hồi tài liệu đã cập nhật phiên bản mới thay thế.';
    await page.type('[data-testid="revoke-reason-input"]', enteredRevokeReason);

    // Initial Revoke POST count check
    const initialRevokePostCount = revokePostCount;

    // Step 7a: Simulate timeout / aborted network connection
    simulateRevokeTimeoutOnce = true;
    await page.click('[data-testid="revoke-submit-button"]');
    await page.waitForSelector('[data-testid="revoke-error-banner"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="indeterminate-alert-banner"]', { timeout: 5000 });

    assert.strictEqual(revokePostCount, initialRevokePostCount + 1, 'Revoke POST count must increment by 1 on timeout submit');

    // Assert F1: Submit button is disabled and reload head / verify receipt is offered
    const isRevokeSubmitDisabled = await page.$eval('[data-testid="revoke-submit-button"]', (el) => el.disabled);
    assert.strictEqual(isRevokeSubmitDisabled, true, 'Submit button must be disabled after indeterminate error');

    // Open technical disclosure details so screenshot 07 displays all technical fields
    await page.evaluate(() => {
      const details = document.querySelector('[role="dialog"] details');
      if (details) details.open = true;
    });

    // CAPTURE SCREENSHOT 07 while Revoke modal is visibly OPEN!
    await captureScreenshot(page, 'rag_pub_07_revocation_confirmed_1440.png');
    console.log('  Saved screenshot 07 (Revoke modal open with indeterminate recovery): rag_pub_07_revocation_confirmed_1440.png');

    // Assert recovery button layout geometry across Desktop (1440px), Mobile (390px), Mobile (375px)
    await assertRecoveryButtonLayout(page, '[data-testid="revoke-publication-modal"]', 'RevokeModal');

    // --- Scenario A (Admin Queue) ---
    // PENDING + timeout + receipt 404 + head version bumped independently (v2 -> v3) but pendingPublicationId remains target
    HEAD_02.version += 1;
    const postCountBeforeReloadA = revokePostCount;
    await page.click('[data-testid="revoke-reload-head-button"]');
    await page.waitForFunction(() => {
      const reloadBtn = document.querySelector('[data-testid="revoke-reload-head-button"]');
      return reloadBtn && !reloadBtn.disabled;
    }, { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 300));

    // Assert Scenario A:
    const isModalOpenA = await page.evaluate(() => Boolean(document.querySelector('[data-testid="revoke-publication-modal"]')));
    assert.strictEqual(isModalOpenA, true, 'Scenario A: Modal must remain OPEN when head version bumped but target still in pendingPublicationId');
    const isSubmitDisabledA = await page.$eval('[data-testid="revoke-submit-button"]', (el) => el.disabled);
    assert.strictEqual(isSubmitDisabledA, true, 'Scenario A: Submit button must RETAIN disabled state');
    const hasLockBannerA = await page.evaluate(() => Boolean(document.querySelector('[data-testid="indeterminate-alert-banner"]')));
    assert.strictEqual(hasLockBannerA, true, 'Scenario A: Indeterminate lock banner must remain visible');
    const reasonA = await page.$eval('[data-testid="revoke-reason-input"]', (el) => el.value);
    assert.strictEqual(reasonA, enteredRevokeReason, 'Scenario A: Reason must be preserved');
    assert.strictEqual(revokePostCount, postCountBeforeReloadA, 'Scenario A: POST count must NOT increase on head reload');

    // Also click "Xác minh biên nhận" under Scenario A: receipt 404 + pending pointer -> must not clear lock
    await page.click('[data-testid="verify-receipt-button"]');
    await page.waitForFunction(() => {
      const verifyBtn = document.querySelector('[data-testid="verify-receipt-button"]');
      return verifyBtn && !verifyBtn.disabled;
    }, { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 300));
    assert.strictEqual(await page.$eval('[data-testid="revoke-submit-button"]', (el) => el.disabled), true, 'Scenario A: Submit button still disabled after verify-receipt with target still pending');
    assert.strictEqual(revokePostCount, postCountBeforeReloadA, 'Scenario A: POST count must NOT increase after verify-receipt');

    // --- Scenario B (Admin Queue) ---
    // Target leaves head pointer (pendingPublicationId = null), but detail readback still returns PENDING
    HEAD_02.pendingPublicationId = null;
    PUB_02_ACTIVE.status = 'PENDING';
    const postCountBeforeB = revokePostCount;
    await page.click('[data-testid="verify-receipt-button"]');
    await page.waitForFunction(() => {
      const verifyBtn = document.querySelector('[data-testid="verify-receipt-button"]');
      return verifyBtn && !verifyBtn.disabled;
    }, { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 300));

    assert.strictEqual(await page.evaluate(() => Boolean(document.querySelector('[data-testid="revoke-publication-modal"]'))), true, 'Scenario B: Modal must remain OPEN when detail status is still PENDING');
    assert.strictEqual(await page.$eval('[data-testid="revoke-submit-button"]', (el) => el.disabled), true, 'Scenario B: Submit must remain disabled');
    assert.strictEqual(revokePostCount, postCountBeforeB, 'Scenario B: POST count must NOT increase');

    // --- Scenario C (Admin Queue) ---
    // Detail readback error (503 Service Unavailable)
    simulateDetail503Once = true;
    const postCountBeforeC = revokePostCount;
    await page.click('[data-testid="verify-receipt-button"]');
    await page.waitForSelector('[data-testid="revoke-error-banner"]', { timeout: 5000 });
    const bannerTextC = await page.$eval('[data-testid="revoke-error-banner"]', (el) => el.textContent);
    assert(bannerTextC.includes('503') || bannerTextC.includes('không khả dụng'), 'Scenario C: Must display detail readback 503 error message');
    assert.strictEqual(await page.$eval('[data-testid="revoke-submit-button"]', (el) => el.disabled), true, 'Scenario C: Submit must remain disabled');
    assert.strictEqual(revokePostCount, postCountBeforeC, 'Scenario C: POST count must NOT increase');

    // Step 7c: Close modal and verify uncertainty lock badge persists in parent table
    await page.click('[data-testid="close-revoke-modal-button"]');
    await page.waitForSelector(`[data-testid="indeterminate-lock-badge-${PUB_02_ACTIVE.id}"]`, { timeout: 5000 });

    // Step 7d: Re-open modal and verify preserved requestId, reason, and locked submit
    await page.click(`[data-testid="revoke-pub-${PUB_02_ACTIVE.id}"]`);
    await page.waitForSelector('[data-testid="revoke-reason-input"]', { timeout: 5000 });
    const preservedRevokeReason = await page.$eval('[data-testid="revoke-reason-input"]', (el) => el.value);
    assert.strictEqual(preservedRevokeReason, enteredRevokeReason, 'Revoke reason must survive modal close/reopen');
    assert.strictEqual(await page.$eval('[data-testid="revoke-submit-button"]', (el) => el.disabled), true, 'Submit button must remain disabled when reopened in indeterminate state');

    // --- Scenario F (Admin Queue) ---
    // Late receipt fence test (SPA A -> B)
    simulateLateReceiptOnce = true;
    const arrived = page.waitForRequest((req) => req.url().includes('/publication-operations/'));
    await page.click('[data-testid="verify-receipt-button"]');
    await arrived;
    assert(releaseReceipt, 'Receipt request must be pending');
    await page.click('[data-testid="close-revoke-modal-button"]');
    await page.click(`[data-testid="revoke-pub-${PUB_03_FAILED.id}"]`);
    await page.waitForSelector('[data-testid="revoke-reason-input"]');
    await page.type('[data-testid="revoke-reason-input"]', 'TEST independent reason for publication B');
    const beforeB = await page.$eval('[data-testid="revoke-reason-input"]', (el) => el.value);
    const response = page.waitForResponse(
      (res) => res.url().includes('/publication-operations/') && res.status() === 404
    );
    releaseReceipt();
    await response;
    await new Promise((resolve) => setTimeout(resolve, 400));
    const afterB = await page.evaluate(
      () => document.querySelector('[data-testid="revoke-reason-input"]')?.value ?? null
    );
    assert.strictEqual(afterB, beforeB, 'Scenario F: Late receipt A must preserve modal and reason B');
    await page.click('[data-testid="close-revoke-modal-button"]');

    // --- Scenario D (Admin Queue) ---
    // Valid receipt confirms revocation
    await page.click(`[data-testid="revoke-pub-${PUB_02_ACTIVE.id}"]`);
    await page.waitForSelector('[data-testid="verify-receipt-button"]', { timeout: 5000 });

    const currentOpRequestId = await page.$eval('[data-testid="modal-request-id"]', (el) => el.textContent.trim());
    if (currentOpRequestId) {
      OPERATION_RECEIPTS.set(currentOpRequestId, {
        requestId: currentOpRequestId,
        operation: 'REVOKE',
        committedAt: new Date().toISOString(),
        replayed: false,
        head: { ...HEAD_02, version: HEAD_02.version + 1, activePublicationId: null, pendingPublicationId: null },
        publication: { ...PUB_02_ACTIVE, status: 'REVOKED' },
        job: null,
      });
      HEAD_02.version += 1;
      PUB_02_ACTIVE.status = 'REVOKED';
    }

    await page.click('[data-testid="verify-receipt-button"]');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 5000 });
    const badgeSelector = `[data-testid="indeterminate-lock-badge-${PUB_02_ACTIVE.id}"]`;
    await page.waitForFunction((sel) => !document.querySelector(sel), {}, badgeSelector);
    console.log('  ✓ [PASS] Case 7: Admin Queue Scenarios A, B, C, D, F verified');

    // -------------------------------------------------------------
    // Test Case 8: Retry Flow for Failed Job & 409 Recovery & Timeout Uncertainty
    // -------------------------------------------------------------
    console.log('\n--- Test Case 8: Retry Flow for Failed Job & 409 Recovery ---');
    await page.waitForSelector(`[data-testid="inspect-pub-${PUB_03_FAILED.id}"]`, { timeout: 5000 });
    await page.click(`[data-testid="inspect-pub-${PUB_03_FAILED.id}"]`);
    await page.waitForSelector('[data-testid="detail-retry-index-button"]', { timeout: 5000 });

    await page.click('[data-testid="detail-retry-index-button"]');
    await page.waitForSelector('[data-testid="retry-reason-input"]', { timeout: 5000 });

    const retryReasonText = 'Thử lại tác vụ chỉ mục sau khi khôi phục provider.';
    await page.type('[data-testid="retry-reason-input"]', retryReasonText);

    // Step 8a: Simulate 409 stale_version on Retry
    simulateRetryConflictOnce = true;
    await page.click('[data-testid="retry-submit-button"]');
    await page.waitForSelector('[data-testid="retry-error-banner"]', { timeout: 5000 });

    // Assert F2: Submit button disabled on conflict, reload offered
    const isRetrySubmitDisabled = await page.$eval('[data-testid="retry-submit-button"]', (el) => el.disabled);
    assert.strictEqual(isRetrySubmitDisabled, true, 'Retry submit button must be disabled on 409 conflict');
    const isRetryReloadOffered = await page.evaluate(() =>
      [...document.querySelectorAll('[role="dialog"] button')].some((b) => b.textContent.includes('Tải lại head'))
    );
    assert.strictEqual(isRetryReloadOffered, true, 'Reload head button must be offered on Retry 409 conflict');

    // Click "Tải lại head"
    await page.click('[data-testid="retry-reload-head-button"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="retry-error-banner"]'), { timeout: 5000 });

    const retryReasonAfterConflict = await page.$eval('[data-testid="retry-reason-input"]', (el) => el.value);
    assert.strictEqual(retryReasonAfterConflict, retryReasonText, 'Retry reason must be preserved after 409 reload');
    const isRetryReenabled = await page.$eval('[data-testid="retry-submit-button"]', (el) => !el.disabled);
    assert.strictEqual(isRetryReenabled, true, 'Submit button must be re-enabled after 409 reload');

    // Step 8b: Simulate Timeout / Indeterminate state on Retry
    const initialRetryPostCount = retryPostCount;
    simulateRetryTimeoutOnce = true;
    await page.click('[data-testid="retry-submit-button"]');
    await page.waitForSelector('[data-testid="indeterminate-alert-banner"]', { timeout: 5000 });
    assert.strictEqual(retryPostCount, initialRetryPostCount + 1, 'Retry POST count must increment by 1 on timeout submit');

    // Open technical disclosure details so screenshot 08 displays all technical fields
    await page.evaluate(() => {
      const details = document.querySelector('[role="dialog"] details');
      if (details) details.open = true;
    });

    // CAPTURE SCREENSHOT 08 while Retry modal is visibly OPEN!
    await captureScreenshot(page, 'rag_pub_08_retry_job_flow_1440.png');
    console.log('  Saved screenshot 08 (Retry modal open with indeterminate recovery): rag_pub_08_retry_job_flow_1440.png');

    // Assert recovery button layout geometry across Desktop (1440px), Mobile (390px), Mobile (375px)
    await assertRecoveryButtonLayout(page, '[data-testid="retry-publication-modal"]', 'RetryModal');

    // Click "Tải lại head" when receipt is 404 and head is unchanged:
    await page.click('[data-testid="retry-reload-head-button"]');
    await new Promise((r) => setTimeout(r, 400));

    const isRetryStillLocked = await page.$eval('[data-testid="retry-submit-button"]', (el) => el.disabled);
    assert.strictEqual(isRetryStillLocked, true, 'Retry submit button must RETAIN locked state when head unchanged');
    assert.strictEqual(retryPostCount, initialRetryPostCount + 1, 'Retry POST count must NOT increase on head reload');

    // Close and reopen Retry modal
    await page.click('[data-testid="close-retry-modal-button"]');
    await page.waitForSelector(`[data-testid="inspect-pub-${PUB_03_FAILED.id}"]`, { timeout: 5000 });
    await page.click(`[data-testid="inspect-pub-${PUB_03_FAILED.id}"]`);
    await page.waitForSelector('[data-testid="detail-retry-index-button"]', { timeout: 5000 });
    await page.click('[data-testid="detail-retry-index-button"]');
    await page.waitForSelector('[data-testid="retry-reason-input"]', { timeout: 5000 });

    const preservedRetryReason = await page.$eval('[data-testid="retry-reason-input"]', (el) => el.value);
    assert.strictEqual(preservedRetryReason, retryReasonText, 'Retry reason must survive modal close/reopen');

    // Now resolve retry cleanly with server receipt
    const retryRequestId = await page.$eval('[data-testid="modal-request-id"]', (el) => el.textContent.trim());

    if (retryRequestId) {
      OPERATION_RECEIPTS.set(retryRequestId, {
        requestId: retryRequestId,
        operation: 'RETRY_INDEX',
        committedAt: new Date().toISOString(),
        replayed: false,
        head: { ...HEAD_03, version: HEAD_03.version + 1 },
        publication: PUB_03_FAILED,
        job: {
          id: '00000000-0000-0000-0000-000000000404',
          publicationId: PUB_03_FAILED.id,
          kind: 'INDEX',
          status: 'QUEUED',
          phase: 'VALIDATE',
          claimCount: 0,
          maxClaims: 5,
          nextAttemptAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          errorCode: null,
        },
      });
      HEAD_03.version += 1;
    }

    await page.click('[data-testid="verify-receipt-button"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="retry-publication-modal"]'), { timeout: 5000 });
    console.log('  ✓ [PASS] Case 8: Retry job flow, 409 conflict and timeout uncertainty recovery verified');

    // -------------------------------------------------------------
    // Test Case 9: Mobile Viewport & English Localization
    // -------------------------------------------------------------
    console.log('\n--- Test Case 9: Mobile Viewport & English Localization ---');
    await page.setViewport({ width: 375, height: 667 });
    await page.evaluate(() => {
      localStorage.setItem('duricare-language', 'en');
      window.dispatchEvent(new Event('storage'));
    });
    await page.goto(`${BASE_URL}/settings/knowledge`);
    await page.waitForSelector('[data-testid="tab-publications"]', { timeout: 5000 });
    await page.click('[data-testid="tab-publications"]');
    await page.waitForSelector('[data-testid="publications-table"]', { timeout: 5000 });

    const enTabText = await page.$eval('[data-testid="tab-publications"]', (el) => el.textContent);
    console.log(`  English tab label: "${enTabText.trim()}"`);
    assert.strictEqual(enTabText.includes('RAG Publications'), true, 'Tab text must strictly be "RAG Publications"');

    await captureScreenshot(page, 'rag_pub_09_mobile_english_dark_375.png');

    // Also capture tablet 768px viewport for multi-viewport proof
    await page.setViewport({ width: 768, height: 1024 });
    await captureScreenshot(page, 'rag_pub_10_tablet_english_768.png');
    console.log('  ✓ [PASS] Case 9: Mobile 375px, Tablet 768px responsive and English localization verified');

    // -------------------------------------------------------------
    // Test Case 10: PublicationHeadCard Scenarios A, B, C, E on /knowledge/sources/:id
    // -------------------------------------------------------------
    console.log('\n--- Test Case 10: PublicationHeadCard Scenarios A, B, C, E ---');
    // Switch language back to Vietnamese for Source Detail testing
    await page.evaluate(() => {
      localStorage.setItem('duricare-language', 'vi');
      window.dispatchEvent(new Event('storage'));
    });
    await page.setViewport({ width: 1440, height: 900 });

    // Setup Source 02 with PENDING publication
    PUB_02_ACTIVE.status = 'PENDING';
    HEAD_02.version = 10;
    HEAD_02.activePublicationId = null;
    HEAD_02.pendingPublicationId = PUB_02_ACTIVE.id;

    await page.goto(`${BASE_URL}/knowledge/sources/${SOURCE_02.id}`);
    await page.waitForSelector('[data-testid="publication-head-card"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="revoke-pending-pub-button"]', { timeout: 5000 });

    const initialCardPostCount = revokePostCount;
    await page.click('[data-testid="revoke-pending-pub-button"]');
    await page.waitForSelector('[data-testid="revoke-reason-input"]', { timeout: 5000 });

    const cardRevokeReason = 'Thu hồi publication pending trên thẻ đầu trang';
    await page.type('[data-testid="revoke-reason-input"]', cardRevokeReason);

    // Timeout submit on HeadCard
    simulateRevokeTimeoutOnce = true;
    await page.click('[data-testid="revoke-submit-button"]');
    await page.waitForSelector('[data-testid="indeterminate-alert-banner"]', { timeout: 5000 });
    assert.strictEqual(revokePostCount, initialCardPostCount + 1, 'HeadCard: Revoke POST count incremented by 1 on timeout');

    // Verify submit button disabled and indeterminate lock active
    assert.strictEqual(await page.$eval('[data-testid="revoke-submit-button"]', (el) => el.disabled), true, 'HeadCard: Submit disabled after timeout');

    // --- Scenario A (HeadCard) ---
    // Head version bump v10 -> v11 independently, target still in pendingPublicationId
    HEAD_02.version = 11;
    const postCountBeforeHeadCardA = revokePostCount;
    await page.click('[data-testid="revoke-reload-head-button"]');
    await new Promise((r) => setTimeout(r, 300));

    assert.strictEqual(await page.evaluate(() => Boolean(document.querySelector('[data-testid="revoke-publication-modal"]'))), true, 'HeadCard Scenario A: Modal must remain OPEN');
    assert.strictEqual(await page.$eval('[data-testid="revoke-submit-button"]', (el) => el.disabled), true, 'HeadCard Scenario A: Submit must remain disabled');
    assert.strictEqual(revokePostCount, postCountBeforeHeadCardA, 'HeadCard Scenario A: POST count must NOT increase');

    await page.click('[data-testid="revoke-publication-modal"] [data-testid="verify-receipt-button"]');
    await new Promise((r) => setTimeout(r, 300));
    assert.strictEqual(await page.$eval('[data-testid="revoke-submit-button"]', (el) => el.disabled), true, 'HeadCard Scenario A: Submit still disabled after verify-receipt');
    assert.strictEqual(revokePostCount, postCountBeforeHeadCardA, 'HeadCard Scenario A: POST count must NOT increase after verify-receipt');

    // --- Scenario B (HeadCard) ---
    // Target leaves head pointer, but detail still PENDING
    HEAD_02.pendingPublicationId = null;
    PUB_02_ACTIVE.status = 'PENDING';
    const postCountBeforeHeadCardB = revokePostCount;
    await page.click('[data-testid="revoke-publication-modal"] [data-testid="verify-receipt-button"]');
    await new Promise((r) => setTimeout(r, 300));

    assert.strictEqual(await page.evaluate(() => Boolean(document.querySelector('[data-testid="revoke-publication-modal"]'))), true, 'HeadCard Scenario B: Modal must remain OPEN');
    assert.strictEqual(await page.$eval('[data-testid="revoke-submit-button"]', (el) => el.disabled), true, 'HeadCard Scenario B: Submit must remain disabled');
    assert.strictEqual(revokePostCount, postCountBeforeHeadCardB, 'HeadCard Scenario B: POST count must NOT increase');

    // --- Scenario C (HeadCard) ---
    // Detail readback 503 error
    simulateDetail503Once = true;
    const postCountBeforeHeadCardC = revokePostCount;
    await page.click('[data-testid="revoke-publication-modal"] [data-testid="verify-receipt-button"]');
    await page.waitForSelector('[data-testid="revoke-error-banner"]', { timeout: 5000 });
    const cardBannerTextC = await page.$eval('[data-testid="revoke-error-banner"]', (el) => el.textContent);
    assert(cardBannerTextC.includes('503') || cardBannerTextC.includes('không khả dụng'), 'HeadCard Scenario C: Must show 503 error');
    assert.strictEqual(await page.$eval('[data-testid="revoke-submit-button"]', (el) => el.disabled), true, 'HeadCard Scenario C: Submit disabled');
    assert.strictEqual(revokePostCount, postCountBeforeHeadCardC, 'HeadCard Scenario C: POST count must NOT increase');

    // --- Scenario E (HeadCard) ---
    // Readback confirms REVOKED per contract: receipt is 404, detail status is REVOKED, not in pointers
    PUB_02_ACTIVE.status = 'REVOKED';
    HEAD_02.activePublicationId = null;
    HEAD_02.pendingPublicationId = null;
    const postCountBeforeHeadCardE = revokePostCount;

    await page.click('[data-testid="revoke-publication-modal"] [data-testid="verify-receipt-button"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="revoke-publication-modal"]'), { timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector('[data-testid="card-indeterminate-alert"]'), { timeout: 5000 });
    assert.strictEqual(revokePostCount, postCountBeforeHeadCardE, 'HeadCard Scenario E: POST count must NOT increase');
    console.log('  ✓ [PASS] Case 10: PublicationHeadCard Scenarios A, B, C, E verified cleanly');

    console.log('\n================================================================');
    console.log('ALL 10/10 BROWSER E2E PUBLICATION TEST SCENARIOS PASSED!');
    console.log('================================================================');
  } finally {
    await browser.close();
    await new Promise((resolve) => spaServer.close(resolve));
    console.log('✓ SPA Server & Puppeteer closed cleanly.');
  }
}

runE2ESuite().catch((err) => {
  console.error('✗ E2E Suite execution error:');
  console.error(err);
  process.exit(1);
});
