import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import axios from 'axios';
import { DockerHubApiService } from '../../src/services/dockerhub-api.js';
import { CacheService } from '../../src/services/cache.js';
import { RateLimiterService } from '../../src/services/rate-limiter.js';
import { RegistryConfig } from '../../src/types/index.js';

// Mock axios with proper interceptors
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
    get: jest.fn(),
    post: jest.fn(),
  })),
  post: jest.fn(),
}));

// Mock logger
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logApiRequest: jest.fn(),
  logApiResponse: jest.fn(),
  logCacheHit: jest.fn(),
  logCacheMiss: jest.fn(),
  logRateLimit: jest.fn(),
  logError: jest.fn(),
}));

describe('DockerHubApiService', () => {
  let apiService: DockerHubApiService;
  let cache: CacheService;
  let rateLimiter: RateLimiterService;
  let mockRegistry: RegistryConfig;

  beforeEach(() => {
    cache = new CacheService({
      ttl: 300,
      checkPeriod: 60,
      maxKeys: 100,
    });
    
    rateLimiter = new RateLimiterService({
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      burstSize: 10,
    });

    mockRegistry = {
      name: 'test-registry',
      url: 'https://registry.hub.docker.com',
      isDefault: true,
    };
    
    apiService = new DockerHubApiService(mockRegistry, cache, rateLimiter);
  });

  afterEach(() => {
    cache.flush();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with basic registry config', () => {
      expect(apiService).toBeDefined();
      expect(jest.mocked(axios).create).toHaveBeenCalledWith({
        baseURL: 'https://hub.docker.com',
        timeout: 30000,
        headers: {
          'User-Agent': 'DockerHub-MCP-Server/1.0.0',
          'Accept': 'application/json',
        },
      });
    });

    it('should initialize with authentication', () => {
      const authRegistry: RegistryConfig = {
        ...mockRegistry,
        token: 'test-token',
      };
      
      new DockerHubApiService(authRegistry, cache, rateLimiter);
      expect(jest.mocked(axios).create).toHaveBeenCalled();
    });

    it('should initialize with username/password', () => {
      const authRegistry: RegistryConfig = {
        ...mockRegistry,
        username: 'testuser',
        password: 'testpass',
      };
      
      new DockerHubApiService(authRegistry, cache, rateLimiter);
      expect(jest.mocked(axios).create).toHaveBeenCalled();
    });
  });

  describe('getBearerToken', () => {
    it('should return existing valid token', async () => {
      const authRegistry: RegistryConfig = {
        ...mockRegistry,
        token: 'test-token',
      };
      
      const authService = new DockerHubApiService(authRegistry, cache, rateLimiter);
      const token = await (authService as any).getBearerToken();
      expect(token).toBe('test-token');
    });

    it('should throw error when no credentials provided', async () => {
      await expect((apiService as any).getBearerToken()).rejects.toThrow('No authentication credentials provided');
    });

    it('should handle username/password authentication', async () => {
      const authRegistry: RegistryConfig = {
        ...mockRegistry,
        username: 'testuser',
        password: 'testpass',
      };
      
      const mockResponse = { data: { token: 'auth-token' } };
      (jest.mocked(axios).post as any).mockResolvedValue(mockResponse);
      
      const authService = new DockerHubApiService(authRegistry, cache, rateLimiter);
      const token = await (authService as any).getBearerToken();
      expect(token).toBe('auth-token');
    });

    it('should handle authentication error', async () => {
      const authRegistry: RegistryConfig = {
        ...mockRegistry,
        username: 'testuser',
        password: 'testpass',
      };
      
      (jest.mocked(axios).post as any).mockRejectedValue(new Error('Auth failed'));
      
      const authService = new DockerHubApiService(authRegistry, cache, rateLimiter);
      await expect((authService as any).getBearerToken()).rejects.toThrow('Failed to get bearer token: Auth failed');
    });

    it('should handle invalid auth response', async () => {
      const authRegistry: RegistryConfig = {
        ...mockRegistry,
        username: 'testuser',
        password: 'testpass',
      };
      
      const mockResponse = { data: {} }; // No token
      (jest.mocked(axios).post as any).mockResolvedValue(mockResponse);
      
      const authService = new DockerHubApiService(authRegistry, cache, rateLimiter);
      await expect((authService as any).getBearerToken()).rejects.toThrow('Invalid response from auth endpoint');
    });
  });

  describe('makeRequest', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: { result: 'success' } };
      const mockHttpClient = {
        request: jest.fn().mockImplementation(async () => mockResponse),
      };
      (apiService as any).httpClient = mockHttpClient;

      const result = await (apiService as any).makeRequest('GET', '/test', 'cache-key');
      expect(result).toEqual({ result: 'success' });
    });

    it('should make successful POST request', async () => {
      const mockResponse = { data: { result: 'success' } };
      const mockHttpClient = {
        request: jest.fn().mockImplementation(async () => mockResponse),
      };
      (apiService as any).httpClient = mockHttpClient;

      const result = await (apiService as any).makeRequest('POST', '/test', 'cache-key', { data: 'test' });
      expect(result).toEqual({ result: 'success' });
    });

    it('should handle request errors', async () => {
      const mockHttpClient = {
        request: jest.fn().mockImplementation(async () => {
          throw new Error('Request failed');
        }),
      };
      (apiService as any).httpClient = mockHttpClient;

      await expect((apiService as any).makeRequest('GET', '/test', 'cache-key')).rejects.toThrow('Request failed');
    });

    it('should use cache when available', async () => {
      const cachedData = { result: 'cached' };
      cache.set('cache-key', cachedData);

      const result = await (apiService as any).makeRequest('GET', '/test', 'cache-key');
      expect(result).toEqual(cachedData);
    });

    it('should handle unsupported HTTP method', async () => {
      const mockHttpClient = {
        request: jest.fn().mockImplementation(async () => {
          throw new Error('Unsupported HTTP method: PUT');
        }),
      };
      (apiService as any).httpClient = mockHttpClient;

      await expect((apiService as any).makeRequest('PUT', '/test', 'cache-key')).rejects.toThrow('Unsupported HTTP method: PUT');
    });
  });

  describe('searchImages', () => {
    it('should search images with basic query', async () => {
      const mockResponse = {
        results: [
          {
            id: 1,
            name: 'nginx',
            namespace: 'library',
            description: 'Official nginx docker image',
            star_count: 3000,
            pull_count: 500000,
            is_official: true,
            is_automated: false,
          },
        ],
        count: 1,
      };

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.searchImages('nginx', 5, 1);
      
      expect(result).toBeDefined();
      expect(result.results).toBeInstanceOf(Array);
      expect(result.count).toBe(1);
    });

    it('should search images with filters', async () => {
      const filters = { is_official: true, is_automated: false };
      const mockResponse = { results: [], count: 0 };

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.searchImages('python', 3, 1, filters);
      
      expect(result).toBeDefined();
      expect(result.results.length).toBe(0);
    });

    it('should handle search errors', async () => {
      jest.spyOn(apiService as any, 'makeRequest').mockRejectedValue(new Error('Search failed'));

      await expect(apiService.searchImages('invalid', 5, 1)).rejects.toThrow('Search failed');
    });
  });

  describe('getImageDetails', () => {
    it('should get image details', async () => {
      const mockResponse = {
        id: 1,
        name: 'nginx',
        namespace: 'library',
        description: 'Official nginx docker image',
        star_count: 3000,
        pull_count: 500000,
        is_official: true,
        is_automated: false,
        last_updated: '2023-01-01T00:00:00Z',
      };

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.getImageDetails('library/nginx');
      
      expect(result).toBeDefined();
      expect(result.name).toBe('nginx');
      expect(result.namespace).toBe('library');
    });

    it('should handle image details errors', async () => {
      jest.spyOn(apiService as any, 'makeRequest').mockRejectedValue(new Error('Image not found'));

      await expect(apiService.getImageDetails('invalid/image')).rejects.toThrow('Image not found');
    });
  });

  describe('listTags', () => {
    it('should list image tags', async () => {
      const mockResponse = {
        results: [
          {
            name: 'latest',
            id: 1,
            repository: 1,
            creator: 1,
            image_id: null,
            v2: true,
            last_updated: '2023-01-01T00:00:00Z',
            last_updater: 1,
            last_updater_username: 'library',
            images: [
              {
                size: 133000000,
                architecture: 'amd64',
                variant: null,
                features: null,
                digest: 'sha256:abc123',
                os: 'linux',
                os_version: null,
                os_features: null,
              },
            ],
          },
        ],
        count: 1,
      };

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.listTags('library/nginx', 10, 1);
      
      expect(result).toBeDefined();
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]?.name).toBe('latest');
    });

    it('should handle tag listing errors', async () => {
      jest.spyOn(apiService as any, 'makeRequest').mockRejectedValue(new Error('Tags not found'));

      await expect(apiService.listTags('invalid/image', 10, 1)).rejects.toThrow('Tags not found');
    });
  });

  describe('getManifest', () => {
    it('should get image manifest', async () => {
      const mockTagResponse = {
        images: [
          {
            size: 133000000,
            architecture: 'amd64',
            digest: 'sha256:abc123',
            os: 'linux',
          },
        ],
        tag_last_pushed: '2023-01-01T00:00:00Z',
        digest: 'sha256:abc123',
      };

      const mockRepoResponse = {
        name: 'nginx',
        namespace: 'library',
      };

      jest.spyOn(apiService as any, 'makeRequest')
        .mockResolvedValueOnce(mockTagResponse)
        .mockResolvedValueOnce(mockRepoResponse);

      const result = await apiService.getManifest('library/nginx', 'latest');
      
      expect(result).toBeDefined();
      expect(result.schemaVersion).toBe(2);
      expect(result.fsLayers).toBeInstanceOf(Array);
      expect(result.name).toBe('library/nginx');
      expect(result.tag).toBe('latest');
    });
  });

  describe('getVulnerabilities', () => {
    it('should return empty array for vulnerabilities', async () => {
      const result = await apiService.getVulnerabilities('library/nginx', 'latest');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should get image statistics from search', async () => {
      const mockSearchResponse = {
        results: [{
          id: 1,
          name: 'nginx',
          namespace: 'library',
          repository_type: 'image',
          status: 1,
          is_private: false,
          is_automated: false,
          can_edit: false,
          star_count: 3000,
          pull_count: 500000,
          last_updated: '2023-01-01T00:00:00Z',
          date_registered: '2023-01-01T00:00:00Z',
          description: 'Test image',
          is_official: true,
          is_migrated: false,
          has_starred: false,
          full_description: 'Test image description',
          affiliation: undefined,
          collaborator_count: 0,
          hub_user: 'library',
          permissions: { read: true, write: false, admin: false },
        }],
        count: 1,
      };

      jest.spyOn(apiService, 'searchImages').mockResolvedValue(mockSearchResponse);

      const result = await apiService.getStats('library/nginx');
      
      expect(result).toBeDefined();
      expect(result.pull_count).toBe(500000);
      expect(result.star_count).toBe(3000);
    });

    it('should return default stats when search fails', async () => {
      jest.spyOn(apiService, 'searchImages').mockRejectedValue(new Error('Search failed'));

      const result = await apiService.getStats('library/nginx');
      
      expect(result).toBeDefined();
      expect(result.pull_count).toBe(0);
      expect(result.star_count).toBe(0);
      expect(typeof result.last_updated).toBe('string');
      expect(result.tags_count).toBe(0);
    });
  });

  describe('getDockerfile', () => {
    it('should return null for Dockerfile', async () => {
      const result = await apiService.getDockerfile('library/nginx', 'latest');
      expect(result).toBeNull();
    });
  });

  describe('getImageHistory', () => {
    it('should get image history', async () => {
      const mockRepoResponse = {
        id: 1,
        name: 'nginx',
        namespace: 'library',
        repository_type: 'image',
        status: 1,
        is_private: false,
        is_automated: false,
        can_edit: false,
        star_count: 3000,
        pull_count: 500000,
        last_updated: '2023-01-01T00:00:00Z',
        date_registered: '2023-01-01T00:00:00Z',
        description: 'Test image',
        is_official: true,
        is_migrated: false,
        has_starred: false,
        full_description: 'Test image description',
        affiliation: undefined,
        collaborator_count: 0,
        hub_user: 'library',
        permissions: { read: true, write: false, admin: false },
      };

      jest.spyOn(apiService, 'getImageDetails').mockResolvedValue(mockRepoResponse);

      const result = await apiService.getImageHistory('library/nginx', 'latest');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].repository).toBe('library/nginx');
      expect(result[0].tag).toBe('latest');
    });

    it('should return empty array when history not available', async () => {
      jest.spyOn(apiService, 'getImageDetails').mockRejectedValue(new Error('Not found'));

      const result = await apiService.getImageHistory('invalid/image', 'latest');
      expect(result).toEqual([]);
    });
  });

  describe('analyzeLayers', () => {
    it('should analyze image layers', async () => {
      const mockTagResponse = {
        images: [
          {
            size: 133000000,
            architecture: 'amd64',
            digest: 'sha256:abc123',
            os: 'linux',
          },
        ],
        tag_last_pushed: '2023-01-01T00:00:00Z',
        digest: 'sha256:abc123',
      };

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockTagResponse);

      const result = await apiService.analyzeLayers('library/nginx', 'latest');
      
      expect(result).toBeDefined();
      expect(result.layers).toBeInstanceOf(Array);
    });
  });

  describe('compareImages', () => {
    it('should compare two images', async () => {
      const mockManifest1 = {
        schemaVersion: 2,
        name: 'library/nginx',
        tag: 'latest',
        architecture: 'amd64',
        fsLayers: [
          { blobSum: 'sha256:abc123', size: 1000 },
          { blobSum: 'sha256:def456', size: 2000 },
        ],
        history: [{ v1Compatibility: '{"id":"...","os":"linux"}' }],
        signatures: [],
      };

      const mockManifest2 = {
        schemaVersion: 2,
        name: 'library/nginx',
        tag: 'alpine',
        architecture: 'amd64',
        fsLayers: [
          { blobSum: 'sha256:abc123', size: 1000 },
          { blobSum: 'sha256:ghi789', size: 1500 },
        ],
        history: [{ v1Compatibility: '{"id":"...","os":"linux"}' }],
        signatures: [],
      };

      jest.spyOn(apiService, 'getManifest')
        .mockResolvedValueOnce(mockManifest1)
        .mockResolvedValueOnce(mockManifest2);

      const result = await apiService.compareImages('library/nginx:latest', 'library/nginx:alpine');
      
      expect(result).toBeDefined();
      expect(result.image1).toBeDefined();
      expect(result.image2).toBeDefined();
      expect(result.comparison).toBeDefined();
    });
  });

  describe('estimatePullSize', () => {
    it('should estimate pull size', async () => {
      const mockManifest = {
        schemaVersion: 2,
        name: 'library/nginx',
        tag: 'latest',
        architecture: 'amd64',
        fsLayers: [
          { blobSum: 'sha256:abc123', size: 1000 },
          { blobSum: 'sha256:def456', size: 2000 },
          { blobSum: 'sha256:ghi789', size: 3000 },
        ],
        history: [{ v1Compatibility: '{"id":"...","os":"linux"}' }],
        signatures: [],
      };

      jest.spyOn(apiService, 'getManifest').mockResolvedValue(mockManifest);

      const result = await apiService.estimatePullSize('library/nginx', 'latest');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });
  });
}); 