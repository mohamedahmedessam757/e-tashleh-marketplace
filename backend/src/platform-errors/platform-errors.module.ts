import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalHttpExceptionFilter } from '../common/filters/http-exception.filter';
import { CorrelationIdMiddleware } from '../common/middleware/correlation-id.middleware';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformErrorsController } from './platform-errors.controller';
import { PlatformErrorsService } from './platform-errors.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformErrorsController],
  providers: [
    PlatformErrorsService,
    { provide: APP_FILTER, useClass: GlobalHttpExceptionFilter },
  ],
  exports: [PlatformErrorsService],
})
export class PlatformErrorsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
