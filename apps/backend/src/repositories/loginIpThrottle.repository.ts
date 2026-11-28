import {
  afterFailure,
  remainingBlockMs,
  type ThrottleOptions,
  type ThrottleState,
} from "../lib/loginIpLimiter.js";
import { prisma } from "../lib/prisma.js";

type Row = { failures: number; windowStart: Date; blockedUntil: Date | null } | null;

const toState = (row: Row): ThrottleState | null =>
  row ? { failures: row.failures, windowStart: row.windowStart.getTime(), blockedUntil: row.blockedUntil?.getTime() ?? 0 } : null;

/** Estado del límite de login por IP, compartido por todas las instancias del backend. */
export const loginIpThrottleRepository = {
  async blockedFor(ip: string, now = Date.now()): Promise<number> {
    return remainingBlockMs(toState(await prisma.loginIpThrottle.findUnique({ where: { ipAddress: ip } })), now);
  },

  /**
   * Suma un fallo. UPDLOCK + HOLDLOCK bloquea la fila de la IP, o el rango si todavía no existe:
   * dos instancias que registran un fallo de la misma IP a la vez no se pisan el conteo.
   */
  async registerFailure(ip: string, opts: ThrottleOptions, now = Date.now()): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT IP_ADDRESS FROM LOGIN_IP_THROTTLE WITH (UPDLOCK, HOLDLOCK) WHERE IP_ADDRESS = ${ip}`;
      const next = afterFailure(toState(await tx.loginIpThrottle.findUnique({ where: { ipAddress: ip } })), now, opts);
      const data = {
        failures: next.failures,
        windowStart: new Date(next.windowStart),
        blockedUntil: next.blockedUntil ? new Date(next.blockedUntil) : null,
      };
      await tx.loginIpThrottle.upsert({ where: { ipAddress: ip }, create: { ipAddress: ip, ...data }, update: data });
    });
  },

  /** Un ingreso exitoso borra el estado de la IP. */
  async reset(ip: string): Promise<void> {
    await prisma.loginIpThrottle.deleteMany({ where: { ipAddress: ip } });
  },
};
