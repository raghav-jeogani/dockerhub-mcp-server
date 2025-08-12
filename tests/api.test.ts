import { DockerHubApiService } from '../src/services/dockerhub-api.js';
import { CacheService } from '../src/services/cache.js';
import { RateLimiterService } from '../src/services/rate-limiter.js';
import { RegistryConfig, DockerHubVulnerability, DockerHubManifest } from '../src/types/index.js';

// Mock external dependencies
jest.mock('axios');
jest.mock('../src/utils/logger.js', () => ({
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

// Mock registry configuration
const mockRegistry: RegistryConfig = {
  name: 'test-registry',
  url: 'https://registry.hub.docker.com',
  isDefault: true,
};

describe('DockerHubApiService', () => {
  let apiService: DockerHubApiService;
  let cache: CacheService;
  let rateLimiter: RateLimiterService;

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
    
    apiService = new DockerHubApiService(mockRegistry, cache, rateLimiter);
  });

  afterEach(() => {
    cache.flush();
    jest.clearAllMocks();
  });

  describe('searchImages', () => {
    it('should search images with query', async () => {
      // Mock the API response
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

      // Mock the makeRequest method
      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.searchImages('nginx', 5, 1);
      
      expect(result).toBeDefined();
      expect(result.results).toBeInstanceOf(Array);
      expect(result.count).toBe(1);
    });

    it('should apply filters correctly', async () => {
      const filters = { is_official: true };
      const mockResponse = {
        results: [],
        count: 0,
      };

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.searchImages('python', 3, 1, filters);
      
      expect(result).toBeDefined();
      expect(result.results.length).toBe(0);
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
      };

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.getImageDetails('library/nginx', 'latest');
      
      expect(result).toBeDefined();
      expect(result.name).toBe('nginx');
      expect(result.namespace).toBe('library');
    });
  });

  describe('listTags', () => {
    it('should list image tags', async () => {
      const mockResponse = {
        results: [
          {
            id: 1,
            name: 'latest',
            last_updated: '2024-01-15T10:30:00Z',
            digest: 'sha256:abc123...',
            size: 133700000,
            architecture: 'amd64',
            os: 'linux',
          },
        ],
        count: 1,
      };

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.listTags('library/nginx', 10, 1);
      
      expect(result).toBeDefined();
      expect(result.results).toBeInstanceOf(Array);
      expect(result.count).toBe(1);
    });
  });

  describe('getManifest', () => {
    it('should get image manifest', async () => {
      const mockResponse: DockerHubManifest = {
        schemaVersion: 1,
        name: 'library/nginx',
        tag: 'latest',
        architecture: 'amd64',
        fsLayers: [
          {
            blobSum: 'sha256:abc123...',
          },
        ],
        history: [
          {
            v1Compatibility: '{"id":"...","os":"linux"}',
          },
        ],
        signatures: [],
      };

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.getManifest('library/nginx', 'latest');
      
      expect(result).toBeDefined();
      expect(result.schemaVersion).toBe(1);
      expect(result.fsLayers).toBeInstanceOf(Array);
    });
  });

  describe('getVulnerabilities', () => {
    it('should get vulnerabilities', async () => {
      const mockResponse: DockerHubVulnerability[] = [
        {
          id: 'CVE-2023-1234',
          status: 'open',
          description: 'Buffer overflow in nginx',
          severity: 'high',
          package: 'nginx',
          version: '1.18.0',
          fixed_version: '1.18.1',
          cvss_score: 7.5,
        },
      ];

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.getVulnerabilities('library/nginx', 'latest');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by severity', async () => {
      const mockResponse: DockerHubVulnerability[] = [];

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.getVulnerabilities('library/nginx', 'latest', 'high');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should get image statistics', async () => {
      const mockResponse = {
        pull_count: 500000,
        star_count: 3000,
        last_updated: '2024-01-15T10:30:00Z',
        tags_count: 50,
      };

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.getStats('library/nginx');
      
      expect(result).toBeDefined();
      expect(typeof result.pull_count).toBe('number');
      expect(typeof result.star_count).toBe('number');
    });
  });

  describe('getDockerfile', () => {
    it('should get Dockerfile when available', async () => {
      const mockResponse = 'FROM debian:bullseye-slim\n\nLABEL maintainer="NGINX Docker Maintainers"';

      jest.spyOn(apiService as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await apiService.getDockerfile('library/nginx', 'latest');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result!.length).toBeGreaterThan(0);
    });

    it('should return null when Dockerfile not available', async () => {
      jest.spyOn(apiService as any, 'makeRequest').mockRejectedValue({
        response: { status: 404 },
      });

      const result = await apiService.getDockerfile('library/nginx', 'latest');
      
      expect(result).toBeNull();
    });
  });

  describe('compareImages', () => {
    it('should compare two images', async () => {
      const mockManifest1: DockerHubManifest = {
        schemaVersion: 1,
        name: 'library/nginx',
        tag: 'latest',
        architecture: 'amd64',
        fsLayers: [{ blobSum: 'sha256:abc123' }, { blobSum: 'sha256:def456' }],
        history: [{ v1Compatibility: '{"id":"...","os":"linux"}' }],
        signatures: [],
      };
      const mockManifest2: DockerHubManifest = {
        schemaVersion: 1,
        name: 'library/nginx',
        tag: 'stable',
        architecture: 'amd64',
        fsLayers: [{ blobSum: 'sha256:abc123' }, { blobSum: 'sha256:ghi789' }],
        history: [{ v1Compatibility: '{"id":"...","os":"linux"}' }],
        signatures: [],
      };

      jest.spyOn(apiService, 'getManifest')
        .mockResolvedValueOnce(mockManifest1)
        .mockResolvedValueOnce(mockManifest2);

      const result = await apiService.compareImages('library/nginx:latest', 'library/nginx:stable');
      
      expect(result).toBeDefined();
      expect(result.image1).toBeDefined();
      expect(result.image2).toBeDefined();
      expect(result.comparison).toBeDefined();
      expect(typeof result.comparison.commonLayers).toBe('number');
    });
  });

  describe('estimatePullSize', () => {
    it('should estimate pull size', async () => {
      const mockManifest: DockerHubManifest = {
        schemaVersion: 1,
        name: 'library/nginx',
        tag: 'latest',
        architecture: 'amd64',
        fsLayers: [
          { blobSum: 'sha256:abc123' },
          { blobSum: 'sha256:def456' },
          { blobSum: 'sha256:ghi789' },
        ],
        history: [{ v1Compatibility: '{"id":"...","os":"linux"}' }],
        signatures: [],
      };

      jest.spyOn(apiService, 'getManifest').mockResolvedValue(mockManifest);

      const result = await apiService.estimatePullSize('library/nginx', 'latest');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid repository gracefully', async () => {
      jest.spyOn(apiService as any, 'makeRequest').mockRejectedValue(new Error('Not found'));

      await expect(
        apiService.getImageDetails('invalid/repository', 'latest')
      ).rejects.toThrow();
    });

    it('should handle invalid tag gracefully', async () => {
      jest.spyOn(apiService as any, 'makeRequest').mockRejectedValue(new Error('Not found'));

      await expect(
        apiService.getManifest('library/nginx', 'invalid-tag')
      ).rejects.toThrow();
    });
  });
}); 