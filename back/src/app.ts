import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from 'cookie-parser';
import { createApiRoutes } from '@/routes/index.js'
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware.js';
import type { Deps } from '@/deps.js'
import type { Config } from '@/config.js'

// 部品を受け取って組み立てるだけにし、サーバーを立てる(listen)のはserver.tsに任せる。テストは偽の部品で組み立てる
export const createApp = (deps: Deps, config: Config) => {
  const app = express()

  // セキュリティのヘッダ(nosniff・フレームの禁止など)を付け、X-Powered-Byを消す(R4)
  app.use(helmet())

  // CORS設定
  app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }))

  // Expressの既定と同じ100kbをはっきり書く。今のAPIは学籍番号やバーコードなどの小さな入力だけ(L1)
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())
  app.use('/api', createApiRoutes(deps, config))

  // どのrouteにも当てはまらないURLと、すべてのエラー(RFC 9457の形)。必ず最後に置く
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
