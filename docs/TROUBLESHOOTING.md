# 🔧 Troubleshooting Guide

> **Common issues and solutions for DockerHub MCP Server**

## 📋 Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Installation Issues](#installation-issues)
- [Authentication Problems](#authentication-problems)
- [MCP Client Integration](#mcp-client-integration)
- [Performance Issues](#performance-issues)
- [API Errors](#api-errors)
- [Network Issues](#network-issues)
- [Debugging](#debugging)
- [Getting Help](#getting-help)

## 🔍 Quick Diagnosis

### **Health Check**

Run this command to check if the server is working:

```bash
# Test basic functionality
node test-all-tools-comprehensive.js

# Check server status
curl -X GET http://localhost:3000/health
```

### **Common Symptoms**

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| "Server not found" | Path incorrect | Check `cwd` in MCP config |
| "Authentication failed" | Invalid token | Verify DockerHub token |
| "Rate limit exceeded" | Too many requests | Wait 60 seconds |
| "Connection timeout" | Network issue | Check internet connection |
| "Tool not available" | Server not started | Run `npm start` |

## 🚀 Installation Issues

### **Node.js Version Problems**

**Problem**: `SyntaxError: Unexpected token` or similar errors

**Solution**:
```bash
# Check Node.js version
node --version  # Should be 18+

# Update Node.js if needed
# On Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# On macOS:
brew install node@18

# On Windows:
# Download from https://nodejs.org/
```

### **Permission Denied**

**Problem**: `EACCES: permission denied` when installing packages

**Solution**:
```bash
# Fix npm permissions
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config

# Or use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### **Build Failures**

**Problem**: `npm run build` fails

**Solution**:
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

## 🔐 Authentication Problems

### **Invalid Token**

**Problem**: `401 Unauthorized` errors

**Solution**:
```bash
# 1. Verify token format
echo $DOCKERHUB_TOKEN  # Should be a long string

# 2. Test token manually
curl -H "Authorization: Token $DOCKERHUB_TOKEN" \
  https://hub.docker.com/v2/user/

# 3. Create new token
# Go to https://hub.docker.com/settings/security
# Create new access token with read permissions
```

### **Token Expired**

**Problem**: Token works initially but fails later

**Solution**:
```bash
# Check token expiration
curl -H "Authorization: Token $DOCKERHUB_TOKEN" \
  https://hub.docker.com/v2/user/ | jq '.'

# Create new token with longer expiration
# Set expiration to 1 year or more
```

### **Insufficient Permissions**

**Problem**: `403 Forbidden` errors

**Solution**:
```bash
# Check token permissions
curl -H "Authorization: Token $DOCKERHUB_TOKEN" \
  https://hub.docker.com/v2/user/ | jq '.permissions'

# Ensure token has read permissions
# Go to DockerHub settings and update token permissions
```

### **Environment Variable Issues**

**Problem**: Token not being read

**Solution**:
```bash
# 1. Check .env file
cat .env | grep DOCKERHUB_TOKEN

# 2. Verify environment variable
echo $DOCKERHUB_TOKEN

# 3. Export manually if needed
export DOCKERHUB_TOKEN="your_token_here"

# 4. Check for typos
# Ensure no spaces around = in .env file
DOCKERHUB_TOKEN=your_token_here  # ✅ Correct
DOCKERHUB_TOKEN = your_token_here  # ❌ Wrong
```

## 🤖 MCP Client Integration

### **Claude Desktop Issues**

#### **"Server not found"**

**Problem**: Claude can't find the MCP server

**Solution**:
```json
{
  "mcpServers": {
    "dockerhub": {
      "command": "node",
      "args": ["/absolute/path/to/dockerhub-mcp-server/dist/index.js"],
      "cwd": "/absolute/path/to/dockerhub-mcp-server",
      "env": {
        "DOCKERHUB_TOKEN": "your_token_here",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

#### **"Failed to create client"**

**Problem**: Server starts but client connection fails

**Solution**:
```bash
# 1. Test server manually
node dist/index.js

# 2. Check for errors in Claude Desktop logs
# Look for MCP-related error messages

# 3. Verify file permissions
ls -la dist/index.js
chmod +x dist/index.js

# 4. Test with simple MCP request
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

#### **"No tools available"**

**Problem**: Server connects but no tools shown

**Solution**:
```bash
# 1. Check server logs
LOG_LEVEL=debug npm start

# 2. Test tools list manually
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js

# 3. Verify tools are properly registered
# Check src/tools/index.ts for tool definitions
```

### **Cursor Issues**

#### **"Invalid config"**

**Problem**: Cursor shows configuration error

**Solution**:
```json
{
  "mcpServers": {
    "dockerhub": {
      "command": "node",
      "args": ["/absolute/path/to/dockerhub-mcp-server/dist/index.js"],
      "cwd": "/absolute/path/to/dockerhub-mcp-server",
      "env": {
        "DOCKERHUB_TOKEN": "your_token_here",
        "LOG_LEVEL": "info",
        "PATH": "/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

#### **"Client closed"**

**Problem**: Server connects but immediately disconnects

**Solution**:
```bash
# 1. Check for stdout/stderr interference
# Ensure logs go to stderr only
LOG_LEVEL=error npm start

# 2. Test server in isolation
node dist/index.js < /dev/null

# 3. Check for missing dependencies
npm install
npm run build
```

### **Cline Issues**

#### **"Command not found"**

**Problem**: Cline can't find the node command

**Solution**:
```yaml
mcp_servers:
  dockerhub:
    command: /usr/local/bin/node  # Use full path
    args: [/absolute/path/to/dockerhub-mcp-server/dist/index.js]
    cwd: /absolute/path/to/dockerhub-mcp-server
    env:
      DOCKERHUB_TOKEN: your_token_here
      PATH: /usr/local/bin:/usr/bin:/bin
```

#### **"Permission denied"**

**Problem**: Cline can't execute the server

**Solution**:
```bash
# Make executable
chmod +x dist/index.js

# Check file ownership
ls -la dist/index.js

# Fix ownership if needed
sudo chown $USER:$USER dist/index.js
```

## ⚡ Performance Issues

### **Slow Response Times**

**Problem**: Tools take too long to respond

**Solution**:
```bash
# 1. Check cache settings
echo $CACHE_TTL  # Should be 300+ seconds

# 2. Monitor memory usage
top -p $(pgrep -f "node.*dist/index.js")

# 3. Check network latency
ping hub.docker.com

# 4. Enable debug logging
LOG_LEVEL=debug npm start
```

### **High Memory Usage**

**Problem**: Server uses too much memory

**Solution**:
```bash
# 1. Check cache size
# Reduce CACHE_MAX_KEYS in .env
CACHE_MAX_KEYS=500

# 2. Monitor cache usage
node -e "
const cache = require('./dist/services/cache.js');
console.log(cache.getStats());
"

# 3. Restart server periodically
# Add to crontab: 0 */6 * * * pkill -f 'node.*dist/index.js'
```

### **Rate Limiting Issues**

**Problem**: Too many "rate limit exceeded" errors

**Solution**:
```bash
# 1. Reduce request frequency
# Increase delays between requests

# 2. Use caching effectively
# Set appropriate TTL values

# 3. Implement exponential backoff
# The server does this automatically

# 4. Check current rate limits
curl -H "Authorization: Token $DOCKERHUB_TOKEN" \
  https://hub.docker.com/v2/rate_limit/
```

## 🚨 API Errors

### **404 Not Found**

**Problem**: Repository or image not found

**Solution**:
```bash
# 1. Verify repository name
# Check spelling and case sensitivity
library/nginx  # ✅ Correct
Library/Nginx  # ❌ Wrong

# 2. Check if repository exists
curl https://hub.docker.com/v2/repositories/library/nginx/

# 3. Verify tag exists
curl https://hub.docker.com/v2/repositories/library/nginx/tags/latest/
```

### **429 Rate Limit Exceeded**

**Problem**: Too many requests

**Solution**:
```bash
# 1. Wait for rate limit reset
# Check Retry-After header

# 2. Implement backoff
# Server does this automatically

# 3. Reduce request frequency
# Use caching more effectively

# 4. Check rate limit status
curl -H "Authorization: Token $DOCKERHUB_TOKEN" \
  https://hub.docker.com/v2/rate_limit/
```

### **500 Internal Server Error**

**Problem**: DockerHub API server error

**Solution**:
```bash
# 1. Check DockerHub status
# Visit https://status.docker.com/

# 2. Retry with exponential backoff
# Server handles this automatically

# 3. Check request format
# Verify parameters are correct

# 4. Try alternative endpoint
# Some endpoints might be temporarily unavailable
```

## 🌐 Network Issues

### **Connection Timeout**

**Problem**: Requests timeout

**Solution**:
```bash
# 1. Check internet connection
ping hub.docker.com

# 2. Check DNS resolution
nslookup hub.docker.com

# 3. Try different DNS
# Use 8.8.8.8 or 1.1.1.1

# 4. Check firewall/proxy
# Ensure outbound HTTPS is allowed

# 5. Increase timeout
# Set in .env:
REQUEST_TIMEOUT=60000
```

### **SSL/TLS Issues**

**Problem**: SSL certificate errors

**Solution**:
```bash
# 1. Update CA certificates
# On Ubuntu/Debian:
sudo apt-get update && sudo apt-get install ca-certificates

# On macOS:
sudo security find-certificate -a -p /System/Library/Keychains/SystemRootCertificates.keychain > /tmp/certs.pem

# 2. Check Node.js SSL
node -e "console.log(require('tls').getCiphers())"

# 3. Disable SSL verification (not recommended)
# Only for testing: NODE_TLS_REJECT_UNAUTHORIZED=0
```

### **Proxy Issues**

**Problem**: Behind corporate proxy

**Solution**:
```bash
# 1. Set proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# 2. Configure npm proxy
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# 3. Add to .env file
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
```

## 🐛 Debugging

### **Enable Debug Logging**

```bash
# Set debug level
LOG_LEVEL=debug npm start

# Or set in .env
LOG_LEVEL=debug
```

### **Test Individual Components**

```bash
# Test API service
node test-api.js

# Test cache service
node test-cache.js

# Test rate limiter
node test-rate-limiter.js

# Test MCP communication
node test-mcp-communication.js
```

### **Monitor Server Logs**

```bash
# Follow logs in real-time
tail -f logs/combined.log

# Filter by level
grep "ERROR" logs/combined.log

# Search for specific errors
grep "Authentication" logs/combined.log
```

### **Check System Resources**

```bash
# Monitor CPU and memory
htop

# Check disk space
df -h

# Monitor network connections
netstat -tulpn | grep node

# Check open files
lsof -p $(pgrep -f "node.*dist/index.js")
```

### **Debug MCP Protocol**

```bash
# Test MCP initialization
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node dist/index.js

# Test tools list
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node dist/index.js

# Test tool call
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"docker_search_images","arguments":{"query":"nginx","limit":1}}}' | node dist/index.js
```

## 🆘 Getting Help

### **Before Asking for Help**

1. **Check this guide** - Your issue might be covered here
2. **Search existing issues** - Look for similar problems
3. **Enable debug logging** - Gather detailed error information
4. **Test manually** - Try reproducing the issue step by step

### **When Reporting Issues**

Include the following information:

```markdown
## 🐛 Issue Description
Brief description of the problem

## 🔍 Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## 📋 Expected Behavior
What you expected to happen

## 🚨 Actual Behavior
What actually happened

## 📊 Environment
- OS: [e.g. Ubuntu 22.04, macOS 13.0, Windows 11]
- Node.js Version: [e.g. 18.17.0]
- DockerHub MCP Server Version: [e.g. 1.0.0]
- MCP Client: [e.g. Claude Desktop, Cursor, Cline]

## 📝 Logs
```
[Include relevant log output with LOG_LEVEL=debug]
```

## 🔧 Configuration
```
[Include relevant parts of your .env file and MCP config]
```

## 📸 Screenshots
[If applicable, add screenshots]
```

### **Useful Commands for Debugging**

```bash
# Get system information
uname -a
node --version
npm --version

# Check server status
ps aux | grep node
netstat -tulpn | grep 3000

# Test DockerHub API directly
curl -H "Authorization: Token $DOCKERHUB_TOKEN" \
  https://hub.docker.com/v2/user/

# Check environment variables
env | grep DOCKERHUB

# Test MCP server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

### **Community Resources**

- **GitHub Issues**: [Report bugs](https://github.com/raghav-jeogani/dockerhub-mcp-server/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/raghav-jeogani/dockerhub-mcp-server/discussions)
- **Documentation**: [Wiki](https://github.com/raghav-jeogani/dockerhub-mcp-server/wiki)
- **Email**: [raghavjeogani@gmail.com](mailto:raghavjeogani@gmail.com)

---

## 🔗 Related Documentation

- [Installation Guide](../README.md#quick-start)
- [API Documentation](API.md)
- [Configuration Guide](../README.md#configuration)
- [Contributing Guide](../CONTRIBUTING.md)

---

**For more help, visit the [GitHub repository](https://github.com/raghav-jeogani/dockerhub-mcp-server)** 