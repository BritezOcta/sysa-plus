/**
 * Límite de login por IP compartido en la base (LOGIN_IP_THROTTLE): fallos simultáneos de la misma
 * IP, como los que llegan a instancias distintas del backend, no se pisan el conteo.
 */
import assert from "node:assert/strict";
import test from "node:test";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !/;database=sysaplus_test_[a-z0-9_]+;/i.test(databaseUrl)) {
  throw new Error("TEST_DATABASE_URL debe apuntar a una base aislada sysaplus_test_*. Nunca uses la base de la aplicación.");
}
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = "login-ip-throttle-isolated-test-secret";
process.env.NODE_ENV = "test";

const { prisma } = await import("../src/lib/prisma.js");
const { loginIpThrottleRepository: repo } = await import("../src/repositories/loginIpThrottle.repository.js");

const opts = { maxFailures: 3, blockMs: 15 * 60_000 };

test("límite de login por IP compartido entre instancias", async (t) => {
  assert.equal(await prisma.loginIpThrottle.count(), 0, "La base de pruebas debe estar vacía");

  try {
    await t.test("3 fallos simultáneos de la misma IP la bloquean (ninguno se pierde)", async () => {
      await Promise.all([1, 2, 3].map(() => repo.registerFailure("10.0.0.1", opts)));
      assert.ok((await repo.blockedFor("10.0.0.1")) > 0);
    });

    await t.test("otra IP no se ve afectada", async () => {
      assert.equal(await repo.blockedFor("10.0.0.2"), 0);
    });

    await t.test("2 fallos no bloquean y un ingreso exitoso reinicia el conteo", async () => {
      await repo.registerFailure("10.0.0.3", opts);
      await repo.registerFailure("10.0.0.3", opts);
      assert.equal(await repo.blockedFor("10.0.0.3"), 0);
      await repo.reset("10.0.0.3");
      await repo.registerFailure("10.0.0.3", opts);
      assert.equal(await repo.blockedFor("10.0.0.3"), 0);
    });
  } finally {
    await prisma.$disconnect();
  }
});
