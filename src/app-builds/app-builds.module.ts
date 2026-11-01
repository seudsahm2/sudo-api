import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { MediaModule } from '../media/media.module';
import {
  AdminAppBuildController,
  AppBuildServeController,
} from './app-build.controllers';
import { AppBuildService } from './app-build.service';

@Module({
  imports: [AdminModule, MediaModule],
  controllers: [AdminAppBuildController, AppBuildServeController],
  providers: [AppBuildService],
})
export class AppBuildsModule {}
