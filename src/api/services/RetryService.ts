import { GoogleGenAI } from "@google/genai";
import { cache, computeHash } from '../../services/cache.js';
import { chaosEngine } from '../../services/chaosEngine.js';

export interface RetryResult {
  response: any;
  resolvedModel: string;
}

export function classifyLLMError(err: any): { isTransient: boolean; reason: string; label: string } {
  const errMsg = String(err.message || err).toLowerCase();
  const status = Number(err.status || err.statusCode);

  if (status === 401 || status === 403 || errMsg.includes("invalid api key") || errMsg.includes("unauthorized") || errMsg.includes("api_key")) {
    return { isTransient: false, reason: "Invalid billing credentials or unauthorized request.", label: "AUTHENTICATION_ERROR" };
  }
  if (status === 400 || errMsg.includes("bad request") || errMsg.includes("invalid argument") || errMsg.includes("payload too large")) {
    return { isTransient: false, reason: "Malformed prompt specifications or invalid request parameters.", label: "BAD_REQUEST" };
  }
  if (status === 429 || errMsg.includes("quota") || errMsg.includes("resource_exhausted") || errMsg.includes("rate limit") || errMsg.includes("limit")) {
    return { isTransient: true, reason: "AI Model request quota limits reached.", label: "RATE_LIMIT_EXHAUSTED" };
  }
  if (status === 503 || status === 500 || errMsg.includes("unavailable") || errMsg.includes("internal error") || errMsg.includes("overloaded") || errMsg.includes("high demand")) {
    return { isTransient: true, reason: "Model provider temporary service overload.", label: "SERVICE_OVERLOAD" };
  }
  return { isTransient: true, reason: "Transient connection failure.", label: "UNKNOWN_TRANSIENT" };
}

export function generateSimulatedResponse(model: string, contents: string): RetryResult {
  console.warn(`[KostromAi44] Gemini API Quota fully exhausted (429). Activating smart local simulation fallback...`);
  
  const lowerContents = contents.toLowerCase();
  let text = "";

  // 1. If it is a critic/reviewer node calling
  if (lowerContents.includes("perfectly matches, output exactly \"pass\"") || lowerContents.includes("strict quality requirements") || lowerContents.includes("quality review")) {
    text = "PASS: Output meets all criteria perfectly under simulated audit environment.";
  }
  // 2. If it is code generation
  else if (lowerContents.includes("code") || lowerContents.includes("function") || lowerContents.includes("html") || lowerContents.includes("css") || lowerContents.includes("react")) {
    text = `// [Simulated Code Generation Response - API Quota Exceeded Mode]
export function handleSimulatedRequest(data: any) {
  console.log("Simulating process for input:", data);
  return {
    success: true,
    timestamp: new Date().toISOString(),
    source: "KostromAi44 Local Simulation Engine",
    status: "healthy"
  };
}`;
  }
  // 3. If it is translation or language handling
  else if (lowerContents.includes("translate") || lowerContents.includes("language") || lowerContents.includes("spanish") || lowerContents.includes("translation")) {
    text = `[Simulated Translation Response - API Quota Exceeded Mode]
"¡Hola! Bienvenidos a KostromAi44, el orquestador visual de agentes de IA."
(Original prompt requested translation or language handling for: "${contents.substring(0, 100)}...")`;
  }
  // 4. If it's summarizing or text expansion
  else {
    const subjectMatch = contents.match(/(?:about|for|subject|topic|input|welcome to|welcome|hello)\s+([\w\sа-яА-ЯёЁ\-]{1,50})/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : "KostromAi44 Workspace Workflow";
    
    text = `[Simulated LLM Output - API Quota Exceeded Fallback]

Здравствуйте! Из-за временного превышения лимитов запросов (429 Quota Exceeded) на вашем API-ключе Gemini, KostromAi44 автоматически подключил локальный симулятор интеллекта.

Тема вашего запроса: "${subject}"

Вот симулируемый ответ, сгенерированный локально:
1. Ваша мультиагентная цепочка успешно отработала все связи.
2. Входной контекст был успешно объединен с шаблонами prompt-ноды.
3. Система готова к дальнейшей работе. Рекомендуем проверить лимиты вашего тарифного плана в Google AI Studio для возобновления полноценных запросов.`;
  }

  // Mimic the GenerateContentResponse structure
  const response = {
    text: text,
    candidates: [{
      content: {
        parts: [{ text: text }]
      },
      finishReason: "STOP",
      safetyRatings: []
    }],
    simulated: true
  };

  return { response, resolvedModel: `${model} (Simulated)` };
}

export async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  contents: string,
  config: any,
  attempts = 3,
  delayMs = 1500
): Promise<RetryResult> {
  const cacheKey = `llm_cache:${computeHash(JSON.stringify({ model, contents, config }))}`;
  try {
    const cached = await cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // Ignore cache lookup errors
  }

  const result = await generateWithRetryInternal(ai, model, contents, config, attempts, delayMs);

  try {
    await cache.set(cacheKey, JSON.stringify(result), 300); // Cache for 5 minutes
  } catch (e) {
    // Ignore cache write errors
  }

  return result;
}

async function generateWithRetryInternal(
  ai: GoogleGenAI,
  model: string,
  contents: string,
  config: any,
  attempts = 3,
  delayMs = 1500
): Promise<RetryResult> {
  // Check for simulated Chaos outage first
  await chaosEngine.checkLlmChaos("Gemini");

  const apiKey = process.env.GEMINI_API_KEY || "";
  const isExplicitSandbox = apiKey && apiKey.startsWith("sandbox_");
  const isPlaceholderKey = apiKey === "your_gemini_api_key_here";
  const isDemoMode = process.env.DEMO_MODE === "true";

  const isSandbox = isDemoMode || isExplicitSandbox || isPlaceholderKey || !!process.env.VITEST || process.env.NODE_ENV === "test";

  if (!apiKey && !isDemoMode && !process.env.VITEST && process.env.NODE_ENV !== "test") {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (isSandbox || !apiKey) {
    return generateSimulatedResponse(model, contents);
  }

  let attemptsLeft = attempts;
  let currentDelay = delayMs;
  let currentModel = model;

  while (attemptsLeft > 0) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: contents,
        config: config
      });
      return { response, resolvedModel: currentModel };
    } catch (err: any) {
      const classification = classifyLLMError(err);
      attemptsLeft--;

      // If hard quota or service overload, check if we can fall back to lite model
      if (classification.label === "RATE_LIMIT_EXHAUSTED" || classification.label === "SERVICE_OVERLOAD") {
        if (currentModel === "gemini-3.5-flash" || currentModel === "gemini-3.1-pro-preview") {
          const fallbackModel = "gemini-3.1-flash-lite";
          console.warn(`[KostromAi44] ${classification.label} on ${currentModel}. Trying fallback model ${fallbackModel}...`);
          currentModel = fallbackModel;
          attemptsLeft = 2; // give fallback 2 retry attempts
          currentDelay = delayMs;
          continue;
        }
      }

      if (!classification.isTransient || attemptsLeft <= 0) {
        if ((classification.label === "RATE_LIMIT_EXHAUSTED" || classification.label === "SERVICE_OVERLOAD") && process.env.DEMO_MODE === "true") {
          console.warn(`[KostromAi44] API Quota or Service Overload fallback exhausted. Activating high-fidelity smart local simulation fallback...`);
          return generateSimulatedResponse(model, contents);
        }
        throw new Error(`[${classification.label}] LLM request failed: ${classification.reason} (Original: ${err.message || err})`);
      }

      console.warn(`[KostromAi44] [${classification.label}] Transient error: ${classification.reason}. Retrying in ${currentDelay}ms... Attempts left: ${attemptsLeft}`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= 2; // exponential backoff
    }
  }
  throw new Error("Failed to generate content.");
}
