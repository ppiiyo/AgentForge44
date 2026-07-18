/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics to monitor pipeline latency and success rate
const pipelineDurationTrend = new Trend('pipeline_duration_ms');
const successRate = new Rate('pipeline_success_rate');

export const options = {
  stages: [
    { duration: '30s', target: 200 },  // Ramp up to 200 VUs
    { duration: '1m', target: 1000 },  // Ramp up to 1000 VUs representing concurrent executions
    { duration: '30s', target: 1000 }, // Stay at 1000 VUs for peak stress-testing
    { duration: '30s', target: 0 },     // Ramp down to 0 VUs
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],       // Under 5% failures under high stress
    http_req_duration: ['p(95)<3000'],    // 95% of request responses under 3 seconds
    pipeline_success_rate: ['rate>0.95'], // Over 95% pipeline execution rate success
  },
};

export default function () {
  const baseUrl = __ENV.TARGET_URL || __ENV.BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl}/api/run-pipeline`;

  // Standard mock self-correcting agent pipeline
  const payload = JSON.stringify({
    graphId: 'load-test-canvas',
    graphName: 'K6 Stress Test Graph',
    nodes: [
      {
        id: 'node-input-1',
        type: 'input',
        title: 'Input Spec',
        x: 0,
        y: 0,
        description: 'Input Spec description',
        fields: {
          variables: [
            { key: 'language', value: 'TypeScript', label: 'Target Language' },
            { key: 'task', value: 'Write an optimized useDebounce Hook', label: 'Task' }
          ]
        }
      },
      {
        id: 'node-prompt-1',
        type: 'prompt',
        title: 'Coder Prompt',
        x: 200,
        y: 0,
        description: 'Prompt compilation',
        fields: {
          template: 'Task: Write a hook in {language} for {task}.'
        }
      },
      {
        id: 'node-gemini-1',
        type: 'gemini',
        title: 'Gemini Node',
        x: 400,
        y: 0,
        description: 'Primary AI model processing',
        fields: {
          model: 'gemini-3.5-flash',
          temperature: 0.1,
          useSearchGrounding: false,
          systemInstruction: 'You are an elite developer assistant.'
        }
      },
      {
        id: 'node-output-1',
        type: 'output',
        title: 'Final Code Output',
        x: 600,
        y: 0,
        description: 'Consolidated results output',
        fields: {
          format: 'markdown',
          value: ''
        }
      }
    ],
    connections: [
      { id: 'conn-1', sourceId: 'node-input-1', targetId: 'node-prompt-1' },
      { id: 'conn-2', sourceId: 'node-prompt-1', targetId: 'node-gemini-1' },
      { id: 'conn-3', sourceId: 'node-gemini-1', targetId: 'node-output-1' }
    ]
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-editor-token', // Pre-configured token for bypass if needed
    },
    timeout: '10s', // 10 seconds timeout for high-concurrency request execution
  };

  const res = http.post(url, payload, params);

  // Validate request execution status
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has execution logs': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && Array.isArray(body.logs);
      } catch {
        return false;
      }
    },
    'has final result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && typeof body.finalResult === 'string';
      } catch {
        return false;
      }
    }
  });

  successRate.add(success);

  if (success) {
    try {
      const body = JSON.parse(res.body);
      if (body.totalDuration) {
        pipelineDurationTrend.add(body.totalDuration);
      }
    } catch {
      // JSON Parsing failed
    }
  }

  // Pacing pause between continuous user loops
  sleep(1);
}
