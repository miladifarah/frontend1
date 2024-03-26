// auth.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'src/enums/role';
import { ClientRepository } from 'src/user/client.repository';
import { AdminRepository } from 'src/user/admin.repository';
import { SubscriberRepository } from 'src/user/subscriber.repository';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private clientRepository: ClientRepository,
    private adminRepository: AdminRepository,
    private subscriberRepository: SubscriberRepository,
  ) {}

  async signIn(email: string, password: string): Promise<{ access_token: string, role?: Role }> {
    let user;

    
    user = await this.userService.findOneByEmailByEmailOrTelephone(email);
    if (!user) {
      user = await this.clientRepository.findOneByEmailOrTelephone(email);
    }
    if (!user) {
      user = await this.adminRepository.findOneByEmailOrTelephone(email);
    }
    if (!user) {
      user = await this.subscriberRepository.findOneByEmailOrTelephone(email);
    }

    // If user is not found in any table, throw UnauthorizedException
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare hashed password with the received password
    let isPasswordValid = false;

    if (user.password.startsWith('$2b$')) {
        // Password is already hashed
        isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
        // Password is not hashed, compare directly
        isPasswordValid = password === user.password;
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let redirectTo = '';
    switch (user.role) {
      case Role.ADMIN:
        redirectTo = '/admin/dashboard';
        break;
      case Role.CLIENT:
        redirectTo = 'http://localhost:3000/admin/dashboard';
        break;
      case Role.SUBSCRIBER:
        redirectTo = '/subscriber/dashboard';
        break;
      default:
        redirectTo = '/login'; // Redirect unauthorized users to login page
        break;
    }

    // Construct payload and return access token
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
      role: user.role,
    };
  }
}