# {{MODULE_NAME}}

{{MODULE_DESCRIPTION}}

## Overview

This module is part of the Q ecosystem and follows the standardized modular architecture for independence and interoperability.

## Run Modes

### Standalone Mode (Development/Demo)
```bash
# Using Docker Compose
docker compose up

# Using npm
npm run dev:standalone
```

In standalone mode, the module runs with mocked external dependencies for development and testing.

### Integrated Mode (Production)
```bash
# Using Docker Compose
docker compose -f docker-compose.prod.yml up

# Using npm
npm run start
```

In integrated mode, the module connects to real external services in the Q ecosystem.

### Hybrid Mode (Staging)
```bash
# Using environment variables to control which services are mocked
MOCK_SQUID=false MOCK_QLOCK=true npm run dev
```

## API Documentation

- **HTTP API**: See `openapi.yaml` for complete REST API specification
- **MCP Tools**: See `mcp.json` for Model Context Protocol tool definitions
- **Events**: See `events/catalog.md` for published event specifications
- **Contracts**: See `contracts/` directory for request/response schemas

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run in standalone mode**:
   ```bash
   npm run dev:standalone
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | HTTP server port | `3000` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `MOCK_SERVICES` | Comma-separated list of services to mock | `all` | No |
| `SQUID_URL` | sQuid identity service URL | `http://localhost:3001` | Yes (integrated mode) |
| `QLOCK_URL` | Qlock encryption service URL | `http://localhost:3002` | Yes (integrated mode) |
| `QONSENT_URL` | Qonsent permission service URL | `http://localhost:3003` | Yes (integrated mode) |

### Service Dependencies

This module integrates with the following Q ecosystem services:

- **sQuid**: Identity verification and subidentity management
- **Qlock**: Encryption, signatures, and time-locks
- **Qonsent**: Permission checking and policy enforcement
- **Qindex**: Resource indexing and discovery
- **Qerberos**: Security audit and anomaly detection

See `compat/matrix.md` for detailed compatibility information.

## Development

### Project Structure

```
{{MODULE_NAME}}/
├── README.md                    # This file
├── package.json                 # Dependencies and scripts
├── docker-compose.yml          # Standalone deployment
├── openapi.yaml                # HTTP API specification
├── mcp.json                    # MCP tools configuration
├── contracts/                  # Request/response schemas
├── events/                     # Event definitions
├── security/                   # Security policies
├── storage/                    # Storage mapping
├── observability/              # Audit and monitoring
├── compat/                     # Compatibility matrix
├── src/                        # Source code
└── tests/                      # Test suites
```

### Available Scripts

- `npm run dev:standalone` - Run in standalone mode with mocks
- `npm run dev` - Run in development mode
- `npm start` - Run in production mode
- `npm test` - Run all tests
- `npm run test:unit` - Run unit tests
- `npm run test:contract` - Run contract tests
- `npm run test:integration` - Run integration tests
- `npm run lint` - Lint code and specifications
- `npm run build` - Build for production
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container

### Testing

This module maintains 90%+ test coverage with comprehensive test suites:

- **Unit Tests**: Test individual functions and components
- **Contract Tests**: Validate API schemas and interfaces
- **Integration Tests**: Test interactions with other modules
- **End-to-End Tests**: Test complete user workflows

Run specific test suites:
```bash
npm run test:unit
npm run test:contract
npm run test:integration
npm run test:e2e
```

## Security

This module implements security by default:

- **Authentication**: All requests validated through sQuid
- **Authorization**: Permissions checked via Qonsent (deny-by-default)
- **Encryption**: Data encrypted at rest and in transit via Qlock
- **Audit**: All operations logged to Qerberos
- **Privacy**: Personal data protected via Qmask profiles

See `security/policies.md` for detailed security policies.

## Monitoring and Observability

### Health Endpoints

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with dependencies
- `GET /metrics` - Prometheus metrics

### SLO Targets

- **Latency**: p99 < 200ms
- **Availability**: > 99.9% uptime
- **Error Rate**: < 0.1%

See `observability/audit.md` for monitoring specifications.

## Contributing

1. Follow the standardized module structure
2. Maintain 90%+ test coverage
3. Update documentation for any API changes
4. Run linting and security scans before committing
5. Ensure all quality gates pass in CI/CD

## License

[License information]

## Support

For support and questions:
- Documentation: See `docs/` directory
- Issues: [Issue tracker URL]
- Community: [Community forum URL]