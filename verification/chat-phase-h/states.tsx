// Isolated state tests: actual ChatPanel/hook/API, simulated adapter, no LLM cost.
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AxiosError } from 'axios';
import client from '../../src/api/client';
import ChatPanel from '../../src/components/ChatPanel';
import '../../src/styles/index.css';

let failNext = false;
const requests: { question: string; timeout: number | undefined }[] = [];
client.defaults.adapter = async config => {
  const question = (JSON.parse(String(config.data)) as { question: string }).question;
  requests.push({ question, timeout: config.timeout });
  document.getElementById('request-report')!.textContent = JSON.stringify(requests);
  const failure = failNext;
  failNext = false;
  await new Promise(resolve => setTimeout(resolve, 3000));
  if (failure) throw new AxiosError('RAW_DETAILS_MUST_NOT_RENDER', 'ERR_BAD_RESPONSE', config, undefined,
    { status: 503, statusText: 'Unavailable', headers: {}, config, data: { message: 'RAW_DETAILS_MUST_NOT_RENDER' } });
  return { status: 200, statusText: 'OK', headers: {}, config,
    data: { answer: '[modelUsed=deepseek/deepseek-flash] **Phản hồi mô phỏng** cho câu hỏi: ' + question } };
};

createRoot(document.getElementById('root')!).render(<BrowserRouter>
  <main className="bg-bg text-text min-h-dvh p-4 space-y-4">
    <h1>Verification fixture — simulated responses, no live data</h1>
    <button className="min-h-11 border border-border rounded-lg px-3" onClick={() => { failNext = true; }}>Fail next request</button>
    <section data-testid="full-panel" className="h-[600px]"><ChatPanel variant="full" /></section>
    <section data-testid="compact-panel"><h2>Compact variant</h2><ChatPanel variant="compact" /></section>
    <pre id="request-report" data-testid="request-report" className="text-xs whitespace-pre-wrap" />
  </main>
</BrowserRouter>);
