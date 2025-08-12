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

  constructor(
    serverInfo: { name: string; version: string },
    capabilities: { capabilities: { tools: {} } }
  ) {}

  setRequestHandler(schema: any, handler: (request: any) => Promise<any>): void {
    this.handlers.set(schema.method, handler);
  }

  async connect(transport: any): Promise<void> {
    // Set up stdin/stdout handling
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', async (data) => {
      let request: any;
      try {
        request = JSON.parse(data.toString().trim());
        await this.handleRequest(request);
      } catch (error) {
        this.sendError(request?.id, error);
      }
    });
  }

  async close(): Promise<void> {
    process.exit(0);
  }

  private async handleRequest(request: any): Promise<void> {
    const { id, method, params } = request;
    
    if (!id) {
      return; // Ignore notifications
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