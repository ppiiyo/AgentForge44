import { FlowNode, FlowConnection } from '../../types.js';

export interface Blueprint {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowConnection[];
}

export const simpleBlueprint: Blueprint = {
  id: 'simple-1',
  name: 'Simple LLM Call',
  nodes: [
    {
      id: 'input',
      type: 'input',
      title: 'Input Node',
      x: 0,
      y: 0,
      description: 'Input variables',
      fields: {
        variables: [
          { key: 'text', value: 'The quick brown fox jumps over the lazy dog', label: 'Input Text' }
        ]
      }
    },
    {
      id: 'llm',
      type: 'gemini',
      title: 'Gemini LLM',
      x: 100,
      y: 0,
      description: 'Call Gemini model',
      fields: {
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        useSearchGrounding: false,
        systemInstruction: 'You are a helpful assistant'
      }
    },
    {
      id: 'output',
      type: 'output',
      title: 'Output Node',
      x: 200,
      y: 0,
      description: 'Final execution result',
      fields: {
        format: 'text',
        value: '{llm}'
      }
    }
  ],
  edges: [
    { id: 'e1', sourceId: 'input', targetId: 'llm' },
    { id: 'e2', sourceId: 'llm', targetId: 'output' }
  ]
};

export const parallelBlueprint: Blueprint = {
  id: 'parallel-1',
  name: 'Parallel Execution',
  nodes: [
    {
      id: 'input',
      type: 'input',
      title: 'Input Node',
      x: 0,
      y: 0,
      description: 'Inputs',
      fields: {
        variables: []
      }
    },
    {
      id: 'llm1',
      type: 'gemini',
      title: 'LLM Node 1',
      x: 100,
      y: -100,
      description: 'LLM Task 1',
      fields: {
        model: 'gemini-1.5-flash',
        temperature: 0.1,
        useSearchGrounding: false,
        systemInstruction: 'Respond: Task 1 success'
      }
    },
    {
      id: 'llm2',
      type: 'gemini',
      title: 'LLM Node 2',
      x: 100,
      y: 100,
      description: 'LLM Task 2',
      fields: {
        model: 'gemini-1.5-flash',
        temperature: 0.1,
        useSearchGrounding: false,
        systemInstruction: 'Respond: Task 2 success'
      }
    },
    {
      id: 'merge',
      type: 'output',
      title: 'Merge Output Node',
      x: 200,
      y: 0,
      description: 'Merge and return result',
      fields: {
        format: 'text',
        value: '{llm1} and {llm2}'
      }
    }
  ],
  edges: [
    { id: 'e1', sourceId: 'input', targetId: 'llm1' },
    { id: 'e2', sourceId: 'input', targetId: 'llm2' },
    { id: 'e3', sourceId: 'llm1', targetId: 'merge' },
    { id: 'e4', sourceId: 'llm2', targetId: 'merge' }
  ]
};

export const reviewerBlueprint: Blueprint = {
  id: 'reviewer-1',
  name: 'Self-Correction Loop',
  nodes: [
    {
      id: 'input',
      type: 'input',
      title: 'Input Node',
      x: 0,
      y: 0,
      description: 'Initial instructions',
      fields: {
        variables: []
      }
    },
    {
      id: 'generator',
      type: 'gemini',
      title: 'Essay Generator',
      x: 100,
      y: 0,
      description: 'Generate essay draft',
      fields: {
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        useSearchGrounding: false,
        systemInstruction: 'Generate a short draft about AI safety.'
      }
    },
    {
      id: 'reviewer',
      type: 'reviewer',
      title: 'Quality Auditor',
      x: 200,
      y: 0,
      description: 'Review essay draft',
      fields: {
        criteria: 'Check for safety arguments',
        maxIterations: 3
      }
    }
  ],
  edges: [
    { id: 'e1', sourceId: 'input', targetId: 'generator' },
    { id: 'e2', sourceId: 'generator', targetId: 'reviewer' }
  ]
};

export const failingBlueprint: Blueprint = {
  id: 'failing-1',
  name: 'Failure Scenario',
  nodes: [
    {
      id: 'input',
      type: 'input',
      title: 'Input Node',
      x: 0,
      y: 0,
      description: 'Input variables',
      fields: {
        variables: []
      }
    },
    {
      id: 'http',
      type: 'tool',
      title: 'HTTP Call Node',
      x: 100,
      y: 0,
      description: 'Call external API',
      fields: {
        url: 'https://invalid-url-that-does-not-exist.com',
        method: 'GET',
        headers: '{}',
        body: ''
      }
    }
  ],
  edges: [
    { id: 'e1', sourceId: 'input', targetId: 'http' }
  ]
};
