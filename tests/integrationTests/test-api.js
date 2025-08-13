#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing DockerHub MCP Server API Calls...\n');

// Test 1: Search for images (this will make API calls)
const searchRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "docker_search_images",
    arguments: {
      query: "nginx",
      limit: 3
    }
  }
};

console.log('1️⃣ Testing docker_search_images...');
console.log('Request:', JSON.stringify(searchRequest, null, 2));

const server = spawn('node', [join(__dirname, 'dist/index.js')], {
  stdio: ['pipe', 'pipe', 'pipe']
});

server.stdin.write(JSON.stringify(searchRequest) + '\n');

server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  console.log('\n✅ Response received:');
  
  try {
    const parsedResponse = JSON.parse(response);
    console.log(JSON.stringify(parsedResponse, null, 2));
    
    if (parsedResponse.result && parsedResponse.result.data) {
      console.log('\n📊 API Call Results:');
      console.log(`- Found ${parsedResponse.result.data.total_count} images`);
      console.log(`- Showing ${parsedResponse.result.data.results.length} results`);
      
      if (parsedResponse.result.data.results.length > 0) {
        console.log('\n🔍 First image found:');
        const firstImage = parsedResponse.result.data.results[0];
        console.log(`- Name: ${firstImage.name}`);
        console.log(`- Description: ${firstImage.description}`);
        console.log(`- Stars: ${firstImage.star_count}`);
        console.log(`- Pulls: ${firstImage.pull_count}`);
      }
    }
  } catch (error) {
    console.log('❌ Error parsing response:', error.message);
    console.log('Raw response:', response);
  }
  
  // Test 2: Get image details
  setTimeout(() => {
    console.log('\n2️⃣ Testing docker_get_image_details...');
    const detailsRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "docker_get_image_details",
        arguments: {
          repository: "library/nginx",
          tag: "latest"
        }
      }
    };
    
    console.log('Request:', JSON.stringify(detailsRequest, null, 2));
    server.stdin.write(JSON.stringify(detailsRequest) + '\n');
  }, 1000);
});

// Handle second response
let responseCount = 0;
server.stdout.on('data', (data) => {
  responseCount++;
  if (responseCount === 2) {
    const response = data.toString().trim();
    console.log('\n✅ Image Details Response:');
    
    try {
      const parsedResponse = JSON.parse(response);
      console.log(JSON.stringify(parsedResponse, null, 2));
      
      if (parsedResponse.result && parsedResponse.result.data) {
        console.log('\n📊 Image Details:');
        const image = parsedResponse.result.data.image;
        console.log(`- Repository: ${image.name}`);
        console.log(`- Description: ${image.description}`);
        console.log(`- Stars: ${image.star_count}`);
        console.log(`- Pulls: ${image.pull_count}`);
        console.log(`- Official: ${image.is_official}`);
        console.log(`- Automated: ${image.is_automated}`);
      }
    } catch (error) {
      console.log('❌ Error parsing response:', error.message);
      console.log('Raw response:', response);
    }
    
    console.log('\n🎉 API testing completed!');
    server.kill();
    process.exit(0);
  }
});

// Handle errors
server.stderr.on('data', (data) => {
  console.error('❌ Server error:', data.toString());
});

// Handle server exit
server.on('close', (code) => {
  console.log(`\n🔚 Server exited with code ${code}`);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('\n⏰ Test timeout - killing server');
  server.kill();
  process.exit(1);
}, 15000); 