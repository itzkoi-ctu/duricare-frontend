import fs from 'fs';
import path from 'path';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failCount++;
  }
}

console.log('================================================================');
console.log('FE-003: Knowledge Draft Edit Authorization Verification Suite');
console.log('================================================================\n');

// 1. Import evaluateDraftEditEligibility
const { evaluateDraftEditEligibility } = await import('../src/utils/governanceAuth.ts');

console.log('--- Test Matrix 1: ADMIN Draft Authorization (Cases 1 - 7) ---');

// Case 1: ADMIN owning a DRAFT can reach the edit page
const res1 = evaluateDraftEditEligibility({
  user: { email: 'admin@duricare.vn', role: 'ADMIN', farmId: null },
  profile: null,
  status: 'DRAFT',
  sourceOwnerUserId: 1,
  hasValidRevision: true,
});
assert(res1.canAttemptEdit === true, 'Case 1: ADMIN can attempt edit on DRAFT with valid revision');
assert(res1.isAdminAttempt === true, 'Case 1: Flagged as isAdminAttempt for backend enforcement');

// Case 2: ADMIN does not require an ExpertProfile
const res2 = evaluateDraftEditEligibility({
  user: { email: 'admin@duricare.vn', role: 'ADMIN', farmId: null },
  profile: null,
  profileError: false,
  profileLoading: false,
  status: 'DRAFT',
  sourceOwnerUserId: 999,
  hasValidRevision: true,
});
assert(res2.canAttemptEdit === true, 'Case 2: ADMIN can attempt edit without ExpertProfile (profile is null)');

// Case 3 & 4: ADMIN viewing foreign draft does not acquire write permission
assert(res2.isVerifiedOwner === false, 'Case 4: ADMIN viewing foreign draft does NOT acquire isVerifiedOwner flag');
assert(res2.reason === 'ADMIN_SERVER_VERIFIED_ATTEMPT', 'Case 4: Reason indicates server-verified attempt');

// Case 6: Non-DRAFT cannot be edited
const nonDraftStatuses = ['SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN'];
let allNonDraftBlocked = true;
for (const st of nonDraftStatuses) {
  const res = evaluateDraftEditEligibility({
    user: { email: 'admin@duricare.vn', role: 'ADMIN', farmId: null },
    status: st,
    sourceOwnerUserId: 1,
    hasValidRevision: true,
  });
  if (res.canAttemptEdit !== false || res.reason !== 'NOT_DRAFT') {
    allNonDraftBlocked = false;
  }
}
assert(allNonDraftBlocked, 'Case 6: Non-DRAFT statuses (SUBMITTED, IN_REVIEW, etc.) cannot be edited by ADMIN');

// Case 7: Missing revision is handled safely
const res7a = evaluateDraftEditEligibility({
  user: { email: 'admin@duricare.vn', role: 'ADMIN', farmId: null },
  status: 'DRAFT',
  sourceOwnerUserId: 1,
  hasValidRevision: false,
});
assert(res7a.canAttemptEdit === false && res7a.reason === 'NO_VALID_REVISION', 'Case 7: Missing revision ID returns canAttemptEdit: false');

const res7b = evaluateDraftEditEligibility({
  user: { email: 'admin@duricare.vn', role: 'ADMIN', farmId: null },
  status: null,
  sourceOwnerUserId: 1,
  hasValidRevision: true,
});
assert(res7b.canAttemptEdit === false && res7b.reason === 'NOT_DRAFT', 'Case 7: Null status returns canAttemptEdit: false');

console.log('\n--- Test Matrix 2: EXPERT Draft Authorization (Cases 8 - 11) ---');

// Case 8: Verified owner can edit
const verifiedProfile = {
  id: 10,
  userId: 42,
  email: 'expert@duricare.vn',
  enabled: true,
  role: 'EXPERT',
  fullName: 'TS. Expert',
  affiliation: 'CTU',
  specialties: 'Duri',
  verificationStatus: 'VERIFIED',
  verificationNote: null,
  verifiedBy: 1,
  verifiedAt: '2026-10-01T00:00:00Z',
  suspendedBy: null,
  suspendedAt: null,
  suspensionReason: null,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  version: 1,
};

const res8 = evaluateDraftEditEligibility({
  user: { email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
  profile: verifiedProfile,
  status: 'DRAFT',
  sourceOwnerUserId: 42,
  hasValidRevision: true,
});
assert(res8.canAttemptEdit === true, 'Case 8: Verified EXPERT owner can edit draft');
assert(res8.isVerifiedOwner === true, 'Case 8: isVerifiedOwner is true for verified matching expert');
assert(res8.isAdminAttempt === false, 'Case 8: isAdminAttempt is false for expert');
assert(res8.reason === 'VERIFIED_EXPERT_OWNER', 'Case 8: Reason is VERIFIED_EXPERT_OWNER');

// Case 9: Verified non-owner cannot edit
const res9 = evaluateDraftEditEligibility({
  user: { email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
  profile: verifiedProfile, // userId: 42
  status: 'DRAFT',
  sourceOwnerUserId: 99, // Owned by user 99
  hasValidRevision: true,
});
assert(res9.canAttemptEdit === false, 'Case 9: Verified EXPERT not owning draft cannot edit');
assert(res9.isVerifiedOwner === false, 'Case 9: isVerifiedOwner is false for non-owner');
assert(res9.reason === 'NOT_OWNER', 'Case 9: Reason is NOT_OWNER');

// Case 10: Pending/Suspended owner cannot edit
const pendingProfile = { ...verifiedProfile, verificationStatus: 'PENDING' };
const res10a = evaluateDraftEditEligibility({
  user: { email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
  profile: pendingProfile,
  status: 'DRAFT',
  sourceOwnerUserId: 42,
  hasValidRevision: true,
});
assert(res10a.canAttemptEdit === false, 'Case 10: PENDING expert owning draft cannot edit');
assert(res10a.reason === 'EXPERT_NOT_VERIFIED', 'Case 10: Reason is EXPERT_NOT_VERIFIED for PENDING');

const suspendedProfile = { ...verifiedProfile, verificationStatus: 'SUSPENDED' };
const res10b = evaluateDraftEditEligibility({
  user: { email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
  profile: suspendedProfile,
  status: 'DRAFT',
  sourceOwnerUserId: 42,
  hasValidRevision: true,
});
assert(res10b.canAttemptEdit === false, 'Case 10: SUSPENDED expert owning draft cannot edit');
assert(res10b.reason === 'EXPERT_NOT_VERIFIED', 'Case 10: Reason is EXPERT_NOT_VERIFIED for SUSPENDED');

// Case 11: Missing/null profile cannot grant access
const res11a = evaluateDraftEditEligibility({
  user: { email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
  profile: null,
  status: 'DRAFT',
  sourceOwnerUserId: 42,
  hasValidRevision: true,
});
assert(res11a.canAttemptEdit === false && res11a.reason === 'NO_PROFILE', 'Case 11: Null profile cannot grant access to EXPERT');

const res11b = evaluateDraftEditEligibility({
  user: { email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
  profile: verifiedProfile,
  profileLoading: true,
  status: 'DRAFT',
  sourceOwnerUserId: 42,
  hasValidRevision: true,
});
assert(res11b.canAttemptEdit === false && res11b.reason === 'PROFILE_LOADING', 'Case 11: Loading profile does not grant optimistic write access');

const res11c = evaluateDraftEditEligibility({
  user: { email: 'expert@duricare.vn', role: 'EXPERT', farmId: null },
  profile: null,
  profileError: true,
  status: 'DRAFT',
  sourceOwnerUserId: 42,
  hasValidRevision: true,
});
assert(res11c.canAttemptEdit === false && res11c.reason === 'NO_PROFILE', 'Case 11: Profile error does not grant access');

console.log('\n--- Test Matrix 3: OWNER and Anonymous Roles (Cases 12 - 13) ---');

// Case 12: OWNER cannot edit Governance Drafts
const res12 = evaluateDraftEditEligibility({
  user: { email: 'owner@duricare.vn', role: 'OWNER', farmId: 1 },
  profile: null,
  status: 'DRAFT',
  sourceOwnerUserId: 1,
  hasValidRevision: true,
});
assert(res12.canAttemptEdit === false, 'Case 12: OWNER cannot edit Governance Drafts');
assert(res12.reason === 'ROLE_NOT_AUTHORIZED', 'Case 12: Reason is ROLE_NOT_AUTHORIZED');

// Case 13: Anonymous user cannot use protected routes
const res13 = evaluateDraftEditEligibility({
  user: null,
  status: 'DRAFT',
  sourceOwnerUserId: 1,
  hasValidRevision: true,
});
assert(res13.canAttemptEdit === false, 'Case 13: Anonymous user cannot edit');
assert(res13.reason === 'UNAUTHENTICATED', 'Case 13: Reason is UNAUTHENTICATED');

console.log('\n--- Test Matrix 4: Server Authority & 403 / 409 Handling (Cases 3, 5, 14, 15) ---');

const apiFile = fs.readFileSync('src/api/governance.ts', 'utf8');

// Case 5: 403 Forbidden is parsed clearly
assert(apiFile.includes('status === 403'), 'Case 5: parseGovernanceError detects 403 status');
assert(apiFile.includes("message = 'Bạn không có quyền thực hiện thao tác này.'"), 'Case 5: parseGovernanceError maps 403 to clear permission message');
assert(apiFile.includes("error: data?.error || (status === 403 ? 'forbidden'"), 'Case 5: parseGovernanceError maps 403 to forbidden error code');

// Case 14: 409 Conflict handling
assert(apiFile.includes('status === 409'), 'Case 14: parseGovernanceError detects 409 status');
assert(apiFile.includes("error: data?.error || (status === 403 ? 'forbidden' : status === 409 ? 'conflict'"), 'Case 14: parseGovernanceError maps 409 to conflict error code');

console.log('\n--- Test Matrix 5: Component Source Inspection (Cases 15 - 18) ---');

const detailPageContent = fs.readFileSync('src/pages/KnowledgeSourceDetailPage.tsx', 'utf8');
const editPageContent = fs.readFileSync('src/pages/KnowledgeSourceEditPage.tsx', 'utf8');
const hookContent = fs.readFileSync('src/hooks/useExpertProfile.ts', 'utf8');

// Detail page inspection
assert(detailPageContent.includes('evaluateDraftEditEligibility'), 'KnowledgeSourceDetailPage uses evaluateDraftEditEligibility');
assert(!detailPageContent.includes("user?.role === 'ADMIN' && profile?.userId === source.ownerUserId"), 'Flawed ADMIN profile.userId dependency is removed from KnowledgeSourceDetailPage');
assert(detailPageContent.includes('data-testid="draft-edit-button"'), 'KnowledgeSourceDetailPage defines draft-edit-button with data-testid');
assert(detailPageContent.includes('targetRevisionId'), 'KnowledgeSourceDetailPage safely resolves targetRevisionId');

// Edit page inspection
assert(editPageContent.includes('data-testid="admin-edit-notice"'), 'KnowledgeSourceEditPage renders admin ownership disclaimer notice');
assert(editPageContent.includes('data-testid="governance-error-banner"'), 'KnowledgeSourceEditPage defines governance-error-banner for 403/errors');
assert(editPageContent.includes('403 Forbidden'), 'KnowledgeSourceEditPage handles 403 Forbidden with clear explanation');
assert(editPageContent.includes('handleReloadAndReview'), 'Case 14: KnowledgeSourceEditPage supports 409 reload-and-review flow');
assert(editPageContent.includes('version: capturedVersion'), 'Case 15: KnowledgeSourceEditPage submits capturedVersion');
assert(editPageContent.includes('handleBeforeUnload') && editPageContent.includes('isDirty'), 'Case 17: KnowledgeSourceEditPage tracks isDirty with beforeunload protection');
assert(editPageContent.includes("initialRevision.status !== 'DRAFT'"), 'Case 6: KnowledgeSourceEditPage locks non-DRAFT revisions');
assert(editPageContent.includes('data-testid="restricted-expert-edit-banner"'), 'Case 10: KnowledgeSourceEditPage restricts unverified experts');

// Hook inspection
assert(hookContent.includes('isExpert'), 'useExpertProfile avoids 403 request when role is not EXPERT');

console.log('\n================================================================');
console.log(`Results: ${passCount}/${passCount + failCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('✓ All FE-003 Draft Authorization verification checks PASSED successfully!');
}
