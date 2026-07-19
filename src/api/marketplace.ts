import fs from 'fs';
import path from 'path';
import { FlowNode, FlowConnection } from '../types.js';
import { db, tables } from '../db/index.js';
import { eq } from 'drizzle-orm';

const DATA_DIR = path.join(process.cwd(), 'projects', '.metadata');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MARKETPLACE_FILE = path.join(DATA_DIR, 'marketplace_items.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'marketplace_reviews.json');

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  authorId: string;
  category: 'agent' | 'tool' | 'template' | 'rag-pipeline';
  graphSnapshot: {
    name: string;
    nodes: FlowNode[];
    connections: FlowConnection[];
  };
  tags: string[];
  thumbnailUrl?: string;
  downloadsCount: number;
  rating: number;
  createdAt: string;
}

export interface MarketplaceReview {
  id: string;
  itemId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

function readJsonFile<T>(filePath: string, defaultVal: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.error(`Failed to read marketplace file: ${filePath}`, err);
  }
  return defaultVal;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to write marketplace file: ${filePath}`, err);
  }
}

// 5-10 High-Quality Seed Templates
const SEED_TEMPLATES: MarketplaceItem[] = [
  {
    id: "simple-chatbot",
    title: "Simple Chatbot",
    description: "A plug-and-play chatbot template. Accepts arbitrary user greetings, compilation of templates, and generates real-time answers.",
    authorId: "kostromai44_core",
    category: "agent",
    tags: ["chatbot", "fundamental", "gemini-3.5"],
    thumbnailUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&q=80",
    downloadsCount: 1420,
    rating: 4.8,
    createdAt: new Date().toISOString(),
    graphSnapshot: {
      name: "Simple Chatbot",
      nodes: [
        {
          id: "cb-input",
          type: "input",
          title: "User Prompt Input",
          x: 100,
          y: 200,
          description: "Defines chatbot entry strings of conversation.",
          fields: {
            variables: [
              { key: "message", value: "Hello! Tell me an interesting fact about deep space.", label: "User Message" }
            ]
          }
        },
        {
          id: "cb-prompt",
          type: "prompt",
          title: "Prompt Constructor",
          x: 350,
          y: 205,
          description: "Synthesizes standard chatbot system requirements with query input.",
          fields: {
            template: "You are a friendly astronomer. Respond to this query in a humorous & smart way:\n\n\"{message}\""
          }
        },
        {
          id: "cb-gemini",
          type: "gemini",
          title: "Gemini Chat Engine",
          x: 600,
          y: 200,
          description: "Fires LLM core completions.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.7,
            useSearchGrounding: false,
            systemInstruction: "Always answer keeping details scientific but easily understandable for people."
          }
        },
        {
          id: "cb-output",
          type: "output",
          title: "Chat Output Panel",
          x: 850,
          y: 210,
          description: "Displays response message log.",
          fields: {
            format: "markdown",
            value: ""
          }
        }
      ],
      connections: [
        { id: "cb-c1", sourceId: "cb-input", targetId: "cb-prompt" },
        { id: "cb-c2", sourceId: "cb-prompt", targetId: "cb-gemini" },
        { id: "cb-c3", sourceId: "cb-gemini", targetId: "cb-output" }
      ]
    }
  },
  {
    id: "rag-document-qa",
    title: "RAG Document QA Pipeline",
    description: "Connects your local Jaccard Knowledge Embeddings Retriever directly to the generation path. Ideal for knowledge bases.",
    authorId: "kostromai44_core",
    category: "rag-pipeline",
    tags: ["rag", "embeddings", "qa", "knowledge"],
    thumbnailUrl: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=150&q=80",
    downloadsCount: 935,
    rating: 4.9,
    createdAt: new Date().toISOString(),
    graphSnapshot: {
      name: "RAG Document QA Pipeline",
      nodes: [
        {
          id: "rag-input",
          type: "input",
          title: "Grounding Query",
          x: 80,
          y: 220,
          description: "Provide the user query for knowledge search.",
          fields: {
            variables: [
              { key: "query", value: "What is visual model flow control?", label: "Query Key" }
            ]
          }
        },
        {
          id: "rag-retrieve",
          type: "rag",
          title: "Verify RAG Context",
          x: 300,
          y: 110,
          description: "Retrieves top 5 document chunks matching querying words.",
          fields: {
            searchQuery: "{{query}}",
            limit: 5
          }
        },
        {
          id: "rag-prompt",
          type: "prompt",
          title: "Contextual Prompter",
          x: 520,
          y: 220,
          description: "Injects retrieved texts and original prompt together.",
          fields: {
            template: "User question: {query}\n\nRetrieved context pieces:\n{rag-retrieve}\n\nInstructions: Answer the question using ONLY the retrieved pieces above. If not in context, state you don't know."
          }
        },
        {
          id: "rag-gemini",
          type: "gemini",
          title: "Accurate responder",
          x: 740,
          y: 220,
          description: "Runs grounding answer synthesizing.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.1,
            useSearchGrounding: false,
            systemInstruction: "You are a literal, careful database validator who never hallucinates."
          }
        },
        {
          id: "rag-output",
          type: "output",
          title: "Grounded Response",
          x: 950,
          y: 220,
          description: "Renders the factual answer outcome.",
          fields: {
            format: "markdown",
            value: ""
          }
        }
      ],
      connections: [
        { id: "rag-c1", sourceId: "rag-input", targetId: "rag-retrieve" },
        { id: "rag-c2", sourceId: "rag-retrieve", targetId: "rag-prompt" },
        { id: "rag-c3", sourceId: "rag-input", targetId: "rag-prompt" },
        { id: "rag-c4", sourceId: "rag-prompt", targetId: "rag-gemini" },
        { id: "rag-c5", sourceId: "rag-gemini", targetId: "rag-output" }
      ]
    }
  },
  {
    id: "multi-agent-coder",
    title: "Self-Correcting Multi-Agent Coder",
    description: "Self-correcting multi-agent loop that generates code, critisizes it with custom rules, and applies feedback automatically.",
    authorId: "kostromai44_core",
    category: "agent",
    tags: ["coding", "editor", "self-correcting"],
    thumbnailUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=150&q=80",
    downloadsCount: 1120,
    rating: 4.7,
    createdAt: new Date().toISOString(),
    graphSnapshot: {
      name: "Self-Correcting Multi-Agent Coder",
      nodes: [
        {
          id: "code-input",
          type: "input",
          title: "Coding Specification",
          x: 80,
          y: 200,
          description: "Set of criteria to generate code scripts.",
          fields: {
            variables: [
              { key: "task", value: "Write an async function in TypeScript to fetch and parse JSON data with typing.", label: "Task Goal" }
            ]
          }
        },
        {
          id: "code-prompt",
          type: "prompt",
          title: "Drafting Prompter",
          x: 280,
          y: 200,
          description: "Builds developer spec framework constraints.",
          fields: {
            template: "Write clean TypeScript code for: {task}.\nInclude standard try-catch blocks and explicit return interfaces."
          }
        },
        {
          id: "code-generate",
          type: "gemini",
          title: "Gemini Code Starter",
          x: 480,
          y: 100,
          description: "Generates quick draft.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.2,
            useSearchGrounding: false,
            systemInstruction: "You are a software quality engineer generating production grade codes."
          }
        },
        {
          id: "code-review",
          type: "reviewer",
          title: "Critique Specialist",
          x: 680,
          y: 200,
          description: "Examines syntax exceptions, safety, typing structure.",
          fields: {
            criteria: "Ensure try-catch catches error as unknown and narrows its structure before logger console prints.",
            maxIterations: 2
          }
        },
        {
          id: "code-output",
          type: "output",
          title: "Verified Code Output",
          x: 900,
          y: 210,
          description: "Renders checked robust TypeScript output.",
          fields: {
            format: "markdown",
            value: ""
          }
        }
      ],
      connections: [
        { id: "code-cn1", sourceId: "code-input", targetId: "code-prompt" },
        { id: "code-cn2", sourceId: "code-prompt", targetId: "code-generate" },
        { id: "code-cn3", sourceId: "code-generate", targetId: "code-review" },
        { id: "code-cn4", sourceId: "code-review", targetId: "code-output" }
      ]
    }
  },
  {
    id: "web-research-assistant",
    title: "Web Research Assistant",
    description: "Uses Google Search Grounding to research real-time topics on the wild internet, compile structured market reports, and find sources.",
    authorId: "kostromai44_core",
    category: "agent",
    tags: ["google-search", "grounding", "intelligence", "realtime"],
    thumbnailUrl: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=150&q=80",
    downloadsCount: 1650,
    rating: 4.9,
    createdAt: new Date().toISOString(),
    graphSnapshot: {
      name: "Web Research Assistant",
      nodes: [
        {
          id: "res-input",
          type: "input",
          title: "Topic input",
          x: 100,
          y: 200,
          description: "The topic of interest requiring internet search.",
          fields: {
            variables: [
              { key: "topic", value: "Significant advancements in superconductor technology in 2026", label: "Market Topic" }
            ]
          }
        },
        {
          id: "res-prompt",
          type: "prompt",
          title: "Compiler Prompter",
          x: 350,
          y: 200,
          description: "Directs research prompts with structured requirements.",
          fields: {
            template: "Analyze the following topic thoroughly: {topic}.\nCollect recent announcements, scientific papers, and research groups. List sources."
          }
        },
        {
          id: "res-search",
          type: "gemini",
          title: "Grounded researcher",
          x: 600,
          y: 200,
          description: "Executes searches directly using Google Search Grounding integration.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.3,
            useSearchGrounding: true,
            systemInstruction: "You are an elite researcher. You verify all claims with real-time web references and outline citations clearly."
          }
        },
        {
          id: "res-output",
          type: "output",
          title: "Research Report",
          x: 850,
          y: 200,
          description: "Outputs markdown reports.",
          fields: {
            format: "markdown",
            value: ""
          }
        }
      ],
      connections: [
        { id: "res-c1", sourceId: "res-input", targetId: "res-prompt" },
        { id: "res-c2", sourceId: "res-prompt", targetId: "res-search" },
        { id: "res-c3", sourceId: "res-search", targetId: "res-output" }
      ]
    }
  },
  {
    id: "multi-agent-debate",
    title: "Multi-Agent Debate Protocol",
    description: "Two opinionated agents debate a given topic. A third agent acts as a judge, analyzing points made by both sides and presenting the verdict.",
    authorId: "kostromai44_core",
    category: "template",
    tags: ["debate", "reasoning", "multi-agent", "consensus"],
    thumbnailUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=150&q=80",
    downloadsCount: 840,
    rating: 4.8,
    createdAt: new Date().toISOString(),
    graphSnapshot: {
      name: "Multi-Agent Debate Protocol",
      nodes: [
        {
          id: "deb-input",
          type: "input",
          title: "Debate Theme",
          x: 80,
          y: 200,
          description: "The philosophical, commercial, or technical topic to argue.",
          fields: {
            variables: [
              { key: "topic", value: "Should AI systems have legal personhood rights?", label: "Discussion Topic" }
            ]
          }
        },
        {
          id: "deb-pro-prompt",
          type: "prompt",
          title: "Pro Argument Spec",
          x: 280,
          y: 90,
          description: "Directs pro stance on the topic.",
          fields: {
            template: "Defend a PRO position (in favor of) for the topic: {topic}.\nProvide 3 highly robust philosophical and legal logical support points."
          }
        },
        {
          id: "deb-con-prompt",
          type: "prompt",
          title: "Con Argument Spec",
          x: 280,
          y: 310,
          description: "Directs con stance on the topic.",
          fields: {
            template: "Defend a CON position (against) for the topic: {topic}.\nProvide 3 highly robust counter-arguments focusing on feasibility and accountability."
          }
        },
        {
          id: "deb-pro-agent",
          type: "gemini",
          title: "Advocate Agent (PRO)",
          x: 480,
          y: 90,
          description: "Generates PRO statements.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.8,
            useSearchGrounding: false,
            systemInstruction: "You are a passionate debate advocate for progressive rights expansion."
          }
        },
        {
          id: "deb-con-agent",
          type: "gemini",
          title: "Skeptic Agent (CON)",
          x: 480,
          y: 310,
          description: "Generates CON statements.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.8,
            useSearchGrounding: false,
            systemInstruction: "You are a prudent, critical skeptic debating to retain legal clarity and safety."
          }
        },
        {
          id: "deb-judge-prompt",
          type: "prompt",
          title: "Judicial Summation",
          x: 680,
          y: 200,
          description: "Synthesizes arguments from both sides.",
          fields: {
            template: "Compile a verdict for topic: {topic}\n\nPRO advocate argument:\n{deb-pro-agent}\n\nCON skeptic argument:\n{deb-con-agent}\n\nAnalyse logical fallacies, score both sides independently, and propose a synthesised compromise conclusion."
          }
        },
        {
          id: "deb-judge-agent",
          type: "gemini",
          title: "Judge Agent Unit",
          x: 880,
          y: 200,
          description: "Independent impartial evaluation of the debate.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.2,
            useSearchGrounding: false,
            systemInstruction: "You are a balanced Supreme Court Judge famous for rational compromises."
          }
        },
        {
          id: "deb-output",
          type: "output",
          title: "Final Debate Verdict",
          x: 1080,
          y: 200,
          description: "Displays sum verdict logic report.",
          fields: {
            format: "markdown",
            value: ""
          }
        }
      ],
      connections: [
        { id: "deb-c1", sourceId: "deb-input", targetId: "deb-pro-prompt" },
        { id: "deb-c2", sourceId: "deb-input", targetId: "deb-con-prompt" },
        { id: "deb-c3", sourceId: "deb-pro-prompt", targetId: "deb-pro-agent" },
        { id: "deb-c4", sourceId: "deb-con-prompt", targetId: "deb-con-agent" },
        { id: "deb-c5", sourceId: "deb-pro-agent", targetId: "deb-judge-prompt" },
        { id: "deb-c6", sourceId: "deb-con-agent", targetId: "deb-judge-prompt" },
        { id: "deb-c7", sourceId: "deb-input", targetId: "deb-judge-prompt" },
        { id: "deb-c8", sourceId: "deb-judge-prompt", targetId: "deb-judge-agent" },
        { id: "deb-c9", sourceId: "deb-judge-agent", targetId: "deb-output" }
      ]
    }
  },
  {
    id: "task-planner-orchestrator",
    title: "Task Planner & Orchestrator",
    description: "Splits complex user requests into discrete, ordered tasks using a planning agent, resolves them individually, and synthesizes the finalized results.",
    authorId: "kostromai44_core",
    category: "agent",
    tags: ["planner", "orchestrator", "multi-step", "coordination"],
    thumbnailUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=150&q=80",
    downloadsCount: 720,
    rating: 4.8,
    createdAt: new Date().toISOString(),
    graphSnapshot: {
      name: "Task Planner & Orchestrator",
      nodes: [
        {
          id: "planner-input",
          type: "input",
          title: "Complex Goal Input",
          x: 60,
          y: 200,
          description: "Define a high-level creative or technical goal.",
          fields: {
            variables: [
              { key: "goal", value: "Design a launch campaign structure for a visual node workflow editor named AgentForge.", label: "Primary Goal" }
            ]
          }
        },
        {
          id: "planner-prompt",
          type: "prompt",
          title: "Planning Prompt Builder",
          x: 280,
          y: 100,
          description: "Instructs the AI to decompose the goal into 3 sub-tasks.",
          fields: {
            template: "Analyze this objective: {goal}.\n\nDecompose it into exactly 3 sequential actions:\n1. Target Audience Identification\n2. Channel Selection\n3. Core Messaging Strategy.\n\nBe highly analytical."
          }
        },
        {
          id: "planner-agent",
          type: "gemini",
          title: "AI Project Planner",
          x: 480,
          y: 100,
          description: "Generates the step-by-step roadmap.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.3,
            useSearchGrounding: false,
            systemInstruction: "You are an expert Project Management Officer (PMO)."
          }
        },
        {
          id: "planner-compile",
          type: "prompt",
          title: "Synthesis Compiler",
          x: 680,
          y: 200,
          description: "Injects original goal and plan into a copywriter prompt.",
          fields: {
            template: "Target Goal: {goal}\nPlan generated:\n{planner-agent}\n\nDraft a complete, comprehensive marketing plan implementing this exact roadmap."
          }
        },
        {
          id: "planner-executor",
          type: "gemini",
          title: "Creative Copywriter",
          x: 880,
          y: 200,
          description: "Generates final high-fidelity campaign copy.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.75,
            useSearchGrounding: false,
            systemInstruction: "You are an award-winning marketing copywriter."
          }
        },
        {
          id: "planner-output",
          type: "output",
          title: "Final Strategy Document",
          x: 1080,
          y: 200,
          description: "Renders the campaign strategy report.",
          fields: {
            format: "markdown",
            value: ""
          }
        }
      ],
      connections: [
        { id: "planner-c1", sourceId: "planner-input", targetId: "planner-prompt" },
        { id: "planner-c2", sourceId: "planner-prompt", targetId: "planner-agent" },
        { id: "planner-c3", sourceId: "planner-agent", targetId: "planner-compile" },
        { id: "planner-c4", sourceId: "planner-input", targetId: "planner-compile" },
        { id: "planner-c5", sourceId: "planner-compile", targetId: "planner-executor" },
        { id: "planner-c6", sourceId: "planner-executor", targetId: "planner-output" }
      ]
    }
  },
  {
    id: "semantic-router-guard",
    title: "Semantic Router & Safety Guard",
    description: "Evaluates incoming requests for category and safety intent, routing requests dynamically to domain-specific instructions while filtering bad behavior.",
    authorId: "kostromai44_core",
    category: "template",
    tags: ["router", "safety", "intent", "classification"],
    thumbnailUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=150&q=80",
    downloadsCount: 510,
    rating: 4.7,
    createdAt: new Date().toISOString(),
    graphSnapshot: {
      name: "Semantic Router & Safety Guard",
      nodes: [
        {
          id: "sr-input",
          type: "input",
          title: "Raw User Inquiry",
          x: 60,
          y: 220,
          description: "Incoming user prompt.",
          fields: {
            variables: [
              { key: "query", value: "Help! How do I configure PostgreSQL with foreign key database indices?", label: "Query Text" }
            ]
          }
        },
        {
          id: "sr-classify-prompt",
          type: "prompt",
          title: "Intent Classifier Spec",
          x: 260,
          y: 220,
          description: "Prepares query classification criteria.",
          fields: {
            template: "Categorize this query: '{query}' into one of: 'DATABASE_TECHNICAL', 'GENERAL_ASSISTANT', or 'SECURITY_POLICY_VIOLATION'. Return only the category label."
          }
        },
        {
          id: "sr-classifier",
          type: "gemini",
          title: "Intent Discriminator",
          x: 460,
          y: 220,
          description: "Runs high-precision zero-shot classification.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.1,
            useSearchGrounding: false,
            systemInstruction: "You are a routing microservice. You output strictly the category matching the text."
          }
        },
        {
          id: "sr-router",
          type: "router",
          title: "Semantic Route Splitter",
          x: 660,
          y: 220,
          description: "Evaluates intent labels and activates the correct downstream path.",
          fields: {
            conditions: [
              { id: "cond-db", type: "contains", value: "DATABASE_TECHNICAL", targetNodeId: "sr-db-prompt", label: "DB Path" },
              { id: "cond-violation", type: "contains", value: "SECURITY_POLICY_VIOLATION", targetNodeId: "sr-violation-prompt", label: "Violation Path" }
            ],
            defaultTargetNodeId: "sr-gen-prompt"
          }
        },
        {
          id: "sr-db-prompt",
          type: "prompt",
          title: "DB Expert Prompt",
          x: 880,
          y: 100,
          description: "Specific database DBA instructions.",
          fields: {
            template: "You are a world-class Postgres DBA. Solve the user's database indexing query with explicit query code templates: {query}"
          }
        },
        {
          id: "sr-violation-prompt",
          type: "prompt",
          title: "Polite Rejection Prompt",
          x: 880,
          y: 340,
          description: "Standard safety warning message template.",
          fields: {
            template: "Draft a polite, secure denial response stating we cannot execute prompt injection or policy breaches."
          }
        },
        {
          id: "sr-gen-prompt",
          type: "prompt",
          title: "General Expert Prompt",
          x: 880,
          y: 220,
          description: "Generalist helper instructions.",
          fields: {
            template: "Answer this query elegantly: {query}"
          }
        },
        {
          id: "sr-responder",
          type: "gemini",
          title: "Grounded Responder",
          x: 1100,
          y: 220,
          description: "Compiles the designated response.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.2,
            useSearchGrounding: false,
            systemInstruction: "Provide professional, structured responses."
          }
        },
        {
          id: "sr-output",
          type: "output",
          title: "Safe Routed Output",
          x: 1300,
          y: 220,
          description: "Displays the final routed result safely.",
          fields: {
            format: "markdown",
            value: ""
          }
        }
      ],
      connections: [
        { id: "sr-c1", sourceId: "sr-input", targetId: "sr-classify-prompt" },
        { id: "sr-c2", sourceId: "sr-classify-prompt", targetId: "sr-classifier" },
        { id: "sr-c3", sourceId: "sr-classifier", targetId: "sr-router" },
        { id: "sr-c4", sourceId: "sr-router", targetId: "sr-db-prompt" },
        { id: "sr-c5", sourceId: "sr-router", targetId: "sr-gen-prompt" },
        { id: "sr-c6", sourceId: "sr-router", targetId: "sr-violation-prompt" },
        { id: "sr-c7", sourceId: "sr-db-prompt", targetId: "sr-responder" },
        { id: "sr-c8", sourceId: "sr-gen-prompt", targetId: "sr-responder" },
        { id: "sr-c9", sourceId: "sr-violation-prompt", targetId: "sr-responder" },
        { id: "sr-c10", sourceId: "sr-responder", targetId: "sr-output" }
      ]
    }
  },
  {
    id: "dev-tester-pair",
    title: "Developer & Tester Coding Loop",
    description: "One agent writes a TypeScript function from the specifications, another writes exhaustive unit tests, and a senior reviewer evaluates overall coverage.",
    authorId: "kostromai44_core",
    category: "agent",
    tags: ["coding", "jest", "unit-test", "pair-programming"],
    thumbnailUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=150&q=80",
    downloadsCount: 890,
    rating: 4.9,
    createdAt: new Date().toISOString(),
    graphSnapshot: {
      name: "Developer & Tester Coding Loop",
      nodes: [
        {
          id: "dev-input",
          type: "input",
          title: "Code Specification",
          x: 60,
          y: 200,
          description: "Provide the target functionality.",
          fields: {
            variables: [
              { key: "feature", value: "A function to calculate Jaccard Similarity between two arrays of strings, returning a score from 0 to 1.", label: "Target Feature" }
            ]
          }
        },
        {
          id: "dev-prompt",
          type: "prompt",
          title: "Developer Prompt Builder",
          x: 280,
          y: 100,
          description: "Formulates direct programming constraints.",
          fields: {
            template: "Write a high-performance, edge-case-safe TypeScript function for:\n{feature}.\nReturn ONLY clean TypeScript code."
          }
        },
        {
          id: "dev-coder",
          type: "gemini",
          title: "Principal Developer Agent",
          x: 480,
          y: 100,
          description: "Generates the implementation.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.15,
            useSearchGrounding: false,
            systemInstruction: "You are an elite, performance-focused software engineer."
          }
        },
        {
          id: "dev-test-prompt",
          type: "prompt",
          title: "Tester Prompt Builder",
          x: 680,
          y: 200,
          description: "Instructs testing framework setup.",
          fields: {
            template: "Write comprehensive unit tests in Vitest/Jest for the following implementation:\n\n{dev-coder}\n\nCover boundary values, empty arrays, and duplicate items."
          }
        },
        {
          id: "dev-tester",
          type: "gemini",
          title: "QA Test Automator",
          x: 880,
          y: 200,
          description: "Produces comprehensive testing scripts.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.2,
            useSearchGrounding: false,
            systemInstruction: "You are a meticulous Software Engineer in Test (SDET)."
          }
        },
        {
          id: "dev-output",
          type: "output",
          title: "Production Ready Package",
          x: 1080,
          y: 200,
          description: "Outputs completed code and test specs together.",
          fields: {
            format: "markdown",
            value: ""
          }
        }
      ],
      connections: [
        { id: "dev-c1", sourceId: "dev-input", targetId: "dev-prompt" },
        { id: "dev-c2", sourceId: "dev-prompt", targetId: "dev-coder" },
        { id: "dev-c3", sourceId: "dev-coder", targetId: "dev-test-prompt" },
        { id: "dev-c4", sourceId: "dev-test-prompt", targetId: "dev-tester" },
        { id: "dev-c5", sourceId: "dev-tester", targetId: "dev-output" }
      ]
    }
  },
  {
    id: "financial-analyst-agent",
    title: "Grounded Financial Analyst",
    description: "Uses Google Search Grounding to fetch recent financial news, compiles profit summaries, and performs fundamental valuation reporting.",
    authorId: "kostromai44_core",
    category: "agent",
    tags: ["finance", "valuation", "grounding", "report"],
    thumbnailUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=150&q=80",
    downloadsCount: 640,
    rating: 4.8,
    createdAt: new Date().toISOString(),
    graphSnapshot: {
      name: "Grounded Financial Analyst",
      nodes: [
        {
          id: "fin-input",
          type: "input",
          title: "Stock Ticker Input",
          x: 60,
          y: 200,
          description: "Target company stock ticker symbol.",
          fields: {
            variables: [
              { key: "ticker", value: "AAPL", label: "Ticker Symbol" }
            ]
          }
        },
        {
          id: "fin-research-prompt",
          type: "prompt",
          title: "Market Search Criteria",
          x: 280,
          y: 200,
          description: "Builds live financial research questions.",
          fields: {
            template: "Search for the latest quarterly earnings reports, net margins, and PE ratio for {ticker}. Check 2026 guidelines."
          }
        },
        {
          id: "fin-search-agent",
          type: "gemini",
          title: "Stock Market Scout",
          x: 480,
          y: 200,
          description: "Fetches live market trends and references.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.1,
            useSearchGrounding: true,
            systemInstruction: "You are an elite stock market researcher."
          }
        },
        {
          id: "fin-analysis-prompt",
          type: "prompt",
          title: "Valuation Briefing",
          x: 680,
          y: 200,
          description: "Instructs fundamental valuation and multiples.",
          fields: {
            template: "Based on the gathered market information:\n\n{fin-search-agent}\n\nDraft a comprehensive investment analyst report. Calculate estimated margins, list key risks, and outline buy/hold rating."
          }
        },
        {
          id: "fin-analyst",
          type: "gemini",
          title: "Equity Analyst (CFA)",
          x: 880,
          y: 200,
          description: "Drafts the high-fidelity investment thesis.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.3,
            useSearchGrounding: false,
            systemInstruction: "You are a senior chartered financial analyst."
          }
        },
        {
          id: "fin-output",
          type: "output",
          title: "Equity Research Report",
          x: 1080,
          y: 200,
          description: "Renders the finished report.",
          fields: {
            format: "markdown",
            value: ""
          }
        }
      ],
      connections: [
        { id: "fin-c1", sourceId: "fin-input", targetId: "fin-research-prompt" },
        { id: "fin-c2", sourceId: "fin-research-prompt", targetId: "fin-search-agent" },
        { id: "fin-c3", sourceId: "fin-search-agent", targetId: "fin-analysis-prompt" },
        { id: "fin-c4", sourceId: "fin-analysis-prompt", targetId: "fin-analyst" },
        { id: "fin-c5", sourceId: "fin-analyst", targetId: "fin-output" }
      ]
    }
  },
  {
    id: "customer-support-triage",
    title: "Support Triage & Email Drafter",
    description: "Evaluates support tickets for classification, severity score, and urgency, drafting a custom policy-grounded email reply.",
    authorId: "kostromai44_core",
    category: "template",
    tags: ["support", "triage", "automation", "draft"],
    thumbnailUrl: "https://images.unsplash.com/photo-1521791136368-1a46827d3ad1?auto=format&fit=crop&w=150&q=80",
    downloadsCount: 480,
    rating: 4.6,
    createdAt: new Date().toISOString(),
    graphSnapshot: {
      name: "Support Triage & Email Drafter",
      nodes: [
        {
          id: "sup-input",
          type: "input",
          title: "Customer Email Ticket",
          x: 60,
          y: 200,
          description: "The raw support text sent by user.",
          fields: {
            variables: [
              { key: "ticket", value: "I purchased the enterprise tier 3 hours ago but my workspace quota is still showing the development tier limit. This is urgent as we are launching a project now!", label: "Customer Email" }
            ]
          }
        },
        {
          id: "sup-triage-prompt",
          type: "prompt",
          title: "Classifier Instructions",
          x: 280,
          y: 100,
          description: "Assembles triage classification prompt.",
          fields: {
            template: "Analyze the customer request: '{ticket}'.\n\nIdentify:\n1. Severity (HIGH, MEDIUM, LOW)\n2. Category (BILLING, TECHNICAL, GENERAL)\n3. Sentiment score."
          }
        },
        {
          id: "sup-classifier",
          type: "gemini",
          title: "Triage Intelligence Unit",
          x: 480,
          y: 100,
          description: "Evaluates severity and routes category metadata.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.1,
            useSearchGrounding: false,
            systemInstruction: "You are a helpful customer support triage officer."
          }
        },
        {
          id: "sup-reply-prompt",
          type: "prompt",
          title: "Drafter Instructions",
          x: 680,
          y: 200,
          description: "Assembles reply email prompt with triage context.",
          fields: {
            template: "Original email: {ticket}\n\nTriage assessment:\n{sup-classifier}\n\nDraft an empathetic, professional support response addressing the quota delay, assuring them we are solving it instantly."
          }
        },
        {
          id: "sup-composer",
          type: "gemini",
          title: "Support Success Specialist",
          x: 880,
          y: 200,
          description: "Drafts the final response email.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.5,
            useSearchGrounding: false,
            systemInstruction: "You are an empathetic customer success lead."
          }
        },
        {
          id: "sup-output",
          type: "output",
          title: "Completed Ticket Draft",
          x: 1080,
          y: 200,
          description: "Renders the support email draft.",
          fields: {
            format: "markdown",
            value: ""
          }
        }
      ],
      connections: [
        { id: "sup-c1", sourceId: "sup-input", targetId: "sup-triage-prompt" },
        { id: "sup-c2", sourceId: "sup-triage-prompt", targetId: "sup-classifier" },
        { id: "sup-c3", sourceId: "sup-classifier", targetId: "sup-reply-prompt" },
        { id: "sup-c4", sourceId: "sup-input", targetId: "sup-reply-prompt" },
        { id: "sup-c5", sourceId: "sup-reply-prompt", targetId: "sup-composer" },
        { id: "sup-c6", sourceId: "sup-composer", targetId: "sup-output" }
      ]
    }
  },
  {
    id: "text-summarization-translation",
    title: "Parallel Multi-Language Translator",
    description: "Summarizes standard texts and translates them in parallel to French, Spanish, and German before assembling a localized markdown report.",
    authorId: "kostromai44_core",
    category: "template",
    tags: ["parallel", "translation", "localization", "multilingual"],
    thumbnailUrl: "https://images.unsplash.com/photo-1444653389962-8149286c578a?auto=format&fit=crop&w=150&q=80",
    downloadsCount: 570,
    rating: 4.8,
    createdAt: new Date().toISOString(),
    graphSnapshot: {
      name: "Parallel Multi-Language Translator",
      nodes: [
        {
          id: "tr-input",
          type: "input",
          title: "Source Document",
          x: 60,
          y: 260,
          description: "Input the original text to translate.",
          fields: {
            variables: [
              { key: "source", value: "Our zero-trust visualization playground enables software architects to orchestrate multi-agent microservices visually.", label: "Source Text" }
            ]
          }
        },
        {
          id: "tr-fr-prompt",
          type: "prompt",
          title: "French Prompt Builder",
          x: 280,
          y: 100,
          description: "French localization instructions.",
          fields: {
            template: "Translate this text into elegant Parisian French: {source}"
          }
        },
        {
          id: "tr-es-prompt",
          type: "prompt",
          title: "Spanish Prompt Builder",
          x: 280,
          y: 260,
          description: "Spanish localization instructions.",
          fields: {
            template: "Translate this text into premium Castilian Spanish: {source}"
          }
        },
        {
          id: "tr-de-prompt",
          type: "prompt",
          title: "German Prompt Builder",
          x: 280,
          y: 420,
          description: "German localization instructions.",
          fields: {
            template: "Translate this text into precise German: {source}"
          }
        },
        {
          id: "tr-fr-agent",
          type: "gemini",
          title: "French Translator",
          x: 480,
          y: 100,
          description: "Generates French translation.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.2,
            useSearchGrounding: false,
            systemInstruction: "You are a professional French linguist."
          }
        },
        {
          id: "tr-es-agent",
          type: "gemini",
          title: "Spanish Translator",
          x: 480,
          y: 260,
          description: "Generates Spanish translation.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.2,
            useSearchGrounding: false,
            systemInstruction: "You are a professional Spanish linguist."
          }
        },
        {
          id: "tr-de-agent",
          type: "gemini",
          title: "German Translator",
          x: 480,
          y: 420,
          description: "Generates German translation.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.2,
            useSearchGrounding: false,
            systemInstruction: "You are a professional German linguist."
          }
        },
        {
          id: "tr-combine-prompt",
          type: "prompt",
          title: "Report Assembler",
          x: 720,
          y: 260,
          description: "Gathers original and translated strings.",
          fields: {
            template: "Assemble a premium markdown localized report.\n\nOriginal Text:\n{source}\n\nTranslations:\n- **French**: {tr-fr-agent}\n- **Spanish**: {tr-es-agent}\n- **German**: {tr-de-agent}"
          }
        },
        {
          id: "tr-compiler",
          type: "gemini",
          title: "Markdown Document Compiler",
          x: 920,
          y: 260,
          description: "Fires final synthesis loop.",
          fields: {
            model: "gemini-3.5-flash",
            temperature: 0.1,
            useSearchGrounding: false,
            systemInstruction: "Format a clean multilingual report."
          }
        },
        {
          id: "tr-output",
          type: "output",
          title: "Multilingual Localized Report",
          x: 1120,
          y: 260,
          description: "Renders completed localized markdown file.",
          fields: {
            format: "markdown",
            value: ""
          }
        }
      ],
      connections: [
        { id: "tr-c1", sourceId: "tr-input", targetId: "tr-fr-prompt" },
        { id: "tr-c2", sourceId: "tr-input", targetId: "tr-es-prompt" },
        { id: "tr-c3", sourceId: "tr-input", targetId: "tr-de-prompt" },
        { id: "tr-c4", sourceId: "tr-fr-prompt", targetId: "tr-fr-agent" },
        { id: "tr-c5", sourceId: "tr-es-prompt", targetId: "tr-es-agent" },
        { id: "tr-c6", sourceId: "tr-de-prompt", targetId: "tr-de-agent" },
        { id: "tr-c7", sourceId: "tr-fr-agent", targetId: "tr-combine-prompt" },
        { id: "tr-c8", sourceId: "tr-es-agent", targetId: "tr-combine-prompt" },
        { id: "tr-c9", sourceId: "tr-de-agent", targetId: "tr-combine-prompt" },
        { id: "tr-c10", sourceId: "tr-input", targetId: "tr-combine-prompt" },
        { id: "tr-c11", sourceId: "tr-combine-prompt", targetId: "tr-compiler" },
        { id: "tr-c12", sourceId: "tr-compiler", targetId: "tr-output" }
      ]
    }
  }
];

export class MarketplaceManager {
  private static async seedIfEmpty(): Promise<void> {
    try {
      // Ensure "default-workspace" exists first to satisfy foreign key constraint on tenantId
      const wsCheck = await db.select().from(tables.workspaces).where(eq(tables.workspaces.id, 'default-workspace')).limit(1);
      if (wsCheck.length === 0) {
        await db.insert(tables.workspaces).values({
          id: 'default-workspace',
          name: 'Default Workspace',
          createdAt: new Date().toISOString()
        });
      }

      for (const t of SEED_TEMPLATES) {
        const itemCheck = await db.select().from(tables.marketplaceItems).where(eq(tables.marketplaceItems.id, t.id)).limit(1);
        if (itemCheck.length === 0) {
          await db.insert(tables.marketplaceItems).values({
            id: t.id,
            name: t.title,
            description: t.description,
            type: t.category,
            data: JSON.stringify({
              ...t.graphSnapshot,
              tags: t.tags
            }),
            author: t.authorId,
            downloads: t.downloadsCount,
            rating: t.rating,
            reviews: '[]',
            createdAt: t.createdAt
          });
        } else {
          const existing = itemCheck[0];
          if (existing.name !== t.title) {
            await db.update(tables.marketplaceItems)
              .set({
                name: t.title,
                description: t.description,
                type: t.category,
                data: JSON.stringify({
                  ...t.graphSnapshot,
                  tags: t.tags
                })
              })
              .where(eq(tables.marketplaceItems.id, t.id));
          }
        }
      }
    } catch (err: any) {
      console.warn("Could not query or seed marketplaceItems database table:", err.message);
    }
  }

  static async getItems(
    category?: string,
    tag?: string,
    search?: string,
    sortBy?: string,
    page?: number,
    limit?: number
  ): Promise<MarketplaceItem[] | { items: MarketplaceItem[]; total: number; page: number; pages: number; hasMore: boolean }> {
    await this.seedIfEmpty();
    let rows: any[] = [];
    try {
      rows = await db.select().from(tables.marketplaceItems);
    } catch (err: any) {
      console.warn("Failed to select marketplace items:", err.message);
    }
    
    let items: MarketplaceItem[] = rows.map(row => {
      let parsedData: any = {};
      try {
        parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data || {};
      } catch (err: any) {
        console.warn(`Failed to parse metadata for row "${row.id}":`, err.message);
      }
      return {
        id: row.id,
        title: row.name,
        description: row.description || '',
        authorId: row.author,
        category: row.type as any,
        graphSnapshot: {
          name: row.name,
          nodes: parsedData.nodes || [],
          connections: parsedData.connections || []
        },
        tags: parsedData.tags || [],
        downloadsCount: row.downloads,
        rating: row.rating,
        createdAt: row.createdAt
      };
    });

    if (category && category !== 'all') {
      items = items.filter(item => item.category === category);
    }

    if (tag) {
      items = items.filter(item => item.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'newest') {
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'rating') {
      items.sort((a, b) => b.rating - a.rating);
    } else {
      items.sort((a, b) => b.downloadsCount - a.downloadsCount);
    }

    const total = items.length;
    if (page !== undefined && limit !== undefined) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = items.slice(startIndex, endIndex);
      const pages = Math.ceil(total / limit);
      return {
        items: paginatedItems,
        total,
        page,
        pages,
        hasMore: page < pages
      };
    }

    return items;
  }

  static async getItemById(id: string): Promise<MarketplaceItem | null> {
    await this.seedIfEmpty();
    let rows: any[] = [];
    try {
      rows = await db.select().from(tables.marketplaceItems).where(eq(tables.marketplaceItems.id, id));
    } catch (err: any) {
      console.warn(`Failed to fetch marketplace item "${id}":`, err.message);
    }
    if (rows.length === 0) return null;
    
    const row = rows[0];
    let parsedData: any = {};
    try {
      parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data || {};
    } catch (err: any) {
      console.warn(`Failed to parse data for row "${row.id}":`, err.message);
    }
    return {
      id: row.id,
      title: row.name,
      description: row.description || '',
      authorId: row.author,
      category: row.type as any,
      graphSnapshot: {
        name: row.name,
        nodes: parsedData.nodes || [],
        connections: parsedData.connections || []
      },
      tags: parsedData.tags || [],
      downloadsCount: row.downloads,
      rating: row.rating,
      createdAt: row.createdAt
    };
  }

  static async publishItem(
    title: string,
    description: string,
    category: 'agent' | 'tool' | 'template' | 'rag-pipeline',
    graphSnapshot: any,
    tags: string[],
    authorId: string = "user_developer",
    tenantId: string = "default-workspace"
  ): Promise<MarketplaceItem> {
    await this.seedIfEmpty();
    
    if (!graphSnapshot || !Array.isArray(graphSnapshot.nodes)) {
      throw new Error("Invalid graph snapshot payload. A valid nodes array is required.");
    }

    const cleanTags = tags.map(t => t.trim().toLowerCase()).filter(Boolean);

    const newItem: MarketplaceItem = {
      id: `mkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title,
      description,
      authorId,
      category,
      graphSnapshot: {
        name: title,
        nodes: graphSnapshot.nodes,
        connections: graphSnapshot.connections || []
      },
      tags: cleanTags,
      downloadsCount: 0,
      rating: 5.0,
      createdAt: new Date().toISOString()
    };

    try {
      await db.insert(tables.marketplaceItems).values({
        id: newItem.id,
        name: newItem.title,
        description: newItem.description,
        type: newItem.category,
        data: JSON.stringify({
          nodes: newItem.graphSnapshot.nodes,
          connections: newItem.graphSnapshot.connections,
          tags: newItem.tags
        }),
        createdAt: newItem.createdAt,
        author: newItem.authorId,
        downloads: newItem.downloadsCount,
        rating: newItem.rating,
        reviews: '[]',
        tenantId: tenantId
      });
    } catch (err: any) {
      console.warn(`Failed to insert published item "${newItem.id}":`, err.message);
    }

    return newItem;
  }

  static async incrementDownload(id: string): Promise<MarketplaceItem> {
    const item = await this.getItemById(id);
    if (!item) {
      throw new Error("Marketplace item not found.");
    }
    
    const nextDownloads = item.downloadsCount + 1;
    
    try {
      await db.update(tables.marketplaceItems)
         .set({ downloads: nextDownloads })
         .where(eq(tables.marketplaceItems.id, id));
    } catch (err: any) {
      console.warn(`Failed to increment downloads for item "${id}":`, err.message);
    }
      
    item.downloadsCount = nextDownloads;
    return item;
  }

  static async getReviews(itemId: string): Promise<MarketplaceReview[]> {
    let rows: any[] = [];
    try {
      rows = await db.select().from(tables.marketplaceItems).where(eq(tables.marketplaceItems.id, itemId));
    } catch (err: any) {
      console.warn(`Failed to get reviews for item "${itemId}":`, err.message);
    }
    if (rows.length === 0) return [];
    
    try {
      return typeof rows[0].reviews === 'string' ? JSON.parse(rows[0].reviews) : rows[0].reviews || [];
    } catch {
      return [];
    }
  }

  static async addReview(itemId: string, userId: string, rating: number, comment: string): Promise<MarketplaceReview> {
    const rows = await db.select().from(tables.marketplaceItems).where(eq(tables.marketplaceItems.id, itemId));
    if (rows.length === 0) {
      throw new Error("Marketplace item not found.");
    }
    
    const row = rows[0];
    let reviewsList: MarketplaceReview[] = [];
    try {
      reviewsList = typeof row.reviews === 'string' ? JSON.parse(row.reviews) : row.reviews || [];
    } catch {
      reviewsList = [];
    }
    
    const newReview: MarketplaceReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      itemId,
      userId: userId || "Anonymous Expert2026",
      rating: Math.max(1, Math.min(5, rating)),
      comment,
      createdAt: new Date().toISOString()
    };

    reviewsList.push(newReview);
    const avgRating = reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length;

    try {
      await db.update(tables.marketplaceItems)
        .set({
          reviews: JSON.stringify(reviewsList),
          rating: Number(avgRating.toFixed(1))
        })
        .where(eq(tables.marketplaceItems.id, itemId));
    } catch (err: any) {
      console.warn(`Failed to update review list for item "${itemId}":`, err.message);
    }

    return newReview;
  }

  static async getFeatured(): Promise<MarketplaceItem[]> {
    const res = await this.getItems();
    const items = Array.isArray(res) ? res : res.items;
    return [...items].sort((a, b) => b.rating - a.rating).slice(0, 3);
  }
}
