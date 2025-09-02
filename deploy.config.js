
/**
 * Configuración de despliegue para AnarQ Nexus
 * Maneja diferentes entornos y optimizaciones
 */

const deployConfig = {
  // Configuración de producción
  production: {
    apiUrl: 'https://anarq.coyotedron.com/api',
    environment: 'production',
    optimization: {
      minify: true,
      sourcemap: false,
      chunks: true
    },
    network: {
      rpc: 'https://polygon-rpc.com',
      chainId: 137,
      explorer: 'https://polygonscan.com/tx/'
    }
  },
  
  // Configuración de desarrollo
  development: {
    apiUrl: 'http://localhost:3000/api',
    environment: 'development',
    optimization: {
      minify: false,
      sourcemap: true,
      chunks: false
    },
    network: {
      rpc: 'https://api.testnet.minepi.com',
      chainId: 12345,
      explorer: 'https://explorer.testnet.minepi.com/tx/'
    }
  },

  // Configuración de testnet
  testnet: {
    apiUrl: 'https://anarq.coyotedron.com/api',
    environment: 'testnet',
    optimization: {
      minify: true,
      sourcemap: false,
      chunks: true
    },
    network: {
      rpc: 'https://api.testnet.minepi.com',
      chainId: 12345,
      explorer: 'https://explorer.testnet.minepi.com/tx/'
    }
  }
};

module.exports = deployConfig;
