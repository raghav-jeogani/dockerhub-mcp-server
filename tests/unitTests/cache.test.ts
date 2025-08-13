import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CacheService } from '../../src/services/cache.js';
import { CacheConfig } from '../../src/types/index.js';

// Mock node-cache
const mockNodeCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  has: jest.fn(),
  getStats: jest.fn(),
  flushAll: jest.fn(),
  keys: jest.fn(),
  on: jest.fn(),
  ttl: jest.fn(),
  getTtl: jest.fn(),
  close: jest.fn(),
};

jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => mockNodeCache);
});

// Mock logger
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logCacheHit: jest.fn(),
  logCacheMiss: jest.fn(),
  logCacheSet: jest.fn(),
  logCacheDelete: jest.fn(),
  logCacheFlush: jest.fn(),
  logError: jest.fn(),
}));

describe('CacheService', () => {
  let cacheService: CacheService;
  let config: CacheConfig;

  beforeEach(() => {
    config = {
      ttl: 300,
      checkPeriod: 60,
      maxKeys: 100,
    };

    // Clear all mocks before each test
    jest.clearAllMocks();
    
    cacheService = new CacheService(config);
  });

  afterEach(() => {
    cacheService.flush();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      expect(cacheService).toBeDefined();
      expect(mockNodeCache.on).toHaveBeenCalledWith('expired', expect.any(Function));
      expect(mockNodeCache.on).toHaveBeenCalledWith('flush', expect.any(Function));
    });

    it('should initialize with custom config', () => {
      const customConfig: CacheConfig = {
        ttl: 600,
        checkPeriod: 120,
        maxKeys: 200,
      };

      new CacheService(customConfig);
      expect(mockNodeCache.on).toHaveBeenCalled();
    });

    it('should handle cache events', () => {
      // Simulate expired event
      const expiredCall = mockNodeCache.on.mock.calls.find(call => call[0] === 'expired');
      if (expiredCall) {
        const expiredCallback = expiredCall[1] as (key: string, value: any) => void;
        expiredCallback('test-key', 'test-value');
      }

      // Simulate flush event
      const flushCall = mockNodeCache.on.mock.calls.find(call => call[0] === 'flush');
      if (flushCall) {
        const flushCallback = flushCall[1] as () => void;
        flushCallback();
      }
    });
  });

  describe('get', () => {
    it('should get value from cache when exists', () => {
      const testValue = { data: 'test' };
      mockNodeCache.get.mockReturnValue(testValue);

      const result = cacheService.get('test-key');
      expect(result).toEqual(testValue);
      expect(mockNodeCache.get).toHaveBeenCalledWith('test-key');
    });

    it('should return undefined when key does not exist', () => {
      mockNodeCache.get.mockReturnValue(undefined);

      const result = cacheService.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should handle different data types', () => {
      const stringValue = 'test string';
      const numberValue = 123;
      const objectValue = { key: 'value' };
      const arrayValue = [1, 2, 3];

      mockNodeCache.get
        .mockReturnValueOnce(stringValue)
        .mockReturnValueOnce(numberValue)
        .mockReturnValueOnce(objectValue)
        .mockReturnValueOnce(arrayValue);

      expect(cacheService.get<string>('string-key')).toBe(stringValue);
      expect(cacheService.get<number>('number-key')).toBe(numberValue);
      expect(cacheService.get<object>('object-key')).toEqual(objectValue);
      expect(cacheService.get<number[]>('array-key')).toEqual(arrayValue);
    });
  });

  describe('set', () => {
    it('should set value in cache with default TTL', () => {
      const testValue = { data: 'test' };
      mockNodeCache.set.mockReturnValue(true);

      const result = cacheService.set('test-key', testValue);
      expect(result).toBe(true);
      expect(mockNodeCache.set).toHaveBeenCalledWith('test-key', testValue, config.ttl);
    });

    it('should set value in cache with custom TTL', () => {
      const testValue = { data: 'test' };
      const customTtl = 600;
      mockNodeCache.set.mockReturnValue(true);

      const result = cacheService.set('test-key', testValue, customTtl);
      expect(result).toBe(true);
      expect(mockNodeCache.set).toHaveBeenCalledWith('test-key', testValue, customTtl);
    });

    it('should handle set failure', () => {
      const testValue = { data: 'test' };
      mockNodeCache.set.mockReturnValue(false);

      const result = cacheService.set('test-key', testValue);
      expect(result).toBe(false);
    });

    it('should handle different data types', () => {
      const stringValue = 'test string';
      const numberValue = 123;
      const objectValue = { key: 'value' };
      const arrayValue = [1, 2, 3];

      mockNodeCache.set.mockReturnValue(true);

      expect(cacheService.set('string-key', stringValue)).toBe(true);
      expect(cacheService.set('number-key', numberValue)).toBe(true);
      expect(cacheService.set('object-key', objectValue)).toBe(true);
      expect(cacheService.set('array-key', arrayValue)).toBe(true);
    });
  });

  describe('del', () => {
    it('should delete existing key', () => {
      mockNodeCache.del.mockReturnValue(1);

      const result = cacheService.del('test-key');
      expect(result).toBe(1);
      expect(mockNodeCache.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle deleting non-existent key', () => {
      mockNodeCache.del.mockReturnValue(0);

      const result = cacheService.del('non-existent-key');
      expect(result).toBe(0);
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      mockNodeCache.has.mockReturnValue(true);

      const result = cacheService.has('test-key');
      expect(result).toBe(true);
      expect(mockNodeCache.has).toHaveBeenCalledWith('test-key');
    });

    it('should return false for non-existent key', () => {
      mockNodeCache.has.mockReturnValue(false);

      const result = cacheService.has('non-existent-key');
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const mockStats = {
        hits: 100,
        misses: 50,
        keys: 25,
        ksize: 1000,
        vsize: 5000,
      };

      mockNodeCache.getStats.mockReturnValue(mockStats);

      const result = cacheService.getStats();
      expect(result).toEqual({
        hits: 100,
        misses: 50,
        keys: 25,
        ksize: 1000,
        vsize: 5000,
        hitRate: 100 / 150, // hits / (hits + misses)
      });
    });

    it('should handle zero hits and misses', () => {
      const mockStats = {
        hits: 0,
        misses: 0,
        keys: 0,
        ksize: 0,
        vsize: 0,
      };

      mockNodeCache.getStats.mockReturnValue(mockStats);

      const result = cacheService.getStats();
      expect(result.hitRate).toBe(0);
    });

    it('should handle zero hits with some misses', () => {
      const mockStats = {
        hits: 0,
        misses: 10,
        keys: 0,
        ksize: 0,
        vsize: 0,
      };

      mockNodeCache.getStats.mockReturnValue(mockStats);

      const result = cacheService.getStats();
      expect(result.hitRate).toBe(0);
    });

    it('should handle some hits with zero misses', () => {
      const mockStats = {
        hits: 10,
        misses: 0,
        keys: 5,
        ksize: 100,
        vsize: 500,
      };

      mockNodeCache.getStats.mockReturnValue(mockStats);

      const result = cacheService.getStats();
      expect(result.hitRate).toBe(1);
    });
  });

  describe('flush', () => {
    it('should flush all cache', () => {
      cacheService.flush();
      expect(mockNodeCache.flushAll).toHaveBeenCalled();
    });
  });

  describe('keys', () => {
    it('should return all cache keys', () => {
      const mockKeys = ['key1', 'key2', 'key3'];
      mockNodeCache.keys.mockReturnValue(mockKeys);

      const result = cacheService.keys();
      expect(result).toEqual(mockKeys);
      expect(mockNodeCache.keys).toHaveBeenCalled();
    });

    it('should return empty array when no keys', () => {
      mockNodeCache.keys.mockReturnValue([]);

      const result = cacheService.keys();
      expect(result).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return cache size', () => {
      const mockKeys = ['key1', 'key2', 'key3'];
      mockNodeCache.keys.mockReturnValue(mockKeys);

      const result = cacheService.size();
      expect(result).toBe(3);
      expect(mockNodeCache.keys).toHaveBeenCalled();
    });

    it('should return zero for empty cache', () => {
      mockNodeCache.keys.mockReturnValue([]);

      const result = cacheService.size();
      expect(result).toBe(0);
    });
  });

  describe('setWithOperationTTL', () => {
    it('should set cache with search TTL', () => {
      const testValue = { data: 'test' };
      mockNodeCache.set.mockReturnValue(true);

      const result = cacheService.setWithOperationTTL('search-key', testValue, 'search');
      expect(result).toBe(true);
      expect(mockNodeCache.set).toHaveBeenCalledWith('search-key', testValue, 300);
    });

    it('should set cache with image details TTL', () => {
      const testValue = { data: 'test' };
      mockNodeCache.set.mockReturnValue(true);

      const result = cacheService.setWithOperationTTL('image-key', testValue, 'image_details');
      expect(result).toBe(true);
      expect(mockNodeCache.set).toHaveBeenCalledWith('image-key', testValue, 600);
    });

    it('should set cache with tags TTL', () => {
      const testValue = { data: 'test' };
      mockNodeCache.set.mockReturnValue(true);

      const result = cacheService.setWithOperationTTL('tags-key', testValue, 'tags');
      expect(result).toBe(true);
      expect(mockNodeCache.set).toHaveBeenCalledWith('tags-key', testValue, 900);
    });

    it('should set cache with manifest TTL', () => {
      const testValue = { data: 'test' };
      mockNodeCache.set.mockReturnValue(true);

      const result = cacheService.setWithOperationTTL('manifest-key', testValue, 'manifest');
      expect(result).toBe(true);
      expect(mockNodeCache.set).toHaveBeenCalledWith('manifest-key', testValue, 1800);
    });

    it('should set cache with vulnerabilities TTL', () => {
      const testValue = { data: 'test' };
      mockNodeCache.set.mockReturnValue(true);

      const result = cacheService.setWithOperationTTL('vuln-key', testValue, 'vulnerabilities');
      expect(result).toBe(true);
      expect(mockNodeCache.set).toHaveBeenCalledWith('vuln-key', testValue, 3600);
    });

    it('should set cache with stats TTL', () => {
      const testValue = { data: 'test' };
      mockNodeCache.set.mockReturnValue(true);

      const result = cacheService.setWithOperationTTL('stats-key', testValue, 'stats');
      expect(result).toBe(true);
      expect(mockNodeCache.set).toHaveBeenCalledWith('stats-key', testValue, 7200);
    });

    it('should set cache with default TTL for unknown operation', () => {
      const testValue = { data: 'test' };
      mockNodeCache.set.mockReturnValue(true);

      const result = cacheService.setWithOperationTTL('unknown-key', testValue, 'unknown');
      expect(result).toBe(true);
      expect(mockNodeCache.set).toHaveBeenCalledWith('unknown-key', testValue, config.ttl);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate search key correctly', () => {
      const key = CacheService.generateSearchKey('nginx', 5, 1, { is_official: true });
      expect(key).toContain('dockerhub:search');
      expect(key).toContain('nginx');
      expect(key).toContain('5');
      expect(key).toContain('1');
      expect(key).toContain('is_official');
    });

    it('should generate image details key correctly', () => {
      const key = CacheService.generateImageDetailsKey('library/nginx', 'latest');
      expect(key).toContain('dockerhub:image_details');
      expect(key).toContain('library/nginx');
      expect(key).toContain('latest');
    });

    it('should generate tags key correctly', () => {
      const key = CacheService.generateTagsKey('library/nginx', 10, 1);
      expect(key).toContain('dockerhub:tags');
      expect(key).toContain('library/nginx');
      expect(key).toContain('10');
      expect(key).toContain('1');
    });

    it('should generate manifest key correctly', () => {
      const key = CacheService.generateManifestKey('library/nginx', 'latest');
      expect(key).toContain('dockerhub:manifest');
      expect(key).toContain('library/nginx');
      expect(key).toContain('latest');
    });

    it('should generate vulnerabilities key correctly', () => {
      const key = CacheService.generateVulnerabilitiesKey('library/nginx', 'latest', 'high');
      expect(key).toContain('dockerhub:vulnerabilities');
      expect(key).toContain('library/nginx');
      expect(key).toContain('latest');
      expect(key).toContain('high');
    });

    it('should generate stats key correctly', () => {
      const key = CacheService.generateStatsKey('library/nginx');
      expect(key).toContain('dockerhub:stats');
      expect(key).toContain('library/nginx');
    });

    it('should generate generic key correctly', () => {
      const key = CacheService.generateKey('custom_operation', { param1: 'value1', param2: 'value2' });
      expect(key).toContain('dockerhub:custom_operation');
      expect(key).toContain('param1:value1');
      expect(key).toContain('param2:value2');
    });
  });

  describe('Cache Performance', () => {
    it('should handle high-frequency operations', () => {
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const key = `key-${i}`;
        const value = { data: `value-${i}` };
        
        mockNodeCache.set.mockReturnValue(true);
        mockNodeCache.get.mockReturnValue(value);
        
        cacheService.set(key, value);
        const result = cacheService.get(key);
        
        expect(result).toEqual(value);
      }
      
      expect(mockNodeCache.set).toHaveBeenCalledTimes(iterations);
      expect(mockNodeCache.get).toHaveBeenCalledTimes(iterations);
    });

    it('should handle cache eviction', () => {
      // Simulate cache full scenario
      mockNodeCache.set.mockReturnValue(false);
      
      const result = cacheService.set('test-key', 'test-value');
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle node-cache errors gracefully', () => {
      mockNodeCache.get.mockImplementation(() => {
        throw new Error('Cache error');
      });

      expect(() => cacheService.get('test-key')).toThrow('Cache error');
    });

    it('should handle set errors gracefully', () => {
      mockNodeCache.set.mockImplementation(() => {
        throw new Error('Set error');
      });

      expect(() => cacheService.set('test-key', 'test-value')).toThrow('Set error');
    });
  });
}); 