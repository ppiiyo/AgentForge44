# 🚀 KostromAi44 Quick Start Guide

Welcome to the KostromAi44 Setup Guide! This document will help you obtain your AI API keys, configure your environment variables, and run the project locally.

---

## 🔑 1. Obtaining AI API Keys

### 🟩 Google Gemini API (Primary)
The Gemini API is critical for full platform operation, powering the **Gemini Nodes**, the **Reviewer Node** (self-correction feedback loops), prompt optimizers, and the developer Co-pilot.

1. Navigate to **[Google AI Studio](https://aistudio.google.com/)**.
2. Sign in with your Google account.
3. Click the **"Get API Key"** button in the left sidebar menu.
4. Click **"Create API Key"**, select an existing Google Cloud project or create a new one instantly.
5. Copy your new key (it will begin with `AIzaSy...`).

*💡 **Sandbox/Demo Mode**: If you do not have a Google AI Studio account yet, you can configure your environment with:*
```env
GEMINI_API_KEY=sandbox_free_test_gemini
```
*The platform will enter an intelligent free simulation mode to let you play with the canvas.*

---

### 🟦 OpenAI API Key
Used to run models such as GPT-4o and GPT-4o-mini in your agent systems.

1. Navigate to the **[OpenAI Platform](https://platform.openai.com/)**.
2. In the sidebar, select **"API Keys"** (or visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)).
3. Click **"Create new secret key"**, name it, and copy the secret string (starts with `sk-...`).
4. *Ensure your OpenAI account has a positive credits balance to query the endpoints successfully.*

---

### 🟧 Anthropic Claude API Key
Enables Claude models (Claude 3.5 Sonnet, Claude 3 Opus) inside your orchestrator graph.

1. Register on the **[Anthropic Console](https://console.anthropic.com/)**.
2. Go to the **"API Keys"** section.
3. Click **"Create Key"** and copy your token (starts with `sk-ant-...`).

---

## ⚙️ 2. Configuration (`.env`)

In the project root, copy the `.env.example` file to create a `.env` file:

```bash
cp .env.example .env
```

Open `.env` and configure the following variables with your keys:

```env
# AI Models Keys
GEMINI_API_KEY=AIzaSyYourGeminiKeyHere
OPENAI_API_KEY=sk-proj-YourOpenAIKeyHere
ANTHROPIC_API_KEY=sk-ant-YourAnthropicKeyHere

# Mandatory Security Secrets
JWT_SECRET=use_a_long_random_string_here_at_least_32_chars
ENCRYPTION_MASTER_KEY=bc911854ea01d2c94bb507f308a0dfce9a6b8c7d8e9f0a1b2c3d4e5f6a7b8c9d
AGENTFORGE_API_KEY=af_key_demo_secret
```

---

## 🖥️ 3. Running the Project Locally

### Prerequisites
- Ensure you have **Node.js v18** or newer installed.
- Install packages and dependencies:

```bash
npm install
```

### Dev Mode
To launch the бэкенд and frontend servers under hot reload, execute:

```bash
npm run dev
```

The application console will print the startup message. Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 💡 Troubleshooting

- **Error: "GEMINI_API_KEY is not configured"**: Make sure your `.env` file has a valid entry. If you don't have a key, specify `sandbox_free_test_gemini` to run free demo workflows.
- **Error: "Master key is too short"**: Ensure `ENCRYPTION_MASTER_KEY` in `.env` is exactly a 64-character hexadecimal string to satisfy database AES encryption conditions.
