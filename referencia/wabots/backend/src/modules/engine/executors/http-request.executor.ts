import { Injectable } from '@nestjs/common';
import { Method } from 'axios';
import {
  ExecutionContext,
  FlowNode,
  NodeExecutor,
  NodeResult,
  NodeType,
} from '../../../common/types/engine.types';
import { isAllowedInternalHost } from '../../integrations/services/http.service';
import { HttpRequestService } from '../../integrations/services/http.service';
import { interpolate, interpolateDeep } from './interpolate';

/**
 * Petición HTTP genérica del nodo `httpRequest`. Se realiza a través de
 * HttpRequestService, que aplica protección ANTI-SSRF (solo http(s), rechaza
 * IPs privadas/loopback/link-local/CGNAT, sin redirecciones, con timeout).
 * En modo ENSAYO (dryRun del editor) NO sale a la red: devuelve un stub.
 * Guarda la respuesta en variables[saveTo || 'http']. Sale 'out' / 'onError'.
 */
@Injectable()
export class HttpRequestExecutor implements NodeExecutor {
  readonly type: NodeType = 'httpRequest';

  constructor(private readonly http: HttpRequestService) {}

  async execute(node: FlowNode, ctx: ExecutionContext): Promise<NodeResult> {
    const method = (node.data?.method ?? 'GET').toString().toUpperCase() as Method;
    const url = interpolate(node.data?.url, ctx.variables);
    const headers = interpolateDeep(node.data?.headers ?? {}, ctx.variables);
    const body = interpolateDeep(node.data?.body, ctx.variables);
    const saveTo = node.data?.saveTo || 'http';

    // En ensayo no se contacta ningún host real, con una excepción: los destinos
    // internos autorizados en HTTP_NODE_ALLOWED_HOSTS. Sirven para probar el flujo
    // completo contra servicios propios (datos de demostración, inventario interno)
    // sin tocar sistemas de terceros ni crear pedidos reales en producción.
    if (ctx.dryRun && !isAllowedInternalHost(url)) {
      return {
        setVariables: { [saveTo]: { simulado: true, status: 200, data: {} } },
        nextHandle: 'out',
      };
    }

    const res = await this.http.request({ method, url, headers, body });
    // status 0 = fallo de red/URL bloqueada por anti-SSRF → rama de error.
    if (!res.status) {
      return { setVariables: { [saveTo]: res.data }, nextHandle: 'onError' };
    }
    return { setVariables: { [saveTo]: res.data }, nextHandle: 'out' };
  }
}
