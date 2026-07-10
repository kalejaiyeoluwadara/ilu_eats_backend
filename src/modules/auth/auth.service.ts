import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { UserDocument } from '../users/schemas/user.schema';

/** Password-reset links stay valid for this long after being requested. */
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const PASSWORD_RESET_TTL_LABEL = '1 hour';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private buildToken(user: UserDocument) {
    return this.jwtService.sign({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });
  }

  async signup(dto: SignupDto) {
    const user = await this.usersService.createCustomer(
      dto.name,
      dto.email,
      dto.password,
    );
    void this.mailService.sendWelcomeEmail(user.email, user.name);
    return {
      user: this.usersService.toPublicUser(user),
      token: this.buildToken(user),
    };
  }

  async googleSync(name: string, email: string) {
    const { user, isNew } = await this.usersService.findOrCreateOAuthUser(
      name,
      email,
    );
    if (isNew) {
      void this.mailService.sendWelcomeEmail(user.email, user.name);
    }
    return {
      user: this.usersService.toPublicUser(user),
      token: this.buildToken(user),
    };
  }

  async signin(dto: SigninDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException(
        "We couldn't find an ìlúEats account with this email. Please check the address or create an account.",
      );
    }

    const matches = await this.usersService.verifyPassword(user, dto.password);
    if (!matches) {
      throw new UnauthorizedException(
        'Incorrect password. Please try again or reset your password.',
      );
    }

    if (dto.allowedRoles?.length && !dto.allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Account role not permitted for this portal',
      );
    }

    return {
      user: this.usersService.toPublicUser(user),
      token: this.buildToken(user),
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Only send mail when the account exists, but always return the same
    // response so this endpoint can't be used to probe which emails are registered.
    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
      await this.usersService.setPasswordResetToken(
        user._id.toString(),
        tokenHash,
        expires,
      );
      void this.mailService.sendPasswordResetEmail(
        user.email,
        user.name,
        rawToken,
        PASSWORD_RESET_TTL_LABEL,
      );
    }

    return {
      message:
        "If an account exists for this email, a password reset link is on its way. Please check your inbox — and your spam or junk folder, just in case — it's valid for the next hour.",
    };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user =
      await this.usersService.findByValidPasswordResetToken(tokenHash);
    if (!user) {
      throw new BadRequestException(
        'This password reset link is invalid or has expired. Please request a new one.',
      );
    }

    await this.usersService.resetPassword(user._id.toString(), password);
    void this.mailService.sendPasswordChangedEmail(user.email, user.name);

    return {
      message:
        'Your password has been reset. You can now sign in with your new password.',
    };
  }
}
