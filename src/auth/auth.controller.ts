import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase-auth/firebase-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post('login')
  async login(@Req() req) {
    // req.user vem do guard. Se já for um usuário do backend, retorna-o diretamente;
    // caso contrário (objeto vindo do Firebase), cria/atualiza via handleUser.
    const maybeBackendUser = req.user;
    if (maybeBackendUser && (maybeBackendUser.roles || maybeBackendUser.firebaseUid)) {
      return maybeBackendUser;
    }
    return this.authService.handleUser(maybeBackendUser);
  }
}
