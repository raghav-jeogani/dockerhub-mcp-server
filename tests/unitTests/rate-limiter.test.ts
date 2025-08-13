import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RateLimiterService } from '../../src/services/rate-limiter.js';
import { RateLimitConfig } from '../../src/types/index.js';

// Mock rate-limiter-flexible
const mockRateLimiter = {
  consume: jest.fn() as jest.MockedFunction<any>,
  get: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>,
  resetKey: jest.fn() as jest.MockedFunction<any>,
  block: jest.fn() as jest.MockedFunction<any>,
  unblock: jest.fn() as jest.MockedFunction<any>,
};

jest.mock('rate-limiter-flexible', () => ({
  RateLimiterMemory: jest.fn().mockImplementation(() => mockRateLimiter),
}));

// Mock logger
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logRateLimit: jest.fn(),
  logRateLimitExceeded: jest.fn(),
  logRateLimitReset: jest.fn(),
  logError: jest.fn(),
}));

describe('RateLimiterService', () => {
  let rateLimiterService: RateLimiterService;
  let config: RateLimitConfig;

  beforeEach(() => {
    config = {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      burstSize: 10,
    };

    rateLimiterService = new RateLimiterService(config);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      expect(rateLimiterService).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const customConfig: RateLimitConfig = {
        requestsPerMinute: 120,
        requestsPerHour: 2000,
        burstSize: 20,
      };

      new RateLimiterService(customConfig);
    });
  });

  describe('getRateLimiter', () => {
    it('should create new rate limiter for registry', () => {
      const rateLimiter = (rateLimiterService as any).getRateLimiter('test-registry');
      expect(rateLimiter).toBeDefined();
    });

    it('should return existing rate limiter for registry', () => {
      // First call creates the rate limiter
      const rateLimiter1 = (rateLimiterService as any).getRateLimiter('test-registry');
      
      // Second call should return the same instance
      const rateLimiter2 = (rateLimiterService as any).getRateLimiter('test-registry');
      
      expect(rateLimiter1).toBe(rateLimiter2);
    });

    it('should create separate rate limiters for different registries', () => {
      const rateLimiter1 = (rateLimiterService as any).getRateLimiter('registry1');
      const rateLimiter2 = (rateLimiterService as any).getRateLimiter('registry2');
      
      expect(rateLimiter1).toBeDefined();
      expect(rateLimiter2).toBeDefined();
    });
  });

  describe('checkRateLimit', () => {
    it('should allow request when under limit', async () => {
      mockRateLimiter.consume.mockResolvedValue({
        remainingPoints: 59,
        msBeforeNext: 1000,
      });

      mockRateLimiter.get.mockResolvedValue({
        remainingPoints: 59,
        msBeforeNext: 1000,
      });

      const result = await rateLimiterService.checkRateLimit('test-registry', 'user-key');
      
      expect(result).toBe(true);
      expect(mockRateLimiter.consume).toHaveBeenCalledWith('user-key');
      expect(mockRateLimiter.get).toHaveBeenCalledWith('user-key');
    });

    it('should block request when limit exceeded', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).remainingPoints = 0;
      (rateLimitError as any).msBeforeNext = 5000;

      mockRateLimiter.consume.mockRejectedValue(rateLimitError);

      const result = await rateLimiterService.checkRateLimit('test-registry', 'user-key');
      
      expect(result).toBe(false);
    });

    it('should handle rate limiter errors', async () => {
      mockRateLimiter.consume.mockRejectedValue(new Error('Rate limiter error'));

      await expect(rateLimiterService.checkRateLimit('test-registry', 'user-key'))
        .rejects.toThrow('Rate limiter error');
    });

    it('should use default remaining points when get fails', async () => {
      mockRateLimiter.consume.mockResolvedValue({
        remainingPoints: 59,
        msBeforeNext: 1000,
      });

      mockRateLimiter.get.mockResolvedValue(null);

      const result = await rateLimiterService.checkRateLimit('test-registry', 'user-key');
      
      expect(result).toBe(true);
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit information', async () => {
      mockRateLimiter.get.mockResolvedValue({
        remainingPoints: 45,
        msBeforeNext: 2000,
      });

      const result = await rateLimiterService.getRateLimitInfo('test-registry', 'user-key');
      
      expect(result).toEqual({
        remainingPoints: 45,
        msBeforeNext: 2000,
        totalPoints: 60,
      });
    });

    it('should return default info when no rate limit data', async () => {
      mockRateLimiter.get.mockResolvedValue(null);

      const result = await rateLimiterService.getRateLimitInfo('test-registry', 'user-key');
      
      expect(result).toEqual({
        remainingPoints: 60,
        msBeforeNext: 0,
        totalPoints: 60,
      });
    });

    it('should handle errors gracefully', async () => {
      mockRateLimiter.get.mockRejectedValue(new Error('Rate limiter error'));

      const result = await rateLimiterService.getRateLimitInfo('test-registry', 'user-key');
      
      expect(result).toBeNull();
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for registry', async () => {
      mockRateLimiter.delete.mockResolvedValue(undefined);

      await rateLimiterService.resetRateLimit('test-registry', 'user-key');
      
      expect(mockRateLimiter.delete).toHaveBeenCalledWith('user-key');
    });

    it('should handle reset errors gracefully', async () => {
      mockRateLimiter.delete.mockRejectedValue(new Error('Reset error'));

      // Should not throw error, just log it
      await rateLimiterService.resetRateLimit('test-registry', 'user-key');
      
      expect(mockRateLimiter.delete).toHaveBeenCalledWith('user-key');
    });
  });

  describe('getRateLimiters', () => {
    it('should return all rate limiters', () => {
      // Create rate limiters for multiple registries
      (rateLimiterService as any).getRateLimiter('registry1');
      (rateLimiterService as any).getRateLimiter('registry2');

      const rateLimiters = rateLimiterService.getRateLimiters();
      
      expect(rateLimiters).toBeInstanceOf(Map);
      expect(rateLimiters.size).toBe(2);
      expect(rateLimiters.has('registry1')).toBe(true);
      expect(rateLimiters.has('registry2')).toBe(true);
    });

    it('should return empty map when no rate limiters', () => {
      const rateLimiters = rateLimiterService.getRateLimiters();
      
      expect(rateLimiters).toBeInstanceOf(Map);
      expect(rateLimiters.size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return rate limiter statistics', () => {
      // Create rate limiters for multiple registries
      (rateLimiterService as any).getRateLimiter('registry1');
      (rateLimiterService as any).getRateLimiter('registry2');

      const stats = rateLimiterService.getStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      expect(stats.registry1).toBeDefined();
      expect(stats.registry2).toBeDefined();
    });
  });

  describe('waitForRateLimit', () => {
    it('should wait when rate limit is exceeded', async () => {
      mockRateLimiter.get.mockResolvedValue({
        remainingPoints: 0,
        msBeforeNext: 1000,
      });

      const startTime = Date.now();
      await rateLimiterService.waitForRateLimit('test-registry', 'user-key');
      const endTime = Date.now();

      // Should have waited at least 1000ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });

    it('should not wait when rate limit is not exceeded', async () => {
      mockRateLimiter.get.mockResolvedValue({
        remainingPoints: 10,
        msBeforeNext: 0,
      });

      const startTime = Date.now();
      await rateLimiterService.waitForRateLimit('test-registry', 'user-key');
      const endTime = Date.now();

      // Should not have waited significantly
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('shouldUseBackoff', () => {
    it('should return false for backoff (simplified implementation)', () => {
      const result = rateLimiterService.shouldUseBackoff('test-registry', 'user-key');
      expect(result).toBe(false);
    });
  });

  describe('getBackoffDelay', () => {
    it('should calculate exponential backoff delay', () => {
      const delay1 = rateLimiterService.getBackoffDelay(1);
      const delay2 = rateLimiterService.getBackoffDelay(2);
      const delay3 = rateLimiterService.getBackoffDelay(3);

      expect(delay1).toBeGreaterThan(0);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
      expect(delay1).toBeLessThanOrEqual(30000);
      expect(delay2).toBeLessThanOrEqual(30000);
      expect(delay3).toBeLessThanOrEqual(30000);
    });

    it('should cap delay at 30 seconds', () => {
      const delay = rateLimiterService.getBackoffDelay(10);
      expect(delay).toBeLessThanOrEqual(31000); // 30s + jitter
    });
  });

  describe('Rate Limiting Scenarios', () => {
    it('should handle burst requests', async () => {
      const requests = [];
      
      // Simulate burst of requests
      for (let i = 0; i < 10; i++) {
        mockRateLimiter.consume.mockResolvedValue({
          remainingPoints: 50 - i,
          msBeforeNext: 1000,
        });

        mockRateLimiter.get.mockResolvedValue({
          remainingPoints: 50 - i,
          msBeforeNext: 1000,
        });

        requests.push(rateLimiterService.checkRateLimit('test-registry', 'user-key'));
      }

      const results = await Promise.all(requests);
      
      expect(results.every(result => result === true)).toBe(true);
      expect(mockRateLimiter.consume).toHaveBeenCalledTimes(10);
    });

    it('should handle rate limit exceeded scenario', async () => {
      // First request succeeds
      mockRateLimiter.consume.mockResolvedValueOnce({
        remainingPoints: 1,
        msBeforeNext: 1000,
      });

      mockRateLimiter.get.mockResolvedValueOnce({
        remainingPoints: 1,
        msBeforeNext: 1000,
      });

      // Second request fails
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).remainingPoints = 0;
      (rateLimitError as any).msBeforeNext = 5000;

      mockRateLimiter.consume.mockRejectedValueOnce(rateLimitError);

      const result1 = await rateLimiterService.checkRateLimit('test-registry', 'user-key');
      const result2 = await rateLimiterService.checkRateLimit('test-registry', 'user-key');
      
      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should handle concurrent requests to different registries', async () => {
      const registry1Requests = [];
      const registry2Requests = [];

      // Simulate concurrent requests to different registries
      for (let i = 0; i < 5; i++) {
        mockRateLimiter.consume.mockResolvedValue({
          remainingPoints: 55 - i,
          msBeforeNext: 1000,
        });

        mockRateLimiter.get.mockResolvedValue({
          remainingPoints: 55 - i,
          msBeforeNext: 1000,
        });

        registry1Requests.push(rateLimiterService.checkRateLimit('registry1', 'user1'));
        registry2Requests.push(rateLimiterService.checkRateLimit('registry2', 'user2'));
      }

      const [registry1Results, registry2Results] = await Promise.all([
        Promise.all(registry1Requests),
        Promise.all(registry2Requests),
      ]);

      expect(registry1Results.every(result => result === true)).toBe(true);
      expect(registry2Results.every(result => result === true)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiter creation errors', () => {
      const { RateLimiterMemory } = require('rate-limiter-flexible');
      (RateLimiterMemory as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Rate limiter creation failed');
      });

      expect(() => (rateLimiterService as any).getRateLimiter('test-registry'))
        .toThrow('Rate limiter creation failed');
    });

    it('should handle consume errors with non-rate-limit exceptions', async () => {
      mockRateLimiter.consume.mockRejectedValue(new Error('Network error'));

      await expect(rateLimiterService.checkRateLimit('test-registry', 'user-key'))
        .rejects.toThrow('Network error');
    });

    it('should handle get errors in getRateLimitInfo', async () => {
      mockRateLimiter.get.mockRejectedValue(new Error('Get error'));

      const result = await rateLimiterService.getRateLimitInfo('test-registry', 'user-key');
      expect(result).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency rate limit checks', async () => {
      const iterations = 100;
      const promises = [];

      for (let i = 0; i < iterations; i++) {
        mockRateLimiter.consume.mockResolvedValue({
          remainingPoints: 59,
          msBeforeNext: 1000,
        });

        mockRateLimiter.get.mockResolvedValue({
          remainingPoints: 59,
          msBeforeNext: 1000,
        });

        promises.push(rateLimiterService.checkRateLimit('test-registry', `user-${i}`));
      }

      const results = await Promise.all(promises);
      
      expect(results.every(result => result === true)).toBe(true);
      expect(mockRateLimiter.consume).toHaveBeenCalledTimes(iterations);
    });

    it('should reuse rate limiters efficiently', () => {
      const startTime = Date.now();
      
      // Create many rate limiters
      for (let i = 0; i < 100; i++) {
        (rateLimiterService as any).getRateLimiter(`registry-${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should be fast (less than 100ms)
      expect(duration).toBeLessThan(100);
    });
  });
}); 