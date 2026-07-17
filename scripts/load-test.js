import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Load Testing Options for Enterprise SLA Verification
export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp-up to 100 concurrent users over 1 minute
    { duration: '8m', target: 100 },  // Stay at peak 100 concurrent users for 8 minutes (Sustained Load)
    { duration: '1m', target: 0 },    // Ramp-down to 0 users over 1 minute
  ],
  thresholds: {
    // 1. P95 latency must be strictly under 2s (2000ms)
    http_req_duration: ['p(95)<2000'],
    // 2. Error rate must be less than 1% (0.01)
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const host = __ENV.TARGET_URL || __ENV.TARGET_HOST || 'http://localhost:3000';
  
  // Hit metrics endpoint representing highly concurrent analytic workloads
  const url = `${host}/api/metrics/summary`;
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-bearer-token',
    },
  };

  const res = http.get(url, params);

  // SLA Validations
  check(res, {
    'http response status is 200': (r) => r.status === 200,
    'transaction content validated': (r) => r.json() !== null && r.json().summary !== undefined,
  });

  // Balanced interval block to match targeted 1000 requests per minute / throughput bounds
  sleep(1);
}
