import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [SupabaseModule],
  providers: [ClassesService],
  controllers: [ClassesController],
})
export class ClassesModule {}
