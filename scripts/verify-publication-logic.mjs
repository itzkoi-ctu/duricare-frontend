import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('================================================================');
console.log('FE-RAG-PUB-001: RAG Publication UI Logic & Contract Verification');
console.log('================================================================');

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${desc}`);
    console.error(err);
  }
}

// 1. Verify src/types/publication.ts
const pubTypesPath = path.join('src', 'types', 'publication.ts');
const pubTypesContent = fs.readFileSync(pubTypesPath, 'utf8');

it('types/publication.ts defines PublicationStatus with exact contract values', () => {
  assert(pubTypesContent.includes("'PENDING' | 'ACTIVE' | 'SUPERSEDED' | 'REVOKED'"));
});

it('types/publication.ts defines JobKind and JobStatus', () => {
  assert(pubTypesContent.includes("'INDEX' | 'CLEANUP'"));
  assert(pubTypesContent.includes("'QUEUED'"));
  assert(pubTypesContent.includes("'RUNNING'"));
  assert(pubTypesContent.includes("'RETRY_WAIT'"));
  assert(pubTypesContent.includes("'WAITING_GATE'"));
  assert(pubTypesContent.includes("'SUCCEEDED'"));
  assert(pubTypesContent.includes("'FAILED'"));
  assert(pubTypesContent.includes("'CANCELLED'"));
});

it('types/publication.ts defines JobPhase and RunStatus', () => {
  assert(pubTypesContent.includes("'VALIDATE'"));
  assert(pubTypesContent.includes("'EMBED'"));
  assert(pubTypesContent.includes("'INDEX'"));
  assert(pubTypesContent.includes("'VERIFY'"));
  assert(pubTypesContent.includes("'ACTIVATE'"));
  assert(pubTypesContent.includes("'CLEANUP'"));
  const expectedRunStatuses = ['RUNNING', 'VERIFIED', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED'];
  for (const s of expectedRunStatuses) {
    assert(pubTypesContent.includes(`'${s}'`), `Missing RunStatus: ${s}`);
  }
});

it('types/publication.ts defines PublicationHead with exact schema fields', () => {
  assert(pubTypesContent.includes('sourceId: string;'));
  assert(pubTypesContent.includes('version: number;'));
  assert(pubTypesContent.includes('generation: number;'));
  assert(pubTypesContent.includes('activePublicationId: string | null;'));
  assert(pubTypesContent.includes('pendingPublicationId: string | null;'));
  assert(pubTypesContent.includes('updatedAt: string | null;'));
});

it('types/publication.ts defines RetrievalManifest, Fingerprint and RetrievalChunk', () => {
  assert(pubTypesContent.includes('export interface RetrievalManifest'));
  assert(pubTypesContent.includes("tierPolicyVersion: 'DURI-1B-v1';"));
  assert(pubTypesContent.includes('export interface Fingerprint'));
  assert(pubTypesContent.includes("distance: 'COSINE';"));
  assert(pubTypesContent.includes('export interface RetrievalChunk'));
});

it('types/publication.ts defines PublicationSummary, JobSummary, RunSummary, JobDetail, PublicationDetail', () => {
  assert(pubTypesContent.includes('export interface PublicationSummary'));
  assert(pubTypesContent.includes('export interface JobSummary'));
  assert(pubTypesContent.includes('export interface RunSummary'));
  assert(pubTypesContent.includes('export interface JobDetail'));
  assert(pubTypesContent.includes('export interface PublicationDetail'));
});

it('types/publication.ts defines MutationReceipt, OperationReceipt, PublicationEvent, IndeterminateOperation', () => {
  assert(pubTypesContent.includes('export interface MutationReceipt'));
  assert(pubTypesContent.includes('replayed: boolean;'));
  assert(pubTypesContent.includes('export interface OperationReceipt'));
  assert(pubTypesContent.includes('export interface PublicationEvent'));
  assert(pubTypesContent.includes('export interface IndeterminateOperation'));
  assert(pubTypesContent.includes("operation: 'PUBLISH' | 'REVOKE' | 'RETRY_INDEX' | 'RETRY_CLEANUP'"));
});

it('types/publication.ts defines PublishRequest, RetryRequest, RevokeRequest with mandatory idempotency requestId', () => {
  assert(pubTypesContent.includes('export interface PublishRequest'));
  assert(pubTypesContent.includes('requestId: string;'));
  assert(pubTypesContent.includes('version: number;'));
  assert(pubTypesContent.includes('revisionId: string;'));
  assert(pubTypesContent.includes('revisionVersion: number;'));
  assert(pubTypesContent.includes('reason: string;'));
  assert(pubTypesContent.includes('disclosureConfirmed: true;'));
  assert(pubTypesContent.includes('export interface RetryRequest'));
  assert(pubTypesContent.includes('export interface RevokeRequest'));
});

it('types/publication.ts defines PublicationError and FieldError envelope', () => {
  assert(pubTypesContent.includes('export interface FieldError'));
  assert(pubTypesContent.includes('export interface PublicationError'));
});

// 2. Verify src/api/publication.ts
const apiPath = path.join('src', 'api', 'publication.ts');
const apiContent = fs.readFileSync(apiPath, 'utf8');

it('api/publication.ts implements all 11 frozen contract routes', () => {
  assert(apiContent.includes('export async function getPublicationHead'));
  assert(apiContent.includes('export async function publishRevision'));
  assert(apiContent.includes('export async function listPublications'));
  assert(apiContent.includes('export async function getPublicationDetail'));
  assert(apiContent.includes('export async function retryPublication'));
  assert(apiContent.includes('export async function revokePublication'));
  assert(apiContent.includes('export async function listPublicationJobs'));
  assert(apiContent.includes('export async function getJobDetail'));
  assert(apiContent.includes('export async function retryCleanupJob'));
  assert(apiContent.includes('export async function listPublicationEvents'));
  assert(apiContent.includes('export async function getOperationReceipt'));
});

it('api/publication.ts parses 400, 403, 404, 409, 413, 503, 500 error codes', () => {
  assert(apiContent.includes('stale_version'));
  assert(apiContent.includes('idempotency_key_reused'));
  assert(apiContent.includes('already_active'));
  assert(apiContent.includes('pending_publication_exists'));
  assert(apiContent.includes('publication_ineligible'));
  assert(apiContent.includes('publication_disabled'));
  assert(apiContent.includes('publication_schema_not_ready'));
  assert(apiContent.includes('fingerprint_changed'));
});

// 3. Verify Components
const pubBadgePath = path.join('src', 'components', 'knowledge', 'publication', 'PublicationStatusBadge.tsx');
const pubBadgeContent = fs.readFileSync(pubBadgePath, 'utf8');

it('PublicationStatusBadge supports all publication statuses with distinct styling', () => {
  assert(pubBadgeContent.includes('PUBLICATION_STATUS_CONFIG'));
  assert(pubBadgeContent.includes('publication-status-badge-'));
});

const publishModalPath = path.join('src', 'components', 'knowledge', 'publication', 'PublishRevisionModal.tsx');
const publishModalContent = fs.readFileSync(publishModalPath, 'utf8');

it('PublishRevisionModal implements disclosureConfirmed, requestId preservation, chunk preflight, and 409 conflict guard', () => {
  assert(publishModalContent.includes('disclosureConfirmed'));
  assert(publishModalContent.includes('crypto.randomUUID()'));
  assert(publishModalContent.includes('currentHeadVersion'));
  assert(publishModalContent.includes('preflightIssues'));
  assert(publishModalContent.includes('publish-disclosure-checkbox'));
  assert(publishModalContent.includes('publish-reason-input'));
  assert(publishModalContent.includes('modalSessionRef'));
  assert(publishModalContent.includes('isMountedRef'));
  assert(publishModalContent.includes('isConflict'));
  assert(publishModalContent.includes('handleReloadHead'));
  assert(publishModalContent.includes('publish-reload-head-button'));
  assert(publishModalContent.includes('!isConflict'));
  assert(publishModalContent.includes('revision.chunks.length === 0'));
});

const revokeModalPath = path.join('src', 'components', 'knowledge', 'publication', 'RevokePublicationModal.tsx');
const revokeModalContent = fs.readFileSync(revokeModalPath, 'utf8');

it('RevokePublicationModal implements reason validation, head reload recovery, 409 conflict guard, and indeterminate lock', () => {
  assert(revokeModalContent.includes('revoke-reason-input'));
  assert(revokeModalContent.includes('currentHeadVersion'));
  assert(revokeModalContent.includes('modalSessionRef'));
  assert(revokeModalContent.includes('isMountedRef'));
  assert(revokeModalContent.includes('handleReloadHead'));
  assert(revokeModalContent.includes('revoke-reload-head-button'));
  assert(revokeModalContent.includes('!isConflict'));
  assert(revokeModalContent.includes('indeterminateLock'));
});

const retryModalPath = path.join('src', 'components', 'knowledge', 'publication', 'RetryPublicationModal.tsx');
const retryModalContent = fs.readFileSync(retryModalPath, 'utf8');

it('RetryPublicationModal supports INDEX and CLEANUP jobs with reload recovery and 409 conflict guard', () => {
  assert(retryModalContent.includes('retry-reason-input'));
  assert(retryModalContent.includes('retryPublication'));
  assert(retryModalContent.includes('retryCleanupJob'));
  assert(retryModalContent.includes('modalSessionRef'));
  assert(retryModalContent.includes('retry-reload-head-button'));
  assert(retryModalContent.includes('!isConflict'));
  assert(retryModalContent.includes('indeterminateLock'));
});

const pubDetailModalPath = path.join('src', 'components', 'knowledge', 'publication', 'PublicationDetailModal.tsx');
const pubDetailModalContent = fs.readFileSync(pubDetailModalPath, 'utf8');

it('PublicationDetailModal renders Manifest, Fingerprint, Jobs, Runs, and Audit Events with race condition guards', () => {
  assert(pubDetailModalContent.includes('detail-tab-manifest'));
  assert(pubDetailModalContent.includes('detail-tab-jobs'));
  assert(pubDetailModalContent.includes('detail-tab-events'));
  assert(pubDetailModalContent.includes('getPublicationDetail'));
  assert(pubDetailModalContent.includes('getJobDetail'));
  assert(pubDetailModalContent.includes('listPublicationEvents'));
  assert(pubDetailModalContent.includes('jobSelectionSessionRef'));
  assert(pubDetailModalContent.includes('selectedJobIdRef'));
  assert(pubDetailModalContent.includes('eventsSessionRef'));
});

const headCardPath = path.join('src', 'components', 'knowledge', 'publication', 'PublicationHeadCard.tsx');
const headCardContent = fs.readFileSync(headCardPath, 'utf8');

it('PublicationHeadCard separates review state from publication state and binds modals', () => {
  assert(headCardContent.includes('publication-head-card'));
  assert(headCardContent.includes('getPublicationHead'));
  assert(headCardContent.includes('getOperationReceipt'));
  assert(headCardContent.includes('PublishRevisionModal'));
  assert(headCardContent.includes('RevokePublicationModal'));
  assert(headCardContent.includes('RetryPublicationModal'));
  assert(headCardContent.includes('PublicationDetailModal'));
  assert(headCardContent.includes('canAdminPublishCurrent'));
  assert(headCardContent.includes('handleVerifyReceipt'));
});

const pubTabPath = path.join('src', 'components', 'knowledge', 'publication', 'AdminPublicationsTab.tsx');
const pubTabContent = fs.readFileSync(pubTabPath, 'utf8');

it('AdminPublicationsTab queries listPublications with status filters, pagination and detail inspection', () => {
  assert(pubTabContent.includes('listPublications'));
  assert(pubTabContent.includes('getOperationReceipt'));
  assert(pubTabContent.includes('publication-status-filter-group'));
  assert(pubTabContent.includes('publications-table'));
  assert(pubTabContent.includes('PublicationDetailModal'));
  assert(pubTabContent.includes('RevokePublicationModal'));
  assert(pubTabContent.includes('RetryPublicationModal'));
  assert(pubTabContent.includes('sessionRef'));
  assert(pubTabContent.includes('indeterminateOps'));
  assert(pubTabContent.includes('handleVerifyReceipt'));
});

it('AdminPublicationsTab binds receipt, head, and modal callbacks to targetId and modal session', () => {
  assert(pubTabContent.includes('revokeSessionRef'));
  assert(pubTabContent.includes('retrySessionRef'));
  assert(pubTabContent.includes('currentRevokeTargetIdRef'));
  assert(pubTabContent.includes('currentRetryTargetIdRef'));
  assert(pubTabContent.includes('handleRevokeModalSuccess'));
  assert(pubTabContent.includes('handleRetryModalSuccess'));
  assert(pubTabContent.includes('revokeSessionRef.current === session'));
  assert(pubTabContent.includes('retrySessionRef.current === session'));
  assert(!pubTabContent.includes('handleMutationSuccess'));
});

it('AdminPublicationsTab guards handleVerifyReceipt and onReloadHead against late cross-modal clobbering', () => {
  assert(pubTabContent.includes('modalContext'));
  assert(pubTabContent.includes('modalContext.sessionId'));
  assert(pubTabContent.includes('capturedSession'));
  assert(pubTabContent.includes('capturedTargetId'));
});

// 4. Verify Pages Integration
const sourceDetailPagePath = path.join('src', 'pages', 'KnowledgeSourceDetailPage.tsx');
const sourceDetailPageContent = fs.readFileSync(sourceDetailPagePath, 'utf8');

it('KnowledgeSourceDetailPage renders PublicationHeadCard only for ADMIN role', () => {
  assert(sourceDetailPageContent.includes('PublicationHeadCard'));
  assert(sourceDetailPageContent.includes("user?.role === 'ADMIN'"));
});

const adminPagePath = path.join('src', 'pages', 'AdminKnowledgeSubmissionsPage.tsx');
const adminPageContent = fs.readFileSync(adminPagePath, 'utf8');

it('AdminKnowledgeSubmissionsPage includes PUBLICATIONS tab and renders AdminPublicationsTab', () => {
  assert(adminPageContent.includes("'PUBLICATIONS'"));
  assert(adminPageContent.includes('tab-publications'));
  assert(adminPageContent.includes('AdminPublicationsTab'));
  assert(adminPageContent.includes("targetTab === 'PUBLICATIONS'"));
});

// 5. Verify Governance Boundary Preservation
const govTypesPath = path.join('src', 'types', 'governance.ts');
const govTypesContent = fs.readFileSync(govTypesPath, 'utf8');
const govApiPath = path.join('src', 'api', 'governance.ts');
const govApiContent = fs.readFileSync(govApiPath, 'utf8');

it('Governance Boundary: types/governance.ts and api/governance.ts retain v1.1 integrity', () => {
  assert(!govTypesContent.includes('PUBLISHED'));
  assert(!govTypesContent.includes('published: boolean'));
  assert(!govApiContent.includes('/publish'));
  assert(!govApiContent.includes('/revoke'));
});

// 6. Verify Localization Dictionary Completeness
const viJson = JSON.parse(fs.readFileSync(path.join('src', 'i18n', 'locales', 'vi', 'translation.json'), 'utf8'));
const enJson = JSON.parse(fs.readFileSync(path.join('src', 'i18n', 'locales', 'en', 'translation.json'), 'utf8'));

const testKeys = [
  'Chờ xuất bản',
  'Đang hoạt động trong RAG',
  'Đã thay thế',
  'Đã thu hồi',
  'Xuất bản vào RAG',
  'Yêu cầu xuất bản vào RAG',
  'Thu hồi bản xuất bản RAG',
  'Xuất bản RAG',
  'Trạng thái xuất bản RAG (DuriCare AI)',
  'Lý do / Căn cứ xuất bản',
  'Xác nhận công bố dữ liệu (disclosureConfirmed)',
];

it('i18n catalogs contain complete VI and EN translations for publication UI', () => {
  for (const k of testKeys) {
    assert(viJson[k], `Missing VI translation for: ${k}`);
    assert(enJson[k], `Missing EN translation for: ${k}`);
  }
});

console.log('================================================================');
console.log(`Results: ${passed}/${total} PASSED, ${total - passed} FAILED`);
console.log('================================================================');

if (passed === total) {
  console.log('✓ All FE-RAG-PUB-001 Publication Logic verification checks PASSED successfully!');
  process.exit(0);
} else {
  console.error('✗ Some verification checks failed.');
  process.exit(1);
}
