# Qwallet Identity Expansion Documentation

This directory contains comprehensive documentation for the enhanced Qwallet identity-aware wallet system.

## Documentation Structure

- **[Component Documentation](./components/)** - Detailed documentation for all wallet components
- **[Integration Guides](./integration/)** - Developer guides for integrating with the wallet system
- **[User Guides](./user-guides/)** - User-facing documentation for different identity types
- **[Examples](./examples/)** - Code examples and usage patterns
- **[Troubleshooting](./troubleshooting/)** - Common issues and solutions
- **[FAQ](./faq.md)** - Frequently asked questions

## Quick Start

For developers looking to integrate with the Qwallet system:

1. Read the [Integration Overview](./integration/overview.md)
2. Check the [Component Examples](./examples/components/)
3. Review the [Identity-Specific Guides](./user-guides/)

## Key Features

- **Identity-Aware Contexts**: Each sQuid identity has its own wallet context
- **Modular Components**: Reusable React components for wallet operations
- **Security Integration**: Built-in Qlock signing and Qonsent permissions
- **Pi Wallet Support**: Seamless integration with Pi Network wallets
- **Comprehensive Audit**: Full transaction logging and risk assessment
- **Multi-Chain Support**: Support for various blockchain networks

## Architecture Overview

The enhanced Qwallet follows a layered architecture:

```
UI Components Layer
    ↓
Hooks & State Layer
    ↓
Services Layer
    ↓
Integration Layer (Qlock, Qonsent, Qerberos)
    ↓
Storage Layer
```

For detailed architecture information, see the [Design Document](../../.kiro/specs/qwallet-identity-expansion/design.md).