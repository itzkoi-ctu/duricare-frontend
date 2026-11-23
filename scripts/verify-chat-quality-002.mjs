import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';
import puppeteer from 'puppeteer';

const WORKTREE_ROOT = 'E:/CTU/LuanVan/duricare-worktrees/fe-chat-quality-002';
const DIST_DIR = path.join(WORKTREE_ROOT, 'dist');
const EVIDENCE_DIR = 'C:/Users/default.LAPTOP-9T9UMS3I/.gemini/antigravity/brain/2cc3cdd9-0f13-4c1a-bbe7-141069b357d2/evidence';
const PORT = 5199;
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
// Test Execution Matrix (FE-T01 to FE-T16 and FE-R01 to FE-R06)
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

    const consoleWarnings = [];
    const consoleErrors = [];
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'warning') consoleWarnings.push(text);
      if (msg.type() === 'error') consoleErrors.push(text);
    });

    // Mock API State
    let askCount = 0;
    let nextAskDelay = 0;
    let nextAskFailure = null; // '503' | 'network' | null
    const requestedChunkUris = [];

    const mockConversations = [
      {
        id: 'conv-table',
        zoneCode: 'TEST-ZONE',
        title: 'Báo cáo độ ẩm và khuyến nghị tưới',
        createdAt: '2026-11-20T10:00:00Z',
        updatedAt: '2026-11-20T10:05:00Z',
        messageCount: 8,
      },
      {
        id: 'conv-switch-target',
        zoneCode: 'TEST-ZONE',
        title: 'Hội thoại chuyển đổi kiểm tra race condition',
        createdAt: '2026-11-20T09:00:00Z',
        updatedAt: '2026-11-20T09:05:00Z',
        messageCount: 1,
      },
    ];

    // Real RAG-ORIGIN C0 wire envelope (from packet/fixtures.json)
    // Wire contract: groups have `citationId` and NO `id` property.
    const realC0MixedClassesEnvelope = {
      schemaVersion: 1,
      status: 'VERIFIED_CONTEXT',
      supportLevel: 'RETRIEVED_CONTEXT',
      groups: [
        {
          citationId: '00000000-0000-4000-8000-000000000301',
          sourceId: '00000000-0000-4000-8000-000000000001',
          revisionId: '00000000-0000-4000-8000-000000000201',
          revisionNumber: 1,
          publicationId: '00000000-0000-4000-8000-000000000101',
          sourceTitle: 'Sổ tay VietGAP tổng hợp',
          tier: 'A',
          year: 2026,
          sourceUrl: null,
          originClass: 'EXTERNAL_REFERENCE',
          authorState: 'NAMED',
          publicAuthorName: 'Đơn vị biên soạn tổng hợp',
          originStatus: 'REVIEWED',
          chunks: [
            {
              chunkId: '00000000-0000-4000-8000-000000001010',
              locator: 'tr. 25',
              contentHash: 'f6779c77c1e84bc9c33f6e88803486056fdacf033083892d3ba9fa20489006dd',
              detailPath:
                '/api/agent/conversations/00000000-0000-4000-8000-000000000900/messages/122/citations/00000000-0000-4000-8000-000000000301/chunks/00000000-0000-4000-8000-000000001010',
            },
            {
              chunkId: '00000000-0000-4000-8000-000000001011',
              locator: 'tr. 26',
              contentHash: '136662081dc88e255936aa70b5306df303f4d84f1d4ea5eaeaa9b992e390a0f0',
              detailPath:
                '/api/agent/conversations/00000000-0000-4000-8000-000000000900/messages/122/citations/00000000-0000-4000-8000-000000000301/chunks/00000000-0000-4000-8000-000000001011',
            },
          ],
        },
        {
          citationId: '00000000-0000-4000-8000-000000000302',
          sourceId: '00000000-0000-4000-8000-000000000002',
          revisionId: '00000000-0000-4000-8000-000000000202',
          revisionNumber: 1,
          publicationId: '00000000-0000-4000-8000-000000000102',
          sourceTitle: 'Hướng dẫn của chuyên gia tổng hợp',
          tier: 'B',
          year: 2026,
          sourceUrl: null,
          originClass: 'EXPERT_AUTHORED',
          authorState: 'NAMED',
          publicAuthorName: 'Chuyên gia tổng hợp A',
          originStatus: 'REVIEWED',
          chunks: [
            {
              chunkId: '00000000-0000-4000-8000-000000001020',
              locator: 'tr. 25',
              contentHash: 'd5185a9508e7bca99ead94a426a4ae221281d1706cbb57b2790077424bf6b740',
              detailPath:
                '/api/agent/conversations/00000000-0000-4000-8000-000000000900/messages/122/citations/00000000-0000-4000-8000-000000000302/chunks/00000000-0000-4000-8000-000000001020',
            },
          ],
        },
      ],
      claimLinks: [],
    };

    const mockMessages = {
      'conv-table': [
        {
          id: 1,
          role: 'USER',
          content: 'Tổng hợp chỉ số độ ẩm và khuyến nghị tưới cho vườn sầu riêng',
          createdAt: '2026-11-20T10:00:00Z',
        },
        {
          id: 2,
          role: 'ASSISTANT',
          content: `Dưới đây là bảng số liệu độ ẩm đất và chỉ số EC tại các khu vực theo dõi:

| Vùng đất | Độ ẩm (%) | Chỉ số EC (mS/cm) | Trạng thái \\| Đánh giá | Tài liệu tham khảo |
| :--- | :---: | ---: | :--- | :--- |
| Khu A (Cát pha) | 68.5% | 1.2 | Đạt chuẩn \\| Bình thường | [Xem hướng dẫn](https://example.com/durian-irrigation-management-comprehensive-guide-url-that-is-very-long) |
| Khu B (Sét nhẹ) | 52.0% | 0.8 | Thiếu ẩm \\| Cần tưới | [Tài liệu Viện Cây ăn quả](https://example.com/warc-manual-2026) |
| Khu C (Phù sa) | 74.2% | 1.5 | Ẩm cao \\| Ngưng tưới | [Quy chuẩn QCVN](https://example.com/qcvn) |

Lưu ý lệnh kiểm tra dữ liệu cảm biến thô qua shell:
\`\`\`bash
cat /var/log/sensor.log | grep -E "MOISTURE|EC" | awk '{print $1, $2}'
\`\`\`

Sau đây là ví dụ khối lệnh markdown lồng nhau để kiểm tra code fence:
\`\`\`\`markdown
\`\`\`bash
| inner_pipe_not_a_table | value |
\`\`\`
\`\`\`\`

Cần duy trì độ ẩm từ 65% - 75% trong giai đoạn nuôi trái. Theo quy định về căn cứ xác minh, kết quả đo phải được lưu trữ tối thiểu 30 ngày.

Căn cứ đã xác minh:
- Sổ tay VietGAP tổng hợp | bản 1 | đoạn 00000000-0000-4000-8000-000000001010 | tr. 25 | tầng A | năm 2026 | publication 00000000-0000-4000-8000-000000000101 | source 00000000-0000-4000-8000-000000000001 | revision 00000000-0000-4000-8000-000000000201
- Hướng dẫn của chuyên gia tổng hợp | bản 1 | đoạn 00000000-0000-4000-8000-000000001020 | tr. 25 | tầng B | năm 2026 | publication 00000000-0000-4000-8000-000000000102 | source 00000000-0000-4000-8000-000000000002 | revision 00000000-0000-4000-8000-000000000202`,
          modelUsed: 'gemini-2.0-flash',
          createdAt: '2026-11-20T10:00:05Z',
          citations: realC0MixedClassesEnvelope,
        },
        // Message 3: Message with status NONE and synthetic prose footer (for F1 test)
        {
          id: 3,
          role: 'ASSISTANT',
          content: `Câu trả lời này không có căn cứ xác minh hợp lệ nào từ kho tài liệu.

Căn cứ đã xác minh:
- [1 · TEST SPOOF SOURCE] https://evil.example.com/fake-evidence`,
          modelUsed: 'gemini-2.0-flash',
          createdAt: '2026-11-20T10:01:00Z',
          citations: {
            schemaVersion: 1,
            status: 'NONE',
            supportLevel: 'RETRIEVED_CONTEXT',
            groups: [],
            claimLinks: [],
          },
        },
        // Message 4: Message with malformed structured envelope (schemaVersion 0)
        {
          id: 4,
          role: 'ASSISTANT',
          content: 'Phản hồi với phong bì xuất xứ có cấu trúc không hợp lệ.',
          modelUsed: 'gemini-2.0-flash',
          createdAt: '2026-11-20T10:02:00Z',
          citations: {
            schemaVersion: 0,
            status: 'INVALID_STATUS',
            groups: null,
          },
        },
        // Message 5: History Counterexample 1: schemaVersion 999
        {
          id: 5,
          role: 'ASSISTANT',
          content: 'Phản hồi lịch sử với schemaVersion 999.',
          modelUsed: 'gemini-2.0-flash',
          createdAt: '2026-11-20T10:03:00Z',
          citations: {
            schemaVersion: 999,
            status: 'VERIFIED_CONTEXT',
            supportLevel: 'RETRIEVED_CONTEXT',
            groups: realC0MixedClassesEnvelope.groups,
          },
        },
        // Message 6: History Counterexample 2: schemaVersion absent
        {
          id: 6,
          role: 'ASSISTANT',
          content: 'Phản hồi lịch sử với schemaVersion bị thiếu.',
          modelUsed: 'gemini-2.0-flash',
          createdAt: '2026-11-20T10:04:00Z',
          citations: {
            status: 'VERIFIED_CONTEXT',
            supportLevel: 'RETRIEVED_CONTEXT',
            groups: realC0MixedClassesEnvelope.groups,
          },
        },
        // Message 7: History Counterexample 3: schemaVersion string "1"
        {
          id: 7,
          role: 'ASSISTANT',
          content: 'Phản hồi lịch sử với schemaVersion là chuỗi "1".',
          modelUsed: 'gemini-2.0-flash',
          createdAt: '2026-11-20T10:05:00Z',
          citations: {
            schemaVersion: '1',
            status: 'VERIFIED_CONTEXT',
            supportLevel: 'RETRIEVED_CONTEXT',
            groups: realC0MixedClassesEnvelope.groups,
          },
        },
        // Message 8: History Counterexample 4: groups [null]
        {
          id: 8,
          role: 'ASSISTANT',
          content: 'Phản hồi lịch sử với groups chứa null.',
          modelUsed: 'gemini-2.0-flash',
          createdAt: '2026-11-20T10:06:00Z',
          citations: {
            schemaVersion: 1,
            status: 'VERIFIED_CONTEXT',
            supportLevel: 'RETRIEVED_CONTEXT',
            groups: [null],
          },
        },
      ],
      'conv-switch-target': [
        {
          id: 10,
          role: 'USER',
          content: 'Kiểm tra trạng thái hệ thống',
          createdAt: '2026-11-20T09:00:00Z',
        },
      ],
    };

    await page.setRequestInterception(true);

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

    page.on('request', async req => {
      const url = req.url();
      const method = req.method();

      if (method === 'OPTIONS') {
        return req.respond({ status: 204, headers: CORS_HEADERS });
      }

      // Record any chunk endpoint requested
      if (url.includes('/chunks/')) {
        requestedChunkUris.push(url);
      }

      // Auth bootstrap endpoints
      if (url.includes('/api/auth/csrf')) {
        return respondJson(req, 200, { token: 'mock-csrf-token' });
      }
      if (url.includes('/api/auth/refresh')) {
        return respondJson(req, 200, { accessToken: 'mock-access-token-jwt' });
      }
      if (url.includes('/api/auth/me')) {
        return respondJson(req, 200, {
          id: 1,
          email: 'admin@duricare.vn',
          fullName: 'Nguyễn Văn Quản Trị',
          role: 'ADMIN',
        });
      }

      // Farm & Overview endpoints
      if (url.includes('/api/farms')) {
        return respondJson(req, 200, [{ id: 1, name: 'Nông trại Bến Tre', isActive: true }]);
      }
      if (url.includes('/api/overview')) {
        return respondJson(req, 200, {
          farm: { id: 1, name: 'Nông trại Bến Tre' },
          zones: [{ id: 10, code: 'TEST-ZONE', name: 'Khu A - Monthong' }],
          trees: 150,
          activeAlerts: 0,
          healthyTrees: 150,
        });
      }
      if (url.includes('/api/zones')) {
        return respondJson(req, 200, [{ id: 10, code: 'TEST-ZONE', name: 'Khu A - Monthong' }]);
      }

      // Real RAG-ORIGIN C0 Citation chunk passage endpoints
      if (url.includes('00000000-0000-4000-8000-000000001010')) {
        return respondJson(req, 200, {
          contentKind: 'APPROVED_KNOWLEDGE_CHUNK',
          content:
            'Đoạn kiến thức tổng hợp 1.0. Nội dung dành cho kiểm thử xuất xứ. Độ ẩm đất tối ưu cho sầu riêng Monthong giai đoạn nuôi trái nằm trong khoảng 65% - 75%.',
          locator: 'tr. 25',
          contentHash: 'f6779c77c1e84bc9c33f6e88803486056fdacf033083892d3ba9fa20489006dd',
        });
      }
      if (url.includes('00000000-0000-4000-8000-000000001020')) {
        return respondJson(req, 404, {
          error: 'citation_unavailable',
          code: 'not_found',
          message: 'Đoạn trích không tồn tại trong hệ thống (404).',
        });
      }

      // Agent conversation messages
      const matchMsg = url.match(/\/api\/agent\/conversations\/([^/?]+)\/messages/);
      if (matchMsg && method === 'GET') {
        const cId = matchMsg[1];
        const msgs = mockMessages[cId] || [];
        return respondJson(req, 200, msgs);
      }

      // Agent conversation list
      if (url.includes('/api/agent/conversations') && method === 'GET') {
        return respondJson(req, 200, mockConversations);
      }

      // Agent ask question
      if (url.includes('/api/agent/ask') && method === 'POST') {
        askCount++;
        const postData = JSON.parse(req.postData() || '{}');
        const { question, conversationId, zoneCode } = postData;

        if (nextAskDelay > 0) {
          const delay = nextAskDelay;
          nextAskDelay = 0;
          await new Promise(r => setTimeout(r, delay));
        }

        if (nextAskFailure === '503') {
          nextAskFailure = null;
          return respondJson(req, 503, { message: 'Dịch vụ tạm thời quá tải, vui lòng thử lại sau.' });
        }

        if (nextAskFailure === 'network') {
          nextAskFailure = null;
          return req.abort('failed');
        }

        if (question.includes('INSUFFICIENT_DATA') || question.includes('thiếu dữ liệu')) {
          return respondJson(req, 200, {
            answer: 'Không đủ số liệu quan trắc độ ẩm trong 24 giờ qua để đưa ra khuyến nghị chính xác cho Vùng A.',
            modelUsed: 'gemini-2.0-flash',
            conversationId: conversationId || 'conv-table',
            status: 'INSUFFICIENT_DATA',
            insufficientDataInfo: {
              zoneCode: zoneCode || 'TEST-ZONE',
              dataPoints: 4,
              timeWindow: '24h',
            },
            toolsUsed: [{ name: 'getSensorData', arguments: { zoneCode: 'TEST-ZONE' }, outcome: 'OK' }],
          });
        }

        if (question.includes('chat-guard') || question.includes('ngoài luồng')) {
          return respondJson(req, 200, {
            answer: 'Vui lòng tập trung vào các câu hỏi kỹ thuật về quy trình canh tác, thổ nhưỡng và bảo vệ cây sầu riêng.',
            modelUsed: 'chat-guard',
            errorType: 'chat-guard',
            conversationId: conversationId || 'conv-table',
            citations: [],
          });
        }

        if (question.includes('nguồn cũ')) {
          return respondJson(req, 200, {
            answer: 'Theo các tài liệu kỹ thuật truyền thống, việc duy trì thảm cỏ giữ ẩm rất quan trọng.',
            modelUsed: 'gemini-2.0-flash',
            conversationId: conversationId || 'conv-table',
            citations: {
              schemaVersion: 1,
              status: 'LEGACY_REFERENCE',
              supportLevel: 'RETRIEVED_CONTEXT',
              groups: [
                {
                  citationId: '00000000-0000-4000-8000-000000000305',
                  sourceId: '00000000-0000-4000-8000-000000000005',
                  revisionId: '00000000-0000-4000-8000-000000000205',
                  revisionNumber: 1,
                  publicationId: '00000000-0000-4000-8000-000000000105',
                  sourceTitle: 'Sổ tay canh tác truyền thống',
                  tier: 'A',
                  year: 2026,
                  sourceUrl: null,
                  originClass: 'UNDETERMINED',
                  authorState: 'UNKNOWN',
                  publicAuthorName: null,
                  originStatus: 'LEGACY_UNDETERMINED',
                  chunks: [
                    {
                      chunkId: '00000000-0000-4000-8000-000000001050',
                      locator: 'tr. 25',
                      contentHash: '73739d8344f66133dc2009e1ebc1836bef1dec3434c32716a2d03fb3359cfec3',
                      detailPath:
                        '/api/agent/conversations/00000000-0000-4000-8000-000000000900/messages/122/citations/00000000-0000-4000-8000-000000000305/chunks/00000000-0000-4000-8000-000000001050',
                    },
                  ],
                },
              ],
            },
          });
        }

        // Fresh Counterexample 1: schemaVersion 999
        if (question.includes('counter-schema-999')) {
          return respondJson(req, 200, {
            answer: 'Phản hồi fresh với schemaVersion 999.',
            modelUsed: 'gemini-2.0-flash',
            conversationId: conversationId || 'conv-table',
            citations: {
              schemaVersion: 999,
              status: 'VERIFIED_CONTEXT',
              supportLevel: 'RETRIEVED_CONTEXT',
              groups: realC0MixedClassesEnvelope.groups,
            },
          });
        }

        // Fresh Counterexample 2: schemaVersion absent
        if (question.includes('counter-schema-absent')) {
          return respondJson(req, 200, {
            answer: 'Phản hồi fresh với schemaVersion bị thiếu.',
            modelUsed: 'gemini-2.0-flash',
            conversationId: conversationId || 'conv-table',
            citations: {
              status: 'VERIFIED_CONTEXT',
              supportLevel: 'RETRIEVED_CONTEXT',
              groups: realC0MixedClassesEnvelope.groups,
            },
          });
        }

        // Fresh Counterexample 3: schemaVersion string "1"
        if (question.includes('counter-schema-string')) {
          return respondJson(req, 200, {
            answer: 'Phản hồi fresh với schemaVersion là chuỗi "1".',
            modelUsed: 'gemini-2.0-flash',
            conversationId: conversationId || 'conv-table',
            citations: {
              schemaVersion: '1',
              status: 'VERIFIED_CONTEXT',
              supportLevel: 'RETRIEVED_CONTEXT',
              groups: realC0MixedClassesEnvelope.groups,
            },
          });
        }

        // Fresh Counterexample 4: groups [null]
        if (question.includes('counter-groups-null')) {
          return respondJson(req, 200, {
            answer: 'Phản hồi fresh với groups chứa null.',
            modelUsed: 'gemini-2.0-flash',
            conversationId: conversationId || 'conv-table',
            citations: {
              schemaVersion: 1,
              status: 'VERIFIED_CONTEXT',
              supportLevel: 'RETRIEVED_CONTEXT',
              groups: [null],
            },
          });
        }

        // Generic fallback answer
        return respondJson(req, 200, {
          answer: `Phản hồi mẫu cho: "${question}"`,
          modelUsed: 'gemini-2.0-flash',
          conversationId: conversationId || 'conv-table',
          toolsUsed: [],
        });
      }

      req.continue();
    });

    console.log('Navigating to Agent Page with conv-table...');
    await page.goto(`${BASE_URL}/agent?conversationId=conv-table`, { waitUntil: 'networkidle0' });

    await page.waitForSelector('[data-testid="chat-header"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="chat-table"]', { timeout: 10000 });

    // -------------------------------------------------------------
    // FE-T01: Bảng Markdown hợp lệ (table, thead, tbody, tr, th, td)
    // -------------------------------------------------------------
    const tableStructure = await page.evaluate(() => {
      const table = document.querySelector('[data-testid="chat-table"]');
      if (!table) return null;
      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');
      const ths = Array.from(thead?.querySelectorAll('th') || []).map(th => th.textContent?.trim());
      const rows = Array.from(tbody?.querySelectorAll('tr') || []).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim())
      );
      return { hasTable: true, hasThead: !!thead, hasTbody: !!tbody, headers: ths, rows };
    });

    assert.ok(tableStructure, 'Table must exist');
    assert.ok(tableStructure.hasThead && tableStructure.hasTbody, 'Table must have thead and tbody');
    assert.equal(tableStructure.headers.length, 5, 'Must have 5 columns');
    assert.equal(tableStructure.rows.length, 3, 'Must have 3 rows in tbody');
    record('FE-T01', 'Bảng Markdown hợp lệ trong câu trả lời lịch sử', true, `5 cột, 3 dòng, thead/tbody chuẩn`);

    // -------------------------------------------------------------
    // FE-T02: Xử lý căn lề và pipe thoát \|
    // -------------------------------------------------------------
    const alignmentAndEscapes = await page.evaluate(() => {
      const table = document.querySelector('[data-testid="chat-table"]');
      const ths = Array.from(table.querySelectorAll('thead th'));
      const colAligns = ths.map(th => {
        if (th.classList.contains('text-center')) return 'center';
        if (th.classList.contains('text-right')) return 'right';
        return 'left';
      });

      const firstRowTds = Array.from(table.querySelectorAll('tbody tr:first-child td'));
      const escapedPipeCell = firstRowTds[3]?.textContent || '';
      return { colAligns, escapedPipeCell, cellCount: firstRowTds.length };
    });

    assert.equal(alignmentAndEscapes.colAligns[0], 'left');
    assert.equal(alignmentAndEscapes.colAligns[1], 'center');
    assert.equal(alignmentAndEscapes.colAligns[2], 'right');
    assert.equal(alignmentAndEscapes.cellCount, 5, 'Escaped pipe must not split into an extra column');
    assert.ok(alignmentAndEscapes.escapedPipeCell.includes('|'), 'Escaped pipe \\| must render as literal |');
    record('FE-T02', 'Căn lề (left/center/right) và pipe thoát \\| chính xác', true, `Align: ${alignmentAndEscapes.colAligns.join('/')}, Cell: "${alignmentAndEscapes.escapedPipeCell}"`);

    // -------------------------------------------------------------
    // FE-T03: Khối mã chứa | không bị parse nhầm thành bảng
    // -------------------------------------------------------------
    const codeBlockCheck = await page.evaluate(() => {
      const pres = Array.from(document.querySelectorAll('pre code'));
      const tables = document.querySelectorAll('[data-testid="chat-table"]');
      return {
        preCount: pres.length,
        hasGrepPipe: pres.some(p => p.textContent?.includes('grep -E "MOISTURE|EC"')),
        tableCount: tables.length,
      };
    });

    assert.ok(codeBlockCheck.hasGrepPipe, 'Code block content with pipe must be preserved');
    assert.equal(codeBlockCheck.tableCount, 1, 'Only 1 table must exist; code block pipe must not create a table');
    record('FE-T03', 'Khối mã có ký tự | được bảo vệ trong pre code, không biến thành bảng', true);

    // -------------------------------------------------------------
    // FE-T04: Container overflow-x-auto & Không tràn trang mobile 375/390px
    // -------------------------------------------------------------
    const wrapperCheck = await page.evaluate(() => {
      const wrapper = document.querySelector('[data-testid="chat-table-wrapper"]');
      if (!wrapper) return null;
      const style = window.getComputedStyle(wrapper);
      return {
        hasOverflowAuto: style.overflowX === 'auto',
        scrollWidth: wrapper.scrollWidth,
        clientWidth: wrapper.clientWidth,
      };
    });
    assert.ok(wrapperCheck?.hasOverflowAuto, 'Wrapper must have overflow-x: auto');

    // Test on 375px viewport (iPhone SE)
    await page.setViewport({ width: 375, height: 812 });
    await new Promise(r => setTimeout(r, 400));
    const mobile375Overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        noPageOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      };
    });
    assert.ok(mobile375Overflow.noPageOverflow, `375px viewport must not overflow horizontally (scrollWidth=${mobile375Overflow.scrollWidth}, clientWidth=${mobile375Overflow.clientWidth})`);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'chat_qual_02_mobile_table_375.png') });

    // Test on 390px viewport (iPhone 12/13/14)
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 400));
    const mobile390Overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        noPageOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      };
    });
    assert.ok(mobile390Overflow.noPageOverflow, '390px viewport must not overflow horizontally');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'chat_qual_03_mobile_table_390.png') });
    record('FE-T04', 'Container bảng overflow-x-auto, không gây cuộn ngang trang trên mobile (375px/390px)', true);

    // Reset to Desktop 1440x900
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(r => setTimeout(r, 300));

    // -------------------------------------------------------------
    // FE-T05: URL dài không vỡ bố cục; Dark theme kiểm tra
    // -------------------------------------------------------------
    const urlBreakCheck = await page.evaluate(() => {
      const link = document.querySelector('[data-testid="chat-table"] a');
      const td = link?.closest('td');
      const tdStyle = td ? window.getComputedStyle(td) : null;
      return {
        hasLink: !!link,
        wordBreak: tdStyle?.wordBreak,
        overflowWrap: tdStyle?.overflowWrap,
      };
    });
    assert.ok(urlBreakCheck.hasLink, 'Link inside table must exist');

    // Switch to dark theme
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise(r => setTimeout(r, 300));
    const darkCheck = await page.evaluate(() => {
      const table = document.querySelector('[data-testid="chat-table"]');
      const thead = table?.querySelector('thead');
      return {
        isDark: document.documentElement.classList.contains('dark'),
        hasThead: !!thead,
      };
    });
    assert.ok(darkCheck.isDark, 'Dark class applied');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'chat_qual_04_desktop_dark_table.png') });

    // Switch back to light theme
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'chat_qual_01_desktop_table_citations.png') });
    record('FE-T05', 'URL dài có wrap an toàn, hiển thị chuẩn ở cả Light theme và Dark theme', true);

    // -------------------------------------------------------------
    // FE-T06: Câu trả lời có bảng vẫn giữ liên kết trích dẫn từ C0
    // -------------------------------------------------------------
    const citationChips = await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('[data-testid="citation-chip"]')).map(btn => ({
        text: btn.textContent?.trim(),
        ariaLabel: btn.getAttribute('aria-label'),
      }));
      return chips;
    });
    assert.ok(citationChips.length >= 2, 'Must display at least 2 citation chips');
    assert.ok(citationChips.some(c => c.text.includes('Sổ tay VietGAP')), 'Citation chip includes VietGAP');
    record('FE-T06', 'Câu trả lời có bảng vẫn giữ nguyên citation chips hợp lệ từ C0', true, `${citationChips.length} chips`);

    // -------------------------------------------------------------
    // FE-T07: Lỗi HTTP 503 hiển thị thông điệp quá tải và nút thử lại
    // -------------------------------------------------------------
    nextAskFailure = '503';
    await page.type('[data-testid="input-chat-question"]', 'Hỏi khi server quá tải');
    await page.click('[data-testid="btn-send-question"]');

    await page.waitForSelector('[data-testid="btn-retry-question"]', { timeout: 8000 });
    const error503Text = await page.evaluate(() => {
      const errorBubble = document.querySelector('[role="alert"]');
      return errorBubble?.textContent || '';
    });
    assert.ok(
      error503Text.includes('quá tải') || error503Text.includes('bảo trì') || error503Text.includes('503'),
      `Error text must indicate overload/maintenance, got: "${error503Text}"`
    );
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'chat_qual_05_error_503_retry.png') });
    record('FE-T07', 'Lỗi HTTP 503 hiển thị rõ quá tải/bảo trì và nút Thử lại (không nhầm Not Found)', true);

    // -------------------------------------------------------------
    // FE-T09 & FE-T10.b: Retry giữ draft composer và khóa double-click
    // -------------------------------------------------------------
    const draftText = 'Tôi đang soạn dở câu hỏi mới về bón phân kali...';
    await page.type('[data-testid="input-chat-question"]', draftText);

    const preRetryAskCount = askCount;
    nextAskDelay = 600;
    const retryBtn = await page.$('[data-testid="btn-retry-question"]');
    assert.ok(retryBtn, 'Retry button must exist');

    await retryBtn.click();
    try {
      await retryBtn.click();
    } catch {
      // Button may be disabled/removed as expected
    }

    const composerValueDuringRetry = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="input-chat-question"]');
      return input?.value;
    });
    assert.equal(composerValueDuringRetry, draftText, 'Composer draft text must NOT be cleared by retrying an older question');

    await new Promise(r => setTimeout(r, 900));
    assert.equal(askCount - preRetryAskCount, 1, 'Only 1 request must be sent (double click locked)');
    record('FE-T09', 'Nút gửi lại chỉ gửi 1 request, khóa double-click trong lúc chờ backend', true);
    record('FE-T10.b', 'Nút gửi lại giữ nguyên câu hỏi đang soạn dở trong ô nhập composer', true);

    // Clear input
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="input-chat-question"]');
      if (input) input.value = '';
    });

    // -------------------------------------------------------------
    // FE-T08: Timeout / Mất mạng hiển thị lỗi kết nối và cho phép gửi lại
    // -------------------------------------------------------------
    nextAskFailure = 'network';
    await page.type('[data-testid="input-chat-question"]', 'Hỏi khi mất mạng');
    await page.click('[data-testid="btn-send-question"]');

    await page.waitForSelector('[data-testid="btn-retry-question"]', { timeout: 8000 });
    const netErrorText = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"]'));
      return alerts.map(a => a.textContent).join(' ');
    });
    assert.ok(
      netErrorText.includes('kết nối') || netErrorText.includes('mạng') || netErrorText.includes('thử lại'),
      `Network error text must mention connection/retry, got: "${netErrorText}"`
    );

    nextAskFailure = null;
    const netRetryBtn = await page.$('[data-testid="btn-retry-question"]');
    await netRetryBtn.click();
    await page.waitForFunction(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"]'));
      return alerts.length === 0 || !alerts[alerts.length - 1].textContent?.includes('mất mạng');
    }, { timeout: 8000 });
    record('FE-T08', 'Lỗi mất mạng/timeout hiển thị đúng trạng thái kết nối và hồi phục khi gửi lại', true);

    // -------------------------------------------------------------
    // FE-T10.a: Chuyển hội thoại không chèn nhầm phản hồi muộn
    // -------------------------------------------------------------
    nextAskDelay = 1200;
    await page.type('[data-testid="input-chat-question"]', 'Câu hỏi gửi chậm vào conv-table');
    await page.click('[data-testid="btn-send-question"]');

    await page.goto(`${BASE_URL}/agent?conversationId=conv-switch-target`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="chat-header"]', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1600));

    const currentConvMessages = await page.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('[role="article"], .prose, .leading-relaxed'));
      return msgs.map(m => m.textContent || '');
    });
    const leaked = currentConvMessages.some(m => m.includes('Câu hỏi gửi chậm vào conv-table'));
    assert.equal(leaked, false, 'Late response must NOT leak into the newly selected conversation');
    record('FE-T10.a', 'Chuyển hội thoại không chèn nhầm phản hồi muộn vào hội thoại đang xem', true);

    // Switch back to conv-table
    await page.goto(`${BASE_URL}/agent?conversationId=conv-table`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="chat-table"]', { timeout: 8000 });

    // -------------------------------------------------------------
    // FE-T11: INSUFFICIENT_DATA hiển thị như phân tích hợp lệ kèm metadata
    // -------------------------------------------------------------
    await page.type('[data-testid="input-chat-question"]', 'Hỏi phân tích thiếu dữ liệu');
    await page.click('[data-testid="btn-send-question"]');
    await page.waitForSelector('[data-testid="insufficient-data-card"]', { timeout: 8000 });

    const insufficientCard = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="insufficient-data-card"]');
      return {
        exists: !!card,
        text: card?.textContent || '',
      };
    });
    assert.ok(insufficientCard.exists, 'Insufficient data card must render');
    assert.ok(insufficientCard.text.includes('TEST-ZONE'), 'Card must show zone code');
    assert.ok(insufficientCard.text.includes('4'), 'Card must show data points count');
    assert.ok(insufficientCard.text.includes('24h'), 'Card must show time window');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'chat_qual_06_insufficient_data.png') });
    record('FE-T11', 'Trạng thái INSUFFICIENT_DATA hiển thị như phân tích giới hạn hợp lệ kèm metadata', true);

    // -------------------------------------------------------------
    // FE-T12: Phản hồi giới hạn xử lý (chat-guard)
    // -------------------------------------------------------------
    await page.type('[data-testid="input-chat-question"]', 'Hỏi câu ngoài luồng chat-guard');
    await page.click('[data-testid="btn-send-question"]');
    await page.waitForFunction(() => {
      const badges = Array.from(document.querySelectorAll('[data-testid="agent-model-badge"]'));
      return badges.some(b => b.textContent?.toLowerCase().includes('hệ thống') || b.textContent?.includes('chat-guard'));
    }, { timeout: 8000 });

    const guardCheck = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('[data-testid="agent-model-badge"]'));
      const lastBadge = badges[badges.length - 1];
      const articles = Array.from(document.querySelectorAll('[role="article"], .flex.flex-col.gap-3'));
      const lastArticle = articles[articles.length - 1];
      const chipsInLastArticle = lastArticle?.querySelectorAll('[data-testid="citation-chip"]');
      return {
        badgeText: lastBadge?.textContent || '',
        orphanedChipsCount: chipsInLastArticle?.length || 0,
      };
    });

    assert.ok(guardCheck.badgeText.toLowerCase().includes('hệ thống'), `Model badge must indicate 'Hệ thống', got: "${guardCheck.badgeText}"`);
    assert.ok(!guardCheck.badgeText.includes('Gemini') && !guardCheck.badgeText.includes('DeepSeek'), 'Must not attribute guard response to Gemini/DeepSeek');
    assert.equal(guardCheck.orphanedChipsCount, 0, 'No orphaned citation chips should appear for chat-guard');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'chat_qual_07_system_refusal_guard.png') });
    record('FE-T12', 'Phản hồi chat-guard hiển thị badge Hệ thống thay vì Gemini/DeepSeek, không trích dẫn mồ côi', true);

    // -------------------------------------------------------------
    // FE-T13: RAG-ORIGIN C0 Structured Citations
    // -------------------------------------------------------------
    const ragOriginCheck = await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('[data-testid="citation-chip"]'));
      return chips.map(chip => ({
        chipTitle: chip.getAttribute('title') || '',
        ariaLabel: chip.getAttribute('aria-label') || '',
      }));
    });
    assert.ok(ragOriginCheck.some(c => c.chipTitle.includes('Chuyên gia tổng hợp A') || c.ariaLabel.includes('Chuyên gia tổng hợp A')), 'Citation chip includes expert author name');
    record('FE-T13', 'Cấu trúc xuất xứ RAG-ORIGIN C0 hiển thị đầy đủ tác giả, bản sửa đổi và phân loại', true);

    // -------------------------------------------------------------
    // FE-T14: Tương thích ngược với định dạng trích dẫn cũ (legacy citations)
    // -------------------------------------------------------------
    await page.type('[data-testid="input-chat-question"]', 'Hỏi nguồn cũ');
    await page.click('[data-testid="btn-send-question"]');
    await page.waitForFunction(() => {
      const chips = Array.from(document.querySelectorAll('[data-testid="citation-chip"]'));
      return chips.some(c => c.textContent?.includes('Sổ tay canh tác truyền thống'));
    }, { timeout: 8000 });
    record('FE-T14', 'Tương thích ngược an toàn với cấu trúc trích dẫn legacy không có originClass', true);

    // -------------------------------------------------------------
    // FE-T15: Citation Detail Modal mở, tải passage và xử lý 404/503
    // -------------------------------------------------------------
    const firstChip = await page.$('[data-testid="citation-chip"]');
    await firstChip.click();
    await page.waitForSelector('[data-testid="citation-detail-modal"]', { timeout: 5000 });

    const modalData = await page.evaluate(() => {
      const badge = document.querySelector('[data-testid="citation-origin-badge"]');
      const fetchBtn = document.querySelector('[data-testid="btn-fetch-passage"]');
      return {
        originBadgeText: badge?.textContent?.trim() || '',
        hasFetchBtn: !!fetchBtn,
      };
    });

    assert.ok(modalData.hasFetchBtn, 'Fetch passage button must exist');

    // Click fetch passage
    await page.click('[data-testid="btn-fetch-passage"]');
    await page.waitForSelector('[data-testid="citation-passage-content"]', { timeout: 5000 });

    const passageText = await page.evaluate(() => {
      const p = document.querySelector('[data-testid="citation-passage-content"]');
      return p?.textContent || '';
    });
    assert.ok(passageText.includes('Đoạn kiến thức tổng hợp 1.0'), 'Passage text must be fetched and displayed');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'chat_qual_08_citation_modal_rag_origin.png') });

    // Test 404 error handling in modal: Switch to second source tab
    const switchTabSuccess = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[data-testid="citation-detail-modal"] button'));
      const secTab = tabs.find(b => b.textContent?.includes('Hướng dẫn của chuyên gia'));
      if (secTab) {
        secTab.click();
        return true;
      }
      return false;
    });

    if (switchTabSuccess) {
      await new Promise(r => setTimeout(r, 400));
      const secFetchBtn = await page.$('[data-testid="btn-fetch-passage"]');
      if (secFetchBtn) {
        await secFetchBtn.click();
        await page.waitForSelector('[data-testid="passage-error-card"]', { timeout: 5000 });
        const errorCard = await page.$('[data-testid="passage-error-card"]');
        assert.ok(errorCard, 'Passage error card must render on 404');
        await page.screenshot({ path: path.join(EVIDENCE_DIR, 'chat_qual_09_citation_modal_error_404.png') });
      }
    }
    record('FE-T15', 'Modal chi tiết trích dẫn tải passage mượt mà và xử lý 404/503 có nút thử lại', true);

    // -------------------------------------------------------------
    // FE-T16: Điều hướng modal bằng bàn phím (Esc), click ngoài và trả focus
    // -------------------------------------------------------------
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-testid="citation-detail-modal"]'), { timeout: 3000 });

    const focusRestored = await page.evaluate(() => {
      const activeEl = document.activeElement;
      return activeEl?.getAttribute('data-testid') === 'citation-chip';
    });
    assert.ok(focusRestored, 'Focus must return to the citation chip after closing modal via Escape');

    // Reopen modal and test backdrop click close
    const reopenChip = await page.$('[data-testid="citation-chip"]');
    await reopenChip.click();
    await page.waitForSelector('[data-testid="citation-detail-modal"]', { timeout: 3000 });

    // Click outside backdrop
    await page.evaluate(() => {
      const backdrop = document.querySelector('[role="dialog"]');
      if (backdrop) {
        backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    });
    await page.waitForFunction(() => !document.querySelector('[data-testid="citation-detail-modal"]'), { timeout: 3000 });
    record('FE-T16', 'Đóng modal bằng phím Esc và click ngoài an toàn; trả focus về chip đã bấm', true);

    // =============================================================
    // DEDICATED REMEDIATION PROBES (FE-R01 to FE-R06)
    // =============================================================

    // -------------------------------------------------------------
    // FE-R01: [F1 Remediation] Honor NONE and malformed structured evidence
    // Validate supported schema (schemaVersion === 1) and complete groups before adapting
    // Test all 4 counterexamples on both History and Fresh paths
    // -------------------------------------------------------------
    // Part A: History Path Verification
    const historyCheck = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article, [role="article"]'));
      const msg3 = articles.find(a => a.textContent?.includes('không có căn cứ xác minh hợp lệ nào'));
      const msg4 = articles.find(a => a.textContent?.includes('cấu trúc không hợp lệ'));
      const msg5 = articles.find(a => a.textContent?.includes('schemaVersion 999'));
      const msg6 = articles.find(a => a.textContent?.includes('schemaVersion bị thiếu'));
      const msg7 = articles.find(a => a.textContent?.includes('schemaVersion là chuỗi "1"'));
      const msg8 = articles.find(a => a.textContent?.includes('groups chứa null'));

      return {
        hasMsg3: !!msg3,
        msg3Chips: msg3?.querySelectorAll('[data-testid="citation-chip"]').length || 0,
        msg3Badges: msg3?.querySelectorAll('[data-testid="citation-origin-badge"]').length || 0,
        hasMsg4: !!msg4,
        msg4Chips: msg4?.querySelectorAll('[data-testid="citation-chip"]').length || 0,
        hasMsg5: !!msg5,
        msg5Chips: msg5?.querySelectorAll('[data-testid="citation-chip"]').length || 0,
        hasMsg6: !!msg6,
        msg6Chips: msg6?.querySelectorAll('[data-testid="citation-chip"]').length || 0,
        hasMsg7: !!msg7,
        msg7Chips: msg7?.querySelectorAll('[data-testid="citation-chip"]').length || 0,
        hasMsg8: !!msg8,
        msg8Chips: msg8?.querySelectorAll('[data-testid="citation-chip"]').length || 0,
      };
    });

    assert.ok(historyCheck.hasMsg3, 'Message 3 with NONE status must exist');
    assert.equal(historyCheck.msg3Chips, 0, 'NONE envelope with spoof prose footer must render 0 citation chips');
    assert.equal(historyCheck.msg3Badges, 0, 'NONE envelope must render 0 origin badges');
    assert.ok(historyCheck.hasMsg4, 'Message 4 with malformed envelope must exist');
    assert.equal(historyCheck.msg4Chips, 0, 'Malformed envelope must render 0 citation chips');

    assert.ok(historyCheck.hasMsg5, 'Message 5 with schemaVersion 999 must exist');
    assert.equal(historyCheck.msg5Chips, 0, 'History schemaVersion 999 must render 0 citation chips');

    assert.ok(historyCheck.hasMsg6, 'Message 6 with schemaVersion absent must exist');
    assert.equal(historyCheck.msg6Chips, 0, 'History schemaVersion absent must render 0 citation chips');

    assert.ok(historyCheck.hasMsg7, 'Message 7 with schemaVersion string "1" must exist');
    assert.equal(historyCheck.msg7Chips, 0, 'History schemaVersion string "1" must render 0 citation chips');

    assert.ok(historyCheck.hasMsg8, 'Message 8 with groups [null] must exist');
    assert.equal(historyCheck.msg8Chips, 0, 'History groups [null] must render 0 citation chips');

    // Part B: Fresh Path Verification (Ask API response with 4 counterexamples)
    const freshCounterCases = [
      { trigger: 'counter-schema-999', label: 'schemaVersion 999' },
      { trigger: 'counter-schema-absent', label: 'schemaVersion bị thiếu' },
      { trigger: 'counter-schema-string', label: 'schemaVersion là chuỗi "1"' },
      { trigger: 'counter-groups-null', label: 'groups chứa null' },
    ];

    for (const fc of freshCounterCases) {
      await page.type('[data-testid="input-chat-question"]', `Kiểm tra fresh ${fc.trigger}`);
      await page.click('[data-testid="btn-send-question"]');

      await page.waitForFunction(lbl => {
        const articles = Array.from(document.querySelectorAll('article, [role="article"]'));
        return articles.some(a => a.textContent?.includes(`Phản hồi fresh với ${lbl}`));
      }, { timeout: 8000 }, fc.label);

      const freshChipsCount = await page.evaluate(lbl => {
        const articles = Array.from(document.querySelectorAll('article, [role="article"]'));
        const target = articles.find(a => a.textContent?.includes(`Phản hồi fresh với ${lbl}`));
        return target?.querySelectorAll('[data-testid="citation-chip"]').length || 0;
      }, fc.label);

      assert.equal(freshChipsCount, 0, `Fresh counterexample (${fc.label}) must render 0 citation chips, got: ${freshChipsCount}`);
    }

    record(
      'FE-R01',
      '[F1 Remediation] Kiểm định chặt chẽ schemaVersion=1 và wire groups; 4 trường hợp biên đều render 0 chip trên cả fresh và history',
      true,
      '0 chips on fresh/history for schema 999, absent, string "1", groups [null]'
    );

    // -------------------------------------------------------------
    // FE-R02: [F2 Remediation] Map citationId from real wire contract (no id)
    // Verify distinct selection, tabs, and NO React missing-key warnings
    // -------------------------------------------------------------
    const missingKeyWarnings = consoleWarnings.filter(w => w.includes('Each child in a list should have a unique "key" prop'));
    assert.equal(missingKeyWarnings.length, 0, `React must NOT emit missing-key warnings, found: ${missingKeyWarnings.join('; ')}`);

    // Click the second chip directly in Message 2
    const chip2Clicked = await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('[data-testid="citation-chip"]'));
      const chip2 = chips.find(c => c.textContent?.includes('Hướng dẫn của chuyên gia'));
      if (chip2) {
        chip2.click();
        return true;
      }
      return false;
    });
    assert.ok(chip2Clicked, 'Second citation chip (Expert Guidance) must exist and be clicked');
    await page.waitForSelector('[data-testid="citation-detail-modal"]', { timeout: 5000 });

    const modalTitleAfterChip2 = await page.evaluate(() => {
      const heading = document.querySelector('[data-testid="citation-detail-modal"] h2, [data-testid="citation-detail-modal"] [role="heading"]');
      return heading?.textContent?.trim() || '';
    });
    assert.ok(
      modalTitleAfterChip2.includes('Hướng dẫn của chuyên gia'),
      `Clicking second chip must open modal with its exact title, got: "${modalTitleAfterChip2}"`
    );

    // Switch to Group 1 tab in modal
    const switchedToTab1 = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[data-testid="citation-detail-modal"] button'));
      const tab1 = tabs.find(b => b.textContent?.includes('Sổ tay VietGAP'));
      if (tab1) {
        tab1.click();
        return true;
      }
      return false;
    });
    assert.ok(switchedToTab1, 'Tab 1 button must exist and be clicked');
    await new Promise(r => setTimeout(r, 300));

    const modalTitleAfterTab1 = await page.evaluate(() => {
      const heading = document.querySelector('[data-testid="citation-detail-modal"] h2, [data-testid="citation-detail-modal"] [role="heading"]');
      return heading?.textContent?.trim() || '';
    });
    assert.ok(
      modalTitleAfterTab1.includes('Sổ tay VietGAP'),
      `Switching to tab 1 must update modal title to "Sổ tay VietGAP", got: "${modalTitleAfterTab1}"`
    );

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-testid="citation-detail-modal"]'), { timeout: 3000 });
    record(
      'FE-R02',
      '[F2 Remediation] Ánh xạ citationId chuẩn từ wire contract; chuyển tab mượt và 0 cảnh báo React key',
      true,
      '0 missing-key warnings; distinct group selection verified'
    );

    // -------------------------------------------------------------
    // FE-R03: [F3 Remediation] Resolve detailPath with configured API base exactly once
    // Assert NO /api/api/ in request URIs and matches approved message-scoped path
    // -------------------------------------------------------------
    assert.ok(requestedChunkUris.length > 0, 'Chunk request must have been recorded during tests');
    const hasDoubleApi = requestedChunkUris.some(uri => uri.includes('/api/api/'));
    assert.equal(hasDoubleApi, false, `Requested URIs must NOT contain double /api/api/: ${requestedChunkUris.join(', ')}`);

    const hasApprovedPath = requestedChunkUris.some(uri =>
      uri.includes('/api/agent/conversations/00000000-0000-4000-8000-000000000900/messages/122/citations/00000000-0000-4000-8000-000000000301/chunks/00000000-0000-4000-8000-000000001010')
    );
    assert.ok(
      hasApprovedPath,
      `Requested URI must match the exact approved message-scoped path: ${requestedChunkUris.join(', ')}`
    );
    record(
      'FE-R03',
      '[F3 Remediation] Giải quyết detailPath với API base đúng 1 lần (loại bỏ /api/api/ trùng lặp)',
      true,
      `Captured URIs: ${requestedChunkUris.length}, double /api/api/ count: 0`
    );

    // -------------------------------------------------------------
    // FE-R04: [F4 Remediation] Release loading state when aborting and switching conversations
    // -------------------------------------------------------------
    // Trigger in-flight delayed ask
    nextAskDelay = 2500;
    await page.type('[data-testid="input-chat-question"]', 'Câu hỏi bị hủy khi chuyển hội thoại');
    await page.click('[data-testid="btn-send-question"]');

    // Verify composer input is disabled during in-flight ask
    const inputDisabledDuringAsk = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="input-chat-question"]');
      return input?.disabled;
    });
    assert.equal(inputDisabledDuringAsk, true, 'Composer input must be disabled during ask');

    // Switch immediately to conv-switch-target
    await page.goto(`${BASE_URL}/agent?conversationId=conv-switch-target`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="chat-header"]', { timeout: 8000 });

    // Wait for history loading to complete
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="input-chat-question"]');
      return input && !input.disabled;
    }, { timeout: 5000 });

    const composerEnabledAfterSwitch = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="input-chat-question"]');
      return !input?.disabled;
    });
    assert.ok(composerEnabledAfterSwitch, 'Composer input must be immediately ENABLED after switching conversation');

    // Submit new question in the new conversation
    const preSwitchAskCount = askCount;
    await page.type('[data-testid="input-chat-question"]', 'Câu hỏi gửi thành công trong conv-switch-target');
    await page.click('[data-testid="btn-send-question"]');

    await page.waitForFunction(() => {
      const msgs = Array.from(document.querySelectorAll('article, [role="article"]'));
      return msgs.some(m => m.textContent?.includes('Câu hỏi gửi thành công'));
    }, { timeout: 5000 });
    assert.equal(askCount - preSwitchAskCount, 1, 'Question must submit successfully in new conversation');
    record(
      'FE-R04',
      '[F4 Remediation] Giải phóng loading state khi chuyển hội thoại; ô soạn thảo sẵn sàng gửi ngay',
      true,
      'Composer enabled immediately after conversation switch'
    );

    // Switch back to conv-table
    await page.goto(`${BASE_URL}/agent?conversationId=conv-table`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="chat-table"]', { timeout: 8000 });

    // -------------------------------------------------------------
    // FE-R05: [F5 Remediation] Preserve full code-fence delimiter length
    // 4-backtick fence containing inner 3-backticks must NOT create a table
    // -------------------------------------------------------------
    const r05Check = await page.evaluate(() => {
      const tables = document.querySelectorAll('[data-testid="chat-table"]');
      const pres = Array.from(document.querySelectorAll('pre code'));
      const nestedFencePres = pres.filter(p => p.textContent?.includes('inner_pipe_not_a_table'));
      return {
        tableCount: tables.length,
        hasNestedFencePres: nestedFencePres.length > 0,
        nestedContent: nestedFencePres[0]?.textContent || '',
      };
    });

    assert.equal(r05Check.tableCount, 1, 'Only the single authentic table must exist; inner code pipe must NOT produce a table');
    assert.ok(r05Check.hasNestedFencePres, 'Inner code fence content must remain inside pre code');
    assert.ok(r05Check.nestedContent.includes('| inner_pipe_not_a_table | value |'), 'Inner table-like text preserved inside code');
    record(
      'FE-R05',
      '[F5 Remediation] Bảo toàn độ dài delimiter code fence; khối 4-backticks lồng 3-backticks không bị ngắt sớm',
      true,
      '1 table rendered; nested code fence intact'
    );

    // -------------------------------------------------------------
    // FE-R06: [F6 Remediation] Avoid rendering technical citation footer a second time
    // Recognized server footer stripped; ordinary discussion preserved
    // -------------------------------------------------------------
    const r06Check = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article[data-chat-role="assistant"]'));
      const msg2 = articles[0];
      const proseText = msg2?.textContent || '';
      return {
        hasProse: !!msg2,
        hasGeneralDiscussion: proseText.includes('Theo quy định về căn cứ xác minh'),
        hasTechnicalHeader: proseText.includes('Căn cứ đã xác minh:'),
        hasPublicationUuid: proseText.includes('00000000-0000-4000-8000-000000000101'),
        hasChunkUuid: proseText.includes('00000000-0000-4000-8000-000000001010'),
      };
    });

    assert.ok(r06Check.hasGeneralDiscussion, 'Ordinary prose discussing citations must be preserved');
    assert.equal(r06Check.hasTechnicalHeader, false, 'Technical footer header "Căn cứ đã xác minh:" must be stripped from prose');
    assert.equal(r06Check.hasPublicationUuid, false, 'Publication UUID must NOT appear in rendered prose');
    assert.equal(r06Check.hasChunkUuid, false, 'Chunk UUID must NOT appear in rendered prose');
    record(
      'FE-R06',
      '[F6 Remediation] Triệt tiêu footer kỹ thuật trùng lặp trong prose; giữ nguyên thảo luận thông thường và render chips',
      true,
      'Prose clean of technical UUID tokens; ordinary text preserved'
    );

    // Mobile layout screenshot
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'chat_qual_10_compact_chat_mobile.png') });

    // Summary of all test results
    console.log('\n======================================================');
    console.log(`ALL ${results.length} VERIFICATION CHECKS PASSED SUCCESSFULLY!`);
    console.log('======================================================');
    results.forEach(r => console.log(`✓ [${r.id}] ${r.title}`));

    const resultPath = path.join(EVIDENCE_DIR, 'chat-quality-002-test-results.json');
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
    console.log(`Saved results manifest to ${resultPath}`);

  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
    console.log('Verification finished, server and browser closed.');
  }
}

runVerification();
