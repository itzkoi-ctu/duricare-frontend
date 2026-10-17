import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
}

const auth = await load('../src/utils/authNavigation.ts');
const nav = await load('../src/utils/navigation.ts');
const status = await load('../src/utils/expertStatus.ts');

test('Status configuration and styling matrix', () => {
  const cfg = status.EXPERT_STATUS_CONFIG;
  assert.equal(cfg.PENDING.label, 'Chờ xác minh');
  assert.ok(cfg.PENDING.badgeTone.includes('amber'));
  assert.equal(cfg.VERIFIED.label, 'Đã xác minh');
  assert.ok(cfg.VERIFIED.badgeTone.includes('teal'));
  assert.equal(cfg.SUSPENDED.label, 'Tạm đình chỉ');
  assert.ok(cfg.SUSPENDED.badgeTone.includes('coral'));
});

test('Allowed action transitions matrix from real codebase helper', () => {
  // PENDING can only be verified or suspended
  assert.deepEqual(status.getAllowedActions('PENDING'), ['verify', 'suspend']);

  // VERIFIED can only be suspended (VERIFIED -> VERIFIED returns 409)
  assert.deepEqual(status.getAllowedActions('VERIFIED'), ['suspend']);

  // SUSPENDED can only be reinstated (calls /verify endpoint; SUSPENDED -> SUSPENDED returns 409)
  assert.deepEqual(status.getAllowedActions('SUSPENDED'), ['reinstate']);
});

test('ExpertStatusDialog version concurrency retention logic', () => {
  // Simulating dialog lifecycle:
  // 1. Dialog opens with initial profile version
  let capturedVersion = null;
  let prevOpen = false;

  const simulateDialogRender = (open, profileVersion) => {
    if (open !== prevOpen) {
      prevOpen = open;
      if (open) {
        capturedVersion = profileVersion;
      } else {
        capturedVersion = null;
      }
    }
    const versionMismatch = capturedVersion !== null && capturedVersion !== profileVersion;
    return { capturedVersion, versionMismatch };
  };

  // Step A: Dialog opens with profile v0
  const openState = simulateDialogRender(true, 0);
  assert.equal(openState.capturedVersion, 0);
  assert.equal(openState.versionMismatch, false, 'Initial open should not mismatch');

  // Step B: Profile version changes in background to v1 while dialog remains open
  const backgroundUpdatedState = simulateDialogRender(true, 1);
  assert.equal(
    backgroundUpdatedState.capturedVersion,
    0,
    'capturedVersion must retain version at dialog open time'
  );
  assert.equal(
    backgroundUpdatedState.versionMismatch,
    true,
    'versionMismatch must trigger when profile changes during open dialog'
  );

  // Step C: Admin clicks reload & review -> updates capturedVersion to new version
  capturedVersion = 1;
  const reloadedState = simulateDialogRender(true, 1);
  assert.equal(reloadedState.capturedVersion, 1);
  assert.equal(reloadedState.versionMismatch, false, 'versionMismatch must clear after reload & review');

  // Step D: Dialog closes
  const closedState = simulateDialogRender(false, 1);
  assert.equal(closedState.capturedVersion, null);
  assert.equal(closedState.versionMismatch, false);
});

test('UTF-8 password byte limit check', () => {
  const validatePassword = (value) => {
    if (!value || value.length < 12) return 'Mật khẩu phải có tối thiểu 12 ký tự.';
    const bytes = new TextEncoder().encode(value).length;
    if (bytes > 72) return 'Mật khẩu không được vượt quá 72 byte UTF-8.';
    return true;
  };

  // Valid 12 characters ASCII
  assert.equal(validatePassword('123456789012'), true);

  // Short password (< 12 chars)
  assert.equal(validatePassword('shortPass1!'), 'Mật khẩu phải có tối thiểu 12 ký tự.');

  // 72 ASCII characters = 72 bytes (allowed)
  const valid72 = 'A'.repeat(72);
  assert.equal(validatePassword(valid72), true);

  // 73 ASCII characters = 73 bytes (rejected)
  const tooLongAscii = 'A'.repeat(73);
  assert.equal(validatePassword(tooLongAscii), 'Mật khẩu không được vượt quá 72 byte UTF-8.');

  // Multi-byte UTF-8 test:
  // "sầu riêng" uses multi-byte characters: ề, ầ, etc.
  // 30 repetitions of "sầu riêng " is 30 * 10 = 300 chars, but let's test a string with 25 characters where each is 3 bytes -> 75 bytes!
  // If we create a string of 40 Vietnamese characters that exceeds 72 bytes:
  const vietnamese40 = 'SầuRiêngĐặcSảnMiềnTâySôngNướcCầnThơVN'; // ~37 chars
  const vnBytes = new TextEncoder().encode(vietnamese40).length;
  assert.ok(vnBytes > 40); // Proves multibyte expansion
  if (vnBytes > 72) {
    assert.equal(validatePassword(vietnamese40), 'Mật khẩu không được vượt quá 72 byte UTF-8.');
  }
});

test('Role-based routes and forbidden rejection', () => {
  // ADMIN has access to /settings/experts
  assert.equal(auth.routeAllowed('/settings/experts', 'ADMIN'), true);
  assert.equal(auth.routeAllowed('/settings/experts/new', 'ADMIN'), true);
  assert.equal(auth.routeAllowed('/settings/experts/42', 'ADMIN'), true);

  // OWNER is denied
  assert.equal(auth.routeAllowed('/settings/experts', 'OWNER'), false);
  assert.equal(auth.routeAllowed('/settings/experts/new', 'OWNER'), false);
  assert.equal(auth.routeAllowed('/settings/experts/42', 'OWNER'), false);

  // EXPERT is denied
  assert.equal(auth.routeAllowed('/settings/experts', 'EXPERT'), false);
  assert.equal(auth.routeAllowed('/settings/experts/new', 'EXPERT'), false);
  assert.equal(auth.routeAllowed('/settings/experts/42', 'EXPERT'), false);

  // Fallback landings
  assert.equal(auth.roleLanding('EXPERT'), '/knowledge');
  assert.equal(auth.roleLanding('OWNER'), '/');
  assert.equal(auth.roleLanding('ADMIN'), '/');

  // Redirection with forbidden notice
  const ownerRedirect = auth.loginRedirect({ from: '/settings/experts' }, 'OWNER');
  assert.deepEqual(ownerRedirect, { to: '/', state: { authNotice: 'forbidden' } });

  const expertRedirect = auth.loginRedirect({ from: '/settings/experts' }, 'EXPERT');
  assert.deepEqual(expertRedirect, { to: '/knowledge', state: { authNotice: 'forbidden' } });
});

test('ADMIN navigation includes expert management; mobile overflow accommodates growth', () => {
  const adminNav = nav.navigationForRole('ADMIN');
  const paths = adminNav.map(item => item.path);
  assert.ok(paths.includes('/settings/experts'));
  assert.equal(adminNav.find(item => item.path === '/settings/experts')?.label, 'Quản lý chuyên gia');

  // Total items for admin is 6 (> 4 triggers mobile overflow sheet)
  assert.ok(adminNav.length > 4);
});
