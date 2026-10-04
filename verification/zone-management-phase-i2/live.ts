// Real application and HTTP adapter; no substituted data in live verification.
import './network';
const farmId = new URLSearchParams(location.search).get('farmId');
history.replaceState(null, '', `/settings/zones?nofixture=true${farmId ? `&farmId=${encodeURIComponent(farmId)}` : ''}`);
await import('../../src/main');
