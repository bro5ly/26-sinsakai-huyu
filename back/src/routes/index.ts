import {Router} from 'express'
import { createAuthRoutes } from '@/features/auth/auth.routes.js'
import { createItemRoutes } from '@/features/items/item.routes.js'
import { createTabletRoutes } from '@/features/rentals/rental.routes.js'
import type { Deps } from '@/deps.js'
import type { Config } from '@/config.js'

export const createApiRoutes = (deps: Deps, config: Config) => {
    const router = Router();

    router.use('/auth', createAuthRoutes(deps, config))
    router.use('/items', createItemRoutes(deps))
    router.use('/tablet', createTabletRoutes(deps))

    return router
}
