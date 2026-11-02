import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

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
  for (const dir of EVIDENCE_DIRS) {
    const filePath = path.join(dir, filename);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  Saved screenshot: ${filePath}`);
  }
}

function startWorktreeSpaServer(port) {
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
  let simulateRetryConflictOnce = false;
  let releaseReceipt = null;
  const reviewLate = process.env.REVIEW_LATE === 'true';
  const OPERATION_RECEIPTS = new Map();

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

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

    if (reviewLate && apiPath.includes('/publication-operations/')) {
      const key = apiPath.split('/').pop();
      releaseReceipt = () =>
        respondJson(200, {
          requestId: key,
          operation: 'REVOKE',
          committedAt: new Date().toISOString(),
          responseStatus: 200,
          response: {
            requestId: key,
            operation: 'REVOKE',
            committedAt: new Date().toISOString(),
            replayed: false,
            head: { ...HEAD_02, version: HEAD_02.version + 1, activePublicationId: null },
            publication: { ...PUB_02_ACTIVE, status: 'REVOKED' },
            job: null,
          },
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

    // 3. Knowledge source 01 detail
    if (apiPath.includes(`/knowledge/sources/${SOURCE_01.id}/revisions`)) {
      return respondJson(200, {
        content: [REVISION_01_APPROVED],
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

    if (apiPath.includes(`/knowledge/sources/${SOURCE_01.id}`) && !apiPath.includes('publication')) {
      return respondJson(200, SOURCE_01);
    }

    if (apiPath.includes(`/knowledge/revisions/${REVISION_01_APPROVED.id}`)) {
      return respondJson(200, REVISION_01_APPROVED);
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

    // 7. Publication Events for Pub 02 (must come before general detail route)
    if (apiPath.includes(`/admin/knowledge/publications/${PUB_02_ACTIVE.id}/events`)) {
      return respondJson(200, PUB_02_EVENTS);
    }

    // 8. POST Revoke for Pub 02
    if (apiPath.includes(`/admin/knowledge/publications/${PUB_02_ACTIVE.id}/revoke`) && method === 'POST') {
      if (simulateRevokeTimeoutOnce) {
        simulateRevokeTimeoutOnce = false;
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
      if (simulateRetryConflictOnce) {
        simulateRetryConflictOnce = false;
        return respondJson(409, {
          error: 'conflict',
          code: 'stale_version',
          message: 'Phiên bản xuất bản đã thay đổi trên máy chủ (v2 -> v3). Vui lòng tải lại head.',
          fieldErrors: [],
        });
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
      return respondJson(200, PUB_02_DETAIL);
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
    // Test Case 6: Publication Detail Inspector
    // -------------------------------------------------------------
    console.log('\n--- Test Case 6: Publication Detail Inspector ---');
    await page.goto(`${BASE_URL}/settings/knowledge`);
    await page.waitForSelector('[data-testid="tab-publications"]', { timeout: 5000 });
    await page.click('[data-testid="tab-publications"]');
    await page.waitForSelector(`[data-testid="inspect-pub-${PUB_02_ACTIVE.id}"]`, { timeout: 5000 });

    // Click Inspect on PUB 02
    await page.click(`[data-testid="inspect-pub-${PUB_02_ACTIVE.id}"]`);
    await page.waitForSelector('[data-testid="detail-tab-manifest"]', { timeout: 5000 });

    // Check Manifest content
    const manifestModalText = await page.$eval('[role="dialog"]', (el) => el.textContent);
    assert(manifestModalText.includes('text-embedding-3-small'), 'Must show embedding model');
    assert(manifestModalText.includes('duricare_knowledge_v1'), 'Must show collection name');

    // Switch to Jobs tab
    await page.click('[data-testid="detail-tab-jobs"]');
    await page.waitForSelector('button ::-p-text(Xem lượt chạy (Runs))', { timeout: 5000 });

    // Switch to Events tab
    await page.click('[data-testid="detail-tab-events"]');
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent.includes('REQUESTED'), {
      timeout: 5000,
    });

    await captureScreenshot(page, 'rag_pub_06_publication_detail_inspector_1440.png');
    console.log('  ✓ [PASS] Case 6: Publication Detail inspector (Manifest, Fingerprint, Jobs, Events) verified');

    // Close detail modal
    await page.click('button[title="Đóng"]');

    // -------------------------------------------------------------
    // Test Case 7: Revocation Flow & Timeout Uncertainty Recovery
    // -------------------------------------------------------------
    console.log('\n--- Test Case 7: Revocation Flow & Timeout Uncertainty Recovery ---');
    await page.waitForSelector(`[data-testid="revoke-pub-${PUB_02_ACTIVE.id}"]`, { timeout: 5000 });
    await page.click(`[data-testid="revoke-pub-${PUB_02_ACTIVE.id}"]`);
    await page.waitForSelector('[data-testid="revoke-reason-input"]', { timeout: 5000 });

    const enteredRevokeReason = 'Thu hồi tài liệu đã cập nhật phiên bản mới thay thế.';
    await page.type('[data-testid="revoke-reason-input"]', enteredRevokeReason);

    // Step 7a: Simulate timeout / aborted network connection
    simulateRevokeTimeoutOnce = true;
    await page.click('[data-testid="revoke-submit-button"]');
    await page.waitForSelector('[data-testid="revoke-error-banner"]', { timeout: 5000 });

    // Assert F1: Submit button is disabled and reload head is offered
    const isRevokeSubmitDisabled = await page.$eval('[data-testid="revoke-submit-button"]', (el) => el.disabled);
    assert.strictEqual(isRevokeSubmitDisabled, true, 'Submit button must be disabled after indeterminate error');
    const isReloadOffered = await page.evaluate(() =>
      [...document.querySelectorAll('[role="dialog"] button')].some((b) => b.textContent.includes('Tải lại head'))
    );
    assert.strictEqual(isReloadOffered, true, 'Head reload option must be offered in modal after error');

    // Close modal and verify uncertainty lock badge persists in parent table
    await page.click('button[title="Đóng"]');
    await page.waitForSelector(`[data-testid="indeterminate-lock-badge-${PUB_02_ACTIVE.id}"]`, { timeout: 5000 });

    // Re-open modal and verify preserved requestId and reason (not generating new requestId)
    await page.click(`[data-testid="revoke-pub-${PUB_02_ACTIVE.id}"]`);
    await page.waitForSelector('[data-testid="revoke-reason-input"]', { timeout: 5000 });
    const preservedRevokeReason = await page.$eval('[data-testid="revoke-reason-input"]', (el) => el.value);
    assert.strictEqual(preservedRevokeReason, enteredRevokeReason, 'Revoke reason must survive modal close/reopen');

    if (reviewLate) {
      const arrived = page.waitForRequest((req) => req.url().includes('/publication-operations/'));
      await page.click('[data-testid="verify-receipt-button"]');
      await arrived;
      assert(releaseReceipt, 'Receipt request must be pending');
      await page.click('button[title="Đóng"]');
      await page.click(`[data-testid="revoke-pub-${PUB_03_FAILED.id}"]`);
      await page.waitForSelector('[data-testid="revoke-reason-input"]');
      await page.type('[data-testid="revoke-reason-input"]', 'TEST independent reason for publication B');
      const beforeB = await page.$eval('[data-testid="revoke-reason-input"]', (el) => el.value);
      const response = page.waitForResponse(
        (res) => res.url().includes('/publication-operations/') && res.status() === 200
      );
      releaseReceipt();
      await response;
      await new Promise((resolve) => setTimeout(resolve, 400));
      const afterB = await page.evaluate(
        () => document.querySelector('[data-testid="revoke-reason-input"]')?.value ?? null
      );
      console.log('LATE_RECEIPT_OBSERVATION ' + JSON.stringify({ beforeB, afterB }));
      await captureScreenshot(page, 'late-receipt-b-modal.png');
      assert.strictEqual(afterB, beforeB, 'Late receipt A must preserve modal and reason B');
      return;
    }

    // Click "Tải lại head" to clear indeterminate state and re-sync version
    await page.click('[data-testid="revoke-reload-head-button"]');
    await page.waitForFunction(() => {
      const btn = document.querySelector('[data-testid="revoke-submit-button"]');
      return btn && !btn.disabled;
    }, { timeout: 5000 });

    // Now submit cleanly
    await page.click('[data-testid="revoke-submit-button"]');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 5000 });

    await captureScreenshot(page, 'rag_pub_07_revocation_confirmed_1440.png');
    console.log('  ✓ [PASS] Case 7: Revocation flow and timeout uncertainty recovery verified');

    // -------------------------------------------------------------
    // Test Case 8: Retry Flow for Failed Job & 409 Recovery
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

    // Submit again after head reload
    await page.click('[data-testid="retry-submit-button"]');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 5000 });

    await captureScreenshot(page, 'rag_pub_08_retry_job_flow_1440.png');
    console.log('  ✓ [PASS] Case 8: Retry job flow and 409 conflict recovery verified');

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

    console.log('\n================================================================');
    console.log('ALL 9/9 BROWSER E2E PUBLICATION TEST SCENARIOS PASSED!');
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
