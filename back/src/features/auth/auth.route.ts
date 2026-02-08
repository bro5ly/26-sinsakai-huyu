import {Router} from "express";
import {prisma} from "@/lib/prisma.js"
import { UserRepository } from "../user/UserRepository.js";
import { UserService } from "../user/UserService.js";
import { AuthRepository } from "./auth.repository.js";
import { MailService } from "@/lib/mail.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";

const router = Router();

const userRepo = new UserRepository(prisma)
const userService = new UserService(userRepo)
const authRepo = new AuthRepository(prisma)
const mailService = new MailService()
const authService = new AuthService(userService,authRepo,mailService)
const authController = new AuthController(authService)


router.post('/request-verification',authController.requestVerification)
router.post('/verify-code',authController.verifyCode)
router.post('/signup', authController.signup)

export default router