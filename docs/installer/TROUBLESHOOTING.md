# AnarQ&Q Installer Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the AnarQ&Q ecosystem installer.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Common Issues](#common-issues)
- [Platform-Specific Issues](#platform-specific-issues)
- [Network Issues](#network-issues)
- [Dependency Issues](#dependency-issues)
- [Permission Issues](#permission-issues)
- [Advanced Troubleshooting](#advanced-troubleshooting)
- [Getting Help](#getting-help)

## Quick Diagnostics

### Run the Test Suite

Before troubleshooting, run the comprehensive test suite to identify issues:

```bash
# Run all tests
./tests/installer/run-all-tests.sh

# Run specific test categories
./tests/installer/run-all-tests.sh unit
./tests/installer/run-all-tests.sh integration
./tests/installer/run-all-tests.sh platform
```

### Check System Requirements

Verify your system meets the minimum requirements:

```bash
# Check essential commands
command -v curl && echo "✅ curl available" || echo "❌ curl missing"
command -v wget && echo "✅ wget available" || echo "❌ wget missing"
command -v git && echo "✅ git available" || echo "❌ git missing"
command -v unzip && echo "✅ unzip available" || echo "❌ unzip missing"
command -v node && echo "✅ node available" || echo "❌ node missing"
command -v npm && echo "✅ npm available" || echo "❌ npm missing"

# Check versions
node --version
npm --version
git --version
```

## Common Issues

### Issue: "command_exists: command not found"

**Symptoms:**
```
./install-anarqq-robust-enhanced.sh: line 45: command_exists: command not found
```

**Cause:** The installer script is missing the `command_exists` function or the dependency manager is not properly sourced.

**Solutions:**

1. **Ensure dependency manager is present:**
   ```bash
   ls -la install-dependency-manager.sh
   ```

2. **Check if both scripts are in the same directory:**
   ```bash
   ls -la install-anarqq-robust-enhanced.sh install-dependency-manager.sh
   ```

3. **Manually source the dependency manager:**
   ```bash
   source ./install-dependency-manager.sh
   ./install-anarqq-robust-enhanced.sh
   ```

### Issue: "unzip: command not found"

**Symptoms:**
```
unzip: command not found
Failed to extract repository archive
```

**Cause:** The `unzip` utility is not installed on your system.

**Solutions:**

1. **Ubuntu/Debian:**
   ```bash
   sudo apt update && sudo apt install unzip
   ```

2. **CentOS/RHEL/Fedora:**
   ```bash
   sudo yum install unzip
   # or for newer versions:
   sudo dnf install unzip
   ```

3. **macOS:**
   ```bash
   # unzip is usually pre-installed, but if missing:
   brew install unzip
   ```

4. **Use alternative extraction method:**
   The installer includes Python-based extraction as a fallback.

### Issue: Repository Download Failures

**Symptoms:**
```
Failed to clone repository
curl: (7) Failed to connect to github.com
```

**Cause:** Network connectivity issues or repository access problems.

**Solutions:**

1. **Check network connectivity:**
   ```bash
   ping -c 3 github.com
   curl -I https://github.com
   ```

2. **Try different download methods:**
   The installer automatically tries multiple methods:
   - Git clone (preferred)
   - cURL ZIP download
   - wget ZIP download

3. **Configure Git for HTTPS:**
   ```bash
   git config --global url."https://github.com/".insteadOf git@github.com:
   ```

4. **Use SSH keys for private repositories:**
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   # Add the public key to your GitHub account
   ```

### Issue: NPM Installation Failures

**Symptoms:**
```
npm ERR! network request to https://registry.npmjs.org/ failed
npm install failed
```

**Cause:** Network issues, NPM registry problems, or permission issues.

**Solutions:**

1. **Clear NPM cache:**
   ```bash
   npm cache clean --force
   ```

2. **Use different registry:**
   ```bash
   npm config set registry https://registry.npmjs.org/
   # or use a mirror:
   npm config set registry https://registry.npmmirror.com/
   ```

3. **Fix permissions (Linux/macOS):**
   ```bash
   sudo chown -R $(whoami) ~/.npm
   ```

4. **Use Node Version Manager:**
   ```bash
   # Install nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   # Install latest Node.js
   nvm install node
   nvm use node
   ```

## Platform-Specific Issues

### Linux Issues

#### Issue: Permission Denied

**Symptoms:**
```
mkdir: cannot create directory '/opt/anarqq': Permission denied
```

**Solutions:**

1. **Install to user directory:**
   ```bash
   export INSTALL_DIR="$HOME/anarqq-ecosystem"
   ./install-anarqq-robust-enhanced.sh
   ```

2. **Use sudo (not recommended):**
   ```bash
   sudo ./install-anarqq-robust-enhanced.sh
   ```

#### Issue: Missing Development Tools

**Symptoms:**
```
make: command not found
gcc: command not found
```

**Solutions:**

1. **Ubuntu/Debian:**
   ```bash
   sudo apt install build-essential
   ```

2. **CentOS/RHEL:**
   ```bash
   sudo yum groupinstall "Development Tools"
   ```

### macOS Issues

#### Issue: Xcode Command Line Tools Missing

**Symptoms:**
```
xcrun: error: invalid active developer path
```

**Solutions:**

1. **Install Xcode Command Line Tools:**
   ```bash
   xcode-select --install
   ```

2. **Accept Xcode license:**
   ```bash
   sudo xcodebuild -license accept
   ```

#### Issue: Homebrew Not Found

**Solutions:**

1. **Install Homebrew:**
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Add Homebrew to PATH:**
   ```bash
   echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
   eval "$(/opt/homebrew/bin/brew shellenv)"
   ```

### Windows/WSL Issues

#### Issue: WSL Not Properly Configured

**Solutions:**

1. **Update WSL:**
   ```powershell
   wsl --update
   ```

2. **Install WSL 2:**
   ```powershell
   wsl --set-default-version 2
   ```

3. **Install Ubuntu:**
   ```powershell
   wsl --install -d Ubuntu
   ```

#### Issue: Windows Path Issues

**Symptoms:**
```
/mnt/c/Users/...: No such file or directory
```

**Solutions:**

1. **Use WSL paths:**
   ```bash
   cd /home/$(whoami)
   ./install-anarqq-robust-enhanced.sh
   ```

2. **Configure WSL mount options:**
   ```bash
   sudo tee /etc/wsl.conf << EOF
   [automount]
   root = /mnt/
   options = "metadata,umask=22,fmask=11"
   EOF
   ```

## Network Issues

### Issue: Corporate Firewall/Proxy

**Symptoms:**
```
curl: (7) Failed to connect to github.com port 443: Connection refused
```

**Solutions:**

1. **Configure proxy for Git:**
   ```bash
   git config --global http.proxy http://proxy.company.com:8080
   git config --global https.proxy https://proxy.company.com:8080
   ```

2. **Configure proxy for NPM:**
   ```bash
   npm config set proxy http://proxy.company.com:8080
   npm config set https-proxy https://proxy.company.com:8080
   ```

3. **Configure proxy for cURL:**
   ```bash
   export http_proxy=http://proxy.company.com:8080
   export https_proxy=https://proxy.company.com:8080
   ```

### Issue: DNS Resolution Problems

**Solutions:**

1. **Use alternative DNS:**
   ```bash
   # Temporarily use Google DNS
   echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
   ```

2. **Flush DNS cache:**
   ```bash
   # Linux
   sudo systemctl restart systemd-resolved
   
   # macOS
   sudo dscacheutil -flushcache
   ```

## Dependency Issues

### Issue: Node.js Version Too Old

**Symptoms:**
```
Error: Node.js version 12.x is not supported. Please use Node.js 16.x or later.
```

**Solutions:**

1. **Using Node Version Manager (recommended):**
   ```bash
   # Install nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   
   # Install and use latest LTS
   nvm install --lts
   nvm use --lts
   nvm alias default node
   ```

2. **Using package manager:**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # macOS
   brew install node
   ```

### Issue: Python Not Available

**Symptoms:**
```
python3: command not found
Failed to extract archive using Python
```

**Solutions:**

1. **Install Python:**
   ```bash
   # Ubuntu/Debian
   sudo apt install python3
   
   # CentOS/RHEL
   sudo yum install python3
   
   # macOS
   brew install python3
   ```

## Permission Issues

### Issue: Cannot Write to Installation Directory

**Solutions:**

1. **Change installation directory:**
   ```bash
   export INSTALL_DIR="$HOME/anarqq-ecosystem"
   ./install-anarqq-robust-enhanced.sh
   ```

2. **Fix directory permissions:**
   ```bash
   sudo chown -R $(whoami):$(whoami) /path/to/install/dir
   ```

### Issue: NPM Permission Errors

**Solutions:**

1. **Configure NPM to use different directory:**
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

2. **Use npx instead of global installs:**
   ```bash
   npx create-react-app my-app
   ```

## Advanced Troubleshooting

### Enable Verbose Logging

Add debug output to the installer:

```bash
# Enable bash debugging
bash -x ./install-anarqq-robust-enhanced.sh

# Or modify the script to add:
set -x  # Enable debug mode
set +x  # Disable debug mode
```

### Check Installation Logs

The installer creates detailed logs:

```bash
# Find recent installer logs
ls -la anarqq-installer-*.log

# View the latest log
tail -f $(ls -t anarqq-installer-*.log | head -1)
```

### Manual Installation Steps

If the automated installer fails, you can install manually:

```bash
# 1. Create installation directory
mkdir -p ~/anarqq-ecosystem
cd ~/anarqq-ecosystem

# 2. Clone repositories manually
git clone https://github.com/AnarQorp/anarqq-ecosystem-demo.git demo
git clone https://github.com/AnarQorp/anarqq-ecosystem-core.git core

# 3. Install dependencies
cd demo && npm install
cd ../core && npm install

# 4. Configure environment
cp demo/.env.example demo/.env
cp core/.env.example core/.env
```

### System Information Collection

Collect system information for support:

```bash
# Create system info report
cat > system-info.txt << EOF
Date: $(date)
OS: $(uname -a)
Shell: $SHELL
Bash Version: $BASH_VERSION
Node.js: $(node --version 2>/dev/null || echo "Not installed")
NPM: $(npm --version 2>/dev/null || echo "Not installed")
Git: $(git --version 2>/dev/null || echo "Not installed")
Curl: $(curl --version 2>/dev/null | head -1 || echo "Not installed")
Wget: $(wget --version 2>/dev/null | head -1 || echo "Not installed")
Python: $(python3 --version 2>/dev/null || echo "Not installed")
Available Space: $(df -h . | tail -1)
Memory: $(free -h 2>/dev/null || echo "N/A")
EOF

cat system-info.txt
```

## Getting Help

### Before Asking for Help

1. **Run the test suite:**
   ```bash
   ./tests/installer/run-all-tests.sh
   ```

2. **Check the logs:**
   ```bash
   ls -la anarqq-installer-*.log
   ```

3. **Collect system information:**
   ```bash
   uname -a
   node --version
   npm --version
   ```

### Support Channels

1. **GitHub Issues:** [Create an issue](https://github.com/AnarQorp/anarqq-ecosystem-demo/issues)
2. **Email Support:** anarqorp@proton.me
3. **Documentation:** Check the [installation guides](INSTALLATION_GUIDES.md)

### Information to Include

When asking for help, please include:

1. **Error message** (exact text)
2. **Operating system** and version
3. **Node.js and NPM versions**
4. **Installation command** you used
5. **Relevant log files**
6. **System information** (from the script above)

### Emergency Contacts

For critical issues or security concerns:

- **Security Issues:** security@anarqorp.com
- **Critical Bugs:** urgent@anarqorp.com
- **Business Inquiries:** contact@anarqorp.com

---

## Appendix: Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 1 | General error | Check logs for specific issue |
| 2 | Missing dependency | Install required dependency |
| 3 | Network error | Check internet connection |
| 4 | Permission error | Fix file/directory permissions |
| 5 | Download error | Try alternative download method |
| 6 | Extraction error | Install unzip or use alternative |
| 7 | NPM error | Clear cache and retry |
| 8 | Git error | Configure Git properly |
| 9 | Configuration error | Check .env files |
| 10 | Validation error | Run post-install validation |

---

*Last updated: $(date '+%Y-%m-%d')*
*Version: 1.0.0*