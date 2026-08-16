/** Payload que el motor envía a runForEngine, discriminado por `kind`. */
export interface RunForEnginePayload {
  kind: 'ai' | 'gmail' | 'calendar' | 'http';
  [key: string]: any;
}
