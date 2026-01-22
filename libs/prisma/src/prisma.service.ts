import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Service that provides access to the Prisma Client for database operations.
 * Implements NestJS lifecycle hooks to properly manage database connections.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  /**
   * Connects to the database when the module is initialized.
   * Called automatically by NestJS.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to database...');

    // Set up logging for queries in development
    if (process.env.NODE_ENV !== 'production') {
      // @ts-expect-error Prisma event types
      this.$on('query', (e: { query: string; params: string; duration: number }) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Params: ${e.params}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    // @ts-expect-error Prisma event types
    this.$on('error', (e: { message: string }) => {
      this.logger.error(`Database error: ${e.message}`);
    });

    await this.$connect();
    this.logger.log('Successfully connected to database');
  }

  /**
   * Disconnects from the database when the module is destroyed.
   * Called automatically by NestJS during shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Successfully disconnected from database');
  }

  /**
   * Cleans the database by deleting all records from all tables.
   * Useful for testing purposes.
   * @warning This will delete all data - use with caution!
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production environment');
    }

    this.logger.warn('Cleaning database - all data will be deleted');

    // Delete in order respecting foreign key constraints
    await this.$transaction([
      this.refreshToken.deleteMany(),
      this.payment.deleteMany(),
      this.authUser.deleteMany(),
    ]);

    this.logger.log('Database cleaned successfully');
  }
}
