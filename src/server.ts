import {
  Server,
  StdioServerTransport,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "./types/mcp.js";
import { config, validateConfig, getDefaultRegistry } from "./config/index.js";
import { CacheService } from "./services/cache.js";
import { RateLimiterService } from "./services/rate-limiter.js";
import { DockerHubApiService } from "./services/dockerhub-api.js";
import { DockerHubTools } from "./tools/index.js";
import { logger, logError } from "./utils/logger.js";

class DockerHubMCPServer {
  private server: Server;
  private tools: DockerHubTools;
  private cache: CacheService;
  private rateLimiter: RateLimiterService;
  private apiService: DockerHubApiService;

  constructor() {
    // Validate configuration
    validateConfig();

    // Initialize services
    this.cache = new CacheService(config.cache);
    this.rateLimiter = new RateLimiterService(config.rateLimit);
    
    const defaultRegistry = getDefaultRegistry();
    this.apiService = new DockerHubApiService(defaultRegistry, this.cache, this.rateLimiter);
    
    this.tools = new DockerHubTools(this.apiService, this.cache, this.rateLimiter);

    // Create MCP server
    this.server = new Server(
      {
        name: "dockerhub-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Set up server handlers
    this.setupHandlers();

    logger.info("DockerHub MCP Server initialized", {
      version: "1.0.0",
      registries: config.registries.length,
      cacheEnabled: true,
      rateLimitEnabled: true,
    });
  }

  private setupHandlers(): void {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug("Handling list tools request");
      return {
        tools: this.tools.getTools(),
      };
    });

    // Handle call tool request
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      
      logger.info("Handling tool call", { tool: name, arguments: args });
      
      try {
        const result = await this.tools.callTool(name, args);
        
        logger.debug("Tool call completed successfully", { tool: name });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logError(error as Error, { tool: name, arguments: args });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: (error as Error).message,
                  tool: name,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    });

    // Handle resources/list request (for Claude compatibility)
    this.server.setRequestHandler({ method: "resources/list" }, async () => {
      logger.debug("Handling resources/list request");
      return {
        resources: [], // DockerHub MCP server doesn't provide resources
      };
    });

    // Handle prompts/list request (for Claude compatibility)
    this.server.setRequestHandler({ method: "prompts/list" }, async () => {
      logger.debug("Handling prompts/list request");
      return {
        prompts: [], // DockerHub MCP server doesn't provide prompts
      };
    });

    // Handle server shutdown
    process.on("SIGINT", () => {
      logger.info("Received SIGINT, shutting down gracefully");
      this.shutdown();
    });

    process.on("SIGTERM", () => {
      logger.info("Received SIGTERM, shutting down gracefully");
      this.shutdown();
    });
  }

  async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info("DockerHub MCP Server started successfully");
      logger.info("Available tools:", {
        tools: this.tools.getTools().map(t => t.name),
      });
    } catch (error) {
      logError(error as Error, { context: "server_start" });
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    try {
      logger.info("Shutting down DockerHub MCP Server");
  
      // Clean up resources
      this.cache.flush();
      
      // Close server connection
      await this.server.close();
      
      logger.info("DockerHub MCP Server shutdown complete");
      process.exit(0);
    } catch (error) {
      logError(error as Error, { context: "server_shutdown" });
      process.exit(1);
    }
  }

  // Health check method
  getHealthStatus(): any {
    return {
      status: "healthy",
      version: "1.0.0",
      uptime: process.uptime(),
      cache: this.cache.getStats(),
      rateLimit: this.rateLimiter.getStats(),
      tools: this.tools.getTools().length,
    };
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new DockerHubMCPServer();
  server.start().catch((error) => {
    logError(error, { context: "main" });
    process.exit(1);
  });
}

export { DockerHubMCPServer }; 