import fs from 'node:fs';

const en = JSON.parse(fs.readFileSync('E:/CTU/LuanVan/duricare-frontend/src/i18n/locales/en/translation.json', 'utf8'));
const vi = JSON.parse(fs.readFileSync('E:/CTU/LuanVan/duricare-frontend/src/i18n/locales/vi/translation.json', 'utf8'));

const files = [
  'E:/CTU/LuanVan/duricare-frontend/src/pages/KnowledgeSourcesPage.tsx',
  'E:/CTU/LuanVan/duricare-frontend/src/pages/KnowledgeSourceCreatePage.tsx',
  'E:/CTU/LuanVan/duricare-frontend/src/pages/KnowledgeSourceDetailPage.tsx',
  'E:/CTU/LuanVan/duricare-frontend/src/pages/KnowledgeSourceEditPage.tsx',
  'E:/CTU/LuanVan/duricare-frontend/src/pages/KnowledgePage.tsx',
  'E:/CTU/LuanVan/duricare-frontend/src/components/knowledge/KnowledgeMetadataForm.tsx',
  'E:/CTU/LuanVan/duricare-frontend/src/components/knowledge/KnowledgeChunkEditor.tsx',
  'E:/CTU/LuanVan/duricare-frontend/src/components/knowledge/KnowledgeHistoryTable.tsx',
  'E:/CTU/LuanVan/duricare-frontend/src/components/knowledge/KnowledgeStatusBadge.tsx',
  'E:/CTU/LuanVan/duricare-frontend/src/components/knowledge/KnowledgeTierBadge.tsx',
  'E:/CTU/LuanVan/duricare-frontend/src/utils/governanceStatus.ts'
];

const missingEn = new Set();
const missingVi = new Set();

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  const tMatches = [...code.matchAll(/\bt\(\s*['"]([^'"]+)['"]\s*(?:,\s*\[.*?\])?\)/g)];
  for (const m of tMatches) {
    const k = m[1];
    if (typeof en[k] === 'undefined') missingEn.add(k);
    if (typeof vi[k] === 'undefined') missingVi.add(k);
  }

  // Also check string literals in configs
  if (f.endsWith('governanceStatus.ts')) {
    const labelMatches = [...code.matchAll(/label:\s*['"]([^'"]+)['"]/g)];
    for (const m of labelMatches) {
      if (typeof en[m[1]] === 'undefined') missingEn.add(m[1]);
      if (typeof vi[m[1]] === 'undefined') missingVi.add(m[1]);
    }
    const descMatches = [...code.matchAll(/desc(?:ription)?:\s*['"]([^'"]+)['"]/g)];
    for (const m of descMatches) {
      if (typeof en[m[1]] === 'undefined') missingEn.add(m[1]);
      if (typeof vi[m[1]] === 'undefined') missingVi.add(m[1]);
    }
  }
}

console.log('Total unique missing EN keys:', missingEn.size);
for (const k of missingEn) {
  console.log('  [MISSING EN] ' + k);
}

console.log('Total unique missing VI keys:', missingVi.size);
for (const k of missingVi) {
  console.log('  [MISSING VI] ' + k);
}
