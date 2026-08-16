import { IncomingTextService } from './incoming-text.service';
import { CaptureInputExecutor } from './executors/capture-input.executor';
import { InteractiveMenuExecutor } from './executors/interactive-menu.executor';

/**
 * Bug 9: una nota de voz o una foto dentro de un `captureInput` o un `interactiveMenu`
 * se descartaba en silencio, porque la transcripción solo existía dentro del ejecutor
 * de `aiAgent`. El cliente recibía "no entendí" o el menú repetido, sin ninguna señal
 * de que había mandado algo perfectamente legible.
 *
 * En el histórico de conversaciones reales eso toca el 31% de los casos: la gente manda
 * audios y fotos en mitad de un flujo, no solo al empezar.
 */
describe('Bug 9 · audio e imagen dentro de menús y capturas', () => {
  const AUDIO = {
    type: 'audio',
    mediaType: 'audio',
    mediaMimeType: 'audio/ogg',
    mediaUrl: 'https://ejemplo/nota.ogg',
    text: '',
  };
  const IMAGEN = {
    type: 'image',
    mediaType: 'image',
    mediaMimeType: 'image/jpeg',
    mediaUrl: 'https://ejemplo/foto.jpg',
    text: '',
  };

  /** Servicio real, con Whisper/Tesseract/descarga sustituidos. */
  function servicio(transcripcion = '', ocr = '') {
    const media: any = { fetchIncomingMedia: jest.fn(async () => Buffer.from('x')) };
    const transcription: any = { transcribe: jest.fn(async () => transcripcion) };
    const ocrSrv: any = { extractText: jest.fn(async () => ocr) };
    return new IncomingTextService(media, transcription, ocrSrv);
  }

  const ctx = (incoming: any): any => ({
    tenantId: 't1', flowId: 'f1', conversationId: 'c1',
    resuming: true, dryRun: true, variables: {}, incoming,
  });

  describe('captureInput', () => {
    it('guarda la dirección dictada en una nota de voz', async () => {
      // Pocos dígitos sueltos: la transcripción es fiable y el dato se aprovecha.
      const dictado = 'Calle 45 número 12 apartamento B Medellín';
      const ex = new CaptureInputExecutor(servicio(dictado));
      const node: any = { id: 'cap', type: 'captureInput', data: { variable: 'direccion', validate: 'nonempty' } };

      const res = await ex.execute(node, ctx(AUDIO));

      expect(res.setVariables?.direccion).toBe(dictado);
      expect(res.nextHandle).toBe('out');
    });

    it('un teléfono dictado NO se guarda: se pide por escrito', async () => {
      // Comprobado con audio real: "300 123 4567" se transcribió "3.0.1.2.3, 4.5.67".
      // Whisper pierde dígitos, así que un número dictado no es un dato utilizable.
      const ex = new CaptureInputExecutor(servicio('300 123 4567'));
      const node: any = { id: 'cap', type: 'captureInput', data: { variable: 'tel', validate: 'phone' } };

      const res = await ex.execute(node, ctx(AUDIO));

      expect(res.setVariables).toBeUndefined();
      expect(res.waitForInput).toBe(true);
      expect(res.outgoing?.[0]?.text).toMatch(/escribes/i);
      // Se repite lo entendido para que el cliente solo corrija lo que falte.
      expect(res.outgoing?.[0]?.text).toContain('300 123 4567');
    });

    it('un bloque de datos dictado con cédula tampoco se guarda a ciegas', async () => {
      const ex = new CaptureInputExecutor(servicio('Jenny Acevedo cedula 1020304050 Medellin'));
      const node: any = { id: 'cap', type: 'captureInput', data: { variable: 'datos', validate: 'nonempty' } };

      const res = await ex.execute(node, ctx(AUDIO));

      expect(res.setVariables).toBeUndefined();
      expect(res.outgoing?.[0]?.text).toMatch(/escribes/i);
    });

    it('una dirección dictada sin números largos sí se guarda', async () => {
      // El caso común: el audio funciona bien para texto, que es la mayoría.
      const ex = new CaptureInputExecutor(servicio('la carrera ochenta y seis apartamento tres cero dos'));
      const node: any = { id: 'cap', type: 'captureInput', data: { variable: 'dir', validate: 'nonempty' } };

      const res = await ex.execute(node, ctx(AUDIO));

      expect(res.setVariables?.dir).toBe('la carrera ochenta y seis apartamento tres cero dos');
      expect(res.nextHandle).toBe('out');
    });

    it('aprovecha el texto que se lee en una foto', async () => {
      const ex = new CaptureInputExecutor(servicio('', 'Pedido 6101'));
      const node: any = { id: 'cap', type: 'captureInput', data: { variable: 'ref', validate: 'nonempty' } };

      const res = await ex.execute(node, ctx(IMAGEN));

      expect(res.setVariables?.ref).toBe('Pedido 6101');
      expect(res.nextHandle).toBe('out');
    });

    it('ante un vídeo explica que no puede verlo, en vez de un "no entendí" a secas', async () => {
      const ex = new CaptureInputExecutor(servicio());
      const node: any = { id: 'cap', type: 'captureInput', data: { variable: 'x', validate: 'nonempty' } };

      const res = await ex.execute(node, ctx({ type: 'video', mediaType: 'video', text: '' }));

      expect(res.nextHandle).toBeUndefined();
      expect(res.waitForInput).toBe(true);
      expect(res.outgoing?.[0]?.text).toContain('No puedo ver videos');
    });

    it('un audio ininteligible no se hace pasar por respuesta del cliente', async () => {
      const ex = new CaptureInputExecutor(servicio(''));
      const node: any = { id: 'cap', type: 'captureInput', data: { variable: 'x', validate: 'nonempty' } };

      const res = await ex.execute(node, ctx(AUDIO));

      expect(res.setVariables).toBeUndefined();
      expect(res.outgoing?.[0]?.text).toContain('nota de voz');
    });
  });

  describe('interactiveMenu', () => {
    const opciones = [
      { id: 'comprar', label: 'Quiero comprar' },
      { id: 'rastreo', label: 'Rastrear mi pedido' },
    ];
    const node: any = { id: 'menu', type: 'interactiveMenu', data: { options: opciones } };

    it('reconoce la opción elegida de viva voz', async () => {
      const ex = new InteractiveMenuExecutor(servicio('rastrear mi pedido'));

      const res = await ex.execute(node, ctx(AUDIO));

      expect(res.nextHandle).toBe('opt:rastreo');
    });

    it('reconoce el número dictado en palabras', async () => {
      const ex = new InteractiveMenuExecutor(servicio('la dos'));

      const res = await ex.execute(node, ctx(AUDIO));

      expect(res.nextHandle).toBe('opt:rastreo');
    });

    it('reconoce el número con punto, como lo dicta quien lee el menú', async () => {
      const ex = new InteractiveMenuExecutor(servicio('2.'));

      const res = await ex.execute(node, ctx(AUDIO));

      expect(res.nextHandle).toBe('opt:rastreo');
    });

    it('tolera otra puntuación y otro espaciado en la opción dictada', async () => {
      // Caso real: se dictó "Contraentrega" y Whisper transcribió "Contra entrega.",
      // que con la comparación anterior no casaba con ningún label.
      const ex = new InteractiveMenuExecutor(servicio('Contra entrega.'));
      const pago: any = {
        id: 'menu', type: 'interactiveMenu',
        data: { options: [{ id: 'contraentrega', label: 'Contraentrega' }, { id: 'transf', label: 'Transferencia Bancolombia' }] },
      };

      const res = await ex.execute(pago, ctx(AUDIO));

      expect(res.nextHandle).toBe('opt:contraentrega');
    });

    it('tolera un error de una letra de la transcripción', async () => {
      // Caso real medido: se dictó "Contraentrega" y Whisper devolvió "Contraintrega."
      // Una vocal cambiada; ninguna comparación por contención lo resuelve.
      const ex = new InteractiveMenuExecutor(servicio('Contraintrega.'));
      const pago: any = {
        id: 'menu', type: 'interactiveMenu',
        data: { options: [
          { id: 'contraentrega', label: 'Contraentrega' },
          { id: 'transf', label: 'Transferencia Bancolombia' },
          { id: 'web', label: 'Pago en web' },
        ] },
      };

      const res = await ex.execute(pago, ctx(AUDIO));

      expect(res.nextHandle).toBe('opt:contraentrega');
    });

    it('no adivina cuando dos opciones están igual de cerca', async () => {
      // Con dos candidatos a la misma distancia, elegir sería decidir por el cliente.
      const ex = new InteractiveMenuExecutor(servicio('Plan A'));
      const dudoso: any = {
        id: 'menu', type: 'interactiveMenu',
        data: { options: [{ id: 'p1', label: 'Plan B' }, { id: 'p2', label: 'Plan C' }] },
      };

      const res = await ex.execute(dudoso, ctx(AUDIO));

      expect(res.nextHandle).toBeUndefined();
      expect(res.waitForInput).toBe(true);
    });

    it('no casa una respuesta corta con cualquier opción', async () => {
      // "si" no elige nada: con contención sin mínimo de longitud casaría con todo.
      const ex = new InteractiveMenuExecutor(servicio('si'));

      const res = await ex.execute(node, ctx(AUDIO));

      expect(res.nextHandle).toBeUndefined();
      expect(res.waitForInput).toBe(true);
    });

    it('un audio que no coincide reenvía el menú, no lo ignora', async () => {
      const ex = new InteractiveMenuExecutor(servicio('hola buenas tardes'));

      const res = await ex.execute(node, ctx(AUDIO));

      expect(res.waitForInput).toBe(true);
      expect(res.outgoing?.length).toBeGreaterThan(0);
    });
  });

  describe('memoización por turno', () => {
    it('transcribe una sola vez aunque varios nodos lean el mismo mensaje', async () => {
      const media: any = { fetchIncomingMedia: jest.fn(async () => Buffer.from('x')) };
      const transcription: any = { transcribe: jest.fn(async () => 'hola') };
      const ocrSrv: any = { extractText: jest.fn(async () => '') };
      const srv = new IncomingTextService(media, transcription, ocrSrv);
      const c = ctx(AUDIO);

      await srv.resolve(c);
      await srv.resolve(c);
      await srv.resolve(c);

      // Whisper es costoso y bloqueante: tres nodos no deben provocar tres pasadas.
      expect(transcription.transcribe).toHaveBeenCalledTimes(1);
    });
  });
});
