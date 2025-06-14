import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt'; 

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 2. Adicione o método de hash e a lógica no método create
  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;

    // O "salt" é um valor aleatório adicionado à senha antes do hash
    // para garantir que senhas iguais resultem em hashes diferentes.
    // Um valor de 10 é um bom padrão de segurança e performance.
    const saltOrRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltOrRounds);

    try {
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          passwordHash, // Salve o hash, e não a senha original
        },
      });

      // IMPORTANTE: Nunca retorne a senha ou o hash da senha para o cliente.
      const { passwordHash: _, ...result } = user;
      return result;

    } catch (error) {
      // Tratar erros, como email duplicado, etc.
      throw error;
    }
  }

  async findAll() {
    // Excluir o hash da senha da lista de usuários
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

    // Excluir o hash da senha do retorno
    const { passwordHash, ...result } = user;
    return result;
  }

  // A lógica de update de senha deve ser tratada com cuidado em um método específico
  async update(id: string, updateUserDto: UpdateUserDto) {
    // Garante que a senha não seja atualizada por este método
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