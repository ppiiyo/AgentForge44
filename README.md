# 🌌 AgentForge44 Enterprise Edition

> **A production-grade, low-code interactive visual orchestration platform designed to build, test, evaluate, and deploy self-correcting multi-agent AI workflows.**  
> Connect modern LLMs (Google Gemini, OpenAI GPT, Anthropic Claude, and offline Ollama), stream parallel pipelines, integrate semantic knowledge graphs, and collaborate in real-time over modern WebSockets with built-in observability and deep resilience.

---

### 🌐 Select Language / Выберите язык / 选择语言
[![English](https://img.shields.io/badge/Language-English-6e5494?style=for-the-badge)](#-english-documentation)
[![Русский](https://img.shields.io/badge/Language-%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-1d70b8?style=for-the-badge)](#-русская-документация)
[![中文](https://img.shields.io/badge/Language-%E4%B8%AD%E6%96%87-de3831?style=for-the-badge)](#-中文官方文档)

---

# 🇷🇺 Русская документация

## 🚀 1. Обзор проекта

### Что такое AgentForge44?
**AgentForge44** — это корпоративная low-code платформа визуального моделирования и оркестрации ИИ-агентов, построенная на базе современных стандартов Enterprise-разработки. Инструмент предоставляет интуитивный интерфейс, объединяющий визуальный холст для сборки пайплайнов и производительную серверную среду на Node.js. С его помощью вы можете визуализировать, отлаживать, профилировать и деплоить сложные цепочки рассуждений моделей в виде масштабируемых и отказоустойчивых REST API.

---

## 🏗️ 2. Архитектура и стек технологий

```text
  ┌─────────────────────────────────────────────────────────────┐
  │                 AGENTFORGE44 USER INTERFACE                 │
  │  ┌──────────────┐    ┌─────────────────┐    ┌────────────┐  │
  │  │  Flow Canvas │    │ Configure Panel │    │ Log Viewer │  │
  │  │ [Showcase Mode]    │ [Model Selector]│    │ [Telemetry]│  │
  │  └──────┬───────┘    └────────┬────────┘    └─────┬──────┘  │
  └_________┼_____________________┼___________________┼_________┘
            │                     │                   │
  ┌─────────┼─────────────────────┼───────────────────┼─────────┐
  │         ▼                     ▼                   ▼         │
  │            NODE.JS / EXPRESS CORE & WEBSOCKET GATEWAY       │
  │  ┌──────────────────────┐   ┌────────────────────────────┐  │
  │  │  Drizzle ORM Engine  │   │  Socket.IO Live Presence   │  │
  │  │ (PostgreSQL/SQLite)  │   │    (Multi-User Cursors)    │  │
  │  └──────────┬───────────┘   └──────────────┬─────────────┘  │
  │             │                              │                │
  │  ┌──────────▼───────────┐   ┌──────────────▼─────────────┐  │
  │  │   Sandbox VM Worker  │   │   Secret Payload Masker    │  │
  │  │ (Safe Isolated Thread)│   │ (Anti-API Leak Engine)     │  │
  │  └──────────────────────┘   └────────────────────────────┘  │
  └─────────────────────────────────────────────────────────────┘
```

### Стек технологий:
* **Frontend**: React 18+, Vite, Tailwind CSS, Framer Motion (анимации), Lucide Icons.
* **Backend**: Node.js, Express (API Gateway), TSX, Winston (логирование), Sentry (отслеживание ошибок).
* **Базы данных**: Polymorphic Drizzle ORM (поддержка горячей миграции и бесшовного переключения между SQLite и PostgreSQL).
* **Сетевой слой**: Socket.io (WebSocket) для совместного редактирования, Express Rate Limiter.
* **Observability**: OpenTelemetry SDK + Tracing API, Prometheus Metrics Client (`prom-client`).
* **Resilience**: Custom Circuit Breaker (предохранитель), Exponential Backoff Retry с добавлением Jitter.

---

## 🛡️ 3. Функциональные возможности (Deep Dive)

### 🧩 3.1. Визуальный редактор графов
Сборка сложных ИИ-пайплайнов из коробки без написания кода:
* **Каталог функциональных узлов**:
  * `Input Node`: Сбор начальных аргументов и динамических переменных.
  * `Prompt Template Node`: Проектирование шаблонов (с поддержкой Mustache/Handlebars синтаксиса).
  * `LLM Engine Node`: Выбор конкретного провайдера, температуры, лимита токенов.
  * `Reviewer Node`: Специальный узел-судья, который проверяет ответ LLM на соответствие критериям и при необходимости заворачивает на цикл самокоррекции.
  * `Router Node`: Условное разделение потока на основе регулярных выражений или скрипта.
  * `RAG Knowledge Node`: Семантический поиск по подключенной базе знаний.
  * `Tool Node`: Выполнение безопасного пользовательского JavaScript кода в изолированной песочнице.
  * `Output Node`: Финализация и выдача структурированного ответа (JSON/Текст).
* **Интерактивный холст**: Плавное позиционирование векторов, Zoom & Pan от `50%` до `150%`, выравнивание в один клик кнопкой `Snap-to-Grid` (привязка к сетке).

### ⚡ 3.2. Презентационный режим (Showcase Mode)
Позволяет скрыть все панели управления (тулбоксы, настройки узлов, инспекторы) одним нажатием кнопки. На экране остается только минималистичный интерактивный холст разработки ИИ-систем, готовый для демонстрации стейкхолдерам, презентаций клиентам и живых тестов.

### 👥 3.3. Совместное редактирование в реальном времени (Live Presence)
* **WebSocket-синхронизация**: Отображение перемещения мышей и курсоров коллег на холсте.
* **Умные блокировки**: Когда один пользователь заходит в настройки параметров карточки, она временно блокируется для всех остальных членов команды, исключая гонку данных и предотвращая конфликты слияния.

### 📚 3.4. Трёхмерный RAG-визуализатор (3D Knowledge Tree)
Импортируйте PDF-документы, регламенты или текстовые файлы. Наш RAG-узел автоматически нарезает текст на куски (chunks).
Интерфейс предоставляет анимированное интерактивное дерево векторов, где узлы представляют фрагменты знаний, а ветви показывают релевантность и силу семантической связи на основе формулы косинусного сходства.

### 🕒 3.5. Путешествие во времени (Git-style Time Travel)
Система инкрементального ведения истории:
* **Снимки состояний (Snapshots)**: Делайте бэкап структуры графа с сохранением комментариев о внесенных изменениях.
* **Сравнительный анализ (Diff-Viewer)**: Показывает разницу между текущей и прошлыми версиями параметров. Простая кнопка отката позволяет моментально вернуть проект в стабильное прошлое состояние.

---

## 🎛️ 4. Корпоративная безопасность (Enterprise-Grade Security)

Безопасность является краеугольным камнем архитектуры AgentForge44:

```typescript
// Пример: Изоляция контекста и глубокое клонирование для предотвращения гонки параллельных путей
import { structuredClone } from 'node:buffer';
export function secureClonePayload<T>(payload: T): T {
  return structuredClone(payload);
}
```

* **Защита от SSRF (Server-Side Request Forgery)**:
  Встроенный валидатор блокирует выполнение внешних HTTP/API-запросов во время исполнения пайплайна к петлевым адресам (`localhost`, `127.0.0.1`, приватные подсети `10.0.0.0/8`, `192.168.0.0/16`), предотвращая несанкционированное сканирование внутренней сетевой инфраструктуры.
* **Маскировка секретов (Secret Masking Payload Cleanser)**:
  Любые JSON Payload или HTTP-логи на сервере проходят сквозь препроцессор фильтрации. Такие поля, как `api_key`, `password`, `jwt_token`, `authorization`, автоматически заменяются на строку `***MASKED***` без нарушения хода выполнения программы.
* **Защита от ReDoS (Regular Expression Denial of Service)**:
  При вводе пользовательских регулярных выражений в ветвлениях (`Router Node`), бэкенд проверяет паттерны на экспоненциальное время вычисления (Catastrophic Backtracking) перед запуском, предотвращая перегрузку процессора.
* **Безопасная песочница кода (VM Isolation)**:
  Выполнение кастомного JS-кода в узлах `Tool` происходит внутри безопасного дочернего процесса Worker-потока в изолированном контексте виртуальной машины без прямого доступа к файловой системе или глобальным переменным сервера.
* **Скользящее ограничение частоты запросов (Sliding Rate-Limiter)**:
  Предохраняет бэкенд и лимитированные платные токены Gemini/OpenAI от злоупотреблений, DDoS-атак и циклов-паразитов.

---

## 🔌 5. Отказоустойчивость и Observability (Наблюдаемость)

### 📈 5.1. Паттерн Resilience (Плавная деградация)
При нестабильном интернет-соединении или сбоях API на стороне провайдеров (Gemini/Anthropic), AgentForge44 задействует механизмы живучести:
1. **Экспоненциальный повтор (Exponential Backoff)**:
   При возникновении сетевой ошибки (за исключением 400, 401, 403), узел пробует выполнить запрос повторно с нарастающей задержкой: `50ms → 100ms → 200ms` с добавлением случайного фазового шума (Jitter).
2. **Circuit Breaker (Предохранитель)**:
   Если провайдер возвращает стабильные ошибки (более 5 раз подряд), предохранитель открывается (`OPEN`), и все новые запросы к сломанному ИИ-провайдеру мгновенно блокируются до восстановления работоспособности, а система переключается на запасной локальный Ollama ИИ-узел.

### 📊 5.2. Мониторинг Prometheus & OpenTelemetry
На борту развернута полноценная система телеметрии:
* **Prometheus метрики** (доступны по адресу `/metrics`):
  * `http_requests_total`: общее количество запросов к API.
  * `http_request_duration_seconds`: гистограмма латентности запросов.
  * `llm_calls_total`: общее число обращений к ИИ-агентам.
  * `llm_call_duration_seconds`: время ответа каждой языковой модели.
* **OpenTelemetry Tracing**:
  Каждый запуск графа генерирует распределенный Trace. Вы можете отследить жизненный путь запроса от UI до глубоких SQL-запросов и LLM-ответов с детальной разбивкой по времени.

---

## 💾 6. Работа с СУБД и Система Авто-Миграций (Polymorphic DB Factory)

AgentForge44 предоставляет интеллектуальную архитектурную фабрику баз данных:

```typescript
// Из файла src/api/db.ts
export function createDatabaseConnection(): IDatabaseAdapter {
  const envDbType = process.env.DB_TYPE || 'sqlite';
  const databaseUrl = process.env.DATABASE_URL || '';
  ...
}
```

### Высокая полиморфность:
1. **SQLite**: Идеально для локальной разработки, легковесного запуска в Docker и быстрых тестов.
2. **PostgreSQL**: Выбор для промышленной эксплуатации (Enterprise).
* **Горячее переключение**: Назначив переменную `DB_TYPE="postgres"` и передав строку подключения `DATABASE_URL="postgres://..."`, фабрика за секунды перекомпонует внутренний пул подключений Drizzle.
* **Префлайт-валидатор (Pre-Flight Validator)**: Бэкенд валидирует синтаксис строки `DATABASE_URL` на старте. Если `DB_TYPE` переведен в `postgres`, но реквизиты отсутствуют или указаны неверно, сервер мгновенно остановит компиляцию с подробным текстом ошибки, спасая приложение от скрытых падений в рантайме.
* **Автоматическое самовосстановление (Self-Healing Migrations)**:
  Вам не нужно вручную накатывать SQL-скрипты. Наш мигратор (`src/api/migrate.ts`) при запуске проверяет наличие необходимых таблиц (`users`, `graphs`, `metrics`, `deployments`, `versions`, `api_keys`). Если структуры отсутствуют, СУБД автоматически разворачивает всю схему сущностей за миллисекунды.

---

## ⚡ 7. Инструкция по запуску

### 🐳 Вариант А: Запуск через Docker Compose (Рекомендуемый)
Убедитесь, что у вас установлены Docker и Docker Compose:
```bash
# 1. Склонируйте репозиторий
git clone https://github.com/your-org/agentforge44.git
cd agentforge44

# 2. Поднимите инфраструктуру (Vite, Server, SQLite, Swagger, Sockets)
docker-compose up --build
```
Интерфейс доступен в браузере: **[http://localhost:3000](http://localhost:3000)**

### 🖥️ Вариант Б: Локальный запуск на физическом хосте
Требования: Node.js версия 18 или выше.
```bash
# 1. Установите зависимости
npm install

# 2. Создайте файл конфигурации окружения
cp .env.example .env

# 3. Запустите fullstack сервер разработки (tsx + Web Vite)
npm run dev
```
Откройте адрес: **[http://localhost:3000](http://localhost:3000)**

---

## 📁 8. Структура проекта

```text
AgentForge44/
├── src/                    # Фронтенд-приложение на React + TS
│   ├── components/         # Визуальные панели интерфейса
│   │   ├── FlowCanvas.tsx           # Основное полотно графа
│   │   ├── Toolbox.tsx              # Инструменты перетаскивания узлов
│   │   └── MetricsDashboard.tsx     # Grafana-like графики и стоимость
│   ├── features/           # Тематические фичи (Редактор, Настройки)
│   ├── db/                 # Схемы баз данных Drizzle
│   │   ├── schema.ts                # Спецификация для SQLite
│   │   ├── postgres-schema.ts       # Спецификация для PostgreSQL
│   │   └── adapters.ts              # Адаптеры баз данных
│   └── main.tsx            # Точка монтирования React
├── server.ts               # Главная точка входа Express-сервера
├── src/api/                # API-контроллеры бэкенда
│   ├── db.ts                        # Центральная фабрика соединений СУБД
│   ├── migrate.ts                   # Самовосстанавливающиеся SQL-миграции
│   └── agentRun.ts                  # Ядро исполнения узловой логики агентов
├── docs/                   # Подробные руководства по API
├── Dockerfile              # Docker-инструкция приложения
├── docker-compose.yml      # Спецификация сборки Compose
└── package.json            # Описание пакетов NPM
```

---

## 📜 9. Документация API

После запуска сервера интерактивная документация Swagger доступна по адресу **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**.

### Основные запросы:

#### 1. Создать/Обновить граф потока (`POST /api/graphs`)
```bash
curl -X POST http://localhost:3000/api/graphs \
  -H "Content-Type: application/json" \
  -d '{
    "id": "enterprise-corrector",
    "name": "ИИ Агент Корректор",
    "nodes": [
      {
        "id": "prompt-1",
        "type": "prompt",
        "fields": { "text": "Исправь грамматические ошибки в тексте: {{input_text}}" }
      }
    ],
    "connections": []
  }'
```

#### 2. Запустить пайплайн агентов на исполнение (`POST /api/execute`)
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "graphId": "enterprise-corrector",
    "inputs": {
      "input_text": "Привет мир! Каг дила?"
    }
  }'
```

---

# 🇬🇧 English Documentation

## 🚀 1. Overview

### What is AgentForge44?
**AgentForge44** is a high-availability, low-code Visual AI Agent Orchestrator and runtime container built for mission-critical environment deployments. It features an intuitive vector canvas where developers can connect, configure, and wire complex chain-of-thought routing, self-correction loops, semantic RAG pipelines, and code executor sandboxes, serving them as production-ready APIs.

---

## 💎 2. Features Deep Dive

* **Polymorphic Database Adapters**: Effortlessly switch from localized SQLite files to enterprise PostgreSQL instances.
* **Auto-Healing Schema Migrator**: Automatically validates the schema state on boot, initializing entities transactionally if missing.
* **Double-Barrier Resiliency Stack**: Integrated exponential backoff retries with randomized Jitter paired with stateful Circuit Breaker mechanisms to isolate degraded LLM pathways.
* **Ultimate Security Shield**: Blocks Server-Side Request Forgeries (SSRF) utilizing network exclusion lists, cleanses logs via recursive secret payload filters, and mitigates ReDoS attacks on edge routes.
* **Live Presence Collaboration**: Features precise real-time WebSocket cursors and state locking mechanisms.
* **Interactive 3D RAG Viewer**: Inspect, query, and trace semantic clusters and vector chunk similarity weights in real-time.
* **Distributed OpenTelemetry Traces**: Analyze performance metrics from HTTP triggers down to visual nodes and Drizzle queries.

---

## ⚡ 3. Quick Start

Ensure Node.js v18+ is available on your workstation:
```bash
# Clone and setup env variables
git clone https://github.com/your-org/agentforge44.git
cd agentforge44
cp .env.example .env

# Bootstrap Node.js backend & Vite UI in development mode
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** inside your browser to start building!

---

# 🇨🇳 中文官方文档

## 🚀 1. 项目概览

### 什么是 AgentForge44？
**AgentForge44** 是一款低代码高可用、多智能体交互式可视化设计器与运行引擎。通过它，开发者们不仅可以通过拖拽节点实现复杂的条件逻辑（Router）、自我修正审查（Reviewer）、三维知识库（RAG）检索以及代码沙箱逻辑（Tool），还可以依靠高强度的冗余架构，将编排好的逻辑一键输出为具备工业级安全、监控与自我恢复功能的标准 REST 接口。

---

## 🛡️ 2. 核心架构与安全保障

* **无感表自愈（Self-Healing Migrations）**：服务器冷启动时，系统启动器深度扫描表配置，Drizzle 发现数据库缺漏自动进行静默建表，免除手动维护烦恼。
* **双效容灾自愈（Circuit Breaker & Retry）**：请求重试机制伴随指数级退避策略与干扰偏置，结合熔断器自动屏蔽故障 proivder 并在控制台报警。
* **SSRF 安全沙盒防御**：严格屏蔽包括 `localhost`、私有子网在内的各类漏洞，阻断以系统作为跳板针对内网拓扑进行未授权扫描嗅探的行径。
* **分布式遥测监控（Prometheus & OTel）**：支持在 `/metrics` 跟踪全局并发量与网络延时，配合 OpenTelemetry 全链路 Trace，让 AI 的逻辑执行完全透见、告别黑盒。

---

## ⚡ 3. 快速启动

```bash
# 使用 Docker Compose 快速构建（推荐）
git clone https://github.com/your-org/agentforge44.git
cd agentforge44
docker-compose up --build
```
启动完毕后，在浏览器中即可体验：**[http://localhost:3000](http://localhost:3000)**。

---

## 📜 10. License

AgentForge44 is built under the terms of the **MIT License**. Read the [LICENSE](./LICENSE) file for further clarifications.

---
*🌌 Crafted for the next frontier of robust, resilient, and enterprise-secure AI system design.*
