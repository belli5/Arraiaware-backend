import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt'; 

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;

    const saltOrRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltOrRounds);

    try {
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          passwordHash, 
        },
      });

      const { passwordHash: _, ...result } = user;
      return result;

    } catch (error) {
      throw error;
    }
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: {
        role: true,
        leader: true,
      },
    });
    return users.map(user => {
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

    const { passwordHash, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      delete updateUserDto.password;
    }
    
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }
}