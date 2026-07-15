import {Router} from 'express'
import authRoutes from '@/features/auth/auth.route.js'
import itemRoutes from '@/features/items/item.route.js'
import tabletRoutes from '@/features/rentals/rental.route.js'


const router = Router();

router.use('/auth',authRoutes)
router.use('/items',itemRoutes)
router.use('/tablet',tabletRoutes)


export default router