import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [SupabaseModule],
  providers: [StatsService],
  controllers: [StatsController]
})
export class StatsModule {}
