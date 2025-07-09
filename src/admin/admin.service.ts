import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async updateUserPermissions(
    userId: string,
    dto: UpdateUserPermissionsDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado.`);
    }

    const { userType, roleIds } = dto;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(userType && { userType: userType }),
        ...(roleIds && {
          roles: {
            set: roleIds.map((id) => ({ id })),
          },
        }),
      },
    });

    const { passwordHash, ...result } = updatedUser;
    return result;
  }
}