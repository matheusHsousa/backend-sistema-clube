import { Controller, Post, Req, UseGuards, Get, Res, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase-auth/firebase-auth.guard';
import type { Response } from 'express';
import { request as gaxiosRequest } from 'gaxios';
import * as jwt from 'jsonwebtoken';

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

  @Get('google')
  async googleRedirect(@Query('redirect') redirect: string, @Res() res: Response) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.GOOGLE_CALLBACK_URL || (process.env.SITE_URL || '')}/auth/google/callback`;
    const state = encodeURIComponent(redirect || (process.env.FRONTEND_URL || ''));
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId || '')}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=${state}&access_type=online&prompt=select_account`;
    return res.redirect(url);
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${process.env.GOOGLE_CALLBACK_URL || (process.env.SITE_URL || '')}/auth/google/callback`;

      const tokenResp: any = await gaxiosRequest({
        url: 'https://oauth2.googleapis.com/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: new URLSearchParams({
          code,
          client_id: clientId || '',
          client_secret: clientSecret || '',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        }).toString()
      });

      const idToken = (tokenResp?.data as any)?.id_token;
      // decode id_token to get user info
      const decoded: any = jwt.decode(idToken) as any;

      const googleUser = {
        uid: `google:${decoded.sub}`,
        email: decoded.email,
        name: decoded.name,
      };

      const backendUser = await this.authService.handleUser(googleUser);

      // generate jwt for our app and set cookie
      const appToken = this.authService.generateJwtForUser(backendUser);
      const frontendUrl = decodeURIComponent(state || (process.env.FRONTEND_URL || '')) || (process.env.FRONTEND_URL || '');

      res.cookie('auth_token', appToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
      return res.redirect(frontendUrl || '/');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Google callback error:', err);
      return res.status(500).send('Auth error');
    }
  }

  @Get('me')
  async me(@Req() req) {
    const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '').trim();
    if (!token) return null;
    try {
      const secret = process.env.JWT_SECRET || 'dev-secret';
      const payload: any = jwt.verify(token, secret);
      // fetch user from supabase by id
      const { data } = await this.authService['supabase'].client.from('user').select('*').eq('id', payload.id).limit(1).maybeSingle();
      return data || null;
    } catch (err) {
      return null;
    }
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    try {
      res.clearCookie('auth_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      return res.json({ ok: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Logout error:', err);
      return res.status(500).json({ ok: false });
    }
  }
}
