import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';
import { createApiRoutes } from '@/routes/index.js'
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware.js';
import type { Deps } from '@/deps.js'

// 部品を受け取って組み立てるだけにし、サーバーを立てる(listen)のはserver.tsに任せる。テストは偽の部品で組み立てる
export const createApp = (deps: Deps) => {
  const app = express()

  // CORS設定
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4545',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }))

  app.use(express.json())
  app.use(cookieParser())
  app.use('/api', createApiRoutes(deps))

  // どのrouteにも当てはまらないURLと、すべてのエラー(RFC 9457の形)。必ず最後に置く
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
