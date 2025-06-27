import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email, name, userType, unidade, roleId, leaderId } = createUserDto;
    let password = createUserDto.password;
    let passwordToSend: string | null = null;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(`O e-mail '${email}' já está em uso.`);
    }

    if (!password) {
      const generatedPassword = randomBytes(8).toString('hex');
      password = generatedPassword;
      passwordToSend = generatedPassword;
    }

    const saltOrRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltOrRounds);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        userType,
        unidade,
        roleId,
        leaderId,
      },
    });

    if (passwordToSend) {
      await this.emailService.sendWelcomeEmail(user.email, passwordToSend);
    }

    const { passwordHash: _, ...result } = user;
    return result;
  }
  
  async createAdmin(adminData: { name: string; email: string; userType: any; unidade: string; }) {
    const { email, name, userType, unidade } = adminData;
    
    const saltOrRounds = 10;
    const generatedPassword = randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(generatedPassword, saltOrRounds);

    await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        userType,
        unidade,
      },
    });
    
    return generatedPassword; 
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: {
        role: true,
        leader: true,
      },
    });
    return users.map((user) => {
      const { passwordHash, ...result } = user;
      return result;
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, leader: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);
    
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    const { passwordHash: _, ...result } = updatedUser;
    return result;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: `Usuário com ID ${id} removido com sucesso.` };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado.`);
    }

    const isPasswordMatching = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordMatching) {
      throw new UnauthorizedException('A senha atual está incorreta.');
    }

    const isSameAsOldPassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.passwordHash,
    );

    if (isSameAsOldPassword) {
      throw new BadRequestException('A nova senha não pode ser igual à senha atual.');
    }
    

    const saltOrRounds = 10;
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, saltOrRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Senha alterada com sucesso.' };
  }

  async resetPassword(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    const newPassword = randomBytes(8).toString('hex');
    const saltOrRounds = 10;
    
    const newPasswordHash = await bcrypt.hash(newPassword, saltOrRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.emailService.sendWelcomeEmail(user.email, newPassword);

    return { message: `Uma nova senha temporária foi enviada para o e-mail ${user.email}.` };
  }
}