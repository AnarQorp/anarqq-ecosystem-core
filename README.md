# AnarQ Nexus Core

Plataforma descentralizada para la gestión de activos digitales y contratos inteligentes.

## Características Principales

- Interfaz de usuario moderna y receptiva
- Integración con billeteras cripto
- Gestión de tokens y activos digitales
- Soporte para múltiples redes blockchain
- Almacenamiento descentralizado con IPFS
- **Dashboard de DAO Mejorado** - Gestión completa de organizaciones autónomas descentralizadas
- **Análisis de Gobernanza** - Estadísticas y métricas de participación en propuestas
- **Integración de Billetera** - Visualización de tokens y NFTs específicos del DAO
- **Acciones Rápidas** - Transferencias de tokens, acuñación de NFTs y gestión de activos

## Requisitos Previos

- Node.js 18+ y npm 9+
- Git
- Navegador web moderno (Chrome, Firefox, Edge, Safari)

## Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/anar-q-nexus-core.git
   cd anar-q-nexus-core
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   # Editar el archivo .env según sea necesario
   ```

## Configuración

### Variables de Entorno

Crea un archivo `.env` basado en `.env.example` y configura las siguientes variables:

```env
# Configuración de entorno
VITE_API_URL=http://localhost:3000/api

# Configuración de red de prueba (Testnet)
VITE_PI_TESTNET_RPC=https://api.testnet.minepi.com
VITE_PI_TESTNET_CHAIN_ID=12345
VITE_PI_TESTNET_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_TESTNET_EXPLORER=https://explorer.testnet.minepi.com/tx/

# Configuración de red principal (Mainnet)
VITE_PRODUCTION_RPC=https://polygon-rpc.com
VITE_PRODUCTION_CONTRACT_ADDRESS=

# Configuración del entorno
VITE_ENVIRONMENT=testnet # o 'production' para mainnet
```

## Dashboard de DAO Mejorado

El sistema incluye un dashboard completo para la gestión de organizaciones autónomas descentralizadas (DAOs) con las siguientes características:

### Componentes Principales

#### TokenOverviewPanel
- Visualización completa de información de tokens del DAO
- Métricas de suministro total y circulante
- Indicadores de mecanismo de gobernanza
- Sistema de caché con actualización automática

#### DAOWalletOverview
- Resumen de billetera para miembros autenticados
- Balance de tokens de gobernanza del DAO
- Colección de NFTs específicos del DAO
- Cálculo de poder de voto en tiempo real

#### QuickActionsPanel
- Acciones rápidas basadas en roles de usuario
- Transferencia de tokens con formulario integrado
- Acuñación de NFTs para moderadores/administradores
- Galería de NFTs con vista modal

#### ProposalStatsSidebar
- Estadísticas históricas de gobernanza
- Análisis de participación y tendencias
- Propuestas más votadas con métricas detalladas
- Manejo inteligente de datos insuficientes

### Características Técnicas

- **Responsive Design**: Diseño móvil-primero con breakpoints optimizados
- **Accesibilidad**: Cumplimiento WCAG 2.1 con soporte para lectores de pantalla
- **Performance**: Memoización, lazy loading y optimizaciones de renderizado
- **Error Handling**: Manejo robusto de errores con degradación elegante
- **Real-time Updates**: Actualización automática de datos de billetera y DAO

### Integración

```tsx
import { 
  TokenOverviewPanel,
  DAOWalletOverview,
  QuickActionsPanel,
  ProposalStatsSidebar
} from './components/dao';

function EnhancedDAODashboard({ daoId }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <DAODashboard daoId={daoId} />
      </div>
      <div className="space-y-6">
        <TokenOverviewPanel daoId={daoId} />
        <DAOWalletOverview daoId={daoId} />
        <QuickActionsPanel {...props} />
        <ProposalStatsSidebar {...props} />
      </div>
    </div>
  );
}
```

Para más información, consulta la [Guía de Integración de DAO](src/components/dao/DAO-INTEGRATION-GUIDE.md).

## Desarrollo

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

Esto iniciará el servidor de desarrollo en [http://localhost:5173](http://localhost:5173)

## Construcción para Producción

Para crear una versión optimizada para producción:

```bash
npm run build
```

Los archivos de producción se generarán en el directorio `dist/`.

## Despliegue

### Requisitos del Servidor

- Node.js 18+
- npm 9+
- Servidor web (Nginx, Apache, etc.)

### Pasos de Despliegue

1. Clonar el repositorio en el servidor
2. Instalar dependencias: `npm install --production`
3. Construir la aplicación: `npm run build`
4. Configurar el servidor web para servir los archivos estáticos desde el directorio `dist/`

Para configuraciones avanzadas, consulta el archivo [DEPLOYMENT.md](DEPLOYMENT.md).

## Tecnologías Utilizadas

- **Frontend**:
  - React 18
  - TypeScript
  - Vite
  - Tailwind CSS
  - shadcn/ui
  - Radix UI Primitives
  - Web3.js

- **Blockchain**:
  - Ethereum / Polygon
  - Web3.js
  - IPFS

## Contribución

Las contribuciones son bienvenidas. Por favor, lee nuestras [pautas de contribución](CONTRIBUTING.md) antes de enviar un Pull Request.

## Licencia

Este proyecto está disponible bajo una licencia dual:

- **Código fuente**: Licencia MIT - Consulta el archivo [LICENSE](LICENSE) para más información
- **Documentación y contenido**: Licencia CC BY-NC-SA 4.0 - Consulta el archivo [LICENSE-CC-BY-NC-SA](LICENSE-CC-BY-NC-SA) para más información

La licencia MIT aplica al código fuente, mientras que la licencia Creative Commons BY-NC-SA 4.0 aplica a la documentación, contenido educativo y materiales relacionados.

## Soporte

Si tienes problemas o preguntas, por favor [abre un issue](https://github.com/tu-usuario/anar-q-nexus-core/issues).

## License

This project is available under dual licensing:

- **Source code**: MIT License - See [LICENSE](LICENSE) file for details
- **Documentation and content**: CC BY-NC-SA 4.0 License - See [LICENSE-CC-BY-NC-SA](LICENSE-CC-BY-NC-SA) file for details

The MIT license applies to the source code, while the Creative Commons BY-NC-SA 4.0 license applies to documentation, educational content, and related materials.
