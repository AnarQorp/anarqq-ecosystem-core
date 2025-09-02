# Qmarket - Content Marketplace Module

Qmarket is the decentralized marketplace module within the AnarQ&Q ecosystem. It enables users to publish, sell, and interact with digital products and services, fully integrated with the modular architecture Q∞ and ecosystem services.

## Features

- **Content Listing Management**: Create, update, and manage marketplace listings
- **Automated Payment Processing**: Integration with Qwallet for secure transactions
- **Digital Rights Management**: NFT-based ownership and licensing
- **Content Delivery Control**: Access control via Qonsent
- **Privacy Compliance**: Data anonymization via Qmask
- **Comprehensive Audit Logging**: Transaction tracking via Qerberos
- **Revenue Analytics**: Sales and purchase history tracking

## Run Modes

### Standalone Mode (Development/Demo)
```bash
# Using Docker Compose
docker-compose up

# Using npm
npm install
npm run dev
```

In standalone mode, the module runs with mock services for all external dependencies, allowing for isolated development and testing.

### Integrated Mode (Production)
```bash
# Set environment variables for real services
export SQUID_SERVICE_URL=http://squid:3001
export QWALLET_SERVICE_URL=http://qwallet:3002
export QLOCK_SERVICE_URL=http://qlock:3003
export QONSENT_SERVICE_URL=http://qonsent:3004
export QINDEX_SERVICE_URL=http://qindex:3005
export QERBEROS_SERVICE_URL=http://qerberos:3006
export QMASK_SERVICE_URL=http://qmask:3007

npm start
```

## API Endpoints

### HTTP API
- `POST /api/listings` - Create marketplace listing
- `GET /api/listings` - Search and list marketplace items
- `GET /api/listings/:id` - Get specific listing details
- `PUT /api/listings/:id` - Update listing (owner only)
- `DELETE /api/listings/:id` - Delete listing (owner only)
- `POST /api/listings/:id/purchase` - Purchase listing
- `GET /api/purchases` - Get purchase history
- `GET /api/sales` - Get sales history
- `GET /api/stats` - Get marketplace statistics

### MCP Tools
- `qmarket.list` - Create marketplace listing
- `qmarket.purchase` - Purchase marketplace item
- `qmarket.license` - Manage digital licenses

## Events Published
- `q.qmarket.listed.v1` - New listing created
- `q.qmarket.sold.v1` - Item purchased
- `q.qmarket.updated.v1` - Listing updated
- `q.qmarket.delisted.v1` - Listing removed

## Integration

### Required Services
- **sQuid**: Identity verification and subidentity management
- **Qwallet**: Payment processing and NFT minting
- **Qlock**: Data encryption and digital signatures
- **Qonsent**: Access control and permissions
- **Qindex**: Content indexing and searchability
- **Qerberos**: Security audit logging
- **Qmask**: Privacy profile application

### Optional Services
- **IPFS**: Decentralized content storage
- **QNET**: Optimized content delivery

## Configuration

Environment variables:
```bash
# Service URLs (use 'mock' for standalone mode)
SQUID_SERVICE_URL=mock
QWALLET_SERVICE_URL=mock
QLOCK_SERVICE_URL=mock
QONSENT_SERVICE_URL=mock
QINDEX_SERVICE_URL=mock
QERBEROS_SERVICE_URL=mock
QMASK_SERVICE_URL=mock

# Marketplace settings
DEFAULT_CURRENCY=QToken
MAX_LISTING_PRICE=1000000
LISTING_EXPIRATION_DAYS=365
ENABLE_NFT_MINTING=true
DEFAULT_ROYALTY_PERCENTAGE=5

# Server settings
PORT=3008
NODE_ENV=development
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:contract
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build
```

## License

MIT License - see LICENSE file for details.