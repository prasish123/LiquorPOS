import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConexxusService } from './integrations/conexxus/conexxus.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const conexxusService = app.get(ConexxusService);

    console.log('Starting Conexxus Sync Test...');
    try {
        await conexxusService.syncInventory();
        console.log('Sync completed successfully.');
    } catch (error) {
        console.error('Sync failed:', error);
    }

    await app.close();
}
bootstrap();
