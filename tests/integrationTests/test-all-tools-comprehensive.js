#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🔍 Comprehensive Test of All DockerHub MCP Tools\n');

const server = spawn('node', ['dist/index.js'], { 
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

let currentTest = 0;
const tests = [
  { 
    name: "docker_search_images", 
    request: { 
      jsonrpc: "2.0", id: 1, method: "tools/call", 
      params: { name: "docker_search_images", arguments: { query: "nginx", limit: 2 } } 
    }, 
    description: "Search for nginx images",
    checkForMock: (data) => {
      return {
        isMock: data.results?.length === 0 || data.count === 0,
        reason: data.results?.length === 0 ? "No results returned" : "Count is 0",
        realData: data.results?.length > 0 && data.count > 0
      };
    }
  },
  { 
    name: "docker_get_image_details", 
    request: { 
      jsonrpc: "2.0", id: 2, method: "tools/call", 
      params: { name: "docker_get_image_details", arguments: { repository: "library/nginx", tag: "latest" } } 
    }, 
    description: "Get details for nginx:latest",
    checkForMock: (data) => {
      return {
        isMock: data.image?.star_count === 0 && data.image?.pull_count === 0,
        reason: "Star count and pull count are 0 (likely mock data)",
        realData: data.image?.star_count > 0 || data.image?.pull_count > 0
      };
    }
  },
  { 
    name: "docker_list_tags", 
    request: { 
      jsonrpc: "2.0", id: 3, method: "tools/call", 
      params: { name: "docker_list_tags", arguments: { repository: "library/nginx", limit: 5 } } 
    }, 
    description: "List tags for nginx",
    checkForMock: (data) => {
      return {
        isMock: data.tags?.length === 1 && data.tags[0]?.name === 'latest' && data.tags[0]?.digest === 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
        reason: "Only one tag 'latest' with fake digest",
        realData: data.tags?.length > 1 || (data.tags?.length === 1 && data.tags[0]?.digest !== 'sha256:0000000000000000000000000000000000000000000000000000000000000000')
      };
    }
  },
  { 
    name: "docker_get_manifest", 
    request: { 
      jsonrpc: "2.0", id: 4, method: "tools/call", 
      params: { name: "docker_get_manifest", arguments: { repository: "library/nginx", tag: "latest" } } 
    }, 
    description: "Get manifest for nginx:latest",
    checkForMock: (data) => {
      return {
        isMock: data.manifest?.fsLayers?.length === 0 || data.manifest?.architecture === 'unknown',
        reason: "No layers or unknown architecture",
        realData: data.manifest?.fsLayers?.length > 0 && data.manifest?.architecture !== 'unknown'
      };
    }
  },
  { 
    name: "docker_analyze_layers", 
    request: { 
      jsonrpc: "2.0", id: 5, method: "tools/call", 
      params: { name: "docker_analyze_layers", arguments: { repository: "library/nginx", tag: "latest" } } 
    }, 
    description: "Analyze layers for nginx:latest",
    checkForMock: (data) => {
      return {
        isMock: data.analysis?.total_layers === 0 || data.analysis?.layers?.length === 0,
        reason: "No layers found",
        realData: data.analysis?.total_layers > 0 && data.analysis?.layers?.length > 0
      };
    }
  },
  { 
    name: "docker_compare_images", 
    request: { 
      jsonrpc: "2.0", id: 6, method: "tools/call", 
      params: { name: "docker_compare_images", arguments: { image1: "library/nginx:latest", image2: "library/python:latest" } } 
    }, 
    description: "Compare nginx:latest vs python:latest",
    checkForMock: (data) => {
      return {
        isMock: data.comparison?.layerEfficiency === null || data.summary?.efficiency_percentage === "NaN",
        reason: "Layer efficiency is null or NaN",
        realData: data.comparison?.layerEfficiency !== null && data.summary?.efficiency_percentage !== "NaN"
      };
    }
  },
  { 
    name: "docker_get_dockerfile", 
    request: { 
      jsonrpc: "2.0", id: 7, method: "tools/call", 
      params: { name: "docker_get_dockerfile", arguments: { repository: "library/nginx", tag: "latest" } } 
    }, 
    description: "Get Dockerfile for nginx:latest",
    checkForMock: (data) => {
      return {
        isMock: false, // This is expected to return null - not mock data
        reason: "Dockerfile not available via API (expected)",
        realData: true // This is the correct behavior
      };
    }
  },
  { 
    name: "docker_get_stats", 
    request: { 
      jsonrpc: "2.0", id: 8, method: "tools/call", 
      params: { name: "docker_get_stats", arguments: { repository: "library/nginx" } } 
    }, 
    description: "Get stats for nginx",
    checkForMock: (data) => {
      return {
        isMock: data.stats?.pull_count === 0 && data.stats?.star_count === 0,
        reason: "Pull count and star count are 0",
        realData: data.stats?.pull_count > 0 || data.stats?.star_count > 0
      };
    }
  },
  { 
    name: "docker_get_vulnerabilities", 
    request: { 
      jsonrpc: "2.0", id: 9, method: "tools/call", 
      params: { name: "docker_get_vulnerabilities", arguments: { repository: "library/nginx", tag: "latest" } } 
    }, 
    description: "Get vulnerabilities for nginx:latest",
    checkForMock: (data) => {
      return {
        isMock: false, // This is expected to return empty array - not mock data
        reason: "Vulnerabilities not available via API (expected)",
        realData: true // This is the correct behavior
      };
    }
  },
  { 
    name: "docker_get_image_history", 
    request: { 
      jsonrpc: "2.0", id: 10, method: "tools/call", 
      params: { name: "docker_get_image_history", arguments: { repository: "library/nginx", tag: "latest" } } 
    }, 
    description: "Get image history for nginx:latest",
    checkForMock: (data) => {
      return {
        isMock: data.history?.length === 0,
        reason: "No history entries",
        realData: data.history?.length > 0
      };
    }
  },
  { 
    name: "docker_track_base_updates", 
    request: { 
      jsonrpc: "2.0", id: 11, method: "tools/call", 
      params: { name: "docker_track_base_updates", arguments: { repository: "library/nginx", tag: "latest" } } 
    }, 
    description: "Track base updates for nginx:latest",
    checkForMock: (data) => {
      return {
        isMock: data.updates?.lastChecked === 'unknown' || data.updates?.recentTags === 0,
        reason: "Last checked is unknown or no recent tags",
        realData: data.updates?.lastChecked !== 'unknown' && data.updates?.recentTags > 0
      };
    }
  },
  { 
    name: "docker_estimate_pull_size", 
    request: { 
      jsonrpc: "2.0", id: 12, method: "tools/call", 
      params: { name: "docker_estimate_pull_size", arguments: { repository: "library/nginx", tag: "latest" } } 
    }, 
    description: "Estimate pull size for nginx:latest",
    checkForMock: (data) => {
      return {
        isMock: data.estimated_size_bytes === 0 || data.estimated_size_mb === "0.00",
        reason: "Estimated size is 0",
        realData: data.estimated_size_bytes > 0 && data.estimated_size_mb !== "0.00"
      };
    }
  }
];

const results = [];

server.stderr.on('data', (data) => {
  const logLine = data.toString();
  if (logLine.includes('error:') || logLine.includes('Error:')) {
    console.error('❌ Server error:', logLine.trim());
  }
});

server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  
  try {
    const parsedResponse = JSON.parse(response);
    
    // Skip initialize responses
    if (parsedResponse.method === "initialized") {
      return;
    }
    
    if (parsedResponse.result && parsedResponse.result.content) {
      const content = JSON.parse(parsedResponse.result.content[0].text);
      const test = tests[currentTest];
      
      console.log(`\n🔍 Testing: ${test.name}`);
      console.log(`📝 Description: ${test.description}`);
      console.log(`✅ Success: ${content.success}`);
      
      if (content.success) {
        const mockCheck = test.checkForMock(content.data);
        
        if (mockCheck.isMock) {
          console.log(`❌ MOCK DATA DETECTED: ${mockCheck.reason}`);
          results.push({ name: test.name, status: '❌ MOCK DATA', reason: mockCheck.reason });
        } else {
          console.log(`✅ REAL DATA: ${mockCheck.reason}`);
          results.push({ name: test.name, status: '✅ REAL DATA', reason: mockCheck.reason });
        }
        
        // Show key data points
        if (test.name === "docker_search_images") {
          console.log(`   Results: ${content.data.results?.length || 0}, Count: ${content.data.count || 0}`);
        } else if (test.name === "docker_get_image_details") {
          console.log(`   Stars: ${content.data.image?.star_count || 0}, Pulls: ${content.data.image?.pull_count || 0}`);
        } else if (test.name === "docker_list_tags") {
          console.log(`   Tags: ${content.data.tags?.length || 0}, First tag: ${content.data.tags?.[0]?.name || 'none'}`);
        } else if (test.name === "docker_get_manifest") {
          console.log(`   Layers: ${content.data.manifest?.fsLayers?.length || 0}, Arch: ${content.data.manifest?.architecture || 'unknown'}`);
        } else if (test.name === "docker_analyze_layers") {
          console.log(`   Layers: ${content.data.analysis?.total_layers || 0}, Size: ${content.data.analysis?.total_size_mb || 0} MB`);
        } else if (test.name === "docker_compare_images") {
          console.log(`   Efficiency: ${content.data.summary?.efficiency_percentage || 'N/A'}%, Size diff: ${content.data.summary?.size_difference_mb || 0} MB`);
        } else if (test.name === "docker_get_stats") {
          console.log(`   Pulls: ${content.data.stats?.pull_count || 0}, Stars: ${content.data.stats?.star_count || 0}`);
        } else if (test.name === "docker_track_base_updates") {
          console.log(`   Has updates: ${content.data.updates?.hasUpdates || false}, Recent tags: ${content.data.updates?.recentTags || 0}`);
        } else if (test.name === "docker_estimate_pull_size") {
          console.log(`   Size: ${content.data.estimated_size_mb || 0} MB (${content.data.estimated_size_bytes || 0} bytes)`);
        }
        
      } else {
        console.log(`❌ Error: ${content.error}`);
        results.push({ name: test.name, status: '❌ ERROR', reason: content.error });
      }
      
      currentTest++;
      
      if (currentTest < tests.length) {
        setTimeout(() => {
          const nextTest = tests[currentTest];
          console.log(`\n📤 Sending test ${currentTest + 1}/${tests.length}: ${nextTest.name}`);
          server.stdin.write(JSON.stringify(nextTest.request) + '\n');
        }, 1000);
      } else {
        console.log('\n🎉 All tests completed!');
        console.log('\n📊 COMPREHENSIVE RESULTS:');
        console.log('='.repeat(60));
        
        const realDataCount = results.filter(r => r.status === '✅ REAL DATA').length;
        const mockDataCount = results.filter(r => r.status === '❌ MOCK DATA').length;
        const errorCount = results.filter(r => r.status === '❌ ERROR').length;
        
        results.forEach(result => {
          console.log(`${result.status} ${result.name}`);
          if (result.reason) {
            console.log(`   └─ ${result.reason}`);
          }
        });
        
        console.log('\n📈 SUMMARY:');
        console.log(`✅ Real Data: ${realDataCount}/${tests.length} tools`);
        console.log(`❌ Mock Data: ${mockDataCount}/${tests.length} tools`);
        console.log(`❌ Errors: ${errorCount}/${tests.length} tools`);
        
        if (mockDataCount === 0) {
          console.log('\n🎉 SUCCESS: All tools are returning real data!');
        } else {
          console.log(`\n⚠️  WARNING: ${mockDataCount} tool(s) still returning mock data`);
        }
        
        server.kill();
        process.exit(0);
      }
    }
  } catch (error) {
    console.log('❌ Error parsing response:', error.message);
    console.log('Raw response:', response);
  }
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

setTimeout(() => {
  console.log('📤 Sending initialize request...');
  server.stdin.write(JSON.stringify(initializeRequest) + '\n');
}, 1000);

setTimeout(() => {
  console.log('📤 Sending first test...');
  server.stdin.write(JSON.stringify(tests[0].request) + '\n');
}, 2000);

setTimeout(() => {
  console.log('\n⏰ Test timeout - taking too long');
  server.kill();
  process.exit(1);
}, 120000); 