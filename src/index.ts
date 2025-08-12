#!/usr/bin/env node

import { DockerHubMCPServer } from "./server.js";
import { logger } from "./utils/logger.js";

async function main() {
  try {
    logger.info("Starting DockerHub MCP Server...");
    
    const server = new DockerHubMCPServer();
    await server.start();
    
    // Keep the process alive
    process.stdin.resume();
  } catch (error) {
    logger.error("Failed to start DockerHub MCP Server", { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled promise rejection", { reason, promise });
  process.exit(1);
});

// Start the application
main(); 