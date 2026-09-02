// Vercel Serverless Function — NestJS adapter
// Backend TypeScript kaynaklarının derlenmis ciktisini kullanir.
// Build komutu oncelikle apps/backend/dist/main.js'yi uretir.
'use strict';

let cachedHandler = null;

async function getHandler() {
  if (!cachedHandler) {
    // apps/backend/dist/main.js — nest build ile uretilir
    const { createApp } = require('../apps/backend/dist/main');
    const app = await createApp();
    await app.init();
    cachedHandler = app.getHttpAdapter().getInstance();
  }
  return cachedHandler;
}

module.exports = async function handler(req, res) {
  const expressApp = await getHandler();
  return expressApp(req, res, () => {});
};
