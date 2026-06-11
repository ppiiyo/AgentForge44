import { GoogleGenAI } from "@google/genai";
import { FlowNode, FlowConnection, PipelineExecutionResult } from "../types.js";
import { executePipeline } from "./agentRun.js";

export interface EvalTestCase {
  id: string;
  name: string;
  query: string;
  expected: string;
}

export interface EvalResultItem {
  id: string;
  name: string;
  query: string;
  expected: string;
  actual: string;
  score: number; // 0 to 10
  rationale: string;
  latencyMs: number;
}

export interface EvalReport {
  timestamp: string;
  avgScore: number;
  avgLatencyMs: number;
  items: EvalResultItem[];
}

/**
 * 1. Interactive Evaluation Suite Engine
 * Uses LLM-as-a-Judge technique to evaluate workflow outputs against expected ground truth labels.
 */
export async function runEvaluationSuite(
  nodes: FlowNode[],
  connections: FlowConnection[],
  testCases: EvalTestCase[]
): Promise<EvalReport> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' }
    }
  });

  const startTimeSuite = Date.now();
  const items: EvalResultItem[] = [];
  let totalScore = 0;
  let totalLatency = 0;

  for (const test of testCases) {
    const startTest = Date.now();
    let actualOutput = "Error: execution failed";
    
    try {
      // Prepare nodes input payload matching variables list key 'topic' or 'task'
      const updatedNodes = nodes.map(n => {
        if (n.type === 'input') {
          return {
            ...n,
            fields: {
              variables: [
                { key: 'topic', value: test.query, label: 'Topic Key' },
                { key: 'task', value: test.query, label: 'Task Specification' }
              ]
            }
          };
        }
        return n;
      });

      // Run pipeline
      const runRes: PipelineExecutionResult = await executePipeline(updatedNodes, connections);
      actualOutput = runRes.finalResult || "";
    } catch (err: any) {
      actualOutput = `Execution crash: ${err.message || String(err)}`;
    }

    const latency = Date.now() - startTest;
    totalLatency += latency;

    // LLM-as-a-Judge to evaluate correctness and issue grade & explanation
    let score = 5;
    let rationale = "Failed to parse judge feedback correctly.";

    try {
      if (apiKey) {
        const judgePrompt = `You are a strict, expert quality assurance evaluator. Compare the actual output against the expected golden reference and rate the output from 0 to 10 (where 10 is perfectly correct, comprehensive, and accurate, and 0 is entirely wrong/failing).
Provide your feedback strictly in a valid JSON map containing keys: "score" (integer between 0 and 10) and "rationale" (detailed explanation paragraph).

User Input Query: "${test.query}"
Expected Answer Standard: "${test.expected}"
Actual Result Generated: "${actualOutput.substring(0, 1500)}"`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: judgePrompt,
          config: {
            temperature: 0.1,
            systemInstruction: "You are an automated code and output grading system. Output valid raw JSON only."
          }
        });

        const rawText = (response.text || "").replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(rawText);
        
        score = typeof parsed.score === 'number' ? Math.max(0, Math.min(10, parsed.score)) : 5;
        rationale = parsed.rationale || "Evaluated successfully but missing description details.";
      } else {
        score = actualOutput.toLowerCase().includes(test.expected.toLowerCase().split(" ")[0]) ? 9 : 6;
        rationale = "Mock evaluation completed without live Gemini Key config.";
      }
    } catch (err: any) {
      rationale = `Judge error: ${err.message || String(err)}`;
    }

    totalScore += score;
    items.push({
      id: test.id,
      name: test.name,
      query: test.query,
      expected: test.expected,
      actual: actualOutput,
      score,
      rationale,
      latencyMs: latency
    });
  }

  const avgScore = testCases.length > 0 ? Number((totalScore / testCases.length).toFixed(1)) : 0;
  const avgLatencyMs = testCases.length > 0 ? Math.round(totalLatency / testCases.length) : 0;

  return {
    timestamp: new Date().toLocaleTimeString(),
    avgScore,
    avgLatencyMs,
    items
  };
}

/**
 * 2. Pre-Packaged Industry Multi-Agent Flow Designs Generator
 */
export function getPatternTemplate(patternType: 'supervisor' | 'debate'): { nodes: FlowNode[]; connections: FlowConnection[] } {
  if (patternType === 'supervisor') {
    const nodes: FlowNode[] = [
      {
        id: "node-input",
        type: "input",
        title: "Router Task Payload",
        x: 50,
        y: 200,
        description: "Specify the user query topic and targeted domain.",
        fields: {
          variables: [
            { key: 'topic', value: 'Write an optimized Rust binary search and explain why it is memory-safe.', label: 'Active Inquiry' }
          ]
        }
      },
      {
        id: "node-supervisor",
        type: "gemini",
        title: "Supervisor Classifier",
        x: 280,
        y: 100,
        description: "Routes workflow steps based on classifier heuristics.",
        fields: {
          model: "gemini-3.5-flash",
          temperature: 0.1,
          systemInstruction: "You are the Task Classifier. Standardize the response tone into: 'Rust Coder' or 'Creative Story'. Print your classification name at the start of your text.",
          useSearchGrounding: false
        }
      },
      {
        id: "node-coder",
        type: "gemini",
        title: "Senior Rust Dev-Agent",
        x: 500,
        y: 80,
        description: "Specialized senior developer module generating optimized safe rust code.",
        fields: {
          model: "gemini-3.5-flash",
          temperature: 0.2,
          systemInstruction: "You are a professional Rust compiler engineer. Output correct type-safe snippets.",
          useSearchGrounding: false
        }
      },
      {
        id: "node-reviewer",
        type: "reviewer",
        title: "Quality Reviewer",
        x: 720,
        y: 150,
        description: "Audits outputs against compilation standards.",
        fields: {
          criteria: "Verify code structure is enclosed inside formatting blocks with cargo test guidelines.",
          maxIterations: 2
        }
      },
      {
        id: "node-output",
        type: "output",
        title: "Deployable Solution",
        x: 940,
        y: 200,
        description: "Aggregated results delivered.",
        fields: {
          format: "markdown",
          value: ""
        }
      }
    ];

    const connections: FlowConnection[] = [
      { id: "c1", sourceId: "node-input", targetId: "node-supervisor" },
      { id: "c2", sourceId: "node-supervisor", targetId: "node-coder" },
      { id: "c3", sourceId: "node-coder", targetId: "node-reviewer" },
      { id: "c4", sourceId: "node-reviewer", targetId: "node-output" }
    ];

    return { nodes, connections };
  } else {
    // Debate/consensus pattern
    const nodes: FlowNode[] = [
      {
        id: "deb-input",
        type: "input",
        title: "Controversy Topic",
        x: 50,
        y: 200,
        description: "Input controversial trend context.",
        fields: {
          variables: [
            { key: 'topic', value: 'Will artificial intelligence replace humans in the visual interface design sector?', label: 'Topic Name' }
          ]
        }
      },
      {
        id: "deb-optimist",
        type: "gemini",
        title: "Optimist Agent",
        x: 280,
        y: 80,
        description: "Generates argument points on efficiency, synergy, and productivity.",
        fields: {
          model: "gemini-3.5-flash",
          temperature: 0.8,
          systemInstruction: "Praise AI interfaces. Highlight the speed of layout iteration.",
          useSearchGrounding: false
        }
      },
      {
        id: "deb-pessimist",
        type: "gemini",
        title: "Skeptic/Critic Reviewer",
        x: 500,
        y: 180,
        description: "Analyzes soulness, copyright issues, and accessibility failures.",
        fields: {
          model: "gemini-3.5-flash",
          temperature: 0.4,
          systemInstruction: "Write strict warnings about security, bias, and generic looking designs.",
          useSearchGrounding: false
        }
      },
      {
        id: "deb-referee",
        type: "gemini",
        title: "Consensus Arbiter",
        x: 720,
        y: 120,
        description: "Balances optimism and critic to output structured balanced plans.",
        fields: {
          model: "gemini-3.5-flash",
          temperature: 0.5,
          systemInstruction: "Synthesize the positive points of both sides. Output a clean neutral middleground essay.",
          useSearchGrounding: false
        }
      },
      {
        id: "deb-output",
        type: "output",
        title: "Arbiter Roadmap Summary",
        x: 940,
        y: 200,
        description: "Consolidated Debate Report Output.",
        fields: {
          format: "markdown",
          value: ""
        }
      }
    ];

    const connections: FlowConnection[] = [
      { id: "dc1", sourceId: "deb-input", targetId: "deb-optimist" },
      { id: "dc2", sourceId: "deb-optimist", targetId: "deb-pessimist" },
      { id: "dc3", sourceId: "deb-pessimist", targetId: "deb-referee" },
      { id: "dc4", sourceId: "deb-referee", targetId: "deb-output" }
    ];

    return { nodes, connections };
  }
}

/**
 * 3. Document Loader and Simple Index Store for Semantic RAG
 */
interface ChunkItem {
  id: string;
  source: string;
  text: string;
}

const memoryDocumentsDb: ChunkItem[] = [];

export function indexLibraryDocument(rawText: string, sourceName: string): { success: boolean; chunkCount: number } {
  // Extract chunks
  const cleanedText = rawText.trim();
  if (!cleanedText) return { success: false, chunkCount: 0 };

  const chunkSize = 400;
  const chunks: string[] = [];
  let index = 0;

  while (index < cleanedText.length) {
    const end = Math.min(index + chunkSize, cleanedText.length);
    chunks.push(cleanedText.substring(index, end));
    index += chunkSize - 50; // 50 character overlap
  }

  chunks.forEach((chunk, idx) => {
    memoryDocumentsDb.push({
      id: `chunk_${Date.now()}_${idx}`,
      source: sourceName || "Direct Paste Input",
      text: chunk
    });
  });

  return { success: true, chunkCount: chunks.length };
}

export function searchIndexedLibrary(query: string, limit = 3): { chunks: ChunkItem[] } {
  const qClean = query.toLowerCase();
  
  // Simple cosine Jaccard approximation for browser sandbox efficiency
  const matched = memoryDocumentsDb
    .map(doc => {
      const docClean = doc.text.toLowerCase();
      // Calculate token intersections
      const docWords = new Set(docClean.split(/\s+/));
      const qWords = qClean.split(/\s+/);
      
      let intersections = 0;
      qWords.forEach(w => {
        if (docWords.has(w)) intersections++;
      });
      
      const score = intersections / Math.max(1, qWords.length);
      return { doc, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.doc);

  // If no intersection was found, return basic first 2 items
  if (matched.length === 0 && memoryDocumentsDb.length > 0) {
    return { chunks: memoryDocumentsDb.slice(0, limit) };
  }

  return { chunks: matched };
}
