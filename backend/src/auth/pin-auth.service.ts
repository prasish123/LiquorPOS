import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

export interface PinAuthResult {
  userId: string;
  firstName: string;
  lastName: string;
  role: Role;
}

@Injectable()
export class PinAuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Authenticate user by PIN
   * Used for quick manager overrides
   */
  async authenticateByPin(pin: string): Promise<PinAuthResult> {
    // Find all active users with PINs
    const users = await this.prisma.user.findMany({
      where: {
        active: true,
        pin: { not: null },
      },
    });

    // Check PIN against all active users
    for (const user of users) {
      if (user.pin && (await bcrypt.compare(pin, user.pin))) {
        return {
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        };
      }
    }

    throw new UnauthorizedException('Invalid PIN');
  }

  /**
   * Validate manager/admin role
   */
  async validateManagerRole(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.active) {
      return false;
    }

    return user.role === Role.MANAGER || user.role === Role.ADMIN;
  }

  /**
   * Set or update user PIN
   */
  async setPin(userId: string, pin: string): Promise<void> {
    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error('PIN must be 4-6 digits');
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { pin: hashedPin },
    });
  }

  /**
   * Clear user PIN
   */
  async clearPin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pin: null },
    });
  }
}

