#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🔐 Testing DockerHub Authentication...\n');

// Test with a public search (should work without auth)
const publicSearchRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "docker_search_images",
    arguments: {
      query: "hello-world",
      limit: 5
    }
  }
};

console.log('1️⃣ Testing public search (should work without auth)...');
console.log('Request:', JSON.stringify(publicSearchRequest, null, 2));

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

server.stdin.write(JSON.stringify(publicSearchRequest) + '\n');

server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  console.log('\n✅ Response received:');
  
  try {
    const parsedResponse = JSON.parse(response);
    console.log(JSON.stringify(parsedResponse, null, 2));
    
    if (parsedResponse.result && parsedResponse.result.content) {
      const content = JSON.parse(parsedResponse.result.content[0].text);
      console.log('\n📊 Search Results:');
      console.log(`- Success: ${content.success}`);
      console.log(`- Total count: ${content.data.total_count}`);
      console.log(`- Results found: ${content.data.results.length}`);
      
      if (content.data.results.length > 0) {
        console.log('\n🔍 First result:');
        const first = content.data.results[0];
        console.log(`- Name: ${first.name}`);
        console.log(`- Description: ${first.description}`);
        console.log(`- Stars: ${first.star_count}`);
      }
    }
  } catch (error) {
    console.log('❌ Error parsing response:', error.message);
    console.log('Raw response:', response);
  }
  
  // Test 2: Try to get image details (requires auth)
  setTimeout(() => {
    console.log('\n2️⃣ Testing authenticated request...');
    const authRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "docker_get_image_details",
        arguments: {
          repository: "library/hello-world",
          tag: "latest"
        }
      }
    };
    
    console.log('Request:', JSON.stringify(authRequest, null, 2));
    server.stdin.write(JSON.stringify(authRequest) + '\n');
  }, 1000);
});

// Handle second response
let responseCount = 0;
server.stdout.on('data', (data) => {
  responseCount++;
  if (responseCount === 2) {
    const response = data.toString().trim();
    console.log('\n✅ Auth Response:');
    
    try {
      const parsedResponse = JSON.parse(response);
      console.log(JSON.stringify(parsedResponse, null, 2));
      
      if (parsedResponse.result && parsedResponse.result.content) {
        const content = JSON.parse(parsedResponse.result.content[0].text);
        console.log('\n🔐 Authentication Status:');
        console.log(`- Success: ${content.success}`);
        if (!content.success) {
          console.log(`- Error: ${content.error}`);
          console.log('\n💡 To fix authentication:');
          console.log('1. Check if your DockerHub token is valid');
          console.log('2. Generate a new token at https://hub.docker.com/settings/security');
          console.log('3. Update the DOCKERHUB_TOKEN in your .env file');
        } else {
          console.log('✅ Authentication successful!');
        }
      }
    } catch (error) {
      console.log('❌ Error parsing response:', error.message);
      console.log('Raw response:', response);
    }
    
    console.log('\n🎉 Authentication test completed!');
    server.kill();
    process.exit(0);
  }
});

// Handle errors
server.stderr.on('data', (data) => {
  // Only show errors, not info logs
  const logLine = data.toString();
  if (logLine.includes('error:')) {
    console.error('❌ Server error:', logLine);
  }
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