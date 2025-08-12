import winston from 'winston';
import { config } from '../config/index.js';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'dockerhub-mcp-server' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      stderrLevels: ['error', 'warn', 'info', 'debug'], // Write all levels to stderr
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({ filename: 'logs/exceptions.log' })
);

// Handle unhandled promise rejections
logger.rejections.handle(
  new winston.transports.File({ filename: 'logs/rejections.log' })
);

// Helper functions for structured logging
export const logApiRequest = (method: string, url: string, params?: any) => {
  logger.info('API Request', {
    method,
    url,
    params,
  });
};

export const logApiResponse = (method: string, url: string, statusCode: number, duration: number) => {
  logger.info('API Response', {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
  });
};

export const logCacheHit = (key: string) => {
  logger.debug('Cache hit', { key });
};

export const logCacheMiss = (key: string) => {
  logger.debug('Cache miss', { key });
};

export const logRateLimit = (registry: string, remaining: number) => {
  logger.debug('Rate limit info', {
    registry,
    remaining,
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    context,
  });
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