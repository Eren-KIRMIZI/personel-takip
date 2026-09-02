import 'reflect-metadata';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { RequestHandler } from 'express';
import { createApp } from '../src/main';

// Vercel için ince serverless adapter. Standart Nest bootstrap'u ayrı
// (src/main.ts), iş mantığı platform bağımsız kalır.
let cachedHandler: RequestHandler;

async function getHandler(): Promise<RequestHandler> {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    cachedHandler = app.getHttpAdapter().getInstance();
  }
  return cachedHandler;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await getHandler();
  return expressApp(req as unknown as Parameters<RequestHandler>[0], res as never);
}