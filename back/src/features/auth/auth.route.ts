import {Router} from "express";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import type { Deps } from "@/deps.js";

export const createAuthRoutes = (deps: Deps) => {
    const router = Router();

    const authService = new AuthService(deps.users, deps.auth, deps.mailer, deps.roster)
    const authController = new AuthController(authService)

    router.post('/request-verification',authController.requestVerification)
    router.post('/verify-code',authController.verifyCode)
    router.post('/signup', authController.signup)
    router.post('/login',authController.login)
    router.post('/logout',authController.logout)
    router.post('/refreshSession',authController.refreshSession)

    return router
}
