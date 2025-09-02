// Cargar variables de entorno
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde el archivo .env en el directorio raíz
const envPath = path.resolve(process.cwd(), '.env');
const result = config({ path: envPath });

if (result.error) {
  console.error('❌ Error al cargar el archivo .env:', result.error);
  process.exit(1);
}

// Mostrar las variables de entorno cargadas
console.log('🔧 Variables de entorno cargadas:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '*** (configurado)' : '❌ NO CONFIGURADO');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);

// Verificar si JWT_SECRET está configurado
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET no está configurado en el archivo .env');
  process.exit(1);
}

console.log('✅ Configuración de entorno verificada correctamente');

// Iniciar un servidor Express simple
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();

// Configuración de CORS
const allowedOrigins = [
  'http://localhost:8080',    // Frontend development server
  'http://localhost:8081',    // Frontend alternative port
  'http://127.0.0.1:8080',    // Localhost with IP
  'http://127.0.0.1:8081'     // Localhost with IP alternative port
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      console.warn('CORS Blocked:', msg);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware para parsear JSON
app.use(express.json());

// Almacenamiento temporal de usuarios (solo para pruebas)
const users = new Map();

// Ruta de registro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { alias, email, password } = req.body;
    
    console.log('🔐 Intento de registro:', { alias, email });
    
    // Validación básica
    if (!alias || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Alias, email y contraseña son requeridos'
      });
    }
    
    // Verificar si el alias ya existe
    if (users.has(alias)) {
      return res.status(400).json({
        success: false,
        message: 'El alias ya está en uso'
      });
    }
    
    // En un entorno real, aquí se debería hashear la contraseña
    // const hashedPassword = await bcrypt.hash(password, 10);
    
    // Guardar el usuario (en memoria, solo para pruebas)
    users.set(alias, {
      alias,
      email,
      password, // En producción, guardar solo el hash
      createdAt: new Date().toISOString()
    });
    
    console.log('✅ Usuario registrado:', alias);
    
    // Generar token JWT
    const token = jwt.sign(
      { alias, email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      token,
      user: { alias, email }
    });
    
  } catch (error) {
    console.error('❌ Error en el registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor al procesar el registro'
    });
  }
});

// Ruta de inicio de sesión
app.post('/api/auth/login', async (req, res) => {
  try {
    const { alias, password } = req.body;
    
    console.log('🔐 Intento de inicio de sesión:', { alias });
    
    // Validación básica
    if (!alias || !password) {
      return res.status(400).json({
        success: false,
        message: 'Alias y contraseña son requeridos'
      });
    }
    
    // Buscar usuario
    const user = users.get(alias);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    
    // Verificar contraseña (en producción, usar bcrypt.compare)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { alias: user.alias, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('✅ Inicio de sesión exitoso:', alias);
    
    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        alias: user.alias,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('❌ Error en el inicio de sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor al procesar el inicio de sesión'
    });
  }
});

// Ruta de verificación de alias
app.get('/api/auth/check-alias/:alias', (req, res) => {
  const { alias } = req.params;
  
  // En un entorno real, verificar en la base de datos
  const exists = users.has(alias);
  
  res.json({
    available: !exists,
    message: exists ? 'El alias ya está en uso' : 'Alias disponible'
  });
});

// Ruta de estado del servidor (solo para pruebas)
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'El servidor está funcionando correctamente',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    users: Array.from(users.keys())
  });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend ejecutándose en http://localhost:${PORT}`);
  console.log(`🔗 URL del frontend: ${process.env.FRONTEND_URL || 'No configurada'}`);
  console.log(`🔗 Prueba la ruta: http://localhost:${PORT}/api/status`);
});
