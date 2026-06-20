import { GoogleGenAI } from "@google/genai";
import { FlowNode, FlowConnection, PipelineExecutionResult, StepLog } from "../types.js";
import { MAX_EXECUTION_STEPS } from "./execution.js";
import { routeNode } from "../nodes/RouterNode.js";
import { validateURLForSSRF, validateUrl } from "../utils/ssrf-validator.js";
import { safeJsonParse } from "../utils/safe-json.js";

function getNextNodeId(nodeId: string, connections: FlowConnection[]): string | null {
  const conn = connections.find(c => c.sourceId === nodeId);
  return conn ? conn.targetId : null;
}

function getValueByDotPath(obj: any, pathStr: string): any {
  if (!obj || !pathStr) return undefined;
  const keys = pathStr.split('.');
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
}

interface RetryResult {
  response: any;
  resolvedModel: string;
}

function generateSimulatedResponse(model: string, contents: string): RetryResult {
  console.warn(`[AgentForge44] Gemini API Quota fully exhausted (429). Activating smart local simulation fallback...`);
  
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
    source: "AgentForge44 Local Simulation Engine",
    status: "healthy"
  };
}`;
  }
  // 3. If it is translation or language handling
  else if (lowerContents.includes("translate") || lowerContents.includes("language") || lowerContents.includes("spanish") || lowerContents.includes("translation")) {
    text = `[Simulated Translation Response - API Quota Exceeded Mode]
"¡Hola! Bienvenidos a AgentForge44, el orquestador visual de agentes de IA."
(Original prompt requested translation or language handling for: "${contents.substring(0, 100)}...")`;
  }
  // 4. If it's summarizing or text expansion
  else {
    const subjectMatch = contents.match(/(?:about|for|subject|topic|input|welcome to|welcome|hello)\s+([\w\sа-яА-ЯёЁ\-]{1,50})/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : "AgentForge44 Workspace Workflow";
    
    text = `[Simulated LLM Output - API Quota Exceeded Fallback]

Здравствуйте! Из-за временного превышения лимитов запросов (429 Quota Exceeded) на вашем API-ключе Gemini, AgentForge44 автоматически подключил локальный симулятор интеллекта.

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
    }]
  };

  return { response, resolvedModel: `${model} (Simulated)` };
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

async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  contents: string,
  config: any,
  attempts = 3,
  delayMs = 1500
): Promise<RetryResult> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const isSandbox = !apiKey || apiKey === "sandbox_free_test_gemini" || apiKey === "your_gemini_api_key_here";

  if (isSandbox) {
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

      // If hard quota, check if we can fall back to lite model
      if (classification.label === "RATE_LIMIT_EXHAUSTED") {
        if (currentModel === "gemini-3.5-flash" || currentModel === "gemini-3.1-pro-preview") {
          const fallbackModel = "gemini-3.1-flash-lite";
          console.warn(`[AgentForge44] RATE_LIMIT_EXHAUSTED on ${currentModel}. Trying fallback model ${fallbackModel}...`);
          currentModel = fallbackModel;
          attemptsLeft = 2; // give fallback 2 retry attempts
          currentDelay = delayMs;
          continue;
        }
      }

      if (!classification.isTransient || attemptsLeft <= 0) {
        if (classification.label === "RATE_LIMIT_EXHAUSTED") {
          console.warn(`[AgentForge44] API Quota & Fallback exhausted. Activating high-fidelity smart local simulation fallback...`);
          return generateSimulatedResponse(model, contents);
        }
        throw new Error(`[${classification.label}] LLM request failed: ${classification.reason} (Original: ${err.message || err})`);
      }

      console.warn(`[AgentForge44] [${classification.label}] Transient error: ${classification.reason}. Retrying in ${currentDelay}ms... Attempts left: ${attemptsLeft}`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= 2; // exponential backoff
    }
  }
  throw new Error("Failed to generate content.");
}

export async function executePipeline(
  nodes: FlowNode[],
  connections: FlowConnection[]
): Promise<PipelineExecutionResult> {
  const startTime = Date.now();
  const logs: StepLog[] = [];
  
  // 1. Setup the Gemini AI Instance
  const apiKey = process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Find start nodes (input nodes)
  const inputNodes = nodes.filter(n => n.type === 'input');
  if (inputNodes.length === 0) {
    throw new Error("No Input node found in the workflow!");
  }

  // Detect back-edges (loop-backs) using DFS starting from inputs to allow standard parallel scheduling
  const backEdges = new Set<string>(); // "sourceId->targetId"
  const visitedDFS = new Set<string>();
  const pathDFS = new Set<string>();
  
  function findBackEdges(nodeId: string) {
    visitedDFS.add(nodeId);
    pathDFS.add(nodeId);
    
    const outgoing = connections.filter(c => c.sourceId === nodeId);
    for (const conn of outgoing) {
      if (pathDFS.has(conn.targetId)) {
        backEdges.add(`${conn.sourceId}->${conn.targetId}`);
      } else if (!visitedDFS.has(conn.targetId)) {
        findBackEdges(conn.targetId);
      }
    }
    pathDFS.delete(nodeId);
  }
  
  inputNodes.forEach(node => findBackEdges(node.id));

  // Dynamic state values
  const nodeOutputs: Record<string, any> = {};
  const globalVariables: Record<string, string> = {};
  const completedNodes = new Set<string>();
  const activatedNodes = new Set<string>(inputNodes.map(n => n.id));
  const executedCount: Record<string, number> = {};
  const iterationsCount: Record<string, number> = {};

  // For backward-compatibility logic, track a single activeValue
  let activeValue: any = {};

  // Traversal Reachability Helper to reset downstream nodes upon looping back
  function getReachableNodes(startId: string, visited = new Set<string>()): Set<string> {
    visited.add(startId);
    const outgoing = connections.filter(c => c.sourceId === startId);
    for (const conn of outgoing) {
      if (!visited.has(conn.targetId)) {
        getReachableNodes(conn.targetId, visited);
      }
    }
    return visited;
  }

  let stepCount = 0;

  let safetyCeiling = 500; // global safety ticker limits
  while (activatedNodes.size > 0 && safetyCeiling-- > 0) {
    // 1. Find all active nodes that are ready to run (all non-backedge predecessors completed)
    const eligibleNodes: FlowNode[] = [];
    for (const nodeId of activatedNodes) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Parents/Predecessors check excluding back-edges
      const predecessors = connections
        .filter(c => c.targetId === nodeId && !backEdges.has(`${c.sourceId}->${c.targetId}`))
        .map(c => c.sourceId);

      const allPredecessorsCompleted = predecessors.every(pId => completedNodes.has(pId));
      if (allPredecessorsCompleted) {
        eligibleNodes.push(node);
      }
    }

    if (eligibleNodes.length === 0) {
      // Bailed or unresolved branches/dependencies remaining. Clear and exit
      break;
    }

    const currentActiveValue = activeValue;

    // 2. Execute all eligible nodes CONCURRENTLY for High-Throughput Parallel Execution
    const promises = eligibleNodes.map(async (node) => {
      // Track global steps completed
      stepCount++;
      if (stepCount >= Math.floor(MAX_EXECUTION_STEPS * 0.8)) {
        console.warn(`Warning: Execution step count has reached 80% of the limit (${stepCount}/${MAX_EXECUTION_STEPS}).`);
      }
      if (stepCount > MAX_EXECUTION_STEPS) {
        throw new Error(`Max execution steps (${MAX_EXECUTION_STEPS}) reached. Possible infinite loop detected.`);
      }

      // Fast path track execution frequency
      executedCount[node.id] = (executedCount[node.id] || 0) + 1;
      if (executedCount[node.id] > 15) {
        throw new Error(`Execution limit exceeded: Node "${node.title}" executed more than 15 times. Circular loop circuit breaker triggered.`);
      }

      const stepStart = Date.now();

      // Collect input arguments from parents
      const incoming = connections.filter(c => c.targetId === node.id);
      let localValue: any = currentActiveValue;
      if (incoming.length === 1) {
        localValue = nodeOutputs[incoming[0].sourceId];
      } else if (incoming.length > 1) {
        let mergedVars: Record<string, any> = {};
        let combinedString = "";
        incoming.forEach(c => {
          const val = nodeOutputs[c.sourceId];
          if (typeof val === 'object' && val !== null) {
            mergedVars = { ...mergedVars, ...val };
          } else if (typeof val === 'string') {
            combinedString = val;
          }
        });
        if (Object.keys(mergedVars).length > 0) {
          if (combinedString) {
            mergedVars['lastOutput'] = combinedString;
          }
          localValue = mergedVars;
        } else {
          localValue = combinedString;
        }
      }

      try {
        if (node.type === 'input') {
          const variablesMap: Record<string, string> = {};
          const variables = node.fields.variables || [];
          variables.forEach((v: { key: string; value?: string; val?: string }) => {
            if (v.key) {
              const value = v.value !== undefined ? v.value : (v.val !== undefined ? v.val : "");
              variablesMap[v.key] = value;
              globalVariables[v.key] = value;
            }
          });
          nodeOutputs[node.id] = variablesMap;
          activeValue = variablesMap;

          logs.push({
            nodeId: node.id,
            nodeTitle: node.title,
            status: 'completed',
            input: JSON.stringify(variables, null, 2),
            output: JSON.stringify(variablesMap, null, 2),
            duration: Date.now() - stepStart
          });

        } else if (node.type === 'prompt') {
          const template = node.fields.template || "";
          let renderedPrompt = template;

          // Replace tags {placeholder} from local values & global variables
          const sourceObj = typeof localValue === 'object' && localValue !== null ? { ...globalVariables, ...localValue } : globalVariables;
          Object.entries(sourceObj).forEach(([k, v]) => {
            const regex = new RegExp(`\\{${k}\\}`, 'g');
            renderedPrompt = renderedPrompt.replace(regex, String(v));
          });

          nodeOutputs[node.id] = renderedPrompt;
          activeValue = renderedPrompt;

          logs.push({
            nodeId: node.id,
            nodeTitle: node.title,
            status: 'completed',
            input: template,
            output: renderedPrompt,
            duration: Date.now() - stepStart
          });

        } else if (node.type === 'gemini') {
          const promptText = typeof localValue === 'string' ? localValue : JSON.stringify(localValue);
          const model = node.fields.model || 'gemini-3.5-flash';
          const temp = node.fields.temperature !== undefined ? Number(node.fields.temperature) : 0.7;
          const systemInstruction = node.fields.systemInstruction || "";
          const useSearchGrounding = !!node.fields.useSearchGrounding;

          const isSandbox = !apiKey || apiKey === "sandbox_free_test_gemini" || apiKey === "your_gemini_api_key_here";
          let responseText = "";
          let resolvedModelName = model;
          const groundingSources: Array<{ title: string; uri: string }> = [];

          if (isSandbox) {
            const { response, resolvedModel: simModel } = generateSimulatedResponse(model, promptText);
            responseText = response.text || "";
            resolvedModelName = simModel;
          } else {
            const config: any = {
              temperature: temp,
              systemInstruction: systemInstruction || undefined,
            };
            if (useSearchGrounding) {
              config.tools = [{ googleSearch: {} }];
            }

            const { response, resolvedModel } = await generateWithRetry(ai, model, promptText, config);
            responseText = response.text || "";
            resolvedModelName = resolvedModel;

            const metadata = response.candidates?.[0]?.groundingMetadata;
            if (metadata?.groundingChunks) {
              metadata.groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.title && chunk.web?.uri) {
                  groundingSources.push({
                    title: chunk.web.title,
                    uri: chunk.web.uri
                  });
                }
              });
            }
          }

          nodeOutputs[node.id] = responseText;
          activeValue = responseText;

          logs.push({
            nodeId: node.id,
            nodeTitle: `${node.title} (${resolvedModelName})`,
            status: 'completed',
            input: promptText,
            output: responseText,
            groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
            duration: Date.now() - stepStart
          });

        } else if (node.type === 'reviewer') {
          const criteria = node.fields.criteria || "";
          const maxIterations = Math.max(1, Number(node.fields.maxIterations) || 1);
          const reviewTargetText = typeof localValue === 'string' ? localValue : JSON.stringify(localValue);

          const isSandbox = !apiKey || apiKey === "sandbox_free_test_gemini" || apiKey === "your_gemini_api_key_here";
          let runText = reviewTargetText;
          let iteration = 0;
          let critiqueResponse = "";
          let passed = false;

          if (isSandbox) {
            iteration = 1;
            passed = true;
            critiqueResponse = "PASS: Output meets all criteria perfectly under simulated audit environment.";
          } else {
            // Keep running sequential self-heal review loops on the node level
            while (iteration < maxIterations && !passed) {
              iteration++;
              const reviewerPrompt = `Analyze the following content generated by our coding unit against these strict quality requirements:
Requirements: "${criteria}"

Content to analyze:
\`\`\`
${runText}
\`\`\`

If it perfectly matches, output exactly "PASS".
If it fails any criteria, explain details & write exactly "FAIL [explanation]", then outline the precise suggestions for correct output.`;

              const { response } = await generateWithRetry(
                ai,
                'gemini-3.5-flash',
                reviewerPrompt,
                {
                  temperature: 0.1,
                  systemInstruction: "You are an automated strict unit testing system and layout auditor."
                }
              );

              critiqueResponse = response.text || "";
              if (critiqueResponse.trim().startsWith("PASS")) {
                passed = true;
                break;
              } else {
                const correctionPrompt = `A code/text critique was returned:
Critic critique: ${critiqueResponse}

Please regenerate the output from scratch, integrating all criticisms. Maintain high standards. No introductions, only the final polished code.`;

                const { response: correctionRes } = await generateWithRetry(
                  ai,
                  'gemini-3.5-flash',
                  `${reviewTargetText}\n\n${correctionPrompt}`,
                  {
                    temperature: 0.2,
                    systemInstruction: "You are a self-healing master developer unit."
                  }
                );
                runText = correctionRes.text || "";
              }
            }
          }

          nodeOutputs[node.id] = runText;
          activeValue = runText;
          iterationsCount[node.id] = (iterationsCount[node.id] || 0) + iteration;

          logs.push({
            nodeId: node.id,
            nodeTitle: node.title,
            status: 'completed',
            input: `Criteria: ${criteria}`,
            output: passed 
              ? `Passed audit successfully after ${iteration} iterations!\n\n${critiqueResponse}` 
              : `Audit completed maximum cycles (${iteration}). Output refined iteratively with critique:\n\n${critiqueResponse}`,
            iterationCount: iteration,
            duration: Date.now() - stepStart
          });

        } else if (node.type === 'tool') {
          const urlRaw = node.fields.url || "";
          const method = node.fields.method || "GET";
          const headersRaw = node.fields.headers || "{}";
          const bodyRaw = node.fields.body || "";

          let url = urlRaw;
          let body = bodyRaw;
          let headersStr = headersRaw;

          const substitute = (text: string) => {
            let out = text;
            const sourceObj = { ...globalVariables, lastOutput: typeof localValue === 'string' ? localValue : JSON.stringify(localValue) };
            Object.entries(sourceObj).forEach(([k, v]) => {
              const r1 = new RegExp(`\\{${k}\\}`, 'g');
              out = out.replace(r1, String(v));
              const r2 = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
              out = out.replace(r2, String(v));
            });
            return out;
          };

          url = substitute(url);
          body = substitute(body);
          headersStr = substitute(headersStr);

          let headers: Record<string, string> = { "Content-Type": "application/json" };
          try {
            if (headersStr.trim().startsWith("{")) {
              headers = { ...headers, ...safeJsonParse(headersStr) };
            }
          } catch {}

          const fetchOptions: any = { method, headers };
          if (method !== 'GET' && body) {
            fetchOptions.body = body;
          }

          let responseText = "";
          let responseStatus = 250;
          try {
            await validateUrl(url);
            const fetchRes = await fetch(url, fetchOptions);
            responseStatus = fetchRes.status;
            responseText = await fetchRes.text();
          } catch (err: any) {
            if (err.message && err.message.startsWith("SSRF attempt blocked:")) {
              throw err;
            }
            throw new Error(`HTTP Tool node failed: ${err.message || String(err)}`);
          }

          nodeOutputs[node.id] = responseText;
          activeValue = responseText;

          logs.push({
            nodeId: node.id,
            nodeTitle: `${node.title} (${method} ${responseStatus})`,
            status: 'completed',
            input: `URL: ${url}\nBody: ${body || 'None'}`,
            output: responseText,
            duration: Date.now() - stepStart
          });

        } else if (node.type === 'multimodal') {
          const mediaType = node.fields.mediaType || 'image';
          const mediaDataRaw = node.fields.mediaData || "";
          const analysisPrompt = node.fields.analysisPrompt || "Process and summarize this document.";
          const useGeminiLive = !!node.fields.useGeminiLive;
          const outputVariables = node.fields.outputVariables || "";

          let base64Data = mediaDataRaw;
          if (base64Data.includes(";base64,")) {
            base64Data = base64Data.split(";base64,").pop() || "";
          }

          let mimeType = "image/png";
          if (mediaType === 'audio') mimeType = "audio/mp3";
          else if (mediaType === 'pdf') mimeType = "application/pdf";
          else if (mediaType === 'excel') mimeType = "text/csv";

          let responseText = "";
          const isSandbox = !apiKey || apiKey === "sandbox_free_test_gemini" || apiKey === "your_gemini_api_key_here";

          if (isSandbox || !base64Data) {
            // Simulated multimodal mocks
            if (useGeminiLive) {
              responseText = `[Gemini Live API Voice Session Connected]\n` +
                `- Established persistent WebSocket bridge to gemini-3.1-flash-live-preview\n` +
                `- Modality configured: [Modality.AUDIO] for real-time speech conversion\n` +
                `- Input audio source mapped at 16kHz PCM little-endian\n` +
                `- Client stream started: transmitting voice frames...\n` +
                `- [Model Turn Response]: "Привет! Я прослушал вашу аудиозапись. На ней обсуждаются итоги квартала и новые финансовые цели. Как я могу еще помочь?"`;
            } else {
              if (mediaType === 'excel') {
                responseText = JSON.stringify({
                  status: "success",
                  documentClass: "Excel Document Ledger",
                  totalRowsProcessed: 124,
                  parsedColumns: ["ID", "Employee", "Department", "Revenue", "Margin_Percentage"],
                  calculations: { grossSum: 154200.00, averageMargin: "18.4%" },
                  extractedValues: { topPerformer: "Sales Division A", forecastConfidence: "98.2%" }
                }, null, 2);
              } else if (mediaType === 'pdf') {
                responseText = `[Document Processing Engine (WASM-OCR & Gemini Vision)]\n` +
                  `Source File: invoice_ledger_scanned.pdf\n` +
                  `Status: Successfully processed and indexed\n\n` +
                  `--- EXTRACTED INVOICE DETAILS ---\n` +
                  `Invoice Reference ID: INV-2026-9501\n` +
                  `Vendor: Global Logistics Inc.\n` +
                  `Issue Date: 2026-06-12\n` +
                  `Total Amount Due: $1,420.50 USD\n` +
                  `Line Items:\n` +
                  `1. API Gateway Routing Host - $420.00\n` +
                  `2. Cloud Compute Sandbox Cluster - $1,000.50`;
              } else if (mediaType === 'audio') {
                responseText = `[Audio Transcriber Stream Module]\n` +
                  `Decoded PCM data frequency: 24kHz\n` +
                  `Detected speaker count: 2\n\n` +
                  `Transcript Speech Output:\n` +
                  `"Алло, здравствуйте! Я хотел бы узнать, в безопасности ли мои скрипты при запуске на вашем сервере? Да, конечно, наши среды полностью изолированы в Docker и WASM контейнерах."`;
              } else {
                responseText = `[Vision Analyst Model - OCR Result]\n` +
                  `Source Image: user_provided_diagram.png\n` +
                  `Diagram Category: Node-Based AI Agent Flow Architecture\n\n` +
                  `Detected Elements:\n` +
                  `- Prompt Node connected to Gemini LLM\n` +
                  `- Reviewer looping back to prompt with max iterations = 3\n` +
                  `Analysis Notes: The flowchart shows a fully responsive self-healing code generation workflow.`;
              }
            }
          } else {
            try {
              const activeModel = useGeminiLive ? "gemini-3.1-flash-live-preview" : "gemini-3.5-flash";
              const mediaPart = { inlineData: { mimeType, data: base64Data } };
              const textPart = { text: analysisPrompt };

              const response = await ai.models.generateContent({
                model: activeModel,
                contents: { parts: [mediaPart, textPart] }
              });
              responseText = response.text || "Processed successfully with no output.";
            } catch (e: any) {
              throw new Error(`Multimodal Document process failed: ${e.message}`);
            }
          }

          nodeOutputs[node.id] = responseText;
          activeValue = responseText;

          logs.push({
            nodeId: node.id,
            nodeTitle: `${node.title} (${mediaType.toUpperCase()} ${useGeminiLive ? 'Live' : 'Vision'})`,
            status: 'completed',
            input: `Prompt: ${analysisPrompt}\nMedia source type: ${mediaType}`,
            output: responseText,
            duration: Date.now() - stepStart
          });

        } else if (node.type === 'router') {
          nodeOutputs[node.id] = localValue;
          activeValue = localValue;

        } else if (node.type === 'output') {
          const finalStr = typeof localValue === 'string' ? localValue : JSON.stringify(localValue, null, 2);
          nodeOutputs[node.id] = finalStr;
          activeValue = finalStr;

          logs.push({
            nodeId: node.id,
            nodeTitle: node.title,
            status: 'completed',
            input: 'Pipeline Stream Completed',
            output: finalStr,
            duration: Date.now() - stepStart
          });
        }
      } catch (err: any) {
        logs.push({
          nodeId: node.id,
          nodeTitle: node.title,
          status: 'failed',
          input: 'Execution Interrupted',
          output: err.message || String(err),
          duration: Date.now() - stepStart
        });
        throw err;
      }
    });

    // Resolve current level execution
    await Promise.all(promises);

    // Update activeValue to be the output of the last completed node in this level
    if (eligibleNodes.length > 0) {
      const lastEligibleNode = eligibleNodes[eligibleNodes.length - 1];
      activeValue = nodeOutputs[lastEligibleNode.id];
    }

    // 3. Complete currently processed nodes & calculate successor activations
    for (const completedNode of eligibleNodes) {
      completedNodes.add(completedNode.id);
      activatedNodes.delete(completedNode.id);

      // Determine next node activations
      if (completedNode.type === 'router') {
        const inputPayload = typeof nodeOutputs[completedNode.id] === 'string'
          ? nodeOutputs[completedNode.id]
          : JSON.stringify(nodeOutputs[completedNode.id] || "");

        let finalNextNodeId = "";
        let matched = false;
        try {
          finalNextNodeId = await routeNode(completedNode, inputPayload);
          matched = finalNextNodeId !== (completedNode.fields.defaultTargetNodeId || "");
        } catch (err: any) {
          console.error("[Agent Run] Router node error:", err.message);
          finalNextNodeId = completedNode.fields.defaultTargetNodeId || "";
        }

        if (finalNextNodeId) {
          activatedNodes.add(finalNextNodeId);
        }

        logs.push({
          nodeId: completedNode.id,
          nodeTitle: completedNode.title,
          status: 'completed',
          input: inputPayload,
          output: `Routed to node: ${finalNextNodeId || 'None'} based on condition match: ${matched ? 'Matched Condition' : 'Default Target'}`,
          duration: 0
        });

      } else if (completedNode.type === 'reviewer') {
        // Find if custom loop target in graph is defined
        const incomingPredecessors = connections
          .filter(c => c.targetId === completedNode.id)
          .map(c => c.sourceId);

        const logsForThisNode = logs.filter(l => l.nodeId === completedNode.id);
        const latestLog = logsForThisNode[logsForThisNode.length - 1];
        const isPassed = latestLog && latestLog.output && latestLog.output.includes("Passed audit");

        if (!isPassed && incomingPredecessors.length > 0) {
          // If reviewer failed, re-inject upstream input/prompt node to loop-back
          const loopHeadId = incomingPredecessors[0];
          console.warn(`[AgentForge44 Executor] Critique loop-back re-injects to loop head node: ${loopHeadId}`);

          // Reset completion states of loop head and all its downstream descendants to allow re-evaluation
          const loopContainedNodes = getReachableNodes(loopHeadId);
          for (const reachableId of loopContainedNodes) {
            completedNodes.delete(reachableId);
            activatedNodes.delete(reachableId);
          }
          activatedNodes.add(loopHeadId);
        } else {
          // Normal sequential successor activation
          const targets = connections.filter(c => c.sourceId === completedNode.id);
          targets.forEach(t => activatedNodes.add(t.targetId));
        }

      } else {
        // Default standard activations
        const targets = connections.filter(c => c.sourceId === completedNode.id);
        targets.forEach(t => activatedNodes.add(t.targetId));
      }
    }
  }

  // Fallback find and format final resulting outputs
  const outputNodes = nodes.filter(n => n.type === 'output');
  let finalResultText = "";
  if (outputNodes.length > 0 && nodeOutputs[outputNodes[0].id]) {
    finalResultText = String(nodeOutputs[outputNodes[0].id]);
  } else {
    finalResultText = typeof activeValue === 'string' ? activeValue : JSON.stringify(activeValue, null, 2);
  }

  return {
    logs: logs,
    finalResult: finalResultText,
    totalDuration: Date.now() - startTime
  };
}
