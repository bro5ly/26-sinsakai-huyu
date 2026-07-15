import type { UserType } from "@/generated/prisma/enums.js"
import { UserRepository } from "./UserRepository.js"
import * as jwtLib from"@/lib/jwt.js"
import { AppError } from "@/lib/error.js"
import  type {User} from "@/generated/prisma/client.js"

export class UserService {
    constructor(
        private userRepository: UserRepository
    ){}

    async create(studentId: string , passwordHash: string): Promise<User | null>{

        const payload = await this.userRepository.findByExternalStudentId(studentId)
        if(!payload) return null

        return await this.userRepository.create({...payload,passwordHash})
    }
    async findByStudentId(studentId: string){
        return await this.userRepository.findByStudentId(studentId)
    }
    async findById(userId: string){
        return await this.userRepository.findById(userId)
    }
     async findByExternalStudentId(studentId: string){
        return await this.userRepository.findByExternalStudentId(studentId)
    }
    async findBySlackId(){}
}