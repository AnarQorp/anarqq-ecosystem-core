#!/bin/bash
cd "$(dirname "$0")"

# Esperar a que el puerto 3001 esté disponible
while netstat -tuln | grep -q ':3001 '; do
    echo "El puerto 3001 está en uso. Esperando 5 segundos..."
    sleep 5
done

echo "Iniciando el servidor backend en el puerto 3001..."
while true; do
    node server.mjs
    echo "El servidor se ha cerrado. Reiniciando en 2 segundos..."
    sleep 2
done
