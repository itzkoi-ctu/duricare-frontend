// Verification only: the real application, HTTP adapter and auth interceptors.
import './network';
const farmId = new URLSearchParams(location.search).get('farmId');
history.replaceState(null, '', `/settings/farm?nofixture=true${farmId ? `&farmId=${encodeURIComponent(farmId)}` : ''}`);
await import('../../src/main');
