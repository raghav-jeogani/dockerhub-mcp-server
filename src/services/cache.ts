import NodeCache from 'node-cache';
import { CacheConfig } from '../types/index.js';
import { logger, logCacheHit, logCacheMiss } from '../utils/logger.js';

export class CacheService {
  private cache: NodeCache;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.cache = new NodeCache({
      stdTTL: config.ttl,
      checkperiod: config.checkPeriod,
      maxKeys: config.maxKeys,
      useClones: false,
    });

    // Set up cache event listeners
    this.cache.on('expired', (key, value) => {
      logger.debug('Cache key expired', { key });
    });

    this.cache.on('flush', () => {
      logger.info('Cache flushed');
    });

    logger.info('Cache service initialized', {
      ttl: config.ttl,
      checkPeriod: config.checkPeriod,
      maxKeys: config.maxKeys,
    });
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      logCacheHit(key);
      return value;
    }
    logCacheMiss(key);
    return undefined;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    const success = this.cache.set(key, value, ttl ?? this.config.ttl);
    if (success) {
      logger.debug('Cache key set', { key, ttl: ttl ?? this.config.ttl });
    }
    return success;
  }

  /**
   * Delete a key from cache
   */
  del(key: string): number {
    const deleted = this.cache.del(key);
    if (deleted > 0) {
      logger.debug('Cache key deleted', { key });
    }
    return deleted;
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const stats = this.cache.getStats();
    const total = stats.hits + stats.misses;
    const hitRate = total > 0 ? stats.hits / total : 0;
    
    return {
      hits: stats.hits,
      misses: stats.misses,
      keys: stats.keys,
      ksize: stats.ksize,
      vsize: stats.vsize,
      hitRate,
    };
  }

  /**
   * Flush all cache
   */
  flush(): void {
    this.cache.flushAll();
    logger.info('Cache flushed');
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return this.cache.keys();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.keys().length;
  }

  /**
   * Generate cache key for DockerHub API requests
   */
  static generateKey(operation: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `dockerhub:${operation}:${sortedParams}`;
  }

  /**
   * Generate cache key for image search
   */
  static generateSearchKey(query: string, limit: number, page: number, filters?: any): string {
    const filterStr = filters ? JSON.stringify(filters) : '';
    return this.generateKey('search', { query, limit, page, filters: filterStr });
  }

  /**
   * Generate cache key for image details
   */
  static generateImageDetailsKey(repository: string, tag: string): string {
    return this.generateKey('image_details', { repository, tag });
  }

  /**
   * Generate cache key for tags list
   */
  static generateTagsKey(repository: string, limit: number, page: number): string {
    return this.generateKey('tags', { repository, limit, page });
  }

  /**
   * Generate cache key for manifest
   */
  static generateManifestKey(repository: string, tag: string): string {
    return this.generateKey('manifest', { repository, tag });
  }

  /**
   * Generate cache key for vulnerabilities
   */
  static generateVulnerabilitiesKey(repository: string, tag: string, severity?: string): string {
    return this.generateKey('vulnerabilities', { repository, tag, severity });
  }

  /**
   * Generate cache key for statistics
   */
  static generateStatsKey(repository: string): string {
    return this.generateKey('stats', { repository });
  }

  /**
   * Set cache with different TTL based on operation type
   */
  setWithOperationTTL<T>(key: string, value: T, operation: string): boolean {
    let ttl = this.config.ttl;

    // Different TTL for different operations
    switch (operation) {
      case 'search':
        ttl = 300; // 5 minutes for search results
        break;
      case 'image_details':
        ttl = 600; // 10 minutes for image details
        break;
      case 'tags':
        ttl = 900; // 15 minutes for tags
        break;
      case 'manifest':
        ttl = 1800; // 30 minutes for manifests
        break;
      case 'vulnerabilities':
        ttl = 3600; // 1 hour for vulnerabilities
        break;
      case 'stats':
        ttl = 7200; // 2 hours for statistics
        break;
      default:
        ttl = this.config.ttl;
    }

    return this.set(key, value, ttl);
  }
} 