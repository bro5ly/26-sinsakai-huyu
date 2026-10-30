import { Router } from "express";
import type { Categories, ItemTypeDetail, ItemTypes } from "@sinsakai/shared";
import { createAuthMiddleware } from "@/middleware/auth.middleware.js";
import { route } from "@/lib/route.js";
import type { Deps } from "@/deps.js";
import { CatalogService } from "./catalog.service.js";

export const createCatalogService = (deps: Deps): CatalogService => new CatalogService({ catalog: deps.catalog });

// カタログ(docs/api.md 4.3)。ログイン必須(docs/spec.md Q11)。資源ごとのURL(/categories・/item-types)を直下に持つ
export const createCatalogRoutes = (deps: Deps): Router => {
  const router = Router();
  const catalog = createCatalogService(deps);
  const authMiddleware = createAuthMiddleware(deps.sessions);

  router.get(
    "/categories",
    authMiddleware,
    route({ auth: true }, async ({ res }) => {
      return res.status(200).json({ items: await catalog.listCategories() } satisfies Categories);
    }),
  );

  router.get(
    "/item-types",
    authMiddleware,
    route({ auth: true }, async ({ res }) => {
      return res.status(200).json({ items: await catalog.listItemTypes() } satisfies ItemTypes);
    }),
  );

  router.get(
    "/item-types/:id",
    authMiddleware,
    route({ auth: true }, async ({ req, res }) => {
      return res.status(200).json((await catalog.getItemType(String(req.params.id))) satisfies ItemTypeDetail);
    }),
  );

  return router;
};
