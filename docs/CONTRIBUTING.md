# 🤝 Contributing to DockerHub MCP Server

Thank you for your interest in contributing to the DockerHub MCP Server! This document provides comprehensive guidelines for contributing to this project.

## 🎯 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contribution Guidelines](#contribution-guidelines)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)
- [Community Guidelines](#community-guidelines)
- [Getting Help](#getting-help)

## 🚀 Getting Started

### **Ways to Contribute**

We welcome contributions in many forms:

- 🐛 **Bug Reports** - Help us identify and fix issues
- 💡 **Feature Requests** - Suggest new features and improvements
- 📝 **Documentation** - Improve docs, examples, and guides
- 🧪 **Testing** - Write tests, report bugs, improve coverage
- 🔧 **Code** - Fix bugs, implement features, refactor code
- 🌐 **Localization** - Translate documentation and UI
- 📢 **Community** - Help others, answer questions, share knowledge

### **Before You Start**

1. **Check Existing Issues** - Search for similar issues before creating new ones
2. **Read Documentation** - Familiarize yourself with the project structure
3. **Join Discussions** - Participate in GitHub Discussions
4. **Set Up Development Environment** - Follow the setup guide below

## 🔧 Development Setup

### **Prerequisites**

- **Node.js 18+** ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Docker** (optional, for containerized development)
- **DockerHub Account** (optional, for testing authenticated features)

### **Fork and Clone**

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/dockerhub-mcp-server.git
cd dockerhub-mcp-server

# 3. Add upstream remote
git remote add upstream https://github.com/raghav-jeogani/dockerhub-mcp-server.git

# 4. Verify remotes
git remote -v
```

### **Install Dependencies**

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Verify installation
npm test
```

### **Environment Setup**

Create a `.env` file for development:

```env
# Development configuration
DOCKERHUB_TOKEN=your_dockerhub_token_here
LOG_LEVEL=debug
CACHE_TTL=300
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000

# Optional: Private registry for testing
PRIVATE_REGISTRIES='[]'
```

### **Development Commands**

```bash
# 🛠️ Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run clean        # Clean build artifacts

# 🧪 Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:integration # Run integration tests

# 🔍 Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier

# 📦 Package Management
npm run deps:check   # Check for outdated dependencies
npm run deps:update  # Update dependencies
```

## 📋 Contribution Guidelines

### **Issue Reporting**

#### **Bug Reports**

When reporting bugs, please include:

```markdown
## 🐛 Bug Description
Brief description of the issue

## 🔍 Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## 📋 Expected Behavior
What you expected to happen

## 🚨 Actual Behavior
What actually happened

## 📸 Screenshots
If applicable, add screenshots

## 🔧 Environment
- OS: [e.g. macOS, Windows, Linux]
- Node.js Version: [e.g. 18.17.0]
- DockerHub MCP Server Version: [e.g. 1.0.0]
- MCP Client: [e.g. Claude Desktop, Cursor]

## 📝 Additional Context
Any other context about the problem
```

#### **Feature Requests**

When requesting features, please include:

```markdown
## 💡 Feature Description
Brief description of the feature

## 🎯 Use Case
How would this feature be used?

## 🔧 Proposed Implementation
Any ideas on how to implement this?

## 📋 Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## 🔗 Related Issues
Links to related issues or discussions
```

### **Code Contributions**

#### **Branch Naming Convention**

Use descriptive branch names:

```bash
# Feature branches
git checkout -b feature/add-redis-caching
git checkout -b feature/enhance-error-handling

# Bug fix branches
git checkout -b fix/authentication-token-expiry
git checkout -b fix/rate-limiting-issue

# Documentation branches
git checkout -b docs/update-installation-guide
git checkout -b docs/add-api-examples

# Refactoring branches
git checkout -b refactor/extract-common-validation
git checkout -b refactor/improve-cache-service
```

#### **Commit Message Format**

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```bash
feat: add Redis-based distributed caching
feat(tools): add docker_analyze_security tool
fix: resolve authentication token expiration issue
fix(api): handle 429 rate limit responses properly
docs: update installation guide for Windows
docs(api): add comprehensive API documentation
style: format code with Prettier
refactor: extract common validation logic
refactor(cache): improve cache key generation
test: add integration tests for rate limiting
test(api): add unit tests for authentication
chore: update dependencies to latest versions
chore(deps): bump axios to v1.6.0
```

## 📏 Code Standards

### **TypeScript Guidelines**

#### **Type Safety**

```typescript
// ✅ Good - Explicit typing
interface DockerHubImage {
  name: string;
  description: string;
  star_count: number;
  pull_count: number;
}

// ✅ Good - Generic types
async function getCachedData<T>(key: string): Promise<T | undefined> {
  return cache.get<T>(key);
}

// ❌ Avoid - Any types
function processData(data: any): any {
  return data;
}
```

#### **Error Handling**

```typescript
// ✅ Good - Proper error handling
async function fetchImageDetails(repository: string): Promise<DockerHubImage> {
  try {
    const response = await apiClient.get(`/v2/repositories/${repository}`);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        throw new DockerHubError('Repository not found', ErrorType.NOT_FOUND);
      }
      if (error.response?.status === 401) {
        throw new DockerHubError('Authentication required', ErrorType.AUTHENTICATION);
      }
    }
    throw new DockerHubError('Failed to fetch image details', ErrorType.UNKNOWN);
  }
}
```

#### **Function Design**

```typescript
// ✅ Good - Single responsibility, clear naming
async function validateAndCacheImageData(
  repository: string,
  tag: string,
  data: DockerHubImage
): Promise<void> {
  // Validate input
  if (!repository || !tag) {
    throw new ValidationError('Repository and tag are required');
  }
  
  // Process data
  const processedData = await processImageData(data);
  
  // Cache result
  await cache.set(generateCacheKey(repository, tag), processedData);
}

// ❌ Avoid - Multiple responsibilities, unclear naming
async function doStuff(repo: string, t: string, d: any): Promise<void> {
  // Too many responsibilities in one function
}
```

### **Code Organization**

#### **File Structure**

```typescript
// ✅ Good - Clear file organization
// src/services/dockerhub-api.ts

// 1. Imports
import axios from 'axios';
import { DockerHubImage, RegistryConfig } from '../types';

// 2. Interfaces and types
interface ApiResponse<T> {
  data: T;
  status: number;
}

// 3. Class definition
export class DockerHubApiService {
  // 4. Private properties
  private httpClient: AxiosInstance;
  private cache: CacheService;
  
  // 5. Constructor
  constructor(registry: RegistryConfig, cache: CacheService) {
    this.httpClient = this.createHttpClient(registry);
    this.cache = cache;
  }
  
  // 6. Public methods
  async searchImages(query: string, limit: number): Promise<DockerHubImage[]> {
    // Implementation
  }
  
  // 7. Private methods
  private createHttpClient(registry: RegistryConfig): AxiosInstance {
    // Implementation
  }
}
```

#### **Naming Conventions**

```typescript
// ✅ Good - Clear, descriptive names
class DockerHubApiService {
  private async validateAuthentication(): Promise<void> {}
  private async handleRateLimitError(error: AxiosError): Promise<void> {}
  private generateCacheKey(repository: string, tag: string): string {}
}

// ❌ Avoid - Unclear names
class API {
  private async check(): Promise<void> {}
  private async handle(): Promise<void> {}
  private generate(): string {}
}
```

### **Documentation Standards**

#### **JSDoc Comments**

```typescript
/**
 * Searches DockerHub for images based on query and filters
 * 
 * @param query - Search query for Docker images (1-100 characters)
 * @param limit - Maximum number of results to return (1-100, default: 25)
 * @param page - Page number for pagination (1+, default: 1)
 * @param isOfficial - Filter for official images only (optional)
 * @param isAutomated - Filter for automated builds only (optional)
 * 
 * @returns Promise resolving to array of DockerHub images
 * 
 * @throws {ValidationError} When query is empty or invalid
 * @throws {AuthenticationError} When authentication fails
 * @throws {RateLimitError} When rate limit is exceeded
 * 
 * @example
 * ```typescript
 * const images = await apiService.searchImages('nginx', 10, 1, true);
 * console.log(`Found ${images.length} official nginx images`);
 * ```
 */
async searchImages(
  query: string,
  limit: number = 25,
  page: number = 1,
  isOfficial?: boolean,
  isAutomated?: boolean
): Promise<DockerHubImage[]> {
  // Implementation
}
```

#### **README Updates**

When adding new features, update the README:

```markdown
## ✨ New Feature

### Usage
```typescript
// Example usage
const result = await dockerhubMCP.newFeature(param1, param2);
```

### Configuration
Add to your `.env` file:
```env
NEW_FEATURE_ENABLED=true
NEW_FEATURE_TIMEOUT=5000
```
```

## 🧪 Testing Guidelines

### **Test Structure**

```typescript
// ✅ Good - Comprehensive test structure
describe('DockerHubApiService', () => {
  let service: DockerHubApiService;
  let mockCache: jest.Mocked<CacheService>;
  let mockRateLimiter: jest.Mocked<RateLimiterService>;
  
  beforeEach(() => {
    // Setup mocks
    mockCache = createMockCacheService();
    mockRateLimiter = createMockRateLimiterService();
    service = new DockerHubApiService(mockRegistry, mockCache, mockRateLimiter);
  });
  
  afterEach(() => {
    // Cleanup
    jest.clearAllMocks();
  });
  
  describe('searchImages', () => {
    it('should search images successfully', async () => {
      // Arrange
      const mockResponse = { results: [], count: 0 };
      jest.spyOn(service['httpClient'], 'get').mockResolvedValue({ data: mockResponse });
      
      // Act
      const result = await service.searchImages('nginx', 10);
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockCache.set).toHaveBeenCalled();
    });
    
    it('should handle authentication errors gracefully', async () => {
      // Arrange
      jest.spyOn(service['httpClient'], 'get').mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } }
      });
      
      // Act & Assert
      await expect(service.searchImages('nginx', 10))
        .rejects.toThrow('Authentication failed');
    });
    
    it('should validate input parameters', async () => {
      // Act & Assert
      await expect(service.searchImages('', 10))
        .rejects.toThrow('Query cannot be empty');
      
      await expect(service.searchImages('nginx', 0))
        .rejects.toThrow('Limit must be greater than 0');
    });
  });
});
```

### **Test Coverage Requirements**

- **Unit Tests**: 90%+ coverage for all business logic
- **Integration Tests**: All API endpoints and MCP tools
- **Error Scenarios**: All error conditions and edge cases
- **Performance Tests**: Load testing for critical paths

### **Test Naming**

```typescript
// ✅ Good - Descriptive test names
describe('CacheService', () => {
  it('should return cached value when key exists', async () => {});
  it('should return undefined when key does not exist', async () => {});
  it('should expire cached values after TTL', async () => {});
  it('should handle concurrent access safely', async () => {});
});

// ❌ Avoid - Unclear test names
describe('Cache', () => {
  it('should work', async () => {});
  it('should handle errors', async () => {});
});
```

## 📝 Documentation

### **Code Documentation**

- **JSDoc** for all public APIs
- **Inline comments** for complex logic
- **README updates** for new features
- **API documentation** for all tools

### **Documentation Types**

1. **Technical Documentation**
   - Architecture decisions
   - API specifications
   - Configuration guides

2. **User Documentation**
   - Installation guides
   - Usage examples
   - Troubleshooting guides

3. **Developer Documentation**
   - Development setup
   - Contributing guidelines
   - Code standards

## 🔄 Pull Request Process

### **Before Submitting**

1. **Ensure Tests Pass**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

2. **Update Documentation**
   - Update README if needed
   - Add JSDoc comments
   - Update changelog

3. **Check Code Quality**
   - Follow code standards
   - Add appropriate tests
   - Ensure good test coverage

### **Pull Request Template**

```markdown
## 📋 Description
Brief description of changes

## 🎯 Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## 🧪 Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Test coverage maintained or improved

## 📝 Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or breaking changes documented)
- [ ] All tests pass
- [ ] Code is properly formatted

## 🔗 Related Issues
Closes #123
Related to #456

## 📸 Screenshots (if applicable)
Add screenshots for UI changes
```

### **Review Process**

1. **Automated Checks**
   - CI/CD pipeline runs tests
   - Code quality checks
   - Security scans

2. **Code Review**
   - At least one maintainer review
   - Address all review comments
   - Ensure code quality standards

3. **Merge Requirements**
   - All tests pass
   - Code review approved
   - No conflicts with main branch

## 👥 Code Review Guidelines

### **Review Checklist**

- [ ] **Functionality**: Does the code work as intended?
- [ ] **Code Quality**: Is the code clean and maintainable?
- [ ] **Performance**: Are there any performance implications?
- [ ] **Security**: Are there any security concerns?
- [ ] **Testing**: Are there adequate tests?
- [ ] **Documentation**: Is documentation updated?
- [ ] **Standards**: Does it follow project standards?

### **Review Comments**

```markdown
## 💡 Suggestions
- Consider extracting this logic into a separate function
- This could benefit from additional error handling
- Consider adding a test for this edge case

## 🐛 Issues
- This will cause a memory leak
- Missing validation for user input
- Potential race condition here

## ✅ Positive Feedback
- Great use of TypeScript features
- Excellent test coverage
- Clear and readable code
```

## 🤝 Community Guidelines

### **Code of Conduct**

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- **Be Respectful**: Treat everyone with respect and kindness
- **Be Inclusive**: Welcome contributors from all backgrounds
- **Be Constructive**: Provide helpful and constructive feedback
- **Be Patient**: Understand that everyone has different skill levels
- **Be Collaborative**: Work together to improve the project

### **Communication**

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Requests**: For code contributions
- **Email**: For private or sensitive matters

### **Getting Recognition**

Contributors are recognized in several ways:

- **Contributors List**: GitHub automatically shows contributors
- **Release Notes**: Contributors mentioned in changelog
- **Documentation**: Contributors listed in documentation
- **Community**: Recognition in discussions and issues

## 🆘 Getting Help

### **Before Asking for Help**

1. **Check Documentation**: Read the README and documentation
2. **Search Issues**: Look for similar issues or questions
3. **Search Discussions**: Check GitHub Discussions
4. **Try Debugging**: Use debugging tools and logs

### **Asking for Help**

When asking for help, please include:

```markdown
## 🆘 Help Request

### Issue Description
Clear description of what you're trying to do

### What I've Tried
Steps you've already taken

### Error Messages
Any error messages or logs

### Environment
- OS: [e.g. macOS, Windows, Linux]
- Node.js Version: [e.g. 18.17.0]
- DockerHub MCP Server Version: [e.g. 1.0.0]

### Additional Context
Any other relevant information
```

### **Resources**

- **Documentation**: [Wiki](https://github.com/raghav-jeogani/dockerhub-mcp-server/wiki)
- **Issues**: [GitHub Issues](https://github.com/raghav-jeogani/dockerhub-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/raghav-jeogani/dockerhub-mcp-server/discussions)
- **Email**: [raghavjeogani@gmail.com](mailto:raghavjeogani@gmail.com)

## 🎉 Recognition

### **Contributor Levels**

- **🌱 New Contributor**: First contribution
- **🌿 Regular Contributor**: Multiple contributions
- **🌳 Core Contributor**: Significant contributions
- **🏆 Maintainer**: Project maintenance responsibilities

### **Special Thanks**

We appreciate all contributions, big and small. Every contribution helps make this project better for the community.

---

## 🙏 Thank You

Thank you for contributing to the DockerHub MCP Server! Your contributions help make this project better for everyone in the AI and Docker communities.

**Together, we're building the future of AI-powered Docker management! 🚀**

---

<div align="center">

**Made with ❤️ for the AI and Docker communities**

[![Contributors](https://img.shields.io/github/contributors/raghav-jeogani/dockerhub-mcp-server)](https://github.com/raghav-jeogani/dockerhub-mcp-server/graphs/contributors)
[![Issues](https://img.shields.io/github/issues/raghav-jeogani/dockerhub-mcp-server)](https://github.com/raghav-jeogani/dockerhub-mcp-server/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/raghav-jeogani/dockerhub-mcp-server)](https://github.com/raghav-jeogani/dockerhub-mcp-server/pulls)

</div>
