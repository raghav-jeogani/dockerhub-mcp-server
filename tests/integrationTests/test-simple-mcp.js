#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🧪 Simple MCP Test\n');

const server = spawn('node', ['dist/index.js'], { 
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

server.stderr.on('data', (data) => {
  const logLine = data.toString();
  console.log('🔍 Server stderr:', logLine.trim());
});

server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  console.log('📥 Server stdout:', response);
});

// Send initialize request first
const initializeRequest = {
  jsonrpc: "2.0",
  id: 0,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: {
      name: "claude-ai",
      version: "0.1.0"
    }
  }
};

// Send tools/call request
const testRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "docker_search_images",
    arguments: {
      query: "python",
      limit: 1
    }
  }
};

setTimeout(() => {
  console.log('📤 Sending initialize request');
  server.stdin.write(JSON.stringify(initializeRequest) + '\n');
}, 1000);

setTimeout(() => {
  console.log('📤 Sending test request:', JSON.stringify(testRequest, null, 2));
  server.stdin.write(JSON.stringify(testRequest) + '\n');
}, 2000);

setTimeout(() => {
  console.log('⏰ Test timeout');
  server.kill();
  process.exit(0);
}, 10000); 