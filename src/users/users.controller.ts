import { Controller, Get, UseGuards, Put, Body, Param, Req } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth/firebase-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('instrutores')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findInstrutores() {
    return this.usersService.findInstrutores();
  }

  @Get('conselheiros')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findConselheiros() {
    return this.usersService.findConselheiros();
  }

  @Get('capelania')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findCapelania() {
    return this.usersService.findCapelania();
  }

  @Put('me')
  @UseGuards(FirebaseAuthGuard)
  updateMyProfile(
    @Req() req,
    @Body() body: { name?: string }
  ) {
    // Atualiza o perfil do usuário autenticado (apenas nome)
    const userId = req.user.id;
    return this.usersService.updateProfile(userId, body);
  }

  @Put(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; roles?: string[]; unidade?: string | null; classe?: string | null }
  ) {
    return this.usersService.update(Number(id), body);
  }
}
