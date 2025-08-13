// Simple MCP SDK implementation for JSON-RPC over stdio
export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface Server {
  setRequestHandler(schema: any, handler: (request: any) => Promise<any>): void;
  connect(transport: any): Promise<void>;
  close(): Promise<void>;
}

export interface StdioServerTransport {
  // Transport implementation
}

export const CallToolRequestSchema = {
  method: "tools/call"
};

export const ListToolsRequestSchema = {
  method: "tools/list"
};

export class Server {
  private handlers: Map<string, (request: any) => Promise<any>> = new Map();
  private serverInfo: { name: string; version: string };
  private capabilities: { capabilities: { tools: {} } };
  private isInitialized: boolean = false;

  constructor(
    serverInfo: { name: string; version: string },
    capabilities: { capabilities: { tools: {} } }
  ) {
    this.serverInfo = serverInfo;
    this.capabilities = capabilities;
  }

  setRequestHandler(schema: any, handler: (request: any) => Promise<any>): void {
    this.handlers.set(schema.method, handler);
  }

  async connect(transport: any): Promise<void> {
    // Set up stdin/stdout handling
    process.stdin.setEncoding('utf8');
    
    // Handle data from stdin
    process.stdin.on('data', async (data) => {
      const lines = data.toString().split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          try {
            const request = JSON.parse(trimmedLine);
            await this.handleRequest(request);
          } catch (error) {
            // Don't send error response for parsing errors on notifications
          }
        }
      }
    });

    // Handle stdin end
    process.stdin.on('end', () => {
      process.exit(0);
    });

    // Handle process signals
    process.on('SIGINT', () => {
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      process.exit(0);
    });
  }

  async close(): Promise<void> {
    process.exit(0);
  }

  private async handleRequest(request: any): Promise<void> {
    const { id, method, params } = request;
    
    // Handle notifications (no id)
    if (id === undefined) {
      if (method === "notifications/cancelled") {
        return;
      }
      return; // Ignore other notifications
    }

    // Handle initialize method (required by MCP protocol)
    if (method === "initialize") {
      await this.handleInitialize(id, params);
      return;
    }

    // Only allow other methods after initialization
    if (!this.isInitialized && method !== "initialize") {
      this.sendError(id, new Error("Server not initialized"));
      return;
    }

    const handler = this.handlers.get(method);
    if (!handler) {
      this.sendError(id, new Error(`Method not found: ${method}`));
      return;
    }

    try {
      const result = await handler({ params });
      this.sendResponse(id, result);
    } catch (error) {
      this.sendError(id, error);
    }
  }

  private async handleInitialize(id: any, params: any): Promise<void> {
    try {
      // Respond to initialize request with server info and capabilities
      const response = {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2025-06-18",
          capabilities: this.capabilities,
          serverInfo: this.serverInfo
        }
      };
      
      process.stdout.write(JSON.stringify(response) + '\n');
      
      // Send initialized notification
      const initializedNotification = {
        jsonrpc: "2.0",
        method: "initialized",
        params: {}
      };
      
      process.stdout.write(JSON.stringify(initializedNotification) + '\n');
      
      this.isInitialized = true;
    } catch (error) {
      this.sendError(id, error);
    }
  }

  private sendResponse(id: any, result: any): void {
    const response = {
      jsonrpc: "2.0",
      id,
      result
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  private sendError(id: any, error: any): void {
    const response = {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: error.message || "Internal error"
      }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }
}

export class StdioServerTransport {
  constructor() {}
} 