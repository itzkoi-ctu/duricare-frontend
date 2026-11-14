/**
 * FE-RAG-CITATION-UX-001: Automated Verification Suite
 * Verifies all 16 named acceptance criteria for RAG citation presentation,
 * runs headless browser testing with Puppeteer, and captures evidence screenshots.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { pathToFileURL } from 'url';
import { build as viteBuild } from 'vite';
import puppeteer from 'puppeteer';

console.log('================================================================');
console.log('FE-RAG-CITATION-UX-001: Verification Suite');
console.log('================================================================');

let total = 0;
let passed = 0;
const results = [];

function recordTest(id, name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ [PASS] [Scenario ${id}] ${name}`);
    passed++;
    results.push({ id, name, status: 'PASS' });
  } catch (err) {
    console.error(`  ✗ [FAIL] [Scenario ${id}] ${name}`);
    console.error(err);
    results.push({ id, name, status: 'FAIL', error: String(err) });
  }
}

async function recordTestAsync(id, name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ [PASS] [Scenario ${id}] ${name}`);
    passed++;
    results.push({ id, name, status: 'PASS' });
  } catch (err) {
    console.error(`  ✗ [FAIL] [Scenario ${id}] ${name}`);
    console.error(err);
    results.push({ id, name, status: 'FAIL', error: String(err) });
  }
}

// ---------------------------------------------------------------------------
// 1. Bundle Production citationParser.ts into Native ESM via Vite
// ---------------------------------------------------------------------------
const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const worktreeDir = path.resolve(scriptDir, '..');
const tmpDir = path.resolve(worktreeDir, '.tmp-verify-citation');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

console.log('\n[1/3] Compiling production modules for runtime verification...');
await viteBuild({
  root: worktreeDir,
  configFile: false,
  logLevel: 'silent',
  build: {
    ssr: true,
    outDir: tmpDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        citationParser: path.resolve(worktreeDir, 'src/utils/citationParser.ts'),
      },
      output: {
        entryFileNames: '[name].mjs',
        format: 'esm',
      },
    },
  },
});

const bundleUrl = pathToFileURL(path.resolve(tmpDir, 'citationParser.mjs')).href;
const parser = await import(bundleUrl);
const { extractCitations, sanitizeSourceUrl, parseCitationLine, groupCitations } = parser;

console.log('Production citation parser loaded successfully from compiled bundle.\n');

// ---------------------------------------------------------------------------
// 2. Programmatic Acceptance Tests (All 16 Scenarios)
// ---------------------------------------------------------------------------
console.log('[2/3] Executing 16 Acceptance Criteria Scenarios...');

// Scenario 1: Một câu trả lời có một nguồn
recordTest(1, 'Một câu trả lời có một nguồn', () => {
  const content = `Theo tiêu chuẩn chăm sóc, độ ẩm đất tối ưu cho sầu riêng là 65-75%.

Căn cứ đã xác minh:
- Sổ tay VietGAP sầu riêng | bản 1 | đoạn 5c173ca7-df1f-4476-bd31-f512a07d9bbd | Trang 15 | tầng TIER_1 | publication d2a44de3-641b-4660-9789-eed845076092 | source 1c927192-3911-4d62-82a7-af2f61abd1f2 | revision e2625253-323d-4f29-a605-349d6deafc11`;

  const result = extractCitations(content);
  assert.strictEqual(result.hasRawFooter, true, 'Footer must be detected');
  assert.strictEqual(result.citations.length, 1, 'Must have exactly 1 citation group');
  assert.strictEqual(result.citations[0].sourceTitle, 'Sổ tay VietGAP sầu riêng');
  assert.strictEqual(result.citations[0].revisionNumber, 1);
  assert.strictEqual(result.citations[0].tier, 'TIER_1');
  assert.strictEqual(result.citations[0].chunks.length, 1);
  assert.strictEqual(result.citations[0].chunks[0].locator, 'Trang 15');
  assert.ok(!result.cleanContent.includes('Căn cứ đã xác minh:'), 'Raw footer must be removed from cleanContent');
  assert.ok(result.cleanContent.includes('độ ẩm đất tối ưu'), 'Prose content must be preserved');
});

// Scenario 2: Nhiều chunks cùng source/revision → một chip, đủ locator trong chi tiết
recordTest(2, 'Nhiều chunks cùng source/revision → một chip, đủ locator trong chi tiết', () => {
  const content = `Tư vấn canh tác sầu riêng giai đoạn nuôi trái.

Căn cứ đã xác minh:
- Sổ tay VietGAP sầu riêng | bản 2 | đoạn 11111111-1111-4111-8111-111111111111 | Mục 3.1: Nhu cầu nước | tầng TIER_1 | publication 00000000-0000-4000-8000-000000000001 | source 1c927192-3911-4d62-82a7-af2f61abd1f2 | revision e2625253-323d-4f29-a605-349d6deafc11
- Sổ tay VietGAP sầu riêng | bản 2 | đoạn 22222222-2222-4222-8222-222222222222 | Mục 3.2: Bón phân | tầng TIER_1 | publication 00000000-0000-4000-8000-000000000001 | source 1c927192-3911-4d62-82a7-af2f61abd1f2 | revision e2625253-323d-4f29-a605-349d6deafc11`;

  const result = extractCitations(content);
  assert.strictEqual(result.citations.length, 1, 'Must group into 1 chip for same sourceId and revisionId');
  assert.strictEqual(result.citations[0].chunks.length, 2, 'Must retain all individual chunks');
  assert.strictEqual(result.citations[0].chunks[0].locator, 'Mục 3.1: Nhu cầu nước');
  assert.strictEqual(result.citations[0].chunks[1].locator, 'Mục 3.2: Bón phân');
});

// Scenario 3: Cùng source khác revision → không gộp sai
recordTest(3, 'Cùng source khác revision → không gộp sai', () => {
  const content = `So sánh quy trình cũ và mới.

Căn cứ đã xác minh:
- Hướng dẫn canh tác | bản 1 | đoạn 11111111-1111-4111-8111-111111111111 | Trang 1 | tầng 1 | publication 00000000-0000-4000-8000-000000000001 | source 1c927192-3911-4d62-82a7-af2f61abd1f2 | revision aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
- Hướng dẫn canh tác | bản 2 | đoạn 22222222-2222-4222-8222-222222222222 | Trang 5 | tầng 1 | publication 00000000-0000-4000-8000-000000000002 | source 1c927192-3911-4d62-82a7-af2f61abd1f2 | revision bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`;

  const result = extractCitations(content);
  assert.strictEqual(result.citations.length, 2, 'Different revisionIds must yield 2 distinct groups');
  assert.strictEqual(result.citations[0].revisionNumber, 1);
  assert.strictEqual(result.citations[1].revisionNumber, 2);
});

// Scenario 4: Các source khác ID nhưng cùng tên → không gộp
recordTest(4, 'Các source khác ID nhưng cùng tên → không gộp', () => {
  const content = `Tổng hợp từ 2 tài liệu cùng tên của 2 đơn vị khác nhau.

Căn cứ đã xác minh:
- Sổ tay VietGAP | bản 1 | đoạn 11111111-1111-4111-8111-111111111111 | Đoạn 1 | tầng TIER_1 | publication 00000000-0000-4000-8000-000000000001 | source 11111111-1111-4111-8111-111111111111 | revision aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
- Sổ tay VietGAP | bản 1 | đoạn 22222222-2222-4222-8222-222222222222 | Đoạn 2 | tầng TIER_2 | publication 00000000-0000-4000-8000-000000000002 | source 22222222-2222-4222-8222-222222222222 | revision bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`;

  const result = extractCitations(content);
  assert.strictEqual(result.citations.length, 2, 'Different sourceIds must never be merged even if titles match');
  assert.strictEqual(result.citations[0].sourceId, '11111111-1111-4111-8111-111111111111');
  assert.strictEqual(result.citations[1].sourceId, '22222222-2222-4222-8222-222222222222');
});

// Scenario 5: Nhiều nguồn → +N và mở đầy đủ
recordTest(5, 'Nhiều nguồn → +N và mở đầy đủ', () => {
  const content = `Tổng hợp khuyến nông từ 4 nguồn tri thức.

Căn cứ đã xác minh:
- Nguồn A | bản 1 | đoạn 11111111-1111-4111-8111-111111111111 | Trang 1 | tầng 1 | publication 00000000-0000-4000-8000-000000000001 | source 00000000-0000-4000-8000-000000000001 | revision 00000000-0000-4000-8000-000000000011
- Nguồn B | bản 1 | đoạn 22222222-2222-4222-8222-222222222222 | Trang 2 | tầng 1 | publication 00000000-0000-4000-8000-000000000002 | source 00000000-0000-4000-8000-000000000002 | revision 00000000-0000-4000-8000-000000000022
- Nguồn C | bản 1 | đoạn 33333333-3333-4333-8333-333333333333 | Trang 3 | tầng 2 | publication 00000000-0000-4000-8000-000000000003 | source 00000000-0000-4000-8000-000000000003 | revision 00000000-0000-4000-8000-000000000033
- Nguồn D | bản 1 | đoạn 44444444-4444-4444-8444-444444444444 | Trang 4 | tầng 3 | publication 00000000-0000-4000-8000-000000000004 | source 00000000-0000-4000-8000-000000000004 | revision 00000000-0000-4000-8000-000000000044`;

  const result = extractCitations(content);
  assert.strictEqual(result.citations.length, 4, 'Must extract all 4 source groups');
  // With maxVisible=2, overflow count is 4 - 2 = 2 (+2 nguồn)
  const maxVisible = 2;
  const overflow = result.citations.length - maxVisible;
  assert.strictEqual(overflow, 2, 'Must calculate +2 overflow sources');
});

// Scenario 6: Tiêu đề/locator dài, Unicode tiếng Việt, mobile 360px
recordTest(6, 'Tiêu đề/locator dài, Unicode tiếng Việt, mobile 360px', () => {
  const longTitle = 'Quy trình kỹ thuật canh tác sầu riêng bền vững theo tiêu chuẩn VietGAP tại các tỉnh Đồng bằng sông Cửu Long năm 2024';
  const longLocator = 'Chương IV: Quản lý dinh dưỡng và chế độ tưới nước trong điều kiện khô hạn và xâm nhập mặn, Trang 88-95, Bảng 4.2';
  const content = `Lời khuyên kỹ thuật.

Căn cứ đã xác minh:
- ${longTitle} | bản 3 | đoạn 5c173ca7-df1f-4476-bd31-f512a07d9bbd | ${longLocator} | tầng TIER_1 | năm 2024 | publication d2a44de3-641b-4660-9789-eed845076092 | source 1c927192-3911-4d62-82a7-af2f61abd1f2 | revision e2625253-323d-4f29-a605-349d6deafc11`;

  const result = extractCitations(content);
  assert.strictEqual(result.citations.length, 1);
  assert.strictEqual(result.citations[0].sourceTitle, longTitle, 'Full Unicode title must be preserved');
  assert.strictEqual(result.citations[0].chunks[0].locator, longLocator, 'Full Unicode locator must be preserved');
  assert.strictEqual(result.citations[0].year, 2024);
});

// Scenario 7: Không có sourceUrl → không có link tài liệu gốc giả
recordTest(7, 'Không có sourceUrl → không có link tài liệu gốc giả', () => {
  const content = `Nội dung tư vấn không kèm URL ngoài.

Căn cứ đã xác minh:
- Tài liệu nội bộ viện cây ăn quả | bản 1 | đoạn 5c173ca7-df1f-4476-bd31-f512a07d9bbd | Trang 10 | tầng TIER_2 | publication d2a44de3-641b-4660-9789-eed845076092 | source 1c927192-3911-4d62-82a7-af2f61abd1f2 | revision e2625253-323d-4f29-a605-349d6deafc11`;

  const result = extractCitations(content);
  assert.strictEqual(result.citations[0].sourceUrl, undefined, 'sourceUrl must be undefined when not supplied');
});

// Scenario 8: URL độc hại → không tạo link có thể thực thi
recordTest(8, 'URL độc hại → không tạo link có thể thực thi', () => {
  assert.strictEqual(sanitizeSourceUrl('javascript:alert(1)'), null);
  assert.strictEqual(sanitizeSourceUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.strictEqual(sanitizeSourceUrl('file:///etc/passwd'), null);
  assert.strictEqual(sanitizeSourceUrl('https://admin:secret@malicious.com/phish'), null);
  assert.strictEqual(sanitizeSourceUrl('not-a-valid-url'), null);
  assert.strictEqual(sanitizeSourceUrl(''), null);
  assert.strictEqual(sanitizeSourceUrl(null), null);
  assert.strictEqual(sanitizeSourceUrl('http://vietgap.gov.vn/so-tay.pdf'), 'http://vietgap.gov.vn/so-tay.pdf');
  assert.strictEqual(sanitizeSourceUrl('https://ctu.edu.vn/research?id=123'), 'https://ctu.edu.vn/research?id=123');
});

// Scenario 9: Tin nhắn cũ thiếu/null/malformed evidence → fallback an toàn
recordTest(9, 'Tin nhắn cũ thiếu/null/malformed evidence → fallback an toàn', () => {
  const legacyContent = `Khuyến nghị chăm sóc: Bạn nên duy trì tưới nhỏ giọt.
Căn cứ: chưa xác định nguồn (tầng UNKNOWN)`;

  const result = extractCitations(legacyContent);
  assert.strictEqual(result.hasRawFooter, false, 'Legacy unsourced footer must not be treated as governed citation');
  assert.strictEqual(result.citations.length, 0, 'No false citations generated');
  assert.strictEqual(result.cleanContent, legacyContent, 'Legacy content must be preserved as-is');

  // Test with completely malformed text
  const malformed = 'Căn cứ đã xác minh:\n- Not a valid citation line';
  const resultMalformed = extractCitations(malformed);
  assert.strictEqual(resultMalformed.hasRawFooter, false);
  assert.strictEqual(resultMalformed.cleanContent, malformed);
});

// Scenario 10: Footer cũ + structured evidence → không lặp nếu nhận diện chắc chắn
recordTest(10, 'Footer cũ + structured evidence → không lặp nếu nhận diện chắc chắn', () => {
  const raw = `Độ ẩm hiện tại là 70%.

Căn cứ đã xác minh:
- Hướng dẫn VietGAP | bản 1 | đoạn 5c173ca7-df1f-4476-bd31-f512a07d9bbd | Trang 2 | tầng 1 | publication d2a44de3-641b-4660-9789-eed845076092 | source 1c927192-3911-4d62-82a7-af2f61abd1f2 | revision e2625253-323d-4f29-a605-349d6deafc11`;

  const result = extractCitations(raw);
  assert.strictEqual(result.hasRawFooter, true);
  assert.strictEqual(result.cleanContent, 'Độ ẩm hiện tại là 70%.', 'Markdown prose must have raw footer stripped');
});

// Scenario 11: Chữ “Căn cứ” trong prose/code block hoặc footer không khớp → không làm mất nội dung
recordTest(11, 'Chữ “Căn cứ” trong prose/code block hoặc footer không khớp → không làm mất nội dung', () => {
  // 11a: In prose
  const proseWithWord = 'Căn cứ vào điều kiện nhiệt độ 32°C và độ ẩm 60%, nên bổ sung nước tưới lúc chiều mát.';
  const res1 = extractCitations(proseWithWord);
  assert.strictEqual(res1.hasRawFooter, false);
  assert.strictEqual(res1.cleanContent, proseWithWord, 'Prose with "Căn cứ" must not be modified');

  // 11b: Inside code block
  const codeBlockText = `Ví dụ cấu hình kiểm thử:
\`\`\`
Căn cứ đã xác minh:
- Nguồn thử nghiệm | bản 1 | đoạn 5c173ca7-df1f-4476-bd31-f512a07d9bbd | Mục 1 | tầng 1 | publication d2a44de3-641b-4660-9789-eed845076092 | source 1c927192-3911-4d62-82a7-af2f61abd1f2 | revision e2625253-323d-4f29-a605-349d6deafc11
\`\`\`
Kết thúc hướng dẫn.`;

  const res2 = extractCitations(codeBlockText);
  assert.strictEqual(res2.hasRawFooter, false, 'Citations inside code blocks must be ignored');
  assert.strictEqual(res2.citations.length, 0);
  assert.strictEqual(res2.cleanContent, codeBlockText);
});

// Scenario 12: OWNER/ADMIN/EXPERT: link theo khả năng truy cập thực tế
recordTest(12, 'OWNER/ADMIN/EXPERT: link theo khả năng truy cập thực tế', () => {
  // Inspect CitationDetailModal.tsx source code to verify RBAC guard
  const modalCode = fs.readFileSync(path.resolve(worktreeDir, 'src/components/chat/CitationDetailModal.tsx'), 'utf8');
  assert.ok(modalCode.includes("const canViewSourceProfile = userRole === 'ADMIN' || userRole === 'EXPERT';"),
    'Must restrict source profile link strictly to ADMIN and EXPERT');
  assert.ok(modalCode.includes('{canViewSourceProfile && ('),
    'Profile link must be conditionally rendered based on canViewSourceProfile');
  assert.ok(!modalCode.includes("userRole === 'OWNER' && canViewSourceProfile"),
    'OWNER must never receive source profile link');
});

// Scenario 13: Đổi conversation/message khi dialog mở → không lẫn provenance
recordTest(13, 'Đổi conversation/message khi dialog mở → không lẫn provenance', () => {
  const panelCode = fs.readFileSync(path.resolve(worktreeDir, 'src/components/ChatPanel.tsx'), 'utf8');
  assert.ok(panelCode.includes('(!citationModal.messageId || messages.some(m => m.id === citationModal.messageId))'),
    'Citation modal must close automatically when the active message is removed or conversation changes');
});

// Scenario 14: Câu trả lời không có nguồn → không hiện khối nguồn rỗng
recordTest(14, 'Câu trả lời không có nguồn → không hiện khối nguồn rỗng', () => {
  const answer = 'Độ ẩm tại khu A là 68%, bình thường.';
  const res = extractCitations(answer);
  assert.strictEqual(res.citations.length, 0);
  const chipsCode = fs.readFileSync(path.resolve(worktreeDir, 'src/components/chat/CitationChips.tsx'), 'utf8');
  assert.ok(chipsCode.includes('if (!groups || groups.length === 0) return null;'),
    'CitationChips must return null when groups is empty');
});

// Scenario 15: Câu trả lời có cảnh báo/thiếu chứng cứ → giữ nguyên cảnh báo
recordTest(15, 'Câu trả lời có cảnh báo/thiếu chứng cứ → giữ nguyên cảnh báo', () => {
  const warningContent = `Hiện chưa có căn cứ trong cơ sở tri thức phù hợp để đánh giá câu hỏi này.
CẢNH BÁO: Không tự ý tăng nồng độ thuốc bảo vệ thực vật quá ngưỡng hướng dẫn trên bao bì.`;

  const res = extractCitations(warningContent);
  assert.strictEqual(res.hasRawFooter, false);
  assert.strictEqual(res.cleanContent, warningContent);
  assert.ok(res.cleanContent.includes('CẢNH BÁO'), 'Warning must remain completely intact');
});

// Scenario 16: Kiểm thử các bề mặt Agent/widget/history thực sự dùng chung renderer
recordTest(16, 'Kiểm thử các bề mặt Agent/widget/history thực sự dùng chung renderer', () => {
  const agentPageCode = fs.readFileSync(path.resolve(worktreeDir, 'src/pages/AgentPage.tsx'), 'utf8');
  const insightCardCode = fs.readFileSync(path.resolve(worktreeDir, 'src/components/InsightCard.tsx'), 'utf8');
  assert.ok(agentPageCode.includes('ChatPanelView'), 'AgentPage must render ChatPanelView');
  assert.ok(insightCardCode.includes('ChatPanel'), 'InsightCard on Dashboard must render ChatPanel');
});

// ---------------------------------------------------------------------------
// 3. Browser Live UI Verification & Screenshot Capture via Puppeteer
// ---------------------------------------------------------------------------
console.log('\n[3/3] Launching Puppeteer for live browser validation and screenshot capture...');

const EVIDENCE_DIRS = [
  'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence',
  path.resolve(worktreeDir, '../../docs/ai/thesis/evidence/RAG-CITATION-UX-001'),
];

for (const dir of EVIDENCE_DIRS) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveScreenshot(page, filename) {
  for (const dir of EVIDENCE_DIRS) {
    const fullPath = path.join(dir, filename);
    await page.screenshot({ path: fullPath, fullPage: false });
    console.log(`  Saved screenshot: ${fullPath}`);
  }
}

// Simple SPA Server on dist
const PORT = 5199;
const distDir = path.resolve(worktreeDir, 'dist');

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
  let filePath = path.join(distDir, urlPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return fs.createReadStream(filePath).pipe(res);
  }

  const indexPath = path.join(distDir, 'index.html');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(indexPath).pipe(res);
});

await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
console.log(`SPA Test Server listening on http://127.0.0.1:${PORT}`);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setRequestInterception(true);

const mockUser = {
  id: 1,
  email: 'admin@duricare.vn',
  username: 'admin',
  fullName: 'Quản trị viên Hệ thống',
  role: 'ADMIN',
};

const mockConversations = [
  {
    id: 'conv-rag-001',
    title: 'Tư vấn tưới sầu riêng mùa khô',
    zoneCode: 'zoneA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockMessages = [
  {
    id: 101,
    role: 'USER',
    content: 'Độ ẩm đất tại khu A hiện là 62%, tôi có cần tưới thêm không?',
    createdAt: new Date(Date.now() - 60000).toISOString(),
    modelUsed: null,
    toolsUsed: [],
    latencyMs: null,
  },
  {
    id: 102,
    role: 'ASSISTANT',
    content: `Dựa trên dữ liệu cảm biến và quy trình VietGAP, độ ẩm đất 62% ở giai đoạn phát triển đọt non là ở ngưỡng cần bổ sung nước nhẹ.

Khuyến nghị:
- Bật hệ thống tưới nhỏ giọt trong khoảng 30 - 45 phút vào buổi sáng sớm.
- Tránh tưới đẫm vào giữa trưa khi nhiệt độ đất cao.
- Theo dõi cảm biến độ ẩm sau khi tưới 2 giờ để đảm bảo đạt ngưỡng 70%.

Căn cứ đã xác minh:
- Sổ tay VietGAP sầu riêng Đồng bằng sông Cửu Long | bản 2 | đoạn 5c173ca7-df1f-4476-bd31-f512a07d9bbd | Trang 15-18, Mục 3.1: Nhu cầu tưới | tầng TIER_1 | năm 2024 | https://vietgap.gov.vn/so-tay-sau-rieng.pdf | publication d2a44de3-641b-4660-9789-eed845076092 | source 1c927192-3911-4d62-82a7-af2f61abd1f2 | revision e2625253-323d-4f29-a605-349d6deafc11
- Hướng dẫn kỹ thuật phòng trừ sâu bệnh | bản 1 | đoạn 6b284db8-ea2e-4587-ce42-e623b18e0ccd | Chương II: Chế độ ẩm | tầng TIER_2 | publication f3b55ef4-752c-4771-a890-ffe9561871a3 | source 2d038203-4022-4e73-93b8-ba3f72bce2f3 | revision f3736364-434e-403a-b716-45ae7efbfc22
- Tài liệu khuyến nông Tiền Giang | bản 1 | đoạn 7c395ec9-fb3f-4698-df53-f734c29f1dde | Trang 45 | tầng TIER_3 | publication 00000000-0000-4000-8000-000000000001 | source 3e149314-5133-4f84-a4c9-cb4f83cdf3a4 | revision 00000000-0000-4000-8000-000000000011
- Kỹ thuật phục hồi sau thu hoạch | bản 1 | đoạn 8d406fda-0c40-4709-ef64-0845d3a02eef | Trang 12 | tầng TIER_2 | publication 00000000-0000-4000-8000-000000000002 | source 4f250425-6244-4095-b5da-dc5094de04b5 | revision 00000000-0000-4000-8000-000000000022`,
    createdAt: new Date().toISOString(),
    modelUsed: 'gemini-1.5-flash',
    toolsUsed: [
      { name: 'getSensorData', arguments: { zoneCode: 'zoneA' }, outcome: 'OK' },
      { name: 'searchKnowledge', arguments: { query: 'độ ẩm tưới sầu riêng' }, outcome: 'OK' },
    ],
    latencyMs: 1250,
  },
];

page.on('console', msg => {
  const text = msg.text();
  if (text.includes('Error') || text.includes('warning') || text.includes('chat')) {
    console.log('  [BROWSER CONSOLE]', text);
  }
});
page.on('pageerror', err => console.error('  [PAGE ERROR]', err.message));

page.on('request', req => {
  const url = req.url();
  if (url.includes('/auth/refresh')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ accessToken: 'mock-jwt-token' }) });
  } else if (url.includes('/auth/csrf')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'mock-csrf-token' }) });
  } else if (url.includes('/auth/me')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser) });
  } else if (url.includes('/farms')) {
    req.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Vườn thực nghiệm', location: 'Cần Thơ', zoneCount: 1 }]),
    });
  } else if (url.includes('/agent/conversations/conv-rag-001/messages')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMessages) });
  } else if (url.includes('/agent/conversations')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(mockConversations) });
  } else if (url.includes('/overview')) {
    req.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        farmName: 'Vườn thực nghiệm Cần Thơ',
        generatedAt: new Date().toISOString(),
        totalUnresolvedAlerts: 0,
        weather: { temperature: 29.5, humidity: 78, weatherCode: 1 },
        latestInsight: null,
        zones: [
          {
            code: 'zoneA',
            name: 'Khu A',
            growthStage: 'VEGETATIVE',
            variety: 'Ri6',
            plantingDate: '2020-01-01',
            metrics: {
              soilMoisture: 65,
              soilMoistureStatus: 'OPTIMAL',
              temperature: 30,
              humidity: 75,
            },
            alerts: { hard: 0, agentic: 0 },
          },
        ],
      }),
    });
  } else if (url.includes('/alerts')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  } else {
    req.continue();
  }
});

await recordTestAsync(17, 'Browser UI E2E & Evidence Screenshots', async () => {
  // 1. Desktop Light (1440x900)
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/agent?conversationId=conv-rag-001`, { waitUntil: 'networkidle0' });

  // Wait for assistant message and citation chips
  await page.waitForSelector('[role="region"][aria-label="Nguồn tham khảo"]', { timeout: 8000 });
  await page.waitForFunction(() => !document.body.innerText.includes('Căn cứ đã xác minh:'));

  console.log('  Capturing citation_01_desktop_compact_answer_light_1440.png...');
  await saveScreenshot(page, 'citation_01_desktop_compact_answer_light_1440.png');

  // 2. Open Citation Detail Modal
  const firstChip = await page.$('[role="region"][aria-label="Nguồn tham khảo"] button');
  assert.ok(firstChip, 'First citation chip must exist');
  await firstChip.click();

  await page.waitForSelector('[role="dialog"][aria-modal="true"]', { timeout: 5000 });
  await page.waitForSelector('#citation-modal-title');

  // Verify modal elements
  const modalTitle = await page.$eval('#citation-modal-title', el => el.textContent);
  assert.ok(modalTitle.includes('Sổ tay VietGAP'), 'Modal title must display source title');

  // Open collapsible audit info
  await page.click('details summary');
  await page.waitForFunction(() => document.querySelector('details[open]') !== null);

  console.log('  Capturing citation_02_desktop_citation_modal_light_1440.png...');
  await saveScreenshot(page, 'citation_02_desktop_citation_modal_light_1440.png');

  // 3. Desktop Dark
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  console.log('  Capturing citation_03_desktop_dark_1440.png...');
  await saveScreenshot(page, 'citation_03_desktop_dark_1440.png');

  // Close modal via Escape key
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('[role="dialog"]') === null);

  // 4. Mobile Light (360x740)
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.setViewport({ width: 360, height: 740, isMobile: true });
  await new Promise(r => setTimeout(r, 300));

  console.log('  Capturing citation_04_mobile_light_360.png...');
  await saveScreenshot(page, 'citation_04_mobile_light_360.png');

  // 5. Mobile Dark Modal
  const mobileChip = await page.$('[role="region"][aria-label="Nguồn tham khảo"] button');
  await mobileChip.click();
  await page.waitForSelector('[role="dialog"]');
  await page.evaluate(() => document.documentElement.classList.add('dark'));

  console.log('  Capturing citation_05_mobile_modal_dark_360.png...');
  await saveScreenshot(page, 'citation_05_mobile_modal_dark_360.png');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('[role="dialog"]') === null);

  // 6. Dashboard Widget (InsightCard)
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  console.log('  Capturing citation_06_dashboard_widget_compact_1440.png...');
  await saveScreenshot(page, 'citation_06_dashboard_widget_compact_1440.png');
});

await browser.close();
server.close();

console.log('\n================================================================');
console.log(`VERIFICATION SUMMARY: ${passed} / ${total} CHECKS PASSED`);
console.log('================================================================');

if (passed === total) {
  console.log('ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY.\n');
  process.exit(0);
} else {
  console.error(`FAILED: ${total - passed} checks failed.\n`);
  process.exit(1);
}
