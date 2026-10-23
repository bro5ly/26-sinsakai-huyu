import { UserRepository } from "./UserRepository.js"

export class UserService {
    constructor(
        private userRepository: UserRepository
    ){}

    async create(studentId: string , passwordHash: string){
        const payload = await this.userRepository.findByExternalStudentId(studentId)
        if(!payload) return null

        return await this.userRepository.create({studentId, passwordHash})
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
