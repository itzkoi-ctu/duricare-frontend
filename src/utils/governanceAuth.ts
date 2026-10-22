import type { User } from '../types/auth';
import type { ExpertProfile } from '../types/expert';
import type { RevisionStatus } from '../types/governance';

export interface DraftEditEligibilityParams {
  user: User | null;
  profile?: ExpertProfile | null;
  profileLoading?: boolean;
  profileError?: boolean;
  status: RevisionStatus | string | null | undefined;
  sourceOwnerUserId?: number | null;
  hasValidRevision?: boolean;
}

export type DraftEditEligibilityReason =
  | 'VERIFIED_EXPERT_OWNER'
  | 'ADMIN_SERVER_VERIFIED_ATTEMPT'
  | 'NOT_DRAFT'
  | 'NO_VALID_REVISION'
  | 'UNAUTHENTICATED'
  | 'ROLE_NOT_AUTHORIZED'
  | 'PROFILE_LOADING'
  | 'NO_PROFILE'
  | 'EXPERT_NOT_VERIFIED'
  | 'NOT_OWNER'
  | 'UNKNOWN_ROLE';

export interface DraftEditEligibilityResult {
  /**
   * Whether the user is permitted to attempt navigation to the draft edit workflow.
   * - For verified EXPERT owner: true (client-verified ownership).
   * - For ADMIN viewing DRAFT: true (navigation affordance; backend enforces ownership on save).
   * - Otherwise: false.
   */
  canAttemptEdit: boolean;

  /**
   * True only when client identity positively confirms ownership
   * (e.g. verified EXPERT with profile.userId === sourceOwnerUserId).
   * Never true for ADMIN because frontend has no trusted numeric userId.
   */
  isVerifiedOwner: boolean;

  /**
   * True when an ADMIN user is attempting to edit a DRAFT.
   * Subject to backend 403 enforcement if the draft was created by another account.
   */
  isAdminAttempt: boolean;

  /**
   * Programmatic reason explaining the decision.
   */
  reason: DraftEditEligibilityReason;
}

/**
 * Evaluates draft edit eligibility following DuriCare Governance Phase 1B-1 rules.
 *
 * Rules:
 * - Revision status MUST be 'DRAFT' and a valid revision must exist.
 * - OWNER accounts have no Governance write/edit capability.
 * - EXPERT accounts require a loaded, verified ExpertProfile whose userId strictly matches sourceOwnerUserId.
 * - ADMIN accounts are granted navigation affordance to the edit workflow for DRAFTs without requiring
 *   an ExpertProfile. Because current auth session lacks numeric userId, frontend does not assert
 *   definitive ownership; backend remains the final authority (403 on save for non-owned drafts).
 */
export function evaluateDraftEditEligibility(
  params: DraftEditEligibilityParams
): DraftEditEligibilityResult {
  const {
    user,
    profile,
    profileLoading = false,
    profileError = false,
    status,
    sourceOwnerUserId,
    hasValidRevision = true,
  } = params;

  // 1. Revision must exist and status must be DRAFT
  if (!hasValidRevision) {
    return {
      canAttemptEdit: false,
      isVerifiedOwner: false,
      isAdminAttempt: false,
      reason: 'NO_VALID_REVISION',
    };
  }

  if (status !== 'DRAFT') {
    return {
      canAttemptEdit: false,
      isVerifiedOwner: false,
      isAdminAttempt: false,
      reason: 'NOT_DRAFT',
    };
  }

  // 2. User must be authenticated
  if (!user) {
    return {
      canAttemptEdit: false,
      isVerifiedOwner: false,
      isAdminAttempt: false,
      reason: 'UNAUTHENTICATED',
    };
  }

  // 3. OWNER role has no Governance write/edit access
  if (user.role === 'OWNER') {
    return {
      canAttemptEdit: false,
      isVerifiedOwner: false,
      isAdminAttempt: false,
      reason: 'ROLE_NOT_AUTHORIZED',
    };
  }

  // 4. EXPERT role evaluation
  if (user.role === 'EXPERT') {
    // If profile is still loading, do not grant optimistic access
    if (profileLoading) {
      return {
        canAttemptEdit: false,
        isVerifiedOwner: false,
        isAdminAttempt: false,
        reason: 'PROFILE_LOADING',
      };
    }

    // Missing profile or error state cannot grant access
    if (profileError || !profile) {
      return {
        canAttemptEdit: false,
        isVerifiedOwner: false,
        isAdminAttempt: false,
        reason: 'NO_PROFILE',
      };
    }

    // Expert must be VERIFIED (PENDING or SUSPENDED cannot edit/save)
    if (profile.verificationStatus !== 'VERIFIED') {
      return {
        canAttemptEdit: false,
        isVerifiedOwner: false,
        isAdminAttempt: false,
        reason: 'EXPERT_NOT_VERIFIED',
      };
    }

    // Expert must own the draft (profile.userId === sourceOwnerUserId)
    if (
      typeof profile.userId === 'number' &&
      typeof sourceOwnerUserId === 'number' &&
      profile.userId === sourceOwnerUserId
    ) {
      return {
        canAttemptEdit: true,
        isVerifiedOwner: true,
        isAdminAttempt: false,
        reason: 'VERIFIED_EXPERT_OWNER',
      };
    }

    return {
      canAttemptEdit: false,
      isVerifiedOwner: false,
      isAdminAttempt: false,
      reason: 'NOT_OWNER',
    };
  }

  // 5. ADMIN role evaluation
  if (user.role === 'ADMIN') {
    // Safe FE-only fallback: Permit attempt to navigate to edit workflow without requiring ExpertProfile.
    // The frontend cannot prove ownership without numeric userId, so backend enforces it on save.
    return {
      canAttemptEdit: true,
      isVerifiedOwner: false,
      isAdminAttempt: true,
      reason: 'ADMIN_SERVER_VERIFIED_ATTEMPT',
    };
  }

  return {
    canAttemptEdit: false,
    isVerifiedOwner: false,
    isAdminAttempt: false,
    reason: 'UNKNOWN_ROLE',
  };
}
