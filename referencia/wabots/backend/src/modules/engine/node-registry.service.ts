import { Injectable } from '@nestjs/common';
import { NodeExecutor, NodeType } from '../../common/types/engine.types';
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

/**
 * Registro de ejecutores de nodo. Mapea NodeType → NodeExecutor.
 * Los executors se inyectan y se indexan por su propiedad `type`.
 */
@Injectable()
export class NodeRegistry {
  private readonly executors = new Map<NodeType, NodeExecutor>();

  constructor(
    trigger: TriggerExecutor,
    sendText: SendTextExecutor,
    interactiveMenu: InteractiveMenuExecutor,
    captureInput: CaptureInputExecutor,
    condition: ConditionExecutor,
    aiAgent: AiAgentExecutor,
    httpRequest: HttpRequestExecutor,
    gmail: GmailExecutor,
    calendar: CalendarExecutor,
    sendFile: SendFileExecutor,
    receiveFile: ReceiveFileExecutor,
    transcribeAudio: TranscribeAudioExecutor,
    ocrImage: OcrImageExecutor,
    translateText: TranslateTextExecutor,
    delay: DelayExecutor,
    handover: HandoverExecutor,
    reminder: ReminderExecutor,
    end: EndExecutor,
  ) {
    for (const executor of [
      trigger,
      sendText,
      interactiveMenu,
      captureInput,
      condition,
      aiAgent,
      httpRequest,
      gmail,
      calendar,
      sendFile,
      receiveFile,
      transcribeAudio,
      ocrImage,
      translateText,
      delay,
      handover,
      reminder,
      end,
    ]) {
      this.executors.set(executor.type, executor);
    }
  }

  /** Devuelve el ejecutor para un tipo de nodo. Lanza si no existe. */
  get(type: NodeType): NodeExecutor {
    const executor = this.executors.get(type);
    if (!executor) {
      throw new Error(`No hay ejecutor registrado para el tipo de nodo "${type}"`);
    }
    return executor;
  }
}
