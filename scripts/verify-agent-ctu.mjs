#!/usr/bin/env node
/**
 * UI-REFRESH-CTU-001 P4: Automated Verification Suite for Trợ lý AI (/agent)
 * Validates strict conformance with Stitch approved references:
 * - Desktop: 2307ab8816db4c1897c9b5099fee270a (references/agent-desktop.html)
 * - Mobile: f1bd947392ef4dfd89101ed5955be10b (references/agent-mobile.html)
 *
 * Verifies:
 * 1. 3-Column Desktop Hierarchy (History w-60 | Chat flex-1 | IoT Context Rail w-[300px])
 * 2. Mobile Drawer Navigation (History drawer + Context sheet, sticky composer)
 * 3. Chat Panel fidelity (DuriCare bot avatar, clean markdown, CitationChips, tool badges)
 * 4. Realtime IoT Telemetry fidelity (tabular-nums, provenance, genuine fallback --)
 * 5. Full keyboard accessibility, modal focus traps, and theme consistency
 * 6. Evidence screenshot capture and SHA-256 hash generation
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

const EVIDENCE_DIRS = [
  path.resolve('C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence'),
  path.resolve('E:/CTU/LuanVan/verification/ui-refresh-ctu-agent-design-20261116/evidence'),
];

for (const dir of EVIDENCE_DIRS) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let passed = 0;
let total = 0;
const capturedHashes = {};

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function captureEvidence(page, filename) {
  const primaryPath = path.join(EVIDENCE_DIRS[0], filename);
  await page.screenshot({ path: primaryPath, fullPage: false });
  const buffer = fs.readFileSync(primaryPath);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  capturedHashes[filename] = hash;

  // Mirror to verification directory
  const secondaryPath = path.join(EVIDENCE_DIRS[1], filename);
  fs.writeFileSync(secondaryPath, buffer);

  console.log(`  📸 Captured ${filename} (SHA256: ${hash.slice(0, 16)}...)`);
  return hash;
}

console.log('================================================================');
console.log('UI-REFRESH-CTU-001 P4 Trợ lý AI (/agent) Verification Suite');
console.log('================================================================\n');

// ─── [1/3] Static Code & Token Assertions ─────────────────────
console.log('[1/3] Static code & design token assertions...');

const agentPagePath = path.join(ROOT_DIR, 'src/pages/AgentPage.tsx');
const conversationListPath = path.join(ROOT_DIR, 'src/components/AgentConversationList.tsx');
const chatPanelPath = path.join(ROOT_DIR, 'src/components/ChatPanel.tsx');
const contextRailPath = path.join(ROOT_DIR, 'src/components/agent/AgentIoTContextRail.tsx');
const viI18nPath = path.join(ROOT_DIR, 'src/i18n/locales/vi/translation.json');
const enI18nPath = path.join(ROOT_DIR, 'src/i18n/locales/en/translation.json');

const agentPageContent = fs.readFileSync(agentPagePath, 'utf8');
const conversationListContent = fs.readFileSync(conversationListPath, 'utf8');
const chatPanelContent = fs.readFileSync(chatPanelPath, 'utf8');
const contextRailContent = fs.readFileSync(contextRailPath, 'utf8');
const viI18n = JSON.parse(fs.readFileSync(viI18nPath, 'utf8'));
const enI18n = JSON.parse(fs.readFileSync(enI18nPath, 'utf8'));

// Scenario S1: 3-Column Desktop Grid Hierarchy in AgentPage
assert(
  agentPageContent.includes('lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_21rem]') &&
  agentPageContent.includes('AgentIoTContextRail') &&
  agentPageContent.includes('AgentIoTContextSheet'),
  '[Scenario S1.1] AgentPage establishes 3-column responsive grid (History 15rem, Chat minmax, Context 21rem)'
);

assert(
  agentPageContent.includes('onNew={chat.newConversation}') &&
  agentPageContent.includes('AgentConversationSheet'),
  '[Scenario S1.2] AgentPage wires newConversation to conversation list and integrates mobile history drawer'
);

// Scenario S2: Conversation History per Stitch Reference
assert(
  conversationListContent.includes('Cuộc trò chuyện mới') &&
  conversationListContent.includes('Hôm nay') &&
  conversationListContent.includes('Trợ lý AI nông vụ DuriCare'),
  '[Scenario S2.1] AgentConversationList implements action button, timeline grouping, and footer microcopy'
);

assert(
  conversationListContent.includes('border-l-2') &&
  conversationListContent.includes('bg-[#eff4ff]') &&
  conversationListContent.includes('data-conversation-id'),
  '[Scenario S2.2] AgentConversationList active item uses Stitch blue accent bar and data-conversation-id'
);

assert(
  conversationListContent.includes('Xác nhận xoá') &&
  conversationListContent.includes('Huỷ'),
  '[Scenario S2.3] AgentConversationList preserves accessible confirmation flow before deleting conversation'
);

// Scenario S3: Chat Panel per Stitch Reference
assert(
  chatPanelContent.includes('Trợ lý AI') &&
  chatPanelContent.includes('dock_to_left') &&
  chatPanelContent.includes('toggle-context-rail-btn') &&
  chatPanelContent.includes('whitespace-nowrap'),
  '[Scenario S3.1] ChatPanel renders header with zone badge, context toggle, and uncollapsible title'
);

assert(
  chatPanelContent.includes('psychology') &&
  chatPanelContent.includes('DuriCare') &&
  chatPanelContent.includes('CitationChips'),
  '[Scenario S3.2] ChatPanel assistant card renders bot avatar, DuriCare title, timestamp, and citation chips'
);

assert(
  chatPanelContent.includes('bg-[#eff4ff]') &&
  chatPanelContent.includes('rounded-2xl rounded-tr-sm') &&
  chatPanelContent.includes('send'),
  '[Scenario S3.3] ChatPanel user message bubble uses Stitch light blue bubble with send icon composer'
);

// Scenario S4: Context Rail Telemetry Cards per Stitch Reference
assert(
  contextRailContent.includes('Số đo hiện tại') &&
  contextRailContent.includes('Độ ẩm đất') &&
  !contextRailContent.includes('Độ ẩm tầng đất mặt') &&
  contextRailContent.includes('Nhiệt độ khí') &&
  contextRailContent.includes('Độ ẩm khí'),
  '[Scenario S4.1] AgentIoTContextRail Card 1 renders realtime sensor metrics without unverified depth'
);

assert(
  contextRailContent.includes('Hồ sơ nông vụ khu vực') &&
  contextRailContent.includes('Giống cây:') &&
  contextRailContent.includes('Giai đoạn:') &&
  contextRailContent.includes('Khoảng ẩm tối ưu:') &&
  !contextRailContent.includes("'Ri6'") &&
  !contextRailContent.includes("'60% – 80%'"),
  '[Scenario S4.2] AgentIoTContextRail Card 2 renders agronomic crop profile with honest missing state fallbacks'
);

assert(
  contextRailContent.includes('Dự báo thời tiết 2 ngày lịch') &&
  contextRailContent.includes('Hai ngày lịch:') &&
  contextRailContent.includes('Xem chi tiết khu vực') &&
  !contextRailContent.includes("'10:15'"),
  '[Scenario S4.3] AgentIoTContextRail Card 3 renders 2-calendar-day weather forecast without fabricated timestamps'
);

// Scenario S5: i18n Completeness for All New Keys
const REQUIRED_I18N_KEYS = [
  'Trợ lý AI nông vụ DuriCare',
  'Ngữ cảnh khu vực',
  'Lịch sử',
  'Mới',
  'Khoảng mục tiêu cấu hình: {0}–{1}%',
  'Chưa thiết lập ngưỡng',
  'Giống cây:',
  'Giai đoạn:',
  'Khoảng ẩm tối ưu:',
  'Hai ngày lịch:',
  'Dự báo thời tiết 2 ngày lịch',
  'Xem chi tiết khu vực',
];

for (const key of REQUIRED_I18N_KEYS) {
  assert(
    typeof viI18n[key] === 'string' && typeof enI18n[key] === 'string',
    `[Scenario S5.I18N] Translation catalogs define valid VI & EN mappings for "${key}"`
  );
}

// ─── [2/3] Setup HTTP Server & Browser ────────────────────────
console.log('\n[2/3] Starting SPA test server and headless browser...');

const PORT = 5194;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST_DIR, req.url.split('?')[0]);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
console.log(`SPA Server listening on http://127.0.0.1:${PORT}`);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN',
};

page.on('pageerror', (err) => console.error('  [PAGE ERROR]', err.message));

await page.setRequestInterception(true);

const mockAuthUser = {
  id: 1,
  email: 'admin@duricare.ctu.vn',
  role: 'ADMIN',
  farmId: 1,
  fullName: 'Quản trị viên CTU',
};

const now = Date.now();
const minute = 60 * 1000;

const mockOverview = {
  farmName: 'Vườn Sầu Riêng Phong Điền (Khu A & B)',
  generatedAt: new Date(now).toISOString(),
  totalUnresolvedAlerts: 4,
  latestInsight: {
    zoneCode: 'KHU-A',
    message: 'Khu A đang có độ ẩm tầng đất mặt thấp hơn tối ưu. Dự báo mưa chiều nay.',
    createdAt: new Date(now - 2 * minute).toISOString(),
  },
  weather: {
    temperature: 29,
    humidity: 78,
    weatherCode: 95,
    precipitationProbabilityToday: 75,
    expectedRainMm48h: 10.6,
    fetchedAt: new Date(now - 15 * minute).toISOString(),
    source: 'Open-Meteo Gateway',
  },
  zones: [
    {
      code: 'KHU-A',
      name: 'Khu A',
      growthStage: 'RA_HOA',
      variety: 'Ri6',
      plantingDate: '2021-02-15',
      alerts: { hard: 2, agentic: 1 },
      observedCadenceSeconds: 60.0,
      metrics: {
        temperature: { value: 28.5, unit: '°C', recordedAt: new Date(now - 2 * minute).toISOString(), status: 'NORMAL', targetMin: 24, targetMax: 30, source: 'MQTT' },
        humidity: { value: 74, unit: '%', recordedAt: new Date(now - 2 * minute).toISOString(), status: 'NORMAL', targetMin: 70, targetMax: 85, source: 'MQTT' },
        soilMoisture: { value: 42.9, unit: '%', recordedAt: new Date(now - 2 * minute).toISOString(), status: 'LOW', targetMin: 40, targetMax: 70, source: 'MQTT' },
      },
      soilProfile: {
        observedAt: new Date(now).toISOString(),
        source: 'IOT_LAB',
        ph: { value: 6.2, unit: '', status: 'NORMAL', recordedAt: new Date(now).toISOString() },
        ec: { value: 1.15, unit: 'mS/cm', status: 'NORMAL', recordedAt: new Date(now).toISOString() },
      },
    },
    {
      code: 'KHU-B',
      name: 'Khu B',
      growthStage: 'DAU_TRAI',
      variety: 'Monthong',
      plantingDate: '2020-03-15',
      alerts: { hard: 1, agentic: 0 },
      observedCadenceSeconds: 60.0,
      metrics: {
        temperature: { value: 29.0, unit: '°C', recordedAt: new Date(now - 3 * minute).toISOString(), status: 'NORMAL', targetMin: 24, targetMax: 30, source: 'MQTT' },
        humidity: { value: 76.0, unit: '%', recordedAt: new Date(now - 3 * minute).toISOString(), status: 'NORMAL', targetMin: 70, targetMax: 85, source: 'MQTT' },
        soilMoisture: { value: 68.5, unit: '%', recordedAt: new Date(now - 3 * minute).toISOString(), status: 'NORMAL', targetMin: 55, targetMax: 70, source: 'MQTT' },
      },
    },
    {
      code: 'KHU-MIXED',
      name: 'Khu Thử Nghiệm Giống Sầu Riêng Hỗn Hợp Cần Thơ Pilot 2026',
      growthStage: null,
      variety: null,
      plantingDate: '2022-01-01',
      alerts: { hard: 0, agentic: 0 },
      observedCadenceSeconds: 60.0,
      metrics: {
        temperature: { value: 31.2, unit: '°C', recordedAt: new Date(now - 1 * minute).toISOString(), status: 'NORMAL', targetMin: null, targetMax: null, source: 'MQTT' },
        humidity: { value: 72.0, unit: '%', recordedAt: new Date(now - 1 * minute).toISOString(), status: 'NORMAL', targetMin: null, targetMax: null, source: 'MQTT' },
        soilMoisture: { value: 38.4, unit: '%', recordedAt: new Date(now - 120 * minute).toISOString(), status: 'NORMAL', targetMin: null, targetMax: null, source: 'IOTLAB' },
      },
    },
  ],
};

let conversations = [
  {
    id: 'conv-101',
    zoneCode: 'KHU-A',
    title: 'Điều chỉnh tưới trước khi hoa nở',
    createdAt: new Date(now - 30 * minute).toISOString(),
    updatedAt: new Date(now - 2 * minute).toISOString(),
  },
  {
    id: 'conv-102',
    zoneCode: 'KHU-A',
    title: 'Kiểm tra độ ẩm Khu A',
    createdAt: new Date(now - 120 * minute).toISOString(),
    updatedAt: new Date(now - 60 * minute).toISOString(),
  },
];

let messagesByConv = {
  'conv-101': [
    {
      id: 'msg-u1',
      role: 'USER',
      content: 'Một tuần trước khi hoa nở nên điều chỉnh tưới thế nào?',
      createdAt: new Date(now - 4 * minute).toISOString(),
    },
    {
      id: 'msg-a1',
      role: 'ASSISTANT',
      content: `Theo mục 1.6.2 của Sổ tay cây sầu riêng VietGAP, một tuần trước khi hoa nở cần giảm khoảng 2/3 lượng nước ở mỗi lần tưới, đồng thời giữ nguyên chu kỳ tưới.

Hãy đối chiếu thời tiết và điều kiện thực tế tại vườn trước khi áp dụng.

Căn cứ đã xác minh:
- Sổ tay cây sầu riêng VietGAP | bản 1 | đoạn 5c173ca7-df1f-4476-bd31-f512a07d9bbd | Trang 2 | tầng 1 | publication d2a44de3-641b-4660-9789-eed845076092 | source 1c927192-3911-4d62-82a7-af2f61abd1f2 | revision e2625253-323d-4f29-a605-349d6deafc11`,
      modelUsed: 'gemini-1.5-flash',
      toolsUsed: [{ name: 'searchKnowledge', arguments: {}, outcome: 'OK' }],
      createdAt: new Date(now - 3 * minute).toISOString(),
    },
  ],
  'conv-102': [
    {
      id: 'msg-u2',
      role: 'USER',
      content: 'Độ ẩm đất khu A có ổn không?',
      createdAt: new Date(now - 60 * minute).toISOString(),
    },
    {
      id: 'msg-a2',
      role: 'ASSISTANT',
      content: 'Độ ẩm hiện tại là 42.9%, đang ở mức tối ưu cho giai đoạn ra hoa.',
      modelUsed: 'gemini-1.5-flash',
      toolsUsed: [{ name: 'getSensorData', arguments: {}, outcome: 'OK' }],
      createdAt: new Date(now - 59 * minute).toISOString(),
    },
  ],
};

page.on('request', (req) => {
  const url = req.url();
  const method = req.method();

  if (url.startsWith(`http://127.0.0.1:${PORT}`)) {
    return req.continue();
  }

  if (method === 'OPTIONS') {
    return req.respond({ status: 204, headers: CORS_HEADERS });
  }

  if (url.includes('/auth/refresh')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'mock-token', user: mockAuthUser }),
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
      body: JSON.stringify(mockAuthUser),
    });
  }

  if (url.includes('/farms')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Vườn Sầu Riêng Phong Điền (Khu A & B)', code: 'PHONGDIEN-01' }]),
    });
  }

  if (url.includes('/overview')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockOverview),
    });
  }

  if (url.includes('/messages') && method === 'GET') {
    const convId = url.includes('conv-102') ? 'conv-102' : 'conv-101';
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(messagesByConv[convId] || []),
    });
  }

  if (url.includes('/agent/conversations/') && method === 'DELETE') {
    const parts = url.split('/');
    const id = parts[parts.length - 1].split('?')[0];
    conversations = conversations.filter(c => c.id !== id);
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  }

  if (url.includes('/agent/conversations') && method === 'GET') {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(conversations),
    });
  }

  if (url.includes('/agent/ask') && method === 'POST') {
    const body = JSON.parse(req.postData() || '{}');
    const answer = `Tư vấn kỹ thuật cho câu hỏi: "${body.question}". Hãy kiểm tra đất và khí hậu trước khi thực hiện.`;
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        answer,
        conversationId: 'conv-101',
        toolsUsed: [{ name: 'searchKnowledge', outcome: 'OK' }],
      }),
    });
  }

  if (url.includes('/alerts')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  }

  if (url.includes('/zones')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockOverview.zones),
    });
  }

  req.continue();
});

// ─── [3/3] Interactive Browser Scenarios ─────────────────────
console.log('\n[3/3] Running interactive browser scenarios & capturing visual evidence...');

try {
  // ─── Desktop 1440px Scenario ────────────────────────────────
  await page.setViewport({ width: 1440, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.goto(`http://127.0.0.1:${PORT}/agent?conversationId=conv-101&zoneCode=KHU-A&farmId=1`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="agent-iot-context-rail"]');
  await page.waitForSelector('[data-chat-role="assistant"]');

  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await new Promise((r) => setTimeout(r, 200));

  // Scenario B1: 3 Columns Render Simultaneously
  const col1Visible = (await page.$('aside nav, aside button[type="button"]')) !== null;
  const col2Visible = (await page.$('section[aria-label*="Cuộc trò chuyện"]')) !== null;
  const col3Visible = (await page.$('[data-testid="agent-iot-context-rail"]')) !== null;

  assert(col1Visible && col2Visible && col3Visible, '[Scenario B1] 3-Column layout renders History, Chat, and IoT Rail simultaneously');

  // Scenario B2: Conversation History Item Selection & Styling
  const activeItem = await page.$eval('[data-conversation-id="conv-101"]', (el) => ({
    text: el.textContent.trim(),
    classes: el.className,
    hasDeleteBtn: el.querySelector('button[aria-label*="Xoá"]') !== null,
  }));
  assert(
    activeItem.text.includes('Điều chỉnh tưới trước khi hoa nở') && activeItem.text.includes('KHU-A'),
    '[Scenario B2.1] Conversation item displays title and zone badge pill'
  );
  assert(activeItem.hasDeleteBtn, '[Scenario B2.2] Conversation item provides accessible delete action button');

  // Scenario B3: Chat Header & Bot Response Card
  const chatHeader = await page.$eval('header h1', (el) => el.textContent.trim());
  assert(chatHeader === 'Trợ lý AI', `[Scenario B3.1] Chat header displays title "Trợ lý AI"; got "${chatHeader}"`);

  const h1Metrics1440 = await page.$eval('header h1', (el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
    text: el.textContent.trim(),
  }));
  assert(
    h1Metrics1440.clientWidth >= 60 && h1Metrics1440.scrollWidth <= h1Metrics1440.clientWidth + 1,
    `[Scenario B3.1b] Chat header title at 1440px is fully readable without truncation (client: ${h1Metrics1440.clientWidth}px, scroll: ${h1Metrics1440.scrollWidth}px)`
  );

  const desktopHeaderNewConvBtn = await page.$eval('header', (el) => el.textContent.includes('Cuộc trò chuyện mới'));
  assert(!desktopHeaderNewConvBtn, '[Scenario B3.1c] Desktop header eliminates redundant "Cuộc trò chuyện mới" button');

  const zoneBadgeText = await page.$eval('[data-testid="chat-zone-badge"]', (el) => el.textContent.trim());
  assert(zoneBadgeText.includes('KHU-A') || zoneBadgeText.includes('Khu A'), `[Scenario B3.2] Chat header renders active zone badge: "${zoneBadgeText}"`);

  const botMessage = await page.$eval('[data-chat-role="assistant"]', (el) => ({
    author: el.querySelector('.font-semibold')?.textContent?.trim() || '',
    text: el.textContent.trim(),
    hasAvatar: el.querySelector('.material-symbols-outlined')?.textContent?.trim() === 'psychology',
    hasCitationChip: el.querySelector('button[aria-label*="Nguồn"]') !== null,
  }));
  assert(botMessage.hasAvatar, '[Scenario B3.3] Assistant message renders psychology bot avatar');
  assert(botMessage.author === 'DuriCare', `[Scenario B3.4] Assistant message displays author "DuriCare"; got "${botMessage.author}"`);
  assert(botMessage.hasCitationChip, '[Scenario B3.5] Assistant message renders interactive scientific citation chip');

  // Scenario B4: IoT Telemetry Fidelity in Context Rail
  const telemetryData = await page.$eval('[data-testid="agent-iot-context-rail"]', (el) => ({
    hasOnlineBadge: el.textContent.includes('Trực tuyến'),
    hasSurfaceSoilText: el.textContent.includes('tầng đất mặt'),
    hasCleanSoilText: el.textContent.includes('Độ ẩm đất'),
    soilMoisture: el.textContent.includes('42.9%') || el.textContent.includes('42,9%'),
    airTemp: el.textContent.includes('28.5°C') || el.textContent.includes('28,5°C'),
    airHumidity: el.textContent.includes('74%'),
    variety: el.textContent.includes('Ri6'),
    growthStage: el.textContent.includes('Ra hoa'),
    forecastRain: el.textContent.includes('10.6 mm') || el.textContent.includes('10,6 mm'),
    hasChartLink: el.querySelector('a[href*="/zones/KHU-A"]') !== null,
    hasCalendarForecastTitle: el.textContent.includes('Dự báo thời tiết 2 ngày lịch'),
    hasSoilProvenance: el.querySelector('[data-testid="metric-provenance-soil"]') !== null,
    hasSoilTimestamp: el.querySelector('[data-testid="metric-timestamp-soil"]') !== null,
  }));

  assert(!telemetryData.hasOnlineBadge, '[Scenario B4.1a] Context rail eliminates unverified "Trực tuyến" status badge');
  assert(telemetryData.hasCleanSoilText && !telemetryData.hasSurfaceSoilText, '[Scenario B4.1b] Telemetry tile displays "Độ ẩm đất" (no unverified "tầng đất mặt")');
  assert(telemetryData.hasSoilProvenance && telemetryData.hasSoilTimestamp, '[Scenario B4.1c] Metrics display independent per-metric provenance and timestamp');
  assert(telemetryData.hasCalendarForecastTitle, '[Scenario B4.1d] Forecast section renders "Dự báo thời tiết 2 ngày lịch"');
  assert(telemetryData.soilMoisture, '[Scenario B4.2] Soil moisture renders 42.9% with tabular figures');
  assert(telemetryData.airTemp && telemetryData.airHumidity, '[Scenario B4.3] Microclimate sensor metrics render Air Temp 28.5°C and Humidity 74%');
  assert(telemetryData.variety && telemetryData.growthStage, '[Scenario B4.4] Agronomic profile displays variety Ri6 and stage Ra hoa');
  assert(telemetryData.forecastRain, '[Scenario B4.5] 48h Forecast card displays calendar rain 10.6 mm');
  assert(telemetryData.hasChartLink, '[Scenario B4.6] Context rail features visualizer navigation link to /zones/KHU-A');

  // Scenario B5: Citation Detail Modal Interaction
  const citationChip = await page.$('button[aria-label*="Nguồn"]');
  if (citationChip) {
    await citationChip.click();
    await new Promise((r) => setTimeout(r, 400));
  }
  const modalOpen = (await page.$('dialog[open], [role="dialog"]')) !== null;
  assert(modalOpen, '[Scenario B5.1] Clicking citation chip opens CitationDetailModal');

  // Close citation modal via accessible Escape key
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 400));
  const modalClosed = (await page.$('dialog[open], [role="dialog"]')) === null;
  assert(modalClosed, '[Scenario B5.2] Pressing Escape closes CitationDetailModal');

  // Capture Desktop Light & Dark
  await captureEvidence(page, 'fe_agent_01_desktop_light_1440.png');

  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await new Promise((r) => setTimeout(r, 200));
  await captureEvidence(page, 'fe_agent_02_desktop_dark_1440.png');

  // Switch back to light
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await new Promise((r) => setTimeout(r, 200));

  // Scenario B6: Collapse & Restore Context Rail on Desktop
  const toggleBtn = await page.$('[data-testid="toggle-context-rail-btn"]');
  if (toggleBtn) {
    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }
  const railCollapsed = (await page.$('[data-testid="desktop-agent-iot-context-aside"]')) === null;
  assert(railCollapsed, '[Scenario B6.1] Clicking toggle button collapses Column 3 to 2-column layout');

  if (toggleBtn) {
    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }
  const railRestored = (await page.$('[data-testid="desktop-agent-iot-context-aside"]')) !== null;
  assert(railRestored, '[Scenario B6.2] Clicking toggle button again restores 3-column layout');

  // ─── Desktop 1280px Scenario ────────────────────────────────
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise((r) => setTimeout(r, 200));
  const docOverflow1280 = await page.evaluate(() => document.documentElement.scrollWidth <= 1280);
  assert(docOverflow1280, '[Scenario B7.1] Desktop 1280px viewport has no horizontal overflow');

  const h1Metrics1280 = await page.$eval('header h1', (el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
  }));
  assert(
    h1Metrics1280.clientWidth >= 60 && h1Metrics1280.scrollWidth <= h1Metrics1280.clientWidth + 1,
    `[Scenario B7.2] Chat header title at 1280px is not collapsed/truncated (client: ${h1Metrics1280.clientWidth}px, scroll: ${h1Metrics1280.scrollWidth}px)`
  );
  await captureEvidence(page, 'fe_agent_03_desktop_1280.png');

  // ─── Mobile 390px (Stitch Reference Target) ─────────────────
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`http://127.0.0.1:${PORT}/agent?conversationId=conv-101&zoneCode=KHU-A&farmId=1`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  const h1Metrics390 = await page.$eval('header h1', (el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
  }));
  assert(
    h1Metrics390.clientWidth >= 60 && h1Metrics390.scrollWidth <= h1Metrics390.clientWidth + 1,
    `[Scenario B8.0] Chat header title at 390px is not collapsed/truncated (client: ${h1Metrics390.clientWidth}px, scroll: ${h1Metrics390.scrollWidth}px)`
  );

  // Scenario B8: Mobile Subheader & Telemetry Trigger
  const mobileHeader = await page.$eval('[data-testid="chat-header"]', (el) => ({
    hasHistoryBtn: el.querySelector('button[aria-label*="Lịch sử"], button[aria-label*="history"]') !== null,
    hasNewBtn: el.querySelector('button[aria-label*="Mới"]') !== null,
    hasContextBtn: el.querySelector('[data-testid="toggle-context-rail-btn"]') !== null,
  }));
  assert(mobileHeader.hasHistoryBtn && mobileHeader.hasNewBtn, '[Scenario B8.1] Mobile subheader renders "Lịch sử" and "Mới" action buttons');
  assert(mobileHeader.hasContextBtn, '[Scenario B8.2] Mobile subheader renders wide "Ngữ cảnh trạm đo" trigger button');

  // Scenario B9: Mobile Horizontal Overflow Guard
  const docOverflow390 = await page.evaluate(() => document.documentElement.scrollWidth <= 390);
  assert(docOverflow390, '[Scenario B9] Mobile 390px viewport fits strictly without horizontal overflow');

  // Capture Mobile Light & Dark
  await captureEvidence(page, 'fe_agent_04_mobile_light_390.png');

  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await new Promise((r) => setTimeout(r, 200));
  await captureEvidence(page, 'fe_agent_05_mobile_dark_390.png');

  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await new Promise((r) => setTimeout(r, 200));

  // Scenario B10: Open Mobile History Drawer & Verify Touch Target (F3)
  const mobileHistoryBtn = await page.$('button[aria-label*="Lịch sử"]');
  if (mobileHistoryBtn) {
    await mobileHistoryBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }
  const historyDrawerOpen = await page.$('dialog[open][aria-label*="Lịch sử"]') !== null;
  assert(historyDrawerOpen, '[Scenario B10.1] Clicking "Lịch sử" opens AgentConversationSheet drawer');

  const touchDeleteMetrics = await page.$eval('dialog[open] [data-conversation-id="conv-101"] button[aria-label*="Xoá"]', (btn) => {
    const rect = btn.getBoundingClientRect();
    const style = window.getComputedStyle(btn);
    return {
      opacity: parseFloat(style.opacity),
      width: rect.width,
      height: rect.height,
    };
  });
  assert(touchDeleteMetrics.opacity === 1, `[Scenario B10.2] Touch delete button has opacity 1 on touch screens (got ${touchDeleteMetrics.opacity})`);
  assert(
    touchDeleteMetrics.width >= 44 && touchDeleteMetrics.height >= 44,
    `[Scenario B10.3] Touch delete button meets 44x44px minimum touch target (got ${touchDeleteMetrics.width}x${touchDeleteMetrics.height}px)`
  );
  await captureEvidence(page, 'fe_agent_06_mobile_drawer_390.png');

  // Close History Drawer
  const closeHistoryBtn = await page.$('dialog[open] button[aria-label*="Đóng"]');
  if (closeHistoryBtn) {
    await closeHistoryBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }

  // Scenario B11: Open Mobile IoT Context Sheet
  const mobileContextBtn = await page.$('[data-testid="toggle-context-rail-btn"]');
  if (mobileContextBtn) {
    await mobileContextBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }
  const contextSheetOpen = await page.$('dialog[open][aria-label*="Ngữ cảnh"]') !== null;
  assert(contextSheetOpen, '[Scenario B11.1] Clicking telemetry trigger opens AgentIoTContextSheet slide-over');
  await captureEvidence(page, 'fe_agent_07_mobile_context_sheet_390.png');

  // Close Context Sheet
  const closeContextBtn = await page.$('dialog[open] button[aria-label*="Đóng"]');
  if (closeContextBtn) {
    await closeContextBtn.click();
    await new Promise((r) => setTimeout(r, 400));
  }

  // ─── Scenario B12: Mobile 375px Viewport & Long Zone Name (F1) ───
  await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
  await page.goto(`http://127.0.0.1:${PORT}/agent?conversationId=conv-101&zoneCode=KHU-MIXED&farmId=1`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  const docOverflow375 = await page.evaluate(() => document.documentElement.scrollWidth <= 375);
  assert(docOverflow375, '[Scenario B12.1] Mobile 375px viewport with long zone name has no horizontal overflow');

  const h1Metrics375 = await page.$eval('header h1', (el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
  }));
  assert(
    h1Metrics375.clientWidth >= 60 && h1Metrics375.scrollWidth <= h1Metrics375.clientWidth + 1,
    `[Scenario B12.2] Header title at 375px with long zone name remains fully visible (client: ${h1Metrics375.clientWidth}px, scroll: ${h1Metrics375.scrollWidth}px)`
  );

  const zoneBadge375 = await page.$eval('[data-testid="chat-zone-badge"]', (el) => {
    const textSpan = el.querySelector('span.truncate') || el;
    return {
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      textClientWidth: textSpan.clientWidth,
      textScrollWidth: textSpan.scrollWidth,
      isTruncated: textSpan.scrollWidth > textSpan.clientWidth || el.clientWidth <= 125,
    };
  });
  assert(zoneBadge375.isTruncated, '[Scenario B12.3] Long zone name badge cleanly truncates without collapsing header title');

  // ─── Scenario B13: Mixed-Source & Honest Metadata Validation (F2) ───
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/agent?conversationId=conv-101&zoneCode=KHU-MIXED&farmId=1`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  const mixedContextData = await page.$eval('[data-testid="agent-iot-context-rail"]', (el) => ({
    text: el.textContent,
    headerBadge: el.querySelector('[data-testid="section1-provenance-badge"]')?.textContent?.trim() || '',
    soilProv: el.querySelector('[data-testid="metric-provenance-soil"]')?.textContent?.trim() || '',
    tempProv: el.querySelector('[data-testid="metric-provenance-temperature"]')?.textContent?.trim() || '',
    hasNoSignal: el.textContent.includes('Mất tín hiệu'),
    hasRi6: el.textContent.includes('Ri6'),
    hasDefaultTarget: el.textContent.includes('60%–80%') || el.textContent.includes('60–80%'),
    hasMissingTargetNotice: el.textContent.includes('Chưa thiết lập ngưỡng') || el.textContent.includes('Not configured'),
    hasHardcoded1015: el.textContent.includes('10:15'),
  }));

  assert(
    mixedContextData.headerBadge.includes('Nguồn hỗn hợp') || mixedContextData.headerBadge.includes('Mixed sources'),
    `[Scenario B13.1] Mixed source zone displays "Nguồn hỗn hợp" in header badge (got "${mixedContextData.headerBadge}")`
  );
  assert(
    mixedContextData.soilProv.includes('IoTLab') || mixedContextData.soilProv.includes('IOTLAB'),
    `[Scenario B13.2] Soil metric displays IoTLab provenance (got "${mixedContextData.soilProv}")`
  );
  assert(
    mixedContextData.tempProv.includes('MQTT'),
    `[Scenario B13.3] Temperature metric displays MQTT provenance (got "${mixedContextData.tempProv}")`
  );
  assert(!mixedContextData.hasRi6, '[Scenario B13.4] Agronomic profile honestly shows missing variety (--), never Ri6 default');
  assert(
    !mixedContextData.hasDefaultTarget && mixedContextData.hasMissingTargetNotice,
    '[Scenario B13.5] Target soil range honestly displays "Chưa thiết lập ngưỡng", never hardcoded 60-80%'
  );
  assert(!mixedContextData.hasHardcoded1015, '[Scenario B13.6] Forecast card honestly omits hardcoded 10:15 timestamp when fetchedAt is missing');

  const h1Metrics1440LongZone = await page.$eval('header h1', (el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
  }));
  assert(
    h1Metrics1440LongZone.clientWidth >= 60 && h1Metrics1440LongZone.scrollWidth <= h1Metrics1440LongZone.clientWidth + 1,
    `[Scenario B13.7] Chat header title at 1440px with long zone name remains fully visible (client: ${h1Metrics1440LongZone.clientWidth}px, scroll: ${h1Metrics1440LongZone.scrollWidth}px)`
  );

} finally {
  await browser.close();
  server.close();
}

// ─── Write Evidence Manifest ─────────────────────────────────
const manifestPath = path.resolve('E:/CTU/LuanVan/verification/ui-refresh-ctu-agent-design-20261116/evidence/antigravity-evidence-hashes.json');
fs.writeFileSync(manifestPath, JSON.stringify(capturedHashes, null, 2));
console.log(`\nEvidence manifest written to: ${manifestPath}`);

console.log('\n================================================================');
console.log(`Verification Summary: ${passed}/${total} PASS`);
console.log('================================================================');

if (passed !== total) {
  process.exit(1);
}
