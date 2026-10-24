import {Router} from 'express'
import { createAuthRoutes } from '@/features/auth/auth.routes.js'
import { createItemRoutes } from '@/features/items/item.route.js'
import { createTabletRoutes } from '@/features/rentals/rental.route.js'
import type { Deps } from '@/deps.js'

export const createApiRoutes = (deps: Deps) => {
    const router = Router();

    router.use('/auth', createAuthRoutes(deps))
    router.use('/items', createItemRoutes(deps))
    router.use('/tablet', createTabletRoutes(deps))

    return router
}
