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
    id: "code-reviewer-agent",
    title: "Code Reviewer Agent",
    description: "Self-correcting multi-agent loop that generates code, critisizes it with custom rules, and applies feedback automatically.",
    authorId: "kostromai44_core",
    category: "agent",
    tags: ["coding", "editor", "self-correcting"],
    thumbnailUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=150&q=80",
    downloadsCount: 1120,
    rating: 4.7,
    createdAt: new Date().toISOString(),
    graphSnapshot: {
      name: "Code Reviewer Agent",
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

      const list = await db.select().from(tables.marketplaceItems);
      const count = list.length;
      if (count === 0) {
        for (const t of SEED_TEMPLATES) {
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
        }
      }
    } catch (err: any) {
      console.warn("Could not query or seed marketplaceItems database table:", err.message);
    }
  }

  static async getItems(category?: string, tag?: string, search?: string, sortBy?: string): Promise<MarketplaceItem[]> {
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
    const items = await this.getItems();
    return items.sort((a, b) => b.rating - a.rating).slice(0, 3);
  }
}
