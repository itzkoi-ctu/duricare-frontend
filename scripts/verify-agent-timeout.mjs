import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Transport regression test only. This response is synthetic, not LLM evidence.
const backend = http.createServer((request, response) => {
  assert.equal(request.url, '/api/agent/ask');
  assert.equal(request.headers.authorization, 'Bearer test-memory-token');
  let body = '';
  request.on('data', chunk => { body += chunk; });
  request.on('end', () => {
    assert.equal(JSON.parse(body).question, 'TEST slow answer');
    const timer = setTimeout(() => {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ answer: '[modelUsed=gemini/test] TEST transport reply' }));
    }, 31000);
    response.on('close', () => clearTimeout(timer));
  });
});
await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
const temporary = await fs.mkdtemp(new URL('../node_modules/.agent-timeout-', import.meta.url));
const modules = ['client', 'authSessionBridge', 'agentAnswer', 'agent'];
try {
  for (const name of modules) {
    const folder = name === 'agentAnswer' ? 'utils' : 'api';
    let source = await fs.readFile(new URL(`../src/${folder}/${name}.ts`, import.meta.url), 'utf8');
    // Compile the existing modules for Node; only rewrite module paths and Vite's env expression.
    source = source.replace("import.meta.env.VITE_API_BASE_URL", "''")
      .replaceAll("'./client'", "'./client.mjs'")
      .replaceAll("'./authSessionBridge'", "'./authSessionBridge.mjs'")
      .replaceAll("'../utils/agentAnswer'", "'./agentAnswer.mjs'");
    await fs.writeFile(`${temporary}/${name}.mjs`, ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText);
  }
  const { default: client } = await import(pathToFileURL(`${temporary}/client.mjs`));
  const { bindAuthSession } = await import(pathToFileURL(`${temporary}/authSessionBridge.mjs`));
  const { askAgent } = await import(pathToFileURL(`${temporary}/agent.mjs`));
  client.defaults.baseURL = `http://127.0.0.1:${backend.address().port}/api`;
  bindAuthSession({ getAccessToken: () => 'test-memory-token' });
  let configuredTimeout;
  client.interceptors.request.use(config => { configuredTimeout = config.timeout; return config; });
  const started = Date.now();
  const result = await askAgent('TEST slow answer');
  const elapsedMs = Date.now() - started;
  assert.ok(elapsedMs > 30000);
  assert.equal(configuredTimeout, 90000);
  assert.equal(client.defaults.timeout, 15000);
  assert.deepEqual(result, { answer: 'TEST transport reply', modelUsed: 'gemini/test' });
  console.log(JSON.stringify({ check: 'reply after 30 seconds', elapsedMs, chatTimeoutMs: configuredTimeout,
    sharedTimeoutMs: client.defaults.timeout, prefixStripped: true, bearerAttached: true, result: 'PASS' }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 250);
  await assert.rejects(askAgent('TEST slow answer', controller.signal), error => error.code === 'ERR_CANCELED');
  clearTimeout(timer);
  console.log('PASS: unmount/user cancellation remains supported');
} finally {
  for (const name of modules) await fs.unlink(`${temporary}/${name}.mjs`).catch(() => {});
  await fs.rmdir(temporary);
  backend.closeAllConnections();
  await new Promise(resolve => backend.close(resolve));
}
