/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const pipelineDuration = new Trend('pipeline_duration');

export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Ramp up
    { duration: '20s', target: 10 },  // Peak load
    { duration: '10s', target: 0 }    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% requests < 3s
    http_req_failed: ['rate<0.01'],    // < 1% failed requests
    errors: ['rate<0.05'],             // < 5% error rate
    pipeline_duration: ['p(95)<5000']  // 95% pipelines < 5s
  }
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test_token';

export default function() {
  const payload = JSON.stringify({
    blueprintId: 'simple-1',
    inputs: {
      text: 'Load test input data ' + Math.random()
    }
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  };

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/execute`, payload, params);
  const duration = Date.now() - startTime;

  pipelineDuration.add(duration);

  check(res, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'response time < 5s': (r) => r.timings.duration < 5000
  }) || errorRate.add(1);

  sleep(Math.random() * 2 + 1); // 1-3s think time
}
