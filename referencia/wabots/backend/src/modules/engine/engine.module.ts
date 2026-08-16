import { Module } from '@nestjs/common';

import { ConversationsModule } from '../conversations/conversations.module';
import { FlowsModule } from '../flows/flows.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { EngineController } from './engine.controller';
import { EngineService } from './engine.service';
import { PreviewMediaController, TenantMediaController } from './preview-media.controller';
import { ConversationSetupService } from './services/conversation-setup.service';
import { PreviewMediaService } from './services/preview-media.service';
import { NodeRegistry } from './node-registry.service';
import { AiAgentExecutor } from './executors/ai-agent.executor';
import { CalendarExecutor } from './executors/calendar.executor';
import { CaptureInputExecutor } from './executors/capture-input.executor';
import { ConditionExecutor } from './executors/condition.executor';
import { DelayExecutor } from './executors/delay.executor';
import { EndExecutor } from './executors/end.executor';
import { GmailExecutor } from './executors/gmail.executor';
import { HandoverExecutor } from './executors/handover.executor';
import { HttpRequestExecutor } from './executors/http-request.executor';
import { InteractiveMenuExecutor } from './executors/interactive-menu.executor';
import { OcrImageExecutor } from './executors/ocr-image.executor';
import { ReceiveFileExecutor } from './executors/receive-file.executor';
import { ReminderExecutor } from './executors/reminder.executor';
import { SendFileExecutor } from './executors/send-file.executor';
import { SendTextExecutor } from './executors/send-text.executor';
import { TranscribeAudioExecutor } from './executors/transcribe-audio.executor';
import { TranslateTextExecutor } from './executors/translate-text.executor';
import { TriggerExecutor } from './executors/trigger.executor';
import { MediaService } from './services/media.service';
import { OcrService } from './services/ocr.service';
import { TranscriptionService } from './services/transcription.service';
import { TranslationService } from './services/translation.service';
import { IncomingTextService } from './incoming-text.service';

/**
 * Módulo del motor de ejecución. Reúne todos los ejecutores de nodo, el
 * NodeRegistry y el EngineService (que escucha 'whatsapp.incoming').
 * (PrismaModule y EventEmitterModule son globales — ver AppModule.)
 */
@Module({
  imports: [WhatsappModule, IntegrationsModule, ConversationsModule, FlowsModule],
  controllers: [EngineController, PreviewMediaController, TenantMediaController],
  providers: [
    EngineService,
    // Resuelve tenant/flujo/conversación/nodo inicial para cada mensaje.
    ConversationSetupService,
    PreviewMediaService,
    NodeRegistry,
    // Normaliza el mensaje entrante (audio→texto, imagen→OCR) para todos los nodos.
    IncomingTextService,
    TriggerExecutor,
    SendTextExecutor,
    InteractiveMenuExecutor,
    CaptureInputExecutor,
    ConditionExecutor,
    AiAgentExecutor,
    HttpRequestExecutor,
    GmailExecutor,
    CalendarExecutor,
    SendFileExecutor,
    ReceiveFileExecutor,
    TranscribeAudioExecutor,
    OcrImageExecutor,
    TranslateTextExecutor,
    DelayExecutor,
    HandoverExecutor,
    ReminderExecutor,
    EndExecutor,
    // Servicios de soporte de los nodos offline (media + traducción).
    MediaService,
    TranscriptionService,
    OcrService,
    TranslationService,
  ],
  exports: [EngineService],
})
export class EngineModule {}
