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


export interface AuthorActionEligibilityParams {
  user: User | null;
  profile?: ExpertProfile | null;
  profileLoading?: boolean;
  profileError?: boolean;
  sourceOwnerUserId?: number | null;
}

export type AuthorActionEligibilityReason =
  | 'ALLOWED_ADMIN_OWNER'
  | 'ALLOWED_VERIFIED_EXPERT_OWNER'
  | 'UNAUTHENTICATED'
  | 'INVALID_AUTH_ID'
  | 'INVALID_OWNER_ID'
  | 'NOT_OWNER'
  | 'ROLE_NOT_AUTHORIZED'
  | 'PROFILE_LOADING'
  | 'PROFILE_ERROR'
  | 'NO_PROFILE'
  | 'EXPERT_NOT_VERIFIED';

export interface AuthorActionEligibilityResult {
  canPerformAuthorActions: boolean;
  isVerifiedOwner: boolean;
  reason: AuthorActionEligibilityReason;
}

/**
 * Evaluates whether the current user is eligible to perform author lifecycle actions
 * (submit revision, withdraw revision, create subsequent revision from terminal revision).
 *
 * Rules:
 * - Positive safe-integer authenticated user ID required (user.id > 0, Number.isSafeInteger).
 * - Exact numerical ownership match required (user.id === sourceOwnerUserId).
 * - ADMIN owner: permitted.
 * - EXPERT owner: requires a loaded, error-free ExpertProfile with verificationStatus === 'VERIFIED'.
 * - PENDING, SUSPENDED, loading, error, or missing profile: fail closed (false).
 * - Non-owner, unauthenticated, or invalid ID: fail closed (false).
 * - Never fall back to profile.userId when auth user.id is missing.
 */
export function evaluateAuthorActionEligibility(
  params: AuthorActionEligibilityParams
): AuthorActionEligibilityResult {
  const {
    user,
    profile,
    profileLoading = false,
    profileError = false,
    sourceOwnerUserId,
  } = params;

  if (!user) {
    return {
      canPerformAuthorActions: false,
      isVerifiedOwner: false,
      reason: 'UNAUTHENTICATED',
    };
  }

  // 1. Positive safe-integer authenticated user ID validation
  const hasValidAuthId =
    typeof user.id === 'number' && Number.isSafeInteger(user.id) && user.id > 0;
  if (!hasValidAuthId) {
    return {
      canPerformAuthorActions: false,
      isVerifiedOwner: false,
      reason: 'INVALID_AUTH_ID',
    };
  }

  // 2. Positive safe-integer source owner user ID validation
  const hasValidOwnerUserId =
    typeof sourceOwnerUserId === 'number' &&
    Number.isSafeInteger(sourceOwnerUserId) &&
    sourceOwnerUserId > 0;
  if (!hasValidOwnerUserId) {
    return {
      canPerformAuthorActions: false,
      isVerifiedOwner: false,
      reason: 'INVALID_OWNER_ID',
    };
  }

  // 3. Exact ownership match
  if (user.id !== sourceOwnerUserId) {
    return {
      canPerformAuthorActions: false,
      isVerifiedOwner: false,
      reason: 'NOT_OWNER',
    };
  }

  // 4. Role qualification
  if (user.role === 'ADMIN') {
    return {
      canPerformAuthorActions: true,
      isVerifiedOwner: true,
      reason: 'ALLOWED_ADMIN_OWNER',
    };
  }

  if (user.role === 'EXPERT') {
    if (profileLoading) {
      return {
        canPerformAuthorActions: false,
        isVerifiedOwner: false,
        reason: 'PROFILE_LOADING',
      };
    }
    if (profileError) {
      return {
        canPerformAuthorActions: false,
        isVerifiedOwner: false,
        reason: 'PROFILE_ERROR',
      };
    }
    if (!profile) {
      return {
        canPerformAuthorActions: false,
        isVerifiedOwner: false,
        reason: 'NO_PROFILE',
      };
    }
    if (profile.verificationStatus !== 'VERIFIED') {
      return {
        canPerformAuthorActions: false,
        isVerifiedOwner: false,
        reason: 'EXPERT_NOT_VERIFIED',
      };
    }
    return {
      canPerformAuthorActions: true,
      isVerifiedOwner: true,
      reason: 'ALLOWED_VERIFIED_EXPERT_OWNER',
    };
  }

  return {
    canPerformAuthorActions: false,
    isVerifiedOwner: false,
    reason: 'ROLE_NOT_AUTHORIZED',
  };
}
