/**
 * Límite de intentos de login fallidos por IP. Complementa el bloqueo por cuenta (RF-01):
 * frena a quien prueba muchos DNI distintos desde la misma IP.
 *
 * Funciones puras sobre el estado de una IP; el estado vive en la tabla LOGIN_IP_THROTTLE
 * (loginIpThrottle.repository.ts) para que lo compartan todas las instancias del backend.
 * Un ingreso exitoso borra el estado de la IP.
 */
export interface ThrottleState {
  failures: number;
  /** Inicio de la ventana en la que se cuentan los fallos (ms). */
  windowStart: number;
  /** Hasta cuándo está bloqueada la IP (ms); 0 = no bloqueada. */
  blockedUntil: number;
}

export interface ThrottleOptions {
  maxFailures: number;
  blockMs: number;
}

/** Milisegundos que le quedan de bloqueo a la IP; 0 si puede intentar. */
export function remainingBlockMs(state: ThrottleState | null, now: number): number {
  return state ? Math.max(0, state.blockedUntil - now) : 0;
}

/** Estado de la IP después de un intento fallido. */
export function afterFailure(state: ThrottleState | null, now: number, opts: ThrottleOptions): ThrottleState {
  // Sin registro, o con la ventana y el bloqueo ya vencidos: se empieza a contar de nuevo.
  const expired = !state || (state.blockedUntil <= now && now - state.windowStart >= opts.blockMs);
  const failures = (expired ? 0 : state.failures) + 1;
  const windowStart = expired ? now : state.windowStart;

  if (failures >= opts.maxFailures) return { failures: 0, windowStart: now, blockedUntil: now + opts.blockMs };
  return { failures, windowStart, blockedUntil: expired ? 0 : state.blockedUntil };
}
