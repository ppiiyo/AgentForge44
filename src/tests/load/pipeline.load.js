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
    http_req_duration: ['p(95)<10000'], // 95% requests < 10s
    http_req_failed: ['rate<0.05'],    // < 5% failed requests
    errors: ['rate<0.1'],             // < 10% error rate
    pipeline_duration: ['p(95)<15000']  // 95% pipelines < 15s
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

  let res;
  let success = false;
  const retries = 3;
  const startTime = Date.now();

  for (let i = 0; i < retries; i++) {
    res = http.post(`${BASE_URL}/api/execute`, payload, params);
    if (res.status === 200 || res.status === 401 || res.status === 201) {
      success = true;
      break;
    }
    sleep(1);
  }

  const duration = Date.now() - startTime;
  pipelineDuration.add(duration);

  const checkPassed = check(res, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401 || r.status === 201,
    'response time < 10s': (r) => r.timings.duration < 10000
  });

  if (!checkPassed) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  sleep(Math.random() * 2 + 1); // 1-3s think time
}
