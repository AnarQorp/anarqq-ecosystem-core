#!/bin/bash

# Exit on error
set -e

echo "🚀 Initializing IPFS repository..."

# Create IPFS repository directory if it doesn't exist
IPFS_REPO_PATH="./ipfs-repo"
if [ ! -d "$IPFS_REPO_PATH" ]; then
  echo "📁 Creating IPFS repository directory at $IPFS_REPO_PATH..."
  mkdir -p "$IPFS_REPO_PATH"
  
  # Initialize IPFS repository
  ipfs init --profile server --empty-repo "$IPFS_REPO_PATH"
  
  echo "✅ IPFS repository initialized successfully!"
else
  echo "ℹ️  IPFS repository already exists at $IPFS_REPO_PATH"
fi

# Update IPFS configuration
echo "\n🔧 Updating IPFS configuration..."
ipfs config --json Addresses.API '"/ip4/127.0.0.1/tcp/5001"'
ipfs config --json Addresses.Gateway '"/ip4/127.0.0.1/tcp/8080"'
ipfs config --json Addresses.Swarm '["/ip4/0.0.0.0/tcp/4001", "/ip6/::/tcp/4001", "/ip4/0.0.0.0/udp/4001/quic", "/ip6/::/udp/4001/quic"]'
ipfs config --json Discovery.MDNS.Enabled true

# Enable experimental features
ipfs config --json Experimental.ShardingEnabled true
ipfs config --json Experimental.AcceleratedDHTClient true

# Set up CORS
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "GET", "POST"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Headers '["Authorization"]'
ipfs config --json API.HTTPHeaders.Access-Control-Expose-Headers '["Location"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials '["true"]'

echo "✅ IPFS configuration updated successfully!"

echo "\n🔍 Current IPFS configuration:"
ipfs config show

echo "\n🚀 Starting IPFS daemon..."
echo "   - API: http://localhost:5001"
echo "   - Gateway: http://localhost:8080"
echo "   - WebUI: http://localhost:5001/webui"
echo "\n📝 Press Ctrl+C to stop the daemon"

# Start IPFS daemon
ipfs daemon --enable-pubsub-experiment --enable-namesys-pubsub
