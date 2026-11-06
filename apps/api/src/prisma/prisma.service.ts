import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');
  private static readonly CONNECT_ATTEMPTS = 6;
  private static readonly CONNECT_BACKOFF_MS = 3000;

  async onModuleInit() {
    // Neon and other serverless Postgres providers can suspend when idle and
    // take a few seconds to wake. Retry the initial connect so a cold start
    // doesn't crash the API before the database is ready.
    for (let attempt = 1; attempt <= PrismaService.CONNECT_ATTEMPTS; attempt++) {
      try {
        await this.$connect();
        if (attempt > 1) {
          this.logger.log(`Connected to database after ${attempt} attempt(s).`);
        }
        return;
      } catch (err: unknown) {
        if (attempt === PrismaService.CONNECT_ATTEMPTS) {
          throw err;
        }
        const code = (err as { code?: string })?.code ?? 'unknown';
        this.logger.warn(
          `Database connect attempt ${attempt}/${PrismaService.CONNECT_ATTEMPTS} failed (${code}); retrying in ${PrismaService.CONNECT_BACKOFF_MS}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, PrismaService.CONNECT_BACKOFF_MS));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
