import dotenv from 'dotenv';
import { AppConfig, RegistryConfig, CacheConfig, RateLimitConfig } from '../types/index.js';

// Load environment variables
dotenv.config();

// Default configurations
const defaultCacheConfig: CacheConfig = {
  ttl: 300, // 5 minutes
  checkPeriod: 60, // 1 minute
  maxKeys: 1000,
};

const defaultRateLimitConfig: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  burstSize: 10,
};

const defaultRegistryConfig: RegistryConfig = {
  name: 'dockerhub',
  url: 'https://registry.hub.docker.com',
  isDefault: true,
};

// Environment-based configuration
const getRegistryConfigs = (): RegistryConfig[] => {
  const registries: RegistryConfig[] = [];

  // Default DockerHub registry
  if (process.env.DOCKERHUB_USERNAME && process.env.DOCKERHUB_PASSWORD) {
    registries.push({
      ...defaultRegistryConfig,
      username: process.env.DOCKERHUB_USERNAME,
      password: process.env.DOCKERHUB_PASSWORD,
    });
  } else if (process.env.DOCKERHUB_TOKEN) {
    registries.push({
      ...defaultRegistryConfig,
      token: process.env.DOCKERHUB_TOKEN,
    });
  } else {
    // Public DockerHub access
    registries.push(defaultRegistryConfig);
  }

  // Additional private registries
  const privateRegistries = process.env.PRIVATE_REGISTRIES;
  if (privateRegistries) {
    try {
      const parsed = JSON.parse(privateRegistries);
      if (Array.isArray(parsed)) {
        registries.push(...parsed);
      }
    } catch (error) {
      console.warn('Failed to parse PRIVATE_REGISTRIES environment variable');
    }
  }

  return registries;
};

const getCacheConfig = (): CacheConfig => ({
  ttl: parseInt(process.env.CACHE_TTL || '300'),
  checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '60'),
  maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '1000'),
});

const getRateLimitConfig = (): RateLimitConfig => ({
  requestsPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60'),
  requestsPerHour: parseInt(process.env.RATE_LIMIT_PER_HOUR || '1000'),
  burstSize: parseInt(process.env.RATE_LIMIT_BURST_SIZE || '10'),
});

// Main configuration object
export const config: AppConfig = {
  registries: getRegistryConfigs(),
  cache: getCacheConfig(),
  rateLimit: getRateLimitConfig(),
  logLevel: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
};

// Configuration validation
export const validateConfig = (): void => {
  if (config.registries.length === 0) {
    throw new Error('No registries configured');
  }

  const defaultRegistry = config.registries.find(r => r.isDefault);
  if (!defaultRegistry) {
    throw new Error('No default registry configured');
  }

  if (config.cache.ttl <= 0) {
    throw new Error('Cache TTL must be positive');
  }

  if (config.rateLimit.requestsPerMinute <= 0) {
    throw new Error('Rate limit per minute must be positive');
  }
};

// Helper functions
export const getDefaultRegistry = (): RegistryConfig => {
  const defaultRegistry = config.registries.find(r => r.isDefault);
  if (!defaultRegistry) {
    throw new Error('No default registry configured');
  }
  return defaultRegistry;
};

export const getRegistryByName = (name: string): RegistryConfig | undefined => {
  return config.registries.find(r => r.name === name);
};

// Export configuration for testing
export const getTestConfig = (): AppConfig => ({
  registries: [defaultRegistryConfig],
  cache: defaultCacheConfig,
  rateLimit: defaultRateLimitConfig,
  logLevel: 'debug',
}); 