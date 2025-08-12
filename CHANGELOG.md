# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of DockerHub MCP Server
- Support for 12 MCP tools for DockerHub integration
- Authentication with DockerHub personal access tokens
- Multi-registry support (public and private)
- Intelligent caching with TTL
- Rate limiting with exponential backoff
- Comprehensive error handling and fallbacks
- TypeScript implementation with Zod validation
- Integration guides for Claude Desktop, Cursor, and Cline
- Docker and Docker Compose support
- Comprehensive test suite
- Production-ready logging with Winston

### Features
- `docker_search_images`: Search DockerHub for images
- `docker_get_image_details`: Get detailed image information
- `docker_list_tags`: List available tags for a repository
- `docker_compare_images`: Compare two Docker images
- `docker_analyze_layers`: Analyze image layers and optimization opportunities
- `docker_get_vulnerabilities`: Check for security vulnerabilities
- `docker_get_manifest`: Get image manifest
- `docker_get_stats`: Get download statistics
- `docker_get_dockerfile`: Retrieve Dockerfiles when available
- `docker_get_image_history`: Get build history
- `docker_track_base_updates`: Check for base image updates
- `docker_estimate_pull_size`: Estimate download size

### Technical
- MCP SDK implementation with JSON-RPC over stdio
- Service-oriented architecture with clear separation of concerns
- Comprehensive TypeScript types and interfaces
- Zod schema validation for all inputs and outputs
- Node-cache for in-memory caching
- Rate-limiter-flexible for intelligent rate limiting
- Axios for HTTP client with interceptors
- Winston for structured logging
- Jest for testing framework

### Documentation
- Comprehensive README with usage examples
- Detailed API documentation
- Integration guides for popular MCP clients
- Implementation documentation with architectural decisions
- Troubleshooting guides
- Example configurations and test scripts

## [1.0.0] - 2024-01-XX

### Added
- Initial release
- All core MCP tools implemented
- DockerHub API integration
- Authentication and security features
- Performance optimizations
- Comprehensive documentation

---

## Version History

- **1.0.0**: Initial release with full DockerHub MCP integration
