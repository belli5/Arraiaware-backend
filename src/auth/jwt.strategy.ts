import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    console.log('🔑 Chave secreta usada para VERIFICAR o token:', secret);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    console.log('✅ Token JWT é válido! Payload:', payload);
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      console.error('❌ Usuário do payload não encontrado no banco de dados!');
      throw new UnauthorizedException('Usuário do token não encontrado.');
    }
    console.log('👤 Usuário encontrado e autenticado:', user.email);
    return { userId: payload.sub, email: payload.email, name: payload.name };
  }
}