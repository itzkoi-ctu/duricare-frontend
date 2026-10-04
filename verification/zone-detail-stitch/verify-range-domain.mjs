import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
async function load(relative) {
  const source = await readFile(new URL(relative, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { getReadingRange } = await load('../../src/utils/readingRange.ts');
const { getChartDomain } = await load('../../src/utils/chartDomain.ts');
const now = new Date('2026-10-03T15:30:00+07:00');
assert.equal(Date.parse(getReadingRange('LAST_24_HOURS', now).to) - Date.parse(getReadingRange('LAST_24_HOURS', now).from), 24 * 3600000);
assert.equal(Date.parse(getReadingRange('LAST_7_DAYS', now).to) - Date.parse(getReadingRange('LAST_7_DAYS', now).from), 7 * 24 * 3600000);
const localMidnight = new Date(now); localMidnight.setHours(0, 0, 0, 0);
assert.equal(getReadingRange('TODAY', now).from, localMidnight.toISOString());
assert.equal(getReadingRange('TODAY', now).to, now.toISOString());
for (const [values, min, max] of [[[87, 100], 70, 80], [[40], 75, 85], [[-5, 55], 24, 30], [[70], 70, 70]]) {
  const [low, high] = getChartDomain(values, min, max);
  assert.ok(low < Math.min(...values, min) && high > Math.max(...values, max));
}
assert.deepEqual(getChartDomain([], null, null), [0, 100]);
console.log('PASS: exact rolling periods, local midnight, complete target bands, outliers and constant readings.');
