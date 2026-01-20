import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global module that provides the PrismaService throughout the application.
 * Being a global module, it only needs to be imported once in the root module.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
