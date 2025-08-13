# 📚 DockerHub MCP Server API Documentation

> **Complete API reference for all 12 MCP tools**

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Core Tools](#core-tools)
- [Analysis Tools](#analysis-tools)
- [Security Tools](#security-tools)
- [Monitoring Tools](#monitoring-tools)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## 🎯 Overview

The DockerHub MCP Server provides 12 comprehensive tools for Docker image management through the Model Context Protocol (MCP). All tools return structured JSON responses and support comprehensive error handling.

### **Base URL**
```
MCP Server: stdio:// (JSON-RPC over stdio)
DockerHub API: https://hub.docker.com/v2/
```

### **Response Format**
All tools return responses in the following format:

```json
{
  "success": true,
  "data": {
    // Tool-specific data
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "cacheStatus": "hit|miss",
    "responseTime": "150ms"
  }
}
```

## 🔐 Authentication

### **Authentication Methods**

1. **Personal Access Token** (Recommended)
   ```env
   DOCKERHUB_TOKEN=your_dockerhub_personal_access_token
   ```

2. **Username/Password**
   ```env
   DOCKERHUB_USERNAME=your_username
   DOCKERHUB_PASSWORD=your_password
   ```

3. **Public Access** (Limited functionality)
   - No authentication required
   - Limited to public data only

### **Token Permissions**

For full functionality, ensure your DockerHub token has:
- `read` - Read repository information
- `write` - Write repository information (if needed)
- `admin` - Administrative access (if needed)

## 🔍 Core Tools

### **1. docker_search_images**

Search DockerHub for images with advanced filtering.

#### **Parameters**
```json
{
  "query": "string",           // Required: Search query (1-100 chars)
  "limit": "number",           // Optional: Max results (1-100, default: 25)
  "page": "number",            // Optional: Page number (1+, default: 1)
  "is_official": "boolean",    // Optional: Official images only
  "is_automated": "boolean"    // Optional: Automated builds only
}
```

#### **Response**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "name": "library/nginx",
        "description": "Official build of Nginx.",
        "star_count": 20936,
        "pull_count": 12434628119,
        "is_official": true,
        "is_automated": false,
        "last_updated": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 1,
    "page": 1,
    "limit": 25
  }
}
```

#### **Example**
```bash
# Search for Python images
{
  "query": "python",
  "limit": 5,
  "is_official": true
}
```

### **2. docker_get_image_details**

Get comprehensive information about a specific Docker image.

#### **Parameters**
```json
{
  "repository": "string",      // Required: Repository name (e.g., "library/nginx")
  "tag": "string"              // Optional: Image tag (default: "latest")
}
```

#### **Response**
```json
{
  "success": true,
  "data": {
    "image": {
      "name": "library/nginx",
      "description": "Official build of Nginx.",
      "star_count": 20936,
      "pull_count": 12434628119,
      "is_official": true,
      "is_automated": false,
      "last_updated": "2024-01-15T10:30:00Z",
      "full_description": "Nginx [engine x] is an HTTP and reverse proxy server...",
      "affiliation": "official",
      "permissions": {
        "read": true,
        "write": false,
        "admin": false
      }
    },
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

#### **Example**
```bash
# Get details for nginx:latest
{
  "repository": "library/nginx",
  "tag": "latest"
}
```

### **3. docker_list_tags**

List all available tags for a Docker repository.

#### **Parameters**
```json
{
  "repository": "string",      // Required: Repository name
  "limit": "number",           // Optional: Max tags (1-100, default: 25)
  "page": "number"             // Optional: Page number (1+, default: 1)
}
```

#### **Response**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 1,
        "name": "latest",
        "last_updated": "2024-01-15T10:30:00Z",
        "digest": "sha256:1234567890abcdef...",
        "size": 133000000,
        "architecture": "amd64",
        "os": "linux"
      }
    ],
    "count": 1,
    "page": 1,
    "limit": 25
  }
}
```

#### **Example**
```bash
# List tags for nginx
{
  "repository": "library/nginx",
  "limit": 10
}
```

### **4. docker_get_manifest**

Retrieve the manifest for a specific Docker image.

#### **Parameters**
```json
{
  "repository": "string",      // Required: Repository name
  "tag": "string"              // Required: Image tag
}
```

#### **Response**
```json
{
  "success": true,
  "data": {
    "manifest": {
      "schemaVersion": 2,
      "name": "library/nginx",
      "tag": "latest",
      "architecture": "amd64",
      "fsLayers": [
        {
          "blobSum": "sha256:1234567890abcdef...",
          "size": 80000000
        }
      ],
      "history": [
        {
          "v1Compatibility": "{\"architecture\":\"amd64\",\"config\":{...}}"
        }
      ],
      "signatures": [],
      "dockerHubData": {
        "totalSize": 133000000,
        "variantCount": 1,
        "architectures": ["amd64"],
        "operatingSystems": ["linux"],
        "lastUpdated": "2024-01-15T10:30:00Z",
        "digest": "sha256:1234567890abcdef..."
      }
    },
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

#### **Example**
```bash
# Get manifest for nginx:latest
{
  "repository": "library/nginx",
  "tag": "latest"
}
```

## 🔬 Analysis Tools

### **5. docker_analyze_layers**

Analyze image layers and provide optimization insights.

#### **Parameters**
```json
{
  "repository": "string",      // Required: Repository name
  "tag": "string"              // Required: Image tag
}
```

#### **Response**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "total_layers": 12,
      "layers": [
        {
          "index": 1,
          "digest": "sha256:1234567890abcdef...",
          "size": 80000000,
          "architecture": "amd64",
          "os": "linux",
          "variant": "amd64/linux"
        }
      ],
      "total_estimated_size": 133000000,
      "architecture": "amd64",
      "os": "linux",
      "variants": 1,
      "total_size_mb": 127,
      "note": "Analyzed 12 architecture variants from DockerHub API"
    },
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

#### **Example**
```bash
# Analyze layers for nginx:latest
{
  "repository": "library/nginx",
  "tag": "latest"
}
```

### **6. docker_compare_images**

Compare two Docker images side-by-side.

#### **Parameters**
```json
{
  "image1": "string",          // Required: First image (repo:tag)
  "image2": "string"           // Required: Second image (repo:tag)
}
```

#### **Response**
```json
{
  "success": true,
  "data": {
    "comparison": {
      "image1": {
        "repository": "library/nginx",
        "tag": "latest",
        "size": 133000000,
        "layers": 12,
        "architecture": "amd64"
      },
      "image2": {
        "repository": "library/nginx",
        "tag": "alpine",
        "size": 23000000,
        "layers": 8,
        "architecture": "amd64"
      },
      "sizeDifference": 110000000,
      "sizeDifferenceMB": 105,
      "layerEfficiency": 0.25,
      "commonLayers": 3,
      "uniqueToImage1": 9,
      "uniqueToImage2": 5,
      "totalLayersImage1": 12,
      "totalLayersImage2": 8
    },
    "summary": {
      "efficiency_percentage": "25.00",
      "common_layers": 3,
      "unique_layers_image1": 9,
      "unique_layers_image2": 5,
      "size_difference_mb": 105,
      "total_layers_image1": 12,
      "total_layers_image2": 8
    }
  }
}
```

#### **Example**
```bash
# Compare nginx:latest vs nginx:alpine
{
  "image1": "library/nginx:latest",
  "image2": "library/nginx:alpine"
}
```

## 🔒 Security Tools

### **7. docker_get_vulnerabilities**

Check for security vulnerabilities in Docker images.

#### **Parameters**
```json
{
  "repository": "string",      // Required: Repository name
  "tag": "string"              // Required: Image tag
}
```

#### **Response**
```json
{
  "success": true,
  "data": {
    "vulnerabilities": [],
    "summary": {
      "total": 0,
      "critical": 0,
      "high": 0,
      "medium": 0,
      "low": 0
    },
    "note": "Vulnerability data not available via DockerHub API",
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

#### **Example**
```bash
# Check vulnerabilities for nginx:latest
{
  "repository": "library/nginx",
  "tag": "latest"
}
```

### **8. docker_get_image_history**

Get image build history and creation details.

#### **Parameters**
```json
{
  "repository": "string",      // Required: Repository name
  "tag": "string"              // Required: Image tag
}
```

#### **Response**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "created": "2024-01-15T10:30:00Z",
        "created_by": "CMD [\"nginx\" \"-g\" \"daemon off;\"]",
        "size": 0
      }
    ],
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

#### **Example**
```bash
# Get history for nginx:latest
{
  "repository": "library/nginx",
  "tag": "latest"
}
```

## 📊 Monitoring Tools

### **9. docker_get_stats**

Get download statistics and popularity metrics.

#### **Parameters**
```json
{
  "repository": "string"       // Required: Repository name
}
```

#### **Response**
```json
{
  "success": true,
  "data": {
    "stats": {
      "pull_count": 12434628119,
      "star_count": 20936,
      "last_updated": "2024-01-15T10:30:00Z",
      "tags_count": 50
    },
    "repository": "library/nginx"
  }
}
```

#### **Example**
```bash
# Get stats for nginx
{
  "repository": "library/nginx"
}
```

### **10. docker_track_base_updates**

Check for base image updates and monitor changes.

#### **Parameters**
```json
{
  "repository": "string",      // Required: Repository name
  "tag": "string"              // Required: Image tag
}
```

#### **Response**
```json
{
  "success": true,
  "data": {
    "updates": {
      "hasUpdates": true,
      "lastChecked": "2024-01-15T10:30:00Z",
      "recentTags": 10,
      "latestTag": "latest",
      "baseImage": "debian:bullseye-slim",
      "recommendations": [
        "Consider updating to nginx:alpine for smaller size",
        "Monitor for security updates"
      ]
    },
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

#### **Example**
```bash
# Track updates for nginx:latest
{
  "repository": "library/nginx",
  "tag": "latest"
}
```

### **11. docker_estimate_pull_size**

Calculate estimated download size for pulling an image.

#### **Parameters**
```json
{
  "repository": "string",      // Required: Repository name
  "tag": "string"              // Required: Image tag
}
```

#### **Response**
```json
{
  "success": true,
  "data": {
    "estimated_size_bytes": 133000000,
    "estimated_size_mb": "126.83",
    "estimated_size_gb": "0.12",
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

#### **Example**
```bash
# Estimate pull size for nginx:latest
{
  "repository": "library/nginx",
  "tag": "latest"
}
```

### **12. docker_get_dockerfile**

Retrieve Dockerfile for an image (when available).

#### **Parameters**
```json
{
  "repository": "string",      // Required: Repository name
  "tag": "string"              // Required: Image tag
}
```

#### **Response**
```json
{
  "success": true,
  "data": {
    "dockerfile": null,
    "note": "Dockerfile not available via DockerHub API",
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

#### **Example**
```bash
# Get Dockerfile for nginx:latest
{
  "repository": "library/nginx",
  "tag": "latest"
}
```

## ⚠️ Error Handling

### **Error Response Format**

```json
{
  "success": false,
  "error": {
    "message": "Authentication required",
    "type": "AUTHENTICATION",
    "code": 401,
    "retryable": false
  },
  "suggestion": "Please check your DockerHub token permissions"
}
```

### **Error Types**

| Type | Code | Description | Retryable |
|------|------|-------------|-----------|
| `AUTHENTICATION` | 401 | Authentication required | ❌ |
| `RATE_LIMIT` | 429 | Rate limit exceeded | ✅ |
| `NOT_FOUND` | 404 | Resource not found | ❌ |
| `VALIDATION` | 400 | Invalid input parameters | ❌ |
| `TIMEOUT` | 408 | Request timeout | ✅ |
| `NETWORK` | 500 | Network error | ✅ |
| `UNKNOWN` | 500 | Unknown error | ❌ |

### **Error Handling Examples**

```typescript
// Handle authentication errors
if (error.type === 'AUTHENTICATION') {
  console.log('Please check your DockerHub token');
}

// Handle rate limiting
if (error.type === 'RATE_LIMIT') {
  console.log('Rate limit exceeded, retrying in 60 seconds');
  await new Promise(resolve => setTimeout(resolve, 60000));
}

// Handle validation errors
if (error.type === 'VALIDATION') {
  console.log('Invalid parameters:', error.message);
}
```

## 🚦 Rate Limiting

### **Rate Limits**

- **Authenticated**: 60 requests per minute, 1000 per hour
- **Unauthenticated**: 30 requests per minute, 500 per hour
- **Burst**: 10 requests per burst

### **Rate Limit Headers**

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642234567
Retry-After: 60
```

### **Handling Rate Limits**

```typescript
// Automatic retry with exponential backoff
const response = await apiService.searchImages('nginx', 10);

// Manual handling
try {
  const response = await apiService.searchImages('nginx', 10);
} catch (error) {
  if (error.type === 'RATE_LIMIT') {
    const retryAfter = error.headers['retry-after'] || 60;
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    // Retry request
  }
}
```

## 📖 Examples

### **Complete Workflow Example**

```typescript
// 1. Search for images
const searchResult = await mcpClient.callTool('docker_search_images', {
  query: 'python',
  limit: 5,
  is_official: true
});

// 2. Get details for first result
const firstImage = searchResult.data.results[0];
const details = await mcpClient.callTool('docker_get_image_details', {
  repository: firstImage.name,
  tag: 'latest'
});

// 3. Analyze layers
const analysis = await mcpClient.callTool('docker_analyze_layers', {
  repository: firstImage.name,
  tag: 'latest'
});

// 4. Compare with alternative
const comparison = await mcpClient.callTool('docker_compare_images', {
  image1: `${firstImage.name}:latest`,
  image2: `${firstImage.name}:alpine`
});

// 5. Get statistics
const stats = await mcpClient.callTool('docker_get_stats', {
  repository: firstImage.name
});

console.log('Analysis complete:', {
  image: firstImage.name,
  size: analysis.data.analysis.total_size_mb + 'MB',
  popularity: stats.data.stats.pull_count + ' pulls',
  optimization: comparison.data.summary.efficiency_percentage + '% efficiency'
});
```

### **Error Handling Example**

```typescript
async function safeImageSearch(query: string) {
  try {
    const result = await mcpClient.callTool('docker_search_images', { query });
    return result.data;
  } catch (error) {
    switch (error.type) {
      case 'AUTHENTICATION':
        console.error('Authentication failed. Please check your token.');
        break;
      case 'RATE_LIMIT':
        console.error('Rate limit exceeded. Please wait before retrying.');
        break;
      case 'VALIDATION':
        console.error('Invalid query:', error.message);
        break;
      default:
        console.error('Unexpected error:', error.message);
    }
    return null;
  }
}
```

### **Batch Processing Example**

```typescript
async function analyzeMultipleImages(repositories: string[]) {
  const results = [];
  
  for (const repo of repositories) {
    try {
      const [details, analysis, stats] = await Promise.all([
        mcpClient.callTool('docker_get_image_details', { repository: repo }),
        mcpClient.callTool('docker_analyze_layers', { repository: repo, tag: 'latest' }),
        mcpClient.callTool('docker_get_stats', { repository: repo })
      ]);
      
      results.push({
        repository: repo,
        details: details.data,
        analysis: analysis.data,
        stats: stats.data
      });
    } catch (error) {
      console.error(`Failed to analyze ${repo}:`, error.message);
    }
  }
  
  return results;
}
```

---

## 🔗 Related Documentation

- [Installation Guide](../README.md#quick-start)
- [Configuration Guide](../README.md#configuration)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Contributing Guide](../CONTRIBUTING.md)

---

**For more information, visit the [GitHub repository](https://github.com/raghav-jeogani/dockerhub-mcp-server)** 
3. **Pagination**: Use pagination for large datasets
4. **Cache Awareness**: Understand cache TTL for different operations 