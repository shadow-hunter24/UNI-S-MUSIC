import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GenresModule } from './genres/genres.module';
import { ArtistsModule } from './artists/artists.module';
import { TracksModule } from './tracks/tracks.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { FeedModule } from './feed/feed.module';
import { SearchModule } from './search/search.module';
import { StorageModule } from './storage/storage.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env lives at the monorepo root — two levels up from apps/api
      envFilePath: path.resolve(__dirname, '..', '..', '..', '.env'),
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    ThrottlerModule.forRootAsync({
      inject: [],
      useFactory: () => [
        {
          ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60', 10) * 1000,
          limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '10', 10),
        },
      ],
    }),
    PrismaModule,
    StorageModule,
    QueueModule,
    HealthModule,
    AuthModule,
    UsersModule,
    GenresModule,
    ArtistsModule,
    TracksModule,
    PlaylistsModule,
    FeedModule,
    SearchModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
