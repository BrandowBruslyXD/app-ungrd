import { AiAgentExecutor } from './ai-agent.executor';

/**
 * Cubre la parte del modo conversacional que no se puede comprobar contra el modelo real:
 * qué pasa cuando marca una intención que una herramienta ya había resuelto.
 *
 * Con la instrucción puesta en el prompt el modelo dejó de marcarla, así que la condición
 * no se reproduce llamándolo — y una red de seguridad sin ejercitar no es una garantía.
 * Aquí el LLM se sustituye por un doble que responde exactamente lo que se quiere probar.
 */
describe('AiAgentExecutor · modo chat con herramientas', () => {
  const TOOL = {
    name: 'consultar_envio_pedido',
    description: 'Consulta el estado de un envío.',
    method: 'GET',
    url: 'http://demo-api:4100/melonn/tracking/{referencia}',
    params: { referencia: { type: 'string', description: 'Número de pedido' } },
    required: ['referencia'],
  };

  /** Nodo aiAgent en modo chat, con una intención y una herramienta declaradas. */
  const nodo = (resolvedBy?: string[]) => ({
    id: 'ia',
    type: 'aiAgent' as const,
    position: { x: 0, y: 0 },
    data: {
      mode: 'chat',
      systemPrompt: 'Eres una asesora.',
      httpTools: [TOOL],
      exitIntents: [{ id: 'rastreo', when: 'pregunta por su pedido', ...(resolvedBy ? { resolvedBy } : {}) }],
    },
  });

  /**
   * Doble del LLM: en la primera llamada pide la herramienta; en la segunda responde con
   * el dato Y marca la intención. Ese doble movimiento es el defecto que se quiere atajar.
   */
  function contexto() {
    let llamada = 0;
    const ctx: any = {
      tenantId: 't1',
      conversationId: 'c1',
      flowId: 'f1',
      variables: {},
      incoming: { type: 'text', text: 'pedido 6101 ya salio?' },
      services: {
        callIntegration: jest.fn(async () => {
          llamada += 1;
          if (llamada === 1) {
            return {
              reply: null,
              toolCalls: [
                { id: 'call_1', name: 'consultar_envio_pedido', arguments: '{"referencia":"6101"}' },
              ],
            };
          }
          return { reply: 'Tu pedido va con guía 6791657340. [[INTENT:rastreo]]' };
        }),
      },
    };
    return ctx;
  }

  /** HttpRequestService sustituido: la prueba no debe salir a la red. */
  const http: any = {
    request: jest.fn(async () => ({
      status: 200,
      data: { referencia: '6101', guia: '6791657340', estado: 'en_preparacion' },
    })),
  };
  /** El texto entrante ya viene resuelto por IncomingTextService: aquí es un doble. */
  const incomingText: any = { resolve: jest.fn(async (c: any) => c.incoming?.text ?? '') };

  it('descarta la intención cuando la resolvió una herramienta declarada en resolvedBy', async () => {
    const ex = new AiAgentExecutor(http, incomingText);
    const res = await ex.execute(nodo(['consultar_envio_pedido']) as any, contexto());

    // No enruta: el sub-flujo habría pedido el número de pedido que el cliente ya dio.
    expect(res.nextHandle).toBeUndefined();
    expect(res.waitForInput).toBe(true);
    // El dato de la herramienta sí llega al cliente, y el marcador interno no.
    expect(res.outgoing?.[0]?.text).toContain('6791657340');
    expect(res.outgoing?.[0]?.text).not.toContain('INTENT');
  });

  it('sin resolvedBy sí enruta, para no romper el enrutamiento de las demás intenciones', async () => {
    const ex = new AiAgentExecutor(http, incomingText);
    const res = await ex.execute(nodo() as any, contexto());

    expect(res.nextHandle).toBe('intent:rastreo');
    expect(res.outgoing?.[0]?.text).not.toContain('INTENT');
  });

  it('no descarta una intención distinta de la que resolvió la herramienta', async () => {
    const ex = new AiAgentExecutor(http, incomingText);
    // resolvedBy apunta a otra herramienta: la intención debe seguir enrutando.
    const res = await ex.execute(nodo(['buscar_productos']) as any, contexto());

    expect(res.nextHandle).toBe('intent:rastreo');
  });
});
