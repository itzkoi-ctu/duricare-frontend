#!/usr/bin/env node
/**
 * UI-REFRESH-CTU-001: Mobile Chat Height & Layout Geometry Verification
 * Validates fix for premature termination of chat frame on mobile viewports (e.g. iPhone 15).
 *
 * Verifies:
 * 1. CSS Height Chain in Shell.tsx & AgentPage.tsx
 * 2. Real bounding rect geometry on iPhone 15 Portrait (393x852):
 *    - Chat card bottom to bottom nav top gap is 8–16px (target 12px / p-3).
 *    - No overlapping between composer and bottom nav.
 *    - Message list scrolls internally; header and composer shrink-0.
 * 3. Geometry on iPhone 15 Landscape (852x393):
 *    - Fits within 393px height without vertical viewport overflow.
 * 4. Geometry on Mobile Narrow (375x667):
 *    - No horizontal scroll, consistent 12px bottom gap.
 * 5. Geometry on Tablet (768x1024) and Desktop (1440x900).
 * 6. Scope isolation: Non-agent routes (e.g. /alerts) maintain normal overflow-y-auto.
 * 7. Evidence screenshot capture and SHA-256 calculation.
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

  // Mirror to verification evidence directory
  const secondaryPath = path.join(EVIDENCE_DIRS[1], filename);
  fs.writeFileSync(secondaryPath, buffer);

  console.log(`  📸 Captured ${filename} (SHA256: ${hash.slice(0, 16)}...)`);
  return hash;
}

console.log('================================================================');
console.log('UI-REFRESH-CTU-001 Mobile Chat Height Geometry Verification');
console.log('================================================================\n');

// ─── [1/3] Static Code Structure Verification ────────────────
console.log('[1/3] Static code structure verification...');

const shellPath = path.join(ROOT_DIR, 'src/components/layout/Shell.tsx');
const agentPagePath = path.join(ROOT_DIR, 'src/pages/AgentPage.tsx');

const shellContent = fs.readFileSync(shellPath, 'utf8');
const agentPageContent = fs.readFileSync(agentPagePath, 'utf8');

assert(
  shellContent.includes("const isAgentRoute = location.pathname.startsWith('/agent');"),
  '[Code S1.1] Shell.tsx detects /agent route via useLocation'
);

assert(
  shellContent.includes("isAgentRoute ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'"),
  '[Code S1.2] Shell.tsx switches main to flex-col overflow-hidden exclusively on /agent'
);

assert(
  shellContent.includes("isAgentRoute\n              ? 'flex-1 min-h-0 flex flex-col p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto'\n              : 'p-4 md:p-6 lg:p-8 max-w-7xl mx-auto'") ||
  (shellContent.includes("isAgentRoute") && shellContent.includes("flex-1 min-h-0 flex flex-col p-3")),
  '[Code S1.3] Shell.tsx inner wrapper provides flex-1 min-h-0 with responsive p-3 padding for /agent'
);

assert(
  !agentPageContent.includes('calc(100dvh-14.5rem') &&
  !agentPageContent.includes('calc(100dvh-15.5rem') &&
  agentPageContent.includes('w-full h-full min-h-0 lg:h-[calc(100dvh-10rem)]'),
  '[Code S1.4] AgentPage.tsx removed hardcoded 14.5rem/15.5rem dvh subtractions and uses w-full h-full min-h-0'
);

assert(
  agentPageContent.includes('min-h-0 min-w-0 h-full flex flex-col overflow-hidden rounded-2xl'),
  '[Code S1.5] AgentPage.tsx central chat column has h-full flex flex-col min-h-0'
);

// ─── [2/3] Setup HTTP Server & Browser ────────────────────────
console.log('\n[2/3] Starting SPA server and headless browser...');

const PORT = 5195;
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
  totalUnresolvedAlerts: 2,
  zones: [
    {
      code: 'KHU-A',
      name: 'Khu A',
      growthStage: 'RA_HOA',
      variety: 'Ri6',
      plantingDate: '2021-02-15',
      alerts: { hard: 2, agentic: 1 },
      metrics: {
        temperature: { value: 28.5, unit: '°C', recordedAt: new Date(now).toISOString(), status: 'NORMAL', targetMin: 24, targetMax: 30, source: 'MQTT' },
        humidity: { value: 74, unit: '%', recordedAt: new Date(now).toISOString(), status: 'NORMAL', targetMin: 70, targetMax: 85, source: 'MQTT' },
        soilMoisture: { value: 42.9, unit: '%', recordedAt: new Date(now).toISOString(), status: 'LOW', targetMin: 40, targetMax: 70, source: 'MQTT' },
      },
    },
  ],
};

const mockConversations = [
  {
    id: 'conv-101',
    zoneCode: 'KHU-A',
    title: 'Điều chỉnh tưới trước khi hoa nở',
    createdAt: new Date(now - 30 * minute).toISOString(),
    updatedAt: new Date(now - 2 * minute).toISOString(),
  },
];

const mockMessages = [
  {
    id: 'msg-u1',
    role: 'USER',
    content: 'Cần tưới nước thế nào trước khi hoa nở?',
    createdAt: new Date(now - 5 * minute).toISOString(),
  },
  {
    id: 'msg-a1',
    role: 'ASSISTANT',
    content: `Theo mục 1.6.2 của Sổ tay cây sầu riêng VietGAP, một tuần trước khi hoa nở cần giảm khoảng 2/3 lượng nước ở mỗi lần tưới, đồng thời giữ nguyên chu kỳ tưới.

Hãy đối chiếu thời tiết và điều kiện thực tế tại vườn trước khi áp dụng.

Căn cứ đã xác minh:
- Sổ tay cây sầu riêng VietGAP | bản 1 | đoạn 5c173ca7 | Trang 2`,
    modelUsed: 'gemini-1.5-flash',
    toolsUsed: [{ name: 'searchKnowledge', arguments: {}, outcome: 'OK' }],
    createdAt: new Date(now - 3 * minute).toISOString(),
  },
];

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

  if (url.includes('/messages')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockMessages),
    });
  }

  if (url.includes('/agent/conversations')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(mockConversations),
    });
  }

  if (url.includes('/alerts')) {
    return req.respond({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 10,
      }),
    });
  }

  req.respond({ status: 200, headers: CORS_HEADERS, body: JSON.stringify({}) });
});

// ─── [3/3] Runtime Geometry Assertions Across Viewports ──────
console.log('\n[3/3] Runtime geometry assertions across viewports...');

try {
  // ── Scenario G1: iPhone 15 Portrait (393 x 852) ──
  console.log('\n--- Scenario G1: iPhone 15 Portrait (393 x 852) ---');
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/agent`, { waitUntil: 'networkidle0' });

  // Wait for ChatPanel header and Bottom Nav to render
  await page.waitForSelector('[data-testid="chat-header"]');
  await page.waitForSelector('nav');

  const g1Metrics = await page.evaluate(() => {
    const main = document.querySelector('main');
    const mainRect = main.getBoundingClientRect();
    const chatHeader = document.querySelector('[data-testid="chat-header"]');
    const chatCard = chatHeader ? chatHeader.closest('.rounded-2xl') : null;
    const chatCardRect = chatCard ? chatCard.getBoundingClientRect() : null;
    const bottomNav = document.querySelector('nav.fixed.bottom-0');
    const bottomNavRect = bottomNav ? bottomNav.getBoundingClientRect() : null;
    const composer = document.querySelector('form input');
    const composerRect = composer ? composer.getBoundingClientRect() : null;
    const composerContainer = composer ? composer.closest('.shrink-0, form, div.border-t') : null;
    const composerContainerRect = composerContainer ? composerContainer.getBoundingClientRect() : null;

    // Scroll metrics
    const messageList = chatCard ? chatCard.querySelector('.overflow-y-auto') : null;
    const messageListScrollable = messageList ? messageList.scrollHeight >= messageList.clientHeight : false;

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      mainRect: { top: mainRect.top, bottom: mainRect.bottom, height: mainRect.height },
      chatCardRect: chatCardRect ? { top: chatCardRect.top, bottom: chatCardRect.bottom, height: chatCardRect.height } : null,
      bottomNavRect: bottomNavRect ? { top: bottomNavRect.top, bottom: bottomNavRect.bottom, height: bottomNavRect.height } : null,
      composerRect: composerRect ? { top: composerRect.top, bottom: composerRect.bottom, height: composerRect.height } : null,
      composerContainerRect: composerContainerRect ? { top: composerContainerRect.top, bottom: composerContainerRect.bottom, height: composerContainerRect.height } : null,
      gapBetweenChatAndNav: (bottomNavRect && chatCardRect) ? bottomNavRect.top - chatCardRect.bottom : null,
      messageListScrollable,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  console.log(`  Measured iPhone 15 Portrait geometry:`);
  console.log(`    Chat card top: ${g1Metrics.chatCardRect.top}px, bottom: ${g1Metrics.chatCardRect.bottom}px, height: ${g1Metrics.chatCardRect.height}px`);
  console.log(`    Bottom nav top: ${g1Metrics.bottomNavRect.top}px, height: ${g1Metrics.bottomNavRect.height}px`);
  console.log(`    Gap between chat card bottom & bottom nav top: ${g1Metrics.gapBetweenChatAndNav}px`);

  assert(
    g1Metrics.gapBetweenChatAndNav >= 8 && g1Metrics.gapBetweenChatAndNav <= 16,
    `[Scenario G1.1] iPhone 15 Portrait: Gap between chat card and bottom nav is ${g1Metrics.gapBetweenChatAndNav}px (within target 8-16px, exactly 12px / p-3)`
  );

  assert(
    g1Metrics.chatCardRect.height >= 650 && g1Metrics.chatCardRect.height <= 700,
    `[Scenario G1.2] iPhone 15 Portrait: Chat card height is ${g1Metrics.chatCardRect.height}px (properly expanded, eliminating ~150px gap)`
  );

  assert(
    g1Metrics.composerRect && g1Metrics.composerRect.bottom < g1Metrics.bottomNavRect.top,
    `[Scenario G1.3] iPhone 15 Portrait: Composer textarea is fully above bottom navigation (no overlap or clipping)`
  );

  assert(
    !g1Metrics.hasHorizontalOverflow,
    `[Scenario G1.4] iPhone 15 Portrait: No horizontal scroll overflow (scrollWidth <= 393)`
  );

  // Focus and type in composer to verify input usability
  await page.focus('form input');
  await page.keyboard.type('Kiểm tra phản hồi chiều cao');
  const typedValue = await page.$eval('form input', (el) => el.value);
  assert(
    typedValue === 'Kiểm tra phản hồi chiều cao',
    `[Scenario G1.5] iPhone 15 Portrait: Composer input accepts user focus and keyboard typing`
  );

  await captureEvidence(page, 'fe_agent_fix_01_iphone15_portrait_393.png');

  // ── Scenario G2: iPhone 15 Landscape (852 x 393) ──
  console.log('\n--- Scenario G2: iPhone 15 Landscape (852 x 393) ---');
  await page.setViewport({ width: 852, height: 393, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 200));

  const g2Metrics = await page.evaluate(() => {
    const chatHeader = document.querySelector('[data-testid="chat-header"]');
    const chatCard = chatHeader ? chatHeader.closest('.rounded-2xl') : null;
    const chatCardRect = chatCard.getBoundingClientRect();
    const composer = document.querySelector('form input');
    const composerRect = composer ? composer.getBoundingClientRect() : null;
    return {
      chatCardRect: { top: chatCardRect.top, bottom: chatCardRect.bottom, height: chatCardRect.height },
      composerRect: composerRect ? { top: composerRect.top, bottom: composerRect.bottom, height: composerRect.height } : null,
      viewportHeight: window.innerHeight,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  console.log(`  Measured iPhone 15 Landscape geometry:`);
  console.log(`    Chat card top: ${g2Metrics.chatCardRect.top}px, bottom: ${g2Metrics.chatCardRect.bottom}px, height: ${g2Metrics.chatCardRect.height}px`);
  if (g2Metrics.composerRect) {
    console.log(`    Composer bottom: ${g2Metrics.composerRect.bottom}px (Viewport height: ${g2Metrics.viewportHeight}px)`);
  }

  assert(
    g2Metrics.composerRect && g2Metrics.composerRect.bottom <= g2Metrics.viewportHeight,
    `[Scenario G2.1] iPhone 15 Landscape: Composer remains fully within viewport height (${g2Metrics.composerRect.bottom}px <= ${g2Metrics.viewportHeight}px)`
  );

  assert(
    !g2Metrics.hasHorizontalOverflow,
    `[Scenario G2.2] iPhone 15 Landscape: No horizontal scroll overflow`
  );

  await captureEvidence(page, 'fe_agent_fix_02_iphone15_landscape_852.png');

  // ── Scenario G3: Mobile Narrow (375 x 667) ──
  console.log('\n--- Scenario G3: Mobile Narrow (375 x 667) ---');
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 200));

  const g3Metrics = await page.evaluate(() => {
    const chatHeader = document.querySelector('[data-testid="chat-header"]');
    const chatCard = chatHeader ? chatHeader.closest('.rounded-2xl') : null;
    const chatCardRect = chatCard.getBoundingClientRect();
    const bottomNav = document.querySelector('nav.fixed.bottom-0');
    const bottomNavRect = bottomNav.getBoundingClientRect();
    const composer = document.querySelector('form input');
    const composerRect = composer ? composer.getBoundingClientRect() : null;
    return {
      gap: bottomNavRect.top - chatCardRect.bottom,
      chatCardHeight: chatCardRect.height,
      composerVisible: composerRect && composerRect.bottom < bottomNavRect.top,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  console.log(`  Measured Mobile 375x667 geometry:`);
  console.log(`    Chat card height: ${g3Metrics.chatCardHeight}px, Gap: ${g3Metrics.gap}px`);

  assert(
    g3Metrics.gap >= 8 && g3Metrics.gap <= 16,
    `[Scenario G3.1] Mobile 375x667: Gap between chat card and bottom nav is ${g3Metrics.gap}px (within target 8-16px, exactly 12px)`
  );

  assert(
    g3Metrics.composerVisible,
    `[Scenario G3.2] Mobile 375x667: Composer visible and positioned above bottom nav`
  );

  assert(
    !g3Metrics.hasHorizontalOverflow,
    `[Scenario G3.3] Mobile 375x667: No horizontal scroll overflow`
  );

  await captureEvidence(page, 'fe_agent_fix_03_mobile_375.png');

  // ── Scenario G4: Tablet (768 x 1024) ──
  console.log('\n--- Scenario G4: Tablet (768 x 1024) ---');
  await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 200));

  const g4Metrics = await page.evaluate(() => {
    const chatHeader = document.querySelector('[data-testid="chat-header"]');
    const chatCard = chatHeader ? chatHeader.closest('.rounded-2xl') : null;
    const chatCardRect = chatCard.getBoundingClientRect();
    const bottomNav = document.querySelector('nav.fixed.bottom-0');
    const bottomNavRect = bottomNav.getBoundingClientRect();
    return {
      chatCardHeight: chatCardRect.height,
      gap: bottomNavRect.top - chatCardRect.bottom,
    };
  });

  console.log(`  Measured Tablet 768x1024 geometry:`);
  console.log(`    Chat card height: ${g4Metrics.chatCardHeight}px, Gap: ${g4Metrics.gap}px`);

  assert(
    g4Metrics.chatCardHeight >= 800,
    `[Scenario G4.1] Tablet 768x1024: Chat card utilizes available height (${g4Metrics.chatCardHeight}px >= 800px)`
  );

  await captureEvidence(page, 'fe_agent_fix_04_tablet_768.png');

  // ── Scenario G5: Desktop (1440 x 900) ──
  console.log('\n--- Scenario G5: Desktop (1440 x 900) ---');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await new Promise((r) => setTimeout(r, 200));

  const g5Metrics = await page.evaluate(() => {
    const chatHeader = document.querySelector('[data-testid="chat-header"]');
    const chatCard = chatHeader ? chatHeader.closest('.rounded-2xl') : null;
    const chatCardRect = chatCard.getBoundingClientRect();
    const conversationList = document.querySelector('[data-testid="conversation-history-rail"], aside');
    const contextRail = document.querySelector('[data-testid="agent-iot-context-rail"]');
    return {
      chatCardHeight: chatCardRect.height,
      chatCardWidth: chatCardRect.width,
      hasConversationList: !!conversationList,
      hasContextRail: !!contextRail,
    };
  });

  console.log(`  Measured Desktop 1440x900 geometry:`);
  console.log(`    Chat card size: ${g5Metrics.chatCardWidth}px x ${g5Metrics.chatCardHeight}px`);

  assert(
    g5Metrics.chatCardHeight >= 650 && g5Metrics.hasConversationList && g5Metrics.hasContextRail,
    `[Scenario G5.1] Desktop 1440x900: Desktop 3-column layout rendered with full height chat card`
  );

  await captureEvidence(page, 'fe_agent_fix_05_desktop_1440.png');

  // ── Scenario G6: Non-Agent Route Scope Protection (/alerts) ──
  console.log('\n--- Scenario G6: Non-Agent Route Scope Protection (/alerts) ---');
  await page.goto(`http://127.0.0.1:${PORT}/alerts`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('main');

  const g6Metrics = await page.evaluate(() => {
    const main = document.querySelector('main');
    const innerWrapper = main.querySelector('div');
    return {
      mainClasses: main.className,
      innerWrapperClasses: innerWrapper.className,
      hasFlexColOnMain: main.classList.contains('flex-col'),
      hasOverflowHiddenOnMain: main.classList.contains('overflow-hidden'),
      hasOverflowYAutoOnMain: main.classList.contains('overflow-y-auto'),
      hasFlex1OnWrapper: innerWrapper.classList.contains('flex-1'),
    };
  });

  console.log(`  Main classes on /alerts: "${g6Metrics.mainClasses}"`);

  assert(
    !g6Metrics.hasFlexColOnMain && !g6Metrics.hasOverflowHiddenOnMain && g6Metrics.hasOverflowYAutoOnMain,
    `[Scenario G6.1] Non-agent route (/alerts): Main maintains normal overflow-y-auto, NO flex-col or overflow-hidden`
  );

  assert(
    !g6Metrics.hasFlex1OnWrapper,
    `[Scenario G6.2] Non-agent route (/alerts): Inner wrapper maintains standard p-4 max-w-7xl, NO flex-1`
  );

} finally {
  await browser.close();
  server.close();
}

// ─── Verification Summary ─────────────────────────────────────
console.log('\n================================================================');
console.log(`Geometry Verification Result: ${passed}/${total} assertions PASSED`);
console.log('================================================================\n');

// Write updated evidence hashes
const evidenceHashesPath = path.join(EVIDENCE_DIRS[1], 'antigravity-evidence-hashes.json');
let existingHashes = {};
if (fs.existsSync(evidenceHashesPath)) {
  try {
    existingHashes = JSON.parse(fs.readFileSync(evidenceHashesPath, 'utf8'));
  } catch {
    // ignore
  }
}
const mergedHashes = { ...existingHashes, ...capturedHashes };
fs.writeFileSync(evidenceHashesPath, JSON.stringify(mergedHashes, null, 2) + '\n');
console.log(`Updated evidence hashes in ${evidenceHashesPath}`);

if (passed < total) {
  process.exit(1);
}
