# Phase F verification

Four overview screenshots use uncached live GET /api/alerts?resolved=false and show HARD and AGENTIC alerts.

The actual browser resolve test marked alert #16 (zoneA, AIR_HUMIDITY, INFO) resolved, HTTP 200, reducing the list from 5 to 4. See resolve-response.json and verification.json. No alerts were created for verification.

resolve-before.png and resolve-after.png are original screenshots around that live click. They captured asynchronous web fonts before loading completed. The additional fonts-ready pair provides a readable comparison: its before image replays the saved alerts-before.json response, and its after image fetches current live data. No second resolve action was performed.

Client-side filters, zone query initialization, newest-first order, optimistic removal and 500 rollback/toast, loading/error/retry, both empty states, and a registered 60-second refresh callback were verified. The callback was invoked directly in browser instrumentation to observe a live refetch without waiting a minute. The only console error was the deliberate mocked 500 response.

PATCH was absent from the backend CORS methods; it was added and the backend restarted. Live OPTIONS now permits PATCH.
