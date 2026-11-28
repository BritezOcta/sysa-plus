/**
 * Límite de intentos de login fallidos por IP. Complementa el bloqueo por cuenta (RF-01):
 * frena a quien prueba muchos DNI distintos desde la misma IP.
 * Vive en memoria: alcanza con una sola instancia del backend y se reinicia con el proceso.
 */
interface Entry {
  failures: number;
  windowStart: number;
  blockedUntil: number;
}

/** Por encima de esta cantidad de IPs guardadas se purgan las que ya vencieron. */
const MAX_TRACKED_IPS = 10_000;

export function createLoginIpLimiter(opts: { maxFailures: number; blockMs: number; now?: () => number }) {
  const now = opts.now ?? Date.now;
  const entries = new Map<string, Entry>();

  const isExpired = (e: Entry, t: number) => e.blockedUntil <= t && t - e.windowStart >= opts.blockMs;

  return {
    /** Milisegundos que le quedan de bloqueo a la IP; 0 si puede intentar. */
    blockedFor(ip: string): number {
      const e = entries.get(ip);
      return e ? Math.max(0, e.blockedUntil - now()) : 0;
    },

    registerFailure(ip: string): void {
      const t = now();
      let e = entries.get(ip);
      if (!e || isExpired(e, t)) {
        if (entries.size >= MAX_TRACKED_IPS) {
          for (const [key, value] of entries) if (isExpired(value, t)) entries.delete(key);
        }
        e = { failures: 0, windowStart: t, blockedUntil: 0 };
        entries.set(ip, e);
      }
      e.failures += 1;
      if (e.failures >= opts.maxFailures) {
        e.blockedUntil = t + opts.blockMs;
        e.failures = 0;
        e.windowStart = t;
      }
    },

    reset(ip: string): void {
      entries.delete(ip);
    },
  };
}
