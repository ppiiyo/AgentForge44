/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '15s',
  thresholds: {
    http_req_duration: ['p(95)<2000']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  // Simulate failures for circuit breaker
  const res = http.post(`${BASE_URL}/api/execute`, JSON.stringify({
    blueprintId: 'failing-1',
    inputs: {}
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  check(res, {
    'status is 200, 401, or 503': (r) => r.status === 200 || r.status === 401 || r.status === 503
  });

  sleep(0.5);
}
