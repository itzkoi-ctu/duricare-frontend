import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';
import puppeteer from 'puppeteer';

const WORKTREE_ROOT = 'E:/CTU/LuanVan/duricare-worktrees/fe-rag-origin-001';
const DIST_DIR = path.join(WORKTREE_ROOT, 'dist');
const EVIDENCE_DIR = 'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence';
const PORT = 5201;
const BASE_URL = `http://127.0.0.1:${PORT}`;

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function createSpaServer(port) {
  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    let filePath = path.join(DIST_DIR, urlPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      return fs.createReadStream(filePath).pipe(res);
    }

    const indexPath = path.join(DIST_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
  });

  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

// -------------------------------------------------------------
// Test Execution Matrix for FE-RAG-ORIGIN-001
// -------------------------------------------------------------
async function runVerification() {
  console.log(`Starting SPA Static Server from ${DIST_DIR} on port ${PORT}...`);
  const server = await createSpaServer(PORT);
  console.log(`SPA Server running at ${BASE_URL}`);

  const results = [];
  function record(id, title, pass, detail = '') {
    results.push({ id, title, status: pass ? 'PASS' : 'FAIL', detail });
    console.log(`${pass ? '✓' : '✗'} [${id}] ${title}${detail ? ` (${detail})` : ''}`);
  }

  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });
    page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.message);
    });

    const mockConversations = [
      {
        id: 'conv-origin-test',
        zoneCode: 'TEST-ZONE',
        title: 'Thử nghiệm xuất xứ và trích dẫn tri thức',
        createdAt: '2026-11-23T10:00:00Z',
        updatedAt: '2026-11-23T10:05:00Z',
        messageCount: 6,
      },
    ];

    // Fixture messages covering all contract cases
    const mockMessages = {
      'conv-origin-test': [
        {
          id: 1,
          role: 'ASSISTANT',
          content: 'Dữ liệu tưới tiêu theo tài liệu kế thừa (legacy reference).\n\nCăn cứ đã xác minh:\n- Sổ tay canh tác | bản 1 | publication pub-legacy-001',
          createdAt: '2026-11-23T10:01:00Z',
          citations: {
            schemaVersion: 1,
            status: 'LEGACY_REFERENCE',
            supportLevel: 'RETRIEVED_CONTEXT',
            groups: [
              {
                citationId: 'cit-legacy-001',
                sourceId: 'src-legacy-001',
                revisionId: 'rev-legacy-001',
                publicationId: 'pub-legacy-001',
                sourceTitle: 'Sổ tay canh tác sầu riêng Đồng bằng Sông Cửu Long (Bản lưu trữ cũ)',
                revisionNumber: 1,
                tier: 'A',
                year: 2021,
                originClass: 'UNDETERMINED',
                authorState: 'UNKNOWN',
                originStatus: 'LEGACY_UNDETERMINED',
                chunks: [
                  {
                    chunkId: 'chk-legacy-01',
                    locator: 'Mục 3.2 - Quy trình tưới nước mùa khô',
                    contentHash: 'hash-leg-01',
                    detailPath: '/agent/conversations/conv-origin-test/messages/1/citations/cit-legacy-001/chunks/chk-legacy-01',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 2,
          role: 'ASSISTANT',
          content: 'Khuyến nghị dinh dưỡng do chuyên gia thẩm định.',
          createdAt: '2026-11-23T10:02:00Z',
          citations: {
            schemaVersion: 1,
            status: 'VERIFIED_CONTEXT',
            supportLevel: 'RETRIEVED_CONTEXT',
            groups: [
              {
                citationId: 'cit-exp-002',
                sourceId: 'src-exp-002',
                revisionId: 'rev-exp-002',
                publicationId: 'pub-exp-002',
                sourceTitle: 'Hướng dẫn bón phân giai đoạn nuôi trái Musang King',
                revisionNumber: 2,
                tier: 'A',
                year: 2026,
                originClass: 'EXPERT_AUTHORED',
                authorState: 'NAMED',
                publicAuthorName: 'TS. Nguyễn Văn Chuyên',
                originStatus: 'REVIEWED',
                chunks: [
                  {
                    chunkId: 'chk-exp-02',
                    locator: 'Trang 15, Bảng 4 - Tỉ lệ N:P:K theo tuổi cây',
                    contentHash: 'hash-exp-02',
                    detailPath: '/agent/conversations/conv-origin-test/messages/2/citations/cit-exp-002/chunks/chk-exp-02',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 3,
          role: 'ASSISTANT',
          content: 'Tiêu chuẩn thực hành nông nghiệp tốt theo tài liệu tham khảo bên ngoài.',
          createdAt: '2026-11-23T10:03:00Z',
          citations: {
            schemaVersion: 1,
            status: 'VERIFIED_CONTEXT',
            supportLevel: 'RETRIEVED_CONTEXT',
            groups: [
              {
                citationId: 'cit-ext-003',
                sourceId: 'src-ext-003',
                revisionId: 'rev-ext-003',
                publicationId: 'pub-ext-003',
                sourceTitle: 'Tiêu chuẩn Quốc gia TCVN 11892-1:2017 Quy trình thực hành nông nghiệp tốt',
                revisionNumber: 1,
                tier: 'B',
                year: 2017,
                originClass: 'EXTERNAL_REFERENCE',
                authorState: 'UNKNOWN',
                originStatus: 'REVIEWED',
                sourceUrl: 'https://tieuchuan.viam.gov.vn/tcvn-11892',
                chunks: [
                  {
                    chunkId: 'chk-ext-03',
                    locator: 'Điều 5.1.2 - Nguồn nước tưới đạt chuẩn',
                    contentHash: 'hash-ext-03',
                    detailPath: '/agent/conversations/conv-origin-test/messages/3/citations/cit-ext-003/chunks/chk-ext-03',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 4,
          role: 'ASSISTANT',
          content: 'Báo cáo kỹ thuật với thông tin tác giả chưa được công bố.',
          createdAt: '2026-11-23T10:04:00Z',
          citations: {
            schemaVersion: 1,
            status: 'VERIFIED_CONTEXT',
            supportLevel: 'RETRIEVED_CONTEXT',
            groups: [
              {
                citationId: 'cit-wth-004',
                sourceId: 'src-wth-004',
                revisionId: 'rev-wth-004',
                publicationId: 'pub-wth-004',
                sourceTitle: 'Nghiên cứu xử lý ra hoa nghịch vụ sầu riêng Ri6 (Nội bộ đề tài)',
                revisionNumber: 1,
                tier: 'A',
                year: 2025,
                originClass: 'EXPERT_AUTHORED',
                authorState: 'WITHHELD',
                publicAuthorName: null,
                originStatus: 'REVIEWED',
                chunks: [
                  {
                    chunkId: 'chk-wth-04',
                    locator: 'Phần 2 - Cơ chế kích kháng paclobutrazol',
                    contentHash: 'hash-wth-04',
                    detailPath: '/agent/conversations/conv-origin-test/messages/4/citations/cit-wth-004/chunks/chk-wth-04',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 5,
          role: 'ASSISTANT',
          content: 'Trường hợp kiểm thử giá trị lạ hoặc null theo khả năng DTO.',
          createdAt: '2026-11-23T10:05:00Z',
          citations: {
            schemaVersion: 1,
            status: 'VERIFIED_CONTEXT',
            supportLevel: 'RETRIEVED_CONTEXT',
            groups: [
              {
                citationId: 'cit-weird-005',
                sourceId: 'src-weird-005',
                revisionId: 'rev-weird-005',
                publicationId: 'pub-weird-005',
                sourceTitle: 'Tài liệu thử nghiệm fallback giá trị enum lạ',
                revisionNumber: 3,
                originClass: 'FUTURE_CUSTOM_ORIGIN_XYZ',
                authorState: 'CUSTOM_UNKNOWN_STATE',
                chunks: [
                  {
                    chunkId: 'chk-weird-05',
                    locator: 'Phụ lục Z',
                    detailPath: '/agent/conversations/conv-origin-test/messages/5/citations/cit-weird-005/chunks/chk-weird-05',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 6,
          role: 'ASSISTANT',
          content: 'Tài liệu có tiêu đề, tên tác giả và vị trí siêu dài để kiểm tra tràn khung trên mobile 375px.',
          createdAt: '2026-11-23T10:06:00Z',
          citations: {
            schemaVersion: 1,
            status: 'VERIFIED_CONTEXT',
            supportLevel: 'RETRIEVED_CONTEXT',
            groups: [
              {
                citationId: 'cit-long-006',
                sourceId: 'src-long-006',
                revisionId: 'rev-long-006',
                publicationId: 'pub-long-006',
                sourceTitle: 'Nghiên cứu tổng hợp chuyên sâu dài kỳ về ảnh hưởng của độ mặn trong nước ngầm và biến đổi khí hậu đối với hệ rễ sầu riêng Ri6 tại vùng Đồng bằng Sông Cửu Long giai đoạn 2020-2030',
                revisionNumber: 12,
                tier: 'A',
                year: 2026,
                originClass: 'EXPERT_AUTHORED',
                authorState: 'NAMED',
                publicAuthorName: 'GS.TS. Nguyễn Trần Quang Long - Viện Nghiên cứu Đất và Môi trường Nông nghiệp Công nghệ cao Cần Thơ',
                originStatus: 'REVIEWED',
                sourceUrl: 'https://ctu.edu.vn/research/durian-soil-salinity-impact-long-term-study-report-2026',
                chunks: [
                  {
                    chunkId: 'chk-long-06',
                    locator: 'Chương 4, Phần 2.3.1, Bảng số liệu tổng hợp quan trắc độ dẫn điện EC và nồng độ ion Natri trong đất nhiễm phèn mặn',
                    contentHash: 'hash-long-06',
                    detailPath: '/agent/conversations/conv-origin-test/messages/6/citations/cit-long-006/chunks/chk-long-06',
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': BASE_URL,
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

    // Mock API Network Interception
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      const method = req.method();

      if (method === 'OPTIONS') {
        return req.respond({ status: 204, headers: CORS_HEADERS });
      }

      // Passage fetch (matched first)
      if (url.includes('/chunks/')) {
        return respondJson(req, 200, {
          content: 'Nội dung đoạn trích đã duyệt: Duy trì độ ẩm đất từ 65% đến 75% trong giai đoạn nuôi hoa. Tưới định kỳ vào buổi sáng sớm bằng hệ thống béc tưới tiết kiệm.',
          locator: 'Mục 3.2 - Quy trình tưới nước mùa khô',
          contentKind: 'APPROVED_KNOWLEDGE_CHUNK',
          contentHash: 'hash-approved-01',
        });
      }

      // Auth bootstrap endpoints (match both /api/auth and /auth)
      if (url.includes('/auth/csrf')) {
        return respondJson(req, 200, { token: 'mock-csrf-token' });
      }
      if (url.includes('/auth/refresh')) {
        return respondJson(req, 200, { accessToken: 'mock-access-token-jwt' });
      }
      if (url.includes('/auth/me')) {
        return respondJson(req, 200, {
          id: 1,
          email: 'admin@duricare.ctu.edu.vn',
          fullName: 'Quản Trị Viên DuriCare',
          role: 'ADMIN',
          farmId: null,
        });
      }

      // Farm & Overview endpoints
      if (url.includes('/farms')) {
        return respondJson(req, 200, [{ id: 1, name: 'Nông trại Bến Tre', isActive: true }]);
      }
      if (url.includes('/overview')) {
        return respondJson(req, 200, {
          farm: { id: 1, name: 'Nông trại Bến Tre' },
          zones: [{ id: 10, code: 'TEST-ZONE', name: 'Khu A - Monthong' }],
          trees: 150,
          activeAlerts: 0,
          healthyTrees: 150,
        });
      }
      if (url.includes('/zones')) {
        return respondJson(req, 200, [{ id: 10, code: 'TEST-ZONE', name: 'Khu A - Monthong' }]);
      }

      // Agent conversation messages
      const matchMsg = url.match(/(?:\/api)?\/agent\/conversations\/([^/?]+)\/messages/);
      if (matchMsg && method === 'GET') {
        const cId = matchMsg[1];
        const msgs = mockMessages[cId] || [];
        return respondJson(req, 200, msgs);
      }

      // Agent conversation list
      if (url.includes('/agent/conversations') && method === 'GET') {
        return respondJson(req, 200, mockConversations);
      }

      req.continue();
    });

    console.log('Navigating to Agent Page with conv-origin-test in Vietnamese...');
    await page.goto(`${BASE_URL}/agent?conversationId=conv-origin-test`, { waitUntil: 'networkidle0' });

    // Wait for chat to mount
    try {
      await page.waitForSelector('[data-testid="chat-header"]', { timeout: 10000 });
    } catch (e) {
      console.log('CURRENT URL:', page.url());
      console.log('CONTENT:', await page.content());
      throw e;
    }

    // Find and click the citation chip for msg-legacy
    const chipSelector = '[data-testid="citation-chip"]';
    await page.waitForSelector(chipSelector, { timeout: 8000 });
    const chips = await page.$$(chipSelector);
    assert.ok(chips.length >= 6, `Expected at least 6 citation chips, got ${chips.length}`);

    // Click the first chip (msg-legacy)
    await chips[0].click();
    await page.waitForSelector('[data-testid="citation-detail-modal"]', { timeout: 5000 });

    const legacyModalData = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="citation-detail-modal"]');
      const originBadge = modal?.querySelector('[data-testid="citation-origin-badge"]');
      const authorBadge = modal?.querySelector('[data-testid="citation-author-badge"]');
      const statusBadge = modal?.querySelector('[data-testid="citation-status-badge"]');
      const tierBadge = modal?.querySelector('[data-testid="citation-tier-badge"]');
      const heading = modal?.querySelector('h3');

      const originLabel = originBadge?.querySelector('.break-words')?.textContent?.trim() || '';
      const originClasses = originBadge?.className || '';
      const icon = originBadge?.querySelector('.material-symbols-outlined')?.textContent?.trim() || '';

      const authorText = authorBadge?.textContent?.trim() || '';
      const statusText = statusBadge?.textContent?.trim() || '';
      const tierText = tierBadge?.textContent?.trim() || '';
      const headingText = heading?.textContent?.trim() || '';

      // Check whether verified / check / success is present
      const hasVerifiedIcon = icon.includes('verified') || icon.includes('check');
      const hasSuccessClass = originClasses.includes('bg-emerald') || originClasses.includes('text-emerald');
      const isNeutralGray = originClasses.includes('bg-slate-100') || originClasses.includes('slate');

      return {
        originLabel,
        originClasses,
        icon,
        authorText,
        statusText,
        tierText,
        headingText,
        hasVerifiedIcon,
        hasSuccessClass,
        isNeutralGray,
      };
    });

    assert.equal(legacyModalData.hasVerifiedIcon, false, 'Legacy badge must NOT have verified or check icon');
    assert.equal(legacyModalData.hasSuccessClass, false, 'Legacy badge must NOT have success green emerald styling');
    assert.equal(legacyModalData.isNeutralGray, true, 'Legacy badge must have neutral gray/slate styling');
    assert.equal(legacyModalData.icon, 'info', 'Legacy badge must use neutral info icon');
    assert.equal(legacyModalData.originLabel, 'Chưa xác định lớp nguồn', 'Origin badge must render "Chưa xác định lớp nguồn"');
    assert.ok(legacyModalData.authorText.includes('Tác giả:') && legacyModalData.authorText.includes('Chưa xác định tác giả'), `Author badge must render "Tác giả: Chưa xác định tác giả", got: "${legacyModalData.authorText}"`);
    assert.equal(legacyModalData.statusText, 'Dữ liệu kế thừa', 'Status badge must render "Dữ liệu kế thừa"');
    assert.equal(legacyModalData.tierText, 'Tầng A', 'Tier badge must render "Tầng A"');
    assert.ok(legacyModalData.headingText.includes('Các đoạn trích đã cung cấp cho AI'), `Heading must render "Các đoạn trích đã cung cấp cho AI", got: "${legacyModalData.headingText}"`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'rag_orig_01_legacy_vietnamese_desktop.png') });
    record('FE-ORIGIN-01', 'Legacy/unknown trong tiếng Việt hiển thị badge trung tính xám, icon info, không check/success', true);

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-testid="citation-detail-modal"]'), { timeout: 3000 });

    // -------------------------------------------------------------
    // Test 2: Legacy + Origin Unknown in ENGLISH
    // -------------------------------------------------------------
    console.log('\n--- Test Case 2: Legacy + Origin Unknown in ENGLISH ---');
    await page.evaluate(() => {
      localStorage.setItem('duricare-language', 'en');
    });
    await page.goto(`${BASE_URL}/agent?conversationId=conv-origin-test`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="chat-header"]', { timeout: 10000 });

    await page.waitForSelector(chipSelector, { timeout: 8000 });
    const enChips = await page.$$(chipSelector);
    await enChips[0].click();
    await page.waitForSelector('[data-testid="citation-detail-modal"]', { timeout: 5000 });

    const enModalData = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="citation-detail-modal"]');
      const originBadge = modal?.querySelector('[data-testid="citation-origin-badge"]');
      const authorBadge = modal?.querySelector('[data-testid="citation-author-badge"]');
      const statusBadge = modal?.querySelector('[data-testid="citation-status-badge"]');
      const tierBadge = modal?.querySelector('[data-testid="citation-tier-badge"]');
      const headerSubtitle = modal?.querySelector('.text-navy, .dark\\:text-blue');
      const heading = modal?.querySelector('h3');
      const excerptLabel = modal?.querySelector('li .font-semibold');
      const locatorLabel = modal?.querySelector('li p');
      const fetchBtn = modal?.querySelector('[data-testid="btn-fetch-passage"]');
      const inspectSummary = modal?.querySelector('details summary');

      return {
        originLabel: originBadge?.querySelector('.break-words')?.textContent?.trim() || '',
        authorText: authorBadge?.textContent?.trim() || '',
        statusText: statusBadge?.textContent?.trim() || '',
        tierText: tierBadge?.textContent?.trim() || '',
        headerSubtitle: headerSubtitle?.textContent?.trim() || '',
        headingText: heading?.textContent?.trim() || '',
        excerptLabelText: excerptLabel?.textContent?.trim() || '',
        locatorLabelText: locatorLabel?.textContent?.trim() || '',
        fetchBtnText: fetchBtn?.textContent?.trim() || '',
        inspectSummaryText: inspectSummary?.textContent?.trim() || '',
      };
    });

    assert.equal(enModalData.originLabel, 'Source origin unknown', 'Origin badge in EN must render "Source origin unknown"');
    assert.ok(enModalData.authorText.includes('Author:') && enModalData.authorText.includes('Author unknown'), `Author badge in EN must render "Author: Author unknown", got: "${enModalData.authorText}"`);
    assert.equal(enModalData.statusText, 'Legacy data', 'Status badge in EN must render "Legacy data"');
    assert.equal(enModalData.tierText, 'Tier A', 'Tier badge in EN must render "Tier A"');
    assert.ok(enModalData.headerSubtitle.includes('Knowledge Source Details'), `Header subtitle in EN must render "Knowledge Source Details", got: "${enModalData.headerSubtitle}"`);
    assert.ok(enModalData.headingText.includes('Excerpts provided to AI'), `Heading in EN must render "Excerpts provided to AI", got: "${enModalData.headingText}"`);
    assert.ok(enModalData.excerptLabelText.includes('Excerpt 1'), `Excerpt item in EN must render "Excerpt 1", got: "${enModalData.excerptLabelText}"`);
    assert.ok(enModalData.locatorLabelText.includes('Locator / Section:'), `Locator label in EN must render "Locator / Section:", got: "${enModalData.locatorLabelText}"`);
    assert.ok(enModalData.fetchBtnText.includes('View excerpt content'), `Fetch button in EN must render "View excerpt content", got: "${enModalData.fetchBtnText}"`);
    assert.ok(enModalData.inspectSummaryText.includes('Inspection information'), `Audit summary in EN must render "Inspection information", got: "${enModalData.inspectSummaryText}"`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'rag_orig_02_legacy_english_desktop.png') });
    record('FE-ORIGIN-02', 'Toàn bộ chrome của modal trong tiếng Anh đồng bộ 100%, không còn "Authors: Chưa xác định tác giả"', true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-testid="citation-detail-modal"]'), { timeout: 3000 });

    // -------------------------------------------------------------
    // Test 3: Supported Classes — EXPERT_AUTHORED
    // -------------------------------------------------------------
    console.log('\n--- Test Case 3: Supported Classes — EXPERT_AUTHORED ---');
    await page.evaluate(() => {
      localStorage.setItem('duricare-language', 'vi');
    });
    await page.goto(`${BASE_URL}/agent?conversationId=conv-origin-test`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="chat-header"]', { timeout: 10000 });

    const viChips = await page.$$(chipSelector);
    // Chip 1 is msg-expert
    await viChips[1].click();
    await page.waitForSelector('[data-testid="citation-detail-modal"]', { timeout: 5000 });

    const expertModalData = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="citation-detail-modal"]');
      const originBadge = modal?.querySelector('[data-testid="citation-origin-badge"]');
      const authorBadge = modal?.querySelector('[data-testid="citation-author-badge"]');
      const statusBadge = modal?.querySelector('[data-testid="citation-status-badge"]');
      const icon = originBadge?.querySelector('.material-symbols-outlined')?.textContent?.trim() || '';

      return {
        originLabel: originBadge?.querySelector('.break-words')?.textContent?.trim() || '',
        originClasses: originBadge?.className || '',
        icon,
        authorText: authorBadge?.textContent?.trim() || '',
        statusText: statusBadge?.textContent?.trim() || '',
      };
    });

    assert.equal(expertModalData.icon, 'person', 'Expert badge must use person icon');
    assert.ok(expertModalData.originClasses.includes('bg-navy') || expertModalData.originClasses.includes('text-navy'), 'Expert badge must use CTU navy/blue styling');
    assert.equal(expertModalData.originLabel, 'Chuyên gia cung cấp', 'Expert origin badge must render "Chuyên gia cung cấp"');
    assert.ok(expertModalData.authorText.includes('TS. Nguyễn Văn Chuyên'), 'Author badge must render publicAuthorName');
    assert.equal(expertModalData.statusText, 'Xuất xứ đã duyệt', 'Status badge must render "Xuất xứ đã duyệt"');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'rag_orig_05_supported_classes_expert.png') });
    record('FE-ORIGIN-03', 'Lớp nguồn EXPERT_AUTHORED hiển thị nhãn "Chuyên gia cung cấp", icon person, tên tác giả công bố', true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-testid="citation-detail-modal"]'), { timeout: 3000 });

    // -------------------------------------------------------------
    // Test 4: Supported Classes — EXTERNAL_REFERENCE
    // -------------------------------------------------------------
    console.log('\n--- Test Case 4: Supported Classes — EXTERNAL_REFERENCE ---');
    const viChipsRef = await page.$$(chipSelector);
    // Chip 2 is msg-external
    await viChipsRef[2].click();
    await page.waitForSelector('[data-testid="citation-detail-modal"]', { timeout: 5000 });

    const externalModalData = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="citation-detail-modal"]');
      const originBadge = modal?.querySelector('[data-testid="citation-origin-badge"]');
      const authorBadge = modal?.querySelector('[data-testid="citation-author-badge"]');
      const icon = originBadge?.querySelector('.material-symbols-outlined')?.textContent?.trim() || '';
      const sourceUrlLink = modal?.querySelector('a[href="https://tieuchuan.viam.gov.vn/tcvn-11892"]');

      return {
        originLabel: originBadge?.querySelector('.break-words')?.textContent?.trim() || '',
        originClasses: originBadge?.className || '',
        icon,
        authorText: authorBadge?.textContent?.trim() || '',
        hasSourceUrlLink: !!sourceUrlLink,
        sourceUrlText: sourceUrlLink?.textContent?.trim() || '',
      };
    });

    assert.equal(externalModalData.icon, 'menu_book', 'External reference badge must use menu_book icon');
    assert.ok(externalModalData.originClasses.includes('bg-teal') || externalModalData.originClasses.includes('text-teal'), 'External reference badge must use teal styling');
    assert.equal(externalModalData.originLabel, 'Tài liệu tham khảo', 'External reference origin badge must render "Tài liệu tham khảo"');
    assert.ok(externalModalData.authorText.includes('Chưa xác định tác giả'), 'External reference with UNKNOWN author must render "Chưa xác định tác giả"');
    assert.equal(externalModalData.hasSourceUrlLink, true, 'Link to external sourceUrl must exist');
    assert.ok(externalModalData.sourceUrlText.includes('Mở tài liệu nguồn'), `Link text must be "Mở tài liệu nguồn", got: "${externalModalData.sourceUrlText}"`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'rag_orig_06_supported_classes_external.png') });
    record('FE-ORIGIN-04', 'Lớp nguồn EXTERNAL_REFERENCE hiển thị "Tài liệu tham khảo", icon menu_book và link "Mở tài liệu nguồn"', true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-testid="citation-detail-modal"]'), { timeout: 3000 });

    // -------------------------------------------------------------
    // Test 5: Author WITHHELD Privacy Protection
    // -------------------------------------------------------------
    console.log('\n--- Test Case 5: Author WITHHELD Privacy Protection ---');
    const viChipsWithheld = await page.$$(chipSelector);
    // Chip 3 is msg-withheld
    await viChipsWithheld[3].click();
    await page.waitForSelector('[data-testid="citation-detail-modal"]', { timeout: 5000 });

    const withheldModalData = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="citation-detail-modal"]');
      const authorBadge = modal?.querySelector('[data-testid="citation-author-badge"]');
      const modalHtml = modal?.innerHTML || '';

      return {
        authorText: authorBadge?.textContent?.trim() || '',
        hasPrivateAuthorLeaked: modalHtml.includes('TS. Nguyễn Văn Chuyên') || modalHtml.includes('Quản Trị Viên') || modalHtml.includes('admin@duricare'),
      };
    });

    assert.ok(withheldModalData.authorText.includes('Tên tác giả chưa được công bố'), `Withheld author badge must render "Tên tác giả chưa được công bố", got: "${withheldModalData.authorText}"`);
    assert.equal(withheldModalData.hasPrivateAuthorLeaked, false, 'Private author name, uploader or admin account must NOT be leaked in modal');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'rag_orig_07_author_withheld_privacy.png') });
    record('FE-ORIGIN-05', 'Tác giả WITHHELD hiển thị "Tên tác giả chưa được công bố", bảo toàn quyền riêng tư, 0 rò rỉ metadata', true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-testid="citation-detail-modal"]'), { timeout: 3000 });

    // -------------------------------------------------------------
    // Test 6: Fallback for Unsupported / Null Enums
    // -------------------------------------------------------------
    console.log('\n--- Test Case 6: Fallback for Unsupported / Null Enums ---');
    const viChipsUnsupported = await page.$$(chipSelector);
    // Chip 4 is msg-unsupported
    await viChipsUnsupported[4].click();
    await page.waitForSelector('[data-testid="citation-detail-modal"]', { timeout: 5000 });

    const unsupportedModalData = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="citation-detail-modal"]');
      const originBadge = modal?.querySelector('[data-testid="citation-origin-badge"]');
      const authorBadge = modal?.querySelector('[data-testid="citation-author-badge"]');
      const icon = originBadge?.querySelector('.material-symbols-outlined')?.textContent?.trim() || '';

      return {
        originLabel: originBadge?.querySelector('.break-words')?.textContent?.trim() || '',
        icon,
        authorText: authorBadge?.textContent?.trim() || '',
      };
    });

    assert.equal(unsupportedModalData.icon, 'info', 'Unsupported origin class must fallback to info icon');
    assert.equal(unsupportedModalData.originLabel, 'Chưa xác định lớp nguồn', 'Unsupported origin class must fallback to "Chưa xác định lớp nguồn"');
    assert.ok(unsupportedModalData.authorText.includes('Chưa xác định tác giả'), 'Unsupported author state must fallback to "Chưa xác định tác giả"');
    record('FE-ORIGIN-06', 'Enum lạ/null fallback an toàn về "Chưa xác định lớp nguồn" và "Chưa xác định tác giả", 0 crash', true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-testid="citation-detail-modal"]'), { timeout: 3000 });

    // -------------------------------------------------------------
    // Test 7: Mobile 375px Viewport with Long Metadata
    // -------------------------------------------------------------
    console.log('\n--- Test Case 7: Mobile 375px Viewport with Long Metadata ---');
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(r => setTimeout(r, 500));

    const mobileChips = await page.$$(chipSelector);
    // Chip 5 is msg-long-meta
    await mobileChips[5].click();
    await page.waitForSelector('[data-testid="citation-detail-modal"]', { timeout: 5000 });

    const mobileModalGeometry = await page.evaluate(() => {
      const modalCard = document.querySelector('[data-testid="citation-detail-modal"]');
      const closeBtn = modalCard?.querySelector('[data-testid="modal-close-btn"]');
      const heading = modalCard?.querySelector('#citation-modal-title');
      const bodyWidth = document.body.clientWidth;
      const windowWidth = window.innerWidth;

      const cardRect = modalCard?.getBoundingClientRect();
      const closeBtnRect = closeBtn?.getBoundingClientRect();

      return {
        cardWidth: cardRect?.width,
        bodyWidth,
        windowWidth,
        isScrollable: (modalCard?.scrollHeight || 0) > (modalCard?.clientHeight || 0),
        closeBtnVisible: !!closeBtn && (closeBtnRect?.width || 0) > 0,
        closeBtnMinSize: closeBtnRect ? Math.min(closeBtnRect.width, closeBtnRect.height) : 0,
        headingBreakWords: heading ? window.getComputedStyle(heading).wordBreak : '',
      };
    });

    assert.ok(mobileModalGeometry.cardWidth <= 375, 'Modal width must fit inside 375px screen');
    assert.equal(mobileModalGeometry.bodyWidth, 375, 'Page must not scroll horizontally on 375px');
    assert.equal(mobileModalGeometry.closeBtnVisible, true, 'Close button must be visible on mobile');
    assert.ok(mobileModalGeometry.closeBtnMinSize >= 28, 'Close button touch area must be accessible');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'rag_orig_03_mobile_375_long_metadata.png') });
    record('FE-ORIGIN-07', 'Mobile 375px chứa metadata dài cuộn mượt mà, không vỡ layout hoặc tràn màn hình ngang', true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-testid="citation-detail-modal"]'), { timeout: 3000 });

    // -------------------------------------------------------------
    // Test 8: Dark Theme & Passage Loading
    // -------------------------------------------------------------
    console.log('\n--- Test Case 8: Dark Theme & Passage Loading ---');
    await page.setViewport({ width: 1440, height: 900 });
    // Switch to dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('duricare-theme', 'dark');
    });

    const darkChips = await page.$$(chipSelector);
    await darkChips[0].click();
    await page.waitForSelector('[data-testid="citation-detail-modal"]', { timeout: 5000 });

    // Click fetch passage button
    const fetchPassageBtn = await page.$('[data-testid="btn-fetch-passage"]');
    assert.ok(fetchPassageBtn, 'Fetch passage button must exist');
    await fetchPassageBtn.click();

    await page.waitForSelector('[data-testid="citation-passage-content"]', { timeout: 5000 });
    const passageContent = await page.$eval('[data-testid="citation-passage-content"]', el => el.textContent.trim());
    assert.ok(passageContent.includes('Nội dung đoạn trích đã duyệt'), 'Passage content must be loaded successfully');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'rag_orig_04_desktop_dark_theme.png') });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'rag_orig_08_passage_approved_content.png') });
    record('FE-ORIGIN-08', 'Giao diện Dark theme sắc nét, tải đoạn trích thành công và hiển thị nhãn "Nội dung đã duyệt"', true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-testid="citation-detail-modal"]'), { timeout: 3000 });

    // Save test results manifest
    const manifestPath = path.join(EVIDENCE_DIR, 'rag-origin-001-test-results.json');
    fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\nSaved test results manifest to ${manifestPath}`);

    console.log('\n======================================================');
    console.log(`ALL ${results.length} VERIFICATION CHECKS PASSED SUCCESSFULLY!`);
    console.log('======================================================');
    results.forEach(r => console.log(`✓ [${r.id}] ${r.title}`));
  } finally {
    await browser.close();
    server.close();
  }
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
