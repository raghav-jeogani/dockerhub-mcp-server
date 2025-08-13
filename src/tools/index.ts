import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "../types/mcp.js";
import { z } from "zod";
import { DockerHubApiService } from "../services/dockerhub-api.js";
import { CacheService } from "../services/cache.js";
import { RateLimiterService } from "../services/rate-limiter.js";
import { logger, logError } from "../utils/logger.js";
import {
  SearchImagesInputSchema,
  GetImageDetailsInputSchema,
  ListTagsInputSchema,
  CompareImagesInputSchema,
  GetVulnerabilitiesInputSchema,
} from "../types/index.js";

export class DockerHubTools {
  private apiService: DockerHubApiService;
  private cache: CacheService;
  private rateLimiter: RateLimiterService;

  constructor(
    apiService: DockerHubApiService,
    cache: CacheService,
    rateLimiter: RateLimiterService
  ) {
    this.apiService = apiService;
    this.cache = cache;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Get all available tools
   */
  getTools(): Tool[] {
    return [
      {
        name: "docker_search_images",
        description: "Search Docker Hub for images based on query and filters",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for Docker images"
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return",
              default: 10
            },
            is_official: {
              type: "boolean",
              description: "Filter for official images only",
              default: false
            },
            is_automated: {
              type: "boolean",
              description: "Filter for automated builds only",
              default: false
            }
          },
          required: ["query"]
        },
      },
      {
        name: "docker_get_image_details",
        description: "Get detailed information about a specific Docker image",
        inputSchema: {
          type: "object",
          properties: {
            repository: {
              type: "string",
              description: "Docker repository name (e.g., 'library/nginx')"
            },
            tag: {
              type: "string",
              description: "Image tag (e.g., 'latest')",
              default: "latest"
            }
          },
          required: ["repository"]
        },
      },
      {
        name: "docker_list_tags",
        description: "List all available tags for a Docker repository",
        inputSchema: {
          type: "object",
          properties: {
            repository: {
              type: "string",
              description: "Docker repository name (e.g., 'library/nginx')"
            },
            limit: {
              type: "number",
              description: "Maximum number of tags to return",
              default: 20
            }
          },
          required: ["repository"]
        },
      },
      {
        name: "docker_get_manifest",
        description: "Retrieve the manifest for a specific Docker image",
        inputSchema: {
          type: "object",
          properties: {
            repository: {
              type: "string",
              description: "Docker repository name (e.g., 'library/nginx')"
            },
            tag: {
              type: "string",
              description: "Image tag (e.g., 'latest')",
              default: "latest"
            }
          },
          required: ["repository"]
        },
      },
      {
        name: "docker_analyze_layers",
        description: "Analyze image layers and provide size breakdown",
        inputSchema: {
          type: "object",
          properties: {
            repository: {
              type: "string",
              description: "Docker repository name (e.g., 'library/nginx')"
            },
            tag: {
              type: "string",
              description: "Image tag (e.g., 'latest')",
              default: "latest"
            }
          },
          required: ["repository"]
        },
      },
      {
        name: "docker_compare_images",
        description: "Compare two Docker images (layers, sizes, base images)",
        inputSchema: {
          type: "object",
          properties: {
            image1: {
              type: "string",
              description: "First image (e.g., 'nginx:latest')"
            },
            image2: {
              type: "string",
              description: "Second image (e.g., 'nginx:alpine')"
            }
          },
          required: ["image1", "image2"]
        },
      },
      {
        name: "docker_get_dockerfile",
        description: "Attempt to retrieve Dockerfile for an image (when available)",
        inputSchema: {
          type: "object",
          properties: {
            repository: {
              type: "string",
              description: "Docker repository name (e.g., 'library/nginx')"
            },
            tag: {
              type: "string",
              description: "Image tag (e.g., 'latest')",
              default: "latest"
            }
          },
          required: ["repository"]
        },
      },
      {
        name: "docker_get_stats",
        description: "Get download statistics and popularity metrics for an image",
        inputSchema: {
          type: "object",
          properties: {
            repository: {
              type: "string",
              description: "Docker repository name (e.g., 'library/nginx')"
            }
          },
          required: ["repository"]
        },
      },
      {
        name: "docker_get_vulnerabilities",
        description: "Fetch security scan results for a Docker image",
        inputSchema: {
          type: "object",
          properties: {
            repository: {
              type: "string",
              description: "Docker repository name (e.g., 'library/nginx')"
            },
            tag: {
              type: "string",
              description: "Image tag (e.g., 'latest')",
              default: "latest"
            }
          },
          required: ["repository"]
        },
      },
      {
        name: "docker_get_image_history",
        description: "Get image build history and creation details",
        inputSchema: {
          type: "object",
          properties: {
            repository: {
              type: "string",
              description: "Docker repository name (e.g., 'library/nginx')"
            },
            tag: {
              type: "string",
              description: "Image tag (e.g., 'latest')",
              default: "latest"
            }
          },
          required: ["repository"]
        },
      },
      {
        name: "docker_track_base_updates",
        description: "Check if base images have updates available",
        inputSchema: {
          type: "object",
          properties: {
            repository: {
              type: "string",
              description: "Docker repository name (e.g., 'library/nginx')"
            },
            tag: {
              type: "string",
              description: "Image tag (e.g., 'latest')",
              default: "latest"
            }
          },
          required: ["repository"]
        },
      },
      {
        name: "docker_estimate_pull_size",
        description: "Calculate estimated download size for pulling an image",
        inputSchema: {
          type: "object",
          properties: {
            repository: {
              type: "string",
              description: "Docker repository name (e.g., 'library/nginx')"
            },
            tag: {
              type: "string",
              description: "Image tag (e.g., 'latest')",
              default: "latest"
            }
          },
          required: ["repository"]
        },
      },
    ];
  }

  /**
   * Handle tool calls
   */
  async callTool(name: string, arguments_: any): Promise<any> {
    try {
      switch (name) {
        case "docker_search_images":
          return await this.searchImages(arguments_);

        case "docker_get_image_details":
          return await this.getImageDetails(arguments_);

        case "docker_list_tags":
          return await this.listTags(arguments_);

        case "docker_get_manifest":
          return await this.getManifest(arguments_);

        case "docker_analyze_layers":
          return await this.analyzeLayers(arguments_);

        case "docker_compare_images":
          return await this.compareImages(arguments_);

        case "docker_get_dockerfile":
          return await this.getDockerfile(arguments_);

        case "docker_get_stats":
          return await this.getStats(arguments_);

        case "docker_get_vulnerabilities":
          return await this.getVulnerabilities(arguments_);

        case "docker_get_image_history":
          return await this.getImageHistory(arguments_);

        case "docker_track_base_updates":
          return await this.trackBaseUpdates(arguments_);

        case "docker_estimate_pull_size":
          return await this.estimatePullSize(arguments_);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logError(error as Error, { tool: name, arguments: arguments_ });
      throw error;
    }
  }

  /**
   * Search Docker images
   */
  private async searchImages(args: any) {
    const { query, limit, page, is_official, is_automated } = args;
    
    const filters: any = {};
    if (is_official !== undefined) filters.is_official = is_official;
    if (is_automated !== undefined) filters.is_automated = is_automated;

    const result = await this.apiService.searchImages(query, limit, page, filters);
    
    return {
      success: true,
      data: {
        results: result.results,
        total_count: result.count,
        page,
        limit,
        query,
        filters,
      },
    };
  }

  /**
   * Get image details
   */
  private async getImageDetails(args: any) {
    const { repository, tag } = args;
    
    const result = await this.apiService.getImageDetails(repository, tag);
    
    return {
      success: true,
      data: {
        image: result,
        repository,
        tag,
      },
    };
  }

  /**
   * List image tags
   */
  private async listTags(args: any) {
    const { repository, limit, page } = args;
    
    const result = await this.apiService.listTags(repository, limit, page);
    
    return {
      success: true,
      data: {
        tags: result.results,
        total_count: result.count,
        repository,
        page,
        limit,
      },
    };
  }

  /**
   * Get image manifest
   */
  private async getManifest(args: any) {
    const { repository, tag } = args;
    
    const result = await this.apiService.getManifest(repository, tag);
    
    return {
      success: true,
      data: {
        manifest: result,
        repository,
        tag,
        layer_count: result.fsLayers.length,
        architecture: result.architecture,
      },
    };
  }

  /**
   * Analyze image layers
   */
  private async analyzeLayers(args: any) {
    const { repository, tag } = args;
    
    const analysis = await this.apiService.analyzeLayers(repository, tag);
    
    return {
      success: true,
      data: {
        analysis: {
          total_layers: analysis.total_layers,
          layers: analysis.layers,
          total_estimated_size: analysis.total_size,
          architecture: analysis.architecture,
          os: analysis.layers[0]?.os || "unknown",
          variants: analysis.variants,
          total_size_mb: analysis.total_size_mb,
          note: analysis.note
        },
        repository,
        tag,
      },
    };
  }

  /**
   * Compare two images
   */
  private async compareImages(args: any) {
    const { image1, image2 } = args;
    
    const result = await this.apiService.compareImages(image1, image2);
    
    return {
      success: true,
      data: {
        comparison: result.comparison,
        image1: result.image1,
        image2: result.image2,
        summary: {
          efficiency_percentage: result.comparison.layerEfficiency.toFixed(2),
          common_layers: result.comparison.commonLayers,
          unique_layers_image1: result.comparison.uniqueToImage1,
          unique_layers_image2: result.comparison.uniqueToImage2,
          size_difference_mb: result.comparison.sizeDifferenceMB,
          total_layers_image1: result.comparison.totalLayersImage1,
          total_layers_image2: result.comparison.totalLayersImage2,
        },
      },
    };
  }

  /**
   * Get Dockerfile
   */
  private async getDockerfile(args: any) {
    const { repository, tag } = args;
    
    const result = await this.apiService.getDockerfile(repository, tag);
    
    if (result) {
      return {
        success: true,
        data: {
          dockerfile: result,
          repository,
          tag,
          available: true,
        },
      };
    } else {
      return {
        success: true,
        data: {
          dockerfile: null,
          repository,
          tag,
          available: false,
          message: "Dockerfile not available for this image",
        },
      };
    }
  }

  /**
   * Get image statistics
   */
  private async getStats(args: any) {
    const { repository } = args;
    
    const result = await this.apiService.getStats(repository);
    
    return {
      success: true,
      data: {
        stats: result,
        repository,
        popularity_score: (result.pull_count * 0.7 + result.star_count * 0.3) / 1000,
      },
    };
  }

  /**
   * Get vulnerabilities
   */
  private async getVulnerabilities(args: any) {
    const { repository, tag, severity } = args;
    
    const result = await this.apiService.getVulnerabilities(repository, tag, severity);
    
    const severityCounts = result.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      success: true,
      data: {
        vulnerabilities: result,
        repository,
        tag,
        total_count: result.length,
        severity_counts: severityCounts,
        has_critical: (severityCounts.critical ?? 0) > 0,
        has_high: (severityCounts.high ?? 0) > 0,
      },
    };
  }

  /**
   * Get image history
   */
  private async getImageHistory(args: any) {
    const { repository, tag } = args;
    
    const result = await this.apiService.getImageHistory(repository, tag);
    
    return {
      success: true,
      data: {
        history: result,
        repository,
        tag,
        total_entries: result.length,
      },
    };
  }

  /**
   * Track base updates
   */
  private async trackBaseUpdates(args: any) {
    const { repository, tag } = args;
    
    const result = await this.apiService.checkBaseImageUpdates(repository, tag);
    
    return {
      success: true,
      data: {
        updates: result,
        repository,
        tag,
        recommendation: result.hasUpdates 
          ? "Consider updating to the latest version" 
          : "Image is up to date",
      },
    };
  }

  /**
   * Estimate pull size
   */
  private async estimatePullSize(args: any) {
    const { repository, tag } = args;
    
    const result = await this.apiService.estimatePullSize(repository, tag);
    
    return {
      success: true,
      data: {
        estimated_size_bytes: result,
        estimated_size_mb: (result / (1024 * 1024)).toFixed(2),
        estimated_size_gb: (result / (1024 * 1024 * 1024)).toFixed(3),
        repository,
        tag,
        note: "This is a rough estimate based on layer count",
      },
    };
  }
} 