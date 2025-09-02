/**
 * QNET Type Definitions
 * 
 * TypeScript-style type definitions for QNET data structures
 */

/**
 * @typedef {Object} NetworkNode
 * @property {string} id - Unique node identifier
 * @property {string} name - Human-readable node name
 * @property {string} endpoint - Node endpoint URL
 * @property {string} region - Geographic region
 * @property {'primary'|'secondary'|'mesh'|'edge'} type - Node type
 * @property {'standard'|'premium'} tier - Service tier
 * @property {'active'|'inactive'|'degraded'|'maintenance'} status - Current status
 * @property {string[]} capabilities - Node capabilities
 * @property {NodeMetrics} metrics - Performance metrics
 * @property {string} lastSeen - Last seen timestamp
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} NodeMetrics
 * @property {number} latency - Average latency in milliseconds
 * @property {number} uptime - Uptime percentage (0-1)
 * @property {number} requestCount - Total request count
 * @property {number} errorCount - Total error count
 * @property {number} reputation - Node reputation score (0-1)
 * @property {string} [bandwidth] - Available bandwidth
 */

/**
 * @typedef {Object} PingRequest
 * @property {string} [nodeId] - Target node identifier
 * @property {number} [timeout] - Ping timeout in milliseconds
 * @property {number} [count] - Number of ping attempts
 * @property {string} [payload] - Optional ping payload
 */

/**
 * @typedef {Object} PingResult
 * @property {string} nodeId - Target node identifier
 * @property {number} latency - Round-trip latency in milliseconds
 * @property {boolean} success - Whether ping was successful
 * @property {string} [error] - Error message if ping failed
 * @property {string} timestamp - Ping timestamp
 * @property {number} sequence - Ping sequence number
 */

/**
 * @typedef {Object} PingResponse
 * @property {PingResult[]} results - Individual ping results
 * @property {PingSummary} summary - Ping summary statistics
 */

/**
 * @typedef {Object} PingSummary
 * @property {number} totalNodes - Total number of nodes pinged
 * @property {number} successfulPings - Number of successful pings
 * @property {number} averageLatency - Average latency across successful pings
 * @property {number} minLatency - Minimum latency observed
 * @property {number} maxLatency - Maximum latency observed
 * @property {number} packetLoss - Packet loss percentage (0-1)
 */

/**
 * @typedef {Object} NetworkCapabilities
 * @property {string[]} services - Available network services
 * @property {string[]} protocols - Supported network protocols
 * @property {string[]} regions - Available geographic regions
 * @property {Object} features - Feature flags and capabilities
 * @property {Object.<string, string[]>} nodeCapabilities - Per-node capabilities
 * @property {CapabilityLimits} [limits] - Network limits and constraints
 */

/**
 * @typedef {Object} CapabilityLimits
 * @property {number} maxConnections - Maximum concurrent connections
 * @property {string} maxBandwidth - Maximum bandwidth
 * @property {number} maxRequestSize - Maximum request size in bytes
 * @property {RateLimit} rateLimit - Rate limiting configuration
 */

/**
 * @typedef {Object} RateLimit
 * @property {number} requests - Requests per window
 * @property {number} window - Time window in seconds
 */

/**
 * @typedef {Object} NetworkTopology
 * @property {TopologyNode[]} nodes - Network nodes
 * @property {TopologyConnection[]} connections - Node connections
 * @property {TopologyCluster[]} clusters - Network clusters
 * @property {TopologyStatistics} statistics - Topology statistics
 * @property {string} timestamp - Topology snapshot timestamp
 */

/**
 * @typedef {Object} TopologyNode
 * @property {string} id - Node identifier
 * @property {string} region - Node region
 * @property {'primary'|'secondary'|'mesh'|'edge'} type - Node type
 * @property {'active'|'inactive'|'degraded'} status - Node status
 * @property {Set<string>} connections - Connected node IDs
 */

/**
 * @typedef {Object} TopologyConnection
 * @property {string} id - Connection identifier
 * @property {string} from - Source node ID
 * @property {string} to - Target node ID
 * @property {number} latency - Connection latency
 * @property {string} bandwidth - Connection bandwidth
 * @property {'active'|'inactive'|'degraded'} status - Connection status
 * @property {string} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} TopologyCluster
 * @property {string} id - Cluster identifier
 * @property {string} region - Cluster region
 * @property {string[]} nodes - Node IDs in cluster
 * @property {'healthy'|'degraded'|'critical'} status - Cluster status
 * @property {string} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} TopologyStatistics
 * @property {number} nodeCount - Total number of nodes
 * @property {number} connectionCount - Total number of connections
 * @property {number} clusterCount - Total number of clusters
 * @property {number} averageConnections - Average connections per node
 */

/**
 * @typedef {Object} NetworkStatus
 * @property {NetworkSummary} network - Network-wide summary
 * @property {Object.<string, RegionStatus>} regions - Per-region status
 * @property {Object.<string, ServiceStatus>} services - Per-service status
 * @property {Object} [metrics] - Detailed metrics (if requested)
 * @property {NetworkTopology} [topology] - Network topology (if requested)
 */

/**
 * @typedef {Object} NetworkSummary
 * @property {number} totalNodes - Total number of nodes
 * @property {number} activeNodes - Number of active nodes
 * @property {number} degradedNodes - Number of degraded nodes
 * @property {number} inactiveNodes - Number of inactive nodes
 * @property {number} averageLatency - Average network latency
 * @property {number} averageUptime - Average network uptime
 */

/**
 * @typedef {Object} RegionStatus
 * @property {number} nodes - Number of nodes in region
 * @property {'healthy'|'degraded'|'unhealthy'} status - Region status
 * @property {number} latency - Average region latency
 */

/**
 * @typedef {Object} ServiceStatus
 * @property {boolean} available - Whether service is available
 * @property {number} nodes - Number of nodes providing service
 * @property {number} latency - Average service latency
 */

/**
 * @typedef {Object} HealthStatus
 * @property {'healthy'|'degraded'|'critical'} status - Overall health status
 * @property {string} service - Service name
 * @property {string} version - Service version
 * @property {number} uptime - Service uptime in seconds
 * @property {string} nodeId - Node identifier
 * @property {string} region - Node region
 * @property {Object.<string, string>} dependencies - Dependency status
 * @property {NetworkSummary} network - Network health summary
 */

/**
 * @typedef {Object} LoadBalancingCriteria
 * @property {'round_robin'|'weighted_round_robin'|'least_connections'|'health_based'|'latency_based'|'reputation_based'} [algorithm] - Load balancing algorithm
 * @property {string} [region] - Preferred region
 * @property {string|string[]} [capabilities] - Required capabilities
 * @property {string[]} [excludeNodes] - Nodes to exclude
 * @property {number} [minReputation] - Minimum reputation score
 * @property {number} [maxLatency] - Maximum acceptable latency
 */

/**
 * @typedef {Object} TrafficDistribution
 * @property {number} totalRequests - Total number of requests
 * @property {number} nodeCount - Number of nodes in distribution
 * @property {Object.<string, NodeDistribution>} distribution - Per-node distribution
 */

/**
 * @typedef {Object} NodeDistribution
 * @property {NetworkNode} node - Node information
 * @property {number} requests - Number of requests assigned
 * @property {number} percentage - Percentage of total requests
 * @property {number} weight - Load balancing weight
 */

/**
 * @typedef {Object} ApiResponse
 * @property {'ok'|'error'} status - Response status
 * @property {string} code - Response code
 * @property {string} message - Response message
 * @property {*} [data] - Response data
 * @property {Object} [details] - Error details
 * @property {string} timestamp - Response timestamp
 */

// Export types for use in other modules
export const QNetTypes = {
  // Node types
  NetworkNode: 'NetworkNode',
  NodeMetrics: 'NodeMetrics',
  
  // Ping types
  PingRequest: 'PingRequest',
  PingResult: 'PingResult',
  PingResponse: 'PingResponse',
  PingSummary: 'PingSummary',
  
  // Capability types
  NetworkCapabilities: 'NetworkCapabilities',
  CapabilityLimits: 'CapabilityLimits',
  RateLimit: 'RateLimit',
  
  // Topology types
  NetworkTopology: 'NetworkTopology',
  TopologyNode: 'TopologyNode',
  TopologyConnection: 'TopologyConnection',
  TopologyCluster: 'TopologyCluster',
  TopologyStatistics: 'TopologyStatistics',
  
  // Status types
  NetworkStatus: 'NetworkStatus',
  NetworkSummary: 'NetworkSummary',
  RegionStatus: 'RegionStatus',
  ServiceStatus: 'ServiceStatus',
  HealthStatus: 'HealthStatus',
  
  // Load balancing types
  LoadBalancingCriteria: 'LoadBalancingCriteria',
  TrafficDistribution: 'TrafficDistribution',
  NodeDistribution: 'NodeDistribution',
  
  // API types
  ApiResponse: 'ApiResponse'
};

export default QNetTypes;