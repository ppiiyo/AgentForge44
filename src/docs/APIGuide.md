# 📘 Справочник по API & Руководство по Оркестрации Графов (API & Graph Orchestration Guide)

Добро пожаловать в полное руководство по программному управлению и оркестрации ИИ-агентов в **KostromAi44**. Этот документ содержит детальное описание REST API, структуры JSON-графов и пошаговые сценарии для построения сложных автоматизированных конвейеров (включая RAG и контуры самокоррекции).

---

## 🧭 1. Спецификация REST API

По умолчанию REST API доступен по адресу `http://localhost:3000/api` и поддерживает как синхронный запуск конвейеров (для быстрых ответов), так и асинхронный запуск через распределенную очередь задач (для масштабируемых и тяжелых фоновых вычислений).

### Сводная таблица конечных точек (Endpoints Summary)

| Метод | Путь | Описание | Авторизация / Роли | Режим |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/run-pipeline` | Синхронный запуск графа с триггерами вебхуков и логированием телеметрии. | Bearer Token / `editor`, `owner` | Синхронный |
| **POST** | `/api/execute` | Легковесный синхронный запуск графа без накладных расходов на телеметрию. | Bearer Token / `editor`, `owner` | Синхронный |
| **POST** | `/api/stream-pipeline` | Потоковый запуск (SSE) с отдачей промежуточных состояний нод в реальном времени. | Bearer Token / `editor`, `owner` | Потоковый (SSE) |
| **POST** | `/api/runs` | Добавление запуска графа в распределенную очередь (BullMQ/Redis). | Header `Authorization: Bearer <API_KEY>` | Асинхронный (202 Accepted) |
| **GET** | `/api/runs` | Получение списка всех асинхронных запусков в системе. | Публичный (или API Key) | Чтение |
| **GET** | `/api/runs/:id` | Детальный статус запуска, трассировка выполнения, логи и промежуточные выходы нод. | Публичный | Чтение |
| **POST** | `/api/runs/:id/resume`| Перезапуск упавшей асинхронной задачи с точки падения. | Публичный | Управление |
| **POST** | `/api/evals` | Запуск автоматической тестовой сюиты (Evaluation Suite) по набору тест-кейсов. | Bearer Token / `editor`, `owner` | Аналитика |
| **GET** | `/api/llm-providers` | Реестр поддерживаемых LLM провайдеров (Gemini, OpenAI, Claude, Ollama). | Публичный | Информационный |

---

## 🛠️ 2. Базовая структура JSON Графа

Любой ИИ-конвейер в KostromAi44 представляется в виде ориентированного графа, состоящего из двух основных массивов: `nodes` (узлы/компоненты вычислений) и `connections` (направленные связи для передачи данных).

### Спецификация Узла (Node Spec)
```json
{
  "id": "node_unique_id",
  "type": "llmNode | ragNode | reviewerNode | codeNode | routerNode",
  "data": {
    "label": "Human Readable Title",
    "prompt": "Шаблон промпта с переменными {{input}}",
    "provider": "google | openai | anthropic | ollama",
    "model": "gemini-3.5-flash | gpt-4o | claude-3-5-sonnet-latest",
    "temperature": 0.3,
    "maxTokens": 1024,
    "ragQuery": "Поисковый запрос",
    "code": "/* JavaScript код для изолированной песочницы isolated-vm */"
  }
}
```

### Спецификация Связи (Connection Spec)
Связи определяют, как данные перетекают из одной ноды в другую. Выходной слот (Source Output Handle) одного узла передает данные в определенный входной слот (Target Input Handle) принимающего узла.
```json
{
  "id": "conn_unique_id",
  "source": "source_node_id",
  "target": "target_node_id",
  "sourceHandle": "output",
  "targetHandle": "input"
}
```

---

## 📚 3. Практический кейс №1: RAG-конвейер (Retrieval-Augmented Generation)

Этот кейс демонстрирует создание цепочки из двух нод:
1. **RAG-узел** (`ragNode`) выполняет семантический поиск по загруженным документам или базе знаний.
2. **LLM-узел** (`llmNode`) использует контекст из базы знаний для синтеза точного ответа.

### Схема интеграции (Graph Architecture)
```
[Входные данные / Вопрос пользователя]
                │
                ▼
      ┌──────────────────┐
      │     ragNode      │ (Поиск релевантных кусков текста)
      └─────────┬────────┘
                │
                ├──────────────────────┐ (Передача контекста поиска)
                ▼                      ▼
      ┌──────────────────┐   ┌──────────────────┐
      │     llmNode      │   │  Второй LLM узел │ (Дополнительный синтез)
      └─────────┬────────┘   └──────────────────┘
                │
                ▼
         [Ответ системы]
```

### Пример JSON-запроса для API `/api/runs` (Асинхронная очередь)

```bash
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer af_key_demo_secret" \
  -d '{
    "graphId": "rag-pipeline-example",
    "inputs": {
      "user_question": "Как настроить шифрование AES в нашей базе данных?"
    },
    "nodes": [
      {
        "id": "rag_search_1",
        "type": "ragNode",
        "data": {
          "label": "Поиск в Базе Знаний Security",
          "ragQuery": "{{user_question}}",
          "limit": 3
        }
      },
      {
        "id": "llm_synthesize_1",
        "type": "llmNode",
        "data": {
          "label": "Синтез Ответа (Gemini 3.5)",
          "provider": "google",
          "model": "gemini-3.5-flash",
          "temperature": 0.1,
          "prompt": "Используя следующий проверенный контекст:\n{{rag_search_1}}\n\nОтветь профессионально на вопрос пользователя: {{user_question}}"
        }
      }
    ],
    "connections": [
      {
        "id": "conn_rag_to_llm",
        "source": "rag_search_1",
        "target": "llm_synthesize_1",
        "sourceHandle": "output",
        "targetHandle": "rag_search_1"
      }
    ]
  }'
```

---

## 🔄 4. Практический кейс №2: Контур самокоррекции (Critic / Loop Self-Correction)

Один из самых мощных паттернов агентных систем — **Reviewer Node (Самокоррекция)**. Он позволяет проверять результаты генерации одной LLM с помощью другой ИИ-ноды (критика), и при несоответствии критериям запускать повторную генерацию с передачей фидбека об ошибках.

### Схема интеграции (Self-Correction Architecture)
```
          ┌─────────────────┐
          │  input_trigger  │
          └────────┬────────┘
                   │
                   ▼
         ┌───────────────────┐◄─────────────────────────┐
         │     llmNode       │                         │
         │  (Генератор кода) │                         │
         └─────────┬─────────┘                         │
                   │                                   │ (Цикл повторной
                   ▼                                   │  генерации при ошибке)
         ┌───────────────────┐                         │
         │   reviewerNode    ├─────────────────────────┘
         │ (Критик/Валидатор)│  Статус: "fail" (Исправить ошибки)
         └─────────┬─────────┘
                   │
                   │ Статус: "pass" (Успешно)
                   ▼
         [Финальный результат]
```

### Пример JSON-запроса для API `/api/run-pipeline` (Синхронный запуск)

```bash
curl -X POST http://localhost:3000/api/run-pipeline \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "graphId": "self-correction-loop",
    "graphName": "Code Generation & Audit Loop",
    "nodes": [
      {
        "id": "generator_llm",
        "type": "llmNode",
        "data": {
          "label": "Генератор Python Функции",
          "provider": "google",
          "model": "gemini-3.5-pro",
          "temperature": 0.5,
          "prompt": "Напиши функцию на Python для парсинга YAML. Функция должна принимать строку и возвращать JSON. Выдай ТОЛЬКО чистый исполняемый код.\n\nПредыдущие замечания аудитора (если есть):\n{{reviewer_critic.feedback}}"
        }
      },
      {
        "id": "reviewer_critic",
        "type": "reviewerNode",
        "data": {
          "label": "Аудитор Безопасности & Синтаксиса",
          "provider": "google",
          "model": "gemini-3.5-flash",
          "temperature": 0.0,
          "criteria": "1. Код не должен содержать Markdown-разметку (```python).\n2. Должна быть обработка ошибок try/except.\n3. Не должно быть уязвимостей инъекции кода.",
          "prompt": "Проверь следующий код:\n{{generator_llm}}\n\nСоответствует ли он критериям:\n{{criteria}}\n\nЕсли код корректен, верни JSON: {\"status\": \"pass\", \"feedback\": \"\"}.\nЕсли есть ошибки, верни JSON: {\"status\": \"fail\", \"feedback\": \"описание ошибок\"}."
        }
      }
    ],
    "connections": [
      {
        "id": "conn_gen_to_rev",
        "source": "generator_llm",
        "target": "reviewer_critic",
        "sourceHandle": "output",
        "targetHandle": "generator_llm"
      },
      {
        "id": "conn_rev_back_to_gen",
        "source": "reviewer_critic",
        "target": "generator_llm",
        "sourceHandle": "feedback",
        "targetHandle": "reviewer_critic.feedback"
      }
    ]
  }'
```

---

## 🚦 5. Практический кейс №3: Мультиагентный роутер на основе намерений (Intent Router)

Этот кейс демонстрирует использование умного условного роутера (`routerNode`) для распределения трафика. Если пользователь запрашивает сложные математические расчеты, запрос перенаправляется на глубокую модель (Gemini 3.5 Pro), а простые вопросы — на дешевую и быструю (Gemini 3.5 Flash или Claude Haiku).

### Пример JSON-запроса

```json
{
  "graphId": "intent-multi-agent-router",
  "nodes": [
    {
      "id": "user_input",
      "type": "codeNode",
      "data": {
        "label": "Препроцессинг Запроса",
        "code": "return { question: input.user_question };"
      }
    },
    {
      "id": "intent_router",
      "type": "routerNode",
      "data": {
        "label": "Классификатор Намерений",
        "rules": [
          { "condition": "input.question.includes('код') || input.question.includes('разработай')", "targetNodeId": "pro_developer_agent" },
          { "condition": "true", "targetNodeId": "fast_general_agent" }
        ]
      }
    },
    {
      "id": "pro_developer_agent",
      "type": "llmNode",
      "data": {
        "provider": "google",
        "model": "gemini-3.5-pro",
        "prompt": "Ты элитный программист. Создай оптимальное решение для: {{user_input.question}}"
      }
    },
    {
      "id": "fast_general_agent",
      "type": "llmNode",
      "data": {
        "provider": "google",
        "model": "gemini-3.5-flash",
        "prompt": "Ответь кратко и лаконично: {{user_input.question}}"
      }
    }
  ],
  "connections": [
    {
      "id": "conn_input_to_router",
      "source": "user_input",
      "target": "intent_router",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]
}
```

---

## 📈 6. Жизненный цикл асинхронной задачи в BullMQ очереди

Когда вы отправляете POST-запрос на `/api/runs`, система немедленно ставит задачу в очередь Redis и возвращает `202 Accepted` со следующим телом ответа:

```json
{
  "success": true,
  "runId": "run_8f7b2c9d01e4",
  "status": "pending"
}
```

### Как опрашивать состояние исполнения? (Polling Status)

Выполняйте периодические запросы `GET /api/runs/run_8f7b2c9d01e4` для получения статуса выполнения:

```bash
curl -X GET http://localhost:3000/api/runs/run_8f7b2c9d01e4
```

#### Ответ при успешном завершении (Status: Completed)
```json
{
  "success": true,
  "id": "run_8f7b2c9d01e4",
  "status": "completed",
  "completedNodes": ["rag_search_1", "llm_synthesize_1"],
  "nodeOutputs": {
    "rag_search_1": "Найденные документы: [1] AES шифрование в PostgreSQL...",
    "llm_synthesize_1": "Для настройки шифрования AES в вашей базе данных..."
  },
  "results": {
    "finalResult": "Для настройки шифрования AES в вашей базе данных..."
  }
}
```

#### Восстановление упавших задач (Fault Tolerance & Resume)
Если во время выполнения одной из тяжелых нод (например, стороннего API) произошел сбой, статус задачи изменится на `failed`. Вы можете перезапустить задачу с последней успешно выполненной точки, отправив POST запрос:

```bash
curl -X POST http://localhost:3000/api/runs/run_8f7b2c9d01e4/resume \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [...],
    "connections": [...]
  }'
```

---

## 🛡️ 7. Лимиты и Безопасность API (API Limits & Security Rules)

1. **Защита от SSRF**: Все ноды запросов (HTTP Request, RAG) валидируются внутренним прокси. Обращения к приватным сетям (`10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.1`, `localhost`) блокируются для предотвращения утечек данных.
2. **Лимиты частоты запросов**: При обращении через внешние API ключи действует скользящий лимит частоты запросов (Sliding Window Rate Limiting) — **30 запросов в минуту** на каждый токен. При превышении возвращается код `429 Too Many Requests`.
3. **Безопасная песочница**: Ноды типа `codeNode` выполняются внутри изолированной песочницы `isolated-vm` с ограничением времени выполнения в 10 секунд и запретом доступа к сетевому и дисковому стеку хост-машины.
