import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../../server.js';
import { signToken } from '../../api/userAuth.js';

// Mock the GoogleGenAI module to run locally in all execution environments
vi.mock('@google/genai', () => {
  class GoogleGenAI {
    models = {
      generateContent: vi.fn().mockResolvedValue({
        text: "Mocked Gemini Response Text",
        candidates: [
          {
            content: {
              parts: [{ text: "Mocked Gemini Response Text" }]
            }
          }
        ]
      })
    };
  }
  return { GoogleGenAI };
});

describe('Pipeline Execution API Suite', () => {
  const userToken = signToken({ id: 'user-a', email: 'user-a@test.com', role: 'editor' });

  it('should execute a simple flat input-to-prompt graph', async () => {
    const payload = {
      nodes: [
        {
          id: 'inp-1',
          type: 'input',
          title: 'Input Node',
          x: 0, y: 0,
          fields: {
            variables: [
              { key: 'hobby', value: 'baking sourdough', label: 'Hobby' }
            ]
          }
        },
        {
          id: 'prm-1',
          type: 'prompt',
          title: 'Prompt Node',
          x: 0, y: 0,
          fields: {
            template: 'My favorite weekend activity is {hobby}!'
          }
        },
        {
          id: 'out-1',
          type: 'output',
          title: 'Output Node',
          x: 0, y: 0,
          fields: {
            value: ''
          }
        }
      ],
      connections: [
        { id: 'c1', sourceId: 'inp-1', targetId: 'prm-1' },
        { id: 'c2', sourceId: 'prm-1', targetId: 'out-1' }
      ]
    };

    const res = await request(app)
      .post('/api/execute')
      .set('Authorization', `Bearer ${userToken}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.finalResult).toContain('My favorite weekend activity is baking sourdough!');
    expect(res.body.logs.length).toBe(3);
  });

  it('should execute a pipeline containing LLM (Gemini) nodes', async () => {
    const payload = {
      nodes: [
        {
          id: 'inp-1',
          type: 'input',
          title: 'Input Node',
          x: 0, y: 0,
          fields: {
            variables: [
              { key: 'prompt_text', value: 'Design a responsive landing page layout.', label: 'Prompt' }
            ]
          }
        },
        {
          id: 'prompt-node-1',
          type: 'prompt',
          title: 'Compile Spec',
          x: 0, y: 0,
          fields: {
            template: 'Generate spec: {prompt_text}'
          }
        },
        {
          id: 'model-gemini-1',
          type: 'gemini',
          title: 'Gemini Node',
          x: 0, y: 0,
          fields: {
            model: 'gemini-3.5-flash',
            systemInstruction: 'You are an architect.'
          }
        }
      ],
      connections: [
        { id: 'c1', sourceId: 'inp-1', targetId: 'prompt-node-1' },
        { id: 'c2', sourceId: 'prompt-node-1', targetId: 'model-gemini-1' }
      ]
    };

    const res = await request(app)
      .post('/api/execute')
      .set('Authorization', `Bearer ${userToken}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.finalResult).toBeDefined();
    expect(res.body.logs.some((l: any) => l.nodeId === 'model-gemini-1')).toBe(true);
  });

  it('should execute a pipeline with branching routing nodes', async () => {
    const payload = {
      nodes: [
        {
          id: 'input-node',
          type: 'input',
          title: 'Inputs',
          x: 0, y: 0,
          fields: {
            variables: [
              { key: 'targetTopic', value: 'Paris', label: 'Topic' }
            ]
          }
        },
        {
          id: 'prompt-node',
          type: 'prompt',
          title: 'Get Topic',
          x: 0, y: 0,
          fields: {
            template: 'The selected destination city is: {targetTopic}'
          }
        },
        {
          id: 'router-node',
          type: 'router',
          title: 'Branching router',
          x: 0, y: 0,
          fields: {
            conditions: [
              { type: 'contains', value: 'Paris', targetNodeId: 'node-paris-path' }
            ],
            defaultTargetNodeId: 'node-default-path'
          }
        },
        {
          id: 'node-paris-path',
          type: 'output',
          title: 'Paris Path Result',
          x: 0, y: 0,
          fields: { value: 'Welcome to Paris France!' }
        },
        {
          id: 'node-default-path',
          type: 'output',
          title: 'Default Path Result',
          x: 0, y: 0,
          fields: { value: 'Welcome to Default world.' }
        }
      ],
      connections: [
        { id: 'c1', sourceId: 'input-node', targetId: 'prompt-node' },
        { id: 'c2', sourceId: 'prompt-node', targetId: 'router-node' },
        { id: 'c3', sourceId: 'router-node', targetId: 'node-paris-path' },
        { id: 'c4', sourceId: 'router-node', targetId: 'node-default-path' }
      ]
    };

    const res = await request(app)
      .post('/api/execute')
      .set('Authorization', `Bearer ${userToken}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.finalResult).toContain('Paris');
  });

  it('should gracefully respond with status 500 when pipeline specification lacks an input entry step', async () => {
    const corruptedPayload = {
      nodes: [
        {
          id: 'prompt-only',
          type: 'prompt',
          title: 'No Input',
          x: 0, y: 0,
          fields: {}
        }
      ],
      connections: []
    };

    const res = await request(app)
      .post('/api/execute')
      .set('Authorization', `Bearer ${userToken}`)
      .send(corruptedPayload);

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('No Input node found in the workflow!');
  });
});
