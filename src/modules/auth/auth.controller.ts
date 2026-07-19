import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { GoogleSyncDto } from './dto/google-sync.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Account-creation and credential endpoints get a far tighter per-IP budget
  // than the global 100/min: they hit the DB, send OTP/email (real cost), and
  // are the prime targets for credential-stuffing and OTP-spam abuse. A real
  // human never trips these; a script does immediately.
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('signin')
  signin(@Body() dto: SigninDto) {
    return this.authService.signin(dto);
  }

  @Post('google-sync')
  googleSync(@Body() dto: GoogleSyncDto) {
    return this.authService.googleSync(dto.name, dto.email);
  }

  // Sends an email per call — throttle hard to stop it being weaponised as a
  // mail-bomb against arbitrary addresses.
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('signout')
  @HttpCode(204)
  signout() {
    // Stateless JWT — client discards the token. Nothing to invalidate server-side.
    return;
  }

  @UseGuards(JwtAuthGuard)
  @Get('session')
  session(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }
}
