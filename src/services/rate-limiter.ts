import { RateLimiterMemory } from 'rate-limiter-flexible';
import { RateLimitConfig, RegistryConfig } from '../types/index.js';
import { logger, logRateLimit } from '../utils/logger.js';

export class RateLimiterService {
  private rateLimiters: Map<string, RateLimiterMemory>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.rateLimiters = new Map();

    logger.info('Rate limiter service initialized', {
      requestsPerMinute: config.requestsPerMinute,
      requestsPerHour: config.requestsPerHour,
      burstSize: config.burstSize,
    });
  }

  /**
   * Get or create rate limiter for a registry
   */
  private getRateLimiter(registryName: string): RateLimiterMemory {
    if (!this.rateLimiters.has(registryName)) {
      const rateLimiter = new RateLimiterMemory({
        points: this.config.requestsPerMinute,
        duration: 60, // 1 minute
        blockDuration: 60, // Block for 1 minute if limit exceeded
      });

      this.rateLimiters.set(registryName, rateLimiter);
      logger.debug('Created rate limiter for registry', { registryName });
    }

    return this.rateLimiters.get(registryName)!;
  }

  /**
   * Check if request is allowed
   */
  async checkRateLimit(registryName: string, key: string): Promise<boolean> {
    try {
      const rateLimiter = this.getRateLimiter(registryName);
      await rateLimiter.consume(key);
      
      // Get remaining points
      const res = await rateLimiter.get(key);
      const remaining = res ? res.remainingPoints : this.config.requestsPerMinute;
      
      logRateLimit(registryName, remaining);
      return true;
    } catch (error: any) {
      if (error.remainingPoints === 0) {
        logger.warn('Rate limit exceeded', {
          registryName,
          key,
          msBeforeNext: error.msBeforeNext,
        });
        return false;
      }
      throw error;
    }
  }

  /**
   * Get rate limit information for a registry
   */
  async getRateLimitInfo(registryName: string, key: string) {
    try {
      const rateLimiter = this.getRateLimiter(registryName);
      const res = await rateLimiter.get(key);
      
      if (res) {
        return {
          remainingPoints: res.remainingPoints,
          msBeforeNext: res.msBeforeNext,
          totalPoints: this.config.requestsPerMinute,
        };
      }
      
      return {
        remainingPoints: this.config.requestsPerMinute,
        msBeforeNext: 0,
        totalPoints: this.config.requestsPerMinute,
      };
    } catch (error) {
      logger.error('Error getting rate limit info', { registryName, key, error });
      return null;
    }
  }

  /**
   * Reset rate limit for a registry
   */
  async resetRateLimit(registryName: string, key: string): Promise<void> {
    try {
      const rateLimiter = this.getRateLimiter(registryName);
      await rateLimiter.delete(key);
      logger.debug('Rate limit reset', { registryName, key });
    } catch (error) {
      logger.error('Error resetting rate limit', { registryName, key, error });
    }
  }

  /**
   * Get all rate limiters
   */
  getRateLimiters(): Map<string, RateLimiterMemory> {
    return this.rateLimiters;
  }

  /**
   * Get rate limit statistics
   */
  getStats() {
    const stats: Record<string, any> = {};
    
    for (const [registryName, rateLimiter] of this.rateLimiters) {
      stats[registryName] = {
        totalLimiters: this.rateLimiters.size,
        config: this.config,
      };
    }
    
    return stats;
  }

  /**
   * Wait for rate limit to reset
   */
  async waitForRateLimit(registryName: string, key: string): Promise<void> {
    const info = await this.getRateLimitInfo(registryName, key);
    
    if (info && info.remainingPoints === 0 && info.msBeforeNext > 0) {
      logger.info('Waiting for rate limit to reset', {
        registryName,
        key,
        waitTime: `${info.msBeforeNext}ms`,
      });
      
      await new Promise(resolve => setTimeout(resolve, info.msBeforeNext));
    }
  }

  /**
   * Check if we should use exponential backoff
   */
  shouldUseBackoff(registryName: string, key: string): boolean {
    // Implement exponential backoff logic based on recent failures
    // This is a simplified version - in production you might want to track
    // failure patterns and adjust accordingly
    return false;
  }

  /**
   * Get backoff delay
   */
  getBackoffDelay(attempt: number): number {
    // Exponential backoff: 2^attempt * 1000ms, max 30 seconds
    const delay = Math.min(Math.pow(2, attempt) * 1000, 30000);
    return delay + Math.random() * 1000; // Add jitter
  }
} 