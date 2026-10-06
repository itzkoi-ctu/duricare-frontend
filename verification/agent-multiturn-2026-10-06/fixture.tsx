import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { StrictMode } from 'react';
import AgentPage from '../../src/pages/AgentPage';
import client from '../../src/api/client';
import { bindAuthSession } from '../../src/api/authSessionBridge';
import '../../src/styles/index.css';
import '../../src/i18n';

client.defaults.baseURL = 'http://127.0.0.1:5189/api';
bindAuthSession({ getAccessToken: () => 'TEST-in-memory', replaceAccessToken: () => false, invalidate: () => {} });
createRoot(document.getElementById('root')!).render(<StrictMode><MemoryRouter initialEntries={['/agent?zoneCode=TEST-ZONE']}>
  <p className="p-3 text-xs text-gray">TEST — dữ liệu mô phỏng, chỉ kiểm tra trạng thái frontend</p><AgentPage />
</MemoryRouter></StrictMode>);
