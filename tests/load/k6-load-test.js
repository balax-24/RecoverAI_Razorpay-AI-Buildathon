import http from 'k6/http';
import { check, sleep } from 'k6';
import crypto from 'k6/crypto';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 RPS
    { duration: '1m', target: 200 },  // Spike to 200 RPS
    { duration: '30s', target: 500 }, // Peak at 500 RPS
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<25', 'p(99)<50'], // Sub-25ms SLA target
    http_req_failed: ['rate<0.01'],             // Error rate < 1%
  },
};

const WEBHOOK_SECRET = 'test_webhook_secret';
const API_URL = __ENV.API_URL || 'http://localhost:4000/webhooks/razorpay';

export default function () {
  const paymentId = `pay_k6_${Math.random().toString(36).substring(2, 10)}`;
  const payload = JSON.stringify({
    entity: 'event',
    account_id: 'acc_test_123',
    event: 'payment.failed',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: paymentId,
          entity: 'payment',
          amount: 250000,
          currency: 'INR',
          status: 'failed',
          order_id: `order_k6_${Math.random().toString(36).substring(2, 10)}`,
          email: 'loadtest@example.com',
          contact: '+919876543210',
          error_code: 'BAD_REQUEST_GATEWAY_TIMEOUT',
          error_description: 'Payment timed out on bank switch',
          error_source: 'gateway',
          error_step: 'payment_authorization',
          error_reason: 'gateway_timeout',
          created_at: Math.floor(Date.now() / 1000),
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  });

  const signature = crypto.hmac('sha256', WEBHOOK_SECRET, payload, 'hex');

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': signature,
      'X-Razorpay-Event-Id': `evt_${Math.random().toString(36).substring(2, 10)}`,
    },
  };

  const res = http.post(API_URL, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'latency is under 25ms': (r) => r.timings.duration < 25,
  });

  sleep(0.01);
}
