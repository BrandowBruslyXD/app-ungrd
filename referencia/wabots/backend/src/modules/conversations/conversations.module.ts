import { Module } from '@nestjs/common';
import {
  ConversationsController,
  TenantConversationsController,
} from './conversations.controller';
import { ConversationsService } from './conversations.service';

/**
 * Módulo de conversaciones: estado e historial.
 * Exporta ConversationsService porque lo consume el engine.
 */
@Module({
  controllers: [TenantConversationsController, ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
