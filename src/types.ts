export type NodeType = 'input' | 'prompt' | 'gemini' | 'reviewer' | 'output' | 'router' | 'tool' | 'rag' | 'vector-search' | 'multimodal' | 'human_confirmation' | 'prompt_optimizer' | 'webhook';

export interface BaseNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  description: string;
  fields: Record<string, any>;
}

export interface InputNode extends BaseNode {
  type: 'input';
  fields: {
    variables: Array<{ key: string; value: string; label: string }>;
  };
}

export interface PromptNode extends BaseNode {
  type: 'prompt';
  fields: {
    template: string;
  };
}

export interface GeminiNode extends BaseNode {
  type: 'gemini';
  fields: {
    model: string;
    temperature: number;
    useSearchGrounding: boolean;
    systemInstruction: string;
  };
}

export interface ReviewerNode extends BaseNode {
  type: 'reviewer';
  fields: {
    criteria: string;
    maxIterations: number;
  };
}

export interface OutputNode extends BaseNode {
  type: 'output';
  fields: {
    format: 'markdown' | 'json' | 'text';
    value: string;
  };
}

export interface RouterCondition {
  id: string;
  type: 'regex' | 'json_key' | 'contains';
  value: string; // The regex, substring, or JSON dot-separated key path
  targetNodeId: string;
  label: string;
}

export interface RouterNode extends BaseNode {
  type: 'router';
  fields: {
    conditions: RouterCondition[];
    defaultTargetNodeId: string;
  };
}

export interface ToolNode extends BaseNode {
  type: 'tool';
  fields: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers: string; // Dynamic JSON string mapping
    body: string; // Template string or raw JSON body
  };
}

export interface RAGNode extends BaseNode {
  type: 'rag';
  fields: {
    searchQuery: string;
    limit: number;
    ragResults?: Array<{ id: string; source: string; text: string; score?: number }>;
  };
}

export interface VectorSearchNode extends BaseNode {
  type: 'vector-search';
  fields: {
    searchQuery: string;
    limit: number;
    ragResults?: Array<{ id: string; source: string; text: string; score?: number }>;
  };
}

export interface MultimodalNode extends BaseNode {
  type: 'multimodal';
  fields: {
    mediaType: 'image' | 'audio' | 'pdf' | 'excel';
    mediaData: string; // Base64 encoded document or audio/image binary sequence or reference URL
    analysisPrompt: string; // Dynamic instructions for formatting/Ocr/live synthesis
    useGeminiLive: boolean; // Flag to leverage high-speed Live API translation/synthesis
    outputVariables: string; // Variable mapping for extracted structure JSON nodes
  };
}

export interface HumanConfirmationNode extends BaseNode {
  type: 'human_confirmation';
  fields: {
    message: string;
    approvedValue?: string;
    rejectedMessage?: string;
  };
}

export interface PromptOptimizerNode extends BaseNode {
  type: 'prompt_optimizer';
  fields: {
    originalPrompt: string;
    targetPersona: string;
    optimizedPrompt?: string;
  };
}

export interface WebhookNode extends BaseNode {
  type: 'webhook';
  fields: {
    url: string;
    method: 'POST';
    headers: string; // Dynamic JSON string mapping
    body: string; // Outbound POST payload templates
    token: string; // Dynamic authentication token
  };
}

export type FlowNode = InputNode | PromptNode | GeminiNode | ReviewerNode | OutputNode | RouterNode | ToolNode | RAGNode | VectorSearchNode | MultimodalNode | HumanConfirmationNode | PromptOptimizerNode | WebhookNode;

export interface FlowConnection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: string;
  stars: string; // Virality indicator badge
  nodes: FlowNode[];
  connections: FlowConnection[];
  logo?: string;
  complexity?: string;
}

export interface StepLog {
  nodeId: string;
  nodeTitle: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'paused';
  input?: string;
  output?: string;
  duration?: number; // ms
  groundingSources?: Array<{ title: string; uri: string }>;
  iterationCount?: number;
  ragQuery?: string;
  ragChunksCount?: number;
  ragLatency?: number;
  ragTopChunks?: Array<{ id: string; source: string; text: string }>;
  simulated?: boolean;
}

export interface PipelineExecutionResult {
  logs: StepLog[];
  finalResult: string;
  totalDuration: number;
  simulated?: boolean;
}

export const PREBUILT_TEMPLATES: Workflow[] = [
  {
    id: 'multi-agent-coder',
    name: 'Self-Correcting Multi-Agent Coder',
    description: 'Generates TypeScript code, parses it with a critiques node, and feeds back self-corrections up to 3 times for robust output.',
    category: 'Development',
    stars: '1.2k forks/wk',
    nodes: [
      {
        id: 'node-input',
        type: 'input',
        title: 'Input Spec',
        x: 60,
        y: 180,
        description: 'Specify programming task and language constraints.',
        fields: {
          variables: [
            { key: 'language', value: 'TypeScript & React', label: 'Target Language' },
            { key: 'task', value: 'Write a performance-optimized useDebounce Hook supporting immediate execution option.', label: 'Coding Task' }
          ]
        }
      },
      {
        id: 'node-prompt',
        type: 'prompt',
        title: 'Coder Prompt',
        x: 230,
        y: 80,
        description: 'Assembles variables into developer instructions.',
        fields: {
          template: 'Task: Write an outstanding implementation of a {task} in {language}.\n\nRequirements:\n- Must include clean TypeScript types.\n- Provide exhaustive comments explaining choices.\n- Return ONLY valid production code without any introductory or conversational text.'
        }
      },
      {
        id: 'node-gemini',
        type: 'gemini',
        title: 'Gemini Coder Unit',
        x: 420,
        y: 150,
        description: 'Executes primary code generation using advanced Gemini models.',
        fields: {
          model: 'gemini-3.5-flash',
          temperature: 0.1,
          useSearchGrounding: false,
          systemInstruction: 'You are a Senior Technical Architect focused on ultra-optimized, type-safe fullstack components.'
        }
      },
      {
        id: 'node-reviewer',
        type: 'reviewer',
        title: 'Critique & Verify',
        x: 610,
        y: 100,
        description: 'Performs self-criticism. Loops back to generator if criteria fail.',
        fields: {
          criteria: 'Check if code contains comprehensive typescript declarations, is free of external libraries, and handles reactive parameter cleanup.',
          maxIterations: 2
        }
      },
      {
        id: 'node-output',
        type: 'output',
        title: 'Refined Code Output',
        x: 800,
        y: 180,
        description: 'Displays the fully corrected executable code block.',
        fields: {
          format: 'markdown',
          value: ''
        }
      }
    ],
    connections: [
      { id: 'c1', sourceId: 'node-input', targetId: 'node-prompt' },
      { id: 'c2', sourceId: 'node-prompt', targetId: 'node-gemini' },
      { id: 'c3', sourceId: 'node-gemini', targetId: 'node-reviewer' },
      { id: 'c4', sourceId: 'node-reviewer', targetId: 'node-output' }
    ]
  },
  {
    id: 'google-grounded-seo',
    name: 'Grounded Real-Time Market Analyst',
    description: 'Conducts Google Search grounded research on current trends, aggregates bullet findings, and builds an SEO roadmap.',
    category: 'Marketing & Research',
    stars: '950 forks/wk',
    nodes: [
      {
        id: 'seo-input',
        type: 'input',
        title: 'Target Theme',
        x: 60,
        y: 180,
        description: 'Define the target industry research category.',
        fields: {
          variables: [
            { key: 'industry', value: 'Open Source AI Frameworks & Visual Flowbuilders in 2026', label: 'Industry Concept' },
            { key: 'competitor', value: 'Langflow, n8n, Flowise', label: 'Reference Apps' }
          ]
        }
      },
      {
        id: 'seo-prompt',
        type: 'prompt',
        title: 'Briefing Compiler',
        x: 230,
        y: 180,
        description: 'Prepares structured research prompts.',
        fields: {
          template: 'Conduct a thorough search inquiry regarding recent updates, user feedback, and github star trends for: {industry}.\nCompare the key features with existing giants like {competitor} and output a strategic insights outline.'
        }
      },
      {
        id: 'seo-gemini',
        type: 'gemini',
        title: 'Grounded Analyst Node',
        x: 420,
        y: 180,
        description: 'Leverages Google Search Grounding to verify real-time 2026 facts.',
        fields: {
          model: 'gemini-3.5-flash',
          temperature: 0.4,
          useSearchGrounding: true,
          systemInstruction: 'You are an elite Market Intelligence Analyst. Always ground suggestions in concrete web references.'
        }
      },
      {
        id: 'seo-output',
        type: 'output',
        title: 'Market Roadmap',
        x: 650,
        y: 180,
        description: 'Outputs the structured marketing insights sheet.',
        fields: {
          format: 'markdown',
          value: ''
        }
      }
    ],
    connections: [
      { id: 'seo-c1', sourceId: 'seo-input', targetId: 'seo-prompt' },
      { id: 'seo-c2', sourceId: 'seo-prompt', targetId: 'seo-gemini' },
      { id: 'seo-c3', sourceId: 'seo-gemini', targetId: 'seo-output' }
    ]
  },
  {
    id: 'viral-thread-wizard',
    name: 'Twitter Viral Hook & Story Generator',
    description: 'Generates dramatic storytelling threads. Focuses on psychological engagement triggers and optimal bullet configurations.',
    category: 'Social Media',
    stars: '800 forks/wk',
    nodes: [
      {
        id: 'tw-input',
        type: 'input',
        title: 'Project Idea',
        x: 60,
        y: 180,
        description: 'Information about your product launch or open-source repo.',
        fields: {
          variables: [
            { key: 'project', value: 'KostromAi44 - Visual Node-Based Agent Sandbox', label: 'Project Name' },
            { key: 'achievement', value: 'Built from scratch in an hour, runs full-stack Gemini tools visually', label: 'Key Hook Detail' }
          ]
        }
      },
      {
        id: 'tw-prompt',
        type: 'prompt',
        title: 'Hook template',
        x: 230,
        y: 120,
        description: 'Transforms metrics into copywriting templates.',
        fields: {
          template: 'Write a highly compelling, high-converting social media thread of 4 tweets details about: {project}.\nThe key accomplishment: {achievement}.\n\nRules:\n- Tweet 1: Visual hook statement. Use a surprising metric, no emojis, clean punchy line.\n- Tweet 2-3: Core value proposition and interactive visuals.\n- Tweet 4: Clean Call-to-Action invite (star/fork visual).'
        }
      },
      {
        id: 'tw-gemini',
        type: 'gemini',
        title: 'Creative Copywriter',
        x: 420,
        y: 180,
        description: 'Runs high-temperature generation optimized for natural storytelling flow.',
        fields: {
          model: 'gemini-3.5-flash',
          temperature: 0.85,
          useSearchGrounding: false,
          systemInstruction: 'You are a master of tech copywriting and content virality who understands audience capture and rhythm.'
        }
      },
      {
        id: 'tw-output',
        type: 'output',
        title: 'Generated Thread',
        x: 650,
        y: 180,
        description: 'Displays the high-impact social thread split neatly.',
        fields: {
          format: 'text',
          value: ''
        }
      }
    ],
    connections: [
      { id: 'tw-c1', sourceId: 'tw-input', targetId: 'tw-prompt' },
      { id: 'tw-c2', sourceId: 'tw-prompt', targetId: 'tw-gemini' },
      { id: 'tw-c3', sourceId: 'tw-gemini', targetId: 'tw-output' }
    ]
  }
];
