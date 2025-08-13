import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { RegistryConfig, DockerHubImage, DockerHubTag, DockerHubManifest, DockerHubVulnerability, DockerHubStats } from '../types/index.js';
import { logger, logApiRequest, logApiResponse, logError } from '../utils/logger.js';
import { CacheService } from './cache.js';
import { RateLimiterService } from './rate-limiter.js';

export class DockerHubApiService {
  private httpClient: AxiosInstance;
  private registry: RegistryConfig;
  private cache: CacheService;
  private rateLimiter: RateLimiterService;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(registry: RegistryConfig, cache: CacheService, rateLimiter: RateLimiterService) {
    this.registry = registry;
    this.cache = cache;
    this.rateLimiter = rateLimiter;

    // Create HTTP client - use hub.docker.com for API v2
    this.httpClient = axios.create({
      baseURL: 'https://hub.docker.com',
      timeout: 30000,
      headers: {
        'User-Agent': 'DockerHub-MCP-Server/1.0.0',
        'Accept': 'application/json',
      },
    });

    // Add request/response interceptors
    this.setupInterceptors();

    logger.info('DockerHub API service initialized', {
      registry: registry.name,
      url: 'https://hub.docker.com',
      hasAuth: !!(registry.token || (registry.username && registry.password)),
    });
  }

  /**
   * Get a bearer token for authentication
   */
  private async getBearerToken(): Promise<string> {
    // Check if we have a valid token
    if (this.bearerToken && Date.now() < this.tokenExpiry) {
      return this.bearerToken;
    }

    if (!this.registry.token && (!this.registry.username || !this.registry.password)) {
      throw new Error('No authentication credentials provided');
    }

    try {
      // For DockerHub API v2, we don't need to get a bearer token
      // We can use the personal access token directly
      if (this.registry.token) {
        this.bearerToken = this.registry.token;
        this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
        logger.debug('Using personal access token directly');
        return this.registry.token;
      } else {
        // For username/password, we need to get a token
        const authUrl = 'https://hub.docker.com/v2/users/login/';
        const response = await axios.post(authUrl, {
          username: this.registry.username,
          password: this.registry.password
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000
        });

        if (response.data && response.data.token) {
          this.bearerToken = response.data.token;
          this.tokenExpiry = Date.now() + (60 * 60 * 1000);
          logger.debug('Bearer token obtained successfully');
          return response.data.token;
        } else {
          throw new Error('Invalid response from auth endpoint');
        }
      }
    } catch (error: any) {
      logError(error, { context: 'get_bearer_token' });
      throw new Error(`Failed to get bearer token: ${error.message}`);
    }
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      async (config) => {
        const startTime = Date.now();
        (config as any).startTime = startTime;
        
        // Add bearer token if we have authentication
        if (this.registry.token || (this.registry.username && this.registry.password)) {
          try {
            const bearerToken = await this.getBearerToken();
            if (bearerToken) {
              // For DockerHub Personal Access Tokens, use 'Token' header
              // For username/password auth, use 'Bearer' header
              if (this.registry.token) {
                config.headers['Authorization'] = `Token ${bearerToken}`;
              } else {
                config.headers['Authorization'] = `Bearer ${bearerToken}`;
              }
            }
          } catch (error) {
            logger.warn('Failed to get bearer token, proceeding without auth', { error: (error as Error).message });
          }
        }
        
        logApiRequest(config.method?.toUpperCase() || 'GET', config.url || '', config.params);
        return config;
      },
      (error) => {
        logError(error, { context: 'request_interceptor' });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config as any).startTime;
        logApiResponse(
          response.config.method?.toUpperCase() || 'GET',
          response.config.url || '',
          response.status,
          duration
        );
        return response;
      },
      (error) => {
        const duration = Date.now() - (error.config?.startTime || Date.now());
        logError(error, {
          context: 'response_interceptor',
          duration: `${duration}ms`,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make authenticated request with rate limiting and caching
   */
  private async makeRequest<T>(
    method: string,
    url: string,
    cacheKey?: string,
    params?: any,
    data?: any
  ): Promise<T> {
    const rateLimitKey = `${this.registry.name}:${method}:${url}`;
    
    // Check rate limit
    const allowed = await this.rateLimiter.checkRateLimit(this.registry.name, rateLimitKey);
    if (!allowed) {
      await this.rateLimiter.waitForRateLimit(this.registry.name, rateLimitKey);
    }

    // Check cache first
    if (cacheKey) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Make request with retry logic
    let lastError: Error;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response: AxiosResponse<T> = await this.httpClient.request({
          method,
          url,
          params,
          data,
        });

        // Cache successful response
        if (cacheKey && response.data) {
          this.cache.setWithOperationTTL(cacheKey, response.data, this.getOperationType(url));
        }

        return response.data;
      } catch (error: any) {
        lastError = error;
        
        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
          
          logger.warn('Rate limited by DockerHub API', {
            attempt,
            waitTime: `${waitTime}ms`,
            retryAfter,
          });
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // Handle other retryable errors
        if (error.response?.status >= 500 || error.code === 'ECONNRESET') {
          const backoffDelay = this.rateLimiter.getBackoffDelay(attempt);
          logger.warn('Retrying request due to server error', {
            attempt,
            status: error.response?.status,
            delay: `${backoffDelay}ms`,
          });
          
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }

        // Non-retryable error
        break;
      }
    }

    throw lastError!;
  }

  /**
   * Determine operation type from URL for cache TTL
   */
  private getOperationType(url: string): string {
    if (url.includes('/search')) return 'search';
    if (url.includes('/tags')) return 'tags';
    if (url.includes('/manifests')) return 'manifest';
    if (url.includes('/vulnerabilities')) return 'vulnerabilities';
    if (url.includes('/stats')) return 'stats';
    return 'image_details';
  }

  /**
   * Search Docker images
   */
  async searchImages(query: string, limit: number = 25, page: number = 1, filters?: any): Promise<{ results: DockerHubImage[]; count: number }> {
    const cacheKey = CacheService.generateSearchKey(query, limit, page, filters);
    
    const params = {
      query: query,  // Changed from 'q' to 'query'
      page,
      page_size: limit,
      ...filters,
    };

    const response = await this.makeRequest<{ results: any[]; count: number }>(
      'GET',
      '/v2/search/repositories/',
      cacheKey,
      params
    );

    // Map the API response to match our schema
    const mappedResults: DockerHubImage[] = response.results.map((item: any) => ({
      id: item.id || 0,
      name: item.repo_name || item.name || '',
      namespace: item.repo_owner || item.namespace || '',
      repository_type: item.repository_type || 'image',
      status: item.status || 1,
      description: item.short_description || item.description || '',
      is_private: item.is_private || false,
      is_automated: item.is_automated || false,
      can_edit: item.can_edit || false,
      star_count: item.star_count || 0,
      pull_count: item.pull_count || 0,
      last_updated: item.last_updated || new Date().toISOString(),
      date_registered: item.date_registered || new Date().toISOString(),
      collaborator_count: item.collaborator_count || 0,
      hub_user: item.hub_user || '',
      has_starred: item.has_starred || false,
      full_description: item.full_description || item.short_description || '',
      affiliation: item.affiliation || '',
      permissions: item.permissions || {
        read: true,
        write: false,
        admin: false
      }
    }));

    return {
      results: mappedResults,
      count: response.count
    };
  }

  /**
   * Get image details
   */
  async getImageDetails(repository: string, tag: string = 'latest'): Promise<DockerHubImage> {
    const cacheKey = CacheService.generateImageDetailsKey(repository, tag);
    
    try {
      const response = await this.makeRequest<DockerHubImage>(
        'GET',
        `/v2/repositories/${repository}/`,
        cacheKey
      );
      return response;
    } catch (error: any) {
      if (error.response?.status === 401) {
        logger.warn('Authentication required for image details, using search fallback', { repository });
        // Fallback to search API which doesn't require authentication
        try {
          const searchPromise = this.searchImages(repository.split('/').pop() || repository, 1);
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Search timeout')), 10000)
          );
          
          const searchResults = await Promise.race([searchPromise, timeoutPromise]);
          const repoInfo = searchResults.results.find(r => r.name === repository.split('/').pop());
          
          if (repoInfo) {
            return repoInfo;
          }
        } catch (searchError) {
          logger.warn('Search fallback also failed, using default data', { repository, error: (searchError as Error).message });
        }
        
        // Return a basic structure if we can't find the image
        return {
          id: 0,
          name: repository.split('/').pop() || repository,
          namespace: repository.split('/')[0] || 'library',
          repository_type: 'image',
          status: 1,
          description: 'Image details not available without authentication',
          is_private: false,
          is_automated: false,
          can_edit: false,
          star_count: 0,
          pull_count: 0,
          last_updated: new Date().toISOString(),
          date_registered: new Date().toISOString(),
          collaborator_count: 0,
          hub_user: 'unknown',
          has_starred: false,
          full_description: 'Image details not available without authentication',
          permissions: {
            read: true,
            write: false,
            admin: false
          }
        };
      }
      throw error;
    }
  }

  /**
   * List image tags
   */
  async listTags(repository: string, limit: number = 25, page: number = 1): Promise<{ results: DockerHubTag[]; count: number }> {
    const cacheKey = CacheService.generateTagsKey(repository, limit, page);
    
    const params = {
      page,
      page_size: limit,
    };

    try {
      const response = await this.makeRequest<{ results: DockerHubTag[]; count: number }>(
        'GET',
        `/v2/repositories/${repository}/tags/`,
        cacheKey,
        params
      );
      return response;
    } catch (error: any) {
      if (error.response?.status === 401) {
        logger.warn('Authentication required for tags, returning mock data', { repository });
        // Return mock tags data
        return {
          results: [
            {
              id: 1,
              name: 'latest',
              last_updated: new Date().toISOString(),
              digest: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
              size: 0,
              architecture: 'unknown',
              os: 'unknown'
            }
          ],
          count: 1
        };
      }
      throw error;
    }
  }

  /**
   * Get image manifest (using DockerHub API data)
   */
  async getManifest(repository: string, tag: string): Promise<DockerHubManifest> {
    const cacheKey = CacheService.generateManifestKey(repository, tag);
    
    try {
      // Get tag details from DockerHub API
      const tagResponse = await this.makeRequest<any>(
        'GET',
        `/v2/repositories/${repository}/tags/${tag}/`,
        cacheKey
      );
      
      if (tagResponse && tagResponse.images) {
        // Construct a manifest-like response from DockerHub data
        const layers = tagResponse.images.map((img: any, index: number) => ({
          blobSum: img.digest,
          size: img.size || 0
        }));
        
        // Get repository details for additional info
        const repoResponse = await this.makeRequest<any>(
          'GET',
          `/v2/repositories/${repository}/`,
          undefined
        );
        
        const manifest: DockerHubManifest = {
          name: repository,
          tag: tag,
          architecture: tagResponse.images.find((img: any) => img.architecture === 'amd64')?.architecture || 'unknown',
          schemaVersion: 2,
          fsLayers: layers,
          history: tagResponse.images.map((img: any) => ({
            v1Compatibility: JSON.stringify({
              id: img.digest?.substring(7, 19) || 'unknown',
              parent: '',
              created: tagResponse.tag_last_pushed || new Date().toISOString(),
              container: '',
              container_config: {
                Hostname: '',
                Domainname: '',
                User: '',
                AttachStdin: false,
                AttachStdout: false,
                AttachStderr: false,
                PortSpecs: null,
                ExposedPorts: null,
                Tty: false,
                OpenStdin: false,
                StdinOnce: false,
                Env: null,
                Cmd: null,
                Image: '',
                Volumes: null,
                WorkingDir: '',
                Entrypoint: null,
                NetworkDisabled: false,
                OnBuild: null,
                Labels: null
              },
              docker_version: '20.10.0',
              config: {
                Hostname: '',
                Domainname: '',
                User: '',
                AttachStdin: false,
                AttachStdout: false,
                AttachStderr: false,
                PortSpecs: null,
                ExposedPorts: null,
                Tty: false,
                OpenStdin: false,
                StdinOnce: false,
                Env: null,
                Cmd: null,
                Image: '',
                Volumes: null,
                WorkingDir: '',
                Entrypoint: null,
                NetworkDisabled: false,
                OnBuild: null,
                Labels: null
              },
              architecture: img.architecture,
              os: img.os,
              size: img.size
            })
          })),
          signatures: [],
          // Additional DockerHub-specific data
          dockerHubData: {
            totalSize: tagResponse.images.reduce((sum: number, img: any) => sum + (img.size || 0), 0),
            variantCount: tagResponse.images.length,
            architectures: [...new Set(tagResponse.images.map((img: any) => img.architecture).filter(Boolean))] as string[],
            operatingSystems: [...new Set(tagResponse.images.map((img: any) => img.os).filter(Boolean))] as string[],
            lastUpdated: tagResponse.tag_last_pushed,
            digest: tagResponse.digest
          }
        };
        
        return manifest;
      } else {
        // Fallback to basic structure
        return {
          name: repository,
          tag: tag,
          architecture: 'unknown',
          schemaVersion: 2,
          fsLayers: [],
          history: [],
          signatures: []
        };
      }
    } catch (error: any) {
      logger.warn('Could not get manifest from DockerHub API, returning basic structure', { 
        repository, 
        tag, 
        error: error.message 
      });
      
      return {
        name: repository,
        tag: tag,
        architecture: 'unknown',
        schemaVersion: 2,
        fsLayers: [],
        history: [],
        signatures: []
      };
    }
  }

  /**
   * Get image vulnerabilities
   */
  async getVulnerabilities(repository: string, tag: string, severity?: string): Promise<DockerHubVulnerability[]> {
    const cacheKey = CacheService.generateVulnerabilitiesKey(repository, tag, severity);
    
    // DockerHub doesn't provide vulnerability data via API
    // This would require integration with security scanning services
    logger.warn('Vulnerability scanning not available via DockerHub API', { repository, tag });
    return [];
  }

  /**
   * Get image statistics
   */
  async getStats(repository: string): Promise<DockerHubStats> {
    const cacheKey = CacheService.generateStatsKey(repository);
    
    // For stats, we can use the search API which doesn't require authentication
    try {
      const searchResults = await this.searchImages(repository.split('/').pop() || repository, 1);
      const repoInfo = searchResults.results.find(r => r.name === repository.split('/').pop());
      
      if (repoInfo) {
        return {
          pull_count: repoInfo.pull_count || 0,
          star_count: repoInfo.star_count || 0,
          last_updated: repoInfo.last_updated || new Date().toISOString(),
          tags_count: 0, // Not available via API
        };
      }
    } catch (error) {
      logger.warn('Could not get stats from search, using defaults', { repository, error: (error as Error).message });
    }
    
    // Return default stats if we can't get real data
    return {
      pull_count: 0,
      star_count: 0,
      last_updated: new Date().toISOString(),
      tags_count: 0,
    };
  }

  /**
   * Get Dockerfile (if available)
   */
  async getDockerfile(repository: string, tag: string): Promise<string | null> {
    try {
      // DockerHub doesn't provide Dockerfile via API
      // This would require parsing the repository or using external services
      logger.warn('Dockerfile retrieval not available via DockerHub API', { repository, tag });
      return null;
    } catch (error: any) {
      logger.debug('Dockerfile not available', { repository, tag });
      return null;
    }
  }

  /**
   * Get image history
   */
  async getImageHistory(repository: string, tag: string): Promise<any[]> {
    try {
      // DockerHub doesn't provide build history via API
      // Return basic information from repository
      const repoInfo = await this.getImageDetails(repository);
      
      return [{
        repository: repository,
        tag: tag,
        last_updated: repoInfo.last_updated,
        date_registered: repoInfo.date_registered,
      }];
    } catch (error: any) {
      logger.debug('Image history not available', { repository, tag });
      return [];
    }
  }

  /**
   * Analyze image layers
   */
  async analyzeLayers(repository: string, tag: string): Promise<any> {
    try {
      // Get tag details from DockerHub API instead of Registry API
      const tagResponse = await this.makeRequest<any>(
        'GET',
        `/v2/repositories/${repository}/tags/${tag}/`,
        CacheService.generateManifestKey(repository, tag)
      );
      
      if (tagResponse && tagResponse.images) {
        const layers = tagResponse.images.map((img: any, index: number) => ({
          index: index + 1,
          digest: img.digest,
          size: img.size,
          architecture: img.architecture,
          os: img.os,
          variant: `${img.architecture}/${img.os}`
        }));
        
        const totalSize = layers.reduce((sum: number, layer: any) => sum + (layer.size || 0), 0);
        const mainArchitecture = layers.find((l: any) => l.architecture === 'amd64')?.architecture || layers[0]?.architecture || 'unknown';
        
        return {
          repository: repository,
          tag: tag,
          total_layers: layers.length,
          layers: layers,
          total_size: totalSize,
          total_size_mb: Math.round(totalSize / (1024 * 1024)),
          architecture: mainArchitecture,
          variants: layers.length,
          note: `Analyzed ${layers.length} architecture variants from DockerHub API`
        };
      } else {
        // Fallback to basic info
        return {
          repository: repository,
          tag: tag,
          total_layers: 0,
          layers: [],
          total_size: 0,
          total_size_mb: 0,
          architecture: 'unknown',
          variants: 0,
          note: 'No layer information available from DockerHub API'
        };
      }
    } catch (error: any) {
      logger.warn('Could not analyze layers from DockerHub API, returning basic info', { 
        repository, 
        tag, 
        error: error.message 
      });
      
      return {
        repository: repository,
        tag: tag,
        total_layers: 0,
        layers: [],
        total_size: 0,
        total_size_mb: 0,
        architecture: 'unknown',
        variants: 0,
        error: 'Could not retrieve layer information',
        note: 'Layer analysis requires authentication or the image may not be accessible'
      };
    }
  }

  /**
   * Compare two images
   */
  async compareImages(image1: string, image2: string): Promise<any> {
    const parts1 = image1.split(':');
    const parts2 = image2.split(':');
    
    const repo1 = parts1[0] || '';
    const tag1 = parts1[1] || 'latest';
    const repo2 = parts2[0] || '';
    const tag2 = parts2[1] || 'latest';
    
    try {
      // Get layer analysis for both images using DockerHub API
      const [analysis1, analysis2] = await Promise.all([
        this.analyzeLayers(repo1, tag1),
        this.analyzeLayers(repo2, tag2),
      ]);

      // Compare the layer information
      const layers1 = analysis1.layers.map((l: any) => l.digest);
      const layers2 = analysis2.layers.map((l: any) => l.digest);
      
      const commonLayers = layers1.filter((layer: string) => layers2.includes(layer));
      const uniqueToImage1 = layers1.filter((layer: string) => !layers2.includes(layer));
      const uniqueToImage2 = layers2.filter((layer: string) => !layers1.includes(layer));

      const layerEfficiency = Math.max(layers1.length, layers2.length) > 0 
        ? (commonLayers.length / Math.max(layers1.length, layers2.length)) * 100 
        : 0;

      return {
        image1: { 
          repository: repo1, 
          tag: tag1, 
          analysis: analysis1,
          total_layers: analysis1.total_layers,
          total_size: analysis1.total_size
        },
        image2: { 
          repository: repo2, 
          tag: tag2, 
          analysis: analysis2,
          total_layers: analysis2.total_layers,
          total_size: analysis2.total_size
        },
        comparison: {
          commonLayers: commonLayers.length,
          uniqueToImage1: uniqueToImage1.length,
          uniqueToImage2: uniqueToImage2.length,
          totalLayersImage1: layers1.length,
          totalLayersImage2: layers2.length,
          layerEfficiency: layerEfficiency,
          sizeDifference: analysis1.total_size - analysis2.total_size,
          sizeDifferenceMB: Math.round((analysis1.total_size - analysis2.total_size) / (1024 * 1024)),
        },
      };
    } catch (error: any) {
      logger.warn('Could not compare images, returning basic comparison', { 
        image1, 
        image2, 
        error: error.message 
      });
      
      return {
        image1: { repository: repo1, tag: tag1, analysis: null },
        image2: { repository: repo2, tag: tag2, analysis: null },
        comparison: {
          commonLayers: 0,
          uniqueToImage1: 0,
          uniqueToImage2: 0,
          totalLayersImage1: 0,
          totalLayersImage2: 0,
          layerEfficiency: 0,
          sizeDifference: 0,
          sizeDifferenceMB: 0,
        },
      };
    }
  }

  /**
   * Compare two manifests
   */
  private compareManifests(manifest1: DockerHubManifest, manifest2: DockerHubManifest): any {
    const layers1 = manifest1.fsLayers.map(layer => layer.blobSum);
    const layers2 = manifest2.fsLayers.map(layer => layer.blobSum);
    
    const commonLayers = layers1.filter(layer => layers2.includes(layer));
    const uniqueToImage1 = layers1.filter(layer => !layers2.includes(layer));
    const uniqueToImage2 = layers2.filter(layer => !layers1.includes(layer));

    return {
      commonLayers: commonLayers.length,
      uniqueToImage1: uniqueToImage1.length,
      uniqueToImage2: uniqueToImage2.length,
      totalLayersImage1: layers1.length,
      totalLayersImage2: layers2.length,
      layerEfficiency: (commonLayers.length / Math.max(layers1.length, layers2.length)) * 100,
    };
  }

  /**
   * Estimate pull size for an image
   */
  async estimatePullSize(repository: string, tag: string): Promise<number> {
    try {
      // Use layer analysis to get real size data
      const analysis = await this.analyzeLayers(repository, tag);
      return analysis.total_size || 0;
    } catch (error) {
      logger.warn('Could not estimate pull size, returning default', { repository, tag, error: (error as Error).message });
      return 100 * 1024 * 1024; // Default 100MB estimate
    }
  }

  /**
   * Check if base image has updates
   */
  async checkBaseImageUpdates(repository: string, tag: string): Promise<any> {
    try {
      // Get current image details and tags
      const [imageDetails, tags] = await Promise.all([
        this.getImageDetails(repository, tag),
        this.listTags(repository, 10, 1), // Get recent tags
      ]);
      
      // This is a simplified implementation
      // In a real scenario, you'd parse the Dockerfile and check base image versions
      const recentTags = tags.results.filter((t: any) => 
        t.name !== tag && 
        new Date(t.last_updated) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      );
      
      return {
        hasUpdates: recentTags.length > 0,
        currentVersion: tag,
        latestVersion: recentTags[0]?.name || tag,
        recentTags: recentTags.length,
        lastChecked: new Date().toISOString(),
        note: 'Base image update detection requires Dockerfile analysis'
      };
    } catch (error: any) {
      logger.warn('Could not check base image updates', { repository, tag, error: error.message });
      return {
        hasUpdates: false,
        currentVersion: tag,
        latestVersion: tag,
        lastChecked: new Date().toISOString(),
        note: 'Update detection not available'
      };
    }
  }
} 