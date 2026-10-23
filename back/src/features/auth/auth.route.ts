import {Router} from "express";
import {prisma} from "@/lib/prisma.js"
import { UserRepository } from "../user/UserRepository.js";
import { AuthRepository } from "./auth.repository.js";
import { MailService } from "@/lib/mail.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { PrismaRoster } from "../roster/prisma-roster.js";

const router = Router();

const userRepo = new UserRepository(prisma)
const authRepo = new AuthRepository(prisma)
const mailService = new MailService()
const authService = new AuthService(userRepo,authRepo,mailService,new PrismaRoster(prisma))
const authController = new AuthController(authService)


router.post('/request-verification',authController.requestVerification)
router.post('/verify-code',authController.verifyCode)
router.post('/signup', authController.signup)
router.post('/login',authController.login)
router.post('/logout',authController.logout)
router.post('/refreshSession',authController.refreshSession)

export default router