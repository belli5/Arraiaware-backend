import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

type UserWithoutHashAndWithRole = Omit<User, 'passwordHash'> & { role?: Role | null };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<UserWithoutHashAndWithRole | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result as UserWithoutHashAndWithRole;
  }

  async login(user: UserWithoutHashAndWithRole): Promise<{ access_token: string }> {
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      userType: user.userType,
      roleType: user.role?.type,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}