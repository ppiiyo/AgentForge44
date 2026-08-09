<div align="center">

# 🌌 KostromAi44

### **企业级弹性自愈多智能体 (Multi-Agent) AI 网络可视化 Low-Code 编排平台**

[![CI Build](https://img.shields.io/github/actions/workflow/status/ppiiyo/AgentForge44/ci.yml?branch=main&style=for-the-badge&logo=github&label=CI%20构建)](https://github.com/ppiiyo/AgentForge44/actions)
[![Node Version](https://img.shields.io/badge/Node.js-%E2%89%A522.0.0-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-安全加固-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/开源协议-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[**English**](README.md) | [**Русский**](README.ru.md) | [**简体中文**](README.zh.md)

</div>

---

## 📖 平台概述

**KostromAi44** 是一款企业级可视化 AI 编排引擎，支持开发者在交互式矢量画布上轻松设计、模拟、调试和部署复杂的自主多智能体 (Multi-Agent) 拓扑网络。平台基于 Kahn 拓扑调度算法、Docker 沙箱代码隔离、Socket.io 实时协同以及自愈修复评估环路构建，兼具拖拽式工作流的便捷性与生产级后端架构的严谨性。

---

## ✨ 核心特性

| 功能模块 | 技术实现 | 核心价值 |
| :--- | :--- | :--- |
| 🚀 **拓扑并行调度器** | 基于 Kahn 算法的 DAG 层级调度与 Promise 连接池并发控制 | 无死锁并行执行独立 Agent 分支，大幅提升处理吞吐量 |
| 🔄 **透明自愈与遥测** | 自动化 LLM 修复逻辑与真实的 `completed_with_warning` 状态标记 | 拒绝隐式掩盖错误，实现自动修复与透明状态追溯 |
| 🛡️ **加固型代码沙箱** | 非 Root 权限 Docker 容器（`--cap-drop ALL`, `--network none`, 64MB 内存限制） | 安全隔离并执行用户自定义的 Python/JS 代码 |
| 👥 **实时多人协同** | 房间级 Socket.io 协同中心，支持矢量光标广播与状态锁 | 支持多名工程师实时协同设计复杂的 AI DAG 图谱 |
| 📚 **多格式 RAG 管道** | 支持 PDF/DOCX/MD 分块解析，集成 Pinecone/Weaviate/Qdrant/本地向量库 | 通过混合语义向量检索赋予大模型精准的上下文能力 |
| 🕑 **时光倒流调试器** | 不可变的变量与节点变更日志，支持快照回放 | 自由前后穿梭于工作流执行快照，精准追踪节点状态 |
| 🔒 **企业级安全架构** | Nonce CSP、SSRF IP 钉扎校验、Redis `jti` 撤销黑名单、AES-256 GCM 静态加密 | 严密保障数据隐私与企业系统安全 |

---

## 🏗️ 系统架构图

```mermaid
flowchart TD
    subgraph Client["🖥️ Web 前端 (React 19 + Vite)"]
        Canvas[ReactFlow 画布]
        Presence[实时协同模块]
        Obs[Recharts 监控图表]
        Health[AppHealthMonitor]
    end

    subgraph Gateway["🛡️ 安全 API 网关 (/api & /api/v1)"]
        CSP[Nonce CSP + Helmet + HSTS]
        RL[多层限流器 Rate Limiter]
        Guard[统一 Auth Guard · JWT + jti 黑名单]
        Tenant[多租户隔离上下文]
        SSRF[SSRF DNS/IP 校验 + IP 钉扎]
    end

    subgraph Engine["🧠 执行引擎 Engine"]
        Sched[Kahn 拓扑并行调度器]
        Exec[PipelineExecutor · 节点超时控制]
        CB[LLM 熔断器 + 指数退避]
        Heal[自愈修复 · completed_with_warning]
        SB[加固 Docker 代码沙箱]
    end

    subgraph Queue["📮 异步队列 (BullMQ)"]
        W[Worker 进程 · 失败重试]
        DLQ[死信队列 (DLQ) + 管理员修复]
    end

    subgraph Storage["💾 存储层"]
        DB[(Drizzle ORM · SQLite / PostgreSQL)]
        Vector[(向量数据库 · Pinecone/Weaviate/Qdrant/Local)]
    end

    subgraph Providers["🤖 大模型 Provider 矩阵"]
        Gemini[Google Gemini]
        OpenAI[OpenAI GPT-4o]
        Claude[Anthropic Claude]
        Ollama[Ollama 本地模型]
    end

    Client <-->|HTTP / Socket.io| Gateway
    Gateway --> Engine
    Engine <--> Queue
    Queue --> DLQ
    Engine --> Storage
    Engine --> Providers
```

---

## 🛠️ 技术栈

```
前端框架    : React 19 · Vite · Tailwind CSS v4 · ReactFlow v11 · Zustand · Framer Motion · Recharts
后端服务    : Node.js >= 22 · Express 4 · Socket.io · Winston Logger · Swagger / OpenAPI
数据库      : Drizzle ORM (SQLite 开箱即用 / PostgreSQL 生产级扩展)
消息队列    : Redis (ioredis) · BullMQ 包含死信队列 DLQ
代码沙箱    : 隔离 Docker 容器 (--cap-drop ALL, --read-only, --network none)
安全防护    : Helmet · Nonce CSP · SSRF IP 钉扎 · AES-256-GCM · JWT JTI 撤销
质量保障    : TypeScript Strict · ESLint · Vitest (覆盖率 >= 70%) · Playwright E2E · k6 压测
```

---

## 🚀 快速开始

### 1. 环境准备
- **Node.js**: `v22.0.0` 或更高版本
- **npm**: `v10.0.0` 或更高版本
- **Docker** *(可选，代码执行节点推荐)*: 本地运行 Docker 服务

### 2. 项目安装
```bash
# 克隆仓库
git clone https://github.com/ppiiyo/AgentForge44.git kostromai44
cd kostromai44

# 安装依赖
npm install
```

### 3. 环境配置
```bash
cp .env.example .env

# 生成高强度安全密钥 (至少 32 字符)
export JWT_SECRET=$(openssl rand -base64 48)
export ENCRYPTION_MASTER_KEY=$(openssl rand -base64 48)
```

### 4. 数据库初始化与启动
```bash
# 推送数据库 Schema (默认 SQLite)
npm run db:push

# 填充模板市场数据
npm run db:seed

# 启动开发服务器
npm run dev
```
在浏览器中打开 **`http://localhost:3000`**。首位注册账号将自动获得系统管理员 (Admin) 权限。

---

## ⚙️ 环境变量说明

| 变量名 | 类型 | 默认值 | 描述说明 |
| :--- | :---: | :---: | :--- |
| `PORT` | `number` | `3000` | 应用 HTTP 服务端口 |
| `NODE_ENV` | `string` | `development` | 运行环境 (`development` / `production` / `test`) |
| `JWT_SECRET` | `string` | *必填* | JWT 签名秘钥 (至少 32 字符) |
| `ENCRYPTION_MASTER_KEY` | `string` | *必填* | 数据库 API 秘钥静态加密密钥 |
| `DB_TYPE` | `string` | `sqlite` | 数据库引擎 (`sqlite` / `postgres`) |
| `DATABASE_URL` | `string` | — | PostgreSQL 数据库连接字符串 |
| `REDIS_URL` | `string` | — | Redis 连接字符串 (用于 BullMQ 及多节点缓存) |
| `GEMINI_API_KEY` | `string` | — | Google Gemini API Key |
| `OPENAI_API_KEY` | `string` | — | OpenAI API Key |
| `ANTHROPIC_API_KEY` | `string` | — | Anthropic Claude API Key |
| `OLLAMA_HOST` | `string` | `http://localhost:11434` | 本地 Ollama 服务地址 |

---

## 🔌 API 接口指南

所有 API 路由已统一支持 **`/api/v1`** 接口版本前缀（同时兼容 **`/api`** 前缀）。

| 请求方式 | 路由地址 | 功能说明 | 需要鉴权 |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/register` | 用户注册 (首位用户自动成为 Admin) | 否 |
| `POST` | `/api/v1/auth/login` | 用户登录并获取 JWT Token | 否 |
| `POST` | `/api/v1/auth/logout` | 注销登录并将 JWT 加入 Redis JTI 黑名单 | 是 |
| `POST` | `/api/v1/execute/graph` | 同步执行原始 DAG 图节点与连接关系 | 是 |
| `POST` | `/api/v1/execute/blueprint` | 根据 Blueprint ID 执行预存工作流 | 是 |
| `POST` | `/api/v1/runs` | 提交异步后台运行任务 | 是 |
| `GET` | `/api/v1/runs/:id` | 查询任务执行状态与节点日志 | 是 |
| `GET` | `/api/v1/health` | 系统多组件健康状态检查 | 否 |
| `GET` | `/metrics` | Prometheus 监控指标采集端点 | 是 |

更详细的交互式 Swagger API 文档可直接访问 **`/api-docs`**。

---

## 🧪 自动化测试与质量

```bash
# 运行单元与集成测试
npm test

# 检查测试覆盖率 (行覆盖率 >= 70%, 函数 >= 70%, 分支 >= 60%)
npm run test:coverage

# 运行 Playwright E2E 端到端测试
npm run test:e2e

# 运行 k6 性能与压力测试
npm run test:load

# 执行严格 TypeScript 类型检查与 Linter
npm run lint
```

---

## 📄 开源协议

本项目采用 **MIT 协议** 开源。详情参见 [`LICENSE`](LICENSE)。

<div align="center">

由 **KostromAi44** 团队精心打造 ❤️

[**返回顶部 ⬆️**](#-kostromai44)

</div>
