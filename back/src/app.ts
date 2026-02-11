import express from "express";
import cors from "cors";
import apiRoutes from '@/routes/index.js'
import cookieParser from 'cookie-parser';

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
app.use('/api',apiRoutes)



export default app