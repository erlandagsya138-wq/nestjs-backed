// src/ai-integration/infrastructures/health/ai-health.controller.ts
import { Controller, Get, Logger, MessageEvent, Sse } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
import { AiHealthService, type AiStatusSnapshot } from './ai-health.service';
import { Public } from '../../../../identity/auth/interface/decorators/public.decorator';

@ApiTags('AI Health')
@Controller('ai')
export class AiHealthController {
  private readonly logger = new Logger(AiHealthController.name);

  constructor(private readonly aiHealthService: AiHealthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Sse('status')
  @ApiOperation({
    summary: 'Stream status AI (SSE)',
    description:
      '**Server-Sent Events** — koneksi tetap terbuka, server push setiap 10 detik.\n\n' +
      'Gunakan `EventSource` di browser atau library SSE di mobile.\n\n' +
      'Event type: `ai-status`\n\n' +
      '```\nAccept: text/event-stream\n```\n\n' +
      '**Tidak memerlukan autentikasi** — dapat diakses publik untuk monitoring.\n\n' +
      '**Rate limit dinonaktifkan** untuk endpoint ini karena sifat long-lived SSE.',
  })
  @ApiOkResponse({
    description: 'Stream SSE `ai-status` event. Setiap event berisi AiStatusSnapshot.',
    content: {
      'text/event-stream': {
        schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ONLINE', 'OFFLINE'],
              example: 'ONLINE',
            },
            checkedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
            },
            message: {
              type: 'string',
              example: 'AI service online dan model siap.',
            },
            modelLoaded: {
              type: 'boolean',
              example: true,
            },
            uptimeSeconds: {
              type: 'number',
              nullable: true,
              example: 3600,
            },
          },
        },
      },
    },
  })
  streamAiStatus(): Observable<MessageEvent> {
    this.logger.log('[SSE] Client baru terhubung ke /api/v1/ai/status');

    return this.aiHealthService.status$.pipe(
      map((snapshot: AiStatusSnapshot): MessageEvent => {
        return {
          data: snapshot,
          type: 'ai-status',
          id: snapshot.checkedAt,
        };
      }),
    );
  }

  @Public()
  @Get('status/current')
  @ApiOperation({
    summary: 'Status AI saat ini (REST)',
    description:
      'One-shot REST endpoint untuk memeriksa status AI tanpa membuka koneksi SSE.\n\n' +
      'Gunakan ini untuk:\n' +
      '- Initial load sebelum SSE terhubung\n' +
      '- Health probe dari load balancer / monitoring\n' +
      '- Cek cepat via cURL/Postman\n\n' +
      '**Tidak memerlukan autentikasi.**',
  })
  @ApiOkResponse({
    description: 'Snapshot status AI terkini.',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ONLINE', 'OFFLINE'],
          example: 'ONLINE',
        },
        checkedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:30:00.000Z',
        },
        message: {
          type: 'string',
          example: 'AI service online dan model siap.',
        },
        modelLoaded: {
          type: 'boolean',
          example: true,
        },
        uptimeSeconds: {
          type: 'number',
          nullable: true,
          example: 3600,
        },
      },
      required: ['status', 'checkedAt', 'message', 'modelLoaded'],
    },
  })
  getCurrentStatus(): AiStatusSnapshot {
    return this.aiHealthService.getCurrentStatus();
  }
}
