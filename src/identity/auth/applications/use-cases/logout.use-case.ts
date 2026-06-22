// application/use-cases/logout.use-case.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class LogoutService {
  private readonly logger = new Logger(LogoutService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async execute(userId: string): Promise<{ message: string }> {
    this.logger.log(`User logged out: ${userId}`);

    this.eventEmitter.emit('auth.user_logged_out', {
      userId,
      timestamp: new Date(),
    });

    return {
      message: 'Logout berhasil',
    };
  }
}