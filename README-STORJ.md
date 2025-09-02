# Storj File Storage Integration for Qsocial

## 🚀 Resumen

Se ha implementado exitosamente el sistema de almacenamiento de archivos de Qsocial usando **Storj** con compatibilidad S3, incluyendo generación automática de **IPFS CID** y preparación para **Filecoin**.

## ✨ Características Implementadas

### 🗄️ Almacenamiento Storj
- **API S3-compatible** para subida y descarga de archivos
- **Almacenamiento distribuido** con alta disponibilidad
- **Encriptación server-side** (AES256)
- **URLs firmadas** para acceso temporal seguro
- **Gestión de metadatos** completa

### 🌐 Integración IPFS
- **Generación automática de CID** para cada archivo
- **Verificación de integridad** del contenido
- **Acceso descentralizado** a través de gateways IPFS
- **Preparación para pinning** en nodos IPFS

### 💎 Preparación Filecoin
- **CID compatible** con Filecoin
- **Metadatos de deal** preparados
- **Sistema de monitoreo** de estado
- **Base para deals automáticos**

## 📁 Archivos Creados

### Backend
- `backend/services/StorjStorageService.mjs` - Servicio principal de Storj
- `backend/routes/qsocial-files.mjs` - API endpoints para archivos
- `backend/tests/storj-storage.test.mjs` - Tests unitarios
- `backend/.env.example` - Variables de entorno

### Frontend
- `src/api/qsocial-files.ts` - Cliente API TypeScript
- `src/components/qsocial/FileUpload.tsx` - Componente React de subida

### Documentación y Ejemplos
- `docs/STORJ-INTEGRATION.md` - Documentación completa
- `examples/storj-file-upload-example.tsx` - Ejemplo de uso
- `scripts/setup-storj.sh` - Script de configuración
- `README-STORJ.md` - Este archivo

## 🛠️ Configuración Rápida

### 1. Ejecutar Script de Setup
```bash
./scripts/setup-storj.sh
```

### 2. Configurar Variables de Entorno
Edita `backend/.env`:
```bash
# Storj Configuration
STORJ_ACCESS_KEY_ID=tu_storj_access_key_id
STORJ_SECRET_ACCESS_KEY=tu_storj_secret_access_key
STORJ_ENDPOINT=https://gateway.storjshare.io
STORJ_BUCKET=qsocial-files
STORJ_REGION=us-east-1

# IPFS Configuration
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
```

### 3. Iniciar Servicios
```bash
# Terminal 1: IPFS daemon
ipfs daemon

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
npm run dev
```

## 📡 API Endpoints

### Subida de Archivos
```http
POST /api/qsocial/files/upload
POST /api/qsocial/files/upload-multiple
```

### Gestión de Archivos
```http
GET /api/qsocial/files/:fileId/download
GET /api/qsocial/files/:fileId/metadata
GET /api/qsocial/files/:fileId/ipfs
DELETE /api/qsocial/files/:fileId
```

### Utilidades
```http
POST /api/qsocial/files/:fileId/signed-url
GET /api/qsocial/files/my-files
GET /api/qsocial/files/health
```

## 🔧 Uso del Componente React

```tsx
import FileUpload from '../components/qsocial/FileUpload';

const MyComponent = () => {
  const handleUploadComplete = (files) => {
    console.log('Archivos subidos:', files);
    files.forEach(file => {
      console.log('IPFS CID:', file.ipfsCid);
      console.log('Storj URL:', file.storjUrl);
    });
  };

  return (
    <FileUpload
      onUploadComplete={handleUploadComplete}
      maxFiles={5}
      allowMultiple={true}
      showIPFSInfo={true}
    />
  );
};
```

## 🧪 Ejemplo de Uso Programático

```typescript
import { uploadFile, getFileIPFSInfo } from '../api/qsocial-files';

// Subir archivo
const file = document.querySelector('input[type="file"]').files[0];
const result = await uploadFile(file);

if (result.success) {
  console.log('Archivo subido:', result.file);
  console.log('IPFS CID:', result.file.ipfsCid);
  console.log('Filecoin CID:', result.file.filecoinCid);
  
  // Obtener información IPFS
  const ipfsInfo = await getFileIPFSInfo(result.file.fileId);
  console.log('Gateways IPFS:', ipfsInfo.ipfs.gatewayUrls);
}
```

## 🔍 Cómo Obtener CID IPFS

### Proceso Automático
1. **Subida a Storj**: El archivo se almacena en Storj usando S3 API
2. **Generación CID**: Se procesa el contenido con IPFS para generar CID
3. **Almacenamiento**: El CID se guarda en los metadatos del archivo
4. **Acceso**: El CID está disponible en la respuesta de subida

### Código de Generación CID
```javascript
// En StorjStorageService.mjs
async generateIPFSCid(fileBuffer) {
  const result = await this.ipfs.add(fileBuffer, {
    onlyHash: true,     // Solo generar CID, no almacenar
    cidVersion: 1,      // Usar CID v1
    hashAlg: 'sha2-256' // Algoritmo SHA2-256
  });
  
  return result.cid.toString();
}
```

### Acceso a Archivos via IPFS
```javascript
// URLs de gateway IPFS generadas automáticamente
const gatewayUrls = [
  `https://ipfs.io/ipfs/${cid}`,
  `https://gateway.pinata.cloud/ipfs/${cid}`,
  `https://cloudflare-ipfs.com/ipfs/${cid}`
];
```

## 🛡️ Seguridad y Validación

### Tipos de Archivo Permitidos
- **Imágenes**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, WebM
- **Audio**: MP3, WAV
- **Documentos**: PDF, TXT

### Límites de Seguridad
- **Tamaño máximo**: 50MB por archivo
- **Archivos simultáneos**: 5 archivos máximo
- **Rate limiting**: 20 uploads por 15 minutos
- **Autenticación**: JWT token requerido

## 📊 Monitoreo y Health Check

```bash
# Verificar estado del servicio
curl http://localhost:3001/api/qsocial/files/health

# Respuesta esperada
{
  "success": true,
  "health": {
    "storj": true,
    "ipfs": true,
    "bucket": true,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 🚀 Preparación para Filecoin

### Estado Actual
- **CID generado**: Compatible con Filecoin
- **Metadatos preparados**: Deal information ready
- **Status tracking**: Sistema de monitoreo implementado

### Próximos Pasos para Filecoin
1. **IPFS Pinning**: Anclar archivos en nodo IPFS
2. **Deal Creation**: Crear deals automáticos con miners
3. **Status Monitoring**: Monitorear estado de deals
4. **Cost Optimization**: Optimizar costos de almacenamiento

## 🧪 Testing

```bash
# Ejecutar tests
cd backend
npm test storj-storage.test.mjs

# Test de integración
npm run test:integration
```

## 📚 Documentación Adicional

- **Documentación completa**: `docs/STORJ-INTEGRATION.md`
- **Ejemplo interactivo**: `examples/storj-file-upload-example.tsx`
- **API Reference**: Ver endpoints en el código de rutas

## 🎯 Casos de Uso

### 1. Posts con Imágenes
```typescript
// Subir imagen para post
const imageFile = await uploadFile(selectedImage);
const post = {
  content: "Mi nuevo post",
  imageUrl: imageFile.storjUrl,
  ipfsCid: imageFile.ipfsCid
};
```

### 2. Archivos Compartidos
```typescript
// Generar enlace temporal
const signedUrl = await generateSignedUrl(fileId, 3600);
// Compartir enlace que expira en 1 hora
```

### 3. Verificación de Integridad
```typescript
// Usar IPFS CID para verificar integridad
const ipfsInfo = await getFileIPFSInfo(fileId);
// Acceder via múltiples gateways IPFS
```

## ✅ Estado de Implementación

- [x] **Servicio Storj S3**: Completamente implementado
- [x] **Generación IPFS CID**: Funcionando automáticamente
- [x] **API Endpoints**: Todos los endpoints implementados
- [x] **Componente React**: Drag & drop con preview
- [x] **Documentación**: Completa con ejemplos
- [x] **Tests**: Tests unitarios implementados
- [x] **Preparación Filecoin**: Base implementada
- [ ] **Deals Filecoin**: Pendiente para producción
- [ ] **CDN Integration**: Mejora futura

## 🤝 Contribución

Para contribuir al desarrollo:

1. **Fork** el repositorio
2. **Crea** una rama para tu feature
3. **Implementa** siguiendo los patrones existentes
4. **Añade tests** para nueva funcionalidad
5. **Documenta** los cambios
6. **Crea** pull request

---

**¡El sistema de almacenamiento Storj con IPFS CID está listo para usar!** 🎉

Para cualquier duda, consulta la documentación completa en `docs/STORJ-INTEGRATION.md` o revisa el ejemplo interactivo en `examples/storj-file-upload-example.tsx`.