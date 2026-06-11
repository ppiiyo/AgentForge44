import React, { useState } from 'react';
import { FlowNode } from '../../../src/types';
import { Globe, Settings, Terminal, Play, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

interface ToolNodeSettingsProps {
  node: FlowNode;
  nodes: FlowNode[];
  onUpdateField: (nodeId: string, fieldKey: string, value: any) => void;
  currentLang?: 'en' | 'ru' | 'zh';
}

const TRANSLATIONS = {
  en: {
    url: 'Endpoint URL',
    urlPlaceholder: 'https://api.example.com/data',
    method: 'HTTP Request Method',
    variablesBadge: 'Click to add variable placeholder:',
    headersLabel: 'HTTP Request Headers (JSON dictionary)',
    bodyLabel: 'HTTP Request Body (Template or JSON string)',
    testBtn: 'Test API Endpoint Request',
    testingState: 'Executing API Connection Test...',
    jsonErr: 'Invalid JSON structural syntax.',
    testModalTitle: 'API Client Response Sandbox Viewer',
    status: 'Status',
    urlDesc: 'Variables placeholder {{variable}} supported.',
    headersDesc: 'Headers map list to authorize outer API keys.'
  },
  ru: {
    url: 'Адрес API-запроса (URL)',
    urlPlaceholder: 'https://api.example.com/data',
    method: 'Метод HTTP-запроса',
    variablesBadge: 'Вставить переменную кликом:',
    headersLabel: 'Заголовки HTTP-запроса Headers (JSON-словарь)',
    bodyLabel: 'Тело запроса Body (Текст или JSON-строка)',
    testBtn: 'Протестировать API-запрос',
    testingState: 'Выполняем запрос на сервер...',
    jsonErr: 'Ошибка синтаксиса JSON.',
    testModalTitle: 'Окно отладки и тестирования API-запроса',
    status: 'Статус ответа',
    urlDesc: 'Поддерживаются параметры шаблонов переменных {{variable}}.',
    headersDesc: 'Добавьте Bearer Authorization или Content-Type.'
  },
  zh: {
    url: '外部请求 API 地址 (URL)',
    urlPlaceholder: 'https://api.example.com/data',
    method: 'HTTP 请求方法',
    variablesBadge: '点击绑定模板变量占位符:',
    headersLabel: '请求头 Headers (JSON 字典结构)',
    bodyLabel: '请求主内容 Body (模板或 JSON 字符串形式)',
    testBtn: '沙盒执行 API 接口请求测试',
    testingState: '正在发起网络请求...',
    jsonErr: 'JSON 语法检测异常。',
    testModalTitle: '外部 API 接口网络联调监视器',
    status: '状态码',
    urlDesc: '支持使用 {{variable}} 语法填充动态上下文变量。',
    headersDesc: '可用于填写 Bearer Authorization 鉴权或特殊 header 域。'
  }
};

export const ToolNodeSettings: React.FC<ToolNodeSettingsProps> = ({
  node,
  nodes,
  onUpdateField,
  currentLang = 'en'
}) => {
  if (node.type !== 'tool') return null;

  const url = node.fields.url || '';
  const method = node.fields.method || 'GET';
  const headers = node.fields.headers || '{}';
  const body = node.fields.body || '';

  const [testResult, setTestResult] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Parse check for headers & body validity
  const isHeaderValid = (() => {
    if (!headers.trim()) return true;
    try {
      JSON.parse(headers);
      return true;
    } catch {
      return false;
    }
  })();

  const isBodyValid = (() => {
    if (!body.trim()) return true;
    try {
      JSON.parse(body);
      return true;
    } catch {
      return false;
    }
  })();

  // Variable badges to click and insert at cursor/append
  const availableVariables = (() => {
    const inputNode = nodes.find(n => n.type === 'input') as any;
    if (inputNode && inputNode.fields.variables) {
      return inputNode.fields.variables.map((v: any) => v.key);
    }
    return ['topic', 'input'];
  })();

  const handleInsertVariable = (variableKey: string, targetField: 'url' | 'body') => {
    const placeholder = `{{${variableKey}}}`;
    if (targetField === 'url') {
      onUpdateField(node.id, 'url', url + placeholder);
    } else {
      onUpdateField(node.id, 'body', body + placeholder);
    }
  };

  const handleTestRequest = async () => {
    setTesting(true);
    setTestResult(null);
    setIsModalOpen(true);
    try {
      // Direct client check proxy (using fetch)
      // Substitutions for testing
      let substitutedUrl = url;
      let substitutedBody = body;
      let substitutedHeaders = headers;

      // Mock variables evaluation similar to execution template replacement
      const inputNode = nodes.find(n => n.type === 'input') as any;
      const vars: Record<string, string> = {};
      if (inputNode && inputNode.fields.variables) {
        inputNode.fields.variables.forEach((v: any) => {
          if (v.key) vars[v.key] = v.value;
        });
      }

      Object.entries(vars).forEach(([k, v]) => {
        const regex1 = new RegExp(`\\{${k}\\}`, 'g');
        substitutedUrl = substitutedUrl.replace(regex1, String(v));
        substitutedBody = substitutedBody.replace(regex1, String(v));
        substitutedHeaders = substitutedHeaders.replace(regex1, String(v));

        const regex2 = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
        substitutedUrl = substitutedUrl.replace(regex2, String(v));
        substitutedBody = substitutedBody.replace(regex2, String(v));
        substitutedHeaders = substitutedHeaders.replace(regex2, String(v));
      });

      let headersObj: Record<string, string> = { "Content-Type": "application/json" };
      try {
        if (substitutedHeaders.trim()) {
          headersObj = { ...headersObj, ...JSON.parse(substitutedHeaders) };
        }
      } catch {}

      const fetchOptions: any = {
        method,
        headers: headersObj
      };
      if (method !== 'GET' && substitutedBody) {
        fetchOptions.body = substitutedBody;
      }

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const res = await fetch(substitutedUrl, { ...fetchOptions, signal: controller.signal });
      clearTimeout(id);

      const status = res.status;
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        responseHeaders[k] = v;
      });

      const responseText = await res.text();
      let responseJson = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {}

      setTestResult({
        success: res.ok,
        status,
        url: substitutedUrl,
        headers: responseHeaders,
        body: responseJson || responseText
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || String(err)
      });
    } finally {
      setTesting(false);
    }
  };

  const text = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{text.url}</label>
        <div className="relative">
          <input
            type="text"
            placeholder={text.urlPlaceholder}
            value={url}
            onChange={(e) => onUpdateField(node.id, 'url', e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none font-mono"
          />
        </div>
        <p className="text-[9px] text-slate-500 leading-tight">{text.urlDesc}</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{text.method}</label>
        <div className="flex gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-900">
          {(['GET', 'POST', 'PUT', 'DELETE'] as const).map(m => (
            <button
              id={`method-${m}`}
              key={m}
              onClick={() => onUpdateField(node.id, 'method', m)}
              className={`flex-1 text-center py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${
                method === m
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-[9px] font-bold text-slate-500 uppercase block">{text.variablesBadge}</span>
        <div className="flex flex-wrap gap-1">
          {availableVariables.map((v: string) => (
            <button
              id={`badge-insert-${v}`}
              key={v}
              onClick={() => handleInsertVariable(v, 'url')}
              className="text-[9px] px-2 py-0.5 rounded bg-blue-950/40 text-blue-400 hover:bg-blue-950/80 border border-blue-900/30 transition-all font-mono"
            >
              +{v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{text.headersLabel}</label>
          {!isHeaderValid && <span className="text-[9px] text-rose-400 font-bold">{text.jsonErr}</span>}
        </div>
        <textarea
          placeholder='{"Authorization": "Bearer api_key"}'
          value={headers}
          onChange={(e) => onUpdateField(node.id, 'headers', e.target.value)}
          className={`w-full h-16 bg-slate-950 border ${!isHeaderValid ? 'border-rose-900/40 focus:border-rose-500' : 'border-slate-900 focus:border-rose-500/40'} rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300 focus:outline-none`}
        />
        <p className="text-[9px] text-slate-500 leading-tight">{text.headersDesc}</p>
      </div>

      {method !== 'GET' && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{text.bodyLabel}</label>
            {!isBodyValid && <span className="text-[9px] text-rose-400 font-bold">{text.jsonErr}</span>}
          </div>
          <div className="mb-1 flex flex-wrap gap-1">
            {availableVariables.map((v: string) => (
              <button
                id={`badge-insert-body-${v}`}
                key={v}
                onClick={() => handleInsertVariable(v, 'body')}
                className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-400 hover:bg-purple-950/80 border border-purple-900/30 transition-all font-mono"
              >
                +body:{v}
              </button>
            ))}
          </div>
          <textarea
            placeholder='{"prompt": "{{prompt_output}}"}'
            value={body}
            onChange={(e) => onUpdateField(node.id, 'body', e.target.value)}
            className={`w-full h-32 bg-slate-950 border ${!isBodyValid ? 'border-rose-900/40 focus:border-rose-500' : 'border-slate-900 focus:border-rose-500/40'} rounded-lg px-2.5 py-2.5 text-xs font-mono text-slate-300 focus:outline-none`}
          />
        </div>
      )}

      {/* Real-time TEST Request button */}
      <button
        onClick={handleTestRequest}
        className="w-full text-xs font-bold uppercase py-2 px-3 border border-rose-500/20 hover:border-rose-500/45 text-rose-400 hover:text-rose-300 bg-rose-950/15 hover:bg-rose-950/30 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        id={`btn-api-custom-tool-test-${node.id}`}
      >
        <Globe size={13} className="animate-pulse" />
        <span>{text.testBtn}</span>
      </button>

      {/* RESPONSIVE TESTING DIALOG MODAL POPUP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Globe size={16} className="text-rose-400" />
                {text.testModalTitle}
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 font-bold transition-all p-1 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {testing ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3.5">
                  <span className="w-8 h-8 rounded-full border-2 border-t-rose-455 border-slate-800 animate-spin"></span>
                  <p className="text-xs font-semibold text-rose-400 animate-pulse">{text.testingState}</p>
                </div>
              ) : (
                testResult && (
                  <div className="space-y-4 text-xs font-mono leading-relaxed" id="test-sandbox-result">
                    {testResult.error ? (
                      <div className="p-4 rounded-xl border border-rose-900/30 bg-rose-950/10 text-rose-400 flex items-start gap-2.5">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-rose-300 uppercase shrink-0">Request Connect Terminated</h4>
                          <p className="mt-1">{testResult.error}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2.5 items-center justify-between bg-slate-850 p-3 rounded-xl border border-slate-800">
                          <div>
                            <span className="text-slate-500 font-bold uppercase block text-[9px] mb-0.5">Request URL Target</span>
                            <span className="text-slate-200 text-[11px] truncate block max-w-md">{testResult.url}</span>
                          </div>
                          <div>
                            <span className={`px-3 py-1 rounded text-xs font-extrabold uppercase ${testResult.success ? 'bg-emerald-950/60 text-emerald-450 border border-emerald-900/30' : 'bg-rose-950/50 text-rose-400 border border-rose-900/30'}`}>
                              {text.status}: {testResult.status}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 bg-slate-950 p-4 rounded-xl border border-slate-900 max-h-80 overflow-y-auto">
                          <span className="text-slate-500 block uppercase text-[9px] pb-1 border-b border-slate-900 mb-2 font-bold">Headers Payload</span>
                          <pre className="text-sky-300 text-[10px] whitespace-pre-wrap">{JSON.stringify(testResult.headers, null, 2)}</pre>
                        </div>

                        <div className="space-y-1.5 bg-slate-950 p-4 rounded-xl border border-slate-900 max-h-96 overflow-y-auto">
                          <span className="text-slate-500 block uppercase text-[9px] pb-1 border-b border-slate-900 mb-2 font-bold">Response Body Payload</span>
                          <pre className="text-emerald-400 text-[11px] whitespace-pre-wrap leading-relaxed">{typeof testResult.body === 'object' ? JSON.stringify(testResult.body, null, 2) : testResult.body}</pre>
                        </div>
                      </>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex justify-end bg-slate-950">
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-bold px-4 py-2 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-350 cursor-pointer"
              >
                Close Trace Sandbox
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
