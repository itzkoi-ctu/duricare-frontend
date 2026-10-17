import fs from 'node:fs';

const en = JSON.parse(fs.readFileSync('src/i18n/locales/en/translation.json', 'utf8'));

const files = [
  'src/pages/ExpertCreatePage.tsx',
  'src/pages/ExpertDetailPage.tsx',
  'src/pages/ExpertListPage.tsx',
  'src/pages/KnowledgePage.tsx',
  'src/components/ExpertStatusDialog.tsx',
  'src/components/ExpertStatusBadge.tsx',
  'src/components/layout/ExpertShell.tsx',
  'src/hooks/useExpertList.ts',
  'src/hooks/useExpertDetail.ts',
  'src/utils/expertStatus.ts',
  'src/types/expert.ts'
];

let missingCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  // find t('...') or t("...")
  const tMatches = [...content.matchAll(/\bt\(\s*['"]([^'"]+)['"]\s*\)/g)];
  for (const match of tMatches) {
    const key = match[1];
    if (typeof en[key] === 'undefined') {
      console.log(`[MISSING EN] in ${file}: "${key}"`);
      missingCount++;
    }
  }

  // find required: '...', message: '...'
  const msgMatches = [...content.matchAll(/(?:message|required)\s*:\s*['"]([^'"]+)['"]/g)];
  for (const match of msgMatches) {
    const key = match[1];
    if (typeof en[key] === 'undefined') {
      console.log(`[MISSING EN VALIDATION] in ${file}: "${key}"`);
      missingCount++;
    }
  }

  // find validate returns: || '...' or return '...'
  const valMatches = [...content.matchAll(/(?:return|\|\|)\s*['"]([^'"]+)['"]/g)];
  for (const match of valMatches) {
    const key = match[1];
    if (key.length > 5 && !key.includes('/') && typeof en[key] === 'undefined') {
      console.log(`[CHECK POSSIBLE EN STRING] in ${file}: "${key}"`);
    }
  }
}

if (missingCount === 0) {
  console.log('SUCCESS: All expert strings and validations are present in EN translation!');
} else {
  console.log(`FAILURE: ${missingCount} missing keys.`);
  process.exit(1);
}
