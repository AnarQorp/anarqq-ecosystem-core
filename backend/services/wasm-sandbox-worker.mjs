/**
 * WASM Sandbox Worker
 * Isolated worker thread for executing WASM code with security monitoring
 */

import { parentPort, workerData } from 'worker_threads';
import { performance } from 'perf_hooks';

class WASMSandboxWorker {
  constructor(data) {
    this.executionId = data.executionId;
    this.wasmCode = data.wasmCode;
    this.sandbox = data.sandbox;
    this.options = data.options;
    this.securityViolations = [];
    this.memoryUsed = 0;
    this.startTime = performance.now();
  }

  async execute() {
    try {
      // Monitor memory usage
      const initialMemory = process.memoryUsage();

      // Create restricted execution context
      const context = this.createRestrictedContext();

      // Execute the code with monitoring
      const result = await this.executeWithMonitoring(context);

      // Calculate memory usage
      const finalMemory = process.memoryUsage();
      this.memoryUsed = finalMemory.heapUsed - initialMemory.heapUsed;

      return {
        success: true,
        output: result,
        memoryUsed: this.memoryUsed,
        executionTime: performance.now() - this.startTime,
        securityViolations: this.securityViolations
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        memoryUsed: this.memoryUsed,
        executionTime: performance.now() - this.startTime,
        securityViolations: this.securityViolations
      };
    }
  }

  createRestrictedContext() {
    const context = {
      // Safe globals
      console: this.createRestrictedConsole(),
      Math: Math,
      Date: Date,
      JSON: JSON,
      
      // Restricted or blocked globals
      require: this.createRestrictedRequire(),
      process: this.createRestrictedProcess(),
      global: undefined,
      globalThis: undefined,
      
      // Custom APIs
      memory: this.createMemoryAPI(),
      compute: this.createComputeAPI()
    };

    return context;
  }

  createRestrictedConsole() {
    return {
      log: (...args) => {
        // Log to parent but don't expose system information
        const sanitizedArgs = args.map(arg => 
          typeof arg === 'object' ? '[Object]' : String(arg)
        );
        console.log(`[WASM:${this.executionId}]`, ...sanitizedArgs);
      },
      error: (...args) => {
        const sanitizedArgs = args.map(arg => 
          typeof arg === 'object' ? '[Object]' : String(arg)
        );
        console.error(`[WASM:${this.executionId}]`, ...sanitizedArgs);
      },
      warn: (...args) => {
        const sanitizedArgs = args.map(arg => 
          typeof arg === 'object' ? '[Object]' : String(arg)
        );
        console.warn(`[WASM:${this.executionId}]`, ...sanitizedArgs);
      }
    };
  }

  createRestrictedRequire() {
    return (moduleName) => {
      // Check if module access is allowed
      if (!this.sandbox.capabilities.has('filesystem') && this.isFilesystemModule(moduleName)) {
        this.recordSecurityViolation('filesystem_access_denied', `Attempted to require filesystem module: ${moduleName}`);
        throw new Error(`Capability not granted: filesystem access required for module '${moduleName}'`);
      }

      if (!this.sandbox.capabilities.has('network') && this.isNetworkModule(moduleName)) {
        this.recordSecurityViolation('network_access_denied', `Attempted to require network module: ${moduleName}`);
        throw new Error(`Capability not granted: network access required for module '${moduleName}'`);
      }

      if (!this.sandbox.capabilities.has('process') && this.isProcessModule(moduleName)) {
        this.recordSecurityViolation('process_access_denied', `Attempted to require process module: ${moduleName}`);
        throw new Error(`Capability not granted: process access required for module '${moduleName}'`);
      }

      // Allow safe modules
      const safeModules = {
        'crypto': this.createRestrictedCrypto(),
        'util': this.createRestrictedUtil()
      };

      if (safeModules[moduleName]) {
        return safeModules[moduleName];
      }

      throw new Error(`Module '${moduleName}' is not available in sandbox`);
    };
  }

  createRestrictedProcess() {
    return {
      // Only expose safe process information
      version: process.version,
      versions: { node: process.versions.node },
      
      // Block dangerous methods
      exit: () => {
        this.recordSecurityViolation('process_exit_denied', 'Attempted to call process.exit()');
        throw new Error('Capability not granted: process.exit() is not allowed');
      },
      
      kill: () => {
        this.recordSecurityViolation('process_kill_denied', 'Attempted to call process.kill()');
        throw new Error('Capability not granted: process.kill() is not allowed');
      }
    };
  }

  createMemoryAPI() {
    return {
      allocate: (size) => {
        if (size > this.sandbox.memoryLimit / 10) { // Max 10% of limit per allocation
          this.recordSecurityViolation('memory_allocation_exceeded', `Attempted to allocate ${size} bytes`);
          throw new Error('Memory allocation exceeds sandbox limit');
        }
        return new ArrayBuffer(size);
      },
      
      usage: () => {
        const usage = process.memoryUsage();
        return {
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          limit: this.sandbox.memoryLimit
        };
      }
    };
  }

  createComputeAPI() {
    return {
      hash: (data) => {
        // Safe cryptographic operations
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(data).digest('hex');
      },
      
      random: () => {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
      }
    };
  }

  createRestrictedCrypto() {
    const crypto = require('crypto');
    
    return {
      // Allow safe crypto operations
      createHash: crypto.createHash.bind(crypto),
      randomBytes: crypto.randomBytes.bind(crypto),
      
      // Block potentially dangerous operations
      createCipher: () => {
        throw new Error('Cipher operations not allowed in sandbox');
      },
      
      createDecipher: () => {
        throw new Error('Decipher operations not allowed in sandbox');
      }
    };
  }

  createRestrictedUtil() {
    const util = require('util');
    
    return {
      // Allow safe util operations
      format: util.format.bind(util),
      inspect: (obj) => util.inspect(obj, { depth: 2, maxArrayLength: 10 }),
      
      // Block potentially dangerous operations
      promisify: () => {
        throw new Error('util.promisify not allowed in sandbox');
      }
    };
  }

  async executeWithMonitoring(context) {
    // Create execution function with restricted context
    const executionFunction = new Function(
      'context',
      `
        const { ${Object.keys(context).join(', ')} } = context;
        
        // Execute the WASM code
        try {
          ${this.wasmCode}
        } catch (error) {
          throw new Error('Execution error: ' + error.message);
        }
      `
    );

    // Set up monitoring
    const memoryMonitor = setInterval(() => {
      const usage = process.memoryUsage();
      if (usage.heapUsed > this.sandbox.memoryLimit) {
        clearInterval(memoryMonitor);
        this.recordSecurityViolation('memory_limit_exceeded', `Memory usage ${usage.heapUsed} exceeded limit ${this.sandbox.memoryLimit}`);
        throw new Error('Memory limit exceeded');
      }
    }, 100); // Check every 100ms

    try {
      // Execute with timeout
      const result = await Promise.race([
        Promise.resolve(executionFunction(context)),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Execution timeout')), this.sandbox.timeLimit)
        )
      ]);

      clearInterval(memoryMonitor);
      return result;

    } catch (error) {
      clearInterval(memoryMonitor);
      throw error;
    }
  }

  isFilesystemModule(moduleName) {
    const filesystemModules = ['fs', 'path', 'os', 'stream'];
    return filesystemModules.includes(moduleName) || moduleName.startsWith('fs/');
  }

  isNetworkModule(moduleName) {
    const networkModules = ['http', 'https', 'net', 'dgram', 'dns', 'tls', 'url'];
    return networkModules.includes(moduleName);
  }

  isProcessModule(moduleName) {
    const processModules = ['child_process', 'cluster', 'worker_threads'];
    return processModules.includes(moduleName);
  }

  recordSecurityViolation(type, details) {
    const violation = {
      type,
      details,
      timestamp: new Date().toISOString(),
      executionId: this.executionId
    };
    
    this.securityViolations.push(violation);
    console.warn(`[WASMSandboxWorker] Security violation: ${type} - ${details}`);
  }
}

// Worker execution
if (parentPort && workerData) {
  const worker = new WASMSandboxWorker(workerData);
  
  worker.execute()
    .then(result => {
      parentPort.postMessage(result);
    })
    .catch(error => {
      parentPort.postMessage({
        success: false,
        error: error.message
      });
    });
}