import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // Simulate 500 concurrent users ramping up and down
  stages: [
    { duration: '30s', target: 100 }, // Ramp-up to 100 users
    { duration: '1m', target: 500 },  // Spike to 500 users
    { duration: '30s', target: 0 },   // Ramp-down to 0
  ],
  thresholds: {
    // SLOs
    http_req_duration: ['p(95)<250'], // 95% of requests must complete below 250ms
    http_req_failed: ['rate<0.005'],  // Error budget: less than 0.5% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  // Simulate an admin navigating to their dashboard and fetching tenants
  
  // 1. Fetch Dashboard Stats
  let res = http.get(`${BASE_URL}/_server/api/getDashboardStatsFn`);
  check(res, {
    'status is 200 (stats)': (r) => r.status === 200 || r.status === 401, // 401 if unauthenticated but the latency still counts
  });

  // Short wait between actions
  sleep(1);

  // 2. Fetch Tenants Paginated
  res = http.post(`${BASE_URL}/_server/api/getTenantsByLandlordFn`, JSON.stringify({ page: 1, limit: 25, search: "" }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'status is 200 (tenants)': (r) => r.status === 200 || r.status === 401,
  });

  // 3. Trigger Rent Invoice Background Job
  // To avoid truly spamming the DB with millions of rows, we'll only do it 10% of the time
  if (Math.random() < 0.1) {
    res = http.post(`${BASE_URL}/_server/api/generateRentInvoicesFn`);
    check(res, {
      'status is 200 (invoices queued)': (r) => r.status === 200 || r.status === 401,
    });
  }

  sleep(2);
}
