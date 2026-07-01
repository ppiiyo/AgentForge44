# 📖 Comprehensive Guide to API Key Configuration & Local Setup

This guide provides step-by-step instructions on **where to obtain your API keys**, **how to configure them** inside environment variables, and **how to boot the AgentForge44 project locally**.

---

## 🗺️ Table of Contents
1. [🔑 External AI Provider API Keys](#-external-ai-provider-api-keys)
   - [Google Gemini API Key (Primary)](#1-google-gemini-api-key-primary)
   - [OpenAI API Key](#2-openai-api-key)
   - [Anthropic Claude API Key](#3-anthropic-claude-api-key)
   - [Local Ollama (No keys required)](#4-local-ollama-no-keys-required)
2. [📦 Knowledge Retrieval (RAG) API Keys](#-knowledge-retrieval-rag-api-keys)
   - [Pinecone, Weaviate, Qdrant](#1-pinecone-weaviate-qdrant)
   - [Tavily Search API (Real-time search grounding)](#2-tavily-search-api-real-time-search-grounding)
3. [⚙️ Mandatory Cryptographic Backend Secrets](#-mandatory-cryptographic-backend-secrets)
   - [JWT_SECRET](#1-jwt_secret)
   - [ENCRYPTION_MASTER_KEY](#2-encryption_master_key)
   - [AGENTFORGE_API_KEY (Bearer Shield)](#3-agentforge_api_key-bearer-shield)
4. [🖥️ Project Startup Instructions](#-project-startup-instructions)
   - [Method A: Run with Docker Compose (Recommended)](#method-a-run-with-docker-compose-recommended)
   - [Method B: Local Run via npm (For development)](#method-b-local-run-via-npm-for-development)
5. [💡 Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🔑 External AI Provider API Keys

### 1. Google Gemini API Key (Primary)
This key is crucial for full-featured app use, powering **Gemini Nodes**, the self-correction loop (**Reviewer Node**), the Copilot panel, and prompt optimizers.

* **Where to obtain:**
  1. Go to **[Google AI Studio](https://aistudio.google.com/)**.
  2. Sign in with your Google account.
  3. Click **"Get API Key"** in the top-left menu.
  4. Click **"Create API Key"** and select or create a project.
  5. Copy the generated key (it starts with `AIzaSy...`).
* **How to configure:**
  Add this line to your `.env` file:
  ```env
  GEMINI_API_KEY=AIzaSyYourKeyHere
  ```
  > 💡 **Demo Sandbox Mode:** If you wish to test the visual workspace without registering a real key, use this placeholder:
  > ```env
  > GEMINI_API_KEY=sandbox_free_test_gemini
  > ```
  > The server will simulate realistic model outputs absolutely free of charge.

---

### 2. OpenAI API Key
Used to run models like GPT-4o, GPT-3.5-Turbo in your agent pipelines.

* **Where to obtain:**
  1. Navigate to the **[OpenAI Platform](https://platform.openai.com/)**.
  2. Select **"API Keys"** from the left sidebar or visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
  3. Click **"Create new secret key"**, name it, and copy the secret (starts with `sk-...`).
  *Ensure you have a positive account balance on OpenAI to execute queries successfully.*
* **How to configure:**
  ```env
  OPENAI_API_KEY=sk-proj-YourKeyHere
  ```

---

### 3. Anthropic Claude API Key
Connects Anthropic models (Claude 3.5 Sonnet, Claude 3 Opus) to your workflow pipelines.

* **Where to obtain:**
  1. Register on the **[Anthropic Console](https://console.anthropic.com/)**.
  2. Go to the **"API Keys"** section.
  3. Click **"Create Key"** and copy the string (starts with `sk-ant-...`).
* **How to configure:**
  ```env
  ANTHROPIC_API_KEY=sk-ant-YourKeyHere
  ```

---

### 4. Local Ollama (No keys required)
Run open-source models (Llama 3, Mistral, Gemma, Qwen) completely locally and privately on your GPU/CPU.

* **Where to obtain and run:**
  1. Download and install **[Ollama](https://ollama.com/)**.
  2. Launch the Ollama client.
  3. Pull your model of choice via your terminal:
     ```bash
     ollama run llama3
     ```
  4. By default, Ollama binds to `http://localhost:11434`.
* **How to configure:**
  ```env
  OLLAMA_HOST=http://localhost:11434
  ```

---

## 📦 Knowledge Retrieval (RAG) API Keys

### 1. Pinecone, Weaviate, Qdrant
For cloud vector searches over uploaded company wiki documents.

* **Pinecone:**
  - **Where to obtain:** Log in to **[Pinecone.io](https://www.pinecone.io/)**, copy your API key under the **"API Keys"** tab, and create an index.
  - **Configuration:**
    ```env
    VECTOR_STORE_PROVIDER=pinecone
    VECTOR_STORE_API_KEY=your-pinecone-api-key
    VECTOR_STORE_ENV=us-east-1-gcp
    VECTOR_STORE_INDEX=my-rag-index
    ```

* **Weaviate / Qdrant:**
  Provide endpoints and tokens as specified:
  ```env
  VECTOR_STORE_PROVIDER=qdrant
  VECTOR_STORE_ENDPOINT=https://your-qdrant-cluster.cloud.qdrant.io:6333
  VECTOR_STORE_API_KEY=your-qdrant-api-key
  ```

---

### 2. Tavily Search API (Real-time search grounding)
Allows agents to search live web content using Google/Bing search indexing engines.

* **Where to obtain:**
  1. Sign up at **[Tavily](https://tavily.com/)**.
  2. Copy the API key from your dashboard (starts with `tvly-...`).
* **How to configure:**
  ```env
  TAVILY_API_KEY=tvly-YourKeyHere
  ```

---

## ⚙️ Mandatory Cryptographic Backend Secrets

To protect database payloads and authenticate sessions safely, generate secure random bytes.

### 1. `JWT_SECRET`
Signs and verifies user authorization cookies and JWT session tokens.
* **Generation:** Generate a random string of at least 32 characters.
* **Quick CLI generator:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
* **Configuration:**
  ```env
  JWT_SECRET=4f56a5e1c258d471b63e9c8a0f...
  ```

### 2. `ENCRYPTION_MASTER_KEY`
All external keys typed inside the UI are encrypted inside the database via **AES-256-GCM** using this key.
* **Generation:** Must be exactly a 64-character hex string (32-byte key).
* **Quick CLI generator:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
* **Configuration:**
  ```env
  ENCRYPTION_MASTER_KEY=bc911854ea01d2c94bb507f308a0dfce...
  ```

### 3. `AGENTFORGE_API_KEY` (Bearer Shield)
Protects REST pipeline endpoints (`POST /api/execute`) from third-party unauthorized calls.
* **Configuration:**
  ```env
  AGENTFORGE_API_KEY=af_key_prod_99f2b8a3
  ```
  Pass this key as a Bearer header in your client application:
  ```bash
  Authorization: Bearer af_key_prod_99f2b8a3
  ```

---

## 🖥️ Project Startup Instructions

### Method A: Run with Docker Compose (Recommended)
Launches the full ecosystem (frontend, backend, database) in isolated containers in a single step.

#### Setup steps:
1. **Prepare configuration:** Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. **Fill variables:** Enter your API keys and generated cryptographic tokens inside `.env`.
3. **Build and spin up:**
   ```bash
   docker-compose up --build
   ```
4. **All set!**
   - 🌐 Open your web browser at: **[http://localhost:3000](http://localhost:3000)**.
   - Stop containers with `Ctrl + C` or `docker-compose down`.

---

### Method B: Local Run via npm (For development)
Excellent for hot reloads, visual code tweaking, and lightweight execution.

#### Requirements:
- **Node.js v18** or newer.
- **npm** (bundled with Node.js).

#### Setup steps:
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Create configuration file:**
   ```bash
   cp .env.example .env
   ```
3. **Configure parameters:** Open `.env` and fill in your keys. To automatically generate security tokens on macOS/Linux:
   ```bash
   echo "JWT_SECRET=$(openssl rand -base64 48)" >> .env
   echo "ENCRYPTION_MASTER_KEY=$(openssl rand -base64 48)" >> .env
   ```
4. **Run development mode:**
   ```bash
   npm run dev
   ```
5. **Success!**
   - 🌐 Navigate to: **[http://localhost:3000](http://localhost:3000)**.

---

## 💡 Troubleshooting & FAQ

### 🛑 Error: "GEMINI_API_KEY is not configured"
* **Reason:** You haven't added the key to `.env` or the file is not named precisely `.env`.
* **Fix:** Make sure the file name is `.env` (without `.txt` or other extensions) in the project root. If you don't have a Google AI Studio account yet, set `GEMINI_API_KEY=sandbox_free_test_gemini` to experience the visual workspace for free.

### 🛑 Error: "Master key is too short" / "JWT_SECRET is missing"
* **Reason:** Missing or invalid server-side security configuration.
* **Fix:** Generate random 32-character and 64-character strings and paste them into `.env` under `JWT_SECRET` and `ENCRYPTION_MASTER_KEY`.

### 🛑 Port 3000 is already in use
* **Reason:** Another software on your PC is occupying port `3000`.
* **Fix:** Shut down that software or change port mappings inside `docker-compose.yml` from `3000:3000` to `8080:3000` to make it accessible at `http://localhost:8080`.
