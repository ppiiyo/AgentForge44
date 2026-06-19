# 🌌 AgentForge44

An elite, low-code interactive visual orchestration platform designed for designing, testing, and running self-correcting multi-agent AI workflows on top of modern LLMs (Google Gemini, OpenAI GPT, Anthropic Claude, and offline Ollama).

---

### 🌐 Select Language / Выберите язык / 选择语言
[![English](https://img.shields.io/badge/Language-English-blue?style=for-the-badge)](#-english-documentation)
[![Русский](https://img.shields.io/badge/Language-%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-red?style=for-the-badge)](#-русская-документация)
[![中文](https://img.shields.io/badge/Language-%E4%B8%AD%D6%96%E6%96%87-red?style=for-the-badge)](#-中文文档)

---

# 🇬🇧 English Documentation

## 🌟 Introduction
Modern AI development is transitioning from single prompt interactions to complex, sovereign multi-agent loops. However, orchestrating sequential prompt injections, parsing LLM decisions, and connecting inputs to evaluation critical reviews typically requires hundreds of lines of fragile boilerplate code.

**AgentForge44** is a professional-grade low-code visual pipeline manager. It allows developers, product managers, and AI researchers to visually design complex multi-agent execution graphs, connect external network endpoints, ingest unstructured files into a localized RAG vector search, and run instant full-chain dry runs with real-time token telemetry and live cost estimates.

### For Whom is AgentForge44?
- **AI Core Architects**: Visually sketch complex, nested prompt dependencies & feedback routing.
- **Enterprise Devs**: Spin up production-ready REST APIs connected to active state graphs in seconds.
- **Researchers**: Conduct comparative reviews across different LLM families (Gemini, GPT, Claude, Ollama) on identical prompts under the same canvas state.
- **Product Managers**: Easily toggle a visual **Showcase Presentation Mode** to demonstrate fully interactive pipeline steps to stakeholders without the distraction of code editors or configuration sidebars.

---

## 🖼️ Interactive Console Layout
```text
┌────────────────────────────────────────────────────────────────────────┐
│  AgentForge Console                                 [Run] [Save] [Share]│
├────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐   │
│  │  Input Node   ├───────►│  Prompt Node  ├───────►│  Gemini Node  │   │
│  │  Variables    │        │  Templates    │        │  Reasoning    │   │
│  └───────────────┘        └───────────────┘        └───────┬───────┘   │
│                                                            │           │
│                                                            ▼           │
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐   │
│  │ Output Node   │◄───────┤  Trace Audit  │◄───────┤ Critic Node   │   │
│  │ Payload Out   │ (Retry)│  Execution    │        │ self-correct  │   │
│  └───────────────┘        └───────────────┘        └───────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Platform Features

### 1. Advanced Low-Code Visual Builder
- Drag-and-drop nodes to instantly spawn logic components (`Input`, `Prompt`, `LLM`, `Reviewer`, `Router`, `Tool`, `RAG`, `Output`).
- Connect complex routing edges with SVG graphics renderer supporting deep real-time scale zooming (from `50%` to `150%`).
- Dual-mode snapping grid support for professional, pixel-perfect alignment.

### 2. Multi-Provider Registry
- Standardized endpoint integration to run Gemini (3.5 Flash/Pro, 3.1 Flash Lite), OpenAI GPT (4o, 4o Mini, o1 Mini), Anthropic Claude (3.5 Sonnet, 3.5 Haiku), or offline local LLaMA/Mistral via Ollama.
- Seamless provider dropdown selector grouped cleanly by active host registration schemas.

### 3. Localization & Universal Adaptability
- Native multilingual UI support (English, Russian, Chinese) with dynamic label updates across the entire canvas, configuration panel, and analytics monitors.

### 4. Semantic RAG Knowledge Memory
- Ingest client documents, index text blocks with Gemini embed model, and query localized embeddings. Includes a gorgeous **RAG Visualizer** representing chunk structures & search priorities.

### 5. Multi-User Space Collaboration (Live Presence)
- Connected through persistent Socket.io WebSockets. Watch remote team editing cursors hovering and locked card states in real-time.

### 6. Git-like Versioning & Time Travel
- Snap, compare, and rollback entire graph configurations with a dedicated visual version timeline diff reader.

### 7. Showcase Mode (Presentation Layout)
- One-click triggers a clean, focused display layout that collapses sidebars and builders. Let stakeholders trace execution vectors on a distraction-free grid!

---

## 🛡️ Elite Architectural Security & Resilience

To pass corporate compliance and scale, AgentForge44 includes five enterprise-grade security micro-architectures:

### ⚙️ DB Auto-Seeding & Self-Healing Engine
*(Implemented in: `src/db/index.ts` & `src/db/adapters.ts`)*
* **Why**: To prevent standard server crashes inside fresh virtual machines or distributed docker instances due to unapplied database tables.
* **Mechanism**: On startup, our server scans SQLite/PostgreSQL schemas. It auto-provisions and migrates all necessary assets (`graphs`, `users`, `metrics`, `deployments`, `versions`) within a single database transaction. Zero setup required.

### 🛡️ Secret-Masking Payload Cleanser
*(Implemented in: `src/middleware/sanitize.ts`)*
* **Why**: To safeguard private API credentials and passwords from being dumped into plaintext log outputs.
* **Mechanism**: A recursive sanitizer scans all JSON workloads. Any matching properties like `/api[_-]?key|password|jwt|secret|auth|token/i` are immediately masked with `***MASKED***` without breaking the request's internal logic.

### 📊 Sliding Window Usage Rate-Limiter
*(Implemented in: `src/middleware/rateLimit.js`)*
* **Why**: To prevent DoS attacks, Gemini cost spikes, and token resource depletion.
* **Mechanism**: A dynamic rate-limiting sliding window grants 30 requests per minute per IP. Any over-burst responses are blocked with HTTP `429 Too Many Requests`.

### 🔄 Structured Clone Parallel Safety
*(Implemented in: `src/api/execution.ts`)*
* **Why**: When a visual flow branches into parallel routes and joins back, reference sharing causes mutation side-effects and race conditions.
* **Mechanism**: The execution pipeline applies modern `structuredClone` checkpoints on input payloads. Data is completely isolated across parallel pipelines, leading to pure, side-effect-free execution results.

### 🛡️ ReDoS-safe Regular Expression Validation
*(Implemented in: `src/utils/safe-regex.ts` & `src/nodes/RouterNode.ts`)*
* **Why**: User-defined routing regular expressions with exponential backtracking (e.g. `(a+)+`) can lock the main Node.js event-loop.
* **Mechanism**: All dynamic routing regex validators are prechecked by a lightweight static syntax scanner. Backtracking loops are blocked safely, preventing Regex Denial of Service (ReDoS) locks.

---

## ⚡ Quick Start

### 🐳 Run using Docker (Recommended)
Launch the complete client, server, and SQLite bundle under a fully containerized ecosystem in seconds:
```bash
# Build and run container services
docker-compose up --build
```
Access the dashboard immediately at: **[http://localhost:3000](http://localhost:3000)**

### 🖥️ Bare-Metal Local Launch
Ensure Node.js v18+ is installed on your workstation.
```bash
# 1. Install workspace dependencies
npm install

# 2. Setup your local environment file
cp .env.example .env

# 3. Spin up the Vite-Express fullstack dev server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📁 Workspace Structure
```text
AgentForge44/
├── src/                    # React / Vite Client Application
│   ├── components/         # Interactive UI components
│   │   ├── Toolbox.tsx              # Component catalog & graph loader
│   │   ├── ConfigurationPanel.tsx   # Detailed parameters editor
│   │   └── FlowCanvas.tsx           # SVG interactive builder board
│   ├── api/                # Client-side API hooks & backend communication
│   ├── db/                 # Database Schema definitions & migrations
│   ├── types.ts            # TypeScript global specifications
│   └── main.tsx            # React application mount point
├── server.ts               # Full-stack backend Express application
├── Dockerfile              # Immutable docker production packaging
├── docker-compose.yml      # Multi-dependency container orchestrator
└── package.json            # Dynamic NPM package manifest
```

---

## 📖 REST API Programmatic Guide
AgentForge44 provides an interactive OpenAPI / Swagger exploration console.
- **Swagger Documentation**: Accessible locally at **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**. On production environments, use the built-in Swagger interface.
- **OpenAPI JSON Spec**: Available raw at `/swagger.json`.

### Core Endpoint cURL Examples

#### 1. Save/Update Graph Pipeline (`POST /api/graphs`)
```bash
curl -X POST http://localhost:3000/api/graphs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "id": "translation-pipeline",
    "name": "Localization Agent Pair",
    "nodes": [
      {
        "id": "inp-1",
        "type": "input",
        "x": 100, "y": 200,
        "fields": { "title": "Base Content", "value": "Hello. Welcome to the code builder." }
      }
    ],
    "connections": []
  }'
```

#### 2. Read Graph Configuration (`GET /api/graphs/:id`)
```bash
curl -X GET http://localhost:3000/api/graphs/translation-pipeline \
  -H "Authorization: Bearer <TOKEN>"
```

#### 3. Run Executions (`POST /api/execute`)
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "graphId": "translation-pipeline",
    "inputs": {
      "user_prompt": "Override translation to default target language"
    }
  }'
```

---

## 🧪 Testing
We enforce strict software validation on both front and back-end logic.
```bash
# Execute integration & unit test suites (Vitest framework)
npm test

# Run ESLint validation checking rules Compliance
npm run lint
```

---

# 🇷🇺 Русская Документация

## 🌟 Введение
Современные ИИ-разработки быстро перерастают стандартные одиночные запросы и трансформируются в сложные мультиагентные сценарии с обратной связью. Однако сборка цепочек запросов, парсинг ответов моделей, условное ветвление данных и исправление ошибок "на лету" обычно требуют написания сотен строк хрупкого шаблонного кода.

**AgentForge44** — это визуальный low-code конструктор профессионального уровня. Платформа позволяет разработчикам, менеджерам продуктов и исследователям проектировать сложные агентные графы, интегрировать базы данных внешних документов (RAG), в реальном времени мониторить запуск моделей и моментально оценивать финансовые расходы на генерацию токенов.

---

## ✨ Ключевые возможности платформы

### 1. Визуальный Drag-and-Drop редактор
- Конструируйте графы из функциональных узлов (`Input`, `Prompt`, `LLM`, `Reviewer`, `Router`, `Tool`, `RAG`, `Output`).
- Масштабируйте рабочее пространство от `50%` до `150%` на отзывчивом адаптивном холсте.
- Поддержка усовершенствованной сетки привязки (Snap-to-Grid) для безупречного выравнивания элементов на холсте.

### 2. Мульти-провайдерная интеграция моделей
- Интеграция из коробки: Google Gemini (3.5 Flash/Pro, 3.1 Flash Lite), OpenAI GPT (4o, 4o Mini, o1 Mini), Anthropic Claude (3.5 Sonnet, 3.5 Haiku) и локальные Offline модели LLaMA 3/Mistral через Ollama.

### 3. Семантическая память (RAG Интеграция)
- Загружайте свои текстовые документы, индексируйте их семантические куски (chunks) и ищите релевантные контексты ИИ в реальном времени. Включает детальный 3D-анимированный интерактивный **RAG Visualizer**.

### 4. Совместное редактирование (Live Presence)
- Благодаря протоколам Socket.io WebSockets, несколько пользователей могут работать над одним графом одновременно, видя курсоры друг друга и блокируя карточки узлов при редактировании.

### 5. Режим презентации (Showcase Mode)
- Скройте все боковые панели разработчиков, кнопки отладки и редакторы параметров одним кликом. Оставьте фокус на чистой визуальной структуре для демонстрации пайплайна клиентам и коллегам.

---

## 🛡️ Архитектура Безопасности и Отказоустойчивости

### ⚙️ Автоматическое развёртывание и Самовосстановление БД
* На старте сервера Движок автоматически проверяет СУБД на наличие всех нужных таблиц (`graphs`, `metrics`, `users` и т.д.) и при их отсутствии генерирует схему "из коробки" в рамках одной SQL-транзакции. Запуск не упадёт из-за отсутствия миграций.

### 🛡️ Интеллектуальный Payloads-клинер (Маскировка ключей)
* Автоматически парсит все JSON-нагрузки регулярным выражением против утечки приватных ключей во внешние логи. Секреты цензурируются на лету символами `***MASKED***`.

### 📊 Скользящий Rate-Limiter запросов
* Защищает API-сервер от перегрузки и исчерпания платных токенов внешних LLM-аккаунтов, ограничивая лимиты до 30 запросов в минуту с обратной отдачей `429 Too Many Requests`.

### 🔄 Изоляция потоков (Structured Clone Thread-Safety)
* Избегайте побочных эффектов гонки данных при слиянии и разветвлении потоков в визуальном движке за счет глубокого клонирования контекстов.

### 🛡️ ReDoS-защита регулярных выражений маршрутизатора
* Скрипт проверяет введённые пользователем RegExp-правила роутера на наличие катастрофического возврата (backtracking) и блокирует потенциально взрывоопасные паттерны до исполнения, сохраняя стабильность бэкенда Node.js.

---

## ⚡ Быстрый старт

### 🐳 Запуск через Docker
```bash
# Собрать и запустить проект в изолированной среде
docker-compose up --build
```
Откройте в браузере: **[http://localhost:3000](http://localhost:3000)**

### 🖥️ Локальная разработка (Bare-Metal)
Требуется Node.js v18+.
```bash
npm install
cp .env.example .env
npm run dev
```
Откройте в браузере: **[http://localhost:3000](http://localhost:3000)**

---

# 🇨🇳 中文文档

## 🌟 项目简介
传统的 AI 开发正逐步从单一的提示词交互进化到复杂且高度自治的多智能体（Multi-Agent）协同场景。然而，搭建提示词依赖注入链、解析大模型（LLM）的多重路由选项、以及执行异常捕获等通常需要数千行脆弱的模式化代码。

**AgentForge44** 是一款企业级的低代码（Low-Code）可视化流水线编排平台。它支持开发人员、产品经理和 AI 的研究人员直观地构建多智能体编排图，高效索引本地知识库（RAG），全链路模拟执行测试并即时追踪 Token 资源消耗及模型成本费用。

---

## ✨ 核心亮点功能

### 1. 简易的可视化节点编辑器
- 通过拖拽操作，即可瞬时生成执行节点类型：输入源、提示词模版、大模型推理端、审核过滤器、条件路由、API外部工具、RAG检索、及复合输出。
- 集成了专业的网格自动对齐（Snap-to-Grid）和画布无极缩放（Zoom 50% - 150%），保障复杂流程图的极致美感。

### 2. 多智能体提供商注册机制
- 精确支持 Google Gemini（3.5 Flash/Pro, 3.1 Flash Lite）、OpenAI GPT（4o, 4o Mini, o1 Mini）、Anthropic Claude（3.5 Sonnet, 3.5 Haiku）或借助 Ollama 实现本地 Mistral / LLaMA 3 脱机运行。

### 3. 可视化检索增强生成（RAG）
- 轻松导入业务文档，将文本切割提取并对目标块建立索引。集成了炫酷的三维 **RAG 特征树可视化组件**。

### 4. 实时协同编辑（Live Presence）
- 基于 Socket.io WebSockets，完美支持多用户异地共享同一个白板。实时同步团队各个编辑者的光标轨迹与节点编辑锁定状态，防止出现数据碰撞风险。

### 5. 极简演示模式（Showcase Mode）
- 一键即可折叠所有边缘侧配置面板与调试项，画布转入高爽净度的汇报陈述状态。方便向业务主管及非技术团队说明多模块执行机制。

---

## 🛡️ 网络安全与健壮性工程设计

### ⚙️ 零配置数据库自我修复（Auto-Recovery DB）
* 在服务器冷启动时，系统将主动判定本地以及远端数据库，若缺少诸如 Graphs 或 Metrics 报表结构，执行引擎将在单一事务中无感推送全套 Drizzle SQL 逻辑建表任务。

### 🛡️ 机密数据自过滤防护（Secret Payload Cleanser）
* 拦截器扫描通过 Express 后端的所有 JSON 包。一旦包含类似于 API-KEY、密钥或特权账密的敏感属性，自动使用 `***MASKED***` 强行覆盖脱敏，杜绝日志外泄。

### 📊 滑动时间窗速率控制（Sliding Window Rate-Limiter）
* 提供严密的用户限流（每分钟35次限额），从而完美避免恶意爬虫以及疯狂 API 查询带来的外网云端计费超额，及时向客户端返回 `429 Too Many Requests`。

### 🔄 多流程并发线程安全（Parallel-Clone Integrity）
* 在低代码架构中，多重智能体图结构可能频繁进行分流（Forking）和合流（Merging）。由于传统 JavaScript 的引用传递容易引入脏数据，核心编译管线使用极其彻底的 `structuredClone` 来对数据流执行快照化阻断隔离，规避一切竞态危害。

### 🛡️ 正则拒绝服务（ReDoS）深度阻截
* 当用户自定义路径选择符时，正则表达式可能会包含多重灾难性回溯漏洞（例如 `(a+)+`），进而锁闭单线程 Node.js 进程。内核引入非阻塞的 Regex 测试防御机制，从根源上守护业务不中断。

---

## ⚡ 快速开始

### 🐳 通过 Docker 部署容器（最优推荐）
```bash
# 自动编译与拉取项目镜像
docker-compose up --build
```
启动完毕后，在浏览器访问：**[http://localhost:3000](http://localhost:3000)**

### 🖥️ 单机本地开发模式（Bare-Metal）
确保本机配置 Node.js v18 或以上版本。
```bash
npm install
cp .env.example .env
npm run dev
```
启动完毕后，在浏览器访问：**[http://localhost:3000](http://localhost:3000)**

---

## 📜 License
Distributed under the **MIT License**. Check out [LICENSE](./LICENSE) for details.
