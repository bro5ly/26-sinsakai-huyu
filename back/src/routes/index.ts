import {Router} from 'express'
import { createAuthRoutes } from '@/features/auth/auth.routes.js'
import { createCatalogRoutes } from '@/features/catalog/catalog.routes.js'
import { createTabletRoutes } from '@/features/rentals/rental.routes.js'
import { createMeRoutes } from '@/features/me/me.routes.js'
import type { Deps } from '@/deps.js'
import type { Config } from '@/config.js'

export const createApiRoutes = (deps: Deps, config: Config) => {
    const router = Router();

    // 登録・ログインは資源ごとのURL(/verification-codes・/users・/sessions)を直下に持つ(docs/api.md 4.1)
    router.use(createAuthRoutes(deps, config))
    router.use('/me', createMeRoutes(deps))
    router.use(createCatalogRoutes(deps))
    router.use('/tablet', createTabletRoutes(deps))

    return router
}
