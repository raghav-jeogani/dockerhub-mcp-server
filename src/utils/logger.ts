import winston from 'winston';

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'dockerhub-mcp-server' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Logging utility functions
export const logApiRequest = (method: string, url: string, params?: any) => {
  logger.debug('API Request', { method, url, params });
};

export const logApiResponse = (method: string, url: string, status: number, duration: number) => {
  logger.debug('API Response', { method, url, status, duration });
};

export const logCacheHit = (key: string) => {
  logger.debug('Cache Hit', { key });
};

export const logCacheMiss = (key: string) => {
  logger.debug('Cache Miss', { key });
};

export const logRateLimit = (registry: string, remaining: number) => {
  logger.debug('Rate Limit', { registry, remaining });
};

export const logError = (error: Error, context?: string | Record<string, any>) => {
  const contextStr = typeof context === 'string' ? context : JSON.stringify(context);
  logger.error('Error occurred', { error: error.message, stack: error.stack, context: contextStr });
};

// Performance logging
export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    ...metadata,
  });
};

// Security logging
export const logSecurityEvent = (event: string, details: any) => {
  logger.warn('Security event', {
    event,
    details,
  });
}; 