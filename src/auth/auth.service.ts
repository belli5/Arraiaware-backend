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
    this.logger.debug(`[AuthService] Iniciando validação para o e-mail: ${email}`);

    
    const user = await this.usersService.findByEmail(email); 

    if (!user) {
      this.logger.warn(`[AuthService] Usuário não encontrado para o e-mail: ${email}`);
      return null;
    }


    const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);

    if (!isPasswordValid) {
      this.logger.warn(`[AuthService] Senha inválida para o e-mail: ${email}`);
      return null;
    }


    const { passwordHash, ...result } = user;
    this.logger.debug(`[AuthService] Usuário ${email} validado com sucesso.`);
   
    return result as UserWithoutHashAndWithRole; 
  }

  async login(user: UserWithoutHashAndWithRole): Promise<{ access_token: string }> {
    this.logger.debug(`[AuthService] Gerando token para o usuário: ${user.email}`);

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