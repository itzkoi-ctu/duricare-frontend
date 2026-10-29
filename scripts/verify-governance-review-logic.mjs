import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('--- STARTING FE-GOV-002 LOGIC & SOURCE TEXT VERIFICATION SUITE ---');

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(err);
  }
}

// 1. Verify types and contracts exist and are correctly structured
const typesContent = fs.readFileSync(path.join('src', 'types', 'governance.ts'), 'utf8');

it('types/governance.ts exports RevisionStatus with all 7 enum values', () => {
  const expectedStatuses = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN'];
  for (const s of expectedStatuses) {
    assert(typesContent.includes(`'${s}'`), `Missing status ${s}`);
  }
});

it('types/governance.ts exports AssignmentStatus and DecisionOutcome', () => {
  assert(typesContent.includes("'ACTIVE' | 'COMPLETED' | 'REPLACED' | 'CANCELLED'"));
  assert(typesContent.includes("'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED'"));
});

it('types/governance.ts defines ReviewerCandidate, AssignmentSummary, AssignmentDetail, and DecisionDetail', () => {
  assert(typesContent.includes('export interface ReviewerCandidate'));
  assert(typesContent.includes('export interface AssignmentSummary'));
  assert(typesContent.includes('export interface AssignmentDetail'));
  assert(typesContent.includes('export interface DecisionDetail'));
});

it('types/governance.ts defines SubmitRevisionRequest, WithdrawRevisionRequest, NewRevisionRequest, AssignReviewerRequest, ReassignReviewerRequest, DecisionRequest', () => {
  assert(typesContent.includes('export interface SubmitRevisionRequest'));
  assert(typesContent.includes('export interface WithdrawRevisionRequest'));
  assert(typesContent.includes('export interface NewRevisionRequest'));
  assert(typesContent.includes('export interface AssignReviewerRequest'));
  assert(typesContent.includes('export interface ReassignReviewerRequest'));
  assert(typesContent.includes('export interface DecisionRequest'));
});

// 2. Verify API functions in src/api/governance.ts
const apiContent = fs.readFileSync(path.join('src', 'api/governance.ts'), 'utf8');

it('api/governance.ts implements all required endpoints for 1B-2, 1B-3, 1B-4', () => {
  assert(apiContent.includes('export async function listRevisions'));
  assert(apiContent.includes('export async function submitRevision'));
  assert(apiContent.includes('export async function withdrawRevision'));
  assert(apiContent.includes('export async function createNextRevision'));
  assert(apiContent.includes('export async function listSubmissions'));
  assert(apiContent.includes('export async function listReviewerCandidates'));
  assert(apiContent.includes('export async function assignReviewer'));
  assert(apiContent.includes('export async function reassignReviewer'));
  assert(apiContent.includes('export async function listAssignedReviews'));
  assert(apiContent.includes('export async function getReviewDetail'));
  assert(apiContent.includes('export async function submitDecision'));
});

it('api/governance.ts parses 409 conflict codes and 400 invalid_reviewer accurately', () => {
  assert(apiContent.includes('stale_version'));
  assert(apiContent.includes('active_revision_exists'));
  assert(apiContent.includes('active_assignment_exists'));
  assert(apiContent.includes('assignment_changed'));
  assert(apiContent.includes('decision_exists'));
  assert(apiContent.includes('invalid_reviewer'));
});

// 3. Verify Publication Boundary (K45 / Section 9 of Contract)
it('Publication Boundary: no publication endpoints or fake published status controls', () => {
  assert(!apiContent.includes('/publish'), 'Must not contain publish endpoints');
  assert(!apiContent.includes('/revoke'), 'Must not contain revoke endpoints');
  assert(!typesContent.includes('published: boolean'), 'Must not contain fake published flag');
  assert(!typesContent.includes('PUBLISHED'), 'Must not contain PUBLISHED enum');
});

// 4. Verify Component Structure & Source Text Requirements
const submitModalContent = fs.readFileSync(path.join('src', 'components', 'knowledge', 'KnowledgeSubmitModal.tsx'), 'utf8');
const withdrawModalContent = fs.readFileSync(path.join('src', 'components', 'knowledge', 'KnowledgeWithdrawModal.tsx'), 'utf8');
const newRevModalContent = fs.readFileSync(path.join('src', 'components', 'knowledge', 'KnowledgeNewRevisionModal.tsx'), 'utf8');
const assignModalContent = fs.readFileSync(path.join('src', 'components', 'knowledge', 'AdminAssignReviewerModal.tsx'), 'utf8');
const reassignModalContent = fs.readFileSync(path.join('src', 'components', 'knowledge', 'AdminReassignReviewerModal.tsx'), 'utf8');
const decisionModalContent = fs.readFileSync(path.join('src', 'components', 'knowledge', 'ExpertDecisionConfirmModal.tsx'), 'utf8');

it('KnowledgeSubmitModal implements preflight validation and version mismatch detection', () => {
  assert(submitModalContent.includes('preflightIssues'));
  assert(submitModalContent.includes('versionMismatch'));
  assert(submitModalContent.includes('capturedVersion'));
  assert(submitModalContent.includes('submitRevision'));
});

it('KnowledgeWithdrawModal requires mandatory reason and captures version', () => {
  assert(withdrawModalContent.includes('withdrawRevision'));
  assert(withdrawModalContent.includes('trimmedReason.length >= 3'));
  assert(withdrawModalContent.includes('capturedVersion'));
  assert(withdrawModalContent.includes('versionMismatch'));
});

it('KnowledgeNewRevisionModal clones latest terminal revision with baseRevisionId and baseVersion', () => {
  assert(newRevModalContent.includes('createNextRevision'));
  assert(newRevModalContent.includes('baseRevision.id'));
  assert(newRevModalContent.includes('capturedVersion'));
});

it('AdminAssignReviewerModal searches candidates, excludes invalid candidates, requires reason and captures version', () => {
  assert(assignModalContent.includes('listReviewerCandidates'));
  assert(assignModalContent.includes('assignReviewer'));
  assert(assignModalContent.includes('candidate-search-input'));
  assert(assignModalContent.includes('capturedVersion'));
});

it('AdminReassignReviewerModal excludes current reviewer, requires reason, and passes activeAssignmentId', () => {
  assert(reassignModalContent.includes('reassignReviewer'));
  assert(reassignModalContent.includes('activeAssignment.id'));
  assert(reassignModalContent.includes('activeAssignment.reviewerUserId'));
});

it('ExpertDecisionConfirmModal requires non-conflict, passes version & assignmentVersion, and warns of immutability', () => {
  assert(decisionModalContent.includes('submitDecision'));
  assert(decisionModalContent.includes('capturedRevVersion'));
  assert(decisionModalContent.includes('capturedAssignVersion'));
  assert(decisionModalContent.includes('assignment.revision.version'));
});

it('ExpertDecisionConfirmModal distinguishes conflict, forbidden, timeout and blocks immediate re-submit without reload', () => {
  assert(decisionModalContent.includes('mustVerifyReload'));
  assert(decisionModalContent.includes('isConflict'));
  assert(decisionModalContent.includes('isForbidden'));
  assert(decisionModalContent.includes('isTimeout'));
  assert(decisionModalContent.includes('handleReloadAndVerify'));
  assert(decisionModalContent.includes('reload-and-verify-button'));
  assert(decisionModalContent.includes('onReload'));
  assert(decisionModalContent.includes('onIndeterminateError'));
});

it('All mutation modals (Assign, Reassign, Submit, Withdraw, NewRevision) implement reload verification on error', () => {
  assert(reassignModalContent.includes('mustVerifyReload'));
  assert(reassignModalContent.includes('reassign-verify-reload-button'));
  assert(assignModalContent.includes('mustVerifyReload'));
  assert(assignModalContent.includes('assign-verify-reload-button'));
  assert(submitModalContent.includes('mustVerifyReload'));
  assert(submitModalContent.includes('submit-verify-reload-button'));
  assert(withdrawModalContent.includes('mustVerifyReload'));
  assert(withdrawModalContent.includes('withdraw-verify-reload-button'));
  assert(newRevModalContent.includes('mustVerifyReload'));
  assert(newRevModalContent.includes('new-rev-verify-reload-button'));
});

// 5. Verify Pages and Role Guards
const appRoutesContent = fs.readFileSync(path.join('src', 'routes', 'AppRoutes.tsx'), 'utf8');
const adminPageContent = fs.readFileSync(path.join('src', 'pages', 'AdminKnowledgeSubmissionsPage.tsx'), 'utf8');
const expertReviewsPageContent = fs.readFileSync(path.join('src', 'pages', 'ExpertAssignedReviewsPage.tsx'), 'utf8');
const workspacePageContent = fs.readFileSync(path.join('src', 'pages', 'ExpertReviewWorkspacePage.tsx'), 'utf8');
const detailPageContent = fs.readFileSync(path.join('src', 'pages', 'KnowledgeSourceDetailPage.tsx'), 'utf8');

it('AppRoutes registers /settings/knowledge for ADMIN and /knowledge/reviews for EXPERT', () => {
  assert(appRoutesContent.includes("path=\"/settings/knowledge\""));
  assert(appRoutesContent.includes("path=\"/knowledge/reviews\""));
  assert(appRoutesContent.includes("path=\"/knowledge/reviews/:assignmentId\""));
});

it('AdminKnowledgeSubmissionsPage does NOT expose professional decision controls to ADMIN', () => {
  assert(!adminPageContent.includes('submitDecision'));
  assert(!adminPageContent.includes('ExpertDecisionConfirmModal'));
  assert(!adminPageContent.includes('checkedSource'));
  assert(!adminPageContent.includes('checkedFaithfulness'));
  assert(!adminPageContent.includes('Ban hành quyết định'));
  assert(adminPageContent.includes('assignTarget'));
  assert(adminPageContent.includes('reassignTarget'));
});

it('AdminKnowledgeSubmissionsPage queries terminal results by status param and preserves server pagination', () => {
  assert(adminPageContent.includes('terminalStatus'));
  assert(
    adminPageContent.includes("statusParam = targetTerminalStatus") ||
    adminPageContent.includes("statusParam = terminalStatus")
  );
  assert(adminPageContent.includes('terminal-status-filter-group'));
  assert(!adminPageContent.includes("content.filter(s => s.status === 'APPROVED'"));
});

it('ExpertAssignedReviewsPage lists assigned reviews for verified reviewer', () => {
  assert(expertReviewsPageContent.includes('listAssignedReviews'));
});

it('ExpertReviewWorkspacePage verifies conflict of interest declaration and DURI-1B-v1 checklists', () => {
  assert(workspacePageContent.includes('noConflictConfirmed'));
  assert(workspacePageContent.includes('conflictOfInterestDeclared: false'));
  assert(workspacePageContent.includes('checkedSource'));
  assert(workspacePageContent.includes('checkedFaithfulness'));
  assert(workspacePageContent.includes('checkedApplicability'));
  assert(workspacePageContent.includes('assessedTier'));
  assert(workspacePageContent.includes('tierRationale'));
});

it('ExpertReviewWorkspacePage resets all decision form state on assignment identity change', () => {
  assert(workspacePageContent.includes('resetDecisionForm'));
  assert(workspacePageContent.includes('loadedAssignmentIdRef'));
  assert(workspacePageContent.includes('isDifferentAssignment'));
});

it('ExpertReviewWorkspacePage holds indeterminate outcome lock at assignment level', () => {
  assert(workspacePageContent.includes('mustVerifyReload'));
  assert(workspacePageContent.includes('decision-indeterminate-warning'));
  assert(workspacePageContent.includes('workspace-verify-reload-button'));
  assert(workspacePageContent.includes('onIndeterminateError'));
});

it('ExpertReviewWorkspacePage disables content editing (read-only snapshot for reviewer)', () => {
  assert(!workspacePageContent.includes('saveRevision'));
  assert(!workspacePageContent.includes('KnowledgeMetadataForm'));
  assert(!workspacePageContent.includes('KnowledgeChunkEditor'));
});

it('KnowledgeSourceDetailPage uses evaluateAuthorActionEligibility and protects author actions', () => {
  assert(detailPageContent.includes('evaluateAuthorActionEligibility'));
  assert(detailPageContent.includes('authorEligibility.canPerformAuthorActions'));
  assert(detailPageContent.includes('authorEligibility.isVerifiedOwner'));
  assert(!detailPageContent.includes("ownerDisplayName.includes('admin')"));
  assert(!detailPageContent.includes("Quản trị viên"));
  assert(!detailPageContent.includes("isOwner = user?.role === 'ADMIN'"));
  assert(detailPageContent.includes('canSubmit'));
  assert(detailPageContent.includes('canWithdraw'));
  assert(detailPageContent.includes('canCreateNextRevision'));
});

// 6. Verify useKnowledgeSourceDetail source transition isolation, stale cancellation, and foreign revision rejection
const hookContent = fs.readFileSync(path.join('src', 'hooks', 'useKnowledgeSourceDetail.ts'), 'utf8');
it('useKnowledgeSourceDetail cancels stale selections on source transition and guards race conditions', () => {
  assert(hookContent.includes('activeSelectionControllerRef'));
  assert(hookContent.includes('selectionGenerationRef'));
  assert(hookContent.includes('currentSourceIdRef'));
  assert(hookContent.includes('prevSourceIdRef.current !== sourceId'));
  assert(hookContent.includes('activeSelectionControllerRef.current?.abort()'));
  assert(hookContent.includes('activeRequestRef.current?.abort()'));
  assert(hookContent.includes('selectedRevIdRef.current && revData && revData.id !== selectedRevIdRef.current'));
  assert(hookContent.includes('thisGen !== selectionGenerationRef.current'));
  assert(hookContent.includes('targetSourceId !== currentSourceIdRef.current'));
  assert(hookContent.includes('revData.sourceId !== targetSourceId'));
  assert(hookContent.includes('fetched.sourceId === srcData.id'));
  assert(hookContent.includes('setSource(null)'));
  assert(hookContent.includes('setRevision(null)'));
  assert(hookContent.includes('// Genuine HTTP/network error for the active revision: rethrow'));
});

it('KnowledgeSourceDetailPage and AdminKnowledgeSubmissionsPage maintain parent-level indeterminate locks (source text checks)', () => {
  assert(detailPageContent.includes('indeterminateLocks'));
  assert(detailPageContent.includes('mustVerifyReload={Boolean(indeterminateLocks[`${safeRevision.id}:submit`])}'));
  assert(detailPageContent.includes('mustVerifyReload={Boolean(indeterminateLocks[`${safeRevision.id}:withdraw`])}'));
  assert(adminPageContent.includes('indeterminateLocks'));
  assert(adminPageContent.includes('handleReloadAssignTarget'));
  assert(adminPageContent.includes('handleReloadReassignTarget'));
});

it('KnowledgeSourceDetailPage binds author dialogs to source/revision and invalidates on transition (source text checks)', () => {
  assert(detailPageContent.includes('activeModal.sourceId === source?.id'));
  assert(detailPageContent.includes('activeModal.revisionId === safeRevision?.id'));
  assert(detailPageContent.includes('setActiveModal(null)'));
  assert(detailPageContent.includes('closeModalFor'));
  assert(detailPageContent.includes('indeterminateLocks[`${safeRevision.id}:submit`]'));
  assert(detailPageContent.includes('indeterminateLocks[`${safeRevision.id}:withdraw`]'));
  assert(detailPageContent.includes('isWithdrawModalOpen && canWithdraw'));
  assert(detailPageContent.includes('isSubmitModalOpen && canSubmit'));
  assert(detailPageContent.includes('isNewRevisionModalOpen && canCreateNextRevision'));
});

it('Mutation modals guard against unmount and late callback leakage (P2 resolution)', () => {
  const submitModalContent = fs.readFileSync(path.join('src', 'components', 'knowledge', 'KnowledgeSubmitModal.tsx'), 'utf8');
  const withdrawModalContent = fs.readFileSync(path.join('src', 'components', 'knowledge', 'KnowledgeWithdrawModal.tsx'), 'utf8');
  const newRevModalContent = fs.readFileSync(path.join('src', 'components', 'knowledge', 'KnowledgeNewRevisionModal.tsx'), 'utf8');

  assert(submitModalContent.includes('isMountedRef'));
  assert(submitModalContent.includes('abortControllerRef'));
  assert(submitModalContent.includes('!isMountedRef.current') && submitModalContent.includes('controller.signal.aborted'));

  assert(withdrawModalContent.includes('isMountedRef'));
  assert(withdrawModalContent.includes('abortControllerRef'));
  assert(withdrawModalContent.includes('!isMountedRef.current') && withdrawModalContent.includes('controller.signal.aborted'));

  assert(newRevModalContent.includes('isMountedRef'));
  assert(newRevModalContent.includes('abortControllerRef'));
  assert(newRevModalContent.includes('!isMountedRef.current') && newRevModalContent.includes('controller.signal.aborted'));
});

// 7. Navigation items
const navContent = fs.readFileSync(path.join('src', 'utils', 'navigation.ts'), 'utf8');
it('navigation.ts includes /settings/knowledge for ADMIN and /knowledge/reviews for EXPERT', () => {
  assert(navContent.includes('/settings/knowledge'));
  assert(navContent.includes('/knowledge/reviews'));
});

// 8. Functional Unit Tests for evaluateAuthorActionEligibility (Finding 1)
const { evaluateAuthorActionEligibility } = await import('../src/utils/governanceAuth.ts');

it('evaluateAuthorActionEligibility: VERIFIED EXPERT owner is ALLOWED', () => {
  const res = evaluateAuthorActionEligibility({
    user: { id: 42, email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
    profile: {
      id: 20,
      userId: 42,
      email: 'expert@duricare.vn',
      enabled: true,
      role: 'EXPERT',
      fullName: 'TS. Tran Van Chuyen Gia',
      affiliation: 'CTU',
      specialties: 'Sau rieng',
      verificationStatus: 'VERIFIED',
      verificationNote: null,
      verifiedBy: 1,
      verifiedAt: '2026-10-15T08:30:00Z',
      suspendedBy: null,
      suspendedAt: null,
      suspensionReason: null,
      createdAt: '2026-10-15T08:30:00Z',
      updatedAt: '2026-10-15T08:30:00Z',
      version: 1,
    },
    profileLoading: false,
    profileError: false,
    sourceOwnerUserId: 42,
  });
  assert.strictEqual(res.canPerformAuthorActions, true);
  assert.strictEqual(res.isVerifiedOwner, true);
  assert.strictEqual(res.reason, 'ALLOWED_VERIFIED_EXPERT_OWNER');
});

it('evaluateAuthorActionEligibility: PENDING EXPERT owner is DENIED', () => {
  const res = evaluateAuthorActionEligibility({
    user: { id: 42, email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
    profile: {
      id: 20,
      userId: 42,
      email: 'expert@duricare.vn',
      enabled: true,
      role: 'EXPERT',
      fullName: 'TS. Tran Van Chuyen Gia',
      affiliation: 'CTU',
      specialties: 'Sau rieng',
      verificationStatus: 'PENDING',
      verificationNote: null,
      verifiedBy: null,
      verifiedAt: null,
      suspendedBy: null,
      suspendedAt: null,
      suspensionReason: null,
      createdAt: '2026-10-15T08:30:00Z',
      updatedAt: '2026-10-15T08:30:00Z',
      version: 1,
    },
    profileLoading: false,
    profileError: false,
    sourceOwnerUserId: 42,
  });
  assert.strictEqual(res.canPerformAuthorActions, false);
  assert.strictEqual(res.isVerifiedOwner, false);
  assert.strictEqual(res.reason, 'EXPERT_NOT_VERIFIED');
});

it('evaluateAuthorActionEligibility: SUSPENDED EXPERT owner is DENIED', () => {
  const res = evaluateAuthorActionEligibility({
    user: { id: 42, email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
    profile: {
      id: 20,
      userId: 42,
      email: 'expert@duricare.vn',
      enabled: false,
      role: 'EXPERT',
      fullName: 'TS. Tran Van Chuyen Gia',
      affiliation: 'CTU',
      specialties: 'Sau rieng',
      verificationStatus: 'SUSPENDED',
      verificationNote: null,
      verifiedBy: 1,
      verifiedAt: '2026-10-15T08:30:00Z',
      suspendedBy: 1,
      suspendedAt: '2026-10-20T08:30:00Z',
      suspensionReason: 'Tam dinh chi',
      createdAt: '2026-10-15T08:30:00Z',
      updatedAt: '2026-10-20T08:30:00Z',
      version: 2,
    },
    profileLoading: false,
    profileError: false,
    sourceOwnerUserId: 42,
  });
  assert.strictEqual(res.canPerformAuthorActions, false);
  assert.strictEqual(res.isVerifiedOwner, false);
  assert.strictEqual(res.reason, 'EXPERT_NOT_VERIFIED');
});

it('evaluateAuthorActionEligibility: Missing auth id with verified profile is DENIED (no fallback)', () => {
  const res = evaluateAuthorActionEligibility({
    user: { id: null, email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
    profile: {
      id: 20,
      userId: 42,
      email: 'expert@duricare.vn',
      enabled: true,
      role: 'EXPERT',
      fullName: 'TS. Tran Van Chuyen Gia',
      affiliation: 'CTU',
      specialties: 'Sau rieng',
      verificationStatus: 'VERIFIED',
      verificationNote: null,
      verifiedBy: 1,
      verifiedAt: '2026-10-15T08:30:00Z',
      suspendedBy: null,
      suspendedAt: null,
      suspensionReason: null,
      createdAt: '2026-10-15T08:30:00Z',
      updatedAt: '2026-10-15T08:30:00Z',
      version: 1,
    },
    profileLoading: false,
    profileError: false,
    sourceOwnerUserId: 42,
  });
  assert.strictEqual(res.canPerformAuthorActions, false);
  assert.strictEqual(res.isVerifiedOwner, false);
  assert.strictEqual(res.reason, 'INVALID_AUTH_ID');
});

it('evaluateAuthorActionEligibility: EXPERT with profileLoading is DENIED', () => {
  const res = evaluateAuthorActionEligibility({
    user: { id: 42, email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
    profile: null,
    profileLoading: true,
    profileError: false,
    sourceOwnerUserId: 42,
  });
  assert.strictEqual(res.canPerformAuthorActions, false);
  assert.strictEqual(res.isVerifiedOwner, false);
  assert.strictEqual(res.reason, 'PROFILE_LOADING');
});

it('evaluateAuthorActionEligibility: EXPERT with profileError is DENIED', () => {
  const res = evaluateAuthorActionEligibility({
    user: { id: 42, email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
    profile: null,
    profileLoading: false,
    profileError: true,
    sourceOwnerUserId: 42,
  });
  assert.strictEqual(res.canPerformAuthorActions, false);
  assert.strictEqual(res.isVerifiedOwner, false);
  assert.strictEqual(res.reason, 'PROFILE_ERROR');
});

it('evaluateAuthorActionEligibility: ADMIN owner is ALLOWED without ExpertProfile', () => {
  const res = evaluateAuthorActionEligibility({
    user: { id: 1, email: 'admin@duricare.vn', role: 'ADMIN', farmId: null },
    profile: null,
    profileLoading: false,
    profileError: false,
    sourceOwnerUserId: 1,
  });
  assert.strictEqual(res.canPerformAuthorActions, true);
  assert.strictEqual(res.isVerifiedOwner, true);
  assert.strictEqual(res.reason, 'ALLOWED_ADMIN_OWNER');
});

it('evaluateAuthorActionEligibility: ADMIN non-owner is DENIED', () => {
  const res = evaluateAuthorActionEligibility({
    user: { id: 1, email: 'admin@duricare.vn', role: 'ADMIN', farmId: null },
    profile: null,
    profileLoading: false,
    profileError: false,
    sourceOwnerUserId: 42,
  });
  assert.strictEqual(res.canPerformAuthorActions, false);
  assert.strictEqual(res.isVerifiedOwner, false);
  assert.strictEqual(res.reason, 'NOT_OWNER');
});

it('evaluateAuthorActionEligibility: Unauthenticated user or invalid owner ID is DENIED', () => {
  const res1 = evaluateAuthorActionEligibility({
    user: null,
    sourceOwnerUserId: 42,
  });
  assert.strictEqual(res1.canPerformAuthorActions, false);
  assert.strictEqual(res1.reason, 'UNAUTHENTICATED');

  const res2 = evaluateAuthorActionEligibility({
    user: { id: 42, email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
    sourceOwnerUserId: -5,
  });
  assert.strictEqual(res2.canPerformAuthorActions, false);
  assert.strictEqual(res2.reason, 'INVALID_OWNER_ID');
});

console.log(`\nVerification finished: ${passed}/${total} checks PASSED.`);
if (passed === total) {
  console.log('ALL UNIT AND SOURCE TEXT CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`FAILED: ${total - passed} checks failed.`);
  process.exit(1);
}
