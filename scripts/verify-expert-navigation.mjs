import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
}
const auth = await load('../src/utils/authNavigation.ts');
const nav = await load('../src/utils/navigation.ts');

test('ADMIN and OWNER retain operational home; EXPERT lands on knowledge', () => {
  for (const role of ['ADMIN', 'OWNER']) assert.equal(auth.roleLanding(role), '/');
  assert.equal(auth.roleLanding('EXPERT'), '/knowledge');
});
test('permitted redirect-back preserves query and fragment for each role', () => {
  assert.equal(auth.loginDestination({ from: '/zones/zoneA?farmId=7#care' }, 'OWNER'), '/zones/zoneA?farmId=7#care');
  assert.equal(auth.loginDestination({ from: '/settings/zones?farmId=7' }, 'ADMIN'), '/settings/zones?farmId=7');
  assert.equal(auth.loginDestination({ from: '/knowledge#status' }, 'EXPERT'), '/knowledge#status');
});
test('EXPERT farm redirects have a forbidden notice and terminate at an allowed landing', () => {
  for (const from of ['/', '/alerts', '/agent', '/zones/zoneA', '/settings/farm']) {
    const redirect = auth.loginRedirect({ from }, 'EXPERT');
    assert.equal(redirect.to, '/knowledge');
    assert.equal(redirect.state.authNotice, 'forbidden');
    assert.equal(auth.routeAllowed(redirect.to, 'EXPERT'), true);
    assert.equal(auth.loginDestination({ from: redirect.to }, 'EXPERT'), redirect.to);
  }
});
test('OWNER management and ADMIN knowledge redirects land on allowed home', () => {
  assert.deepEqual(auth.loginRedirect({ from: '/settings/zones' }, 'OWNER'), { to: '/', state: { authNotice: 'forbidden' } });
  assert.deepEqual(auth.loginRedirect({ from: '/knowledge' }, 'ADMIN'), { to: '/', state: { authNotice: 'forbidden' } });
});
test('external, login, malformed and control-character destinations cannot redirect away', () => {
  for (const from of ['//evil.test', 'https://evil.test', '/login?from=/', '/\\evil.test', '/zones/\u0000x']) {
    assert.equal(auth.loginDestination({ from }, 'EXPERT'), '/knowledge');
    assert.equal(auth.loginDestination({ from }, 'OWNER'), '/');
  }
});
test('EXPERT navigation contains only account; OWNER and ADMIN keep their existing entries', () => {
  assert.deepEqual(nav.navigationForRole('EXPERT').map(item => item.path), ['/knowledge']);
  assert.deepEqual(nav.navigationForRole('OWNER').map(item => item.path), ['/', '/alerts', '/agent']);
  assert.deepEqual(nav.navigationForRole('ADMIN').map(item => item.path), ['/', '/alerts', '/agent', '/settings/farm', '/settings/zones', '/settings/experts']);
});
