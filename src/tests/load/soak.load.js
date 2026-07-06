/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 2 },
    { duration: '30s', target: 2 }, // Soak period
    { duration: '10s', target: 0 }
  ]
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  const res = http.post(`${BASE_URL}/api/execute`, JSON.stringify({
    blueprintId: 'simple-1',
    inputs: { text: 'Soak test' }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  check(res, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401
  });

  sleep(1);
}
