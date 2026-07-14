#!/usr/bin/env bash
# Roda isso DENTRO do VPS, na pasta do projeto, a cada deploy novo.
set -e

echo "==> git pull"
git pull

echo "==> instalando dependências"
npm ci

echo "==> build (standalone)"
npm run build

echo "==> copiando assets estáticos pro standalone"
cp -r public .next/standalone/public
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static

echo "==> reiniciando com PM2"
pm2 restart revelo || pm2 start .next/standalone/server.js --name revelo

echo "==> pronto"
pm2 save
