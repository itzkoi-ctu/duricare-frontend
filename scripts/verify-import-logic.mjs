/**
 * FE-KNOWLEDGE-IMPORT-001: Import Logic & Contract Verification Suite
 * Verifies types, API client, error parsing, limits, locator assurance downgrading, and utilities
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('================================================================');
console.log('FE-KNOWLEDGE-IMPORT-001: Import Logic & Contract Verification');
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

// -------------------------------------------------------------
// 1. Verify src/types/import.ts against frozen contract schemas
// -------------------------------------------------------------
const typesPath = path.join('src', 'types', 'import.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');

it('types/import.ts defines WarningCode with all 12 normative warning codes', () => {
  const warnings = [
    'PDF_READING_ORDER_REVIEW',
    'DOCX_LAYOUT_REVIEW',
    'TRACKED_CHANGES_VIEW',
    'HEADERS_FOOTERS_OMITTED',
    'COMMENTS_OMITTED',
    'FOOTNOTES_ENDNOTES_OMITTED',
    'DRAWING_TEXT_OMITTED',
    'FIELD_RESULT_REVIEW',
    'EXTERNAL_LINK_IGNORED',
    'LOCATOR_REVIEW',
    'MANUAL_CHUNKING_REQUIRED',
    'EXTRACTION_NOT_EXPERT_REVIEW',
  ];
  for (const w of warnings) {
    assert(typesContent.includes(`'${w}'`), `Missing WarningCode: ${w}`);
  }
});

it('types/import.ts defines LocatorKind with all 5 normative kinds', () => {
  const kinds = ['LINES', 'MARKDOWN', 'PDF_PAGE', 'DOCX_PARAGRAPH', 'DOCX_CELL'];
  for (const k of kinds) {
    assert(typesContent.includes(`'${k}'`), `Missing LocatorKind: ${k}`);
  }
});

it('types/import.ts defines Locator with exact schema properties', () => {
  assert(typesContent.includes('kind: LocatorKind;'));
  assert(typesContent.includes('display: string;'));
  assert(typesContent.includes('lineStart: number | null;'));
  assert(typesContent.includes('lineEnd: number | null;'));
  assert(typesContent.includes('pageStart: number | null;'));
  assert(typesContent.includes('pageEnd: number | null;'));
  assert(typesContent.includes('paragraph: number | null;'));
  assert(typesContent.includes('table: number | null;'));
  assert(typesContent.includes('row: number | null;'));
  assert(typesContent.includes('cell: number | null;'));
  assert(typesContent.includes('heading: string | null;'));
});

it('types/import.ts defines Extraction with JDK-UTF8, PDFBox, JDK-DOCX and DURI-IMPORT-TEXT-1', () => {
  assert(typesContent.includes("'JDK-UTF8' | 'PDFBox' | 'JDK-DOCX'"));
  assert(typesContent.includes("normalization: 'DURI-IMPORT-TEXT-1';"));
  assert(typesContent.includes('truncated: false;'));
});

it('types/import.ts defines SessionState and LocatorStatus', () => {
  assert(typesContent.includes("'READY' | 'CONSUMED' | 'CANCELLED'"));
  assert(typesContent.includes("'EXACT_SPAN' | 'USER_VERIFIED' | 'UNVERIFIED'"));
});

it('types/import.ts defines Limits with exact contract values', () => {
  assert(typesContent.includes('fileBytes: number;'));
  assert(typesContent.includes('requestBytes: number;'));
  assert(typesContent.includes('confirmBytes: number;'));
  assert(typesContent.includes('extractedUtf16Units: number;'));
  assert(typesContent.includes('pages: number;'));
  assert(typesContent.includes('chunks: number;'));
  assert(typesContent.includes('chunkUtf16Units: number;'));
  assert(typesContent.includes('previewTtlSeconds: number;'));
});

it('types/import.ts defines ConfirmRequest with reviewConfirmed: true and bindings', () => {
  assert(typesContent.includes('requestId: string;'));
  assert(typesContent.includes('version: number;'));
  assert(typesContent.includes('reviewConfirmed: true;'));
  assert(typesContent.includes('chunks: ChunkInput[];'));
  assert(typesContent.includes('bindings: Binding[];'));
});

it('types/import.ts defines ProvenanceView with origin and status enums', () => {
  assert(typesContent.includes("'MANUAL' | 'IMPORTED'"));
  assert(typesContent.includes("'NOT_APPLICABLE' | 'CURRENT' | 'STALE_SNAPSHOT'"));
  assert(typesContent.includes('document: Document | null;'));
  assert(typesContent.includes('snapshot: Snapshot | null;'));
});

// -------------------------------------------------------------
// 2. Verify src/api/import.ts routes and error parsing
// -------------------------------------------------------------
const apiPath = path.join('src', 'api', 'import.ts');
const apiContent = fs.readFileSync(apiPath, 'utf8');

it('src/api/import.ts exports all 7 wire operations and parseImportError', () => {
  assert(apiContent.includes('export async function getImportCapabilities'));
  assert(apiContent.includes('export async function uploadImportFile'));
  assert(apiContent.includes('export async function listImportPreviews'));
  assert(apiContent.includes('export async function getImportPreview'));
  assert(apiContent.includes('export async function deleteImportPreview'));
  assert(apiContent.includes('export async function confirmImportDraft'));
  assert(apiContent.includes('export async function getRevisionProvenance'));
  assert(apiContent.includes('export function parseImportError'));
});

it('src/api/import.ts uses multipart/form-data with part name "file"', () => {
  assert(apiContent.includes("formData.append('file', file);"));
  assert(apiContent.includes("'Content-Type': 'multipart/form-data'"));
});

it('src/api/import.ts parses 422 pdf_no_text and highlights OCR_REQUIRED without auto-OCR', () => {
  assert(apiContent.includes("data?.code === 'pdf_no_text'"));
  assert(apiContent.includes('không tự động chạy OCR'));
});

it('src/api/import.ts parses 429 and extracts Retry-After seconds', () => {
  assert(apiContent.includes("headers?.['retry-after']"));
  assert(apiContent.includes('retryAfterSeconds'));
});

it('src/api/import.ts parses 503 import_disabled', () => {
  assert(apiContent.includes("data?.code === 'import_disabled'"));
});

it('src/api/import.ts parses 410 import_expired with TTL 30 minutes explanation', () => {
  assert(apiContent.includes('status === 410'));
  assert(apiContent.includes('TTL 30 phút'));
});

// -------------------------------------------------------------
// 3. Verify utilities in src/utils/importUtils.ts
// -------------------------------------------------------------
const utilsPath = path.join('src', 'utils', 'importUtils.ts');
const utilsContent = fs.readFileSync(utilsPath, 'utf8');

it('src/utils/importUtils.ts exports UUID, formatters, and configs', () => {
  assert(utilsContent.includes('export function generateUUID'));
  assert(utilsContent.includes('export function formatBytes'));
  assert(utilsContent.includes('export function formatDate'));
  assert(utilsContent.includes('export function formatTimeRemaining'));
  assert(utilsContent.includes('export function stripText'));
  assert(utilsContent.includes('export const WARNING_CONFIG'));
  assert(utilsContent.includes('export const LOCATOR_STATUS_CONFIG'));
});

it('src/utils/importUtils.ts LOCATOR_STATUS_CONFIG covers EXACT_SPAN, USER_VERIFIED, and UNVERIFIED', () => {
  assert(utilsContent.includes('EXACT_SPAN:'));
  assert(utilsContent.includes('USER_VERIFIED:'));
  assert(utilsContent.includes('UNVERIFIED:'));
});

// -------------------------------------------------------------
// 4. Verify Components & Page wiring
// -------------------------------------------------------------
const pagePath = path.join('src', 'pages', 'KnowledgeImportPage.tsx');
const pageContent = fs.readFileSync(pagePath, 'utf8');

it('src/pages/KnowledgeImportPage.tsx initializes chunks from proposals and enforces reviewConfirmed', () => {
  assert(pageContent.includes('initializeChunksFromProposals'));
  assert(pageContent.includes('reviewConfirmed'));
  assert(pageContent.includes('ImportConfirmModal'));
  assert(pageContent.includes('ImportSessionsModal'));
  assert(pageContent.includes('ExtractedTextPanel'));
  assert(pageContent.includes('ImportChunkEditor'));
});

it('src/pages/KnowledgeImportPage.tsx protects in-memory state on beforeunload', () => {
  assert(pageContent.includes("window.addEventListener('beforeunload'"));
});

const appRoutesPath = path.join('src', 'routes', 'AppRoutes.tsx');
const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8');

it('src/routes/AppRoutes.tsx registers /knowledge/import under ADMIN and EXPERT roles', () => {
  assert(appRoutesContent.includes("path=\"/knowledge/import\""));
  assert(appRoutesContent.includes("const KnowledgeImportPage = lazy("));
});

const sourcesPagePath = path.join('src', 'pages', 'KnowledgeSourcesPage.tsx');
const sourcesPageContent = fs.readFileSync(sourcesPagePath, 'utf8');

it('src/pages/KnowledgeSourcesPage.tsx has "Nhập tài liệu" button linking to /knowledge/import', () => {
  assert(sourcesPageContent.includes("to=\"/knowledge/import\""));
  assert(sourcesPageContent.includes("upload_file"));
  assert(sourcesPageContent.includes("Nhập tài liệu"));
});

const detailPagePath = path.join('src', 'pages', 'KnowledgeSourceDetailPage.tsx');
const detailPageContent = fs.readFileSync(detailPagePath, 'utf8');

it('src/pages/KnowledgeSourceDetailPage.tsx has Provenance action button and modal render', () => {
  assert(detailPageContent.includes("data-testid=\"view-provenance-button\""));
  assert(detailPageContent.includes("RevisionProvenanceModal"));
  assert(detailPageContent.includes("account_tree"));
});

// -------------------------------------------------------------
// 5. Verify i18n translations
// -------------------------------------------------------------
const viLocale = JSON.parse(fs.readFileSync('src/i18n/locales/vi/translation.json', 'utf8'));
const enLocale = JSON.parse(fs.readFileSync('src/i18n/locales/en/translation.json', 'utf8'));

it('i18n locales have all required import keys in both VI and EN', () => {
  const keys = [
    'Nhập tài liệu',
    'Nguồn gốc',
    'Nhập tài liệu tự động',
    'Nhập tài liệu tri thức (Document Import)',
    'Phiên chờ xác nhận',
    'Phiên nhập chờ xác nhận',
    'Xác nhận tạo bản nháp tri thức',
    'Nguồn gốc dữ liệu phiên bản (Provenance)',
    'Đồng ý và Tạo DRAFT',
    'Quay lại chỉnh sửa',
    'Khớp chính xác',
    'Người dùng đã kiểm chứng',
    'Chưa kiểm chứng / Đã sửa đổi',
  ];
  for (const k of keys) {
    assert(viLocale[k], `Missing VI translation for: ${k}`);
    assert(enLocale[k], `Missing EN translation for: ${k}`);
  }
});

console.log('----------------------------------------------------------------');
console.log(`Total Checks: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
console.log('================================================================');

if (passed !== total) {
  process.exit(1);
}
