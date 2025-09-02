#!/bin/bash
# Demo Setup Script - Demo Setup Script

set -e

echo "Starting AnarQ&Q demo setup..."

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        echo "Error: Node.js is not installed"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo "Error: Docker is not installed"
        exit 1
    fi
    
    echo "Prerequisites verified ✓"
}

# Setup services
setup_services() {
    echo "Setting up services..."
    
    # Start containers
    docker-compose -f docker-compose.demo.yml up -d
    
    # Wait for services to be ready
    echo "Waiting for services..."
    sleep 10
    
    echo "Services configured ✓"
}

# Generate test data
generate_test_data() {
    echo "Generating test data..."
    
    npm run demo:generate-test-data
    
    echo "Test data generated ✓"
}

# Run setup
main() {
    check_prerequisites
    setup_services
    generate_test_data
    
    echo ""
    echo "🎉 Demo setup completed!"
    echo ""
    echo "To run demos:"
    echo "  npm run demo:identity"
    echo "  npm run demo:content"
    echo "  npm run demo:dao"
    echo ""
}

main "$@"
