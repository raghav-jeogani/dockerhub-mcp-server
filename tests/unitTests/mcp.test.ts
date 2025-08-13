import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Server } from '../../src/types/mcp.js';

// Mock process.stdin and process.stdout
const mockStdin = {
  setEncoding: jest.fn(),
  on: jest.fn(),
};

const mockStdout = {
  write: jest.fn(),
};

const mockProcess = {
  stdin: mockStdin,
  stdout: mockStdout,
  exit: jest.fn(),
  on: jest.fn(),
};

// Mock process globally
global.process = mockProcess as any;

describe('MCP Server', () => {
  let server: Server;
  let mockTransport: any;

  beforeEach(() => {
    const serverInfo = {
      name: 'test-server',
      version: '1.0.0',
    };

    const capabilities = {
      capabilities: {
        tools: {},
      },
    };

    server = new Server(serverInfo, capabilities);
    mockTransport = {};

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with server info and capabilities', () => {
      expect(server).toBeDefined();
    });

    it('should have empty handlers map initially', () => {
      expect((server as any).handlers.size).toBe(0);
    });

    it('should not be initialized initially', () => {
      expect((server as any).isInitialized).toBe(false);
    });
  });

  describe('setRequestHandler', () => {
    it('should set request handler for method', () => {
      const schema = { method: 'test/method' };
      const handler = async () => ({ result: 'success' });

      server.setRequestHandler(schema, handler);

      expect((server as any).handlers.get('test/method')).toBe(handler);
    });

    it('should overwrite existing handler', () => {
      const schema = { method: 'test/method' };
      const handler1 = async () => ({ result: 'success1' });
      const handler2 = async () => ({ result: 'success2' });

      server.setRequestHandler(schema, handler1);
      server.setRequestHandler(schema, handler2);

      expect((server as any).handlers.get('test/method')).toBe(handler2);
    });
  });

  describe('connect', () => {
    it('should set up stdin handling', async () => {
      await server.connect(mockTransport);

      expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
      expect(mockStdin.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockStdin.on).toHaveBeenCalledWith('end', expect.any(Function));
    });

    it('should set up process signal handling', async () => {
      await server.connect(mockTransport);

      expect(mockProcess.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    });

    it('should handle stdin data events', async () => {
      await server.connect(mockTransport);

      const dataCall = mockStdin.on.mock.calls.find(call => call[0] === 'data');
      if (dataCall) {
        const dataHandler = dataCall[1] as (data: string) => void;
        const mockHandler = jest.fn().mockImplementation(async () => ({ result: 'success' })) as (request: any) => Promise<any>;
        
        server.setRequestHandler({ method: 'test/method' }, mockHandler);

        // First send initialize request
        const initRequest = {
          id: 0,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          },
        };
        dataHandler(JSON.stringify(initRequest) + '\n');

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 10));

        // Then send the test request
        const request = {
          id: 1,
          method: 'test/method',
          params: { test: 'data' },
        };

        dataHandler(JSON.stringify(request) + '\n');

        // Wait for async processing
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockHandler).toHaveBeenCalledWith(request);
      }
    });

    it('should handle multiple requests in single data chunk', async () => {
      await server.connect(mockTransport);

      const dataCall = mockStdin.on.mock.calls.find(call => call[0] === 'data');
      if (dataCall) {
        const dataHandler = dataCall[1] as (data: string) => void;
        const mockHandler = jest.fn().mockImplementation(async () => ({ result: 'success' })) as (request: any) => Promise<any>;
        
        server.setRequestHandler({ method: 'test/method' }, mockHandler);

        // First send initialize request
        const initRequest = {
          id: 0,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          },
        };
        dataHandler(JSON.stringify(initRequest) + '\n');

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 10));

        // Then send multiple requests
        const request1 = { id: 1, method: 'test/method', params: { test: 'data1' } };
        const request2 = { id: 2, method: 'test/method', params: { test: 'data2' } };

        dataHandler(JSON.stringify(request1) + '\n' + JSON.stringify(request2) + '\n');

        // Wait for async processing
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockHandler).toHaveBeenCalledTimes(2);
      }
    });

    it('should handle empty lines in data', async () => {
      await server.connect(mockTransport);

      const dataCall = mockStdin.on.mock.calls.find(call => call[0] === 'data');
      if (dataCall) {
        const dataHandler = dataCall[1] as (data: string) => void;
        const mockHandler = jest.fn().mockImplementation(async () => ({ result: 'success' })) as (request: any) => Promise<any>;
        
        server.setRequestHandler({ method: 'test/method' }, mockHandler);

        // First send initialize request
        const initRequest = {
          id: 0,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          },
        };
        dataHandler(JSON.stringify(initRequest) + '\n');

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 10));

        // Then send data with empty lines
        const request = { id: 1, method: 'test/method', params: { test: 'data' } };
        dataHandler('\n' + JSON.stringify(request) + '\n\n');

        // Wait for async processing
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockHandler).toHaveBeenCalledTimes(1);
      }
    });

    it('should handle invalid JSON gracefully', async () => {
      await server.connect(mockTransport);

      const dataCall = mockStdin.on.mock.calls.find(call => call[0] === 'data');
      if (dataCall) {
        const dataHandler = dataCall[1] as (data: string) => void;

        // Simulate invalid JSON
        dataHandler('invalid json\n');

        // Should not throw error
        expect(true).toBe(true);
      }
    });

    it('should handle stdin end event', async () => {
      await server.connect(mockTransport);

      const endCall = mockStdin.on.mock.calls.find(call => call[0] === 'end');
      if (endCall) {
        const endHandler = endCall[1] as () => void;
        
        endHandler();

        expect(mockProcess.exit).toHaveBeenCalledWith(0);
      }
    });

    it('should handle SIGINT signal', async () => {
      await server.connect(mockTransport);

      const sigintCall = mockProcess.on.mock.calls.find(call => call[0] === 'SIGINT');
      if (sigintCall) {
        const sigintHandler = sigintCall[1] as () => void;
        
        sigintHandler();

        expect(mockProcess.exit).toHaveBeenCalledWith(0);
      }
    });

    it('should handle SIGTERM signal', async () => {
      await server.connect(mockTransport);

      const sigtermCall = mockProcess.on.mock.calls.find(call => call[0] === 'SIGTERM');
      if (sigtermCall) {
        const sigtermHandler = sigtermCall[1] as () => void;
        
        sigtermHandler();

        expect(mockProcess.exit).toHaveBeenCalledWith(0);
      }
    });
  });

  describe('handleRequest', () => {
    beforeEach(async () => {
      await server.connect(mockTransport);
    });

    it('should handle initialize method', async () => {
      const request = {
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      };

      await (server as any).handleRequest(request);

      expect((server as any).isInitialized).toBe(true);
    });

    it('should handle notifications without id', async () => {
      const request = {
        method: 'notifications/cancelled',
        params: { notificationId: 1 },
      };

      // Should not throw error
      await (server as any).handleRequest(request);
      expect(true).toBe(true);
    });

    it('should handle unknown notifications', async () => {
      const request = {
        method: 'unknown/notification',
        params: {},
      };

      // Should not throw error
      await (server as any).handleRequest(request);
      expect(true).toBe(true);
    });

    it('should handle requests with registered handlers', async () => {
      const mockHandler = jest.fn().mockImplementation(async () => ({ result: 'success' })) as (request: any) => Promise<any>;
      server.setRequestHandler({ method: 'test/method' }, mockHandler);

      // Initialize the server first
      await (server as any).handleInitialize(1, {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      const request = {
        id: 1,
        method: 'test/method',
        params: { test: 'data' },
      };

      await (server as any).handleRequest(request);

      expect(mockHandler).toHaveBeenCalledWith(request);
    });

    it('should handle requests without registered handlers', async () => {
      // Initialize the server first
      await (server as any).handleInitialize(1, {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      const request = {
        id: 1,
        method: 'unknown/method',
        params: {},
      };

      // Should not throw error
      await (server as any).handleRequest(request);
      expect(true).toBe(true);
    });

    it('should handle handler errors gracefully', async () => {
      const mockHandler = jest.fn().mockImplementation(async () => {
        throw new Error('Handler error');
      }) as (request: any) => Promise<any>;
      server.setRequestHandler({ method: 'test/method' }, mockHandler);

      // Initialize the server first
      await (server as any).handleInitialize(1, {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      const request = {
        id: 1,
        method: 'test/method',
        params: {},
      };

      // Should not throw error
      await (server as any).handleRequest(request);
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('handleInitialize', () => {
    beforeEach(async () => {
      await server.connect(mockTransport);
    });

    it('should handle initialize request', async () => {
      const requestId = 1;
      const params = {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      };

      await (server as any).handleInitialize(requestId, params);

      expect((server as any).isInitialized).toBe(true);
    });

    it('should send initialize response', async () => {
      const requestId = 1;
      const params = {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      };

      await (server as any).handleInitialize(requestId, params);

      // Verify response was sent
      expect(mockStdout.write).toHaveBeenCalled();
    });
  });

  describe('sendResponse', () => {
    beforeEach(async () => {
      await server.connect(mockTransport);
    });

    it('should send successful response', () => {
      const id = 1;
      const result = { data: 'success' };

      (server as any).sendResponse(id, result);

      expect(mockStdout.write).toHaveBeenCalledWith(
        JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n'
      );
    });

    it('should send error response', () => {
      const id = 1;
      const error = new Error('Method not found');

      (server as any).sendError(id, error, -32601);

      expect(mockStdout.write).toHaveBeenCalledWith(
        JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } }) + '\n'
      );
    });

    it('should send notification', () => {
      const method = 'test/notification';
      const params = { data: 'notification' };

      (server as any).sendNotification(method, params);

      expect(mockStdout.write).toHaveBeenCalledWith(
        JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n'
      );
    });
  });

  describe('close', () => {
    it('should exit process when closed', async () => {
      await server.close();

      expect(mockProcess.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('MCP Protocol Compliance', () => {
    beforeEach(async () => {
      await server.connect(mockTransport);
    });

    it('should handle tools/list request', async () => {
      const mockHandler = jest.fn().mockImplementation(async () => ({
        tools: [
          {
            name: 'test-tool',
            description: 'A test tool',
            inputSchema: {},
          },
        ],
      })) as (request: any) => Promise<any>;

      server.setRequestHandler({ method: 'tools/list' }, mockHandler);

      // Initialize the server first
      await (server as any).handleInitialize(1, {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      const request = {
        id: 1,
        method: 'tools/list',
        params: {},
      };

      await (server as any).handleRequest(request);

      expect(mockHandler).toHaveBeenCalledWith(request);
    });

    it('should handle tools/call request', async () => {
      const mockHandler = jest.fn().mockImplementation(async () => ({
        content: [
          {
            type: 'text',
            text: 'Test response',
          },
        ],
      })) as (request: any) => Promise<any>;

      server.setRequestHandler({ method: 'tools/call' }, mockHandler);

      // Initialize the server first
      await (server as any).handleInitialize(1, {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      const request = {
        id: 1,
        method: 'tools/call',
        params: {
          name: 'test_tool',
          arguments: { test: 'data' },
        },
      };

      await (server as any).handleRequest(request);

      expect(mockHandler).toHaveBeenCalledWith(request);
    });

    it('should handle ping request', async () => {
      const request = {
        id: 1,
        method: 'ping',
        params: {},
      };

      await (server as any).handleRequest(request);

      // Should send pong response
      expect(mockStdout.write).toHaveBeenCalledWith(
        JSON.stringify({ jsonrpc: '2.0', id: 1, result: { pong: true } }) + '\n'
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await server.connect(mockTransport);
    });

    it('should handle JSON parse errors', async () => {
      const dataCall = mockStdin.on.mock.calls.find(call => call[0] === 'data');
      if (dataCall) {
        const dataHandler = dataCall[1] as (data: string) => void;

        // Simulate malformed JSON
        dataHandler('{"invalid": json}\n');

        // Should not throw error
        expect(true).toBe(true);
      }
    });

    it('should handle handler exceptions', async () => {
      const mockHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler exception');
      }) as (request: any) => Promise<any>;

      server.setRequestHandler({ method: 'test/method' }, mockHandler);

      // Initialize the server first
      await (server as any).handleInitialize(1, {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      const request = {
        id: 1,
        method: 'test/method',
        params: {},
      };

      // Should not throw error
      await (server as any).handleRequest(request);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should handle async handler rejections', async () => {
      const mockHandler = jest.fn().mockImplementation(async () => {
        throw new Error('Async handler error');
      }) as (request: any) => Promise<any>;

      server.setRequestHandler({ method: 'test/method' }, mockHandler);

      // Initialize the server first
      await (server as any).handleInitialize(1, {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      const request = {
        id: 1,
        method: 'test/method',
        params: {},
      };

      // Should not throw error
      await (server as any).handleRequest(request);
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await server.connect(mockTransport);
    });

    it('should handle high-frequency requests', async () => {
      const mockHandler = jest.fn().mockImplementation(async () => ({ result: 'success' })) as (request: any) => Promise<any>;
      server.setRequestHandler({ method: 'test/method' }, mockHandler);

      // Initialize the server first
      await (server as any).handleInitialize(1, {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push({
          id: i + 1,
          method: 'test/method',
          params: { index: i },
        });
      }

      // Process all requests
      for (const request of requests) {
        await (server as any).handleRequest(request);
      }

      expect(mockHandler).toHaveBeenCalledTimes(100);
    });

    it('should handle large request payloads', async () => {
      const mockHandler = jest.fn().mockImplementation(async () => ({ result: 'success' })) as (request: any) => Promise<any>;
      server.setRequestHandler({ method: 'test/method' }, mockHandler);

      // Initialize the server first
      await (server as any).handleInitialize(1, {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      const largePayload = Array(1000).fill('data');
      const request = {
        id: 1,
        method: 'test/method',
        params: largePayload,
      };

      await (server as any).handleRequest(request);

      expect(mockHandler).toHaveBeenCalledWith(request);
    });
  });
}); 