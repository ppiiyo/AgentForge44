import { db, tables } from '../src/db/index.js';
import { eq } from 'drizzle-orm';

// Define the exact type expected by database tables or marketplaceManager
const SEED_TEMPLATES = [
  {
    id: "simple-chatbot",
    name: "Simple Chatbot",
    description: "A plug-and-play chatbot template. Accepts arbitrary user greetings, compilation of templates, and generates real-time answers.",
    type: "agent",
    author: "kostromai44_core",
    downloads: 1420,
    rating: 4.8,
    reviews: '[]',
    createdAt: new Date().toISOString(),
    data: JSON.stringify({
      name: "Simple Chatbot",
      tags: ["chatbot", "fundamental", "gemini-3.5"],
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
    })
  }
];

async function seed() {
  console.log("🌌 Seed script started...");
  try {
    // 1. Ensure "default-workspace" exists
    const wsCheck = await db.select().from(tables.workspaces).where(eq(tables.workspaces.id, 'default-workspace')).limit(1);
    if (wsCheck.length === 0) {
      console.log("Inserting default workspace...");
      await db.insert(tables.workspaces).values({
        id: 'default-workspace',
        name: 'Default Workspace',
        createdAt: new Date().toISOString()
      });
    }

    // 2. Insert marketplace items if empty
    const list = await db.select().from(tables.marketplaceItems);
    if (list.length === 0) {
      console.log(`Seeding ${SEED_TEMPLATES.length} templates...`);
      for (const item of SEED_TEMPLATES) {
        await db.insert(tables.marketplaceItems).values(item);
      }
      console.log("✅ Seeding completed successfully!");
    } else {
      console.log("ℹ️ Database already has marketplace items. Skipping seeding.");
    }
  } catch (err: any) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
  process.exit(0);
}

seed();
