import assert from "node:assert/strict";
import { test } from "node:test";
import { createLoginIpLimiter } from "./loginIpLimiter.js";

const MINUTE = 60_000;

function setup() {
  let now = 0;
  const limiter = createLoginIpLimiter({ maxFailures: 3, blockMs: 15 * MINUTE, now: () => now });
  return { limiter, advance: (ms: number) => (now += ms) };
}

test("bloquea la IP al llegar a 3 intentos fallidos y la libera al vencer el bloqueo", () => {
  const { limiter, advance } = setup();
  limiter.registerFailure("1.1.1.1");
  limiter.registerFailure("1.1.1.1");
  assert.equal(limiter.blockedFor("1.1.1.1"), 0);

  limiter.registerFailure("1.1.1.1");
  assert.equal(limiter.blockedFor("1.1.1.1"), 15 * MINUTE);

  advance(15 * MINUTE);
  assert.equal(limiter.blockedFor("1.1.1.1"), 0);
});

test("cada IP se cuenta por separado", () => {
  const { limiter } = setup();
  for (let i = 0; i < 3; i++) limiter.registerFailure("1.1.1.1");
  assert.ok(limiter.blockedFor("1.1.1.1") > 0);
  assert.equal(limiter.blockedFor("2.2.2.2"), 0);
});

test("un ingreso exitoso reinicia el conteo", () => {
  const { limiter } = setup();
  limiter.registerFailure("1.1.1.1");
  limiter.registerFailure("1.1.1.1");
  limiter.reset("1.1.1.1");
  limiter.registerFailure("1.1.1.1");
  assert.equal(limiter.blockedFor("1.1.1.1"), 0);
});

test("los fallos viejos vencen: solo cuentan los de la ventana del bloqueo", () => {
  const { limiter, advance } = setup();
  limiter.registerFailure("1.1.1.1");
  limiter.registerFailure("1.1.1.1");
  advance(15 * MINUTE);
  limiter.registerFailure("1.1.1.1");
  assert.equal(limiter.blockedFor("1.1.1.1"), 0);
});
