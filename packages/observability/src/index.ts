import pino from 'pino';

// Sensitive fields to redact from logs automatically
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers["x-razorpay-signature"]',
  'password',
  '*.password',
  'secret',
  '*.secret',
  'token',
  '*.token',
  'mfaSecret',
  '*.mfaSecret',
  'cardNumber',
  '*.cardNumber',
  'cvv',
  '*.cvv',
  'vpa',
  '*.vpa',
  'rawCustomerNotes',
  '*.rawCustomerNotes',
];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: REDACTED_PATHS,
    censor: '[REDACTED]',
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export interface LogContext {
  reqId?: string;
  traceId?: string;
  spanId?: string;
  organizationId?: string;
  event?: string;
  paymentId?: string;
  recoveryCaseId?: string;
  [key: string]: any;
}

export function createChildLogger(context: LogContext) {
  return logger.child(context);
}
