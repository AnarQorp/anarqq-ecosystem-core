
# AnarQ&Q Backend

Backend para el ecosistema descentralizado AnarQ&Q, que proporciona APIs para sQuid, QMail, Qdrive y otros módulos.

## Características

- **Autenticación**: Registro y login de usuarios con JWT
- **sQuid**: Gestión de identidades descentralizadas
- **IPFS**: Integración con Storacha (Web3.Storage)
- **QMail**: Mensajería cifrada
- **Qdrive**: Almacenamiento descentralizado
- **Qerberos**: Control de acceso y auditoría

## Instalación

```bash
cd backend
npm install
```

## Configuración

Antes de iniciar, crea tu propio archivo `.env` copiando el contenido de
`.env.example` y ajustándolo a tu entorno.

1. Copia `.env.example` a `.env`
2. Configura las variables de entorno necesarias
3. Obtén credenciales de Web3.Storage para IPFS
4. `nodemon` se incluye como dependencia de desarrollo para recarga automática

### Actualizar variables de entorno en producción

Para asegurarte de que la configuración básica del backend está presente sin
sobrescribir otras variables ya definidas, puedes ejecutar el siguiente script
desde la carpeta `backend`:

```bash
touch .env
grep -q '^JWT_SECRET=' .env && \
  sed -i 's/^JWT_SECRET=.*/JWT_SECRET=claveUltraSeguraParaFirmar/' .env || \
  echo 'JWT_SECRET=claveUltraSeguraParaFirmar' >> .env
grep -q '^FRONTEND_URL=' .env && \
  sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://anarq.coyotedron.com|' .env || \
  echo 'FRONTEND_URL=https://anarq.coyotedron.com' >> .env
grep -q '^NODE_ENV=' .env && \
  sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env || \
  echo 'NODE_ENV=production' >> .env
```

Esto añadirá o actualizará `JWT_SECRET`, `FRONTEND_URL` y `NODE_ENV` sin borrar
el resto de configuraciones existentes.

## Ejecución

```bash
# Desarrollo (recarga automática con nodemon)
npm run dev

# Producción
npm start
```

## Estructura

```
backend/
├── routes/          # Rutas de la API
├── services/        # Servicios y lógica de negocio
├── middleware/      # Middleware de Express
├── server.mjs       # Servidor principal
└── package.json     # Dependencias
```

## APIs Disponibles

- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login de usuario
- `GET /api/squid/alias/:alias/availability` - Verificar alias
- `POST /api/ipfs/upload` - Subir archivo a IPFS
- `GET /api/ipfs/download/:cid` - Descargar archivo
- `POST /api/qmail/send` - Enviar mensaje
- `POST /api/qdrive/upload` - Subir a Qdrive

## Integración con Frontend

El frontend debe configurar la URL del backend en sus variables de entorno y usar las APIs proporcionadas para el registro, autenticación y operaciones IPFS.

## Depuración del API `/api/squid`

Si los endpoints de sQuid no responden, verifica lo siguiente en el servidor:

1. En `server.mjs` deben estar registradas las rutas de sQuid:

   ```js
   import squidRoutes from './routes/squid.mjs';
   app.use('/api/squid', squidRoutes);
   ```

2. Comprueba que `routes/squid.mjs` contenga rutas como:

   ```js
   router.get('/alias/:alias/availability', async (req, res) => {
     // lógica de disponibilidad
   });
   ```

   Y que el archivo exporte el router al final con `export default router;`.

3. Reinicia el backend para aplicar cualquier cambio:

   ```bash
   pm2 restart anarq-backend --update-env
   ```

4. Desde el servidor, prueba el endpoint directamente:

   ```bash
   curl http://localhost:3000/api/squid/alias/test/availability
   ```

5. Si persisten los errores, revisa los logs con `pm2 logs anarq-backend --lines 100` y asegúrate de que el proceso arranca sin fallas.

