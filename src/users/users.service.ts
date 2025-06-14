import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, name, userType, roleId, leaderId } = createUserDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(`O e-mail '${email}' já está em uso.`);
    }

    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltOrRounds);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        userType,
        roleId,
        leaderId,
      },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: {
        role: true,
        leader: true,
      },
    });
    return users.map((user) => {
      const { passwordHash: _, ...result } = user;
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

    const dataToUpdate: any = { ...updateUserDto };
    delete dataToUpdate.password;

    if (updateUserDto.password) {
      const saltOrRounds = 10;
      dataToUpdate.passwordHash = await bcrypt.hash(
        updateUserDto.password,
        saltOrRounds,
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    const { passwordHash: _, ...result } = updatedUser;
    return result;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: `Usuário com ID ${id} removido com sucesso.` };
  }
}
