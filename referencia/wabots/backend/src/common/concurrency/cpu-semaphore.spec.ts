import { cpuSemaphore } from './cpu-semaphore';

/**
 * La clase Semaphore no está exportada: se prueba sobre la instancia única
 * `cpuSemaphore` (límite CPU_HEAVY_CONCURRENCY, default 2 al no estar seteada).
 */
describe('cpuSemaphore', () => {
  it('nunca ejecuta más de 2 tareas a la vez y todas terminan', async () => {
    let activas = 0;
    let maxSimultaneas = 0;
    const terminadas: number[] = [];

    // Tarea pesada simulada: registra la concurrencia observada mientras corre.
    const tarea = (id: number) =>
      cpuSemaphore.run(async () => {
        activas += 1;
        maxSimultaneas = Math.max(maxSimultaneas, activas);
        // Pequeña espera real para que las tareas se solapen de verdad.
        await new Promise((r) => setTimeout(r, 25));
        activas -= 1;
        terminadas.push(id);
        return id;
      });

    const resultados = await Promise.all([tarea(1), tarea(2), tarea(3), tarea(4)]);

    // El límite del semáforo (default 2) nunca se supera.
    expect(maxSimultaneas).toBeLessThanOrEqual(2);
    // Con 4 tareas y espera en cola, sí debe haberse alcanzado el límite.
    expect(maxSimultaneas).toBe(2);
    // Las 4 tareas terminan y devuelven su resultado.
    expect(terminadas).toHaveLength(4);
    expect(resultados.sort()).toEqual([1, 2, 3, 4]);
  });
});
