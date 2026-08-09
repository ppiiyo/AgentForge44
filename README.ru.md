<div align="center">

# 🌌 KostromAi44

### **Визуальный Low-Code Оркестратор Промышленного Уровня для Отказоустойчивых Мультиагентных ИИ-Сетей**

[![CI Build](https://img.shields.io/github/actions/workflow/status/ppiiyo/AgentForge44/ci.yml?branch=main&style=for-the-badge&logo=github&label=CI%20Сборка)](https://github.com/ppiiyo/AgentForge44/actions)
[![Node Version](https://img.shields.io/badge/Node.js-%E2%89%A522.0.0-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Защищённый-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Лицензия](https://img.shields.io/badge/Лицензия-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[**English**](README.md) | [**Русский**](README.ru.md) | [**简体中文**](README.zh.md)

</div>

---

## 📖 Обзор

**KostromAi44** — это корпоративная платформа для визуальной оркестрации ИИ, позволяющая проектировать, моделировать, отлаживать и развёртывать сложные топологии автономных мультиагентных систем. Построенный на базе топологического планировщика Кана, изолированного песочницы Docker, совместного редактирования в реальном времени через Socket.io и циклов самовосстановления, KostromAi44 сочетает удобство визуального конструктора и надёжность промышленного бэкенда.

---

## ✨ Ключевые Возможности

| Функция | Техническая Реализация | Преимущество |
| :--- | :--- | :--- |
| 🚀 **Топологический Планировщик** | Алгоритм Кана для уровня DAG с параллельным Promise-пулингом | Выполняет независимые ветки агентов параллельно без блокировок |
| 🔄 **Самовосстановление с Честной Телеметрией** | Автоматические процедуры исправления через LLM с пометкой `completed_with_warning` | Исключает скрытые сбои и автоматически восстанавливает узлы |
| 🛡️ **Изолированная Песочница** | Docker-контейнеры от имени root-less пользователя (`--cap-drop ALL`, `--network none`, `--read-only`, 64MB RAM) | Безопасно исполняет пользовательский код Python/JS |
| 👥 **Совместная Работа** | Комнаты присутствия Socket.io с трансляцией курсоров и блокировкой состояний | Совместное проектирование сложных графов несколькими инженерами |
| 📚 **Мультиформатный RAG** | Парсер PDF/DOCX/MD в сочетании с Pinecone, Weaviate, Qdrant или локальными хранилищами | Обогащает контекст LLM гибридным семантическим поиском |
| 🕑 **Отладчик «Путешествие во Времени»** | Журнал изменений переменных и графа с возможностью мгновенного снимка | Пошаговый просмотр и воспроизведение истории выполнения |
| 🔒 **Корпоративная Безопасность** | Nonce-based CSP, валидатор SSRF с пиннингом IP, JWT с отзывом через Redis `jti`, шифрование AES-256 GCM | Соответствует строгим стандартам безопасности |

---

## 🏗️ Архитектура Системы

```mermaid
flowchart TD
    subgraph Client["🖥️ Веб-Клиент (React 19 + Vite)"]
        Canvas[ReactFlow Хост]
        Presence[Модуль Совместной Работы]
        Obs[Дашборд Аналитики Recharts]
        Health[Монитор Состояния HealthCheck]
    end

    subgraph Gateway["🛡️ Шлюз Безопасности & API (/api & /api/v1)"]
        CSP[Nonce CSP + Helmet + HSTS]
        RL[Многоуровневый Rate Limiter]
        Guard[Единый Auth Guard · JWT + jti Blacklist]
        Tenant[Контекст Изоляции Тенантов]
        SSRF[Валидатор SSRF DNS/IP + Пиннинг IP]
    end

    subgraph Engine["🧠 Движок Исполнения"]
        Sched[Топологический Планировщик Кана]
        Exec[Исполнитель Конвейера · Таймауты Узлов]
        CB[Circuit Breaker LLM + Экспоненциальный Откат]
        Heal[Самовосстановление · completed_with_warning]
        SB[Изолированная Песочница Docker]
    end

    subgraph Queue["📮 Очередь Задач (BullMQ)"]
        W[Воркеры · Повторы Задач]
        DLQ[Очередь Необработанных Сообщений (DLQ)]
    end

    subgraph Storage["💾 Слой Хранения"]
        DB[(Drizzle ORM · SQLite / PostgreSQL)]
        Vector[(Векторные Индексы · Pinecone/Weaviate/Qdrant/Local)]
    end

    subgraph Providers["🤖 Матрица Моделей LLM"]
        Gemini[Google Gemini]
        OpenAI[OpenAI GPT-4o]
        Claude[Anthropic Claude]
        Ollama[Ollama Локально]
    end

    Client <-->|HTTP / Socket.io| Gateway
    Gateway --> Engine
    Engine <--> Queue
    Queue --> DLQ
    Engine --> Storage
    Engine --> Providers
```

---

## 🛠️ Технологический Стек

```
Фронтенд    : React 19 · Vite · Tailwind CSS v4 · ReactFlow v11 · Zustand · Framer Motion · Recharts
Бэкенд      : Node.js >= 22 · Express 4 · Socket.io · Winston Logger · Swagger / OpenAPI
БД          : Drizzle ORM (SQLite для локального запуска / PostgreSQL для продакшена)
Очереди     : Redis (ioredis) · BullMQ с Dead Letter Queue
Песочница   : Изолированные Docker-контейнеры (--cap-drop ALL, --read-only, --network none)
Безопасность: Helmet · Nonce CSP · SSRF IP-Pinning · AES-256-GCM · JWT с JTI Blacklist
Тестирование: TypeScript Strict · ESLint · Vitest (Покрытие >= 70%) · Playwright E2E · k6 Load Testing
```

---

## 🚀 Быстрый Старт

### 1. Требования
- **Node.js**: `v22.0.0` или выше
- **npm**: `v10.0.0` или выше
- **Docker** *(Опционально, рекомендуется для узлов кода)*: локально запущенный Docker Daemon

### 2. Установка
```bash
# Клонирование репозитория
git clone https://github.com/ppiiyo/AgentForge44.git kostromai44
cd kostromai44

# Установка зависимостей
npm install
```

### 3. Настройка Окружения
```bash
cp .env.example .env

# Генерация секретных ключей (минимум 32 символа)
export JWT_SECRET=$(openssl rand -base64 48)
export ENCRYPTION_MASTER_KEY=$(openssl rand -base64 48)
```

### 4. Инициализация БД и Запуск
```bash
# Применение схемы базы данных (SQLite по умолчанию)
npm run db:push

# Заполнение маркетплейса шаблонами
npm run db:seed

# Запуск сервера разработки
npm run dev
```
Откройте **`http://localhost:3000`** в браузере. Первый зарегистрированный пользователь автоматически получает права Администратора.

---

## ⚙️ Переменные Окружения

| Ключ | Тип | По Умолчанию | Описание |
| :--- | :---: | :---: | :--- |
| `PORT` | `number` | `3000` | HTTP-порт приложения |
| `NODE_ENV` | `string` | `development` | Окружение (`development` / `production` / `test`) |
| `JWT_SECRET` | `string` | *Обязательно* | Секретный ключ подписи JWT (мин. 32 символа) |
| `ENCRYPTION_MASTER_KEY` | `string` | *Обязательно* | Ключ шифрования API-ключей в БД |
| `DB_TYPE` | `string` | `sqlite` | Движок БД (`sqlite` / `postgres`) |
| `DATABASE_URL` | `string` | — | Строка подключения для PostgreSQL |
| `REDIS_URL` | `string` | — | Подключение к Redis для BullMQ и кэширования |
| `GEMINI_API_KEY` | `string` | — | API-ключ Google Gemini |
| `OPENAI_API_KEY` | `string` | — | API-ключ OpenAI |
| `ANTHROPIC_API_KEY` | `string` | — | API-ключ Anthropic Claude |
| `OLLAMA_HOST` | `string` | `http://localhost:11434` | Хост сервиса Ollama |

---

## 🔌 Справочник API

Все маршруты API поддерживают версию **`/api/v1`** (с обратной совместимостью через **`/api`**).

| Метод | Маршрут | Описание | Авторизация |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/register` | Регистрация (первый пользователь становится `admin`) | Нет |
| `POST` | `/api/v1/auth/login` | Вход и получение JWT-токена | Нет |
| `POST` | `/api/v1/auth/logout` | Отзыв JWT через Redis JTI blacklist | Да |
| `POST` | `/api/v1/execute/graph` | Синхронный запуск узлов и связей графа | Да |
| `POST` | `/api/v1/execute/blueprint` | Запуск сохранённого шаблона конвейера | Да |
| `POST` | `/api/v1/runs` | Асинхронный запуск фоновой задачи | Да |
| `GET` | `/api/v1/runs/:id` | Проверка статуса и логов исполнения | Да |
| `GET` | `/api/v1/health` | Проверка состояния компонентов системы | Нет |
| `GET` | `/metrics` | Эндпоинт метрик Prometheus | Да |

Интерактивная документация Swagger доступна по адресу **`/api-docs`**.

---

## 🧪 Тестирование и Качество Кода

```bash
# Запуск модульных и интеграционных тестов
npm test

# Проверка покрытия (Lines >= 70%, Functions >= 70%, Branches >= 60%)
npm run test:coverage

# Запуск E2E тестов Playwright
npm run test:e2e

# Запуск нагрузочных тестов k6
npm run test:load

# Строгая проверка типов TypeScript и линтер
npm run lint
```

---

## 📄 Лицензия

Распространяется под лицензией **MIT**. Подробности в файле [`LICENSE`](LICENSE).

<div align="center">

Сделано с ❤️ командой **KostromAi44**.

[**Наверх ⬆️**](#-kostromai44)

</div>
