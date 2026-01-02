import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { ConfigValidationService } from './config-validation.service';

@Global()
@Module({
  providers: [ConfigValidationService, EncryptionService],
  exports: [ConfigValidationService, EncryptionService],
})
export class CommonModule {}
