import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

import { defaultCodeForStatus } from '../errors/error-codes';

/**
 * Filtro global de excepciones: respuestas JSON consistentes y SIN filtrar
 * detalles internos en errores 500 (solo se loguean del lado servidor).
 * Todo error lleva un `code` ESTABLE (ver ERRORS.md): el que traiga la
 * excepción en su payload o, si no, el genérico de su status.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Cuerpo base. Para HttpException con payload de objeto se PRESERVAN los
    // campos extra (p. ej. `activeSession` del 409 de sesión única: device/ip/since),
    // sin los cuales el overlay del login no puede mostrarlos.
    let body: Record<string, any> = { statusCode: status, message: 'Error interno del servidor' };
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      body =
        typeof payload === 'string'
          ? { statusCode: status, message: payload }
          : { statusCode: status, ...(payload as Record<string, any>) };
    }

    // Los errores no controlados (500) se loguean completos, pero NUNCA se
    // exponen: se responde un mensaje genérico sin detalles internos.
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack ?? exception.message : String(exception),
      );
      body = { statusCode: status, message: 'Error interno del servidor' };
    }

    // Código estable: el explícito del payload o el genérico del status.
    if (typeof body.code !== 'string' || !body.code) {
      body.code = defaultCodeForStatus(status);
    }

    res.status(status).json(body);
  }
}
