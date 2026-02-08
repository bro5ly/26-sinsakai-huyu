import {Router} from 'express'
import authRoutes from '@/features/auth/auth.route.js'
import itemRoutes from '@/features/items/item.route.js'


const router = Router();

router.use('/auth',authRoutes)
router.use('/items',itemRoutes)


export default router