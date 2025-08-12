# DockerHub MCP Server - API Documentation

## Overview

The DockerHub MCP Server provides 12 comprehensive tools for interacting with DockerHub through the Model Context Protocol (MCP). This document describes each tool's functionality, parameters, and response format.

## Tool Categories

### Core Tools (Required)
1. `docker_search_images` - Search Docker Hub for images
2. `docker_get_image_details` - Get detailed information about an image
3. `docker_list_tags` - List all tags for a repository
4. `docker_get_manifest` - Retrieve image manifest
5. `docker_analyze_layers` - Analyze image layers and sizes
6. `docker_compare_images` - Compare two images
7. `docker_get_dockerfile` - Retrieve Dockerfile (when available)
8. `docker_get_stats` - Get download statistics and popularity

### Bonus Tools (Advanced)
9. `docker_get_vulnerabilities` - Fetch security scan results
10. `docker_get_image_history` - Get image build history
11. `docker_track_base_updates` - Check for base image updates
12. `docker_estimate_pull_size` - Calculate download size

## Tool Reference

### 1. docker_search_images

Search Docker Hub for images with advanced filtering capabilities.

**Parameters:**
- `query` (string, required): Search query for Docker images
- `limit` (number, optional): Maximum number of results (1-100, default: 25)
- `page` (number, optional): Page number for pagination (default: 1)
- `is_official` (boolean, optional): Filter for official images only
- `is_automated` (boolean, optional): Filter for automated builds only

**Example Request:**
```json
{
  "tool": "docker_search_images",
  "arguments": {
    "query": "python",
    "limit": 10,
    "is_official": true
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 1,
        "name": "python",
        "namespace": "library",
        "description": "Python is a programming language",
        "star_count": 5000,
        "pull_count": 1000000,
        "is_official": true,
        "is_automated": false
      }
    ],
    "total_count": 150,
    "page": 1,
    "limit": 10,
    "query": "python",
    "filters": {
      "is_official": true
    }
  }
}
```

### 2. docker_get_image_details

Get comprehensive information about a specific Docker image.

**Parameters:**
- `repository` (string, required): Repository name (e.g., "library/nginx")
- `tag` (string, optional): Image tag (default: "latest")

**Example Request:**
```json
{
  "tool": "docker_get_image_details",
  "arguments": {
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "image": {
      "id": 1,
      "name": "nginx",
      "namespace": "library",
      "description": "Official nginx docker image",
      "star_count": 3000,
      "pull_count": 500000,
      "last_updated": "2024-01-15T10:30:00Z",
      "is_official": true,
      "is_automated": false
    },
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

### 3. docker_list_tags

List all available tags for a Docker repository with pagination.

**Parameters:**
- `repository` (string, required): Repository name
- `limit` (number, optional): Maximum number of tags (1-100, default: 25)
- `page` (number, optional): Page number for pagination (default: 1)

**Example Request:**
```json
{
  "tool": "docker_list_tags",
  "arguments": {
    "repository": "library/nginx",
    "limit": 20
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": 1,
        "name": "latest",
        "last_updated": "2024-01-15T10:30:00Z",
        "digest": "sha256:abc123...",
        "size": 133700000,
        "architecture": "amd64",
        "os": "linux"
      }
    ],
    "total_count": 50,
    "repository": "library/nginx",
    "page": 1,
    "limit": 20
  }
}
```

### 4. docker_get_manifest

Retrieve the complete manifest for a specific Docker image.

**Parameters:**
- `repository` (string, required): Repository name
- `tag` (string, optional): Image tag (default: "latest")

**Example Request:**
```json
{
  "tool": "docker_get_manifest",
  "arguments": {
    "repository": "library/ubuntu",
    "tag": "20.04"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "manifest": {
      "schemaVersion": 1,
      "name": "library/ubuntu",
      "tag": "20.04",
      "architecture": "amd64",
      "fsLayers": [
        {
          "blobSum": "sha256:abc123..."
        }
      ],
      "history": [
        {
          "v1Compatibility": "{\"id\":\"...\",\"os\":\"linux\"}"
        }
      ]
    },
    "repository": "library/ubuntu",
    "tag": "20.04",
    "layer_count": 5,
    "architecture": "amd64"
  }
}
```

### 5. docker_analyze_layers

Analyze image layers and provide detailed size breakdown.

**Parameters:**
- `repository` (string, required): Repository name
- `tag` (string, optional): Image tag (default: "latest")

**Example Request:**
```json
{
  "tool": "docker_analyze_layers",
  "arguments": {
    "repository": "library/ubuntu",
    "tag": "latest"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "total_layers": 5,
      "layers": [
        {
          "index": 1,
          "digest": "sha256:abc123...",
          "estimated_size": "~1MB"
        }
      ],
      "total_estimated_size": 5242880,
      "architecture": "amd64",
      "os": "linux"
    },
    "repository": "library/ubuntu",
    "tag": "latest"
  }
}
```

### 6. docker_compare_images

Compare two Docker images for layer efficiency and differences.

**Parameters:**
- `image1` (string, required): First image (format: repository:tag)
- `image2` (string, required): Second image (format: repository:tag)

**Example Request:**
```json
{
  "tool": "docker_compare_images",
  "arguments": {
    "image1": "library/nginx:latest",
    "image2": "library/nginx:stable"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "comparison": {
      "commonLayers": 3,
      "uniqueToImage1": 2,
      "uniqueToImage2": 1,
      "totalLayersImage1": 5,
      "totalLayersImage2": 4,
      "layerEfficiency": 75.0
    },
    "image1": {
      "repository": "library/nginx",
      "tag": "latest",
      "manifest": { ... }
    },
    "image2": {
      "repository": "library/nginx",
      "tag": "stable",
      "manifest": { ... }
    },
    "summary": {
      "efficiency_percentage": "75.00",
      "common_layers": 3,
      "unique_layers_image1": 2,
      "unique_layers_image2": 1
    }
  }
}
```

### 7. docker_get_dockerfile

Attempt to retrieve the Dockerfile for an image (when available).

**Parameters:**
- `repository` (string, required): Repository name
- `tag` (string, optional): Image tag (default: "latest")

**Example Request:**
```json
{
  "tool": "docker_get_dockerfile",
  "arguments": {
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "dockerfile": "FROM debian:bullseye-slim\n\nLABEL maintainer=\"NGINX Docker Maintainers <docker-maint@nginx.com>\"\n\n...",
    "repository": "library/nginx",
    "tag": "latest",
    "available": true
  }
}
```

### 8. docker_get_stats

Get download statistics and popularity metrics for an image.

**Parameters:**
- `repository` (string, required): Repository name
- `tag` (string, optional): Image tag (default: "latest")

**Example Request:**
```json
{
  "tool": "docker_get_stats",
  "arguments": {
    "repository": "library/nginx"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "pull_count": 500000,
      "star_count": 3000,
      "last_updated": "2024-01-15T10:30:00Z",
      "tags_count": 50
    },
    "repository": "library/nginx",
    "popularity_score": 350.9
  }
}
```

### 9. docker_get_vulnerabilities

Fetch security scan results for a Docker image.

**Parameters:**
- `repository` (string, required): Repository name
- `tag` (string, optional): Image tag (default: "latest")
- `severity` (string, optional): Filter by severity (low/medium/high/critical)

**Example Request:**
```json
{
  "tool": "docker_get_vulnerabilities",
  "arguments": {
    "repository": "library/nginx",
    "tag": "latest",
    "severity": "high"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "vulnerabilities": [
      {
        "id": "CVE-2023-1234",
        "status": "open",
        "description": "Buffer overflow in nginx",
        "severity": "high",
        "package": "nginx",
        "version": "1.18.0",
        "fixed_version": "1.18.1",
        "cvss_score": 7.5
      }
    ],
    "repository": "library/nginx",
    "tag": "latest",
    "total_count": 1,
    "severity_counts": {
      "high": 1
    },
    "has_critical": false,
    "has_high": true
  }
}
```

### 10. docker_get_image_history

Get image build history and creation details.

**Parameters:**
- `repository` (string, required): Repository name
- `tag` (string, optional): Image tag (default: "latest")

**Example Request:**
```json
{
  "tool": "docker_get_image_history",
  "arguments": {
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "abc123",
        "created": "2024-01-15T10:30:00Z",
        "created_by": "/bin/sh -c #(nop) CMD [\"nginx\" \"-g\" \"daemon off;\"]",
        "tags": ["latest"]
      }
    ],
    "repository": "library/nginx",
    "tag": "latest",
    "total_entries": 5
  }
}
```

### 11. docker_track_base_updates

Check if base images have updates available.

**Parameters:**
- `repository` (string, required): Repository name
- `tag` (string, optional): Image tag (default: "latest")

**Example Request:**
```json
{
  "tool": "docker_track_base_updates",
  "arguments": {
    "repository": "library/nginx",
    "tag": "latest"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "updates": {
      "hasUpdates": true,
      "currentVersion": "1.18.0",
      "latestVersion": "1.18.1",
      "lastChecked": "2024-01-15T10:30:00Z"
    },
    "repository": "library/nginx",
    "tag": "latest",
    "recommendation": "Consider updating to the latest version"
  }
}
```

### 12. docker_estimate_pull_size

Calculate estimated download size for pulling an image.

**Parameters:**
- `repository` (string, required): Repository name
- `tag` (string, optional): Image tag (default: "latest")

**Example Request:**
```json
{
  "tool": "docker_estimate_pull_size",
  "arguments": {
    "repository": "library/ubuntu",
    "tag": "latest"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "estimated_size_bytes": 5242880,
    "estimated_size_mb": "5.00",
    "estimated_size_gb": "0.005",
    "repository": "library/ubuntu",
    "tag": "latest",
    "note": "This is a rough estimate based on layer count"
  }
}
```

## Error Handling

All tools return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "tool": "tool_name"
}
```

Common error scenarios:
- **Rate Limit Exceeded**: When DockerHub API rate limits are hit
- **Authentication Failed**: When credentials are invalid or missing
- **Resource Not Found**: When image or repository doesn't exist
- **Network Error**: When API is unreachable
- **Validation Error**: When input parameters are invalid

## Rate Limiting

The server implements intelligent rate limiting:
- **Default**: 60 requests per minute
- **Burst**: 10 requests
- **Automatic Retry**: With exponential backoff
- **Queue Management**: Automatic queuing when limits are exceeded

## Caching

All API responses are cached with operation-specific TTL:
- **Search Results**: 5 minutes
- **Image Details**: 10 minutes
- **Tags**: 15 minutes
- **Manifests**: 30 minutes
- **Vulnerabilities**: 1 hour
- **Statistics**: 2 hours

## Best Practices

1. **Use Specific Tags**: Always specify tags instead of relying on "latest"
2. **Batch Operations**: Use pagination for large result sets
3. **Error Handling**: Always check the `success` field in responses
4. **Rate Limiting**: Respect the rate limits and implement backoff
5. **Caching**: Leverage the built-in caching for frequently accessed data

## Performance Tips

1. **Parallel Requests**: Use multiple tools simultaneously when possible
2. **Efficient Filtering**: Use filters to reduce result sets
3. **Pagination**: Use pagination for large datasets
4. **Cache Awareness**: Understand cache TTL for different operations 