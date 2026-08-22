export const APP_CONFIG = {
  name: 'RecoverAI',
  version: '1.0.0',
  defaultCurrency: 'INR',
  maxRecoveryAttempts: 3,
  defaultCooldownHours: 6,
  highValueThresholdInr: 10000,
  maxDiscountInr: 100,
  tokenExpiryHours: 48,
  aiTimeoutBudgetMs: 1500,
  gatewayTimeoutBudgetMs: 1000,
} as const;

export type AppConfig = typeof APP_CONFIG;
