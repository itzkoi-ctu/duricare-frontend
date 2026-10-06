import http from 'node:http';
import fs from 'node:fs/promises';

if (process.argv[2] === '--control') {
  const response = await fetch('http://127.0.0.1:5189/__control', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: Number(process.argv[3]) }),
  });
  if (!response.ok) throw new Error('Fixture control failed');
  console.log(`Next fixture request will return ${process.argv[3]}`);
  process.exit(0);
}

// Isolated frontend state verification. No calls to a real LLM/database.
const out = new URL('../verification/agent-multiturn-2026-10-06/', import.meta.url);
await fs.mkdir(out, { recursive: true });
const conversations = new Map();
const requests = [];
let failure = 0;
let nextId = 1;
const tools = [{ name: 'getSensorData', arguments: { zoneCode: 'TEST-ZONE' }, outcome: 'OK' },
  { name: 'searchKnowledge', arguments: { topic: 'IRRIGATION' }, outcome: 'EMPTY' }];
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const url = new URL(req.url, 'http://localhost');
  const reply = (status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(value === undefined ? undefined : JSON.stringify(value));
  };
  if (url.pathname === '/__control') { failure = body.status; reply(200, {}); return; }
  if (url.pathname === '/__report') { reply(200, { requests, conversations: [...conversations.values()] }); return; }
  requests.push({ method: req.method, path: url.pathname, body, bearerAttached: req.headers.authorization === 'Bearer TEST-in-memory' });
  await fs.writeFile(new URL('fixture-requests.json', out), JSON.stringify(requests, null, 2));
  await new Promise(resolve => setTimeout(resolve, 700));
  if (failure) { const status = failure; failure = 0; reply(status, { message: 'TEST server failure' }); return; }
  if (url.pathname === '/api/agent/conversations' && req.method === 'GET') {
    reply(200, [...conversations.values()].map(({ messages: _messages, ...summary }) => summary).reverse()); return;
  }
  if (url.pathname === '/api/agent/ask') {
    const id = body.conversationId ?? crypto.randomUUID();
    let conversation = conversations.get(id);
    if (!conversation) {
      conversation = { id, zoneCode: body.zoneCode ?? null, title: body.question.slice(0, 60),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] };
      conversations.set(id, conversation);
    }
    const answer = `[modelUsed=gemini/TEST] TEST phản hồi lượt ${conversation.messages.length / 2 + 1}`;
    conversation.updatedAt = new Date().toISOString();
    conversation.messages.push({ id: nextId++, role: 'USER', content: body.question, toolsUsed: [], createdAt: new Date().toISOString() },
      { id: nextId++, role: 'ASSISTANT', content: answer, modelUsed: 'gemini/TEST', toolsUsed: tools, createdAt: new Date().toISOString() });
    reply(200, { answer, modelUsed: 'gemini/TEST', conversationId: id, toolsUsed: tools }); return;
  }
  const match = url.pathname.match(/^\/api\/agent\/conversations\/([^/]+)(\/messages)?$/);
  if (match) {
    const row = conversations.get(match[1]);
    if (!row) { reply(404, {}); return; }
    if (req.method === 'DELETE') { conversations.delete(match[1]); reply(204); return; }
    reply(200, row.messages); return;
  }
  reply(404, {});
});
server.listen(5189, '127.0.0.1', () => console.log('TEST fixture ready: http://127.0.0.1:5189'));
