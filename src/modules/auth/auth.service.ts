import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { UserDocument } from '../users/schemas/user.schema';

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
    const user = await this.usersService.validateCredentials(
      dto.email,
      dto.password,
    );
    if (!user) throw new UnauthorizedException('Invalid credentials');

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
}
