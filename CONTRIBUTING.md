# Contributing to DockerHub MCP Server

Thank you for your interest in contributing to the DockerHub MCP Server! This document provides guidelines for contributing to this project.

## 🤝 How to Contribute

### Reporting Issues

- Use the GitHub issue tracker to report bugs
- Include detailed steps to reproduce the issue
- Provide system information and error messages
- Check if the issue has already been reported

### Suggesting Features

- Use the GitHub issue tracker for feature requests
- Describe the feature and its use case
- Explain how it would benefit the project
- Consider implementation complexity

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run tests**: `npm test`
6. **Commit your changes**: `git commit -m "Add feature: description"`
7. **Push to your fork**: `git push origin feature/your-feature-name`
8. **Create a pull request**

## 📋 Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing code style and formatting
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Testing

- Write tests for all new functionality
- Ensure all existing tests pass
- Aim for good test coverage
- Use descriptive test names

### Documentation

- Update README.md for new features
- Add JSDoc comments for public APIs
- Update examples if needed
- Keep documentation up to date

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Git

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/yourusername/dockerhub-mcp-server.git
cd dockerhub-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Development Commands

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Format code
npm run format

# Run tests with coverage
npm run test:coverage
```

## 📝 Commit Guidelines

Use conventional commit messages:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for test changes
- `chore:` for maintenance tasks

Example: `feat: add support for private registries`

## 🔍 Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Tests** must pass
4. **Documentation** must be updated
5. **No conflicts** with main branch

## 📞 Questions?

- Open a GitHub issue for questions
- Join discussions in GitHub Discussions
- Check existing documentation

## 🙏 Thank You

Thank you for contributing to the DockerHub MCP Server! Your contributions help make this project better for everyone.
