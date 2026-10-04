import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const json = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const trace = await json('network.json');
const ranges = await json('range-results.json');
for (const range of ranges) {
  const duration = Date.parse(range.to) - Date.parse(range.from);
  if (range.period === 'LAST_24_HOURS') assert.equal(duration, 24 * 3600000);
  if (range.period === 'LAST_7_DAYS') assert.equal(duration, 7 * 24 * 3600000);
  for (const [index, type] of ['TEMPERATURE', 'HUMIDITY', 'SOIL_MOISTURE'].entries()) {
    const request = trace.find(entry => {
      const url = new URL(entry.url);
      return url.pathname.endsWith(`/${type}/readings`) && url.searchParams.get('from') === range.from && url.searchParams.get('to') === range.to;
    });
    assert.ok(request, `${range.period}/${type} must refetch with exact Instants`);
    assert.equal(request.status, 200);
    assert.equal(request.bearerPresent, true);
    assert.equal(request.responseData.length, range.charts[index].points);
    assert.ok(request.responseData.every(row => Date.parse(row.recordAt) >= Date.parse(range.from) && Date.parse(row.recordAt) <= Date.parse(range.to)));
    assert.equal(range.charts[index].bandCount, 1);
  }
}
const postIndex = trace.findIndex(entry => entry.method === 'POST' && entry.status === 201);
assert.ok(postIndex >= 0);
const post = trace[postIndex];
assert.equal(post.requestBody.zoneId, 1);
assert.equal(post.responseData.zoneCode, 'zoneA');
assert.equal(post.bearerPresent, true);
assert.ok(trace.slice(postIndex + 1).some(entry => entry.method === 'GET' && entry.url.endsWith('/care-logs') && entry.responseData.some(row => row.id === post.responseData.id)));
const mobile = await json('mobile-results.json');
assert.equal(mobile.clientWidth, mobile.scrollWidth);
assert.equal(mobile.lang, 'vi');
for (const chart of mobile.charts) {
  assert.equal(chart.bandOpacity, '0.18');
  assert.ok(chart.bandHeight > 0 && chart.bandWidth > 0);
}
const proof = await json('overview-proof.json');
const zone = proof.overview.zones.find(zone => zone.code === 'zoneA');
assert.deepEqual(proof.statuses, Object.values(zone.metrics).map(metric => metric.status));
assert.equal(zone.metrics.soilMoisture.targetMin, 70);
assert.equal(zone.metrics.soilMoisture.targetMax, 80);
console.log('PASS: real authenticated range refetches, server statuses, three target bands, care POST 201 and list refetch, Vietnamese mobile layout.');
