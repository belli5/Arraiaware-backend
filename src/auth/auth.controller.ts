import { Body, Controller, Logger, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name); 

  constructor(private authService: AuthService) {}

  @Public()
  @Post('/login')
  @ApiOperation({ summary: 'Realiza o login e retorna um token JWT' })
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Tentativa de login para o e-mail: ${loginDto.email}`); 

    const user = await this.authService.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      this.logger.warn(`Falha na validação de credenciais para o e-mail: ${loginDto.email}`); 
      throw new UnauthorizedException('E-mail ou senha inválidos'); 
    }

    this.logger.log(`Credenciais válidas para o e-mail: ${loginDto.email}. Gerando token.`); 
    return this.authService.login(user);
  }
}