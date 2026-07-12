import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Database, Terminal, Sparkles, CheckSquare, GitBranch, Globe, 
  BookOpen, Layers, FileCode, History, Trash, FolderPlus, Compass, X,
  Clock, Cpu, Settings, Code, FileJson, Download
} from 'lucide-react';
import { FlowNode, NodeType } from '../../../types';
import { exportSnapshotsToZip } from '../../../utils/zipExporter';

const nodeDocMap: Record<NodeType, {
  purpose: { en: string; ru: string; zh: string };
  inputs: { en: string; ru: string; zh: string };
  outputs: { en: string; ru: string; zh: string };
  tip: { en: string; ru: string; zh: string };
}> = {
  input: {
    purpose: {
      en: "Define initial parameters and environment variables for the flow.",
      ru: "Задайте стартовые параметры и переменные среды для вашего графа.",
      zh: "定义工作流的初始参数和环境变量。"
    },
    inputs: {
      en: "Manual text inputs or API forms.",
      ru: "Ручной ввод текста или формы API.",
      zh: "手动输入或 API 提交表单。"
    },
    outputs: {
      en: "Keys like {{topic}} or {{query}}.",
      ru: "Ключи вроде {{topic}} или {{query}}.",
      zh: "产生变量如 {{topic}} 或 {{query}}。"
    },
    tip: {
      en: "Define unique variable keys. Downstream prompt builders will auto-detect these.",
      ru: "Задавайте уникальные ключи. Последующие блоки промптов автоматически их распознают.",
      zh: "定义唯一的变量名。下游的提示词构建单元会自动检测并提示。"
    }
  },
  prompt: {
    purpose: {
      en: "Inject dynamic variables into structured templates for LLMs.",
      ru: "Подставляйте динамические переменные в структурированные шаблоны.",
      zh: "将动态变量注入结构化提示词模板，供 LLM 消费。"
    },
    inputs: {
      en: "Braced variables like {topic}.",
      ru: "Переменные в скобках {topic}.",
      zh: "带大括号的变量如 {topic}。"
    },
    outputs: {
      en: "Compiled system prompts text.",
      ru: "Скомпилированный текст промпта.",
      zh: "最终渲染完成的提示词文本。"
    },
    tip: {
      en: "Keep templates clean. Avoid trailing white space to prevent token overhead.",
      ru: "Пишите шаблоны аккуратно. Избегайте пробелов в конце для экономии токенов.",
      zh: "模板应当简洁。避免末尾多余空格，以节省 token 消耗。"
    }
  },
  gemini: {
    purpose: {
      en: "Send dynamic prompts to the state-of-the-art Google Gemini API.",
      ru: "Отправляйте промпты в передовые модели Google Gemini API.",
      zh: "将提示词和上下文发送给高智能的 Google Gemini 接口进行生成。"
    },
    inputs: {
      en: "Prompts and system instructions.",
      ru: "Инструкции и входной текст.",
      zh: "用户提示词与系统提示词。"
    },
    outputs: {
      en: "Generated textual reasoning response.",
      ru: "Сгенерированный текстовый ответ.",
      zh: "模型生成的深层文本解答。"
    },
    tip: {
      en: "Enable Google Search Grounding to let the model fetch verified real-time web facts.",
      ru: "Включите Google Search Grounding, чтобы модель искала актуальные факты в сети.",
      zh: "勾选“谷歌搜索地基”，模型即可自动检索实时互联网信息来佐证解答。"
    }
  },
  reviewer: {
    purpose: {
      en: "Provide a critique loop that self-corrects results against criteria.",
      ru: "Реализуйте цикл самопроверки и исправления по заданным критериям.",
      zh: "建立自动化审查机制，对不合规的生成内容进行循环自我纠偏。"
    },
    inputs: {
      en: "Output text, criteria, max loops.",
      ru: "Текст, критерии, лимит циклов.",
      zh: "审查文本、评价准则、最大循环数。"
    },
    outputs: {
      en: "Refined and validated text block.",
      ru: "Очищенный и валидный текст.",
      zh: "完美契合审查规范 of 最终文本。"
    },
    tip: {
      en: "Self-correction is great for strict structural compliance like JSON validation.",
      ru: "Самопроверка идеально подходит для строгого соблюдения форматов, например JSON.",
      zh: "该模块极其适合对生成格式有苛刻要求的场景，例如 JSON 格式校验器。"
    }
  },
  router: {
    purpose: {
      en: "Evaluate conditions and branch workflow execution dynamically.",
      ru: "Проверяйте условия и динамически перенаправляйте поток исполнения.",
      zh: "根据指定的条件规则，将执行流分发到不同的后续分支。"
    },
    inputs: {
      en: "Variables and comparison values.",
      ru: "Переменные и условия проверки.",
      zh: "变量提取物与条件判定值。"
    },
    outputs: {
      en: "Rerouted active downstream branch.",
      ru: "Переход на выбранную ветку графа.",
      zh: "执行目标下游节点的激活状态。"
    },
    tip: {
      en: "Always configure a fallback path to prevent execution halts on unexpected data.",
      ru: "Всегда настраивайте ветку по умолчанию, чтобы избежать остановок при нетипичных данных.",
      zh: "请务必设置默认兜底分支，防范未预料数据导致的工作流阻塞。"
    }
  },
  tool: {
    purpose: {
      en: "Execute standard outbound HTTP requests to fetch external live payloads.",
      ru: "Выполняйте стандартные HTTP-запросы для получения внешних данных.",
      zh: "发起出站 HTTP 接口调用，无缝同步拉取外部实时系统数据。"
    },
    inputs: {
      en: "URL, headers, query, body.",
      ru: "URL, заголовки, параметры, тело.",
      zh: "URL、标头、查询参数和正文。"
    },
    outputs: {
      en: "Response JSON/text strings.",
      ru: "JSON или текст ответа сервера.",
      zh: "接口响应的 JSON 文本。"
    },
    tip: {
      en: "Use syntax like {{topic}} inside body or headers to insert dynamic data.",
      ru: "Используйте {{topic}} в теле запроса для отправки динамических данных.",
      zh: "可在 Request Body 或 Header 里声明 {{topic}}，运行时会自动替换成真实数据。"
    }
  },
  webhook: {
    purpose: {
      en: "Dispatch pipeline final summaries directly to external REST hooks.",
      ru: "Отправляйте итоговые результаты работы графа на внешние обработчики.",
      zh: "当整条流水线跑完后，将最终总结数据一键回传给你的外部接收系统。"
    },
    inputs: {
      en: "Target URL and payload config.",
      ru: "Целевой URL и формат данных.",
      zh: "接收端 URL 与自定义回传载荷。"
    },
    outputs: {
      en: "HTTP delivery status codes.",
      ru: "Код статуса доставки (200 OK).",
      zh: "HTTP 发送状态（例如 200/201）。"
    },
    tip: {
      en: "Excellent for triggering automations in external suites like Zapier or Slack.",
      ru: "Идеально подходит для запуска сценариев автоматизации в Zapier или Slack.",
      zh: "与 Zapier、Make、钉钉或企业微信群聊机器人集成时效果拔群。"
    }
  },
  rag: {
    purpose: {
      en: "Query local workspace vector indices for matching knowledge chunks.",
      ru: "Ищите релевантные фрагменты знаний в локальном векторном хранилище.",
      zh: "在本地工作区上传的知识库中，根据问题进行检索并返回语义最贴切的知识片段。"
    },
    inputs: {
      en: "Queries and slice limits.",
      ru: "Текст запроса и лимит выдачи.",
      zh: "检索问题及检索条数上限。"
    },
    outputs: {
      en: "Semantic matching document facts.",
      ru: "Подходящие фрагменты документов.",
      zh: "与问题契合的最优文档知识。"
    },
    tip: {
      en: "Upload your company wikis or files in the RAG Library tab before querying here.",
      ru: "Загрузите вики-файлы вашей компании во вкладке Библиотека RAG перед поиском.",
      zh: "查询前，请确保已在右侧 RAG 知识库面板里上传了对应的 PDF 或文本文件。"
    }
  },
  'vector-search': {
    purpose: {
      en: "Perform enterprise search using high-fidelity relational PGVector stores.",
      ru: "Производите высокоточный поиск в реляционной базе данных PGVector.",
      zh: "利用关系型数据库自带的 PGVector 索引完成企业级的高精度语义匹配。"
    },
    inputs: {
      en: "Query strings, distance metrics.",
      ru: "Строки запросов и метрики.",
      zh: "查询条件、距离计算度量参数。"
    },
    outputs: {
      en: "Validated structured context blocks.",
      ru: "Верифицированные блоки контекста.",
      zh: "经关系索引校准的知识块。"
    },
    tip: {
      en: "Provides massive scalability advantages for search volumes on shared infrastructure.",
      ru: "Обеспечивает отличную масштабируемость поиска на общей инфраструктуре.",
      zh: "在高访问、大体量的生产环境中，其速度 and 扩展能力明显优于常规向量库。"
    }
  },
  multimodal: {
    purpose: {
      en: "Analyze diverse files like PDFs, tables, or audio directly via Gemini Multimodal.",
      ru: "Анализируйте файлы (PDF, таблицы, аудио) через мультимодальные модели Gemini.",
      zh: "利用 Gemini 的多模态能力直接分析或转换 PDF、复杂表格、图片及音频等文件。"
    },
    inputs: {
      en: "File data and analysis prompt.",
      ru: "Данные файлов и запрос на анализ.",
      zh: "文件介质及指定解析指令。"
    },
    outputs: {
      en: "Extracted structural texts/schemas.",
      ru: "Извлеченные структуры или схемы.",
      zh: "抽取出的表单参数、音频转文字或大纲。"
    },
    tip: {
      en: "Perfect for OCR-parsing tables from scans or analyzing graphs with precise results.",
      ru: "Отлично подходит для распознавания таблиц по сканам или точного чтения графиков.",
      zh: "极其适合用来做纸质账单自动 OCR 结构化、图标报表解读或音频会后纪要。"
    }
  },
  human_confirmation: {
    purpose: {
      en: "Halt agent flow execution until an operator confirms or edits data.",
      ru: "Приостановите выполнение до ручного подтверждения оператором.",
      zh: "暂停流水线执行，直到操作员手动确认安全或修改中间状态数据后方可继续。"
    },
    inputs: {
      en: "Notification text and action options.",
      ru: "Сообщение и варианты действий.",
      zh: "提示说明文本、行为选项列表。"
    },
    outputs: {
      en: "Operator confirmation status payload.",
      ru: "Статус и данные ответа оператора.",
      zh: "批准/拒绝信号以及审阅后的参数。"
    },
    tip: {
      en: "Use to safeguard critical downstream actions like database writes or API triggers.",
      ru: "Используйте для защиты критических действий вроде перезаписи баз данных.",
      zh: "常用于防止资金拨付、删除数据库等高风险场景，给 AI 戴上坚实的方向阀。"
    }
  },
  prompt_optimizer: {
    purpose: {
      en: "Enhance prompts automatically with Few-Shot and CoT structures.",
      ru: "Автоматически улучшайте промпты с помощью техник Few-Shot и CoT.",
      zh: "在运行前使用思维链（CoT）和少样本模板自动调优原始指令。"
    },
    inputs: {
      en: "Original prompt and target persona.",
      ru: "Исходный промпт и роль.",
      zh: "原始普通提问、想要模拟的专家角色。"
    },
    outputs: {
      en: "High-performance reasoning instructions.",
      ru: "Оптимизированный сложный промпт.",
      zh: "经过几轮优化后极具启发式的提示词。"
    },
    tip: {
      en: "Perfect for translating simple user queries into rich engineering instructions.",
      ru: "Прекрасно преобразует простые запросы пользователей в глубокие инструкции.",
      zh: "用户输入过于口语化时，加塞这层优化能在 Gemini 交互时获得极大成效。"
    }
  },
  output: {
    purpose: {
      en: "Collect and render final answers nicely using Rich Markdown support.",
      ru: "Собирайте и красиво отображайте ответы в формате Markdown.",
      zh: "收拢前续流程产生的结果，支持用高级 Markdown 格式做精美可视化呈现。"
    },
    inputs: {
      en: "Completed flow texts/payloads.",
      ru: "Текст ответа от предыдущих блоков.",
      zh: "整条流程最后的文本或表格产物。"
    },
    outputs: {
      en: "Rendered rich-text display card.",
      ru: "Красиво оформленная карточка.",
      zh: "排版规范的纯网页预览视图。"
    },
    tip: {
      en: "Connect this node at the absolute end of the graph to visualize the overall outcome.",
      ru: "Подключайте этот блок в самом конце графа для визуализации всех результатов.",
      zh: "通常建议将此节点设为全图의 终极末梢，便于用户一目了然最终交付状态。"
    }
  },
  debate: {
    purpose: {
      en: "Conduct a structured debate between two specialized agents with consensus arbitration.",
      ru: "Проводите структурированные дебаты между специализированными агентами с арбитражем консенсуса.",
      zh: "在两个特定视角的智能体之间开展结构化辩论，并由裁判进行共识裁决。"
    },
    inputs: {
      en: "Debate topic, pro persona, contra persona, rounds, arbiter instruction.",
      ru: "Тема дебатов, роль PRO, роль CON, число раундов, инструкция арбитру.",
      zh: "辩论主题、支持角色、反对角色、轮数、裁判指令。"
    },
    outputs: {
      en: "Synthesized multi-agent debate and consensus report transcript.",
      ru: "Синтезированная стенограмма дебатов и консенсусный отчет.",
      zh: "经裁判综合两方观点后产出的辩论实录及最终共识报告。"
    },
    tip: {
      en: "Provide highly distinct and opinionated personas for each agent to drive deeper synthesis.",
      ru: "Задавайте детальные полярные роли агентам, чтобы арбитр мог собрать более глубокий консенсус.",
      zh: "为双方配置极具差异化和态度的独立人格，能帮助裁判挖掘出更深刻的融合观点。"
    }
  }
};

interface ToolboxProps {
  currentLang: 'en' | 'ru' | 'zh';
  onCreateNode: (type: NodeType, customFields?: any, customTitle?: string) => void;
  savedSnapshots: Array<{
    id: string;
    name: string;
    timestamp: string;
  }>;
  onRestoreSnapshot: (id: string) => void;
  onDeleteSnapshot: (id: string, e: React.MouseEvent) => void;
  onSaveSnapshot: () => void;
  projectNameInput: string;
  onProjectNameInputChange: (val: string) => void;
  onSaveProjectToServer: (name: string) => void;
  savingProject: boolean;
  serverProjects: Array<{
    name: string;
  }>;
  loadingProjects: boolean;
  currentSavedProjectName: string | null;
  onLoadProjectFromServer: (proj: any) => void;
  onClose?: () => void;
}

export const Toolbox: React.FC<ToolboxProps> = ({
  currentLang,
  onCreateNode,
  savedSnapshots,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onSaveSnapshot,
  projectNameInput,
  onProjectNameInputChange,
  onSaveProjectToServer,
  savingProject,
  serverProjects,
  loadingProjects,
  currentSavedProjectName,
  onLoadProjectFromServer,
  onClose
}) => {
  const { t } = useTranslation();
  const [toolboxSearch, setToolboxSearch] = useState<string>("");
  const [swaggerInput, setSwaggerInput] = useState<string>("");
  const [swaggerError, setSwaggerError] = useState<string>("");
  const [swaggerSuccess, setSwaggerSuccess] = useState<string>("");
  const [selectedDocType, setSelectedDocType] = useState<NodeType>('gemini');

  const creators = [
    { type: 'input' as NodeType, label: 'Inputs', desc: 'Variables parameters', color: 'hover:border-blue-500/40 hover:bg-blue-950/10', keywords: ['variables', 'parameters', 'arguments', 'start', 'initial', 'inputs', 'data'] },
    { type: 'prompt' as NodeType, label: 'Prompt Template', desc: 'Formula parameters', color: 'hover:border-purple-500/40 hover:bg-purple-950/10', keywords: ['template', 'formula', 'prompt', 'format', 'text', 'instructions'] },
    { type: 'gemini' as NodeType, label: 'Gemini LLM', desc: 'Trigger twin core reasoning models', color: 'hover:border-teal-500/40 hover:bg-teal-950/10', keywords: ['gemini', 'llm', 'ai', 'google', 'search', 'grounding', 'reasoning', 'text', 'intelligence'] },
    { type: 'reviewer' as NodeType, label: 'Critique Review', desc: 'Feedback loops system rules', color: 'hover:border-amber-500/40 hover:bg-amber-950/10', keywords: ['critique', 'review', 'feedback', 'loop', 'rules', 'correct', 'self-heal', 'logic', 'validate', 'reviewer'] },
    { type: 'router' as NodeType, label: 'Router (If-Else)', desc: 'Condition route switch', color: 'hover:border-sky-500/40 hover:bg-sky-950/10', keywords: ['router', 'if-else', 'condition', 'branch', 'route', 'switch', 'logic', 'split', 'decision'] },
    { type: 'tool' as NodeType, label: 'HTTP API Custom Tool', desc: 'Execute outer REST fetch', color: 'hover:border-rose-500/40 hover:bg-rose-950/10', keywords: ['http', 'api', 'custom', 'tool', 'outer', 'rest', 'fetch', 'request', 'csv', 'json', 'data', 'integration'] },
    { type: 'webhook' as NodeType, label: 'Outbound Webhook', desc: 'Trigger external HTTP POST callbacks', color: 'hover:border-pink-500/40 hover:bg-pink-950/10', keywords: ['outbound', 'webhook', 'post', 'callback', 'slack', 'zapier', 'event', 'trigger', 'dispatch'] },
    { type: 'rag' as NodeType, label: 'RAG Knowledge Search', desc: 'Semantic Vector Db lookup', color: 'hover:border-teal-500/40 hover:bg-teal-950/10', keywords: ['rag', 'knowledge', 'search', 'vector', 'lookup', 'index', 'document', 'pdf', 'text', 'store'] },
    { type: 'vector-search' as NodeType, label: 'PGVector Search', desc: 'Secure PGVector DB RAG lookup', color: 'hover:border-cyan-500/40 hover:bg-cyan-950/10', keywords: ['pgvector', 'postgres', 'database', 'rag', 'lookup', 'search', 'sql', 'query'] },
    { type: 'multimodal' as NodeType, label: 'Multimodal (PDF/Audio/Excel)', desc: 'Process documents pipeline', color: 'hover:border-amber-500/40 hover:bg-amber-950/10', keywords: ['multimodal', 'pdf', 'audio', 'excel', 'csv', 'image', 'file', 'binary', 'document', 'sheets'] },
    { type: 'human_confirmation' as NodeType, label: 'Human confirmation', desc: 'Approve execution pipeline', color: 'hover:border-rose-600/40 hover:bg-rose-950/10', keywords: ['human', 'confirmation', 'approve', 'gate', 'pause', 'operator', 'logic', 'wait', 'manual'] },
    { type: 'prompt_optimizer' as NodeType, label: 'Prompt Optimizer', desc: 'Few-Shot COT prompt helper', color: 'hover:border-emerald-500/40 hover:bg-emerald-950/10', keywords: ['prompt', 'optimizer', 'few-shot', 'cot', 'helper', 'ai', 'llm', 'tune'] },
    { type: 'output' as NodeType, label: 'Outputs', desc: 'Compiled visual payload', color: 'hover:border-indigo-500/40 hover:bg-indigo-950/10', keywords: ['outputs', 'compiled', 'payload', 'markdown', 'render', 'end', 'result', 'display'] }
  ];

  const filteredCreators = creators.filter(tb => {
    if (!toolboxSearch) return true;
    const s = toolboxSearch.toLowerCase();
    return (
      tb.label.toLowerCase().includes(s) || 
      tb.type.toLowerCase().includes(s) || 
      tb.desc.toLowerCase().includes(s) ||
      tb.keywords.some(kw => kw.toLowerCase().includes(s))
    );
  });

  const handleImportSwagger = () => {
    setSwaggerError("");
    setSwaggerSuccess("");
    if (!swaggerInput.trim()) {
      setSwaggerError("Please enter Swagger JSON/YAML specs.");
      return;
    }

    try {
      // Very robust parser that can handle both clean JSON and partial object definitions
      let parsed: any;
      try {
        parsed = JSON.parse(swaggerInput);
      } catch {
        // Fallback: try evaluating as single object
        parsed = Function(`return (${swaggerInput})`)();
      }

      if (!parsed || typeof parsed !== 'object') {
        throw new Error("Specified text does not represent a valid OpenAPI/Swagger schema structure.");
      }

      const paths = parsed.paths || {};
      const host = parsed.host || parsed.servers?.[0]?.url || "https://api.example.com";
      const basePath = parsed.basePath || "";
      const baseFinalUrl = host.startsWith("http") ? `${host}${basePath}` : `https://${host}${basePath}`;

      let added = 0;
      Object.keys(paths).forEach(pathName => {
        const pathObj = paths[pathName];
        Object.keys(pathObj).forEach(method => {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
            const endpoint = pathObj[method];
            const originalTitle = endpoint.summary || endpoint.operationId || `API ${method.toUpperCase()} ${pathName}`;
            
            const customFields = {
              url: `${baseFinalUrl}${pathName}`,
              method: method.toUpperCase(),
              headers: '{"Content-Type": "application/json"}',
              body: method.toLowerCase() !== 'get' ? '{\n  "query": "{{query}}"\n}' : ''
            };

            onCreateNode('tool', customFields, originalTitle);
            added++;
          }
        });
      });

      if (added > 0) {
        setSwaggerSuccess(currentLang === 'ru' ? `Успешно импортировано ${added} OpenAPI эндпоинтов.` : `Successfully imported ${added} API endpoints.`);
        setSwaggerInput("");
      } else {
        throw new Error("No endpoints matched methods (GET, POST, etc.) in the parsed specification.");
      }
    } catch (e: any) {
      setSwaggerError(e.message || "Failed to process OpenAPI specification.");
    }
  };

  return (
    <aside className="absolute md:relative left-0 top-0 h-full w-full max-w-[320px] md:max-w-none md:w-64 lg:w-72 border-r border-neutral-900 bg-black/95 md:bg-black/50 flex flex-col overflow-y-auto shrink-0 z-30 shadow-volumetric-md md:shadow-none" id="left_toolbox">
      <div className="p-4 border-b border-neutral-900">
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Plus size={14} className="text-zinc-400" /> {t('toolboxHeader')}
          </h3>
          {onClose && (
            <button 
              type="button"
              onClick={onClose}
              className="md:hidden text-zinc-500 hover:text-white p-1.5 hover:bg-zinc-900 rounded-lg transition-all cursor-pointer active:scale-95"
              title="Close Toolbox"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <p className="text-[10px] text-zinc-500 mb-3.5 leading-relaxed">
          {t('toolboxDesc')}
        </p>

        {/* Search tool actions */}
        <div className="mb-3.5 relative">
          <input 
            type="text"
            placeholder={currentLang === 'ru' ? "Поиск инструментов..." : currentLang === 'zh' ? "快速搜索节点..." : "Filter action blocks..."}
            value={toolboxSearch}
            onChange={(e) => setToolboxSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-neutral-900 rounded-lg px-3 py-1.5 text-[10px] text-zinc-350 placeholder-zinc-700 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800"
          />
          {toolboxSearch && (
            <button 
              onClick={() => setToolboxSearch("")} 
              className="absolute right-2.5 top-1.5 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
            >
              &times;
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2" id="toolbox_creators">
          {filteredCreators.map(tb => (
            <button
              id={`btn-add-${tb.type}`}
              key={tb.type}
              onClick={() => onCreateNode(tb.type)}
              className="cursor-pointer border border-neutral-900 bg-zinc-950 text-zinc-400 rounded-lg px-3 py-2 text-xs font-semibold text-left transition-all hover:border-zinc-800 hover:bg-zinc-900 shadow-volumetric-sm hover:scale-[1.01] flex flex-col gap-1"
            >
              <span className="text-[10.5px] text-white flex items-center gap-1.5 capitalize">
                {tb.type === 'input' && <Database size={11} className="text-zinc-500" />}
                {tb.type === 'prompt' && <Terminal size={11} className="text-zinc-500" />}
                {tb.type === 'gemini' && <Sparkles size={11} className="text-white animate-pulse" />}
                {tb.type === 'reviewer' && <CheckSquare size={11} className="text-zinc-500" />}
                {tb.type === 'router' && <GitBranch size={11} className="text-zinc-500" />}
                {tb.type === 'tool' && <Globe size={11} className="text-zinc-500" />}
                {tb.type === 'webhook' && <Globe size={11} className="text-zinc-500" />}
                {tb.type === 'rag' && <BookOpen size={11} className="text-zinc-500" />}
                {tb.type === 'vector-search' && <BookOpen size={11} className="text-zinc-500" />}
                {tb.type === 'multimodal' && <Layers size={11} className="text-zinc-500" />}
                {tb.type === 'output' && <FileCode size={11} className="text-zinc-500" />}
                {tb.type === 'human_confirmation' && <Clock size={11} className="text-zinc-500" />}
                {tb.type === 'prompt_optimizer' && <Cpu size={11} className="text-zinc-500" />}
                {tb.label}
              </span>
              <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">Add block</span>
            </button>
          ))}
        </div>

        {/* Node Documentation collapsible/card UI block */}
        <div className="mt-4 pt-3.5 border-t border-neutral-900 bg-zinc-950/20 p-2.5 rounded-lg border border-neutral-900 shadow-volumetric-sm">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-between gap-1.5 mb-2">
            <span className="flex items-center gap-1.5">
              <BookOpen size={11} className="text-zinc-400" />
              {currentLang === 'ru' ? "Справочник Блоков" : currentLang === 'zh' ? "节点参考文档" : "Node Documentation"}
            </span>
            <span className="text-[8px] bg-zinc-900 text-zinc-400 px-1 py-0.5 rounded uppercase font-mono border border-neutral-800">Guide</span>
          </span>
          
          <select
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value as NodeType)}
            className="w-full bg-zinc-950 border border-neutral-900 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none focus:border-zinc-800 font-bold mb-2 cursor-pointer"
          >
            <option value="input">📥 {currentLang === 'ru' ? "Входные переменные" : currentLang === 'zh' ? "输入参数" : "Inputs"}</option>
            <option value="prompt">📝 {currentLang === 'ru' ? "Шаблон Промпта" : currentLang === 'zh' ? "提示词模板" : "Prompt Template"}</option>
            <option value="gemini">✨ {currentLang === 'ru' ? "Модель Gemini LLM" : currentLang === 'zh' ? "Gemini LLM 单元" : "Gemini LLM"}</option>
            <option value="reviewer">🔍 {currentLang === 'ru' ? "Анализ и Коррекция" : currentLang === 'zh' ? "审查与修正" : "Critique & Review"}</option>
            <option value="router">🔀 {currentLang === 'ru' ? "Условный Роутер" : currentLang === 'zh' ? "条件路由器" : "Execution Router"}</option>
            <option value="tool">🌐 {currentLang === 'ru' ? "Запрос к HTTP API" : currentLang === 'zh' ? "HTTP API 工具" : "HTTP API Custom Tool"}</option>
            <option value="webhook">📯 {currentLang === 'ru' ? "Внешний Webhook" : currentLang === 'zh' ? "外部 Webhook" : "Outbound Webhook"}</option>
            <option value="rag">📚 {currentLang === 'ru' ? "Поиск по базе RAG" : currentLang === 'zh' ? "RAG 向量搜索" : "RAG Knowledge Search"}</option>
            <option value="vector-search">🗄️ {currentLang === 'ru' ? "PGVector Поиск" : currentLang === 'zh' ? "PGVector 搜索" : "PGVector Search"}</option>
            <option value="multimodal">🖼️ {currentLang === 'ru' ? "Мультимодал (Файлы)" : currentLang === 'zh' ? "多模态文档处理" : "Multimodal (Files)"}</option>
            <option value="human_confirmation">⏳ {currentLang === 'ru' ? "Ручной Контроль" : currentLang === 'zh' ? "人工确认门阀" : "Human Gate"}</option>
            <option value="prompt_optimizer">⚙️ {currentLang === 'ru' ? "Оптимизатор COT" : currentLang === 'zh' ? "提示词优化器" : "Prompt Optimizer"}</option>
            <option value="output">📤 {currentLang === 'ru' ? "Результаты" : currentLang === 'zh' ? "输出视图" : "Outputs"}</option>
          </select>

          <div className="space-y-2 text-[10px] bg-zinc-950/40 p-2 rounded-lg border border-neutral-900 leading-normal">
            <div>
              <span className="text-[9px] text-zinc-500 font-extrabold uppercase block tracking-wider mb-0.5">
                {currentLang === 'ru' ? "Назначение" : currentLang === 'zh' ? "核心用途" : "Purpose"}
              </span>
              <p className="text-zinc-300 font-medium">{nodeDocMap[selectedDocType]?.purpose[currentLang] || nodeDocMap[selectedDocType]?.purpose['en']}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-900">
              <div>
                <span className="text-[8px] text-zinc-500 font-extrabold uppercase block tracking-wider mb-0.5">
                  {currentLang === 'ru' ? "Входы" : currentLang === 'zh' ? "接受输入" : "Inputs"}
                </span>
                <span className="text-zinc-400 font-mono text-[9px] block leading-tight">{nodeDocMap[selectedDocType]?.inputs[currentLang] || nodeDocMap[selectedDocType]?.inputs['en']}</span>
              </div>
              <div>
                <span className="text-[8px] text-zinc-500 font-extrabold uppercase block tracking-wider mb-0.5">
                  {currentLang === 'ru' ? "Выходы" : currentLang === 'zh' ? "输出产物" : "Outputs"}
                </span>
                <span className="text-zinc-400 font-mono text-[9px] block leading-tight">{nodeDocMap[selectedDocType]?.outputs[currentLang] || nodeDocMap[selectedDocType]?.outputs['en']}</span>
              </div>
            </div>
            <div className="pt-1.5 border-t border-neutral-900">
              <span className="text-[8.5px] text-zinc-500 font-extrabold uppercase block tracking-wider mb-0.5">
                💡 {currentLang === 'ru' ? "Секрет Мастерства" : currentLang === 'zh' ? "专家建议" : "Pro Tip"}
              </span>
              <p className="text-zinc-400 italic text-[9.5px] leading-relaxed">{nodeDocMap[selectedDocType]?.tip[currentLang] || nodeDocMap[selectedDocType]?.tip['en']}</p>
            </div>
          </div>
        </div>

        {/* Swagger Importer collapsible/card UI block */}
        <div className="mt-4 pt-3.5 border-t border-neutral-900">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
            <FileJson size={11} className="text-rose-400" /> Swagger Importer
          </span>
          <p className="text-[9px] text-slate-500 mb-2 leading-relaxed">
            {currentLang === 'ru' ? "Вставьте JSON спецификации Swagger/OpenAPI" : "Paste Swagger/OpenAPI JSON specification"}
          </p>
          <textarea
            value={swaggerInput}
            onChange={(e) => setSwaggerInput(e.target.value)}
            placeholder='{ "paths": { "/api/v1": { "get": {} } } }'
            className="w-full h-14 bg-slate-950 font-mono text-[9px] text-slate-300 p-2 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500/45 focus:ring-1 focus:ring-rose-500/25 placeholder-slate-700 resize-none leading-normal"
          />
          {swaggerError && <p className="text-[9px] text-rose-450 mt-1">{swaggerError}</p>}
          {swaggerSuccess && <p className="text-[9px] text-emerald-400 mt-1">{swaggerSuccess}</p>}
          <button
            onClick={handleImportSwagger}
            className="w-full mt-2 bg-slate-950 text-slate-300 text-[10px] font-bold border border-slate-800 hover:border-rose-500/40 hover:bg-rose-950/20 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Plus size={10} /> {currentLang === 'ru' ? "Импортировать в Схему" : "Import Spec Route"}
          </button>
        </div>
      </div>

      {/* Checkpoint / History checkpoints list */}
      <div className="p-4 border-b border-slate-850 bg-slate-900/40">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <History size={14} className="text-purple-400" /> {t('history')}
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              id="btn_capture_session_snapshot"
              onClick={onSaveSnapshot}
              className="text-[10px] font-bold text-sky-450 hover:text-sky-300 flex items-center gap-0.5 cursor-pointer bg-sky-950/20 px-2 py-1 border border-sky-850 rounded-lg active:scale-95 transition-all"
              title={t('historyDesc')}
            >
              <Plus size={10} /> {currentLang === 'ru' ? "Снять" : "Save"}
            </button>
            {savedSnapshots.length > 0 && (
              <button
                id="btn_export_all_snapshots_zip"
                onClick={async () => {
                  try {
                    await exportSnapshotsToZip(savedSnapshots as any, projectNameInput);
                  } catch (err: any) {
                    alert(`Export error: ${err.message}`);
                  }
                }}
                className="text-[10px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-0.5 cursor-pointer bg-teal-950/20 px-2 py-1 border border-teal-850 rounded-lg active:scale-95 transition-all"
                title={currentLang === 'ru' ? "Экспортировать все снимки в ZIP" : currentLang === 'zh' ? "批量导出快照为 ZIP" : "Export all snapshots as ZIP"}
              >
                <Download size={10} /> {currentLang === 'ru' ? "Экспорт" : currentLang === 'zh' ? "导出" : "Export"}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {savedSnapshots.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic py-2 text-center">{t('emptyHistory')}</p>
          ) : (
            savedSnapshots.map(snap => (
              <div 
                id={`snap-item-${snap.id}`}
                key={snap.id}
                onClick={() => onRestoreSnapshot(snap.id)}
                className="p-2 bg-slate-950 border border-slate-850 hover:border-sky-500/20 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 group hover:bg-slate-900/30"
              >
                <div className="truncate leading-tight">
                  <span className="text-[10px] font-bold text-slate-300 block truncate leading-tight">{snap.name}</span>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">⏱️ {snap.timestamp}</span>
                </div>
                <button
                  id={`delete-snap-${snap.id}`}
                  onClick={(e) => onDeleteSnapshot(snap.id, e)}
                  className="text-slate-650 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer shrink-0"
                  title="Delete checkpoint representation"
                >
                  <Trash size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Server-Side Persistence files list */}
      <div className="p-4 bg-slate-900/80">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
          <FolderPlus size={14} className="text-emerald-400" /> {t('serverPersistence')}
        </h3>
        <p className="text-[10px] text-slate-500 mb-3 leading-normal">
          {t('serverPersistenceDesc')}
        </p>

        <div className="space-y-2.5">
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder={t('projectNameHolder')}
              value={projectNameInput}
              onChange={(e) => onProjectNameInputChange(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-805 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
              id="project-name-txt"
            />
            <button
              id="save-project-dir-btn"
              onClick={() => {
                if (projectNameInput.trim()) {
                  onSaveProjectToServer(projectNameInput);
                }
              }}
              disabled={savingProject}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-1.5 text-xs rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center min-w-[70px]"
            >
              {savingProject ? "..." : t('saveProjectBtn')}
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              {t('savedListTitle')}
            </span>

            {loadingProjects ? (
              <p className="text-[10px] text-slate-500 italic py-1 text-center">Loading server assets...</p>
            ) : serverProjects.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic py-1 text-center">
                {t('noSavedProjects')}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1" id="server_saved_projects_list">
                {serverProjects.map(proj => {
                  const isCurrentlyActive = currentSavedProjectName === proj.name;
                  return (
                    <div
                      id={`server-proj-item-${proj.name}`}
                      key={proj.name}
                      className={`p-2 rounded-xl border text-[11px] flex items-center justify-between gap-2 group transition-all ${
                        isCurrentlyActive
                          ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-350 font-bold'
                          : 'bg-slate-950 border-slate-850 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div
                        onClick={() => onLoadProjectFromServer(proj)}
                        className="truncate cursor-pointer flex-1"
                      >
                        <span className="block truncate font-mono text-slate-200">{proj.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
