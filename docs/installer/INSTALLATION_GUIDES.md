# AnarQ&Q Installer User Guides

Comprehensive installation guides for different user scenarios and platforms.

## Table of Contents

- [Quick Start Guide](#quick-start-guide)
- [Installation Scenarios](#installation-scenarios)
- [Platform-Specific Guides](#platform-specific-guides)
- [Advanced Installation Options](#advanced-installation-options)
- [Post-Installation Setup](#post-installation-setup)
- [Maintenance and Updates](#maintenance-and-updates)

## Quick Start Guide

### Prerequisites

Before installing, ensure you have:

- **Operating System:** Linux, macOS, or Windows with WSL
- **Internet Connection:** Required for downloading repositories and dependencies
- **Disk Space:** At least 2GB free space
- **User Permissions:** Ability to create directories in your home folder

### One-Command Installation

```bash
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-robust-enhanced.sh | bash
```

Or download and run locally:

```bash
wget https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-robust-enhanced.sh
chmod +x install-anarqq-robust-enhanced.sh
./install-anarqq-robust-enhanced.sh
```

### What Gets Installed

The installer will:

1. ✅ Check and install system dependencies
2. ✅ Download AnarQ&Q ecosystem repositories
3. ✅ Install Node.js dependencies
4. ✅ Configure environment files
5. ✅ Create startup scripts
6. ✅ Validate the installation

## Installation Scenarios

### Scenario 1: Developer Setup

**Who:** Developers who want to contribute to or extend the AnarQ&Q ecosystem.

**What's Included:**
- Complete source code
- Development dependencies
- Testing frameworks
- Documentation tools

**Installation:**

```bash
# Download the installer
curl -O https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-robust-enhanced.sh
chmod +x install-anarqq-robust-enhanced.sh

# Run with development mode
export INSTALL_MODE="development"
./install-anarqq-robust-enhanced.sh
```

**Post-Installation:**

```bash
cd ~/anarqq-ecosystem/demo
npm run dev          # Start development server
npm run test         # Run tests
npm run build        # Build for production
```

### Scenario 2: Demo/Evaluation Setup

**Who:** Users who want to quickly evaluate the AnarQ&Q ecosystem.

**What's Included:**
- Pre-configured demo environment
- Sample data and configurations
- Quick-start tutorials

**Installation:**

```bash
# Standard installation (demo mode is default)
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-robust-enhanced.sh | bash
```

**Post-Installation:**

```bash
cd ~/anarqq-ecosystem/demo
npm start            # Start demo server
# Open http://localhost:3000 in your browser
```

### Scenario 3: Production Deployment

**Who:** System administrators deploying AnarQ&Q in production environments.

**What's Included:**
- Optimized production builds
- Security configurations
- Monitoring tools
- Backup scripts

**Installation:**

```bash
# Download installer
wget https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-robust-enhanced.sh
chmod +x install-anarqq-robust-enhanced.sh

# Set production environment
export NODE_ENV="production"
export INSTALL_DIR="/opt/anarqq"
sudo ./install-anarqq-robust-enhanced.sh
```

**Post-Installation:**

```bash
cd /opt/anarqq/demo
sudo npm run build
sudo npm run start:prod
```

### Scenario 4: Educational/Training Setup

**Who:** Educators and trainers setting up AnarQ&Q for learning purposes.

**What's Included:**
- Educational materials
- Step-by-step tutorials
- Interactive examples
- Simplified configurations

**Installation:**

```bash
# Create dedicated directory for training
mkdir ~/anarqq-training
cd ~/anarqq-training

# Download and run installer
curl -O https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-robust-enhanced.sh
chmod +x install-anarqq-robust-enhanced.sh

export INSTALL_DIR="$(pwd)/anarqq-ecosystem"
./install-anarqq-robust-enhanced.sh
```

## Platform-Specific Guides

### Linux Installation

#### Ubuntu/Debian

**Prerequisites:**

```bash
# Update package list
sudo apt update

# Install essential tools
sudo apt install curl wget git unzip build-essential

# Install Node.js (recommended method)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Installation:**

```bash
# Standard installation
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-robust-enhanced.sh | bash
```

**Troubleshooting:**

```bash
# If you encounter permission issues
export INSTALL_DIR="$HOME/anarqq-ecosystem"

# If Node.js is too old
sudo apt remove nodejs npm
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### CentOS/RHEL/Fedora

**Prerequisites:**

```bash
# CentOS/RHEL 7/8
sudo yum groupinstall "Development Tools"
sudo yum install curl wget git unzip

# Fedora
sudo dnf groupinstall "Development Tools"
sudo dnf install curl wget git unzip

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo yum install nodejs  # or sudo dnf install nodejs
```

**Installation:**

```bash
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-robust-enhanced.sh | bash
```

#### Arch Linux

**Prerequisites:**

```bash
sudo pacman -S curl wget git unzip base-devel nodejs npm
```

**Installation:**

```bash
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-robust-enhanced.sh | bash
```

### macOS Installation

#### Prerequisites

**Install Xcode Command Line Tools:**

```bash
xcode-select --install
```

**Install Homebrew (recommended):**

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Install dependencies:**

```bash
brew install node git curl wget unzip
```

#### Installation

```bash
# Standard installation
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-robust-enhanced.sh | bash
```

#### macOS-Specific Notes

- The installer automatically detects macOS and uses appropriate commands
- Homebrew is used for dependency installation when available
- If you don't have Homebrew, the installer will provide manual installation instructions

### Windows (WSL) Installation

#### Prerequisites

**Install WSL 2:**

```powershell
# Run in PowerShell as Administrator
wsl --install
# Restart your computer
```

**Install Ubuntu on WSL:**

```powershell
wsl --install -d Ubuntu
```

**Update Ubuntu and install dependencies:**

```bash
# Inside WSL Ubuntu terminal
sudo apt update && sudo apt upgrade -y
sudo apt install curl wget git unzip build-essential

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Installation

```bash
# Inside WSL terminal
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-robust-enhanced.sh | bash
```

#### Windows-Specific Notes

- Always use WSL terminal, not Command Prompt or PowerShell
- Files are installed in the Linux filesystem (`/home/username/`)
- You can access files from Windows at `\\wsl$\Ubuntu\home\username\`

## Advanced Installation Options

### Custom Installation Directory

```bash
export INSTALL_DIR="/custom/path/to/anarqq"
./install-anarqq-robust-enhanced.sh
```

### Offline Installation

If you have limited internet connectivity:

1. **Download repositories manually:**

```bash
# On a machine with internet access
git clone https://github.com/AnarQorp/anarqq-ecosystem-demo.git
git clone https://github.com/AnarQorp/anarqq-ecosystem-core.git
tar -czf anarqq-offline.tar.gz anarqq-ecosystem-*
```

2. **Transfer and extract:**

```bash
# On the target machine
tar -xzf anarqq-offline.tar.gz
cd anarqq-ecosystem-demo
npm install --offline
```

### Docker Installation

For containerized deployment:

```bash
# Clone the repository
git clone https://github.com/AnarQorp/anarqq-ecosystem-demo.git
cd anarqq-ecosystem-demo

# Build Docker image
docker build -t anarqq-demo .

# Run container
docker run -p 3000:3000 anarqq-demo
```

### Behind Corporate Firewall

```bash
# Configure proxy settings
export http_proxy=http://proxy.company.com:8080
export https_proxy=https://proxy.company.com:8080

# Configure Git proxy
git config --global http.proxy $http_proxy
git config --global https.proxy $https_proxy

# Configure NPM proxy
npm config set proxy $http_proxy
npm config set https-proxy $https_proxy

# Run installer
./install-anarqq-robust-enhanced.sh
```

## Post-Installation Setup

### Verify Installation

```bash
# Run the test suite
./tests/installer/run-all-tests.sh

# Check installed components
cd ~/anarqq-ecosystem/demo
npm run health-check

# Start the demo
npm start
```

### Configuration

#### Environment Variables

Edit the `.env` file in your installation directory:

```bash
cd ~/anarqq-ecosystem/demo
nano .env
```

Common configurations:

```env
# Server configuration
PORT=3000
HOST=localhost

# Database configuration
DATABASE_URL=sqlite:./data/anarqq.db

# API configuration
API_BASE_URL=http://localhost:3001

# Security
JWT_SECRET=your-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here
```

#### Network Configuration

For production deployments:

```env
# Production settings
NODE_ENV=production
PORT=80
HOST=0.0.0.0

# SSL/TLS
HTTPS_ENABLED=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### Starting Services

#### Development Mode

```bash
cd ~/anarqq-ecosystem/demo
npm run dev
```

#### Production Mode

```bash
cd ~/anarqq-ecosystem/demo
npm run build
npm run start:prod
```

#### Background Service

```bash
# Using PM2 (recommended)
npm install -g pm2
cd ~/anarqq-ecosystem/demo
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Maintenance and Updates

### Updating the Installation

```bash
cd ~/anarqq-ecosystem/demo
git pull origin main
npm install
npm run build
```

### Backup

```bash
# Create backup
tar -czf anarqq-backup-$(date +%Y%m%d).tar.gz ~/anarqq-ecosystem

# Backup database (if using SQLite)
cp ~/anarqq-ecosystem/demo/data/anarqq.db ~/backups/
```

### Monitoring

#### Health Checks

```bash
# Check service status
curl http://localhost:3000/health

# Check logs
tail -f ~/anarqq-ecosystem/demo/logs/app.log
```

#### Performance Monitoring

```bash
# Install monitoring tools
npm install -g clinic
cd ~/anarqq-ecosystem/demo

# Profile performance
clinic doctor -- node server.js
```

### Uninstallation

```bash
# Stop services
pm2 stop all
pm2 delete all

# Remove installation
rm -rf ~/anarqq-ecosystem

# Clean NPM cache
npm cache clean --force
```

## Troubleshooting

For detailed troubleshooting information, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

### Quick Fixes

#### Installation Fails

```bash
# Clean previous installation
rm -rf ~/anarqq-ecosystem
rm -f anarqq-installer-*.log

# Retry installation
./install-anarqq-robust-enhanced.sh
```

#### Service Won't Start

```bash
# Check Node.js version
node --version  # Should be >= 16.0.0

# Check port availability
netstat -tlnp | grep :3000

# Check logs
tail -f ~/anarqq-ecosystem/demo/logs/error.log
```

#### Permission Issues

```bash
# Fix ownership
sudo chown -R $(whoami):$(whoami) ~/anarqq-ecosystem

# Fix permissions
chmod -R 755 ~/anarqq-ecosystem
```

## Support

### Documentation

- [API Documentation](../api/README.md)
- [Developer Guide](../CONTRIBUTING.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)

### Community

- **GitHub Issues:** [Report bugs and request features](https://github.com/AnarQorp/anarqq-ecosystem-demo/issues)
- **Discussions:** [Community discussions](https://github.com/AnarQorp/anarqq-ecosystem-demo/discussions)

### Professional Support

- **Email:** anarqorp@proton.me
- **Business Inquiries:** contact@anarqorp.com
- **Security Issues:** security@anarqorp.com

---

*Last updated: $(date '+%Y-%m-%d')*
*Version: 1.0.0*