import { Module, Global } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { LocalAIService } from './local-ai.service';

@Global()
@Module({
    providers: [OpenAIService, LocalAIService],
    exports: [OpenAIService, LocalAIService],
})
export class AIModule { }
