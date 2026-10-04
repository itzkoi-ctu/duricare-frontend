// Verification only: real application and real HTTP adapter; no mocked responses.
import './network';
history.replaceState(null, '', '/zones/zoneA?nofixture=true');
await import('../../src/main');
