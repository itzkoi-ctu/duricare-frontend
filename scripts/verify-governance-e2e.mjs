import puppeteer from 'puppeteer';
import path from 'path';
import { createSpaServer } from './spa-server.mjs';

const EVIDENCE_DIR = 'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence';
const PORT = 5179;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Mock Data
const MOCK_ADMIN = {
  id: 1,
  email: 'admin@duricare.vn',
  fullName: 'Nguyễn Văn Quản Trị',
  role: 'ADMIN',
};

const MOCK_EXPERT = {
  id: 2,
  email: 'expert@duricare.vn',
  fullName: 'TS. Trần Văn Chuyên Gia',
  role: 'EXPERT',
};

const MOCK_EXPERT_PROFILE = {
  id: 20,
  userId: 2,
  fullName: 'TS. Trần Văn Chuyên Gia',
  academicDegree: 'Tiến sĩ Nông nghiệp',
  affiliation: 'Đại học Cần Thơ (CTU)',
  specialization: 'Quản lý dinh dưỡng và nước tưới cây sầu riêng',
  verificationStatus: 'VERIFIED',
  verifiedAt: '2026-10-15T08:30:00Z',
  version: 1,
};

const MOCK_SOURCES = [
  {
    id: 'src-001',
    ownerUserId: 2,
    ownerDisplayName: 'TS. Trần Văn Chuyên Gia',
    createdAt: '2026-10-18T09:00:00Z',
    updatedAt: '2026-10-18T10:15:00Z',
    version: 1,
    latestRevisionId: 'rev-001',
    latestRevision: {
      id: 'rev-001',
      sourceId: 'src-001',
      revisionNumber: 1,
      status: 'DRAFT',
      version: 1,
      title: 'Quy trình tưới nước tiết kiệm và quản lý độ ẩm đất cho sầu riêng Monthong',
      topic: 'IRRIGATION',
      stage: 'DAU_TRAI',
      sourceType: 'OFFICIAL_DOCUMENT',
      proposedTier: 'A',
      proposedTierRationale: 'Văn bản quy chuẩn kỹ thuật từ Viện Cây ăn quả miền Nam',
      chunkCount: 3,
      updatedAt: '2026-10-18T10:15:00Z',
    },
  },
  {
    id: 'src-002',
    ownerUserId: 2,
    ownerDisplayName: 'TS. Trần Văn Chuyên Gia',
    createdAt: '2026-10-15T14:00:00Z',
    updatedAt: '2026-10-16T11:00:00Z',
    version: 2,
    latestRevisionId: 'rev-002',
    latestRevision: {
      id: 'rev-002',
      sourceId: 'src-002',
      revisionNumber: 2,
      status: 'SUBMITTED',
      version: 2,
      title: 'Hiệu quả của việc bổ sung Canxi-Bo qua lá trong giai đoạn phát triển trái non sầu riêng Ri6',
      topic: 'FERTILIZATION',
      stage: 'PHAT_TRIEN_TRAI',
      sourceType: 'RESEARCH_PUBLICATION',
      proposedTier: 'A',
      proposedTierRationale: 'Công trình nghiên cứu công bố trên Tạp chí Khoa học ĐH Cần Thơ',
      chunkCount: 2,
      updatedAt: '2026-10-16T11:00:00Z',
    },
  },
  {
    id: 'src-003',
    ownerUserId: 5,
    ownerDisplayName: 'HTX Sầu Riêng Ngũ Hiệp',
    createdAt: '2026-10-12T08:00:00Z',
    updatedAt: '2026-10-14T09:30:00Z',
    version: 1,
    latestRevisionId: 'rev-003',
    latestRevision: {
      id: 'rev-003',
      sourceId: 'src-003',
      revisionNumber: 1,
      status: 'IN_REVIEW',
      version: 1,
      title: 'Sổ tay kỹ thuật xử lý ra hoa nghịch vụ sầu riêng vùng Tiền Giang',
      topic: 'GENERAL',
      stage: 'XIET_NUOC',
      sourceType: 'COOPERATIVE_MANUAL',
      proposedTier: 'C',
      proposedTierRationale: 'Sổ tay hướng dẫn nội bộ HTX Ngũ Hiệp',
      chunkCount: 4,
      updatedAt: '2026-10-14T09:30:00Z',
    },
  },
];

const MOCK_REVISION_1 = {
  id: 'rev-001',
  sourceId: 'src-001',
  revisionNumber: 1,
  status: 'DRAFT',
  version: 1,
  createdBy: 2,
  createdAt: '2026-10-18T09:00:00Z',
  updatedAt: '2026-10-18T10:15:00Z',
  metadata: {
    title: 'Quy trình tưới nước tiết kiệm và quản lý độ ẩm đất cho sầu riêng Monthong',
    authors: 'Viện Cây ăn quả miền Nam (SOFRI)',
    publisher: 'NXB Nông Nghiệp',
    sourceType: 'OFFICIAL_DOCUMENT',
    year: 2024,
    edition: 'Tái bản lần 2',
    sourceUrl: 'https://sofri.org.vn/tai-lieu/quy-trinh-tuoi-nuoc-sau-rieng.pdf',
    evidenceReference: 'TCVN 12056:2024',
    provenanceNotes: 'Lưu trữ tại thư viện chuyên ngành',
    proposedTier: 'A',
    proposedTierRationale: 'Văn bản quy chuẩn kỹ thuật từ Viện Cây ăn quả miền Nam',
  },
  chunks: [
    {
      chunkId: 'chk-001',
      title: 'Định mức nước tưới giai đoạn đậu trái (0 - 30 ngày)',
      topic: 'IRRIGATION',
      stage: 'DAU_TRAI',
      content: 'Trong 30 ngày đầu sau khi đậu trái, lượng nước tưới chỉ duy trì ở mức 60-70% so với bình thường, tưới nhấp nhẹ mỗi 1-2 ngày một lần để giữ ẩm tầng mặt, tránh sốc nước làm rụng trái non hàng loạt.',
      originalExcerpt: 'Sau khi hoa thụ phấn và bắt đầu đậu trái (trái bằng ngón chân cái), tuyệt đối không được tưới đẫm. Chỉ tưới nhấp nhẹ cách ngày để giữ ẩm mặt đất khoảng 60-70%. Khi trời nắng gắt, có thể tưới sương lên tán lá vào buổi sáng sớm.',
      locator: 'Chương 3, Mục 3.2, Trang 24-26',
      applicabilityNotes: 'Áp dụng cho đất thịt pha cát vùng ĐBSCL',
      measurementNotes: 'Độ ẩm đất đo ở độ sâu 20cm: 65% ± 5%',
    },
    {
      chunkId: 'chk-002',
      title: 'Theo dõi cảm biến độ ẩm đất và chu kỳ tưới tự động',
      topic: 'IRRIGATION',
      stage: 'DAU_TRAI',
      content: 'Cảm biến độ ẩm đặt tại tầng rễ hấp thu (độ sâu 20-40cm) cách gốc 1.5 - 2 mét. Khi giá trị độ ẩm xuống dưới 55%, kích hoạt tưới nhỏ giọt hoặc phun mưa cục bộ với thời lượng 15-20 phút.',
      originalExcerpt: 'Đặt đầu dò cảm biến độ ẩm điện dung tại vị trí 2/3 tán lá, độ sâu 30cm. Chu kỳ tưới tự động ngắt khi độ ẩm đạt 70% để đảm bảo đất thoáng khí.',
      locator: 'Chương 3, Mục 3.4, Trang 31',
      applicabilityNotes: 'Hệ thống tưới tự động có van điều khiển theo zone',
      measurementNotes: 'Ngưỡng kích hoạt: <55% VWC; ngưỡng ngắt: >70% VWC',
    },
    {
      chunkId: 'chk-003',
      title: 'Xử lý khi gặp mưa trái mùa trong giai đoạn đậu trái',
      topic: 'IRRIGATION',
      stage: 'DAU_TRAI',
      content: 'Nếu gặp mưa lớn trái mùa đột ngột, phải lập tức khơi thông rãnh thoát nước trên liếp trong vòng 2 giờ. Sau cơn mưa cần tưới xả nhẹ vào sáng hôm sau để rửa phèn và chất bẩn bám trên rễ cám.',
      originalExcerpt: 'Mưa trái mùa mang theo axit và gây ngập úng cục bộ quanh rễ cám. Cần bơm cạn nước mương vườn, sau đó tưới nước sạch xả bùn và phun khử khuẩn vi nấm.',
      locator: 'Chương 4, Mục 4.1, Trang 45',
      applicabilityNotes: 'Vùng canh tác có hệ thống mương liếp ĐBSCL',
      measurementNotes: 'Mực nước mương phải duy trì cách mặt liếp ít nhất 60-80cm',
    },
  ],
};

const MOCK_AUDIT_HISTORY = [
  {
    id: 101,
    sourceId: 'src-001',
    revisionId: 'rev-001',
    revisionNumber: 1,
    eventType: 'CREATED',
    actorId: 2,
    actorName: 'TS. Trần Văn Chuyên Gia',
    actorRole: 'EXPERT',
    timestamp: '2026-10-18T09:00:00Z',
    notes: 'Khởi tạo nguồn tri thức và bản nháp v1',
  },
  {
    id: 102,
    sourceId: 'src-001',
    revisionId: 'rev-001',
    revisionNumber: 1,
    eventType: 'EDITED',
    actorId: 2,
    actorName: 'TS. Trần Văn Chuyên Gia',
    actorRole: 'EXPERT',
    timestamp: '2026-10-18T10:15:00Z',
    notes: 'Cập nhật trích đoạn và căn cứ xếp hạng tầng A',
  },
];

async function run() {
  console.log('Starting SPA server for E2E tests...');
  const server = await createSpaServer(PORT);
  console.log(`SPA Server running at ${BASE_URL}`);

  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Handle any beforeunload / unload dialogs automatically
    page.on('dialog', async dialog => {
      console.log(`  [Dialog intercepted]: "${dialog.message()}" -> accepting`);
      await dialog.accept();
    });

    let currentUser = MOCK_ADMIN;
    let simulateConflictOnce = false;

    // Enable network request interception to simulate exact backend API
    await page.setRequestInterception(true);

    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-XSRF-TOKEN',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    const respondJson = (req, status, data) => {
      return req.respond({
        status,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    };

    page.on('request', req => {
      const url = req.url();
      const method = req.method();

      if (url.includes('/api/')) {
        if (method === 'OPTIONS') {
          return req.respond({
            status: 204,
            headers: CORS_HEADERS,
          });
        }
      }

      // Auth bootstrap endpoints
      if (url.includes('/api/auth/csrf')) {
        return respondJson(req, 200, { token: 'mock-csrf-token-123' });
      }

      if (url.includes('/api/auth/refresh')) {
        return respondJson(req, 200, { accessToken: 'mock-access-token-jwt' });
      }

      if (url.includes('/api/auth/me')) {
        return respondJson(req, 200, currentUser);
      }

      if (url.includes('/api/expert/profile')) {
        if (currentUser.role === 'EXPERT') {
          return respondJson(req, 200, MOCK_EXPERT_PROFILE);
        }
        return respondJson(req, 200, null);
      }

      // Farm endpoints for Shell
      if (url.includes('/api/farms')) {
        return respondJson(req, 200, [
          { id: 1, name: 'Vườn Sầu Riêng Phong Điền', location: 'Cần Thơ', area: 2.5 }
        ]);
      }

      if (url.includes('/api/zones')) {
        return respondJson(req, 200, []);
      }

      if (url.includes('/api/alerts')) {
        return respondJson(req, 200, []);
      }

      if (url.includes('/api/overview')) {
        return respondJson(req, 200, {
          farmId: 1,
          farmName: 'Vườn Sầu Riêng Phong Điền',
          totalUnresolvedAlerts: 0,
          weather: { weatherCode: 1, temperature: 29.5, humidity: 75 },
          zones: [],
        });
      }

      // Specific Governance endpoints MUST come before general prefix matching
      if (url.includes('/api/knowledge/sources/src-001/history')) {
        return respondJson(req, 200, {
          items: MOCK_AUDIT_HISTORY,
          totalElements: MOCK_AUDIT_HISTORY.length,
          totalPages: 1,
          currentPage: 0,
          pageSize: 20,
        });
      }

      if (url.includes('/api/knowledge/sources/src-001') && method === 'GET') {
        return respondJson(req, 200, MOCK_SOURCES[0]);
      }

      if (url.includes('/api/knowledge/sources/src-101') && method === 'GET') {
        return respondJson(req, 200, {
          ...MOCK_SOURCES[0],
          id: 'src-101',
          latestRevisionId: 'rev-101',
        });
      }

      if (url.includes('/api/knowledge/revisions/rev-001') && method === 'GET') {
        return respondJson(req, 200, MOCK_REVISION_1);
      }

      if (url.includes('/api/knowledge/revisions/rev-001') && method === 'PUT') {
        if (simulateConflictOnce) {
          simulateConflictOnce = false;
          return respondJson(req, 409, {
            code: 'stale_version',
            message: 'Hồ sơ đã được cập nhật bởi một phiên làm việc khác. Phiên bản hiện tại trên hệ thống là v2.',
          });
        }

        const body = JSON.parse(req.postData() || '{}');
        return respondJson(req, 200, {
          ...MOCK_REVISION_1,
          version: (body.version || 1) + 1,
          metadata: body.metadata,
          chunks: body.chunks,
          updatedAt: new Date().toISOString(),
        });
      }

      if (url.includes('/api/knowledge/sources') && method === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        const newSource = {
          id: 'src-101',
          ownerUserId: currentUser.id,
          ownerDisplayName: currentUser.fullName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          latestRevisionId: 'rev-101',
          latestRevision: {
            id: 'rev-101',
            sourceId: 'src-101',
            revisionNumber: 1,
            status: 'DRAFT',
            version: 1,
            title: body.metadata.title,
            topic: body.metadata.topic || 'IRRIGATION',
            stage: body.metadata.stage || null,
            sourceType: body.metadata.sourceType,
            proposedTier: body.metadata.proposedTier,
            proposedTierRationale: body.metadata.proposedTierRationale,
            chunkCount: (body.chunks || []).length,
            updatedAt: new Date().toISOString(),
          },
        };
        return respondJson(req, 201, {
          source: newSource,
          revision: {
            id: 'rev-101',
            sourceId: 'src-101',
            revisionNumber: 1,
            status: 'DRAFT',
            version: 1,
            createdBy: currentUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: body.metadata,
            chunks: (body.chunks || []).map((c, i) => ({ ...c, chunkId: `chk-10${i + 1}` })),
          },
        });
      }

      // General source listing
      if (url.includes('/api/knowledge/sources') && method === 'GET') {
        const urlObj = new URL(url);
        const statusFilter = urlObj.searchParams.get('status');
        let filtered = MOCK_SOURCES;
        if (statusFilter && statusFilter !== 'ALL') {
          filtered = filtered.filter(s => s.latestRevision?.status === statusFilter);
        }
        return respondJson(req, 200, {
          items: filtered,
          totalElements: filtered.length,
          totalPages: 1,
          currentPage: 0,
          pageSize: 20,
        });
      }

      // Default: continue
      req.continue();
    });

    console.log('\n--- Scenario 1: ADMIN - Source List & Creation ---');
    currentUser = MOCK_ADMIN;
    await page.goto(`${BASE_URL}/knowledge/sources`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 8000 });

    const pageTitle = await page.$eval('h1', el => el.textContent?.trim());
    console.log(`  Page Title: "${pageTitle}"`);

    // Screenshot 1: Admin Source List (Desktop 1440px)
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '01_admin_source_list_desktop_1440.png'),
      fullPage: true,
    });
    console.log('  ✓ Captured 01_admin_source_list_desktop_1440.png');

    // Screenshot 2: Admin Source List Dark Mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '02_admin_source_list_dark_1440.png'),
      fullPage: true,
    });
    console.log('  ✓ Captured 02_admin_source_list_dark_1440.png');
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });

    // Screenshot 3: Mobile Viewport 375px
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '03_admin_source_list_mobile_375.png'),
      fullPage: true,
    });
    console.log('  ✓ Captured 03_admin_source_list_mobile_375.png');

    // Reset to Desktop
    await page.setViewport({ width: 1440, height: 900 });

    // Navigate to Create Page
    console.log('\n--- Scenario 2: Create Source Form ---');
    await page.goto(`${BASE_URL}/knowledge/sources/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input#meta-title', { timeout: 8000 });

    // Fill form
    await page.type('input#meta-title', 'Kỹ thuật tưới nước tiết kiệm cho sầu riêng Monthong giai đoạn đậu trái');
    await page.select('select#meta-sourcetype', 'OFFICIAL_DOCUMENT');
    await page.type('input#meta-authors', 'Viện Cây ăn quả miền Nam (SOFRI)');
    await page.type('input#meta-publisher', 'NXB Nông Nghiệp');
    await page.type('input#meta-year', '2024');
    await page.type('input#meta-sourceurl', 'https://sofri.org.vn/tai-lieu/sau-rieng-tuoi-nuoc.pdf');
    await page.select('select#meta-tier', 'A');
    await page.type('textarea#meta-tier-rationale', 'Văn bản hướng dẫn quy chuẩn từ Viện Cây ăn quả miền Nam');

    // Add Chunk
    const addChunkBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent?.includes('Thêm đoạn trích') || b.textContent?.includes('Add chunk'));
    });
    if (addChunkBtn) {
      await addChunkBtn.asElement()?.click();
      await new Promise(r => setTimeout(r, 300));
      await page.waitForSelector('input#chunk-title-0', { timeout: 3000 });
      await page.type('input#chunk-title-0', 'Định mức nước tưới giai đoạn đậu trái non (0-30 ngày)');
      await page.select('select#chunk-topic-0', 'IRRIGATION');
      await page.select('select#chunk-stage-0', 'DAU_TRAI');
      await page.type('input#chunk-locator-0', 'Mục 3.2, Trang 15-18');
      await page.type('textarea#chunk-excerpt-0', 'Giai đoạn 0-30 ngày sau đậu trái duy trì độ ẩm đất 65-70%. Tưới nhấp cách ngày để giữ ẩm tầng mặt.');
      await page.type('textarea#chunk-content-0', 'Không tưới đẫm đột ngột gây sốc nước làm rụng trái non hàng loạt.');
    }

    // Screenshot 4: Create Source Form (Desktop 1440px)
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '04_create_source_form_desktop_1440.png'),
      fullPage: true,
    });
    console.log('  ✓ Captured 04_create_source_form_desktop_1440.png');

    // Screenshot 5: Source Detail Page (Desktop 1440px)
    console.log('\n--- Scenario 3: Source Detail View ---');
    await page.goto(`${BASE_URL}/knowledge/sources/src-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 8000 });
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '05_source_detail_overview_1440.png'),
      fullPage: true,
    });
    console.log('  ✓ Captured 05_source_detail_overview_1440.png');

    // Switch to Audit History Tab
    const historyTabBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent?.includes('Lịch sử thay đổi') || b.textContent?.includes('Audit'));
    });
    if (historyTabBtn) {
      await historyTabBtn.asElement()?.click();
      await new Promise(r => setTimeout(r, 300));
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '06_source_detail_history_tab_1440.png'),
        fullPage: true,
      });
      console.log('  ✓ Captured 06_source_detail_history_tab_1440.png');
    }

    // Scenario 4: EXPERT Role & DRAFT Edit with 409 Conflict Protection
    console.log('\n--- Scenario 4: EXPERT Role & Optimistic Lock (409 Conflict) ---');
    currentUser = MOCK_EXPERT;

    // Expert Profile Page (checking preservation and new card)
    await page.goto(`${BASE_URL}/knowledge`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 8000 });
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '07_expert_profile_with_governance_link.png'),
      fullPage: true,
    });
    console.log('  ✓ Captured 07_expert_profile_with_governance_link.png');

    // Edit Page for DRAFT
    await page.goto(`${BASE_URL}/knowledge/sources/src-001/revisions/rev-001/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input#meta-title', { timeout: 8000 });

    // Screenshot 8: Edit Form Initial State
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '08_draft_edit_form_initial_1440.png'),
      fullPage: true,
    });
    console.log('  ✓ Captured 08_draft_edit_form_initial_1440.png');

    // Simulate 409 conflict on save
    simulateConflictOnce = true;
    const saveBtn = await page.$('button[type="submit"]');
    await saveBtn?.click();
    await new Promise(r => setTimeout(r, 600));

    // Screenshot 9: Edit Form with 409 Conflict Banner & Preserved Data
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '09_draft_edit_409_conflict_banner_1440.png'),
      fullPage: true,
    });
    console.log('  ✓ Captured 09_draft_edit_409_conflict_banner_1440.png');

    // Tablet Viewport 768px for Edit Page
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '10_draft_edit_tablet_768.png'),
      fullPage: true,
    });
    console.log('  ✓ Captured 10_draft_edit_tablet_768.png');

    // Reset Viewport
    await page.setViewport({ width: 1440, height: 900 });

    // Scenario 5: English Localization (EN)
    console.log('\n--- Scenario 5: English Localization (EN) ---');
    await page.evaluate(() => {
      localStorage.setItem('duricare_lang', 'en');
    });
    await page.goto(`${BASE_URL}/knowledge/sources`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 8000 });
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '11_knowledge_sources_english_1440.png'),
      fullPage: true,
    });
    console.log('  ✓ Captured 11_knowledge_sources_english_1440.png');

    console.log('\nAll E2E scenarios and screenshots completed successfully!');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('E2E Verification Error:', err);
  process.exit(1);
});
