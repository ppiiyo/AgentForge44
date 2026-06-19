# 🌌 AgentForge44

> A production-grade, low-code interactive visual orchestration platform designed to build, test, evaluate, and deploy self-correcting multi-agent AI workflows. Connect modern LLMs (Google Gemini, OpenAI GPT, Anthropic Claude, and offline Ollama), stream programmatic pipelines, integrate vector memory, and collaborate room-wide in real-time.

---

### 🌐 Select Language / Выберите язык / 选择语言
[![English](https://img.shields.io/badge/Language-English-blue?style=for-the-badge)](#-english-documentation)
[![Русский](https://img.shields.io/badge/Language-%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-red?style=for-the-badge)](#-русская-документация)
[![中文](https://img.shields.io/badge/Language-%E4%B8%AD%D6%96%E6%96%87-red?style=for-the-badge)](#-中文官方文档)

---

# 🇬🇧 English Documentation

## 🚀 Overview

### What is AgentForge44?
AgentForge44 is a full-stack, low-code Visual Workflow Architect and runtime environment designed for multi-agent LLM systems. It provides an intuitive node-based editor representing variables, prompt templates, reasoning chains, code execution, search indices, and reviewers, connected to a robust, secure Node.js backend. 

### Why AgentForge44? (The Problem)
While prompt engineering is simple for single requests, building multi-agent pipelines with conditional routing, self-correction loops, document indexing, and user feedback cycles usually requires writing thousands of lines of fragile boilerplate code. Designing, debugging, and demonstrating these systems to non-technical stakeholders becomes highly complex. AgentForge44 solves this by replacing fragile custom scripts with a unified visual engineering workbench and deployment-ready runtime.

### For Whom is AgentForge44?
- **AI Core Architects**: Visually model complex reasoning structures, nested inputs, and feedback loops with direct control over prompt dependencies.
- **Enterprise Engineering Teams**: Rapidly prototype workflows and spin up secure REST API endpoints linked to active state graphs in seconds.
- **Researchers & QA Testers**: Stress-test different LLM families (Gemini, Claude, GPT, Ollama) on the exact same inputs under identical environment constraints.
- **Product Managers & Stakeholders**: Eliminate clutter by using **Showcase Presentation Mode** to demonstrate fully interactive product mockups and logic to clients.

---

## 🖼️ Architectural Diagram
```text
  ┌─────────────────────────────────────────────────────────────┐
  │                 AGENTFORGE44 USER INTERFACE                 │
  │  ┌──────────────┐    ┌─────────────────┐    ┌────────────┐  │
  │  │  Flow Canvas │    │ Configure Panel │    │ Log Viewer │  │
  │  │ [Showcase ON]│    │ [Model Selector]│    │ [Telemetry]│  │
  │  └──────┬───────┘    └────────┬────────┘    └─────┬──────┘  │
  └─────────┼─────────────────────┼───────────────────┼─────────┘
            │                     │                   │
  ┌─────────┼─────────────────────┼───────────────────┼─────────┐
  │         ▼                     ▼                   ▼         │
  │            NODE.JS / EXPRESS CORE & WEBSOCKET GATEWAY       │
  │  ┌──────────────────────┐   ┌────────────────────────────┐  │
  │  │  Drizzle ORM Engine  │   │  Socket.IO Live Presence   │  │
  │  │ (PostgreSQL/SQLite)  │   │    (Multi-User Cursor)     │  │
  │  └──────────┬───────────┘   └──────────────┬─────────────┘  │
  │             │                              │                │
  │  ┌──────────▼───────────┐   ┌──────────────▼─────────────┐  │
  │  │   Isolate Worker     │   │   Secret Payload Masker    │  │
  │  │ (VM2 / secure thread)│   │ (Anti-API Leak Protection) │  │
  │  └──────────────────────┘   └────────────────────────────┘  │
  └─────────────────────────────────────────────────────────────┘
```

---

## 💎 Stellar Capabilities & Features

### 1. Advanced Low-Code Visual Builder
* **Drag-and-Drop Editor**: Build flows from rich, pre-configured nodes (`Input`, `Prompt`, `LLM`, `Reviewer`, `Router`, `Tool`, `RAG`, `Output`).
* **Fluid Navigation Layout**: Interactive Zoom & scale adjustment from `50%` up to `150%` paired with dynamic vector edge rendering.
* **Pixel-Perfect Alignment**: Snap-to-Grid support ensures flow structures are tidy, readable, and consistent.

### 2. Multi-Provider Model Registry
* **Direct Integration**: Use Google Gemini (3.5 Flash/Pro, 3.1 Flash Lite), OpenAI GPT (4o, 4o Mini, o1 Mini), Anthropic Claude (3.5 Sonnet, 3.5 Haiku), or keep intelligence completely local and private via Ollama (Llama 3, Mistral).
* **Speed & Cost Telemetry**: Instantly compare speeds and estimated costs per node execution.

### 3. Showcase Presentation Mode
* **Minimalist Canvas Focus**: Collapse the Builder Toolbox and Sidebar in a single click (`Showcase Mode: ON`).
* **Stakeholder Ready**: Trace pipeline logic, execute live tests, and present concepts cleanly without distracting technical editors.

### 4. Semantic RAG Knowledge Memory
* **Document Ingestion**: Seamlessly upload customer support docs, PDFs, or manual text assets.
* **3D Feature Tree Visualizer**: A gorgeous hierarchical RAG visualizer representing vectorized block levels, chunks, and similarity score rankings inside an interactive preview portal.

### 5. Multi-User Collaboration (Live Presence)
* **Real-time Cursor Tracking**: Integrated over high-speed WebSockets. Watch team members move nodes, hover, and collaborate.
* **Conflict prevention**: Interactive node-component locks prevent concurrent race condition mutations.

### 6. Git-like Versioning & Time Travel
* **State Checkpoints**: Create, list, compare, and rollback full pipeline structures.
* **Visual diff viewer**: Instantly trace node/variable schema diff structures across past versions.

### 7. Programmatic Deployment Tools \& API
* **Automated Swagger Console**: Explore and test REST endpoints programmatically at `/api-docs`.
* **Hooks & Schedulers**: Configure timed cron triggers or bind webhook endpoints to execute pipelines.

---

## 🛡️ Enterprise Security & Architectural Design

AgentForge44 includes several built-in security layers to safeguard API calls and infrastructure:

### ⚙️ Self-Healing DB Migration
* **Why**: Prevents server startup crashes inside fresh environments or Docker runners due to missing db tables.
* **How**: On startup, our central database controller automatically checks the active schema. If tables (`graphs`, `users`, `metrics`, `deployments`, `versions`) are missing, it provisions them within a single transaction seamlessly.

### 🛡️ Secret-Masking Payload Cleanser
* **Why**: Prevents accidental exposure of API private keys or auth secrets inside server terminal logs or performance records.
* **How**: A recursive payload cleanser sweeps incoming requests. Any fields matching `/api[_-]?key|password|jwt|secret|auth|token/i` are immediately masked with `***MASKED***` without breaking the operational workflow.

### 📊 Sliding Window Graceful Rate-Limiter
* **Why**: Safeguards the backend from DoS attempts, Gemini quota spikes, and excessive external token billing.
* **How**: Monitors client IPs inside a sliding rate window limiting requests to a healthy threshold (default: 30 requests per minute) and responding with a structured `429 Too Many Requests` when triggered.

### 🔄 Fork Thread Structured Clone Isolation
* **Why**: Forking a visual flow into parallel paths can cause data corruption if JavaScript references mutate.
* **How**: Our execution executor enforces complete context isolation across branched routes by creating structured clones of running payloads, guaranteeing thread-safe, race-free parallel pipelines.

### 🛡️ ReDoS-safe Router Regular Expressions
* **Why**: Malicious or nested regular expressions (like `(a+)+`) can lock up Node's single-threaded event loop.
* **How**: Dynamic router routing checks are passed through a lightweight regular-expression compiler before execution, blocking patterns containing exponential backtracking vulnerabilities.

---

## ⚡ Quick Start

### 🐳 Run using Docker Setup (Recommended)
Get up and running with a single command containing Vite, Express API, Socket.io, SQLite, and Swagger combined:
```bash
# Clone the repository and boot using Compose
docker-compose up --build
```
Access the application dashboard immediately inside your browser: **[http://localhost:3000](http://localhost:3000)**

### 🖥️ Standard Bare-Metal Dev Launch
Ensure Node.js v18+ is installed on your workstation.
```bash
# 1. Install dependencies
npm install

# 2. Setup your local env file
cp .env.example .env

# 3. Spin up the Vite-Express fullstack dev server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📁 Repository Structure
```text
AgentForge44/
├── src/                    # React / Vite Client Application
│   ├── components/         # Interactive UI components
│   │   ├── Toolbox.tsx              # Loader & Graph cataloging
│   │   ├── ConfigurationPanel.tsx   # Model parameters editor
│   │   └── FlowCanvas.tsx           # Interaction SVG board
│   ├── api/                # Client-to-server API hooks
│   ├── db/                 # Migrations & database schemas
│   ├── types.ts            # Glabal TypeScript interfaces
│   └── main.tsx            # React mounting entry-point
├── server.ts               # Express core application entry point
├── Dockerfile              # Container building instruction file
├── docker-compose.yml      # Orchestrated Compose config
└── package.json            # Dynamic NPM package manifest
```

---

## 📜 REST API Programmatic Guide
Explore Swagger UI documentation locally at **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**.

### Core Endpoints

#### 1. Save or Update Graph Layout (`POST /api/graphs`)
```bash
curl -X POST http://localhost:3000/api/graphs \
  -H "Content-Type: application/json" \
  -d '{
    "id": "translation-pipeline",
    "name": "Localization Agent Pair",
    "nodes": [
      {
        "id": "inp-1",
        "type": "input",
        "fields": { "title": "Raw text", "value": "AgentForge visual workflow structure" }
      }
    ],
    "connections": []
  }'
```

#### 2. Get Flow Structure Details (`GET /api/graphs/:id`)
```bash
curl -X GET http://localhost:3000/api/graphs/translation-pipeline
```

#### 3. Run Pipeline Execution (`POST /api/execute`)
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "graphId": "translation-pipeline",
    "inputs": {
      "language": "Russian"
    }
  }'
```

---

# 🇷🇺 Русская документация

## 🚀 Обзор проекта

### Что такое AgentForge44?
AgentForge44 — это полнофункциональная low-code платформа для проектирования, отладки, тестирования и запуска многоагентных ИИ-систем с обратной связью. Проект объединяет интуитивно понятный визуальный интерфейс (построенный на React и Tailwind) и оптимизированный веб-сервер на Node.js.

### Какую проблему решает проект? (Зачем он нужен)
Простые запросы к языковым моделям делать легко, но создание сложных циклов с самоисправлением ошибок, условным ветвлением и интеграцией баз знаний (RAG) требует написания тысяч строк ненадёжного шаблонного кода. Отлаживать такие системы в консоли неудобно, а объяснять их принцип работы коллегам без визуальной составляющей — практически невозможно. AgentForge44 заменяет хаос в коде наглядным рабочим пространством.

### Для кого разработан инструмент?
- **Архитекторы AI-систем**: Наглядное проектирование цепочек рассуждений моделей, вложенных prompt-шаблонов и маршрутизаторов.
- **Enterprise-разработчики**: Мгновенный запуск готовых REST API, привязанных к визуально смоделированным графам.
- **Исследователи и тестировщики**: Сравнительный анализ работы моделей от Google Gemini, Anthropic, OpenAI или локальных Ollama на идентичных тестовых сценариях в реальном времени.
- **Менеджеры продуктов и кураторы**: Концентрация на сути взаимодействия благодаря **Режиму презентации (Showcase Mode)**, скрывающему элементы разработки для демонстрации стейкхолдерам.

---

## 💎 Уникальные фишки и возможности

### 1. Мощный визуальный редактор графов
* **Интуитивный Drag-and-drop холст**: Сборка пайплайнов из функциональных узлов (`Input`, `Prompt`, `LLM`, `Reviewer`, `Router`, `Tool`, `RAG`, `Output`).
* **Плавное масштабирование**: Поддержка бесшовного Zoom холста от `50%` до `150%` с умной перерисовкой соединительных линий.
* **Привязка к сетке холста**: Кнопка автоматического Snap-to-Grid выровняет ваши карточки идеально ровно.

### 2. Мульти-провайдерная интеграция моделей
* **Широкий выбор ИИ**: Быстрое переключение между Google Gemini (3.5 Flash/Pro, 3.1 Flash Lite), OpenAI GPT, Anthropic Claude или защищёнными локальными сборками Ollama прямо из панели параметров карточки.

### 3. Режим презентации (Showcase Mode)
* **Профессиональная демонстрация**: Скрывайте боковую панель Toolbox и меню параметров в один клик. На экране останется только интерактивное полотно выполнения вашей системы, готовое к наглядным тестам перед клиентами.

### 4. Визуализация RAG и Индексации документов
* **Загрузка баз знаний**: Импортируйте корпоративные файлы, регламенты и инструкции с последующей нарезкой на куски (chunks).
* **3D RAG Visualizer**: Уникальный анимированный интерфейс, отображающий иерархию семантических векторов, силу ассоциаций и ранжирование найденных документов.

### 5. Совместное редактирование (Live Presence)
* **Слежение за курсорами**: Наблюдайте за перемещением мыши ваших коллег на одном общем рабочем столе через WebSocket Socket.io.
* **Умные блокировки**: Изменение параметров карточки одним пользователем временно блокирует её редактирование другими с яркой цветовой индикацией.

### 6. Контроль версий и "Путешествие во времени"
* **Снимки состояний**: Сохраняйте бекапы структуры графа в один клик с гибкой шкалой отката назад к прошлым модификациям.
* **Сравнение изменений**: Наглядный сравнитель различий (Diff-Viewer) по переменным и конфигурациям узлов.

### 7. Готовая интеграция и запуск
* **Swagger-документирование**: Автоматически генерируемый интерактивный API-эксплорер на `/api-docs` для интеграции ваших систем.
* **Планировщики и Кроны**: Быстро настраивайте автоматический запуск графов по времени или по входящим вещательным Webhook.

---

## 🛡️ Безопасность и архитектурная надёжность

Обеспечение корпоративных стандартов безопасности достигается за счёт нескольких встроенных решений:

* **Самовосстановление БД (Self-Healing Migration)**: На старте бэкенд проверяет целостность СУБД (PostgreSQL / SQLite). При отсутствии нужных таблиц (`graphs`, `users`, `metrics`, `versions`) система автоматически выполнит трансмиграции в единой безопасной транзакции.
* **Маскировка секретов (Secret Masking)**: Умный middleware анализирует входящий JSON-трафик. При обнаружении названий полей, связанных с API-ключами, паролями или токенами, он моментально маскирует их значение символами `***MASKED***`, предотвращая их сохранение в файлах логов или журналах Sentry.
* **Защита от перегрузок (Rate-Limiter)**: Порог в 30 запросов в минуту на один IP минимизирует риски краша распределённых контейнеров от DDoS-атак и защищает от непредвиденных счетов на внешних LLM-аккаунтах.
* **Изоляция потоков (Structured Clone Thread-Safety)**: При разветвлении графа на параллельные цепочки, среда гарантирует полное разделение памяти через глубокое клонирование пакетов (`structuredClone`), исключая побочные эффекты гонки данных.
* **Маршрутизация без уязвимостей ReDoS**: Пользовательские Regex-выражения роутера тестируются легковесным компилятором перед применением, предотвращая атаки типа «отказ в обслуживании регулярными выражениями».

---

## ⚡ Быстрый старт

### 🐳 Запуск в Docker (Рекомендуемый способ)
```bash
# Сборка и старт изолированных контейнеров
docker-compose up --build
```
Откройте интерфейс в браузере по адресу: **[http://localhost:3000](http://localhost:3000)**

### 🖥️ Обычный запуск на локальной машине
Требуется Node.js v18+.
```bash
# 1. Поставить зависимости
npm install

# 2. Создать файл окружения
cp .env.example .env

# 3. Запустить Vite + Express сервер
npm run dev
```
Откройте в браузере: **[http://localhost:3000](http://localhost:3000)**

---

# 🇨🇳 中文官方文档

## 🚀 项目简介

### 什么是 AgentForge44？
AgentForge44 是一款专为多智能体（Multi-Agent）系统设计的企业级、低代码可视化开发编排平台。它采用轻量直观的拖拽式蓝图设计器（基于 React 18+ 与 Tailwind CSS），完美对接后端强大的 Node.js 全栈微服务，让用户能轻松组合、测试并发布自适应的自修正 AI 通信管道。

### 为什么选择 AgentForge44？（解决痛点）
对于单个 AI 提示词的应用极其简单，但如果需要构建包含条件路由、多智能体自我纠错闭环、海量企业知识库（RAG）匹配以及循环逻辑控制的流水线，开发者往往需要手写数千行极易出错的样板代码。AgentForge44 将复杂的逻辑链和提示词依赖关系转换为直观的可视化图表，让研发结构一目了然，测试过程即时可控。

### 项目面向哪些受众？
- **AI 系统架构师**：精确构筑逻辑流、多层级 prompt 模版注入、故障自我反馈回路与权重阀值配置。
- **全栈开发团队**：秒级部署可直接在生产环境调用的 RESTful API 路由终端，与前端图画布完全数据同步。
- **算法研究员与评测师**：在完全一致的上下文状态下，一键横向对比 Google Gemini、OpenAI、Anthropic 以及本地 LLaMA / Mistral 模型的执行表现。
- **产品经理与非技术决策人**：利落开启 **演示模式 (Showcase Mode)**，隐藏所有代码和技术面板，高爽净度地向客户展示完整 AI 系统业务运转逻辑。

---

## 💎 领先的核心亮点与特性

### 1. 极致流畅的低代码节点设计器
* **丰富的逻辑节点**：支持创建输入节点、提示词模版、多厂商大模型推理、执行质量校检器、条件分支路由、外接 API 工具、向量知识库检索与统一输出节点。
* **弹性画布**：提供 `50% - 150%` 自由无极缩放比例与动态连接向量射线绘制。
* **网格对齐一键美化**：支持 Snap-to-Grid 技术，让蓝图布局更整齐雅观。

### 2. 完备的底层大模型注册表
* **全面集成**：无缝使用 Google Gemini (3.5 Flash/Pro, 3.1 Flash Lite)、OpenAI GPT、Anthropic Claude，或者基于 Ollama 彻底脱机本地运行自部署 LLaMA 3 以及 Mistral 系列模型。

### 3. 一键切换的高清演示模式 (Showcase)
* **业务陈述看板**：只需在头部工具栏点击 Showcase Mode 开关，所有的编辑工具箱、设置侧边栏和辅助功能将完全折叠，将极简画布最大化，方便向业务主管及非技术团队进行演示。

### 4. 三维立体 RAG 知识检索可视化
* **快速导入外部文档**：支持批量上传文本以及 Pdf 文档，自动进行语义切片（chunks）及高保真度向量索引。
* **3D RAG 交互图谱**：美轮美奂的向量相似性层级特征树，直观追踪检索匹配得分及权重排序，消除“黑盒”隐患。

### 5. 异地实时协同（Live Presence）
* **光标同步感知**：基于 Socket.io WebSockets，完美支持多用户共享编辑。
* **操作防止数据冲突**：用户编辑某节点时动态锁定组件，并伴有颜色边框动画警示，彻底打通跨国多活协作。

### 6. 精细的历史记录时光机 (Git-style)
* **快速拍摄快照**：将整个图表所有参数一键保存为历史版本，并可以在版本控制轴上自由回滚恢复。
* **变动 diff 分析**：针对复杂变量、算力参数的变动作出前后对比，轻松定位线上缺陷。

### 7. 可拓展集成功能与编程入口
* **自动化接口文档**：在 `/api-docs` 提供完整的 Swagger 交互式测试端口，方便在其他生产平台调用流程。
* **动态 Webhooks 与 CRON**：支持设置基于时间触发管道的自动化定时任务。

---

## 🛡️ 可靠的网络安全与架构工程保障

AgentForge44 从底层保障业务高可用，具备五大安全屏障：

* **无感自愈与表自动加载 (Self-Healing DB)**：在服务器初次冷启动阶段，不论是在裸机还是 Docker 运行，系统将深度检查 SQL 表完备性。如果发现缺少 Graphs/Metrics/Versions 的任何表结构，将自动同步进行 Drizzle 映射迁移，杜绝宕机。
* **敏感令牌自动擦除机 (Secret Masking)**：对通过后端的 JSON 数据执行严格的递归扫描。一旦涉及 API 密钥、管理员密码、JWT 授权或 private_key 属性，程序将在无影响运行的前提下直接用 `***MASKED***` 完全置空，防止日志泄漏。
* **自适应时间滑窗流控 (Rate Limiter)**：设立高稳防护阀值（默认每分钟 35 次，支持通过环境变量控制），防御来自外网的 DDoS 请求冲击，并向异常请求返回 `429 Too Many Requests`。
* **分支数据强隔离 (Structured Clone Data Safety)**：在流程图出现多路并行流（Forking Paths）之后，为防止脏数据写入，核心解析引擎全面实施深度复制 `structuredClone` 快照机制，杜绝竞态导致的逻辑雪崩。
* **路由 ReDoS (正则表达式服务拒绝攻击) 拦截**：如果用户自己修改了网关中的条件 Router 的 regex 校验参数，这些正则在执行前会预先通过安全性测试探头，当检测到指数级回溯风险（如 `(a+)+`）时将强行制止，保障整个进程健康不中断。

---

## ⚡ 快速开始

### 🐳 使用 Docker 资源编排服务（推荐，最省心）
```bash
# 启动所有 Vite，Express，SQLite 容器，全套服务开箱即用
docker-compose up --build
```
启动完毕后，在浏览器中即刻体验项目：**[http://localhost:3000](http://localhost:3000)**

### 🖥️ 系统裸机安装开发步骤
环境要求 Node.js v18 或以上版本。
```bash
# 1. 下载全局前端和后端包
npm install

# 2. 复制默认配置的环境文件
cp .env.example .env

# 3. 开启 Vite + Express 开发服务器
npm run dev
```
之后在浏览器中打开：**[http://localhost:3000](http://localhost:3000)**

---

## 📜 许可
项目基于 **MIT License** 软件许可开源。详情可阅读 [LICENSE](./LICENSE) 文件。
