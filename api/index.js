// Vercel Serverless Function — NestJS adapter
// reflect-metadata mutlaka ilk satirda olmali (NestJS decorator zorunlulugu)
require('reflect-metadata');

const path = require('path');

let cachedHandler = null;

async function getHandler() {
  if (!cachedHandler) {
    // __dirname kullanarak mutlak yol ile coz (relative path Vercel sandbox'inda calismaz)
    const mainPath = path.resolve(__dirname, '..', 'apps', 'backend', 'dist', 'main');
    const { createApp } = require(mainPath);
    const app = await createApp();
    await app.init();
    cachedHandler = app.getHttpAdapter().getInstance();
  }
  return cachedHandler;
}

module.exports = async function handler(req, res) {
  try {
    const expressApp = await getHandler();
    return expressApp(req, res, () => {});
  } catch (err) {
    console.error('[Serverless] Handler error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: String(err?.message ?? err) });
  }
};
