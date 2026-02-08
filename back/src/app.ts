import express from "express";
import apiRoutes from '@/routes/index.js'
import cookieParser from 'cookie-parser';

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use('/api',apiRoutes)



export default app