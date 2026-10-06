import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

// Assert the captured browser-driven requests; fixture evidence is not LLM accuracy data.
const folder = new URL('../verification/agent-multiturn-2026-10-06/', import.meta.url);
const requests = JSON.parse(await fs.readFile(new URL('fixture-requests.json', folder), 'utf8'));
const transcript = JSON.parse(await fs.readFile(new URL('live-transcript.json', folder), 'utf8'));
const results = [];
function check(name, assertion) { assertion(); results.push({ name, result: 'PASS' }); console.log(`PASS: ${name}`); }
const asks = requests.filter(request => request.path === '/api/agent/ask');
check('new request includes zoneCode and omits conversationId', () => {
  assert.equal(asks[0].body.zoneCode, 'TEST-ZONE');
  assert.equal(asks[0].body.conversationId, undefined);
});
check('429 retries only after the user resends the same question', () => {
  assert.equal(asks.length, 4);
  assert.equal(asks[0].body.question, asks[1].body.question);
});
check('follow-up sends the conversationId returned by the previous turn', () => {
  assert.ok(asks[2].body.conversationId);
  assert.equal(asks[2].body.question, 'TEST lượt thứ hai');
  assert.ok(requests.some(request => request.path.endsWith(`/${asks[2].body.conversationId}/messages`)));
});
check('new conversation clears the previous conversationId', () => {
  assert.equal(asks[3].body.conversationId, undefined);
  assert.equal(asks[3].body.question, 'TEST hội thoại mới');
});
check('all conversation API calls use the authenticated shared client', () => {
  assert.ok(requests.every(request => request.bearerAttached));
});
check('delete retry targets the same conversation', () => {
  const deletes = requests.filter(request => request.method === 'DELETE');
  assert.equal(deletes.length, 2);
  assert.equal(deletes[0].path, deletes[1].path);
});
const parserSource = await fs.readFile(new URL('../src/utils/agentAnswer.ts', import.meta.url), 'utf8');
const parserJs = ts.transpileModule(parserSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { parseAgentAnswer } = await import(`data:text/javascript;base64,${Buffer.from(parserJs).toString('base64')}`);
check('prefix stripping preserves conversationId and toolsUsed', () => {
  const response = { answer: '[modelUsed=deepseek/test] Tư vấn', conversationId: 'TEST-id',
    toolsUsed: [{ name: 'getSensorData', arguments: {}, outcome: 'OK' }] };
  assert.deepEqual(parseAgentAnswer(response), { ...response, answer: 'Tư vấn', modelUsed: 'deepseek/test' });
});
check('real conversation contains three user turns and three assistant replies', () => {
  assert.equal(transcript.messages.filter(message => message.role === 'user').length, 3);
  assert.equal(transcript.messages.filter(message => message.role === 'assistant').length, 3);
});
check('real assistant metadata shows all six registered tool labels on turn one', () => {
  const first = transcript.messages.find(message => message.role === 'assistant');
  assert.deepEqual([...first.tools].sort(), ['getAlerts', 'getCareHistory', 'getSensorData', 'getWeather', 'getZoneProfile', 'searchKnowledge'].sort());
});
check('real chat never displays the raw modelUsed prefix', () => {
  assert.ok(transcript.messages.every(message => !message.text.includes('[modelUsed=')));
});
await fs.writeFile(new URL('assertions.json', folder), JSON.stringify(results, null, 2));
