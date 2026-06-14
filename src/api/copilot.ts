import { Router } from 'express';
import { GoogleGenAI, Type } from "@google/genai";
import { FlowNode, FlowConnection } from '../types.js';
import { logger } from '../utils/logger.js';

const router = Router();

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

/**
 * AI Architect (Prompt-to-Graph)
 */
router.post('/copilot/architect', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing architect description prompt' });
    return;
  }

  try {
    const ai = getGeminiClient();
    
    const systemInstruction = `
You are the AgentForge AI Copilot Architect. Your task is to generate complete, operational visual agent flows (graphs) based on user descriptions.
You must return a valid JSON object matching this TypeScript interface:
{
  "explanation": "Brief explanation of how this pipeline satisfies the user prompt.",
  "nodes": Array<{
    "id": "string (unique ID like input_1, prompt_2, etc)",
    "type": "input" | "prompt" | "gemini" | "reviewer" | "router" | "tool" | "output",
    "title": "Short descriptive title",
    "fields": {
      "template": "string (for prompts, e.g. 'Translate this: {topic}')",
      "model": "string (for gemini, default 'gemini-3.5-flash')",
      "temperature": number (0.0 to 1.0),
      "systemInstruction": "string (for gemini system prompt)",
      "variables": Array<{ "key": "string", "value": "string" }> (for input node variables)
    },
    "position": { "x": number, "y": number }
  }>,
  "connections": Array<{
    "id": "string (unique connection ID)",
    "sourceId": "string (source node id)",
    "targetId": "string (target node id)"
  }>
}

Strict Rules:
1. Every graph MUST start with exactly one "input" node.
2. Put initial placeholder key-value pairs in the input node fields.variables.
3. Keep coordinates clear, spacing them out by 200px horizontally (x-axis) so it lays out nicely from left to right.
4. Keep models set to 'gemini-3.5-flash'.
5. Only return JSON. Avoid markdown blocks or wrapping unless requested (but to be safe, return plain JSON).
`;

    logger.info(`Running AI Copilot Architect for custom prompt : ${prompt}`);
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Generate a workflow graph for this prompt: "${prompt}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const jsonText = response.text || "{}";
    const graphData = JSON.parse(jsonText.trim());
    res.json({ success: true, ...graphData });

  } catch (error: any) {
    logger.error(`AI Copilot Architect error: ${error.message}`);
    res.status(500).json({ error: error.message || 'Architect failed to generate layout' });
  }
});

/**
 * Self-Optimizer (Graph Analyzer for performance, quality, and cost)
 */
router.post('/copilot/optimize', async (req, res) => {
  const { nodes, connections } = req.body;
  if (!nodes || !connections) {
    res.status(400).json({ error: 'Missing nodes or connections context for optimization' });
    return;
  }

  try {
    const ai = getGeminiClient();

    const systemInstruction = `
You are the AgentForge Self-Optimizer. Your task is to analyze an existing flow graph of nodes and connections, point out architectural weaknesses (cost, latency, security, logic cycles), formulate optimization points, and return a corrected, optimal output.
You must return a valid JSON object matching this TypeScript interface:
{
  "explanation": "A complete analysis or summary of what was optimized and why, e.g. model consolidations, template refactoring, security sanitization, parallel execution paths.",
  "plan": [
    "string: itemized optimization diagnostic point 1",
    "string: itemized optimization diagnostic point 2",
    "..."
  ],
  "nodes": Array<{
    "id": "string",
    "type": "string",
    "title": "string",
    "fields": object,
    "position": { "x": number, "y": number }
  }>,
  "connections": Array<{
    "id": "string",
    "sourceId": "string",
    "targetId": "string"
  }>
}

Optimization Guidelines:
- If nodes use outdated or slow models, align them to 'gemini-3.5-flash'.
- Ensure prompt templates incorporate correct '{variables}' mapped precisely.
- Add reviewer checks or routers where a safety validation or feedback audit cycle would improve the quality.
- Clean up any orphan nodes or connections.
- Only return JSON.
`;

    logger.info(`Running AI Copilot Self-Optimizer on graph with ${nodes.length} nodes`);
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Optimize this flow graph. Existing state is: ${JSON.stringify({ nodes, connections })}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const jsonText = response.text || "{}";
    const optimizedData = JSON.parse(jsonText.trim());
    res.json({ success: true, ...optimizedData });

  } catch (error: any) {
    logger.error(`AI Copilot Self-Optimizer error: ${error.message}`);
    res.status(500).json({ error: error.message || 'Optimizer failed to evaluate graph' });
  }
});

export default router;
