# Guía de Despliegue en Producción

Este documento proporciona instrucciones detalladas para desplegar AnarQ Nexus Core en un entorno de producción utilizando PM2 para la gestión de procesos y Nginx como servidor web inverso.

## Requisitos del Servidor

- **Sistema Operativo**: Ubuntu 20.04 LTS o superior (recomendado)
- **Node.js**: Versión 18.x o superior
- **npm**: Versión 9.x o superior
- **PM2**: Para la gestión de procesos de Node.js
- **Nginx**: Como servidor web inverso
- **Certificado SSL**: Recomendado para producción (puede usar Let's Encrypt)

## 1. Configuración Inicial del Servidor

### Actualizar el sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar Node.js y npm
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Instalar PM2 globalmente
```bash
sudo npm install -g pm2
```

### Instalar Nginx
```bash
sudo apt install nginx -y
```

## 2. Configuración de la Aplicación

### Clonar el repositorio
```bash
cd /var/www
sudo git clone https://github.com/tu-usuario/anar-q-nexus-core.git
sudo chown -R $USER:$USER /var/www/anar-q-nexus-core
cd anar-q-nexus-core
```

### Instalar dependencias
```bash
npm install
```

### Configurar variables de entorno
```bash
cp .env.example .env.production
nano .env.production
```

Asegúrate de configurar correctamente todas las variables necesarias, incluyendo:
- `VITE_API_URL`: URL de tu API de producción
- `VITE_ENVIRONMENT`: Configurado como 'production'
- Variables de conexión a la base de datos
- Claves API y secretos

## 3. Construir la Aplicación

### Construir para producción
```bash
npm run build
```

Esto generará los archivos estáticos en el directorio `dist/`.

## 4. Configurar PM2

### Iniciar la aplicación con PM2
```bash
pm2 start ecosystem.config.js --env production
```

### Configurar el inicio automático
```bash
pm2 startup
pm2 save
```

## 5. Configurar Nginx

### Crear archivo de configuración
```bash
sudo nano /etc/nginx/sites-available/anarq-nexus
```

### Configuración de ejemplo para Nginx
```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    
    # Redirigir HTTP a HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # Configuración SSL
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    
    # Configuración de seguridad SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    
    # Configuración de caché SSL
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Configuración de la aplicación
    root /var/www/anar-q-nexus-core/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Configuración para la API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Configuración de seguridad adicional
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### Habilitar el sitio y probar la configuración
```bash
sudo ln -s /etc/nginx/sites-available/anarq-nexus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 6. Configurar Certificado SSL (Opcional pero recomendado)

### Instalar Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Obtener certificado SSL
```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### Renovar certificado automáticamente
```bash
sudo certbot renew --dry-run
```

## 7. Monitoreo y Mantenimiento

### Monitorear la aplicación con PM2
```bash
pm2 monit
```

### Ver logs de la aplicación
```bash
pm2 logs
```

### Actualizar la aplicación
```bash
cd /var/www/anar-q-nexus-core
git pull
npm install
npm run build
pm2 restart all
```

## Solución de Problemas Comunes

### Verificar estado de PM2
```bash
pm2 status
```

### Ver logs de Nginx
```bash
sudo tail -f /var/log/nginx/error.log
```

### Verificar puertos en uso
```bash
sudo netstat -tuln | grep LISTEN
```

## Seguridad Adicional

1. Configurar un firewall (UFW)
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow OpenSSH
   sudo ufw enable
   ```

2. Mantener el sistema actualizado
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. Configurar copias de seguridad regulares

Para más información, consulta la documentación oficial de [PM2](https://pm2.keymetrics.io/) y [Nginx](https://nginx.org/en/docs/).
