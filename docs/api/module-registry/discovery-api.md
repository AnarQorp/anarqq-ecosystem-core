# Discovery API Reference

The Discovery API provides powerful search and discovery capabilities for finding modules in the Q ecosystem.

## Endpoints

### List Modules

Get a paginated list of all registered modules with optional filtering.

**Endpoint:** `GET /api/modules`

**Authentication:** Optional (public endpoint with rate limiting)

**Query Parameters:**
- `limit` (number, optional): Maximum results per page (default: 50, max: 100)
- `offset` (number, optional): Pagination offset (default: 0)
- `status` (string, optional): Filter by module status (`DEVELOPMENT`, `TESTING`, `PRODUCTION_READY`, `DEPRECATED`, `SUSPENDED`)
- `identityType` (string, optional): Filter by supported identity type
- `integration` (string, optional): Filter by ecosystem integration
- `includeTestMode` (boolean, optional): Include sandbox modules (default: false)
- `sortBy` (string, optional): Sort field (`name`, `version`, `registeredAt`, `queryCount`, `relevance`)
- `sortOrder` (string, optional): Sort direction (`asc`, `desc`, default: `desc`)
- `format` (string, optional): Response format (`json`, `yaml`, default: `json`)

**Response:**
```typescript
{
  modules: RegisteredModule[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
  searchMetadata: {
    query: string;
    filters: Record<string, any>;
    sortBy: string;
    sortOrder: string;
    executionTime: number;
  };
}
```

**Example Request:**
```bash
curl "https://api.example.com/api/modules?limit=10&status=PRODUCTION_READY&identityType=ROOT&sortBy=queryCount"
```

**Example Response:**
```json
{
  "modules": [
    {
      "moduleId": "qwallet-core",
      "metadata": {
        "module": "qwallet-core",
        "version": "2.1.0",
        "description": "Core Qwallet functionality and wallet management",
        "identities_supported": ["ROOT", "DAO", "ENTERPRISE"],
        "integrations": ["Qindex", "Qlock", "Qerberos"],
        "status": "PRODUCTION_READY",
        "repository": "https://github.com/qwallet/core",
        "documentation": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
        "compliance": {
          "audit": true,
          "privacy_enforced": true,
          "gdpr_compliant": true
        }
      },
      "registrationInfo": {
        "registeredAt": "2024-01-10T08:00:00.000Z",
        "registeredBy": "did:root:example123",
        "status": "PRODUCTION_READY",
        "verificationStatus": "VERIFIED"
      },
      "accessStats": {
        "queryCount": 15420,
        "lastAccessed": "2024-01-15T14:30:00.000Z",
        "dependentModules": ["qwallet-payments", "qwallet-defi"]
      }
    }
  ],
  "totalCount": 1,
  "hasMore": false,
  "searchMetadata": {
    "filters": {
      "status": "PRODUCTION_READY",
      "identityType": "ROOT"
    },
    "sortBy": "queryCount",
    "sortOrder": "desc",
    "executionTime": 45
  }
}
```

### Get Module Details

Retrieve detailed information about a specific module.

**Endpoint:** `GET /api/modules/{moduleId}`

**Authentication:** Optional

**Path Parameters:**
- `moduleId` (string): The module identifier

**Query Parameters:**
- `includeHistory` (boolean, optional): Include registration history (default: false)
- `includeStats` (boolean, optional): Include detailed access statistics (default: true)
- `includeDependencies` (boolean, optional): Include dependency information (default: false)
- `includeCompatibility` (boolean, optional): Include compatibility analysis (default: false)

**Response:**
```typescript
{
  moduleId: string;
  metadata: QModuleMetadata;
  signedMetadata: SignedModuleMetadata;
  registrationInfo: {
    cid: string;
    indexId: string;
    registeredAt: string;
    registeredBy: string;
    status: ModuleStatus;
    verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'INVALID';
    testMode?: boolean;
  };
  accessStats: {
    queryCount: number;
    lastAccessed: string;
    dependentModules: string[];
    averageResponseTime?: number;
    errorRate?: number;
  };
  history?: RegistrationHistoryEntry[];
  dependencies?: {
    direct: string[];
    transitive: string[];
    resolved: boolean;
    conflicts: DependencyConflict[];
  };
  compatibility?: {
    score: number;
    details: Record<string, number>;
    recommendations: string[];
  };
}
```

**Example Request:**
```bash
curl "https://api.example.com/api/modules/qwallet-core?includeHistory=true&includeDependencies=true"
```

### Search Modules

Perform advanced search with multiple criteria and filters.

**Endpoint:** `GET /api/modules/search`

**Authentication:** Optional

**Query Parameters:**
- `q` (string, optional): Search query (searches name, description, tags)
- `name` (string, optional): Filter by module name (supports wildcards)
- `type` (string, optional): Filter by module type/category
- `status` (string, optional): Filter by module status
- `identityType` (string, optional): Filter by supported identity type
- `integration` (string, optional): Filter by ecosystem integration
- `hasCompliance` (boolean, optional): Filter modules with compliance info
- `minVersion` (string, optional): Minimum version requirement
- `maxVersion` (string, optional): Maximum version requirement
- `registeredAfter` (string, optional): Filter by registration date (ISO 8601)
- `registeredBefore` (string, optional): Filter by registration date (ISO 8601)
- `includeTestMode` (boolean, optional): Include sandbox modules
- `limit` (number, optional): Maximum results (default: 50, max: 100)
- `offset` (number, optional): Pagination offset
- `sortBy` (string, optional): Sort field
- `sortOrder` (string, optional): Sort direction
- `facets` (boolean, optional): Include search facets (default: false)

**Response:**
```typescript
{
  modules: RegisteredModule[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
  searchMetadata: {
    query: string;
    filters: Record<string, any>;
    executionTime: number;
    cached: boolean;
  };
  facets?: {
    status: { [key: string]: number };
    identityTypes: { [key: string]: number };
    integrations: { [key: string]: number };
    compliance: { [key: string]: number };
  };
}
```

**Example Request:**
```bash
curl "https://api.example.com/api/modules/search?q=payment&identityType=DAO&hasCompliance=true&facets=true"
```

**Example Response:**
```json
{
  "modules": [
    {
      "moduleId": "qwallet-payments",
      "metadata": {
        "module": "qwallet-payments",
        "version": "1.2.0",
        "description": "Advanced payment processing module",
        "identities_supported": ["ROOT", "DAO", "ENTERPRISE"],
        "integrations": ["Qindex", "Qlock"],
        "status": "PRODUCTION_READY"
      }
    }
  ],
  "totalCount": 1,
  "hasMore": false,
  "searchMetadata": {
    "query": "payment",
    "filters": {
      "identityType": "DAO",
      "hasCompliance": true
    },
    "executionTime": 23,
    "cached": false
  },
  "facets": {
    "status": {
      "PRODUCTION_READY": 1,
      "TESTING": 0
    },
    "identityTypes": {
      "ROOT": 1,
      "DAO": 1,
      "ENTERPRISE": 1
    },
    "integrations": {
      "Qindex": 1,
      "Qlock": 1,
      "Qerberos": 0
    }
  }
}
```

### Get Modules by Type

Retrieve modules filtered by type or category.

**Endpoint:** `GET /api/modules/by-type/{type}`

**Authentication:** Optional

**Path Parameters:**
- `type` (string): Module type/category (e.g., "wallet", "payment", "defi", "governance")

**Query Parameters:**
- `status` (string, optional): Filter by module status
- `includeTestMode` (boolean, optional): Include sandbox modules
- `sortBy` (string, optional): Sort field (default: "relevance")
- `sortOrder` (string, optional): Sort direction
- `limit` (number, optional): Maximum results
- `offset` (number, optional): Pagination offset
- `includeMetrics` (boolean, optional): Include usage metrics (default: true)
- `includeCompatibility` (boolean, optional): Include compatibility scores
- `minCompliance` (number, optional): Minimum compliance score (0-5)
- `maxAge` (number, optional): Maximum age in days

**Response:**
```typescript
{
  type: string;
  modules: RegisteredModule[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
  searchMetadata: {
    type: string;
    filters: Record<string, any>;
    enhancedFilters: {
      minCompliance?: number;
      maxAge?: number;
      includeMetrics: boolean;
      includeCompatibility: boolean;
    };
  };
}
```

**Example Request:**
```bash
curl "https://api.example.com/api/modules/by-type/payment?status=PRODUCTION_READY&includeCompatibility=true&minCompliance=3"
```

### Get Modules for Identity

Find modules compatible with a specific identity type.

**Endpoint:** `GET /api/modules/for-identity/{identityType}`

**Authentication:** Optional

**Path Parameters:**
- `identityType` (string): Identity type (`ROOT`, `DAO`, `ENTERPRISE`, `INDIVIDUAL`)

**Query Parameters:**
- `includeTestMode` (boolean, optional): Include sandbox modules
- `status` (string, optional): Filter by module status
- `integration` (string, optional): Filter by required integration
- `hasCompliance` (boolean, optional): Filter modules with compliance
- `includeCompatibilityScore` (boolean, optional): Calculate compatibility scores
- `includeDependencyInfo` (boolean, optional): Include dependency information
- `includeSecurityInfo` (boolean, optional): Include security analysis
- `limit` (number, optional): Maximum results
- `offset` (number, optional): Pagination offset
- `sortBy` (string, optional): Sort field (supports "compatibility")
- `sortOrder` (string, optional): Sort direction

**Response:**
```typescript
{
  identityType: string;
  modules: (RegisteredModule & {
    compatibilityScore?: {
      overall: number;
      details: {
        identitySupport: number;
        compliance: number;
        security: number;
        performance: number;
        maintenance: number;
      };
      breakdown: Record<string, { score: number; weight: number }>;
    };
    dependencyInfo?: {
      hasDependencies: boolean;
      count: number;
      dependencies: Array<{
        moduleId: string;
        name: string;
        version: string;
        status: string;
        available: boolean;
      }>;
      allAvailable: boolean;
    };
    securityInfo?: {
      auditStatus: 'passed' | 'not_audited';
      privacyEnforced: boolean;
      kycSupport: boolean;
      gdprCompliant: boolean;
      securityScore: number;
      securityLevel: 'high' | 'medium' | 'low';
    };
  })[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
  searchMetadata: {
    identityType: string;
    enhancedFeatures: {
      includeCompatibilityScore: boolean;
      includeDependencyInfo: boolean;
      includeSecurityInfo: boolean;
    };
  };
}
```

**Example Request:**
```bash
curl "https://api.example.com/api/modules/for-identity/DAO?includeCompatibilityScore=true&includeDependencyInfo=true&sortBy=compatibility"
```

### Get Module Dependencies

Retrieve dependency information for a module.

**Endpoint:** `GET /api/modules/{moduleId}/dependencies`

**Authentication:** Optional

**Path Parameters:**
- `moduleId` (string): The module identifier

**Query Parameters:**
- `includeTransitive` (boolean, optional): Include transitive dependencies (default: true)
- `checkCompatibility` (boolean, optional): Check version compatibility (default: true)
- `includeVersionAnalysis` (boolean, optional): Include version analysis (default: true)
- `includeSecurityAnalysis` (boolean, optional): Include security analysis (default: false)
- `maxDepth` (number, optional): Maximum dependency depth (default: 10)

**Response:**
```typescript
{
  moduleId: string;
  dependencies: string[];
  dependencyTree: Record<string, any>;
  compatibilityAnalysis?: {
    compatible: boolean;
    conflicts: DependencyConflict[];
    circularDependencies: string[];
  };
  versionAnalysis?: {
    issues: VersionMismatch[];
    recommendations: string[];
  };
  securityAnalysis?: {
    issues: SecurityIssue[];
    riskLevel: 'low' | 'medium' | 'high';
  };
  analysis: {
    totalDependencies: number;
    directDependencies: number;
    transitiveDependencies: number;
    maxDepth: number;
    hasCircularDependencies: boolean;
    compatibilityIssues: DependencyConflict[];
    versionIssues: VersionMismatch[];
    securityIssues: SecurityIssue[];
  };
  cached: boolean;
  resolveTime: number;
}
```

**Example Request:**
```bash
curl "https://api.example.com/api/modules/qwallet-core/dependencies?includeSecurityAnalysis=true&maxDepth=5"
```

## Advanced Search Features

### Fuzzy Search

The search API supports fuzzy matching for module names and descriptions:

```bash
# Find modules with names similar to "qwalet" (typo)
curl "https://api.example.com/api/modules/search?q=qwalet&fuzzy=true"
```

### Wildcard Search

Use wildcards in search queries:

```bash
# Find all modules starting with "qwallet-"
curl "https://api.example.com/api/modules/search?name=qwallet-*"

# Find modules ending with "-core"
curl "https://api.example.com/api/modules/search?name=*-core"
```

### Boolean Search

Combine search terms with boolean operators:

```bash
# Find modules with "payment" AND "crypto"
curl "https://api.example.com/api/modules/search?q=payment+AND+crypto"

# Find modules with "wallet" OR "payment"
curl "https://api.example.com/api/modules/search?q=wallet+OR+payment"

# Find modules with "defi" but NOT "experimental"
curl "https://api.example.com/api/modules/search?q=defi+NOT+experimental"
```

### Range Queries

Search within version ranges or date ranges:

```bash
# Find modules with versions between 1.0.0 and 2.0.0
curl "https://api.example.com/api/modules/search?minVersion=1.0.0&maxVersion=2.0.0"

# Find modules registered in the last 30 days
curl "https://api.example.com/api/modules/search?registeredAfter=2024-01-01T00:00:00Z"
```

## Caching and Performance

### Cache Headers

Discovery API responses include cache headers:

- `Cache-Control`: Caching directives
- `ETag`: Entity tag for cache validation
- `Last-Modified`: Last modification timestamp
- `X-Cache-Status`: Cache hit/miss status

### Cache Control

Control caching behavior with query parameters:

```bash
# Force fresh data (bypass cache)
curl "https://api.example.com/api/modules?cache=false"

# Set custom cache TTL
curl "https://api.example.com/api/modules?cacheTTL=300"
```

### Performance Optimization

The API includes several performance optimizations:

1. **Result Caching**: Search results are cached for 5 minutes
2. **Metadata Caching**: Module metadata is cached for 15 minutes
3. **Dependency Caching**: Dependency trees are cached for 10 minutes
4. **Lazy Loading**: Large fields loaded on demand
5. **Pagination**: Efficient pagination with cursor-based navigation

## Rate Limiting

Discovery endpoints have generous rate limits:

- **List/Search**: 100 requests per minute per IP
- **Get Details**: 200 requests per minute per IP
- **Dependencies**: 50 requests per minute per IP

Authenticated requests have higher limits:
- **List/Search**: 500 requests per minute per identity
- **Get Details**: 1000 requests per minute per identity
- **Dependencies**: 200 requests per minute per identity

## Error Handling

### Common Error Responses

```typescript
// Module not found
{
  "success": false,
  "error": "Module not found",
  "code": "MODULE_NOT_FOUND",
  "moduleId": "non-existent-module"
}

// Invalid search parameters
{
  "success": false,
  "error": "Invalid search parameters",
  "code": "INVALID_PARAMETERS",
  "details": {
    "invalidFields": ["sortBy"],
    "validValues": ["name", "version", "registeredAt", "queryCount"]
  }
}

// Rate limit exceeded
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { ModuleDiscoveryService } from '@qwallet/module-registry';

const discovery = new ModuleDiscoveryService();

// Search for payment modules
const paymentModules = await discovery.searchModules({
  q: 'payment',
  status: 'PRODUCTION_READY',
  identityType: 'DAO',
  limit: 10
});

// Get modules for specific identity
const daoModules = await discovery.getModulesForIdentity('DAO', {
  includeCompatibilityScore: true,
  sortBy: 'compatibility'
});

// Get module details with dependencies
const moduleDetails = await discovery.getModule('qwallet-core', {
  includeDependencies: true,
  includeCompatibility: true
});
```

### React Hook

```typescript
import { useModuleDiscovery } from '@qwallet/hooks';

function ModuleSearch() {
  const {
    searchModules,
    modules,
    loading,
    error,
    hasMore,
    loadMore
  } = useModuleDiscovery();

  const handleSearch = async (query: string) => {
    await searchModules({
      q: query,
      status: 'PRODUCTION_READY',
      limit: 20
    });
  };

  return (
    <div>
      <input 
        type="text" 
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search modules..."
      />
      
      {loading && <div>Searching...</div>}
      {error && <div>Error: {error}</div>}
      
      <div>
        {modules.map(module => (
          <div key={module.moduleId}>
            <h3>{module.metadata.module}</h3>
            <p>{module.metadata.description}</p>
          </div>
        ))}
      </div>
      
      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

### CLI Examples

```bash
# Search for modules
qwallet-module-cli search --query "payment" --status PRODUCTION_READY

# List modules by type
qwallet-module-cli list --type wallet --include-metrics

# Get module details
qwallet-module-cli get qwallet-core --include-dependencies --include-history

# Find compatible modules for identity
qwallet-module-cli compatible --identity DAO --include-scores
```

---

*For more advanced usage patterns and examples, see the [Examples](./examples/) section.*