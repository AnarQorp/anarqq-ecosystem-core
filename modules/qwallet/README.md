# Qwallet - Payments & Fees Module

Qwallet is the native payment and wallet module of the AnarQ&Q ecosystem. It handles multi-chain transactions, payment intents, dynamic fee calculation, and comprehensive transaction audit logging.

## Features

- **Multi-chain Support**: Compatible with multiple blockchain networks
- **Pi Wallet Integration**: Native support for Pi Network transactions
- **Payment Intent Management**: Secure payment request handling
- **Dynamic Fee Calculation**: Intelligent fee estimation and optimization
- **DAO-based Spending Limits**: Community-controlled transaction limits
- **Cryptographic Transaction Signing**: Secure transaction authentication
- **Comprehensive Audit Logging**: Full transaction history and compliance

## Run Modes

### Standalone Mode
```bash
# Using Docker Compose
docker-compose up

# Using npm
npm install
npm run dev
```

### Integrated Mode
```bash
# With full ecosystem
npm run start:integrated
```

### Hybrid Mode
```bash
# With selective mocking
npm run start:hybrid
```

## API Endpoints

### HTTP API
- `POST /api/qwallet/intents` - Create payment intent
- `POST /api/qwallet/sign` - Sign transaction
- `POST /api/qwallet/pay` - Process payment
- `GET /api/qwallet/quote` - Get payment quote
- `GET /api/qwallet/balance/:squidId` - Get balance
- `GET /api/qwallet/transactions/:squidId` - Get transaction history

### MCP Tools
- `wallet.sign` - Sign transaction with identity
- `wallet.pay` - Process payment
- `wallet.quote` - Get payment quote and fees

## Events Published
- `q.qwallet.intent.created.v1` - Payment intent created
- `q.qwallet.tx.signed.v1` - Transaction signed
- `q.qwallet.tx.settled.v1` - Transaction settled
- `q.qwallet.limit.exceeded.v1` - Spending limit exceeded

## Integration Requirements

### Identity (sQuid)
- Identity verification for all transactions
- Subidentity support for delegated payments

### Permissions (Qonsent)
- Permission checks for payment operations
- DAO-based spending limit enforcement

### Encryption (Qlock)
- Transaction signing and verification
- Secure key management

### Indexing (Qindex)
- Transaction indexing and searchability
- Payment history tracking

### Audit (Qerberos)
- Comprehensive transaction logging
- Risk assessment and fraud detection

### Privacy (Qmask)
- Transaction privacy profiles
- Selective data anonymization

## Configuration

Environment variables:
- `QWALLET_PI_NETWORK_ENABLED` - Enable Pi Network integration
- `QWALLET_DEFAULT_CURRENCY` - Default currency (QToken/PI)
- `QWALLET_MAX_TRANSACTION_AMOUNT` - Maximum transaction limit
- `QWALLET_FEE_CALCULATION_MODE` - Fee calculation strategy

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Build for production
npm run build
```